# Reference: iProov connector

This reference provides full technical details for the iProov connector, including configuration properties, identity claims, and authentication flow behavior.

!!! note

    To use this connector, you must first [set up iProov]({{base_path}}/connectors/iproov/set-up/) in {{product_name}}.

## Connector configuration properties

The following table describes all configuration properties for the iProov connection.

| Property | Description | Required | Example |
| --- | --- | --- | --- |
| **Base URL** | The iProov service endpoint URL provided when you created your iProov service provider. The URL includes the API version path. | Yes | `https://eu.rp.secure.iproov.me/api/v2` |
| **OAuth Username** | The OAuth username for the iProov service provider. Used to authenticate requests to the iProov API. | Yes | `admin` |
| **OAuth Password** | The OAuth password for the iProov service provider. Used to authenticate requests to the iProov API. | Yes | — |
| **API Key** | The API key assigned to your iProov service provider. Used to identify the requesting organization when calling iProov. | Yes | — |
| **API Secret** | The API secret assigned to your iProov service provider. Used to sign and authorize requests to iProov. | Yes | — |

## Required identity claims

The iProov authenticator uses two identity claims to manage enrollment status and track failed verification attempts. These claims are added during setup and are managed automatically by the authenticator.

| Claim URI | Display name | Description | Attribute mapping |
| --- | --- | --- | --- |
| `http://wso2.org/claims/identity/iproovEnrolled` | iProov enrolled | Indicates whether the user has completed iProov enrollment. Set to `true` after first successful enrollment. | `iproovEnrolled` |
| `http://wso2.org/claims/identity/failediProovAttempts` | Failed iProov Attempts | Tracks the number of failed iProov verification attempts for the user. | `failediProovAttempts` |

Both claims are read-only and are not displayed by default in the user profile.

## Authentication flow

The following describes the full authentication sequence when iProov is part of the sign-in flow.

1. A user initiates sign-in to an application registered in {{product_name}}.

2. {{product_name}} executes the configured sign-in steps. When the iProov step is reached, {{product_name}} initiates a verification session with the iProov service using the configured credentials.

3. {{product_name}} redirects the user to the iProov verification interface.

4. For first-time users, iProov runs an enrollment flow to register the user's face. The `iproovEnrolled` claim is set to `true` after successful enrollment.

5. For returning users, iProov performs a biometric face scan and liveness check against the enrolled face data.

6. iProov returns a verification result to {{product_name}}.

7. {{product_name}} evaluates the result:

    - If verification succeeds, the sign-in flow continues to the next step or grants access.
    - If verification fails, sign-in is denied and the `failediProovAttempts` claim is incremented.

## Connector store

Download the connector artifacts from the WSO2 Identity Server [Connector Store](https://store.wso2.com/connector/identity-outbound-auth-iproov){: target="_blank"}.

## Supported versions

The iProov authenticator supports WSO2 Identity Server version 7.0.0 and later.
