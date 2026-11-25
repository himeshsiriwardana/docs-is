# Protect APIs on Azure API Management

This guide explains how to secure your APIs at the [Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/api-management-key-concepts){:target="_blank"} (Azure APIM) gateway layer using tokens issued by {{product_name}}. Azure APIM retrieves the public signing keys from the {{product_name}} JWKS endpoint and verifies every incoming token at the edge before it forwards authorized requests to your backend services.

The guide covers two integration approaches:

- **[JWT validation](#configure-jwt-validation)** - Configure Azure APIM to validate JWTs issued by {{product_name}} using the [`validate-jwt`](https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy){:target="_blank"} policy, so that only authenticated requests reach your APIs.
- **[Scope-based authorization](#configure-scope-based-authorization)** - Use the API authorization capabilities of {{product_name}} to make Azure APIM enforce access control based on the scopes in the token.

## Prerequisites

- {{product_name}} is running.
- An [Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/get-started-create-service-instance){:target="_blank"} service instance.
- A backend API imported or created in Azure APIM.
- `curl` is available in your terminal.
- [ngrok](https://ngrok.com/){:target="_blank"} is installed, if {{product_name}} runs on your local machine.

### Expose {{product_name}} on a public URL

Azure APIM is a cloud-hosted service and can't reach a {{product_name}} instance running on `localhost`. Expose {{product_name}} on a publicly accessible HTTPS URL before you configure Azure APIM.

!!! tip "Use ngrok for local testing"
    [ngrok](https://ngrok.com/){:target="_blank"} provides a quick tunnel for local testing.

    1. [Sign up for a free ngrok account](https://dashboard.ngrok.com/signup){:target="_blank"} and follow the [ngrok setup guide](https://ngrok.com/docs/getting-started/){:target="_blank"} to install and authenticate the CLI.

    2. Start a tunnel to the HTTPS port of {{product_name}}.

        ```bash
        ngrok http https://localhost:9443
        ```

    3. ngrok prints a forwarding URL.

        ```text
        Forwarding   https://abc123.ngrok-free.app -> https://localhost:9443
        ```

        Use the domain of this URL (for example, `abc123.ngrok-free.app`) as `<IS_PUBLIC_HOSTNAME>` in the steps below.

    The ngrok URL changes every time you restart ngrok unless you have a reserved domain. If the URL changes, update the {{product_name}} configuration below and the `openid-config` URL in your `validate-jwt` policy.

{{product_name}} builds the issuer and endpoint URLs in the discovery document from its configured hostname and port. Configure the public hostname, and set the proxy port to `443` so that the public URLs don't include the internal port `9443`.

1. Open the `<IS_HOME>/repository/conf/deployment.toml` file and add the following configurations.

    ```toml
    [server]
    hostname = "<IS_PUBLIC_HOSTNAME>"

    [transport.https.properties]
    proxyPort = 443
    ```

2. Restart {{product_name}}.

3. Verify that the discovery document is reachable through the public URL and that its `issuer` is `https://<IS_PUBLIC_HOSTNAME>/oauth2/token`.

    ```bash
    curl https://<IS_PUBLIC_HOSTNAME>/oauth2/token/.well-known/openid-configuration
    ```

## Configure JWT validation

JWT validation is the foundation of API security with Azure APIM and {{product_name}}. In this section, you register an application in {{product_name}} to obtain credentials, configure Azure APIM to validate tokens using the {{product_name}} JWKS endpoint, and verify that unauthenticated requests are rejected.

### Set up {{product_name}} for JWT validation

Register an application in {{product_name}} and obtain an access token for it.

#### Register an application

1. Sign in to the {{product_name}} Console at `https://<IS_PUBLIC_HOSTNAME>/console`.
2. Go to **Applications** and click **New Application**.
3. Select **M2M Application**, enter a name (for example, `azure-apim-client`), and click **Register**.
4. Go to the **Protocol** tab and note the **Client ID** and **Client Secret**.
5. Under **Access Token**, make sure the **Token type** is set to **JWT**, and click **Update**.

#### Obtain an access token

Use the client credentials grant to request an access token.

```bash
curl -X POST 'https://<IS_PUBLIC_HOSTNAME>/oauth2/token' \
  -u '<CLIENT_ID>:<CLIENT_SECRET>' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=client_credentials'
```

Save the returned `access_token` to use in the [Test JWT validation](#test-jwt-validation) section.

### Set up Azure APIM for JWT validation

Configure Azure APIM to validate the tokens issued by {{product_name}}.

#### Add the JWT validation policy

Azure APIM enforces JWT validation through [inbound policies](https://learn.microsoft.com/en-us/azure/api-management/api-management-policies){:target="_blank"}. The [`validate-jwt`](https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy){:target="_blank"} policy fetches the public keys from the {{product_name}} JWKS endpoint and verifies the signature of incoming tokens.

1. In the [Azure portal](https://portal.azure.com/){:target="_blank"}, navigate to your API Management service.
2. Select **APIs** from the left menu, then select your API.
3. Select the **Design** tab.
4. Under **Inbound processing**, click the `</>` (policy code editor) icon.

    ![validate-jwt policy configuration in the Azure APIM policy editor]({{base_path}}/assets/img/guides/authorization/api-gateways/azure-apim-validate-jwt.png){: width="700" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

5. Add the `validate-jwt` policy inside the `<inbound>` section.

    ```xml
    <inbound>
      <base />
      <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized">
        <openid-config url="https://<IS_PUBLIC_HOSTNAME>/oauth2/token/.well-known/openid-configuration" />
      </validate-jwt>
    </inbound>
    ```

6. Click **Save**.

The following table describes the policy configuration.

| Attribute | Value | Description |
|---|---|---|
| `header-name` | `Authorization` | The HTTP header that carries the bearer token. |
| `failed-validation-httpcode` | `401` | The HTTP status code returned when validation fails. |
| `failed-validation-error-message` | `Unauthorized` | The error message returned when validation fails. |
| `openid-config` `url` | `https://<IS_PUBLIC_HOSTNAME>/oauth2/token/.well-known/openid-configuration` | The OpenID Connect discovery endpoint of {{product_name}}. Azure APIM uses it to resolve the JWKS URI and the signing keys. |
| `<audiences>` (optional) | `<audience>https://api.example.com/bookings</audience>` | Must match the identifier of the API resource registered in {{product_name}}. Azure APIM rejects tokens whose `aud` claim doesn't contain this value. |

!!! note
    Azure APIM fetches the discovery document of {{product_name}} to resolve the JWKS URI. Make sure that the `issuer` and `jwks_uri` in the discovery document use the public hostname. If they still point to `localhost:9443`, the `validate-jwt` policy can't fetch the signing keys and every request fails validation. Recheck the `hostname` and `proxyPort` configurations in the `deployment.toml` file.

#### Manage API revisions

[Revisions](https://learn.microsoft.com/en-us/azure/api-management/api-management-revisions){:target="_blank"} let you make non-breaking changes to an API and test them before making them live. Use a revision to apply and validate the JWT validation policy before it affects production traffic.

1. Create a revision.

    1. In the Azure portal, navigate to your API Management service.
    2. Select **APIs**, then select your API.
    3. Select the **Revisions** tab and click **+ Add Revision**.
    4. Enter a description such as `Add JWT validation policy` and click **Create**.

    Azure APIM creates the revision and switches the editor context to it. The revision isn't live yet.

2. With the new revision active, open the **Design** tab and apply the `validate-jwt` policy as described in [Add the JWT validation policy](#add-the-jwt-validation-policy). Click **Save**.

3. Test the revision from the Azure portal.

    1. Select the **Test** tab and choose an operation.
    2. Under **Headers**, add the following headers.
        - **Name**: `Authorization`, **Value**: `Bearer <ACCESS_TOKEN>`
        - **Name**: `Content-Type`, **Value**: `application/json`
    3. Click **Send** and verify the response.

        | Request | Expected response |
        |---|---|
        | With a valid token issued by {{product_name}} | `200 OK` |
        | Without a token | `401 Unauthorized` |

4. Once the tests pass, publish the revision.

    1. Select the **Revisions** tab.
    2. Find your revision and click **...** > **Make current**.
    3. Optionally, select **Post to public change log** to record the change.
    4. Click **Make current**.

All API traffic now flows through the JWT validation policy.

### Test JWT validation

1. Send a request without a token. Azure APIM returns `401 Unauthorized`.

    ```bash
    curl --location 'https://<AZURE_APIM_GATEWAY_URL>/<API_PATH>' \
      --header 'Ocp-Apim-Subscription-Key: <SUBSCRIPTION_KEY>' \
      --header 'Content-Type: application/json'
    ```

2. Send a request with a valid token issued by {{product_name}}. Azure APIM forwards the request to the backend and returns `200 OK`.

    ```bash
    curl --location 'https://<AZURE_APIM_GATEWAY_URL>/<API_PATH>' \
      --header 'Authorization: Bearer <ACCESS_TOKEN>' \
      --header 'Ocp-Apim-Subscription-Key: <SUBSCRIPTION_KEY>' \
      --header 'Content-Type: application/json'
    ```

!!! note "Missing subscription key"
    If you see the following error when calling your API through the Azure APIM gateway URL, Azure APIM is enforcing its default subscription key requirement.

    ```json
    {
      "statusCode": 401,
      "message": "Access denied due to missing subscription key. Make sure to include subscription key when making requests to an API."
    }
    ```

    Pass the subscription key in the `Ocp-Apim-Subscription-Key` header as shown in the examples above. You can find your subscription key in the **Subscriptions** section of your Azure APIM service. See the [Azure APIM troubleshooting guide](https://learn.microsoft.com/en-us/troubleshoot/azure/api-mgmt/availability/unauthorized-errors-invoke-apis){:target="_blank"} for more help.

## Configure scope-based authorization

JWT validation confirms that a token is valid and that {{product_name}} issued it. It doesn't control what the token holder is allowed to do. With the configuration from the previous section, Azure APIM accepts any valid token issued by {{product_name}}, regardless of the application or its permissions.

Scope-based authorization adds a second layer of control. {{product_name}} includes in the token the scopes that the application is authorized to consume. The `validate-jwt` policy then checks those scopes on every request and rejects tokens that don't carry the required permissions. For example, you can restrict a write operation to tokens with `item:write` and a read operation to tokens with `item:read`, without changing the backend service.

The steps below build on the JWT validation configuration from the previous section.

### Set up {{product_name}} for scope-based authorization

Register your API and its scopes in {{product_name}}, and authorize the application to consume them.

#### Register an API resource

An API resource represents your API in {{product_name}} and defines its permissions as scopes. Its identifier is added to the `aud` claim of tokens issued for the API.

1. On the {{product_name}} Console, go to **Resources** > **API Resources**.
2. Click **+ New API**.
3. Enter `https://api.example.com/bookings` as the **Identifier** and `Booking API` as the **Display Name**, and click **Next**.
4. Enter `item:write` as the **Scope (Permission)**, `Write item` as the **Display Name**, and click **Add Scope**. Then, click **Next**.
5. Keep **Requires authorization** enabled and click **Finish**.

#### Authorize the application to consume the API resource

1. On the {{product_name}} Console, go to **Applications** and select the application you created earlier.
2. Go to the **API Authorization** tab and click **Authorize an API Resource**.
3. Select the `Booking API` API resource, select the `item:write` scope, and click **Finish**.

{{product_name}} can now include the `item:write` scope in tokens issued to the application.

### Set up Azure APIM for scope-based authorization

Update the `validate-jwt` policy to add a `<required-claims>` block. Azure APIM rejects tokens whose `scope` claim doesn't include the specified value.

1. In the Azure portal, navigate to your API Management service.
2. Select **APIs**, then select your API.
3. Select the **Design** tab.
4. Under **Inbound processing**, click the `</>` (policy code editor) icon.
5. Replace the existing `validate-jwt` policy with the following.

    ```xml
    <inbound>
      <base />
      <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized">
        <openid-config url="https://<IS_PUBLIC_HOSTNAME>/oauth2/token/.well-known/openid-configuration" />
        <required-claims>
          <claim name="scope" match="any" separator=" ">
            <value>item:write</value>
          </claim>
        </required-claims>
      </validate-jwt>
    </inbound>
    ```

6. Click **Save**.

The following table describes the scope configuration.

| Attribute | Value | Description |
|---|---|---|
| `name` | `scope` | The JWT claim that stores the scopes. |
| `match` | `any` | `any` requires the token to carry at least one of the listed values. `all` requires the token to carry every listed value. |
| `separator` | ` ` (space) | The delimiter used to split the `scope` claim into individual scope values. {{product_name}} issues the `scope` claim as a space-separated string. |
| `<value>` | `item:write` | The scope required to access this operation. |

### Test scope-based authorization

1. Request a token with the required scope.

    ```bash
    curl -X POST 'https://<IS_PUBLIC_HOSTNAME>/oauth2/token' \
      -u '<CLIENT_ID>:<CLIENT_SECRET>' \
      --header 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode 'grant_type=client_credentials' \
      --data-urlencode 'scope=item:write'
    ```

    The response confirms that the scope is present.

    ```json
    {
      "access_token": "<ACCESS_TOKEN>",
      "scope": "item:write",
      "token_type": "Bearer",
      "expires_in": 3600
    }
    ```

2. Call the protected API with the token. Azure APIM returns `200 OK`.

    ```bash
    curl --location 'https://<AZURE_APIM_GATEWAY_URL>/<API_PATH>' \
      --header 'Authorization: Bearer <ACCESS_TOKEN>' \
      --header 'Ocp-Apim-Subscription-Key: <SUBSCRIPTION_KEY>' \
      --header 'Content-Type: application/json'
    ```

3. Call the protected API with a token that doesn't carry the required scope. Azure APIM returns `401 Unauthorized`.

    ```bash
    curl --location 'https://<AZURE_APIM_GATEWAY_URL>/<API_PATH>' \
      --header 'Authorization: Bearer <TOKEN_WITHOUT_REQUIRED_SCOPE>' \
      --header 'Ocp-Apim-Subscription-Key: <SUBSCRIPTION_KEY>' \
      --header 'Content-Type: application/json'
    ```
