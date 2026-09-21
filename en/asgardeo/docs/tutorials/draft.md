---

title: "MCP and OAuth 2.1: What Actually Changed and Why It Matters"

slug: "/blog/mcp-oauth-2-1/"

meta_title: "MCP and OAuth 2.1: What Actually Changed and Why It Matters"

meta_description: "OAuth 2.1 is not a new protocol. Here is precisely which constraints it tightens and what that means for an MCP implementation."

---

# MCP and OAuth 2.1: What Actually Changed and Why It Matters**

You open the MCP authorization specification to protect a server and run into a version number you were not planning to learn: **OAuth 2.1****.

If you already know OAuth 2.0, the name makes the change sound larger than it is. There is no new token type to learn, no replacement for the authorization code flow, and no new set of actors. You still have a client asking for access, an authorization server issuing tokens, and a resource server accepting them.

OAuth 2.1 mostly takes the OAuth practices developers have spent years adding on top of OAuth 2.0 and makes them the normal path.

Some older options disappear. PKCE moves into the authorization code flow. Redirect URIs become stricter. Access tokens stay out of URLs.

For an MCP client, the result is a smaller set of authorization patterns to support.

This article covers the changes you are most likely to encounter while implementing MCP authorization, why they fit agent-based applications, and the extra discovery and resource rules MCP adds around OAuth.

## OAuth 2.1 is a consolidation, not a reinvention**

OAuth 2.0 was designed as a framework. It deliberately supported several kinds of clients and several ways of getting tokens.

Over time, experience showed that some of those choices were safer than others. New RFCs and security guidance filled the gaps: PKCE protected authorization codes, native-app guidance tightened redirect handling, and the OAuth security best current practice deprecated older flows.

OAuth 2.1 pulls that accumulated guidance back into a single framework.

The easiest way to read it is:

> If you already implement modern OAuth 2.0 correctly, OAuth 2.1 should look familiar.

The basic roles are unchanged.

- The **client**** requests access. In MCP, this is the application connecting to a protected MCP server.

- The **authorization server**** authenticates the user, obtains authorization when needed, and issues tokens.

- The **resource server**** receives the access token and protects the API. In this case, that is the MCP server.

OAuth 2.1 narrows how those roles interact. For MCP, four changes are especially visible: PKCE is part of the authorization code flow, the implicit and password grants are gone, redirect URIs are matched exactly, and bearer tokens are not sent in query strings.

## The OAuth 2.1 changes you see in MCP**

### PKCE is required for authorization code flows**

In an authorization code flow, the client sends the user to the authorization server. After login and authorization, the browser returns with a short-lived authorization code.

The client then exchanges that code for tokens.

Without another proof attached to the flow, an intercepted authorization code may be useful to whoever captures it.

PKCE adds that proof.

Before opening the authorization request, the client creates a random value called a \`code_verifier\`. It hashes that value to create a \`code_challenge\`.

\`\`\`text

code_verifier

      |

      | SHA-256

      v

code_challenge

\`\`\`

The client sends the challenge in the authorization request but keeps the verifier.

Later, when it exchanges the authorization code for tokens, it sends the original verifier. The authorization server computes the challenge again and compares it with the one from the original request.

An intercepted authorization code is therefore not enough by itself.

In OAuth 2.1, PKCE is part of the authorization code flow rather than an optional enhancement you need to remember separately.

### The implicit grant is removed**

OAuth 2.0 allowed browser-based clients to use the implicit grant and receive an access token directly from the authorization endpoint.

A simplified implicit flow looked like this:

\`\`\`text

Browser -> Authorization server -> Access token -> Browser

\`\`\`

OAuth 2.1 removes that grant.

The preferred shape is the authorization code flow with PKCE:

\`\`\`text

Browser -> Authorization server -> Authorization code -> Client

                                                   |

                                                   v

                                             Token endpoint

                                                   |

                                                   v

                                              Access token

\`\`\`

The browser still handles the user's interaction with the authorization server, but the access token no longer needs to arrive through the browser redirect.

For an MCP application, the client can open the authorization page, receive a code at its callback, and perform the token exchange itself.

### The password grant is removed**

The Resource Owner Password Credentials grant allowed an application to collect a user's username and password and exchange them for a token.

That makes the OAuth client responsible for handling credentials that should normally be entered only at the identity provider.

OAuth 2.1 removes the grant.

An MCP client should therefore not respond to an authorization requirement by asking:

\`\`\`text

Username:

Password:

\`\`\`

and forwarding those credentials to the authorization server.

Instead, the client sends the user to the authorization server. Login, MFA, passkeys, conditional access, and other authentication steps remain there. The MCP client receives delegated credentials such as access and refresh tokens, not the user's account password.

### Redirect URIs use exact string matching**

After authorization, the authorization server needs to know where it is allowed to return the user.

That destination is the client's redirect URI.

For example:

\`\`\`text

http://127.0.0.1:8765/callback

\`\`\`

OAuth 2.1 requires redirect URIs to be matched using exact string comparison, with the loopback-port behavior used by native applications handled separately.

If the registered redirect URI is:

\`\`\`text

https://client.example.com/oauth/callback

\`\`\`

the authorization server should not treat this as the same redirect:

\`\`\`text

https://client.example.com/anything-else

\`\`\`

just because it shares the same host.

For client implementations, the practical rule is simple: register the complete callback URI and send the expected URI in the authorization request rather than depending on wildcard or partial matching.

### Bearer tokens stay out of query strings**

OAuth 2.0 bearer-token usage historically allowed an access token to appear in a URI query parameter.

For example:

\`\`\`text

https://mcp.example.com/mcp?access_token=eyJ...

\`\`\`

OAuth 2.1 omits that method.

URLs are routinely copied into logs and traces, and they can also surface in browser history or debugging output. Putting a bearer credential there makes accidental exposure much easier.

For MCP over HTTP, send the bearer token in the \`Authorization\` header:

\`\`\`http

Authorization: Bearer eyJ...

\`\`\`

The MCP server then validates the token before allowing access to the protected resource.

## How those changes fit agent flows**

OAuth 2.1 was not designed only for AI agents. The same rules apply to ordinary applications.

Agents simply create a useful environment for seeing why those rules exist.

A traditional application often exposes the API action directly to the user. The user clicks **Connect calendar****, completes authorization, and then uses the calendar feature.

An agent may encounter authorization halfway through a task.

The user asks:

\`\`\`text

Move my meeting with Maya to Friday afternoon.

\`\`\`

The agent decides it needs a calendar tool. The MCP server hosting that tool requires authorization, so the client has to interrupt the run, obtain access from the user, and then continue.

That authorization step moves through the agent runtime, the MCP client, the browser, and back into the application before the tool call finally reaches the MCP server. OAuth 2.1 narrows how credentials and authorization responses move through that path.

### PKCE protects the return from the browser**

Desktop and local agent applications commonly open authorization in the user's browser and receive the result through a callback.

The browser returns an authorization code, but the token exchange also requires the \`code_verifier\` created by the client before the browser was opened.

Capturing the callback alone does not provide everything required to exchange the code.

### Removing the implicit grant keeps tokens out of the browser redirect**

The browser participates because the user needs somewhere to authenticate and approve access.

It does not need to carry the agent's access token back in the redirect.

With authorization code plus PKCE, the browser returns a temporary code. The client exchanges it at the token endpoint and keeps the resulting credentials within the application.

That gives the agent runtime a cleaner boundary between user interaction and credential handling.

### Removing the password grant keeps user credentials away from the agent**

An agent may eventually call several MCP servers operated by different organizations.

Giving the agent the user's identity-provider password so it can obtain tokens would turn one credential into a credential available to the entire agent application.

OAuth keeps the relationship narrower.

The user authenticates with the authorization server. The client receives a token representing the access that was granted. The MCP server receives that token and decides whether it is acceptable for the requested operation.

The password never needs to enter the agent's tool-calling path.

### Exact redirect matching limits where the authorization response can return**

An MCP client may run in a browser, on the desktop, or as part of a local development tool. Whatever the environment, the authorization server needs a clearly defined place to return the user after login.

Exact redirect matching makes that destination explicit instead of allowing a broadly registered URL to cover unrelated paths.

### Keeping tokens out of URLs reduces accidental exposure**

Agent applications are often heavily instrumented, so request data can pass through tracing and debugging systems during development and production. URLs are especially likely to be recorded along the way.

Keeping access tokens in the \`Authorization\` header does not remove the need for careful secret handling, but it avoids putting the credential in a field that infrastructure routinely records.

None of these rules is specific to a language model. They simply fit an environment where authorization can be triggered dynamically and credentials may cross several application components before a tool call reaches the MCP server.

## What MCP adds on top**

OAuth 2.1 describes how a client obtains and uses authorization.

MCP also needs to answer two practical questions:

1\. **Which authorization server should the client use for this MCP server?****

2\. **How does the client request a token intended for this particular MCP resource?****

MCP uses existing OAuth standards for both.

### Protected Resource Metadata**

Imagine an MCP client connecting to:

\`\`\`text

https://mcp.example.com/mcp

\`\`\`

That server may validate access tokens without running the login or token endpoints itself.

The authorization server may live at:

\`\`\`text

https://identity.example.com

\`\`\`

MCP uses **OAuth 2.0 Protected Resource Metadata****, defined by RFC 9728, so the resource server can publish the authorization servers that can be used with it.

A simplified metadata document looks like this:

\`\`\`json

{

  "resource": "https://mcp.example.com/mcp",

  "authorization_servers": [

    "https://identity.example.com"

  ]

}

\`\`\`

The client can then move through a discovery chain:

\`\`\`text

MCP server

    |

    v

Protected Resource Metadata

    |

    v

Authorization server

    |

    v

Authorization Server Metadata

    |

    v

Authorization endpoint + token endpoint

\`\`\`

The client does not need a hard-coded authorization endpoint for every MCP server it may encounter.

### Resource indicators**

MCP also uses the \`resource\` parameter from RFC 8707.

When requesting authorization, the client identifies the protected resource it intends to access:

\`\`\`text

resource=https://mcp.example.com/mcp

\`\`\`

The authorization server can then issue an access token for that resource.

The same authorization server might issue tokens for several APIs. Naming the MCP resource prevents the client from treating a token intended for one service as a generic credential for every service that trusts the same issuer.

So the layers look roughly like this:

\`\`\`text

OAuth 2.1

    Authorization flow and token usage

RFC 9728

    Discover the authorization setup for the MCP resource

RFC 8707

    Identify the resource the client wants to access

MCP

    Defines how those pieces are used between MCP clients and servers

\`\`\`

## An annotated implementation**

The following example shows the OAuth 2.1 pieces in one small Python client.

It assumes that discovery has already given us the authorization and token endpoints. A production MCP client would normally discover those endpoints from the MCP server's Protected Resource Metadata and the authorization server's metadata rather than hard-code them.

Install the dependency first:

\`\`\`bash

pip install httpx

\`\`\`

Set the client ID supplied by your authorization server:

\`\`\`bash

export MCP_CLIENT_ID="<your-client-id>"

\`\`\`

Then run the client:

\`\`\`python

import base64

import hashlib

import os

import secrets

import urllib.parse

import httpx



AUTHORIZATION_ENDPOINT = "https://identity.example.com/oauth2/authorize"

TOKEN_ENDPOINT = "https://identity.example.com/oauth2/token"

CLIENT_ID = os.environ["MCP_CLIENT_ID"]

# OAuth 2.1: use the complete registered callback URI.

REDIRECT_URI = "http://127.0.0.1:8765/callback"

# MCP + RFC 8707: identify the protected MCP resource.

RESOURCE = "https://mcp.example.com/mcp"



# OAuth 2.1: authorization code flows use PKCE.

# Create a fresh high-entropy verifier for this authorization attempt.

code_verifier = secrets.token_urlsafe(64)

# OAuth 2.1: use the S256 PKCE challenge method.

digest = hashlib.sha256(code_verifier.encode("ascii")).digest()

code_challenge = (

    base64.urlsafe_b64encode(digest)

    .rstrip(b"=")

    .decode("ascii")

)

# Recommended OAuth protection for correlating the callback

# with the authorization request that started it.

state = secrets.token_urlsafe(32)



authorization_params = {

    # OAuth 2.1: request an authorization code.

    # The implicit response_type=token flow is not used.

    "response_type": "code",

    "client_id": CLIENT_ID,

    # OAuth 2.1: send the complete registered redirect URI.

    "redirect_uri": REDIRECT_URI,

    # OAuth 2.1: bind the authorization code to this client instance.

    "code_challenge": code_challenge,

    "code_challenge_method": "S256",

    # MCP + RFC 8707: request access for this MCP server.

    "resource": RESOURCE,

    "state": state,

}



authorization_url = (

    AUTHORIZATION_ENDPOINT

    + "?"

    + urllib.parse.urlencode(authorization_params)

)

print("Open this URL in a browser:")

print(authorization_url)

# For a compact example, paste the callback URL after authorization.

# A desktop or web client would normally receive this automatically.

callback_url = input("\nPaste the callback URL: ").strip()

callback = urllib.parse.urlparse(callback_url)

callback_params = urllib.parse.parse_qs(callback.query)

returned_state = callback_params.get("state", [None])[0]

if returned_state != state:

    raise RuntimeError("Authorization response state did not match.")

authorization_code = callback_params.get("code", [None])[0]

if not authorization_code:

    raise RuntimeError("Authorization response did not contain a code.")



token_response = httpx.post(

    TOKEN_ENDPOINT,

    data={

        "grant_type": "authorization_code",

        "client_id": CLIENT_ID,

        "code": authorization_code,

        # OAuth 2.1: prove possession of the verifier used

        # to create the original PKCE challenge.

        "code_verifier": code_verifier,

        # MCP + RFC 8707: keep the request associated

        # with the intended protected resource.

        "resource": RESOURCE,

    },

)

token_response.raise_for_status()

tokens = token_response.json()

access_token = tokens["access_token"]



mcp_response = httpx.post(

    RESOURCE,

    # OAuth 2.1 / bearer token usage:

    # send the token in the Authorization header,

    # never as ?access_token=... in the URL.

    headers={

        "Authorization": f"Bearer {access_token}",

        "Content-Type": "application/json",

    },

    json={

        "jsonrpc": "2.0",

        "id": 1,

        "method": "tools/list",

        "params": {},

    },

)

mcp_response.raise_for_status()

print(mcp_response.json())

\`\`\`

The constraints are easier to see when you look at what the code does **not**** contain.

There is no username or password field. Authentication stays at the authorization server.

There is no \`response_type=token\`. The browser returns an authorization code rather than an access token.

The code cannot be exchanged without the PKCE verifier created before authorization started.

The callback URI is the complete URI registered for the client.

The MCP request does not append an access token to the URL. The token travels in the \`Authorization\` header.

And the \`resource\` parameter identifies the MCP server the client is asking to access.

That is the shape OAuth 2.1 and MCP are pushing implementations toward.

## Migration checklist**

If you already built an MCP client using older OAuth 2.0 patterns, you probably do not need to replace the entire authorization layer. Walk through the flow and remove the patterns OAuth 2.1 no longer carries forward.

- **Authorization code without PKCE:**** generate a verifier for every authorization attempt and send an \`S256\` code challenge.

- **Implicit grant:**** replace \`response_type=token\` with the authorization code flow and PKCE.

- **Password grant:**** stop collecting the user's identity-provider credentials in the MCP client and redirect the user to the authorization server instead.

- **Loose redirect matching:**** register complete callback URIs and send the expected redirect URI during authorization.

- **Bearer tokens in URLs:**** send access tokens using the \`Authorization: Bearer\` header.

- **Hard-coded authorization server assumptions:**** use Protected Resource Metadata to discover the authorization setup exposed by the MCP server.

- **Tokens requested without a target resource:**** send the RFC 8707 \`resource\` parameter for the MCP server.

OAuth 2.1 does not give MCP a new authorization model.

It trims OAuth down to the patterns modern clients are expected to use: authorization code with PKCE, explicit redirect destinations, no password or implicit grants, and bearer credentials kept out of URLs.

MCP then adds the pieces needed when clients connect to protected servers they may not know in advance: discovery through Protected Resource Metadata and resource-specific authorization through RFC 8707.

If you already know OAuth 2.0, you do not need to relearn OAuth before implementing MCP.

You need to know which old paths are gone, which protections are now part of the default flow, and which extra metadata MCP uses to connect the client, authorization server, and protected resource.