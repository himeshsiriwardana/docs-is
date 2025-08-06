# Applications

**Applications** in {{product_name}} represent client entities such as web, mobile, or desktop apps that require user authentication and access management. By registering an application, you define how it interacts with the {{product_name}} using protocols like OIDC or SAML, enabling secure login, single sign-on (SSO), and authorization.

You can register the following application types in {{product_name}}.

## Single-page applications

Single-page applications (SPAs) run on the browser and dynamically update the content as the user interacts with it. As the user does not need to wait page reloads, users have a seamless experience with high responsiveness. JavaScript frameworks and libraries such as React, Angular and Vue.js are some popular technologies adopted to build SPAs. 

- [Register a single-page application]({{base_path}}/guides/applications/register-single-page-app/)

## Web applications

Web applications (web apps) are the most common type of applications in use. They are usually hosted on a web server and accessed by a browser. Web applications require authentication as they offer functionality specific to logged-in users. 

- [Register a web application with OIDC]({{base_path}}/guides/applications/register-oidc-web-app/)
- [Register a web application with SAML]({{base_path}}/guides/applications/register-saml-web-app/)

## Mobile applications

Mobile applications are apps that run on mobile devices. Android and iOS are some of the popular technologies adopted to build mobile applications.

- [Register a mobile application]({{base_path}}/guides/applications/register-mobile-app/)

## Standard-based applications

Standard-based applications allow you to configure the application protocol settings (OIDC or SAML) from scratch. 

- [Register a standard-based application]({{base_path}}/guides/applications/register-standard-based-app)

{% if product_name == "WSO2 Identity Server" %}
## Machine-to-Machine (M2M) applications

Machine-to-Machine (M2M) applications, are designed for automated communication and interaction between devices or services without direct human intervention. Unlike user-centric applications, M2M applications cater to non-interactive scenarios, including command-line tools, daemons, IoT (Internet of Things) devices, or services running on the backend. 

- [Register a machine-to-machine application]({{base_path}}/guides/applications/register-machine-to-machine-app/)
{% endif %}