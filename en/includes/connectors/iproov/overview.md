# iProov

[iProov](https://www.iproov.com/){:target="_blank"} provides biometric face verification with genuine presence assurance, enabling organizations to verify that the person authenticating is who they claim to be and is physically present in real time. By combining facial biometrics with liveness detection, iProov prevents spoofing attacks such as photo replay, video replay, and deepfake-based fraud.

You can integrate {{product_name}} with iProov to add biometric authentication to your sign-in flows. During authentication, {{product_name}} invokes iProov to prompt the user for a biometric face scan. iProov verifies the user's identity and liveness, then returns the result to {{product_name}}.

Based on the result, you can:

- Allow the sign-in if verification succeeds.

- Deny the sign-in if verification fails or the liveness check does not pass.

The following sections describe two common deployment patterns for iProov in {{product_name}}.

## Passwordless authentication

Use iProov as the only authentication factor. Instead of entering a password, the user completes a biometric face scan to sign in.

## Multi-factor authentication

Use iProov as a second authentication factor to strengthen security. The user first completes a primary step such as username and password, then completes biometric verification through iProov.
