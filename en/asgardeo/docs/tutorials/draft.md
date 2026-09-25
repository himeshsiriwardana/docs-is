# Why Your MCP Token Expires Mid-Run

In the previous guide, we connected a LangGraph agent to an OAuth-protected MCP server without pushing access tokens into the agent itself.

That is still the architecture we want.

The application owns authentication. The agent sees tools. The MCP client uses the credential supplied by the authentication layer when it talks to the protected server.

For a short agent run, this can work without any visible problems.

The agent authenticates, calls a few tools, and finishes before the access token expires.

Long-running workflows are different.

An agent may wait for human approval, call other tools, interact with external services, or remain active for long enough that the access token used when the MCP client was created is no longer valid.

```text
Agent starts

    ↓

OAuth authentication completes

    ↓

MCP tool call

    ↓

200 OK

agent keeps running

    ↓

waits for approval

calls other tools

does more work

    ↓

access token expires

another MCP tool call

    ↓

401 Unauthorized
```

OAuth already has a way to obtain another access token.

Your authentication layer may use a refresh token, a new authorization flow, or another mechanism appropriate for the application.

The problem is not teaching LangGraph how to refresh OAuth tokens.

We should not move authentication responsibilities into the agent.

The problem appears when the MCP client was configured with a credential that was resolved earlier in the run.

For example, an application might construct the MCP connection using an `Authorization` header containing the current access token.

```text
application authentication

        ↓

access_token_1

        ↓

create MCP client

        ↓

Authorization: Bearer access_token_1
```

Later, the authentication layer may obtain `access_token_2`.

That does not necessarily change the credential already supplied to the MCP client.

This leaves us with two separate operations:

```text
authentication layer obtains a fresh token
```

and:

```text
the next MCP request uses that fresh token
```

The first does not automatically guarantee the second.

That is where the MCP client factory becomes useful.

Instead of treating the MCP client as something created once with a token that may eventually expire, we can create the client at a point where the application can supply the credential that is valid now.

```text
LangGraph agent

        ↓

MCP tool invocation

        ↓

MCP client factory

        ↓

application authentication layer

        ↓

current credential

        ↓

MCP request
```

There is another lifecycle we need to consider as well.

A later MCP tool call can fail even when the access token is perfectly valid.

The multi-server MCP client can create new sessions between tool calls. If the MCP server expects initialization state to survive across those calls, creating a new session can lose that state.

We therefore have two separate lifecycles to reason about:

```text
credential lifetime

session lifetime
```

They can surface during the same long-running agent workflow, but they are different problems.

We will start with the credential lifecycle and make sure each MCP client is created with the access token that is valid at that point in the workflow.

Then we will look at the session lifecycle and when an MCP session needs to remain alive across multiple tool calls.

## The symptom

The frustrating part is that everything works at first.

The agent authenticates successfully. The MCP server accepts the access token. The first tool calls return normally.

Then enough time passes for that token to expire.

```text
Tool call 1

POST /mcp

Authorization: Bearer access_token_1

200 OK


time passes


Tool call 2

POST /mcp

Authorization: Bearer access_token_1

401 Unauthorized
```

The second request is reaching the same MCP server with the same credential that worked earlier.

That is easy to miss in a short workflow because the agent may finish before the token reaches the end of its lifetime.

A longer workflow gives the token time to expire.

By the time the agent returns to the MCP server, the authentication layer may already be capable of obtaining a new access token.

For example:

```text
authentication layer

access_token_1 expires

        ↓

refresh

        ↓

access_token_2
```

But the MCP request can still look like this:

```text
MCP client

Authorization: Bearer access_token_1

        ↓

next tool call

        ↓

401 Unauthorized
```

The authentication layer has a valid credential.

The MCP client is still using the credential it was originally given.

Refreshing the token is therefore only half of the problem.

The refreshed token also has to reach the MCP request that needs it.

## Why refreshing the token is not enough

Suppose the application creates an MCP client using the current access token in its connection headers.

Conceptually:

```text
get current access token

        ↓

access_token_1

        ↓

create MCP client

        ↓

Authorization: Bearer access_token_1
```

At that moment, `access_token_1` is valid.

The MCP server accepts it, and tool calls succeed.

Later, the access token expires.

Your authentication layer may then refresh the user's session and obtain a replacement:

```text
access_token_1

        ↓

expires

        ↓

authentication layer refreshes

        ↓

access_token_2
```

The important part is what happens to the MCP client that was already created.

If that client was configured with:

```text
Authorization: Bearer access_token_1
```

obtaining `access_token_2` elsewhere in the application does not automatically replace that header.

The two parts of the application can therefore end up with different authentication state:

```text
application authentication layer

access_token_2


MCP client

Authorization: Bearer access_token_1
```

The authentication system has done its job.

It has a valid token.

The MCP client is also doing what it was configured to do.

It is continuing to send the credential it was given when it was created.

The problem is the handoff between those two pieces.

Long-running agents simply make that gap easier to encounter because there may be a significant delay between MCP tool calls.

The solution is not to put refresh logic inside the LangGraph agent.

Instead, we need a point in the MCP request path where the application can provide the credential that is valid at that moment.

That is the role the client factory will play.

## The HTTP client seam

The MCP Python SDK lets you provide the HTTP client used by the Streamable HTTP transport.

That gives us the handoff point we need.

Instead of creating the MCP transport with an access token that may remain attached to the client for the rest of the workflow, the application can obtain the current credential when it creates the HTTP client.

The request path becomes:

```text
LangGraph chooses tool

        ↓

application prepares MCP client

        ↓

obtain current credential

        ↓

create HTTP client

        ↓

create MCP transport

        ↓

send MCP request
```

OAuth still belongs to the application.

The HTTP client is simply where the credential crosses into the MCP transport.

A simplified version could look like this:

```python
import httpx2

from mcp import Client
from mcp.client.streamable_http import streamable_http_client


async def create_mcp_client():
    access_token = await auth_provider.get_access_token()

    http_client = httpx2.AsyncClient(
        headers={
            "Authorization": f"Bearer {access_token}"
        },
        timeout=httpx2.Timeout(
            30.0,
            read=300.0,
        ),
    )

    transport = streamable_http_client(
        MCP_SERVER_URL,
        http_client=http_client,
    )

    return http_client, Client(transport)
```

The important line is:

```python
access_token = await auth_provider.get_access_token()
```

The application asks its authentication layer for the credential that should be used before constructing the HTTP client.

That authentication layer can decide what to return.

If the current access token is still valid, it can reuse it.

If the token has expired, or is close enough to expiry that the application wants to replace it, the authentication layer can obtain a new one first.

Conceptually:

```text
MCP client needed

        ↓

ask authentication layer

        ↓

is current token usable?

     yes      no

      ↓        ↓

    reuse    refresh

       \      /

        \    /

      valid token

          ↓

 create HTTP client

          ↓

 create MCP transport
```

The MCP client does not need to know how OAuth refresh works.

LangGraph does not need access to the token.

The credential does not need to be stored in graph state.

The application authentication layer remains responsible for deciding whether the current token can be reused or whether a new one needs to be obtained.

The MCP layer only receives the result.

There is an important boundary here, though.

Creating an HTTP client with the current token solves the problem only if that client is created again when a newer credential is needed.

If you create the HTTP client once at the beginning of a long-running workflow and keep reusing it, you can end up in exactly the same situation:

```text
create HTTP client

        ↓

Authorization: Bearer access_token_1

        ↓

reuse same client

        ↓

access_token_1 expires

        ↓

later MCP request

        ↓

401 Unauthorized
```

So the goal is not merely to move the token from one configuration object into another.

The goal is to place HTTP client creation at a point in the workflow where the application can obtain the credential that is valid for the next MCP interaction.

That gives us the pattern we need:

```text
need MCP connection

        ↓

get current credential

        ↓

build authenticated HTTP client

        ↓

open MCP transport

        ↓

perform MCP work
```

The MCP Python SDK supports this layering directly: the application owns the HTTP client, and the Streamable HTTP transport uses the client that is passed to it.

That keeps OAuth concerns outside the agent while still allowing the MCP connection to use current authentication state.

### Prove that the refreshed token reaches MCP

A runnable example should make the failure easy to reproduce.

Configure the authorization server with a deliberately short access-token lifetime:

```text
access_token_1

expires_in: 5
```

Make the first MCP call while that token is still valid:

```text
tool call

    ↓

access_token_1

    ↓

MCP request

    ↓

200 OK
```

Then wait for the token to expire before making another MCP call.

When the application prepares the next MCP connection, it asks the authentication layer for the current credential.

```text
second tool call

        ↓

get current credential

        ↓

access_token_1 expired

        ↓

refresh

        ↓

access_token_2

        ↓

create authenticated HTTP client

        ↓

MCP request

        ↓

200 OK
```

The test should verify more than the fact that the authentication layer received `access_token_2`.

It should verify that the second MCP request actually sent `access_token_2`.

Conceptually, the assertion is:

```text
first MCP request
Authorization: Bearer access_token_1

second MCP request
Authorization: Bearer access_token_2
```

That distinction is important because successful refresh alone does not prove that the MCP transport received the new credential.

The behavior we want to demonstrate is the complete path:

```text
token expires

    ↓

authentication layer obtains replacement

    ↓

new HTTP client receives replacement

    ↓

MCP request sends replacement
```

Once the example proves that sequence, we know the credential lifecycle is working across multiple MCP interactions.

## Carrying per-request context safely

So far, we have treated the application as though only one user were running an agent.

A real application may have many agent runs happening at the same time.

Suppose Alice and Bob both start workflows.

A global variable like this would be unsafe:

```python
CURRENT_TOKEN = None
```

Alice's request starts:

```text
CURRENT_TOKEN = Alice's token
```

Then Bob's request begins:

```text
CURRENT_TOKEN = Bob's token
```

If Alice's workflow prepares its next MCP connection after that, it could read Bob's credential instead.

At that point, we no longer have a token-expiry problem.

We have a credential-isolation problem.

The code that obtains the current access token therefore needs enough context to identify which user or session owns the MCP request.

One way to carry that context through asynchronous Python code is `ContextVar`.

```python
from contextvars import ContextVar

current_user = ContextVar("current_user")
```

When an application begins an agent run, it can associate that execution context with the current user:

```python
context_token = current_user.set(user_id)

try:
    result = await agent.ainvoke(input)
finally:
    current_user.reset(context_token)
```

The authentication layer can then resolve credentials for that user:

```python
async def get_access_token():
    user_id = current_user.get()

    token = await token_store.get(user_id)

    if token.expires_soon():
        token = await refresh_token(token)
        await token_store.save(user_id, token)

    return token.access_token
```

When the application later prepares an authenticated HTTP client, it does not need to pass Alice's or Bob's token through the agent.

It asks the authentication layer for the current credential:

```text
MCP connection needed

        ↓

authentication layer

        ↓

current request context

        ↓

identify user

        ↓

load that user's credential

        ↓

create authenticated HTTP client

        ↓

MCP request
```

The access token stays outside LangGraph state.

The request context carries identity, while the authentication layer remains responsible for loading and refreshing the corresponding credential.

### Avoid concurrent refreshes

There is another case to account for.

Suppose two MCP tool calls for the same user happen at nearly the same time.

Both load the same token:

```text
tool call A ──┐
              ├── access_token_1 is expiring
tool call B ──┘
```

Without coordination, both requests may decide to refresh it.

That is especially troublesome when the authorization server uses refresh-token rotation. A successful refresh can return a new refresh token and invalidate the previous one.

One request could therefore refresh successfully while another request is still preparing to use the old refresh token.

A per-user or per-session refresh lock avoids that race:

```python
async with refresh_lock(user_id):
    token = await token_store.get(user_id)

    if token.expires_soon():
        token = await refresh_token(token)
        await token_store.save(user_id, token)
```

Notice that the token is loaded again after acquiring the lock.

Another request may already have refreshed it while this request was waiting.

The sequence then becomes:

```text
request A                      request B

token expiring                token expiring

     ↓                             ↓

acquire refresh lock          wait

     ↓

refresh token

     ↓

save new token

     ↓

release lock

                                   ↓

                            acquire lock

                                   ↓

                            reload token

                                   ↓

                         new token already valid

                                   ↓

                              reuse it
```

This keeps credential refresh scoped to the user or session that owns it and prevents one agent run from accidentally interfering with another.

The boundary we want to preserve is:

```text
request context

      ↓

correct user

      ↓

correct credential

      ↓

authenticated HTTP client

      ↓

MCP request
```

An MCP connection may be part of a larger concurrent application, but one user's credentials should never become shared mutable authentication state.

## The other half — stateless sessions

A `401` usually sends you toward the credential path.

But a different failure can appear even when the access token is completely valid.

Suppose an MCP server exposes two tools:

```text
initialize_workspace()

search_workspace()
```

The first tool creates some server-side state that the second tool expects to find.

The agent runs:

```text
initialize_workspace()
```

and receives a successful response.

Later, it runs:

```text
search_workspace()
```

but the server responds:

```text
workspace not initialized
```

The credential is still valid.

The problem is the MCP session.

By default, tools loaded through `MultiServerMCPClient.get_tools()` do not share one persistent MCP session. A new session is created for each tool call.

The lifecycle therefore looks like this:

```text
open session

    ↓

tool call 1

    ↓

close session


open new session

    ↓

tool call 2

    ↓

close session
```

That works well when each MCP tool call is independent.

It becomes a problem when the server expects state created during one call to still exist during the next.

For that case, you can explicitly open an MCP session and load the tools against that session:

```python
from langchain_mcp_adapters.tools import load_mcp_tools

async with client.session("protected-server") as session:
    tools = await load_mcp_tools(session)

    agent = create_agent(
        model,
        tools,
    )

    await agent.ainvoke(...)
```

Now the same MCP session remains available while those tools are being used:

```text
open MCP session

      ↓

tool call 1

      ↓

tool call 2

      ↓

tool call 3

      ↓

close MCP session
```

The server can keep session-scoped state alive across those calls.

A persistent session is not automatically the better choice.

Keeping one open means keeping the underlying MCP session and any associated server-side state alive for longer. The application also needs to decide when that session should end and what to do if the connection is interrupted.

Use a shared session when the server actually depends on continuity between tool calls.

### Token lifetime and session lifetime are different

This brings us to the second lifecycle in a long-running MCP workflow.

The credential and the MCP session do not necessarily have the same lifetime.

A persistent MCP session can remain open long enough for its access token to expire.

A newly created MCP session can also fail immediately if it is created with an expired token.

So the application may need to answer two different questions:

```text
Which credential should this MCP connection use?
```

and:

```text
Should these tool calls share the same MCP session?
```

Those questions can appear during the same agent run, but they solve different problems.

The credential lifecycle determines whether the MCP request is authenticated with a valid token.

The session lifecycle determines whether state created during one MCP interaction is still available during the next.

Keeping those two lifecycles separate makes the failures much easier to reason about.

## Where the credential lifecycle belongs

The MCP adapter can connect LangChain tools to an MCP server.

The MCP transport can send requests to that server.

But the application still owns authentication state that is specific to the user running the workflow.

That includes questions such as:

```text
Which user is running this agent?

Where are that user's credentials stored?

Is the current access token still usable?

Should it be refreshed?

Is another request already refreshing it?

Does the user need to authorize again?
```

Those decisions belong to the application's authentication layer.

The MCP layer only needs the result: the credential that should be used for the connection it is about to make.

That gives us the same separation we started with:

```text
Application

  |
  +--> user/request context
  |
  +--> authentication layer
  |      |
  |      +--> token storage
  |      +--> refresh
  |      +--> reauthorization
  |
  v

create authenticated HTTP client

  |
  v

MCP transport

  |
  v

protected MCP server
```

The HTTP client is the handoff point.

It does not need to decide how OAuth works.

It receives the credential selected by the application's authentication layer and carries that credential into the MCP request.

This distinction also helps when debugging long-running workflows.

If the first MCP call succeeds and a later call returns:

```text
401 Unauthorized
```

inspect the credential that reached the later HTTP request.

Did the authentication layer obtain a new token?

Did the HTTP client receive it?

Did the MCP request actually send it?

If authentication continues to succeed but state created by an earlier MCP tool call disappears, inspect a different path:

```text
MCP session lifetime
```

Was a new session created for the later call?

Did the server expect state from the earlier session to still exist?

These failures can occur during the same agent run, but they come from different lifecycles:

```text
credential lifecycle

        and

session lifecycle
```

Keeping those responsibilities separate gives us a cleaner model for the rest of the application.

The authentication layer answers:

```text
Which credential should be used now?
```

The MCP session strategy answers:

```text
Should these tool calls share the same session?
```

They are related only because a long-running agent can expose both at the same time.

## Conclusion

Connecting a LangGraph agent to an OAuth-protected MCP server is not finished when the first authenticated tool call succeeds.

The earlier OAuth flow solved the first problem: keeping credentials out of the agent and letting the application own authentication.

Long-running agents introduce another problem.

Access tokens expire.

When that happens, refreshing the token inside the authentication layer is only part of the job. The next MCP connection also needs to receive that current credential.

The HTTP client creation path gives us that handoff point.

Keep OAuth and refresh logic in the application. Carry the correct user or session context into that layer. Resolve the current credential before creating the authenticated HTTP client, and verify in tests that the replacement token actually reaches the MCP server.

Then handle MCP session lifetime separately.

If the server expects state created by one tool call to still exist during the next, explicitly manage the MCP session and load the tools against that session.

The complete path looks like this:

```text
Agent chooses MCP tool

        ↓

request context identifies the user

        ↓

authentication layer resolves current credential

        ↓

reuse or refresh access token

        ↓

create authenticated HTTP client

        ↓

open or reuse the required MCP session

        ↓

MCP request uses current token

        ↓

tool executes
```

The responsibilities remain separate.

```text
LangGraph
    sees tools

Application authentication layer
    owns credentials and refresh

HTTP client
    carries the current credential

MCP session
    controls continuity between tool calls
```

That separation gives long-running agents two clear lifecycles to manage:

```text id="as8x3g"
credential lifetime

session lifetime
```

When a later MCP call fails, knowing which lifecycle you are looking at makes the problem much easier to trace.
