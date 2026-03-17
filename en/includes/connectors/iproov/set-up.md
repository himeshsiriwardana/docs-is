# Set up

The following guide explains how you can install and set up iProov in {{product_name}}.

## Prerequisites

You need a configured iProov service provider. Contact [iProov](https://www.iproov.com/){: target="_blank"} to create a service provider for your organization and get the following credentials:

- Base URL
- OAuth username
- OAuth password
- API key
- API secret

## Step 1: Install the iProov authenticator

Follow the steps below to install the iProov authenticator in {{product_name}}.

1. Download the project artifacts from the {{product_name}} [Connector Store](https://store.wso2.com/connector/identity-outbound-auth-iproov){: target="_blank"}.

2. Copy `org.wso2.carbon.identity.application.authenticator.iproov-<version>.jar` to the `<IS_HOME>/repository/components/dropins` directory.

3. Copy `org.wso2.carbon.identity.application.authenticator.iproov.common-<version>.jar` to the `<IS_HOME>/repository/components/lib` directory.

4. Copy the `iproov` directory from the downloaded artifacts to `<IS_HOME>/repository/resources/identity/extensions/connections`.

5. Copy the `guides` directory from the downloaded artifacts to `<IS_HOME>/repository/deployment/server/webapps/console/resources/connections/assets/images`.

6. Copy `iproov.svg` from the downloaded artifacts to `<IS_HOME>/repository/deployment/server/webapps/authenticationendpoint/libs/themes/wso2is/assets/images/identity-providers/`.

7. Restart {{product_name}}.

## Step 2: Add the required identity claims

The iProov authenticator requires two identity claims to track enrollment status and failed verification attempts. Add the claims using the following commands.

!!! note

    Replace `<server-url>`, `<tenant-domain>`, and the Base64-encoded `<username:password>` with values appropriate for your environment.

Run the following command to add the `iproovEnrolled` claim:

```bash
curl --location '<server-url>/t/<tenant-domain>/api/server/v1/claim-dialects/local/claims' \
--header 'accept: application/json' \
--header 'authorization: Basic <Base64-encoded-username:password>' \
--header 'Content-Type: application/json' \
--data '{
    "claimURI": "http://wso2.org/claims/identity/iproovEnrolled",
    "description": "Whether user is being enrolled with iProov",
    "displayOrder": 0,
    "displayName": "iProov enrolled",
    "readOnly": true,
    "regEx": "",
    "required": false,
    "supportedByDefault": false,
    "attributeMapping": [
        {
            "mappedAttribute": "iproovEnrolled",
            "userstore": "PRIMARY"
        }
    ]
}'
```

Run the following command to add the `failediProovAttempts` claim:

```bash
curl --location '<server-url>/t/<tenant-domain>/api/server/v1/claim-dialects/local/claims' \
--header 'accept: application/json' \
--header 'authorization: Basic <Base64-encoded-username:password>' \
--header 'Content-Type: application/json' \
--data '{
    "claimURI": "http://wso2.org/claims/identity/failediProovAttempts",
    "description": "Failed iProov Attempts.",
    "displayOrder": 0,
    "displayName": "Failed iProov Attempts",
    "readOnly": true,
    "regEx": "",
    "required": false,
    "supportedByDefault": false,
    "attributeMapping": [
        {
            "mappedAttribute": "failediProovAttempts",
            "userstore": "PRIMARY"
        }
    ]
}'
```

## Step 3: Configure the iProov connection

1. On the {{product_name}} Console, go to **Connections** and click **New Connection**.

2. Find the **iProov** card in the list of connection templates and click **Create**.

3. Enter a name for the connection and provide the iProov credentials:

    | Field | Description |
    | --- | --- |
    | **Base URL** | The iProov service endpoint URL provided when you created your iProov service provider. |
    | **OAuth Username** | The OAuth username provided by iProov for your service provider. |
    | **OAuth Password** | The OAuth password provided by iProov for your service provider. |
    | **API Key** | The API key provided by iProov for your service provider. |
    | **API Secret** | The API secret provided by iProov for your service provider. |

4. Click **Create** to save the connection.
