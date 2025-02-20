# Configure X.509 certificate authenticator

This guide walks you through configuring the X.509 certificate authenticator in {{product_name}}, helping you set up secure certificate-based authentication for your users.

X.509 is a widely recognized standard within Public Key Infrastructure (PKI) that defines the format for public key certificates. These certificates are typically issued by trusted Certificate Authorities (CAs) and serve as a means of securely identifying users or systems. During the authentication process, the user (or client) presents their X.509 certificate to the authentication server, which then validates the certificate by checking the digital signature of the CA to confirm the certificate’s authenticity.

!!! note
    You need to create the necessary certificates and truststores before you start configuring the x509 
    authenticator on {{ product_name }}. Refer to [Keystores and Truststores]({{base_path}}/deploy/security/keystores/) for more information.

## Step 1: Create a self-signed certificate

1. Generate a private key. The following command generates a private RSA key with a key size of 2048 bits.

    ``` shell
    openssl genrsa -out rootCA.key 2048
    ```
    In this example, the key size is 2048 bits, but you can adjust it according to your security requirements.

2. Using the private key, generate a self-signed certificate. The following command generates a self-signed certificate that is valid for 10 years (3650 days).

    ```
    openssl req -new -x509 -days 3650 -key rootCA.key -out rootCA.crt
    ```

3. When prompted, provide the necessary details. Below is an example of the input values:

    ```text
    Country Name (2 letter code) [AU]: SL
    State or Province Name (full name) [Some-State]: Western
    Locality Name (eg, city) [ ]: Colombo
    Organization Name (eg, company) [Internet Widgits Pty Ltd]: WSO2
    Organizational Unit Name (eg, section) [ ]: QA
    Common Name (e.g. serverFQDN or YOUR name) [ ]: wso2is.com
    Email Address [ ]: kim@wso2.com
    ```

    Once you have gone through these steps, you now have a private key (rootCA.key) and a self-signed certificate (rootCA.crt).

4. To manage certificates effectively, OpenSSL requires a specific directory structure. Create it as follows:

    ``` shell
    mkdir -p demoCA/newcerts
    ```

5. Create the necessary files as follows:

    ``` shell
    touch demoCA/index.txt
    echo '01' > demoCA/serial
    ```

## Step 2: Import the certificate to the {{product_name}} truststore

To enable X.509 certificate-based authentication, you need to import the client's public certificate into the truststore. This process ensures that {{product_name}} can recognize and trust the certificates presented by users during authentication.

``` shell
keytool -import -noprompt -trustcacerts -alias rootCA -file rootCA.crt -keystore <path_to_the_client_truststore> -storepass <password_of_the_truststore>
```

!!! note "Default truststore values"
    If you are using the default values,
    <ul>
        <li>truststore path is <code>&lt;IS_HOME&gt;/repository/resources/security/client-truststore.p12</code></li>
        <li>password is <code>wso2carbon</code></li>
    </ul>
    Refer to [manage keystores]({{base_path}}/deploy/security/keystores/configure-keystores/) to learn how to change default keystores and truststores.


!!! tip "Got the 'permission denied' error?"
    If you get a permission denied error, run this command as an administrator to resolve the issue.

## Step 3: Create a sever certificate

In this step, we will generate the server certificate that {{product_name}} will use to authenticate itself to clients. This involves creating a keystore that contains the private key and public certificate for {{product_name}}, and then generating a Certificate Signing Request (CSR) to get this certificate signed by a CA.

1. Generate a keystore that contains the private key and public certificate. This is the key pair that will be used by the server to identify itself to the client. The following command creates a new keystore (localcrt.jks) and generates a new RSA key pair with a validity of 10 years (3650 days).

    ``` shell
    keytool -genkey -v -alias localcrt -keyalg RSA -validity 3650 -keystore localcrt.jks -storepass localpwd -keypass localpwd
    ```

    Enter the necessary details to create the keystore.

    !!! tip
        For `What is your first and last name?`, provide a name without spaces. 

    This command will create a keystore with the following details: 

    ``` text
    Keystore name: localcrt.jks
    Alias of public certificate: localcrt
    Keystore password: localpwd
    Private key password: localpwd (this is required to be the same as keystore password)
    ```

2. Next, we generate a Certificate Signing Request (CSR) using the keystore we just created. The CSR will be submitted to a Certificate Authority (CA), which will sign it, proving that the certificate is trusted.

    ``` shell
    keytool -certreq -alias localcrt -file localcrt.csr -keystore localcrt.jks -storepass localpwd
    ```

3. To ensure {{product_name}} does not accept revoked certificates when using X.509 certificate-based authentication, configure OpenSSL to check for Certificate Revocation List (CRL) or use Online Certificate Status Protocol (OCSP). To do so,

    1.  Open either of the following files in your openssl installation.
        -  `validation.cnf`
        -  `openssl.cnf`

        ??? note "Location of the configuration files"
            The location of the configuration file depends on the operating system and the openssl installation method.

            - For Linux, 
                - `/etc/ssl/openssl.cnf`
                - `/usr/lib/ssl/openssl.cnf`
            
            - For MacOS, 
                - `/opt/homebrew/etc/openssl@<version>/openssl.cnf`
                - `/System/Library/OpenSSL/openssl.cnf` (System-wide, read-only file. Take a copy of it and avoid editing directly.)

            - For Windows,
                - `C:\Program Files\OpenSSL-Win64\bin\openssl.cnf`
                - `C:\Program Files (x86)\GnuWin32\share\openssl.cnf`
            
            If you do not have permission to modify the system-wide configuration file, create a custom configuration file (e.g., validation.cnf) in your working directory.

    2.  Set the following properties under `x509_extensions`.

        ``` java
        crlDistributionPoints = URI:http://pki.google.com/GIAG2.crl
        authorityInfoAccess = OCSP;URI: http://clients1.google.com/ocsp
        ```
    
4. Once it is done, sign the CSR using the root CA key generated in Step 1 above.

    ```shell
    openssl ca -batch -startdate 150813080000Z -enddate 250813090000Z -keyfile rootCA2.key -cert rootCA2.crt -policy policy_anything -config <custom_config_location> -notext -out localcrt.crt -infiles localcrt.csr
    ```

    !!! note
        The `-config` flag is only needed if you are using a custom configuration file.

    This creates a signed certificate called `localcrt.crt` that is valid for a specified period that is denoted by the `startdate` and `enddate`.

5. The next step is to import the CA and signed certificate into the keystore.

    ``` shell
    keytool -importcert -alias rootCA -file rootCA.crt -keystore localcrt.jks -storepass localpwd -noprompt
        
    keytool -importcert -alias localcrt -file demoCA/newcerts/01.pem -keystore localcrt.jks -storepass localpwd -noprompt
        ```
    
    6. Now, get the `pkcs12` out of `.crt` file using the command given below as it is been used to import certificates to the browser.

        ``` shell
        keytool -importkeystore -srckeystore localcrt.jks -destkeystore localhost.p12 -srcstoretype JKS -deststoretype PKCS12 -srcstorepass 
        localpwd -deststorepass browserpwd -srcalias localcrt -destalias browserKey -srckeypass localpwd -destkeypass browserpwd -noprompt
        ```

        Make sure to use the same password you used when creating the keystore for the `srcstorepass` in the above step. Now you have 
        the `localhost.p12` file that you can import into your browser as explained in the [import certificate](#import-certificate) section.

    7. Next, create a new trust store and import the server certificate into the trust store using the following commands:

        ``` shell
        keytool -import -keystore cacerts.jks -storepass cacertspassword -alias rootCA -file rootCA.crt -noprompt
        keytool -importcert -alias localcrt -file localcrt.crt -keystore cacerts.jks -storepass cacertspassword -noprompt
        ```
        
        !!! tip "CN"
            The User objects in the LDAP directory hierarchy have designators that start with CN, meaning Common Name. The CN designator 
            applies to all but a few object types. Active Directory only uses two other object designators (although LDAP defines several).

Once you have done the above steps, you have the keystore (`localcrt.jks`), truststore (`cacerts.jks`), and pkcs12 (`localhost.p12`) files 
that you need to use later on in this guide.

## Configure the X509 certificate for the app

1.  Download [{{ product_name }}](http://wso2.com/products/identity-server/).

2.  Replace your keystore file path, keystore password, trust store file path and trust store password (you can use the keystore and
    truststore, which you created in the [Work with Certificates](#work-with-certificates) section) in the following configuration and add it to the
    `<IS_HOME>/repository/conf/deployment.toml` file.

    ``` toml 
    [custom_transport.x509.properties]
    protocols="HTTP/1.1"
    port="8443"
    maxThreads="200"
    scheme="https"
    secure=true
    SSLEnabled=true
    keystoreFile="/path/to/keystore.jks"
    keystorePass="keystorepwd"
    truststoreFile="/path/to/truststore.jks"
    truststorePass="truststorespassword"
    bindOnInit=false
    clientAuth="want"
    ssl_protocol = "TLS"
    ```

    !!! note
    
        1.   To function properly, this connector should come first in the order. Otherwise, when mutual SSL takes place, the already existing connector (9443) will be picked up and the certificate will not be retrieved correctly.

        2.  The `clientAuth` attribute causes the Tomcat to require the client with providing a certificate that can be configured as follows.
            -   `true` : valid client certificate required for a connection to succeed
            -   `want` : use a certificate if available, but still connect if no certificate is available
            -   `false` : no client certificate is required or validated
    
        3.   The `truststoreFile` attributes specifies the location of the truststore that contains the trusted certificate issuers.

## Disable certificate validation

The location that is used to disable certificate validation depends on whether {{ product_name }} was started at least once or not.

-   If you have never started {{ product_name }} before, the configurations should be made on the `deployment.toml` file.

-   If you have started {{ product_name }} at least once, the configurations should be made on the registry parameters.

### Disable certificate validation in an unstarted {{ product_name }} pack

Follow the steps below to disable certificate validation if your {{ product_name }} pack has never been started.

1.  Open the `deployment.toml` file in the `<IS_HOME>/repository/conf` directory.

2.  Add the following configuration to disable CRL-based certificate validation and OCSP-based certificate validation.

    ``` toml
    [certificate_validation]
    ocsp_validator_enabled = false
    crl_validator_enabled = false
    ```
    
    !!! infox
        - CRL is a list of digital certificates that have been revoked by the issuing CA.
        - OCSP is an internet protocol that is used for obtaining the revocation status of an X509 digital certificate using the certificate serial number.

### Disable certificate validation in an already-started {{ product_name }} pack

Follow the steps below to disable certificate validation if {{ product_name }} was started before.

1. Log in to the {{ product_name }} Management Console (`https://<IS_HOST>:<PORT>/carbon`) using administrator credentials (`admin:admin`).

2.  Click **Main > Registry > Browse**.  
    ![registry](../../../assets/img/guides/authentication/mfa/registry.png){: width="300" height="500" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

3.  Disable CRL certificate validation.

    1.  Locate the CRL parameter by entering
            `_system/governance/repository/security/certificate/validator/crlvalidator`
            in the **Location** search box.  
            ![location](../../../assets/img/guides/authentication/mfa/browse-registry-location.png){: width="600" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

    2.  Expand **Properties**.  
        ![crlvalidator-properties](../../../assets/img/guides/authentication/mfa/crlvalidator-properties.png){: width="600" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}
    
    3.  Click **Edit** pertaining to the **Enable** property.  
        ![crlvalidator-enable-property](../../../assets/img/guides/authentication/mfa/crlvalidator-enable-property.png){: width="600" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

    4. Change the value to `false`, click **Save**.  
        ![save-crlvalidator-disable](../../../assets/img/guides/authentication/mfa/save-crlvalidator-disable.png){: width="600" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

    5. Similarly, disable OCSP certificate validation in the `_system/governance/repository/security/certificate/validator/ocspvalidator`
        registry parameter.

## Configure the Authentication Endpoint

1.  Open the `deployment.toml` file in the `<IS_HOME>/repository/conf/` directory.

2.  Add the following configuration to the file.

    ``` toml
    [authentication.authenticator.x509_certificate.parameters]
    name ="x509CertificateAuthenticator"
    enable=true
    AuthenticationEndpoint="https://localhost:8443/x509-certificate-servlet"
    username= "CN"
    ```

    !!! info
        - `name` : This attribute identifies the authenticator that is configured as the second authentication step. 
        - `enable`: This attribute, when set to true makes the authenticator capable of being involved in the authentication process. 
        - `AuthenticationEndpoint` : This is the URL with the port that is secured with the certificate, 
            e.g., `https://localhost:8443/x509-certificate-servlet`. 
            This value will be taken to extract the certificate from the browser by redirecting the user to the specified endpoint. 
            Update this based on your host name.
        - `username` : This attribute value will be taken as the authenticated user subject identifier. Update this
             with any of the certificate attributes, e.g., CN and Email.

    !!! note
        When X509 authentication is configured as the second authentication
        step, the certificate will be validated to check whether it is
        associated with the authenticated user in the first authentication
        step. For that, the `username` parameter will
        be used. For that, the authenticated user name considered in the
        first authentication step will be validated with the certificate
        attribute in this property.
    
        When X509 authentication is configured as the first step, this
        certificate attribute will be treated as the authenticated user
        subject identifier.
    
3.  If you are using a user property to store X509 certificate, add the following parameter.

    ``` toml
    [authentication.authenticator.x509_certificate.parameters]
    setClaimURI = "http://wso2.org/claims/userCertificate"
    ```

4.  To enable storing the X509 certificate as a user claim, add the following parameter.

    ``` toml 
    [authentication.authenticator.x509_certificate.parameters]
    EnforceSelfRegistration = true
    ```

5. Restart the server to apply the changes.

## Add a claim mapping for the certificate

If storing the certificate as a user claim is enabled, the X509 certificate will be stored as a user claim and verified with the
retrieved certificate from the request.

To add the custom attribute, follow the [Add custom attributes](../../../guides/users/attributes/manage-attributes.md/#add-custom-attributes) steps 
and use the following details for the claim addition.

``` text
- Attribute name : userCertificate
- Attribute Display Name : User Certificate
```
![add-user-certificate-attribute](../../../assets/img/guides/authentication/mfa/add-user-certificate-attribute.png){: width="600" style="display: block; border: 0.3px solid lightgrey;"}

This will create the **OpenID Connect** and **SCIM 2.0** protocol mappings as well. When storing the certificate in a user attribute, you will 
need to update the column size of the `VALUE` column of the `UM_USER_ATTRIBUTES` table to a suitable value.

## Import certificate

-   **Chrome**
    1.  In your browser, go to **Settings** > **Privacy and security** > **Manage certificates** > **Your certificates**.
    
        ![manage-cert-chrome](../../../assets/img/guides/authentication/mfa/manage-certificates-chrome.png){: width="800" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

    2.  Click on **Import,** select the **localhost.p12** file, and then
    click **Open**. Note that you may have to enter the password that
    you used to generate the p12 file, (browserpwd) to open it.
    
        ![import-cert-chrome](../../../assets/img/guides/authentication/mfa/import-certificate-chrome.png){: width="800" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

-   **Firefox**
    1.  Click on the menu option on the right of the screen and select
        **Settings**.  
    
        ![settings-firefox](../../../assets/img/guides/authentication/mfa/settings-firefox.png){: width="300" height="500" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

    2.  Click **Privacy & Security** in the left navigation and scroll down to
        the **Certificates** section. Click **View Certificates**.  
        
        ![view-certificates](../../../assets/img/guides/authentication/mfa/view-certificates-firefox.png){: width="800" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

    3.  Go to **Your Certificates** in the window that appears, click **Import**.  

        ![import-firefox](../../../assets/img/guides/authentication/mfa/import-certificated-firefox.png){: width="600" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

    4.  Select the **localhost.p12** file, and then click **Open**. Note
        that you may have to enter the password that you used to generate
        the p12 file, (browserpwd) to open it.

## Register an app

The next step is to configure the application.

1. Go to Console and create an application by following the steps in [Web applications](../../../guides/applications/index.md#web-applications)

2. Go to **Login Flow** of the created app, select **Start with default configuration** option.

    ![app-login-flow](../../../assets/img/guides/authentication/mfa/app-login-flow.png){: width="800" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

3. Remove the default **Username & Password** authenticator, add **X509 Certificate** and **Update**.

    ![add-x509-authenticator](../../../assets/img/guides/authentication/mfa/add-x509-authenticator.png){: width="800" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

4. Finally, click on **Update** to finish the application configurations.

## Onboard a user

A user for the corresponding certificate should be available in the system to perform the authentication. Follow the given instructions 
in [Onboard single user](../../users/manage-users.md/#onboard-single-user) to onboard a user with the username `wso2is.com` (This is the CN of the created certificate above).

## Try it out

Try to login to the application you have configured. You will be prompted to send the certificate.

![send-certificate](../../../assets/img/guides/authentication/mfa/certificate-send.png){: width="600" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

Once the authentication is successful, you will be redirected to the configured callback location of the application.
