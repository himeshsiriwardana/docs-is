# Secure APIs with API gateways

An API gateway is a server that acts as the single entry point for API requests from clients, such as mobile apps, web apps, or other services, to your backend services. By integrating {{product_name}} with your API gateway, you can enforce authentication and authorization at the network boundary, before requests reach your backend services.

In this setup, {{product_name}} acts as the Security Token Service (STS) for your APIs. It:

- issues signed JWT access tokens to authenticated clients.
- publishes its public signing keys through a [JSON Web Key Set (JWKS)](https://www.rfc-editor.org/rfc/rfc7517){:target="_blank"} endpoint.
- publishes an [OpenID Connect discovery document](https://openid.net/specs/openid-connect-discovery-1_0.html){:target="_blank"} that points to the JWKS endpoint and declares the token issuer.

Your API gateway uses these endpoints to verify every incoming token cryptographically at the edge.

## How it works

The integration follows the same pattern across all supported gateways.

1. **The application obtains a token.** A client application authenticates with {{product_name}} using the [client credentials grant]({{base_path}}/references/grant-types/#client-credentials-grant) and receives a signed JWT access token.

2. **The application calls the gateway.** The client sends the JWT as a `Bearer` token in the `Authorization` header.

3. **The gateway validates the token.** The gateway fetches the {{product_name}} JWKS (and caches it after the first request) and verifies the token's signature, issuer, and expiry. Requests with a missing, invalid, or expired token are rejected with `401 Unauthorized`.

4. **The gateway enforces authorization.** Optionally, the gateway checks that the token carries the scopes required for the requested API operation. Tokens that lack the required scopes are rejected, typically with `403 Forbidden`.

5. **The gateway forwards the request.** Valid, authorized requests are forwarded to the upstream service.

## {{product_name}} endpoints used by gateways

The following table lists the {{product_name}} endpoints that API gateways use. Replace `<IS_HOST>` with the hostname of your {{product_name}} deployment (`localhost:9443` by default).

| Endpoint | URL |
|---|---|
| Token | `https://<IS_HOST>/oauth2/token` |
| JWKS | `https://<IS_HOST>/oauth2/jwks` |
| OpenID Connect discovery | `https://<IS_HOST>/oauth2/token/.well-known/openid-configuration` |
| Issuer (`iss` claim) | `https://<IS_HOST>/oauth2/token` |

!!! note
    The discovery document and the `iss` claim of issued tokens are built from the hostname configured in {{product_name}}. If your gateway runs in a container or in the cloud, make sure this hostname resolves to {{product_name}} from the gateway as well. Learn how to [change the hostname]({{base_path}}/deploy/change-the-hostname/).

## Before you begin

The gateway guides share the following {{product_name}} concepts:

- **M2M application** - The client that obtains access tokens using the client credentials grant. Learn more about [M2M applications]({{base_path}}/guides/applications/register-machine-to-machine-app/).
- **JWT access tokens** - Gateways validate tokens locally, so the application must issue [JWT access tokens]({{base_path}}/references/tokens/access-tokens/#token-types) instead of opaque tokens.
- **API resources and scopes** - Model your API and its permissions in {{product_name}}, then authorize the application to consume them. {{product_name}} includes the authorized scopes in the `scope` claim of the token and the API resource identifier in the `aud` claim. Learn more about [API authorization]({{base_path}}/guides/authorization/api-authorization/api-authorization/).

## Supported gateways

Select your API gateway for a step-by-step integration guide.

- [Apache APISIX]({{base_path}}/guides/authorization/api-gateways/apisix/)
- [Azure API Management]({{base_path}}/guides/authorization/api-gateways/azure-apim/)
- [Envoy]({{base_path}}/guides/authorization/api-gateways/envoy/)
- [Kong Konnect]({{base_path}}/guides/authorization/api-gateways/kong/)
- [KrakenD]({{base_path}}/guides/authorization/api-gateways/krakend/)
