# Add MFA with Push Notification


Push notifications provide a seamless and secure MFA solution by allowing users to verify their identity with a simple tap on their registered device. This real-time authentication method reduces reliance on passwords and one-time passcodes, enhancing security against phishing and credential attacks.

Follow the instructions given below to configure Multi-Factor Authentication (MFA) using Push Notifications in {{ product_name }}.

## Prerequisites

- To get started, you need to [register an application with {{ product_name }}]({{base_path}}/guides/applications/). You can register your own application or use one of the [sample applications]({{base_path}}/get-started/try-samples/) provided.

- You need to configure a Push Provider in {{ product_name }}. If you haven't configured a Push Notification Provider yet, follow the instructions in the [Push Provider Configuration]({{base_path}}/guides/notification-channels/configure-push-provider) guide.

- You need to have a user account in {{ product_name }}. If you don't already have one, [create a user account]({{base_path}}/guides/users/manage-users/#onboard-a-user) in {{ product_name }}.

- A push authenticator application is required for the purpose of recieving push notifications. Learn how to [build your own push authenticator app.]({{base_path}}/references/tutorials/build-your-own-push-authenticator-app)

- If push notification device progressive enrollment is disabled, [application users]({{base_path}}/guides/users/manage-users/#onboard-a-user) need to register their push notification devices via the My Account app prior to using push notification based login. Be sure to educate your users on how to [enroll push notification devices via My Account.]({{base_path}}/guides/user-self-service/register-push-notification-device/)

## Set up Push Notifications

{{ product_name }} has some default settings for Push Notifications, which are sufficient for most cases. If required, you can change the default settings, as explained below.

To update the default Push Notification settings:

1. On the {{ product_name }} Console, go to **Connections** and select **Push Notification**.
2. Update the following parameters in the **Settings** tab:

    ![Setup Push Notifications in {{ product_name }}]({{base_path}}/assets/img/guides/mfa/push/setup-push-auth.png){: width="600" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}

    <table>
         <tr>
           <th style="width: 350px;">Field</th>
           <th>Description</th>
         </tr>
         <tr>
           <td><code>Enable number Challenge</code></td>
           <td>When enabled, users must confirm the number displayed in the application on their push authentication device to complete the sign in.</td>
         </tr>
         <tr>
           <td><code>Enable push notification device progressive enrollment</code></td>
           <td>
               When enabled, users may enroll their devices for push authentication at the moment they log in to the application.
           </td>
         </tr>
         <tr>
           <td><code>Push notification resend interval</code></td>
           <td>Specifies the time interval between the resend attempts. Also, the polling to identify user's response for the push notification will be ended once the timer is completed.</td>
         </tr>
         <tr>
           <td><code>Allowed push notification resend attempts</code></td>
           <td>The number of allowed push notification resend attempts. Once exceeded, the user will not be allowed to send any push notifications.</td>
         </tr>
    </table>

3. Once you update the Push Notification settings, click **Update**.

## Enable push notifications login for an app

{% include "../../../guides/fragments/add-login/mfa/add-push-auth-login.md" %}

## Enable push notification device progressive enrollment

This feature allows users to enroll their push notification devices seamlessly during the usual login flow, offering a blend of convenience and security. Follow the steps given below to enable **Push Notification Devices progressive enrollment** for your application.

1. On the {{ product_name }} Console, go to **Connections**.

2. Select the **Push Notification** connection.

3. Go to the **Settings** tab of the connection.

4. Enable the option for **Enable push notification device progressive enrollment** by checking its checkbox.

    ![Enable push notification device progressive enrollment in {{ product_name }}]({{base_path}}/assets/img/guides/mfa/push/enable-push-progressive-enrollment.png){: width="700" style="border: 0.3px solid lightgrey;"}

5. Click **Update** to save your changes.


!!! note
    Push notification device progressive enrollment can only be configured at the organizational level and cannot be modified at the application level.


## Try out Push Notification MFA flow with a user already enrolled with a device

In this section, we will guide you through the steps to authenticate using Push Notification MFA with a user who has already enrolled a push notification device.

1. Access the application URL.

2. Click **Login** to access the {{ product_name }} login page.

3. Enter your username and password, then click **Sign In**.

4. You will receive a push notification on your registered device. Approve the authentication request from the registered device. Below shown page will be displayed and will be polling for the user's response.

    ![Push notification await page]({{base_path}}/assets/img/guides/mfa/push/push-auth-wait-page.png){: width="400" style="border: 0.3px solid lightgrey;"}

5. Once you approve the authentication request, you will be successfully logged in to the application.


## Try out Push Notification MFA flow with a user not enrolled with a device

In this section, we will guide you through the steps to authenticate using Push Notification MFA with a user who has not enrolled a push notification device when progressive enrollment is enabled.

1. Access the application URL.

2. Click **Login** to access the {{ product_name }} login page.

3. Enter your username and password, then click **Sign In**.

4. You will be displayed with a similar page as shown below. Scan the QR code using your Push Authenticator App to enroll your device. Once the device is enrolled successfully, check the checkbox and click **Continue** to proceed with the authentication.

    ![Push notification device enrollment page]({{base_path}}/assets/img/guides/mfa/push/push-auth-enroll-page.png){: width="400" style="border: 0.3px solid lightgrey;"}

5. You will receive a push notification on your registered device. Approve the authentication request from the registered device.

6. Once you approve the authentication request, you will be successfully logged in to the application.
