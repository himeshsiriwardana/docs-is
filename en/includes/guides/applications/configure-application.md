# Configure applications

After registering your application in {{product_name}}, you can configure the following settings to control its visibility and accessibility to users.

## Make an application discoverable

Discoverable applications appear in the users' [My Account portal]({{base_path}}/guides/user-self-service/configure-self-service-portal/), making it easy for users to see and access the applications that they can use. When users click on an application, they get redirected to the application's access URL.

To enable application discovery:

1. On the {{product_name}} Console, navigate to **Applications**.
2. Select the application you want users in the organization to discover and go to the **General** tab. (This option is not available for M2M applications.)
3. Scroll down to the **Discoverable application** section.
4. Select the checkbox to enable and configure an access URL to make the application discoverable to everyone in the organization.
{% if product_name == "Asgardeo" or (product_name == "WSO2 Identity Server" and is_version > "7.1") %}
5. To limit discoverability to specific users, select **Only a selected group of users can discover this application** under **Discoverable Groups**.
6. Choose the user groups from each user store and click on **Update** button.
7. The application will then be discoverable only to users in the selected groups.

    ![Make an application discoverable]({{base_path}}/assets/img/guides/applications/discover-application.png){: width="600" style="display: block; margin: 0; border: 0.3px solid lightgrey;"}
{% endif %}

To learn how users can discover applications through the **My Account** portal, see [Discover applications]({{base_path}}/guides/user-self-service/discover-applications/).

## Enable/Disable an application

If your application is undergoing maintenance or should be made temporarily unavailable for any reason, you can disable it and re-enable it when ready.

!!! warning "Important"
    Disabling an application blocks new logins, revokes active access tokens and removes any user consents previously granted to the application. Upon re-enabling the application, users must login again and re-grant their consents.

To enable/disable an application,

1. On the {{product_name}} Console, go to **Applications**.

2. Select the application you wish to disable and go to its **General** tab.

3. Scroll down to the **Danger Zone**. 

4. Under **Disable application**, switch the toggle on to disable the application or off to enable it.

    ![Disable an application]({{base_path}}/assets/img/guides/applications/disable-application.png)


## Delete an application

To delete an application,

1. On the {{product_name}} Console, go to **Applications**.

2. Select the application you wish to delete and go to its **General** tab.

3. Scroll down to the **Danger Zone**. 

4. Click Delete under **Delete application** and confirm your action.