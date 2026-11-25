# Protect APIs on Envoy

This guide explains how to secure your APIs at the [Envoy](https://www.envoyproxy.io/){:target="_blank"} gateway layer using tokens issued by {{product_name}}. Envoy retrieves the public signing keys from the {{product_name}} JWKS endpoint and verifies every incoming token at the edge before it forwards authorized requests to your backend services.

The guide covers two integration approaches:

- **[JWT validation](#configure-jwt-validation)** - Configure Envoy to validate JWTs issued by {{product_name}} using the [`envoy.filters.http.jwt_authn`](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter){:target="_blank"} HTTP filter, so that only authenticated requests reach your APIs.
- **[Scope-based authorization](#configure-scope-based-authorization)** - Use scopes issued by {{product_name}} and the Envoy [RBAC filter](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rbac_filter){:target="_blank"} to enforce route-level access control on upstream APIs.

## Prerequisites

- {{product_name}} is running. The examples assume that {{product_name}} runs on `localhost:9443`.
- The latest stable version of [Envoy](https://www.envoyproxy.io/docs/envoy/latest/start/install){:target="_blank"} is installed.
- A backend REST API service is running and accessible to Envoy. The examples use `http://localhost:9000`.
- `curl` is available in your terminal.

The examples use the following local ports.

| Port | Component | Used for |
|---|---|---|
| `8080` | Envoy HTTP listener | The client-facing API gateway listener. |
| `9443` | {{product_name}} | The Console, token endpoint, and JWKS endpoint. |
| `9000` | Backend REST API | The upstream service to which Envoy forwards allowed requests. |

Verify your Envoy version.

```bash
envoy --version
```

## Configure JWT validation

JWT validation is the foundation of API security with Envoy and {{product_name}}. In this section, you register an application in {{product_name}} to obtain credentials, configure Envoy to validate tokens using the {{product_name}} JWKS endpoint, and verify that unauthenticated requests are rejected.

### Set up {{product_name}} for JWT validation

Register an application in {{product_name}} and obtain an access token for it.

#### Register an application

1. Sign in to the {{product_name}} Console at `https://localhost:9443/console`.
2. Go to **Applications** and click **New Application**.
3. Select **M2M Application**, enter a name (for example, `envoy-client`), and click **Register**.
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

### Set up Envoy for JWT validation

Configure Envoy to validate the tokens issued by {{product_name}}.

#### Create an API

Create an `envoy.yaml` configuration file. See the [Envoy configuration overview](https://www.envoyproxy.io/docs/envoy/latest/configuration/overview/overview){:target="_blank"} for a full reference.

The listener defines the port that Envoy exposes to clients. The route configuration defines the paths that Envoy exposes. The cluster configuration defines the upstream service.

The following example exposes Envoy on port `8080` and forwards requests for `/resources` to an upstream API on `http://localhost:9000`.

```yaml
static_resources:
  listeners:
    - name: local_listener
      address:
        socket_address:
          address: 127.0.0.1
          port_value: 8080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: resources_api_gateway
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: resources_api
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/resources"
                          route:
                            cluster: upstream_api
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: upstream_api
      connect_timeout: 1s
      type: STATIC
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: upstream_api
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 9000
```

Validate the configuration and start Envoy to verify that the API is reachable before you add authentication.

```bash
envoy --mode validate -c envoy.yaml
envoy -c envoy.yaml
```

Envoy starts on port `8080`. Verify that the endpoint responds with `200 OK`.

```bash
curl -i --location 'http://localhost:8080/resources' \
  --header 'Content-Type: application/json'
```

#### Add JWT validation

Envoy validates JWTs using the [`jwt_authn`](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter){:target="_blank"} HTTP filter. Envoy fetches the public keys from the {{product_name}} JWKS endpoint and uses them to verify the signature of incoming tokens.

1. Replace the `http_filters` block of the listener with the following, which adds the `jwt_authn` filter before the router filter.

    ```yaml
    http_filters:
      - name: envoy.filters.http.jwt_authn
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
          providers:
            wso2_is:
              issuer: "https://localhost:9443/oauth2/token"
              remote_jwks:
                http_uri:
                  uri: "https://localhost:9443/oauth2/jwks"
                  cluster: wso2_is
                  timeout: 5s
                cache_duration: 300s
              from_headers:
                - name: authorization
                  value_prefix: "Bearer "
          rules:
            - match:
                prefix: "/resources"
              requires:
                provider_name: wso2_is
            - match:
                prefix: "/"
              requires:
                allow_missing: {}
      - name: envoy.filters.http.router
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
    ```

2. Add a cluster for the {{product_name}} JWKS endpoint under `clusters`.

    ```yaml
    - name: wso2_is
      connect_timeout: 1s
      type: STATIC
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: wso2_is
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 9443
      transport_socket:
        name: envoy.transport_sockets.tls
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext
          sni: localhost
          common_tls_context:
            validation_context:
              trust_chain_verification: ACCEPT_UNTRUSTED
    ```

    !!! warning "Local development only"
        `trust_chain_verification: ACCEPT_UNTRUSTED` skips certificate chain verification so that Envoy can connect to {{product_name}} with its default self-signed certificate. Remove this setting in production and configure Envoy with a certificate authority that your deployment trusts.

The following table describes the configuration. See the [JWT authentication filter documentation](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter){:target="_blank"} for the full list of options.

| Field | Value | Description |
|---|---|---|
| `issuer` | `https://<IS_HOST>/oauth2/token` | The token issuer that Envoy expects. It must match the `iss` claim of tokens issued by {{product_name}}. |
| `remote_jwks.http_uri.uri` | `https://<IS_HOST>/oauth2/jwks` | The JWKS endpoint of {{product_name}}, used to fetch the public keys. |
| `cache_duration` | `300s` | Caches the JWKS keys to avoid fetching them on every request. |
| `from_headers` | `Authorization: Bearer` | Reads the JWT from the `Authorization` header. |
| `trust_chain_verification` | `ACCEPT_UNTRUSTED` | Skips TLS certificate chain verification. Use this only in local development. |

Restart Envoy to apply the changes.

```bash
pkill -f "envoy -c envoy.yaml"
envoy --mode validate -c envoy.yaml
envoy -c envoy.yaml
```

### Test JWT validation

1. Send a request without a token. Envoy returns `401 Unauthorized`.

    ```bash
    curl -i --location 'http://localhost:8080/resources' \
      --header 'Content-Type: application/json'
    ```

    ```text
    HTTP/1.1 401 Unauthorized

    Jwt is missing
    ```

2. Send a request with a valid token issued by {{product_name}}. Envoy forwards the request to the backend and returns `200 OK`.

    ```bash
    curl -i --location 'http://localhost:8080/resources' \
      --header 'Authorization: Bearer <ACCESS_TOKEN>' \
      --header 'Content-Type: application/json'
    ```

## Configure scope-based authorization

JWT validation confirms that a token is valid and that {{product_name}} issued it. It doesn't control what the token holder is allowed to do. With the configuration from the previous section, Envoy accepts any valid token issued by {{product_name}} for the protected route.

Scope-based authorization adds a second layer of control. {{product_name}} includes in the token the scopes that the application is authorized to consume. Envoy then checks those scopes on every request and rejects tokens that don't carry the required permissions. For example, you can restrict a read endpoint to tokens with `resource:read`, without changing the upstream service.

The steps below build on the JWT validation configuration from the previous section.

### Set up {{product_name}} for scope-based authorization

Register your API and its scopes in {{product_name}}, and authorize the application to consume them.

#### Register an API resource

An API resource represents your API in {{product_name}} and defines its permissions as scopes.

1. On the {{product_name}} Console, go to **Resources** > **API Resources**.
2. Click **+ New API**.
3. Enter `https://api.example.com/resources` as the **Identifier** and `Resources API` as the **Display Name**, and click **Next**.
4. Enter `resource:read` as the **Scope (Permission)**, `Read resources` as the **Display Name**, and click **Add Scope**. Then, click **Next**.
5. Keep **Requires authorization** enabled and click **Finish**.

#### Authorize the application to consume the API resource

1. On the {{product_name}} Console, go to **Applications** and select the application you created earlier (`envoy-client`).
2. Go to the **API Authorization** tab and click **Authorize an API Resource**.
3. Select the `Resources API` API resource, select the `resource:read` scope, and click **Finish**.

{{product_name}} can now include the `resource:read` scope in tokens issued to the application.

### Set up Envoy for scope-based authorization

Add `claim_to_headers` to the `jwt_authn` provider so that Envoy copies the `scope` claim of the token into a request header. Then, add the Envoy RBAC filter to check for the required scope before Envoy forwards the request. See the [JWT authentication filter documentation](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/jwt_authn_filter){:target="_blank"} and the [RBAC filter documentation](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rbac_filter){:target="_blank"} for the full list of options.

Replace the `http_filters` block of the listener with the following.

```yaml
http_filters:
  - name: envoy.filters.http.jwt_authn
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.jwt_authn.v3.JwtAuthentication
      providers:
        wso2_is:
          issuer: "https://localhost:9443/oauth2/token"
          remote_jwks:
            http_uri:
              uri: "https://localhost:9443/oauth2/jwks"
              cluster: wso2_is
              timeout: 5s
            cache_duration: 300s
          from_headers:
            - name: authorization
              value_prefix: "Bearer "
          claim_to_headers:
            - header_name: x-jwt-scope
              claim_name: scope
      rules:
        - match:
            prefix: "/resources"
          requires:
            provider_name: wso2_is
        - match:
            prefix: "/"
          requires:
            allow_missing: {}
  - name: envoy.filters.http.rbac
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.rbac.v3.RBAC
      rules:
        action: ALLOW
        policies:
          resources-read:
            permissions:
              - and_rules:
                  rules:
                    - url_path:
                        path:
                          prefix: "/resources"
                    - header:
                        name: ":method"
                        string_match:
                          exact: "GET"
                    - header:
                        name: "x-jwt-scope"
                        string_match:
                          safe_regex:
                            regex: "(^|\\s)resource:read(\\s|$)"
            principals:
              - any: true
  - name: envoy.filters.http.router
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

Add one policy for each protected route or operation. For example, an update endpoint can require a separate scope such as `resource:update`.

The following table describes the scope configuration.

| Field | Value | Description |
|---|---|---|
| `claim_to_headers.claim_name` | `scope` | The JWT claim that stores the scopes. |
| `claim_to_headers.header_name` | `x-jwt-scope` | The header that Envoy uses to check the scopes of the token. |
| `string_match.safe_regex.regex` | A regular expression for `resource:read` | The scope required to access the matching route. The regular expression in the example matches `resource:read` as a whole value in the space-separated `scope` claim. |
| `action` | `ALLOW` | Allows only the requests that match one of the configured policies. |

Restart Envoy to apply the changes.

```bash
pkill -f "envoy -c envoy.yaml"
envoy --mode validate -c envoy.yaml
envoy -c envoy.yaml
```

### Test scope-based authorization

1. Request a token with the required scope.

    ```bash
    curl -k -X POST 'https://localhost:9443/oauth2/token' \
      -u '<CLIENT_ID>:<CLIENT_SECRET>' \
      --header 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode 'grant_type=client_credentials' \
      --data-urlencode 'scope=resource:read'
    ```

    The response confirms that the scope is present.

    ```json
    {
      "access_token": "<ACCESS_TOKEN>",
      "scope": "resource:read",
      "token_type": "Bearer",
      "expires_in": 3600
    }
    ```

2. Call the protected API with the token. Envoy returns `200 OK`.

    ```bash
    curl -i --location 'http://localhost:8080/resources' \
      --header 'Authorization: Bearer <ACCESS_TOKEN>' \
      --header 'Content-Type: application/json'
    ```

3. Call the protected API with a token that doesn't carry the required scope. Envoy returns `403 Forbidden`.

    ```bash
    curl -i --location 'http://localhost:8080/resources' \
      --header 'Authorization: Bearer <TOKEN_WITHOUT_REQUIRED_SCOPE>' \
      --header 'Content-Type: application/json'
    ```

    ```text
    HTTP/1.1 403 Forbidden

    RBAC: access denied
    ```
