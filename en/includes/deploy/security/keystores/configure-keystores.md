# Configure Keystores

!!! info "Before you begin"

    1. Make sure to go through the [recommendations for setting up keystores]({{base_path}}/deploy/security/asymmetric-encryption/use-asymmetric-encryption#recommendations-for-setting-up-keystores) to understand the various keystores you will need.

    2. If you have not already created the keystores required for your system, see [creating new keystores]({{base_path}}/deploy/security/asymmetric-encryption/create-new-keystores).


## Configure default keystore and truststore

WSO2 Identity Server provides default keystore and truststore files:

{% if is_version == "7.0.0" %}

- `wso2carbon.jks`: The default keystore that includes a private key and a self-signed certificate.
- `client-truststore.jks`: The default truststore containing Certificate Authority (CA) certificates and the self-signed certificate from wso2carbon.jks.

{% else %}

- `wso2carbon.p12`: The default keystore that includes a private key and a self-signed certificate.
- `client-truststore.p12`: The default truststore containing Certificate Authority (CA) certificates and the self-signed certificate from wso2carbon.jks.

{% endif %}

These files are originally located in the `<IS_HOME>/repository/resources/security` folder. The file settings can be configured by specifying them in the `deployment.toml` file found in the `<IS_HOME>/repository/conf` folder as follows.

=== "JKS"

    For the primary keystore:
    ``` toml
    [keystore.primary]
    file_name = "<keystore file name>.jks"
    password = "<password>"
    key_password = "<password>"
    type = "JKS"
    alias = "<alias of the public certificate>"
    ```

    For the truststore:
    ``` toml
    [truststore]
    file_name = "truststore file name>.jks"
    password = "<password>"
    type = "JKS"
    ```

=== "PKCS12"

    For the primary keystore:
    ``` toml
    [keystore.primary]
    file_name = "<keystore file name>.p12"
    password = "<password>"
    key_password = "<password>"
    type = "PKCS12"
    alias = "<alias of the public certificate>"
    ```

    For the truststore:
    ``` toml
    [truststore]
    file_name = "<truststore file name>.p12"
    password = "<password>"
    type = "PKCS12"
    ```

    To generate keystores for newly created tenants in PKCS12 format:
    ``` toml
    [keystore.tenant]
    type = "PKCS12"
    ```

## Use multiple keystores

The primary keystore handles both internal data encryption and signing of external messages. However, it is often necessary to have dedicated keystores for these tasks for the following reasons:

- External communication such as SAML and OIDC ID token signing require keystore certificates to be frequently renewed. 

- Internal data encryption does not require frequent certificate changes as doing so can render encrypted data inaccessible.

In production environments, it is recommended to use distinct keystores for each task with separate trust chains as mentioned below:

- **Internal keystore**: Used for encrypting and decrypting internal data (if [asymmetric encryption]({{base_path}}/deploy/security/asymmetric-encryption) is enabled) and for encrypting plaintext passwords in configuration files using the [cipher tool]({{base_path}}/deploy/security/encrypt-passwords-with-cipher-tool).

- **TLS keystore**: This keystore typically contains certificates required for establishing SSL/TLS connections.

- **Protocol-specific keystores**: Used for signing/verifying identity tokens in authentication protocols (e.g. OAuth 2.0, WS-Federation, WS-Trust).

- **Primary keystore**: Used for signing messages and other tasks and serves as the fallback keystore for both internal and external use cases when custom keystores are not defined.

!!! note 
    
    Learn how to [create keystores]({{base_path}}/deploy/security/keystores/create-new-keystores/).

### Configure the internal keystore

!!! warning
    Adding a new keystore for internal data encryption for an existing deployment will make already encrypted data unusable. In such cases, an appropriate data migration effort is needed.

The internal keystore is used for encrypting internal data. To configure a custom internal keystore, add the following configuration block to the `deployment.toml` file found in the `<IS_HOME>/repository/conf` folder.

=== "JKS"

    ``` toml
    [keystore.internal]
    file_name = "<keystore file name>.jks"
    password = "<password>"
    key_password = "<password>"
    type = "JKS"
    alias = "<alias of the public certificate>"
    ```

=== "PKCS12"

    ``` toml
    [keystore.internal]
    file_name = "<keystore file name>.p12"
    password = "<password>"
    key_password = "<password>"
    type = "PKCS12"
    alias = "<alias of the public certificate>"
    ```

### Configure TLS keystore

The TLS keystore is used to manage SSL/TLS connections established with {{product_name}}. Given below is the default configuration used internally, which points to the default keystore in your product.

If you need to configure a different keystore for SSL, you may change the values accordingly.

```toml 
[transport.https.sslHostConfig.certificate.properties]
certificateKeystoreFile = "${carbon.home}/repository/resources/security/$ref{keystore.tls.file_name}"
certificateKeystorePassword = "$ref{keystore.tls.password}"
certificateKeystoreType = "$ref{keystore.tls.type}"
certificateKeyAlias = "$ref{keystore.tls.alias}"
certificateKeyPassword = "$ref{keystore.tls.key_password}"
```
  
For SSL validations, you may change the following internally-used trust-store configurations.

```toml
[transport.https.sslHostConfig.properties]
truststoreFile="${carbon.home}/repository/resources/security/$ref{truststore.file_name}"
truststorePassword = "$ref{truststore.password}"
truststoreType = "$ref{truststore.type}"
```

### Configure protocol-specific keystores

You may define protocol-specific keystores for OAuth 2.0, WS-Federation or WS-Trust (available as a [connector](https://store.wso2.com/connector/identity-inbound-auth-sts){target="_blank"}) to sign/verify identity tokens such as JWT and SAML assertions.

To do so,

1. [Create a custom keystore]({{base_path}}/deploy/security/keystores/create-new-keystores/) and add the following configuration to the `deployment.toml` file found in the `<IS_HOME>/repository/conf` folder.

    === "JKS"

        ``` toml
        [keystore.custom]
        file_name = "<keystore file name>.jks"
        password = "<password>"
        key_password = "<password>"
        type = "JKS"
        alias = "<alias of the private key>"
        ```

    === "PKCS12"

        ``` toml
        [keystore.custom]
        file_name = "<keystore file name>.p12"
        password = "<password>"
        key_password = "<password>"
        type = "PKCS12"
        alias = "<alias of the private key>"
        ```

2. Map the custom keystore to the corresponding authentication protocol in the same `deployment.toml` file as shown below.

    === "OAuth 2.0"
        ``` toml
        [keystore.mapping.oauth]
        keystore_file_name = "<keystore name>"
        use_in_all_tenants = true
        ```

    === "WS-Federation"
        ``` toml
        [keystore.mapping.ws_federation]
        keystore_file_name = "<keystore name>"
        use_in_all_tenants = true
        ```

    === "WS-Trust"
        ``` toml
        [keystore.mapping.ws_trust]
        keystore_file_name = "<keystore name>"
        use_in_all_tenants = true
        ```

    !!! note
        
        - For OAuth 2.0, custom keystores are only supported for the following grant types:

            - Authorization code
            - Client credential
            - Refresh token
            - Implicit
            - Password

        - The `use_in_all_tenants` parameter specifies whether in a [multi-tenant environment]({{base_path}}/guides/multitenancy/), the configurations will apply to the `carbon.super` root organization or all root organizations.

## Add new keys to an existing keystore

The following guides explain how you can add new keys to existing keystores.
{% if not is_version == "7.0.0" %}

### Add an asymmetric key pair to an existing keystore

{% endif %}

To add a key pair,

1. Navigate to the [default keystore](#configure-default-keystore-and-truststore) or other existing keystore on a terminal.

2. Execute the following command.

    === "Format"

        ```bash
        keytool -genkey -alias <PUBLIC_CERTIFICATE_ALIAS> -keyalg RSA -keysize 2048 -keystore <KEYSTORE_NAME> -dname "CN=<<Common Name>>,OU=<<Organization Unit>>,O=<<Organization>>,L=<<Locality>>,S=<<StateofProvice Name>>,C=<<Country Name>>"-storepass <KEYSTORE_PASSWORD> -keypass <PRIVATE_KEY_PASSWORD>
        ```

    === "Sample keytool command"

        ``` bash
        keytool -genkey -alias newkey -keyalg RSA -keysize 2048 -keystore wso2carbon.jks -dname "CN=localhost, OU=IT,O={{base_path}},L=SL,S=WS,C=LK" -storepass wso2carbon -keypass wso2carbon
        ```

    !!! tip  
        If you are planning to delete the newly added keys in the future, it is recommended to maintain separate keystores for internal and external encryption purposes.

This newly added key can be used for different purposes.

!!! abstract ""
    **Example**

    Follow the instructions given below to set the newly added key as the primary encrypting and signing key:

    1. Open the `deployment.toml` file in the `<IS_HOME>/repository/conf` directory.

    {% if is_version == "7.0.0" %}

    2. Update the `alias` parameter under the `[keystore.primary]` element with the new keystore `alias`.
            
        ```toml
        [keystore.primary]
        alias= "newKey"
        ```
    {% else %}

    2. Update the `alias` parameter under the `[keystore.tls]` element with the new keystore `alias`.
            
        ```toml
        [keystore.tls]
        alias= "newKey"
        ```
    {% endif %}

{% if not is_version == "7.0.0" %}

### Add a symmetric secret to a PKCS12 keystore

To create a PKCS12 keystore with an AES key or add an existing key to the keystore, use the following command. If the keystore is not available, new PKCS12 keystore will be created.

=== "Format"

    ``` bash

    keytool -genseckey -alias <SECRET_ALIAS> -keyalg AES -keysize 256 -keystore <KEYSTORE_NAME> -storetype PKCS12 -storepass <KEYSTORE_PASSWORD> -keypass <KEYSTORE_PASSWORD>

    ```


=== "Sample keytool command"

    ``` bash

    keytool -genseckey -alias secretkey -keyalg AES -keysize 256 -keystore keystore.p12 -storetype PKCS12 -storepass password -keypass password

    ```

!!! abstract ""

    **Example**

    Follow the instructions given below to set the newly added key for symmetric encryption using cipher tool:

    1. Open the `deployment.toml` file in the `<IS_HOME>/repository/conf` directory.

    2. Update the `alias` parameter under the `[keystore.tls]` element with the new keystore `alias`.       

        ```toml
        [keystore.internal]
        file_name = "keystore.p12"
        password = "password"
        key_password = "password"
        type = "PKCS12"
        alias= "secretkey"
        ```
{% endif %}

## View public keys via JWKS

To view super tenant public key sets via the JWKS endpoint, visit `https://<IS_HOST>:<PORT>/oauth2/jwks`.

!!! abstract ""
    **Example**
    ```json
    // 20190612140905
    // https://localhost:9443/oauth2/jwks
      
    {
      "keys": [
        {
          "kty": "RSA",
          "e": "AQAB",
          "use": "sig",
          "kid": "MGZlMjg1MTEyZjE5ZGEyZTI2MWY4ODNlOGM5ZWQwZDIyNzk4MTJiZg",
          "alg": "RS256",
          "n": "swfFo3uUhsEE5SSJSUrzE4-U-PuYmQn-d71GOV59VcL1_cZRAPS89GE1_M3fmFP4xzB7X4p5vYW7lYYZvOUeZGC0BwR1YXz7uK9VRqXDQM1t_X8yUxtYf6u6hajD5fR3PzirlMzjW1ckojeGTgKS5G-HdixOs2OX2n_kQ5LVUHwIEJ2lryGkfd2Vfq7IBgAifQqYDLcrKqK3-iwF7-foii0lLFg8E_dRuOD5sa6Ec01WjogsA14fZRHzmNKiocjP_FOzmvfq7uHRYta6erTVHtsdOvJBVDy1ANvR0cxGdydfRnGwDYI05kgA5L27MnlN6NMroffDBtHmlCvvwToylw"
        },
        {
          "kty": "RSA",
          "e": "AQAB",
          "use": "sig",
          "kid": "NTAxZmMxNDMyZDg3MTU1ZGM0MzEzODJhZWI4NDNlZDU1OGFkNjFiMQ",
          "alg": "RS256",
          "n": "luZFdW1ynitztkWLC6xKegbRWxky-5P0p4ShYEOkHs30QI2VCuR6Qo4Bz5rTgLBrky03W1GAVrZxuvKRGj9V9-PmjdGtau4CTXu9pLLcqnruaczoSdvBYA3lS9a7zgFU0-s6kMl2EhB-rk7gXluEep7lIOenzfl2f6IoTKa2fVgVd3YKiSGsyL4tztS70vmmX121qm0sTJdKWP4HxXyqK9neolXI9fYyHOYILVNZ69z_73OOVhkh_mvTmWZLM7GM6sApmyLX6OXUp8z0pkY-vT_9-zRxxQs7GurC4_C1nK3rI_0ySUgGEafO1atNjYmlFN-M3tZX6nEcA6g94IavyQ"
        },
        {
          "kty": "RSA",
          "e": "AQAB",
          "use": "sig",
          "kid": "MGZlMjg1MTEyZjE5ZGEyZTI2MWY4ODNlOGM5ZWQwZDIyNzk4MTJiZg_RS256",
          "alg": "RS256",
          "n": "swfFo3uUhsEE5SSJSUrzE4-U-PuYmQn-d71GOV59VcL1_cZRAPS89GE1_M3fmFP4xzB7X4p5vYW7lYYZvOUeZGC0BwR1YXz7uK9VRqXDQM1t_X8yUxtYf6u6hajD5fR3PzirlMzjW1ckojeGTgKS5G-HdixOs2OX2n_kQ5LVUHwIEJ2lryGkfd2Vfq7IBgAifQqYDLcrKqK3-iwF7-foii0lLFg8E_dRuOD5sa6Ec01WjogsA14fZRHzmNKiocjP_FOzmvfq7uHRYta6erTVHtsdOvJBVDy1ANvR0cxGdydfRnGwDYI05kgA5L27MnlN6NMroffDBtHmlCvvwToylw"
        },
        {
          "kty": "RSA",
          "e": "AQAB",
          "use": "sig",
          "kid": "NTAxZmMxNDMyZDg3MTU1ZGM0MzEzODJhZWI4NDNlZDU1OGFkNjFiMQ_RS256",
          "alg": "RS256",
          "n": "luZFdW1ynitztkWLC6xKegbRWxky-5P0p4ShYEOkHs30QI2VCuR6Qo4Bz5rTgLBrky03W1GAVrZxuvKRGj9V9-PmjdGtau4CTXu9pLLcqnruaczoSdvBYA3lS9a7zgFU0-s6kMl2EhB-rk7gXluEep7lIOenzfl2f6IoTKa2fVgVd3YKiSGsyL4tztS70vmmX121qm0sTJdKWP4HxXyqK9neolXI9fYyHOYILVNZ69z_73OOVhkh_mvTmWZLM7GM6sApmyLX6OXUp8z0pkY-vT_9-zRxxQs7GurC4_C1nK3rI_0ySUgGEafO1atNjYmlFN-M3tZX6nEcA6g94IavyQ"
        }
      ]
    }
    ```
