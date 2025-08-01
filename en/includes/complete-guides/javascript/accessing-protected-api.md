
In this section, we will focus on how to call a secure API from your JavaScript app using the other token—the access token.

For simplicity, let's assume that the APIs we’re calling are secured by the same Identity Provider (IdP) and use the same issuer— in this case, the same {{product_name}} organization. This is typical when JavaScript apps are interacting with internal APIs within the same organization.

!!! tip "Tip"

    If your app needs to call APIs secured by a different IdP, you’ll need to exchange your current access token for a new one issued by the IdP securing those APIs. This can be done using the OAuth2 token exchange grant type or other supported grant types. We will cover these scenarios in a separate guide.

## Using SDK Built-in HTTP client

You can use the `httpRequest` API provided by the Asgardeo SDK to make HTTP requests to these endpoints. This method is used to send http requests to {{product_name}} or desired backend. The developer doesn’t need to manually attach the access token since this method does it automatically.

The following is a simple example of how you might use the Asgardeo SDK’s `httpRequest` to call a protected API endpoint, such as `/scim2/Me` (to get the user profile details after signing in). In this case, the SCIM 2 endpoint is secured by the same {{product_name}} organization. {{product_name}} provides a SCIM 2 API for managing users within your organization. While user management with SCIM 2 is a topic for a different guide, we will use the API as part of our current guide.

!!! note "Note"

    The storage type must be set to `webWorker` for the token to be automatically attached. If it’s set to `sessionStorage` or `localStorage`, you may implement your own function for attaching the access token to the network request. 

```javascript

const requestConfig = {
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/scim+json"
  },
  method: "GET",
  url: "<base-url>/scim2/Me"
};


auth.httpRequest(requestConfig).then((response) => {
  var req = response;
  console.log(response);
}).catch((error) => {
  console.error(error);
});


```

!!! tip "Tip"

    You need to construct the `<base-url>` value as per the followng instructions: 

    For Asgardeo: 

    `<base-url> = https://api.asgardeo.io/t/<your_Asgardeo_org_name>`

    For WSO2 Idenity Server: 

    `<base-url> =https://localhost:9443` 

Note that you don’t need to manually specify the Authorization header under headers in requestConfig, as httpRequest method intercepts the request and attaches the access token to the network request as the Authorization header.

In the above example, the final request config sent by the httpRequest method would be as follows.

```javascript hl_lines="5"

const requestConfig = {
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/scim+json",
    "Authorization": "Bearer <access_token_retrieved_from_web_worker>"
  },
  method: "GET",
  url: "<base-url>/scim2/Me"
};

```

!!! tip "Tip"

    You need to construct the '<base-url>' value as per the followng instructions: 

    For Asgardeo: 

    `<base-url> = https://api.asgardeo.io/t/<your_Asgardeo_org_name>`

    For WSO2 Idenity Server: 

    `<base-url> =https://localhost:9443` 

In case you want to send multiple API requests in parallel, you can use the httpRequestAll method to simultaneously trigger parallel network requests and receive responses after all network requests are completed.

The following code snippet shows a javascript method which accepts a list of application IDs and sends multiple network requests for each app ID in parallel. The responses will contain results for each id, as an array of responses.

```javascript


auth.httpRequestAll(configs).then((responses) => {
  response.forEach((response) => {
    console.log(response);
  });
}).catch((error) => {
  console.error(error);
});


```

## Using a custom HTTP client

In case you are not using the `webWorker` as the storage type, the `getAccessToken` method can be used to fetch the access token and manually attach it to the network request. The following is an example where the access token is fetched and manually attached to the authorization header of a Fetch request.

```javascript

auth.getAccessToken().then((token) => {
  console.log(token);
}).error((error) => {
  console.error(error);
});

```
