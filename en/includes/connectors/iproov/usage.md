# Usage

Administrators can add the iProov authenticator to an application's sign-in flow to enable biometric face verification. This guide shows how to configure two common authentication patterns using iProov.

## Prerequisites

- [Set up iProov]({{base_path}}/connectors/iproov/set-up/) in {{product_name}}.

- [Register the application]({{base_path}}/guides/applications/#register-an-application) in {{product_name}}.

## Passwordless authentication

Use this pattern to allow users to sign in using only biometric verification, without a password.

1. On the {{product_name}} Console, go to **Applications** and select the application you want to configure.

2. Go to the **Login Flow** tab.

3. Remove any existing authentication steps if present.

4. Click **Add Authentication Step** and select **Add Authentication** in the new step.

5. Select the iProov connection from the list of authenticators.

6. Click **Update** to save the sign-in flow.

When a user signs in, {{product_name}} redirects the user to iProov for biometric face verification. If verification succeeds, access is granted. If verification fails, sign-in is denied.

## Multi-factor authentication

Use this pattern to require biometric verification as a second factor after a primary authentication step such as username and password.

1. On the {{product_name}} Console, go to **Applications** and select the application you want to configure.

2. Go to the **Login Flow** tab.

3. Confirm that step 1 contains your primary authenticator, such as username and password.

4. Click **Add Authentication Step** to add a second step.

5. In step 2, click **Add Authentication** and select the iProov connection from the list of authenticators.

6. Click **Update** to save the sign-in flow.

When a user completes the first authentication step, {{product_name}} invokes iProov for biometric verification. If both steps succeed, access is granted.

## First-time enrollment

When a user authenticates with iProov for the first time, iProov guides the user through an enrollment process to register their face. After enrollment, later sign-ins use the registered biometric data for verification.

The `iproovEnrolled` claim in {{product_name}} tracks whether a user has completed enrollment. After enrollment, later authentications use the registered biometric data for verification. When enrollment is complete, this claim is set to `true`.
