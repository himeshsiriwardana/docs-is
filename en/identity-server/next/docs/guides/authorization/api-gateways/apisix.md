# Protect APIs on Apache APISIX

This guide explains how to secure your APIs at the [Apache APISIX](https://apisix.apache.org/){:target="_blank"} gateway layer using tokens issued by {{product_name}}. APISIX retrieves the public signing keys from the {{product_name}} JWKS endpoint and verifies every incoming token at the edge before it forwards authorized requests to your backend services.

The guide covers two integration approaches:

- **[JWT validation](#configure-jwt-validation)** - Configure APISIX to validate JWTs issued by {{product_name}} using the [OpenID Connect plugin](https://apisix.apache.org/docs/apisix/plugins/openid-connect/){:target="_blank"}, so that only authenticated requests reach your APIs.
- **[Scope-based authorization](#configure-scope-based-authorization)** - Use the API authorization capabilities of {{product_name}} to make APISIX enforce access control based on the scopes in the token.

## Prerequisites

- {{product_name}} is running and reachable from the APISIX Docker container.
- Docker is installed on your machine (required to run Apache APISIX).
- `curl` is available in your terminal.

## Configure JWT validation

JWT validation is the foundation of API security with APISIX and {{product_name}}. In this section, you expose {{product_name}} to the APISIX container, register an application to obtain credentials, configure APISIX to validate tokens using the {{product_name}} discovery endpoint, and verify that unauthenticated requests are rejected.

### Set up {{product_name}} for JWT validation

Make {{product_name}} reachable from the APISIX container, register an application, and obtain an access token for it.

#### Expose {{product_name}} to Docker

Apache APISIX runs inside a Docker container and can't resolve `localhost` to your host machine. {{product_name}} embeds its hostname in the OpenID Connect discovery document and in the tokens it issues, so the hostname must be reachable both from inside Docker and from your local machine. Use your machine's LAN IP address or any hostname that satisfies both.

1. Open the `<IS_HOME>/repository/conf/deployment.toml` file.
2. Set the `hostname` under `[server]` to a reachable IP address or hostname.

    ```toml
    [server]
    hostname = "<IS_HOSTNAME>"
    ```

3. Restart {{product_name}}.

!!! important
    `<IS_HOSTNAME>` must resolve to your {{product_name}} instance from inside the APISIX container. Don't use `localhost`, which points to the APISIX container itself. The same hostname must appear in the `issuer` of the discovery document, the `iss` claim of the access token, and the `discovery` URL of the plugin.

    For production deployments, also update the TLS certificate of {{product_name}} to match the new hostname. Learn more in [Change the hostname]({{base_path}}/deploy/change-the-hostname/).

#### Register an application

1. Sign in to the {{product_name}} Console at `https://<IS_HOSTNAME>:9443/console`.
2. Go to **Applications** and click **New Application**.
3. Select **M2M Application**, enter a name (for example, `apisix-client`), and click **Register**.
4. Go to the **Protocol** tab and note the **Client ID** and **Client Secret**.
5. Under **Access Token**, make sure the **Token type** is set to **JWT**, and click **Update**.

#### Obtain an access token

Use the client credentials grant to request an access token.

```bash
curl -k -X POST 'https://<IS_HOSTNAME>:9443/oauth2/token' \
  -u '<CLIENT_ID>:<CLIENT_SECRET>' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=client_credentials'
```

The response contains an `access_token`.

```json
{
  "access_token": "<ACCESS_TOKEN>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

The token is a JWT signed with RS256. Its `iss` claim is `https://<IS_HOSTNAME>:9443/oauth2/token`, which matches the issuer in the discovery document you configure on the plugin. Copy the `access_token` value to call the protected route.

### Set up Apache APISIX for JWT validation

Configure Apache APISIX to validate the tokens issued by {{product_name}}.

#### Start Apache APISIX

Run the APISIX quickstart script to start a local APISIX instance using Docker.

```bash
curl -sL https://run.api7.ai/apisix/quickstart | sh
```

When the script completes, APISIX runs with the Admin API on port `9180` and the proxy on port `9080`.

#### Create a route with JWT validation

Create a route that requires a valid JWT issued by {{product_name}}. The `openid-connect` plugin fetches the JWKS from the {{product_name}} discovery document and validates every incoming bearer token against it.

```bash
curl -i 'http://127.0.0.1:9180/apisix/admin/routes' -X PUT -d '{
  "id": "auth-with-wso2-is",
  "uri": "/anything/*",
  "plugins": {
    "openid-connect": {
      "bearer_only": true,
      "client_id": "<CLIENT_ID>",
      "client_secret": "<CLIENT_SECRET>",
      "use_jwks": true,
      "discovery": "https://<IS_HOSTNAME>:9443/oauth2/token/.well-known/openid-configuration",
      "ssl_verify": false
    }
  },
  "upstream": {
    "type": "roundrobin",
    "nodes": {
      "httpbin.org:80": 1
    }
  }
}'
```

With `discovery` set, the plugin fetches the {{product_name}} JWKS and verifies the signature, issuer, and expiry of each token. Setting `bearer_only` to `true` makes APISIX return `401` for requests without a valid token instead of redirecting to a sign-in page.

### Test JWT validation

1. Send a request without a token. APISIX returns `401 Unauthorized`.

    ```bash
    curl -i 'http://127.0.0.1:9080/anything/test'
    ```

2. Send a request with a valid token issued by {{product_name}}. APISIX forwards the request to the upstream and returns `200 OK`.

    ```bash
    export ACCESS_TOKEN="<ACCESS_TOKEN>"
    curl -i 'http://127.0.0.1:9080/anything/test' \
      -H "Authorization: Bearer $ACCESS_TOKEN"
    ```

If the token is missing, invalid, or expired, APISIX returns `401 Unauthorized`.

## Configure scope-based authorization

JWT validation confirms that a token is valid and that {{product_name}} issued it. It doesn't control what the token holder is allowed to do. With the configuration from the previous section, APISIX accepts any valid token issued by {{product_name}}, regardless of the application or its permissions.

Scope-based authorization adds a second layer of control. {{product_name}} includes in the token the scopes that the application is authorized to consume. APISIX then checks those scopes on every request and rejects tokens that don't carry the required permissions. To do so, configure the `required_scopes` parameter of the OpenID Connect plugin.

The steps below build on the JWT validation configuration from the previous section.

### Set up {{product_name}} for scope-based authorization

Register your API and its scopes in {{product_name}}, and authorize the application to consume them.

#### Register an API resource

An API resource represents your API in {{product_name}} and defines its permissions as scopes.

1. On the {{product_name}} Console, go to **Resources** > **API Resources**.
2. Click **+ New API**.
3. Enter an **Identifier** (for example, `https://httpbin.example.com`) and a **Display Name** (for example, `HTTPBin API`), and click **Next**.
4. Enter `headers:read` as the **Scope (Permission)**, `Read headers` as the **Display Name**, and click **Add Scope**. Then, click **Next**.
5. Keep **Requires authorization** enabled and click **Finish**.

#### Authorize the application to consume the API resource

1. On the {{product_name}} Console, go to **Applications** and select the application you created earlier (`apisix-client`).
2. Go to the **API Authorization** tab and click **Authorize an API Resource**.
3. Select the `HTTPBin API` API resource, select the `headers:read` scope, and click **Finish**.

{{product_name}} can now include the `headers:read` scope in tokens issued to the application.

### Set up Apache APISIX for scope-based authorization

Update the route to require the `headers:read` scope. APISIX rejects tokens that don't carry the scope with `403 Forbidden`.

```bash
curl -i 'http://127.0.0.1:9180/apisix/admin/routes' -X PUT -d '{
  "id": "auth-with-wso2-is",
  "uri": "/anything/*",
  "plugins": {
    "openid-connect": {
      "bearer_only": true,
      "client_id": "<CLIENT_ID>",
      "client_secret": "<CLIENT_SECRET>",
      "use_jwks": true,
      "discovery": "https://<IS_HOSTNAME>:9443/oauth2/token/.well-known/openid-configuration",
      "ssl_verify": false,
      "required_scopes": ["headers:read"]
    }
  },
  "upstream": {
    "type": "roundrobin",
    "nodes": {
      "httpbin.org:80": 1
    }
  }
}'
```

### Test scope-based authorization

1. Request a token with the required scope.

    ```bash
    curl -k -X POST 'https://<IS_HOSTNAME>:9443/oauth2/token' \
      -u '<CLIENT_ID>:<CLIENT_SECRET>' \
      --header 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode 'grant_type=client_credentials' \
      --data-urlencode 'scope=headers:read'
    ```

    The response confirms that the scope is present.

    ```json
    {
      "access_token": "<ACCESS_TOKEN>",
      "scope": "headers:read",
      "token_type": "Bearer",
      "expires_in": 3600
    }
    ```

2. Call the protected API with the token. APISIX verifies that the token carries the `headers:read` scope and forwards the request to the upstream.

    ```bash
    export ACCESS_TOKEN="<ACCESS_TOKEN>"
    curl -i 'http://127.0.0.1:9080/anything/test' \
      -H "Authorization: Bearer $ACCESS_TOKEN"
    ```

3. Call the protected API with a token that doesn't carry the required scope (for example, the token you obtained without the `scope` parameter). APISIX returns `403 Forbidden`.

    ```bash
    curl -i 'http://127.0.0.1:9080/anything/test' \
      -H "Authorization: Bearer <TOKEN_WITHOUT_REQUIRED_SCOPE>"
    ```

## Plugin parameter reference

| Parameter | Value | Description |
|---|---|---|
| `discovery` | `https://<IS_HOSTNAME>:9443/oauth2/token/.well-known/openid-configuration` | The OpenID Connect discovery endpoint of {{product_name}}. The plugin fetches the JWKS from here and verifies the signature, issuer, and expiry of each token. The hostname must resolve from inside the APISIX Docker container. |
| `client_id` | `<CLIENT_ID>` | The client ID of the M2M application. |
| `client_secret` | `<CLIENT_SECRET>` | The client secret of the M2M application. |
| `bearer_only` | `true` | Requires a bearer token in all requests. APISIX returns `401` for requests without a valid token instead of redirecting to a sign-in page. |
| `use_jwks` | `true` | Validates JWT signatures using the JWKS endpoint advertised in the discovery document. |
| `ssl_verify` | `false` | Disables TLS certificate verification. Use this only during local development when {{product_name}} uses a self-signed certificate. Enable certificate verification in production. |
| `required_scopes` | `["headers:read"]` | Scopes that the token must carry. Requests with tokens missing these scopes are rejected with `403`. Omit this parameter to accept any valid token. |
