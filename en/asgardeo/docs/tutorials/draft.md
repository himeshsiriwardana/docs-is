# Why Your MCP Token Expires Mid-Run — and How to Fix It

Your LangGraph agent connects to an MCP server. The first tool call works. Then, sometime later, the next call returns `401 Unauthorized`.

Nothing changed in the graph. The MCP server is still running. The tool is still available.

The access token simply expired.

That is easy to miss because authentication usually appears to be part of the connection setup. You create the MCP client, put an access token in its configuration, load the tools, and give those tools to LangGraph.

```python
client = MultiServerMCPClient(
    {
        "protected-server": {
            "url": MCP_SERVER_URL,
            "transport": "streamable_http",
            "headers": {
                "Authorization": f"Bearer {access_token}",
            },
        }
    }
)
```

The agent can now call the protected tools.

But an access token is temporary. A token that was valid when the client was created may no longer be valid when an agent invokes a tool 30 minutes later.

This creates a different problem from initially authorizing an MCP connection.

OAuth can give your application a new access token. The harder part is making sure the MCP request uses that new token instead of continuing to send the credential that was captured earlier.

In this guide, we will build that refresh path around the MCP client's HTTP client factory. Instead of treating authentication as a value that is fixed when the MCP client starts, the factory can obtain the credential needed for the request when the HTTP client is created.

We will also look at a second problem that can appear very similar: MCP sessions are stateless by default in the LangGraph MCP adapter. If a server expects initialization state to survive between tool calls, refreshing the token alone will not fix it.

By the end, the flow will look like this:

```text
LangGraph agent
      |
      v
MCP tool invocation
      |
      v
client factory
      |
      +----> obtain current credential
      |
      v
MCP HTTP client
      |
      v
protected MCP server
```

LangGraph still does not manage OAuth tokens. It receives MCP tools and decides when to call them. Credential lifetime remains part of the application around the MCP connection.

## The symptom

The simplest version looks like this:

```text
Tool call 1
POST /mcp
Authorization: Bearer eyJ...
200 OK

Tool call 2
POST /mcp
Authorization: Bearer eyJ...
401 Unauthorized
```

The same bearer token appears in both requests.

That is fine while the token is valid. Once it expires, the server rejects it.

For a short interactive request, you might never notice. For a long-running agent, the problem becomes much easier to reproduce. The agent can begin a workflow with a valid token, spend time reasoning or waiting for other operations, and reach another MCP tool after the token lifetime has passed.

A similar problem was raised by users of `langchain-mcp-adapters`, including requests for a way to supply authentication dynamically rather than putting a fixed bearer token in the original connection configuration. One issue describes the desired behavior as providing a token function at request time rather than a static `Authorization` header.

Another report describes the operational consequence directly: applications using JWT bearer authentication have to refresh the token before expiry themselves.

The authentication server is not necessarily the problem here. Your application may already know how to refresh the token.

The problem is getting the refreshed credential into the next MCP request.

## Why the auth object is evaluated once

A typical MCP configuration is created before the agent starts running:

```python
connections = {
    "orders": {
        "url": MCP_SERVER_URL,
        "transport": "streamable_http",
        "headers": {
            "Authorization": f"Bearer {token}",
        },
    }
}
```

At that point, `token` is just a string.

The connection configuration now contains the value that existed when this dictionary was built. Updating some other variable later does not rewrite the header already stored in the connection.

That design is perfectly reasonable for credentials that do not change during the lifetime of the client. API keys often behave that way.

OAuth access tokens do not.

They have an expiry time and are expected to be replaced. An application that holds a refresh token, or otherwise knows how to obtain another access token, therefore needs a place where credential resolution can happen later in the request lifecycle.

The MCP Python SDK exposes such a place through its HTTP client factory.

The factory protocol receives three useful values:

```python
headers
timeout
auth
```

and returns the HTTP client used for the MCP connection. The SDK's implementation uses exactly those parameters when constructing its client.

That gives us a seam between:

```text
the MCP adapter deciding to make a request
```

and:

```text
the HTTP client actually sending that request
```

Instead of storing the final bearer token in the MCP configuration, we can resolve the current credential inside that seam.

## The client-factory seam

Start with a function in your application that owns the credential lifecycle.

For example:

```python
async def get_access_token() -> str:
    token = await token_store.get()

    if token.expires_soon():
        token = await oauth_client.refresh(token.refresh_token)
        await token_store.save(token)

    return token.access_token
```

The MCP layer does not need to know how the refresh happened.

`get_access_token()` might use a refresh token, workload identity, a token exchange, or another mechanism. Its job is simply to return an access token that can be used now.

The client factory can then bridge that function into the MCP transport:

```python
import httpx


async def create_authenticated_client(
    headers=None,
    timeout=None,
    auth=None,
):
    access_token = await get_access_token()

    request_headers = dict(headers or {})
    request_headers["Authorization"] = f"Bearer {access_token}"

    return httpx.AsyncClient(
        headers=request_headers,
        timeout=timeout,
        auth=auth,
        follow_redirects=True,
    )
```

Conceptually, the important change is small.

Instead of:

```text
construct MCP client
    ↓
read token once
    ↓
reuse captured token
```

we want:

```text
MCP request needs an HTTP client
    ↓
resolve current token
    ↓
construct authenticated HTTP client
    ↓
send request
```

The MCP SDK's client-factory protocol is designed to receive the connection's existing headers, timeout and authentication configuration, so a custom factory does not need to throw those settings away.

The runnable example for this article should make expiry deliberately easy to reproduce.

For example, configure the test authorization server to issue a token that lasts only a few seconds:

```text
access_token_1
expires_in: 5
```

Run the first tool:

```text
tool call → access_token_1 → 200
```

Wait until it expires.

Then run the second tool:

```text
tool call
    ↓
factory asks for credential
    ↓
application refreshes token
    ↓
access_token_2
    ↓
200
```

The test should fail when the connection uses a static header and pass when it uses the factory.

That gives us something much more useful than assuming refresh works because the application successfully obtained a second token.

We prove that the second **MCP request actually sends it**.

## Carrying per-request context safely

Token refresh becomes slightly more complicated once multiple users can run agents at the same time.

Consider this function:

```python
CURRENT_TOKEN = None
```

Request A starts:

```text
CURRENT_TOKEN = Alice's token
```

Before its MCP tool runs, request B starts:

```text
CURRENT_TOKEN = Bob's token
```

The factory now asks for `CURRENT_TOKEN`.

Alice's MCP request could leave the application carrying Bob's credential.

The fix is not to make the factory global-state-aware. The credential needs to follow the request that owns it.

In Python, `ContextVar` is one way to carry that request-local information through asynchronous execution:

```python
from contextvars import ContextVar

current_user = ContextVar("current_user")
```

At the start of the application request:

```python
token = current_user.set(user_id)

try:
    result = await agent.ainvoke(input)
finally:
    current_user.reset(token)
```

The credential resolver can then use that context:

```python
async def get_access_token():
    user_id = current_user.get()
    token = await token_store.get(user_id)

    if token.expires_soon():
        token = await refresh_token(token)
        await token_store.save(user_id, token)

    return token.access_token
```

The factory itself remains simple:

```text
factory
   ↓
find current request/user
   ↓
load that user's credential
   ↓
refresh if necessary
   ↓
create HTTP client
```

There is another concurrency case to handle: two tool calls can notice that the same token is about to expire at almost the same time.

Both may attempt a refresh.

If the authorization server rotates refresh tokens, the first refresh can invalidate the credential being used by the second.

Your token store therefore needs synchronization around refresh:

```python
async with refresh_lock(user_id):
    token = await token_store.get(user_id)

    if token.expires_soon():
        token = await refresh_token(token)
        await token_store.save(user_id, token)
```

Recheck the token after acquiring the lock. Another request may already have refreshed it while this request was waiting.

The rule is straightforward: credentials belong to the user and request that obtained them. They should not become shared mutable state merely because the MCP client is shared.

## The other half — stateless sessions

A `401` points toward authentication.

But another MCP failure can appear immediately after the first successful tool call even when the access token is still valid.

Imagine an MCP server exposing these tools:

```text
initialize_workspace()
search_workspace()
```

The first tool stores information in the server session.

The agent calls:

```text
initialize_workspace()
```

and receives a successful response.

It then calls:

```text
search_workspace()
```

and the server responds:

```text
workspace not initialized
```

The problem can be the MCP session rather than the token.

`MultiServerMCPClient` has historically treated tool calls as stateless by default: a tool invocation creates a session, executes the tool, and cleans that session up. A later tool call can therefore arrive through a new session.

Users have reported exactly this behaviour with stateful MCP servers. One report describes initialization succeeding and the next tool failing because the initialization state had disappeared; the reporter noted that the same server retained the state when used through other MCP clients.

An earlier issue describes the underlying behaviour more directly: a new session being started for each tool call causes stateful servers to lose information saved during the previous invocation.

If the MCP server requires session continuity, hold the session open explicitly and load the tools against that session.

Conceptually:

```python
async with client.session("protected-server") as session:
    tools = await load_mcp_tools(session)

    agent = create_agent(
        model,
        tools,
    )

    await agent.ainvoke(...)
```

The lifetime now becomes:

```text
open MCP session
      |
      +--> tool call 1
      |
      +--> tool call 2
      |
      +--> tool call 3
      |
close MCP session
```

instead of:

```text
open → tool call 1 → close

open → tool call 2 → close

open → tool call 3 → close
```

A persistent session is not automatically better.

It keeps connections and server-side state alive for longer. You also need to decide when the session ends, what happens if the connection disappears, and whether a session can safely be shared.

Use it when the MCP server actually requires continuity.

Token lifetime and session lifetime are related, but they are not the same thing.

A long-lived session may outlive an access token.

A short-lived session may still be created with an expired credential.

The application therefore has to decide both:

```text
Which credential should this request use?
```

and, when necessary:

```text
Should these tool calls share the same MCP session?
```

## Why this is not built in

Requests for dynamic authentication and refresh support have appeared repeatedly around the LangGraph MCP adapter.

Four community issues requesting forms of dynamic refresh were closed: one with only `Closing issue for now.`, one as a duplicate, and two as not planned.

One request specifically asks for dynamic authentication headers rather than a token fixed at client construction. Another describes having to refresh JWT bearer tokens before expiry.

The working client-factory approach came from the community rather than being introduced as a first-class refresh API.

That leads to a useful architectural boundary.

The MCP adapter knows how to expose MCP tools to the agent.

The MCP transport knows how to send requests.

Neither necessarily knows enough about your application to own a user's complete credential lifecycle.

Your application may need to decide which account is active, where refresh tokens are stored, whether a token is still usable, how concurrent refreshes are synchronized, or what should happen when reauthorization is required.

So keep that lifecycle above the adapter:

```text
Application
  ├── user/request context
  ├── token storage
  ├── refresh logic
  └── reauthorization
          |
          v
MCP client factory
          |
          v
MCP transport
          |
          v
protected MCP server
```

The client factory becomes the handoff point.

It does not need to implement OAuth.

It asks your application for the credential that should be used now and gives that credential to the HTTP layer that will make the MCP request.

That separation also makes the failure easier to reason about.

If the first call succeeds and a later request returns `401`, inspect the credential reaching the HTTP request.

If authorization succeeds but server initialization disappears between tool calls, inspect the MCP session lifetime instead.

Those are two different lifecycles, even when they surface during the same agent run.

## Conclusion

Connecting a LangGraph agent to an OAuth-protected MCP server is not finished when the first authenticated tool call succeeds.

The token used for that call has a lifetime.

If the MCP connection captures the credential once, an agent that runs long enough can eventually send an expired token even when your application already knows how to obtain a fresh one.

The client factory gives us a clean place to connect those two pieces. Let the application own the credential lifecycle, resolve the current credential when the MCP HTTP client is created, and keep user context isolated when multiple agents run concurrently.

Then treat session continuity separately. The LangGraph MCP client is stateless by default, so an MCP server that stores initialization state across tool calls needs an explicitly managed session.

The final flow is:

```text
Agent chooses MCP tool
        |
        v
Application context identifies the user
        |
        v
Credential resolver returns a valid token
        |
        v
Client factory creates the authenticated MCP client
        |
        v
Tool executes in the required MCP session
```

LangGraph still only sees tools.

The agent never needs an access token in its prompt or graph state, and the MCP adapter does not have to become your token manager.

The application owns the credential lifecycle. The client factory gets the current credential into the request. The session lifetime determines whether server-side state survives the next tool call.
