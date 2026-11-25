# Protect APIs on Kong Konnect

This guide explains how to secure your APIs at the [Kong Konnect](https://konghq.com/products/kong-konnect){:target="_blank"} gateway layer using tokens issued by {{product_name}}. Kong retrieves the public signing keys from the {{product_name}} JWKS endpoint and verifies every incoming token at the edge before it forwards authorized requests to your backend services.

The guide covers two integration approaches:

- **[JWT validation](#configure-jwt-validation)** - Configure Kong to validate JWTs issued by {{product_name}} using the [OpenID Connect plugin](https://developer.konghq.com/plugins/openid-connect/){:target="_blank"}, so that only authenticated requests reach your APIs.
- **[Scope-based authorization](#configure-scope-based-authorization)** - Use the API authorization capabilities of {{product_name}} to make Kong enforce access control based on the scopes in the token.

## Prerequisites

- {{product_name}} is running and reachable from the Kong data plane container.
- A [Kong Konnect](https://konghq.com/products/kong-konnect){:target="_blank"} account. The OpenID Connect plugin is available on Konnect-managed data planes.
- Docker is installed on your machine (required to run the Konnect data plane).
- `curl` is available in your terminal.

## Configure JWT validation

JWT validation is the foundation of API security with Kong Konnect and {{product_name}}. In this section, you register an application in {{product_name}} to obtain credentials, configure Kong to validate tokens using the {{product_name}} discovery endpoint and JWKS, and verify that unauthenticated requests are rejected.

### Set up {{product_name}} for JWT validation

Make {{product_name}} reachable from the Kong data plane container, register an application, and obtain an access token for it.

#### Set the hostname of {{product_name}}

The Kong data plane runs inside a Docker container and can't resolve `localhost` to your host machine. {{product_name}} embeds its hostname in the OpenID Connect discovery document and in the tokens it issues, so use a hostname that you can map to the Docker host from inside the container (for example, `is.local`).

1. Open the `<IS_HOME>/repository/conf/deployment.toml` file.
2. Set the `hostname` under `[server]`.

    ```toml
    [server]
    hostname = "<IS_HOSTNAME>"
    ```

3. Add an entry to the `/etc/hosts` file of your machine so that `<IS_HOSTNAME>` resolves to `127.0.0.1`.
4. Restart {{product_name}}.

!!! note
    For production deployments, also update the TLS certificate of {{product_name}} to match the new hostname. Learn more in [Change the hostname]({{base_path}}/deploy/change-the-hostname/).

#### Register an application

1. Sign in to the {{product_name}} Console at `https://<IS_HOSTNAME>:9443/console`.
2. Go to **Applications** and click **New Application**.
3. Select **M2M Application**, enter a name (for example, `kong-api-client`), and click **Register**.
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

### Set up Kong Konnect for JWT validation

Configure Kong Konnect to validate the tokens issued by {{product_name}}.

#### Create a control plane and data plane

1. Sign in to [Kong Konnect](https://cloud.konghq.com/){:target="_blank"}.
2. Open **Gateway Manager** and create a new **Control Plane** (for example, `wso2-is-demo`).
3. Konnect displays a `docker run` command to start a data plane node. The command is pre-filled with the cluster endpoints of your control plane and the generated mTLS certificates. Copy the command and add the following options so that the data plane can proxy HTTPS traffic and resolve {{product_name}}:

    - `-p 8443:8443` publishes the HTTPS proxy port.
    - `--add-host=<IS_HOSTNAME>:host-gateway` maps the {{product_name}} hostname to the Docker host from inside the data plane container.

    The resulting command looks similar to the following. Use the exact endpoints and certificate values from Konnect.

    ```bash
    docker run -d --name kong-dp \
      -e "KONG_ROLE=data_plane" \
      -e "KONG_DATABASE=off" \
      -e "KONG_CLUSTER_MTLS=pki" \
      -e "KONG_CLUSTER_CONTROL_PLANE=<CP_ENDPOINT>:443" \
      -e "KONG_CLUSTER_SERVER_NAME=<CP_SERVER_NAME>" \
      -e "KONG_CLUSTER_TELEMETRY_ENDPOINT=<TELEMETRY_ENDPOINT>:443" \
      -e "KONG_CLUSTER_TELEMETRY_SERVER_NAME=<TELEMETRY_SERVER_NAME>" \
      -e "KONG_CLUSTER_CERT=<CLUSTER_CERT>" \
      -e "KONG_CLUSTER_CERT_KEY=<CLUSTER_CERT_KEY>" \
      -e "KONG_LUA_SSL_TRUSTED_CERTIFICATE=system" \
      -e "KONG_KONNECT_MODE=on" \
      -e "KONG_PROXY_LISTEN=0.0.0.0:8443 ssl" \
      --add-host=<IS_HOSTNAME>:host-gateway \
      -p 8443:8443 \
      kong/kong-gateway:3.9
    ```

4. Wait until the data plane shows as **Connected** in **Gateway Manager**.

!!! important
    `<IS_HOSTNAME>` must resolve to your {{product_name}} instance from inside the Kong data plane container. Don't use `localhost`, which points to the Kong container itself. The same hostname must appear in the `issuer` of the discovery document, the `iss` claim of the access token, and the `issuer` value of the plugin.

#### Create a service and route

1. In **Gateway Manager**, open your control plane and go to **Services** > **Add Service**.
2. Enter a name (for example, `bookings`) and set the **URL** to your upstream bookings API (for example, `https://<BOOKINGS_API>`).
3. Open the new service, go to **Routes** > **Add Route**, and add a route with the path `/bookings`.

#### Add JWT validation

Attach the OpenID Connect plugin to the route so that it validates every incoming token.

1. Open the `/bookings` route and go to **Plugins** > **Add Plugin**.
2. Select **OpenID Connect**.
3. Configure the following parameters.

    | Parameter | Value |
    |---|---|
    | `issuer` | `https://<IS_HOSTNAME>:9443/oauth2/token/.well-known/openid-configuration` |
    | `client_id` | `<CLIENT_ID>` |
    | `client_secret` | `<CLIENT_SECRET>` |
    | `client_auth` | `client_secret_post` |
    | `auth_methods` | `bearer` |
    | `bearer_token_param_type` | `header` |

4. Save the plugin.

With `issuer` set, the plugin fetches the {{product_name}} JWKS from the discovery document and verifies the signature, issuer, and expiry of each token. Restricting `auth_methods` to `bearer` makes the plugin validate the incoming access token only, without initiating a login flow. Setting `bearer_token_param_type` to `header` makes the plugin read the token from the `Authorization: Bearer <token>` header.

!!! note
    {{product_name}} uses a self-signed certificate by default. The plugin's `ssl_verify` parameter is `false` by default, which lets Kong fetch the discovery document during local development. In production, use a certificate trusted by Kong and set `ssl_verify` to `true`.

### Test JWT validation

1. Send a request without a token. Kong returns `401 Unauthorized`.

    ```bash
    curl -k -i "https://127.0.0.1:8443/bookings"
    ```

2. Send a request with a valid token issued by {{product_name}}. Kong forwards the request to the upstream and returns `200 OK`.

    ```bash
    export ACCESS_TOKEN="<ACCESS_TOKEN>"
    curl -k -i "https://127.0.0.1:8443/bookings" \
      -H "Authorization: Bearer $ACCESS_TOKEN"
    ```

If the token is missing, invalid, or expired, Kong returns `401 Unauthorized`.

## Configure scope-based authorization

JWT validation confirms that a token is valid and that {{product_name}} issued it. It doesn't control what the token holder is allowed to do. With the configuration from the previous section, Kong accepts any valid token issued by {{product_name}}, regardless of the application or its permissions.

Scope-based authorization adds a second layer of control. {{product_name}} includes in the token the scopes that the application is authorized to consume. Kong then checks those scopes on every request and rejects tokens that don't carry the required permissions. To do so, configure the `scopes_required` parameter of the OpenID Connect plugin.

The steps below build on the JWT validation configuration from the previous section.

### Set up {{product_name}} for scope-based authorization

Register your API and its scopes in {{product_name}}, and authorize the application to consume them.

#### Register an API resource

An API resource represents your API in {{product_name}} and defines its permissions as scopes.

1. On the {{product_name}} Console, go to **Resources** > **API Resources**.
2. Click **+ New API**.
3. Enter an **Identifier** (for example, `https://bookings.example.com`) and a **Display Name** (for example, `Bookings API`), and click **Next**.
4. Add the following scopes. For each scope, enter the **Scope (Permission)** and **Display Name**, and click **Add Scope**. Then, click **Next**.

    | Scope (Permission) | Display Name |
    |---|---|
    | `bookings:read` | `Read bookings` |
    | `bookings:write` | `Write bookings` |

5. Keep **Requires authorization** enabled and click **Finish**.

#### Authorize the application to consume the API resource

1. On the {{product_name}} Console, go to **Applications** and select the application you created earlier (`kong-api-client`).
2. Go to the **API Authorization** tab and click **Authorize an API Resource**.
3. Select the `Bookings API` API resource, select the `bookings:read` scope, and click **Finish**.

{{product_name}} can now include the `bookings:read` scope in tokens issued to the application.

### Set up Kong Konnect for scope-based authorization

Update the OpenID Connect plugin on your `/bookings` route to require the `bookings:read` scope.

1. Open the **OpenID Connect** plugin configuration of the route.
2. Set the following parameter.

    | Parameter | Value |
    |---|---|
    | `scopes_required` | `bookings:read` |

3. Save the plugin.

The plugin reads scopes from the `scope` claim (the default `scopes_claim`) and rejects any token missing `bookings:read` with `403 Forbidden`, before the request reaches your upstream.

!!! tip
    To restrict tokens to this API, set `audience_required` to the identifier of the API resource (for example, `https://bookings.example.com`). {{product_name}} adds the identifier of the API resource to the `aud` claim of the access token, which the plugin reads from the default `audience_claim` (`aud`).

### Test scope-based authorization

1. Request a token with the required scope.

    ```bash
    curl -k -X POST 'https://<IS_HOSTNAME>:9443/oauth2/token' \
      -u '<CLIENT_ID>:<CLIENT_SECRET>' \
      --header 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode 'grant_type=client_credentials' \
      --data-urlencode 'scope=bookings:read'
    ```

    The response confirms that the scope is present.

    ```json
    {
      "access_token": "<ACCESS_TOKEN>",
      "scope": "bookings:read",
      "token_type": "Bearer",
      "expires_in": 3600
    }
    ```

2. Call the protected API with the token. Kong verifies that the token carries the `bookings:read` scope and forwards the request to your upstream bookings API.

    ```bash
    export ACCESS_TOKEN="<ACCESS_TOKEN>"
    curl -k -i "https://127.0.0.1:8443/bookings" \
      -H "Authorization: Bearer $ACCESS_TOKEN"
    ```

3. Call the protected API with a token that doesn't carry the required scope. Kong returns `403 Forbidden`.

    ```bash
    curl -k -i "https://127.0.0.1:8443/bookings" \
      -H "Authorization: Bearer <TOKEN_WITHOUT_REQUIRED_SCOPE>"
    ```

## Plugin parameter reference

| Parameter | Value | Description |
|---|---|---|
| `issuer` | `https://<IS_HOSTNAME>:9443/oauth2/token/.well-known/openid-configuration` | The OpenID Connect discovery endpoint of {{product_name}}. The plugin fetches the JWKS from here and verifies the signature, issuer, and expiry of each token. |
| `client_id` | `<CLIENT_ID>` | The client ID of the M2M application. |
| `client_secret` | `<CLIENT_SECRET>` | The client secret of the M2M application. |
| `client_auth` | `client_secret_post` | Sends the client credentials of the plugin in the request body when the plugin calls {{product_name}} endpoints. |
| `auth_methods` | `bearer` | Restricts the plugin to validating the incoming bearer access token, without starting a login flow. |
| `bearer_token_param_type` | `header` | Reads the bearer token from the `Authorization` header. |
| `scopes_required` | `bookings:read` | Scopes that the token must carry. Requests with tokens missing these scopes are rejected with `403`. Omit this parameter to accept any valid token. |
| `scopes_claim` | `scope` | The token claim from which the plugin reads scopes. {{product_name}} issues scopes in the `scope` claim. |
| `audience_required` | `<API_RESOURCE_IDENTIFIER>` | Optional. The audience that the token must carry. Set it to the identifier of the API resource that represents this API. |
| `audience_claim` | `aud` | The token claim from which the plugin reads the audience. |
