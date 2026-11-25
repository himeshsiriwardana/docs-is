# Protect APIs on KrakenD

This guide explains how to secure your APIs at the [KrakenD](https://www.krakend.io/){:target="_blank"} gateway layer using tokens issued by {{product_name}}. KrakenD retrieves the public signing keys from the {{product_name}} JWKS endpoint and verifies every incoming token at the edge before it forwards authorized requests to your backend services.

The guide covers two integration approaches:

- **[JWT validation](#configure-jwt-validation)** - Configure KrakenD to validate JWTs issued by {{product_name}} using the [`auth/validator`](https://www.krakend.io/docs/authorization/jwt-validation/){:target="_blank"} component, so that only authenticated requests reach your APIs.
- **[Scope-based authorization](#configure-scope-based-authorization)** - Use the API authorization capabilities of {{product_name}} to make KrakenD enforce access control based on the scopes in the token.

## Prerequisites

- {{product_name}} is running. The examples assume that {{product_name}} runs on `localhost:9443`.
- [KrakenD](https://www.krakend.io/docs/overview/installing/){:target="_blank"} is installed.
- A backend REST API service is running and accessible (for example, on `http://localhost:8081`).
- `curl` is available in your terminal.

## Configure JWT validation

JWT validation is the foundation of API security with KrakenD and {{product_name}}. In this section, you register an application in {{product_name}} to obtain credentials, configure KrakenD to validate tokens using the {{product_name}} JWKS endpoint, and verify that unauthenticated requests are rejected.

### Set up {{product_name}} for JWT validation

Register an application in {{product_name}} and obtain an access token for it.

#### Register an application

1. Sign in to the {{product_name}} Console at `https://localhost:9443/console`.
2. Go to **Applications** and click **New Application**.
3. Select **M2M Application**, enter a name (for example, `krakend-client`), and click **Register**.
4. Go to the **Protocol** tab and note the **Client ID** and **Client Secret**.
5. Under **Access Token**, make sure the **Token type** is set to **JWT**, and click **Update**.

#### Obtain an access token

Use the client credentials grant to request an access token.

```bash
curl -k -X POST 'https://localhost:9443/oauth2/token' \
  -u '<CLIENT_ID>:<CLIENT_SECRET>' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=client_credentials'
```

Save the returned `access_token` to use in the [Test JWT validation](#test-jwt-validation) section.

### Set up KrakenD for JWT validation

Configure KrakenD to validate the tokens issued by {{product_name}}.

#### Create an API

Create a `krakend.json` configuration file. See the [KrakenD configuration structure](https://www.krakend.io/docs/configuration/structure/){:target="_blank"} for a full reference.

The [endpoint object](https://www.krakend.io/docs/endpoints/){:target="_blank"} defines the routes that KrakenD exposes. The [backend object](https://www.krakend.io/docs/backends/){:target="_blank"} defines the upstream services that each endpoint connects to.

```json
{
  "$schema": "https://www.krakend.io/schema/v2.7/krakend.json",
  "version": 3,
  "name": "KrakenD API Gateway",
  "port": 8082,
  "cache_ttl": "3600s",
  "timeout": "3000ms",
  "endpoints": [
    {
      "endpoint": "/api/items",
      "method": "POST",
      "output_encoding": "json",
      "backend": [
        {
          "url_pattern": "/api/items",
          "encoding": "json",
          "method": "POST",
          "host": [
            "http://localhost:8081"
          ]
        }
      ]
    }
  ]
}
```

Start KrakenD to verify that the API is reachable before you add authentication.

```bash
krakend run -c krakend.json
```

KrakenD starts on port `8082`. Verify that the endpoint responds.

```bash
curl --location 'http://localhost:8082/api/items' \
  --header 'Content-Type: application/json' \
  --data '{"name":"Widget","description":"A test item"}'
```

#### Add JWT validation

KrakenD validates JWTs using the [`auth/validator`](https://www.krakend.io/docs/authorization/jwt-validation/){:target="_blank"} component. KrakenD fetches the public keys from the {{product_name}} JWKS endpoint and uses them to verify the signature of incoming tokens.

Add the `auth/validator` block inside the endpoint.

```json
{
  "$schema": "https://www.krakend.io/schema/v2.7/krakend.json",
  "version": 3,
  "name": "KrakenD API Gateway",
  "port": 8082,
  "cache_ttl": "3600s",
  "timeout": "3000ms",
  "endpoints": [
    {
      "endpoint": "/api/items",
      "method": "POST",
      "output_encoding": "json",
      "extra_config": {
        "auth/validator": {
          "alg": "RS256",
          "jwk_url": "https://localhost:9443/oauth2/jwks",
          "issuer": "https://localhost:9443/oauth2/token",
          "disable_jwk_security": true,
          "cache": true
        }
      },
      "backend": [
        {
          "url_pattern": "/api/items",
          "encoding": "json",
          "method": "POST",
          "host": [
            "http://localhost:8081"
          ]
        }
      ]
    }
  ]
}
```

The following table describes the configuration. See the [JWT validation documentation](https://www.krakend.io/docs/authorization/jwt-validation/){:target="_blank"} for the full list of options.

| Field | Value | Description |
|---|---|---|
| `alg` | `RS256` | The signing algorithm that {{product_name}} uses for access tokens. |
| `jwk_url` | `https://<IS_HOST>/oauth2/jwks` | The JWKS endpoint of {{product_name}}, used to fetch the public keys. |
| `issuer` | `https://<IS_HOST>/oauth2/token` | The expected value of the `iss` claim. KrakenD rejects tokens issued by any other issuer. |
| `disable_jwk_security` | `true` | Skips TLS certificate verification when fetching the JWKS. Use this only in local development with the default self-signed certificate of {{product_name}}. Remove it in production. |
| `cache` | `true` | Caches the JWKS keys to avoid fetching them on every request. |

Restart KrakenD to apply the changes.

```bash
pkill -f "krakend run"
krakend run -c krakend.json
```

The log output confirms that JWT validation is active.

```text
KRAKEND INFO: [SERVICE: Gin] Listening on port: 8082
KRAKEND DEBUG: [ENDPOINT: /api/items][JWTValidator] Validator enabled for this endpoint
```

### Test JWT validation

1. Send a request without a token. KrakenD returns `401 Unauthorized`.

    ```bash
    curl --location 'http://localhost:8082/api/items' \
      --header 'Content-Type: application/json'
    ```

2. Send a request with a valid token issued by {{product_name}}. KrakenD forwards the request to the backend and returns `200 OK`.

    ```bash
    curl --location 'http://localhost:8082/api/items' \
      --header 'Authorization: Bearer <ACCESS_TOKEN>' \
      --header 'Content-Type: application/json'
    ```

## Configure scope-based authorization

JWT validation confirms that a token is valid and that {{product_name}} issued it. It doesn't control what the token holder is allowed to do. With the configuration from the previous section, KrakenD accepts any valid token issued by {{product_name}}, regardless of the application or its permissions.

Scope-based authorization adds a second layer of control. {{product_name}} includes in the token the scopes that the application is authorized to consume. KrakenD then checks those scopes on every request and rejects tokens that don't carry the required permissions. For example, you can restrict a read endpoint to tokens with `item:read` and a write endpoint to tokens with `item:write`, without changing the upstream service.

The steps below build on the JWT validation configuration from the previous section.

### Set up {{product_name}} for scope-based authorization

Register your API and its scopes in {{product_name}}, and authorize the application to consume them.

#### Register an API resource

An API resource represents your API in {{product_name}} and defines its permissions as scopes.

1. On the {{product_name}} Console, go to **Resources** > **API Resources**.
2. Click **+ New API**.
3. Enter `https://api.example.com/bookings` as the **Identifier** and `Booking API` as the **Display Name**, and click **Next**.
4. Enter `item:read` as the **Scope (Permission)**, `Read item` as the **Display Name**, and click **Add Scope**. Then, click **Next**.
5. Keep **Requires authorization** enabled and click **Finish**.

#### Authorize the application to consume the API resource

1. On the {{product_name}} Console, go to **Applications** and select the application you created earlier (`krakend-client`).
2. Go to the **API Authorization** tab and click **Authorize an API Resource**.
3. Select the `Booking API` API resource, select the `item:read` scope, and click **Finish**.

{{product_name}} can now include the `item:read` scope in tokens issued to the application.

### Set up KrakenD for scope-based authorization

Add `scopes_key`, `scopes_matcher`, and `scopes` to the `auth/validator` block you configured in the previous section.

```json
{
  "$schema": "https://www.krakend.io/schema/v2.7/krakend.json",
  "version": 3,
  "name": "KrakenD API Gateway",
  "port": 8082,
  "cache_ttl": "3600s",
  "timeout": "3000ms",
  "endpoints": [
    {
      "endpoint": "/api/items",
      "method": "POST",
      "output_encoding": "json",
      "extra_config": {
        "auth/validator": {
          "alg": "RS256",
          "jwk_url": "https://localhost:9443/oauth2/jwks",
          "issuer": "https://localhost:9443/oauth2/token",
          "disable_jwk_security": true,
          "cache": true,
          "scopes_key": "scope",
          "scopes_matcher": "any",
          "scopes": ["item:read"]
        }
      },
      "backend": [
        {
          "url_pattern": "/api/items",
          "encoding": "json",
          "method": "POST",
          "host": [
            "http://localhost:8081"
          ]
        }
      ]
    }
  ]
}
```

The following table describes the scope configuration.

| Field | Value | Description |
|---|---|---|
| `scopes_key` | `scope` | The JWT claim that stores the scopes. |
| `scopes_matcher` | `any` | `any` requires the token to carry at least one of the listed scopes. `all` requires the token to carry every listed scope. |
| `scopes` | `["item:read"]` | The scopes required to access this endpoint. |

Restart KrakenD to apply the changes.

```bash
pkill -f "krakend run"
krakend run -c krakend.json
```

### Test scope-based authorization

1. Request a token with the required scope.

    ```bash
    curl -k -X POST 'https://localhost:9443/oauth2/token' \
      -u '<CLIENT_ID>:<CLIENT_SECRET>' \
      --header 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode 'grant_type=client_credentials' \
      --data-urlencode 'scope=item:read'
    ```

    The response confirms that the scope is present.

    ```json
    {
      "access_token": "<ACCESS_TOKEN>",
      "scope": "item:read",
      "token_type": "Bearer",
      "expires_in": 3600
    }
    ```

2. Call the protected API with the token. KrakenD returns `200 OK`.

    ```bash
    curl --location 'http://localhost:8082/api/items' \
      --header 'Authorization: Bearer <ACCESS_TOKEN>' \
      --header 'Content-Type: application/json'
    ```

3. Call the protected API with a token that doesn't carry the required scope. KrakenD returns `403 Forbidden`.

    ```bash
    curl --location 'http://localhost:8082/api/items' \
      --header 'Authorization: Bearer <TOKEN_WITHOUT_REQUIRED_SCOPE>' \
      --header 'Content-Type: application/json'
    ```
