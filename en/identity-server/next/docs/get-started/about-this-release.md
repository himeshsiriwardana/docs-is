# About this Release

{{product_name}} 7.2.0 succeeds WSO2 Identity Server 7.1.0 and introduces new features, improvements, and fixes.

## What's new in this release?

WSO2 Identity Server 7.2.0 delivers the following features and improvements:

## New Features


### OpenTelemetry-based tracing support for LDAP operations

We’re excited to introduce OpenTelemetry-based LDAP Operation Tracing to WSO2 Identity Server! This new feature fills a critical observability gap by enabling detailed tracing of LDAP operations such as search, bind, and modifyAttributes. Previously, while database calls were automatically traced, LDAP interactions remained invisible to tracing tools like Datadog.

With this enhancement, organizations gain full visibility into LDAP traffic within distributed traces, making it easier to diagnose authentication and user management workflows. The solution uses lightweight instrumentation by wrapping LDAP context calls with OpenTelemetry spans correlating with other service traces for end-to-end monitoring.

Admins can enable this feature via a simple configuration toggle, gaining rich telemetry without impacting existing LDAP logic. This powerful observability addition enhances troubleshooting and performance insights in complex identity deployments.

Learn more about `<Documentation link>`

### B2B Application Role Sharing

You now have full control over which roles are shared when delegating applications to sub-organizations in WSO2 Identity Server! Previously, application sharing automatically granted all associated roles to sub-orgs, which could lead to over-permissive access. 

With this update, admins can fine-tune role visibility using one of three sharing modes:
Share all roles with all organizations – Previous “everything shared” model.
Share a common set of roles with all organizations – Pick a single set of roles that will be shared everywhere.
Share different roles with each organization – Customize role sharing per sub-org for maximum flexibility.

The new experience is available for both console and general applications, with tailored UI in the “Shared Access” settings. Role selection is fully integrated into the sharing workflow, allowing admins to see at a glance which roles are shared where and adjust them instantly, while preserving the organizational hierarchy. This empowers tenant admins, B2B customers, and security teams to enforce least-privilege access, improve governance, and prevent unintended role propagation across complex organizational structures.

Learn more about `Documenatation link`

### Support inheriting "Login & Registration" related organization settings to sub-organizations

Login and registration configurations are now automatically inherited by child organizations. Customized settings applied at a parent level cascade down the hierarchy. If no parent customization exists, system defaults are used.

Child organizations can override inherited values as needed and can also revert overridden settings to re-adopt the inherited configuration at any time.


Learn more about `Documenatation link`

### Support inheriting attributes and OIDC scopes in sub-organizations

All attributes and attribute dialects available at the root level are now automatically available in the child organizations. Custom attributes no longer need to be explicitly shared via a B2B SaaS application.

OIDC scopes now support inheritance and are capable of inheriting customizations from the parent organizations.

Documentation: https://is.docs.wso2.com/en/next/guides/organization-management/inheritance-in-organizations/attribute-inheritance/
https://is.docs.wso2.com/en/next/guides/organization-management/inheritance-in-organizations/oidc-scope-inheritance/

### Unifying Naming Conventions in Root and Sub-Organizations

Going forward, naming conventions for root and sub-organizations are now unified, delivering consistency, and improved branding across B2B applications.

Key Highlights:
Organization Handle for Sub-Organizations:
Sub-organizations now feature an “Organization Handle”, a human-readable, unique, and immutable identifier, similar to the root organization domain. The  Organization Handle provided effortless organization discovery for your B2B applications, making it easier for users to reference organizations reliably.

Editable Display Name for Root Organizations:
Root organizations now gain a user-friendly display name, mirroring what’s available for sub-organizations. Use this display name for emails, notifications, and branding, ensuring a cohesive, recognizable identity for users and customers. The display name is editable, allowing organizations to tailor their presence and communications as business needs evolve.

Documentation:
Organization Handle for Sub-Organizations: 
https://is.docs.wso2.com/en/next/guides/organization-management/manage-organizations/#create-an-organization
Organization Display Name for Root Organizations:
		https://is.docs.wso2.com/en/latest/guides/multitenancy/manage-tenants(pending)
Organization Handle based Discovery: 
https://is.docs.wso2.com/en/next/guides/organization-management/organization-discovery/
#configure-default-parameter-for-organization-discovery
#organization-handle-based-discovery
API documentation: 
https://is.docs.wso2.com/en/next/apis/tenant-management-rest-api/
https://is.docs.wso2.com/en/next/apis/organization-apis/org-organization-mgt/

### Adding new languages to My Account & Console

My Account and the Console applications previously supported a limited set of languages.. With this release, users can now add or remove locales to customize the applications according to their preferred languages, improving flexibility and localization capabilities.

Documentation:
https://is.docs.wso2.com/en/next/guides/branding/localization/

### Oauth based authentication support for Email Providers

The Email Provider template now supports OAuth-based authentication for SMTP servers. Alongside the existing Basic authentication option, you can now configure SMTP using client credential authentication to meet modern authentication requirements.

This enhancement comes ahead of Microsoft’s planned retirement of Basic authentication with Client Submission (SMTP AUTH) in Exchange Online, scheduled for April 2026. Enabling OAuth support now ensures uninterrupted email delivery and keeps your configuration aligned with the latest security standards.

Documentation:
https://is.docs.wso2.com/en/next/guides/notification-channels/configure-email-provider/

### User Impersonation without Application Changes

Identity Server now supports initiating user impersonation without requiring changes to business applications. Previously, users could only initiate impersonation through an impersonation-authorized client application after modifying its source code to support the feature. With this update, impersonation can be started directly from the Console application, enabling seamless SSO access to any impersonation-authorized business application. This enhancement simplifies deployment and increases flexibility for organizations adopting impersonation.


Documentation: 
https://is.docs.wso2.com/en/next/guides/authorization/user-impersonation/

### Application Dashboard in MyAccount

Identity Server now offers enhanced control over application discoverability. Previously, any application marked as discoverable was visible to all users in the organization through the My Account portal. With this update, administrators can assign specific user groups as discoverable groups, ensuring that applications are visible only to the intended audiences. This provides a more tailored and convenient experience for users. If no groups are assigned, applications marked as discoverable will continue to be visible to all organization users through the My Account portal.

Documentation: 
https://is.docs.wso2.com/en/next/guides/applications/#make-an-application-discoverable

### Support configuring custom keypairs for root-organizations

Identity Server now provides greater flexibility in keystore management. In addition to the existing support for customizing the SAML keystore, users can now configure separate custom keystores for OAuth, WS-Trust, and WS-Fed. By default, the product continues to use the primary and tenant keystores for signing and encryption tasks across all authentication protocols. With this enhancement, organizations gain the ability to assign dedicated keystores for each protocol, ensuring stronger security controls and easier compliance management. Keystores can be configured either for all tenants or specifically for the super tenant through deployment configurations.

Documentation: 
https://is.docs.wso2.com/en/next/deploy/security/keystores/configure-custom-keystores/

### Flow Builder: Introducing Multi-Step Self Registration

We are excited to announce a major upgrade to user onboarding: you can now build custom, multi-step registration journeys in the Flow Builder. This feature moves beyond linear sign-up forms, giving you the power to compose a registration experience that precisely fits your business and security requirements.

You can now design your flow by sequencing a wide variety of steps. Your registration toolkit includes:

- Federated & Social Sign-Up: Allow users to begin their journey with trusted identity providers using OIDC federation or popular social logins.

- Passwordless Options: Offer modern, secure sign-up methods right from the start with Passkeys (FIDO2) or one-time Magic Links.

- Verifications: Add steps at any point to verify user details using Email OTP or SMS OTP, ensuring the information collected is accurate.

- Bot Protection: Secure your entire registration flow from automated abuse by integrating reCAPTCHA at any stage.

With these building blocks, you have unparalleled flexibility to create secure, user-friendly, and effective registration flows that match your exact specifications.

Documentation: `<>`

### Flow Builder:  Introducing Multi-Step Password Recovery

Strengthen account security and improve the user experience with our new multi-step password recovery capability in the Flow Builder. You can now design custom recovery journeys that layer multiple verification methods, providing robust protection against account takeover.

Your toolkit for building a secure recovery flow now includes:

- One-Time Codes: Add verification steps at any point in the flow using Email OTP or SMS OTP to confirm the user's identity.

- Secure Links: Utilize one-time Magic Links sent to a user's registered email for a simple and familiar recovery step.

- Bot Protection: Secure your entire recovery flow from automated attacks by integrating reCAPTCHA at any stage.

This enhancement gives you the flexibility to design a recovery process that matches your organization's specific security policies, from simple resets to advanced, multi-factor journeys.

Documentation: `<>`

### Flow Builder: Introducing Multi-Step Invited User Registration

`<Description>`

`<Documentation>`

### Support linking of multiple social identities to a local identity

We are excited to introduce a major enhancement for linking social identities with local user accounts. This improvement expands the flexibility of how federated accounts can be matched and associated with local identities.
With this update, you can now define up to two attribute mappings between a federated identity provider and the Identity Server. These mappings are used to identify and match a local user account when a federated user logs in through that provider. Once a match is found, the federated identity will be seamlessly linked to the corresponding local account.

Documentation: 
https://is.docs.wso2.com/en/next/guides/authentication/jit-user-provisioning/

### Federated enterprise account linking in a B2B model

We are introducing a significant improvement to streamline federated associations in B2B scenarios. With this enhancement, identity administrators can manage enterprise-level federated accounts more efficiently and at scale.
The new Federated User Association Bulk API allows admins to create or delete multiple federated user associations in a single request. This reduces manual effort, simplifies workflows, and ensures a more seamless experience when managing large numbers of federated identities across partner organizations.

Documentation: 
https://is.docs.wso2.com/en/next/apis/organization-apis/org-association-rest-api/#tag/admin/paths/~1federated-associations~1bulk/post 

### Custom page editor for end user facing portals

Identity Server now supports advanced branding capabilities. Previously, customizing the user interface beyond basic logos and themes required coding and deployment, making advanced personalization complex. With this update, you can fully tailor end-user pages directly from the in-console editor using custom HTML, CSS, and JavaScript. This enhancement gives organizations the flexibility to craft a seamless and engaging brand experience across login and self-service pages ensuring consistency, control, and minimal effort.


Documentation: 
https://is.docs.wso2.com/en/next/guides/branding/customize-layouts-with-editor/

### Post-Quantum TLS Support for outbound communication

X25519MLKEM768 combines the classical X25519 elliptic curve key exchange with ML-KEM-768 (Kyber-768), a post-quantum cryptographic algorithm. By adopting this hybrid mechanism, WSO2 Identity Server provides resilience against both classical and quantum-based threats for TLS communication.

Support for X25519MLKEM768 in inbound communication has been available since IS 7.0. With IS 7.2, this capability is extended to outbound communication as well, allowing Identity Server to establish secure TLS connections with both clients and servers that support X25519MLKEM768.

Documentation:
https://is.docs.wso2.com/en/next/deploy/security/configure-post-quantum-tls/post-quantum-outbound/ 

### User Account Management Enhancements

Managing user accounts has become more efficient with new enhancements to verification, password setup, and recovery workflows. These improvements resolve common challenges such as handling pending verifications, expired password setup emails, locked accounts, and unverified user profiles.

Key highlights:

- Filter users by pending verification states: Advanced filters in the Console give administrators precise visibility into the user base. Instantly identify and segment users by states such as pending password reset, pending initial password setup, pending email verification, pending mobile verification, locked accounts, and disabled accounts.

- Resend password setup emails or set passwords directly: The Console now enables administrators to resend initial password setup emails and password reset emails when links have expired, or directly set a user’s password, ensuring a smoother onboarding and recovery experience.

- Notify users of unverified accounts in MyAccount: The MyAccount portal now displays clear prompts when accounts remain unverified, with options for users to resend verification links and complete the process independently.

Together, these improvements simplify administrative workflows while empowering end users to complete verification, onboarding, and recovery seamlessly.

Documentation:
https://is.docs.wso2.com/en/next/guides/users/manage-users/#filter-users
https://is.docs.wso2.com/en/next/guides/users/manage-users/#resend-password-setup-linkcode
https://is.docs.wso2.com/en/next/guides/account-configurations/user-onboarding/self-registration/#resend-account-verification-email
https://is.docs.wso2.com/en/next/guides/user-self-service/self-register/

### Provide email OTP based password recovery capability

Identity Server now offers enhanced flexibility in password recovery options. In addition to the existing Email Link and SMS OTP methods, users can now recover their accounts using the Email OTP option as well. This provides a wider range of recovery choices, enabling organizations to offer a method that best fits their security and usability requirements. With this improvement, users who may not have access to SMS or prefer not to use recovery links can still regain access to their accounts securely through a one-time password sent directly to their email.

Documentation:
https://is.docs.wso2.com/en/next/guides/your-is/recover-password/
https://is.docs.wso2.com/en/next/guides/account-configurations/account-recovery/password-recovery/
https://is.docs.wso2.com/en/next/guides/user-self-service/user-password-recovery/

### Unification of forced password reset over OTP

Identity Server now extends the admin-forced password reset capability to support both Email OTP and SMS OTP methods. Previously, administrators could only initiate a forced password reset using the email link option. With this enhancement, organizations can enforce stronger and more flexible recovery mechanisms, giving users the ability to securely reset their passwords through either an OTP sent to their registered email address or a code delivered via SMS.

This update provides administrators with greater control and adaptability when managing account recovery scenarios. By offering multiple reset channels, Identity Server ensures that users can regain access quickly and securely, even in situations where one method may not be practical or available. The addition of Email OTP and SMS OTP options strengthens the overall resilience of password recovery flows while improving the user experience.

Documentation: 
https://is.docs.wso2.com/en/next/guides/account-configurations/account-recovery/admin-initiated-password-reset/

### Support data types for simple attributes

`<Content TODO>`

Documentation: `TODO`

### Support input formats for user attributes

We’re excited to announce support for input formats and data types for custom user attributes in WSO2 Identity Server! Previously, all custom attributes were rendered as simple text inputs, limiting flexibility and user experience when handling different kinds of data.

With this enhancement, administrators can now define both the data type and the input format for each attribute. Supported data types include Text, Options, Boolean, Integer, and Decimal. Based on the selected type and whether the attribute is multi-valued, the system dynamically offers relevant input formats such as:

- Text Input / Number Input – for text, integer, or decimal values
- Dropdown / Radio Group – for single-value options
- Multi-Select Dropdown / Checkbox Group – for multi-value options
- Checkbox / Toggle – for boolean values

This capability brings greater control and usability to attribute configuration, ensuring the attribute management UI aligns better with the actual semantics of stored data. It enhances data integrity, improves the user experience, and simplifies form interactions across the product.

Documentation: https://is.docs.wso2.com/en/next/guides/users/attributes/manage-attributes/ 

### Workflow approval for user operations

Workflow approvals are supported for adding users, deleting users, creating roles, and updating users of a role. Workflows can include multiple approval steps, and approvers can be assigned either by individual users or by roles.

Administrators can configure these workflows through the Admin Console, while end-users can participate in the approval process directly from My Account. This feature provides greater flexibility and governance over critical identity management operations.

Documentation: `<>`

### Provide email verification support via OTP when onboarding users

When creating a user through the SCIM API, the verifyEmail=true claim can be used to trigger email verification. A new configuration option allows email verification to be sent as an OTP instead of a link, if required.

Documentation: `<>`

### Provide SMS OTP and Email OTP support for the user invite flow

Administrators can initiate the onboarding process for end users. Previously, onboarding began with an email link. With this feature, it can now start using either an email OTP or an SMS OTP.

The OTP can serve as a temporary password and be submitted with the username on the login page, after which the user is redirected to the onboarding flow.

Documentation: `<>`

### New Application Templates for React and Next.js

WSO2 Identity Server now provides ready-to-use templates for React and Next.js applications. These templates simplify application onboarding by offering pre-configured authentication and authorization settings, reducing the need for manual configuration.

Documentation:
https://is.docs.wso2.com/en/next/guides/applications/register-nextjs-app/
https://is.docs.wso2.com/en/next/guides/applications/register-react-app/

### Pre Update Profile action (service extension)

Identity Server now supports configuring a Pre update profile action to verify user attributes during profile update processes. This action helps you automate verification of updated data, save changes, or send notifications to updated contact details.

The following profile update flows trigger this action:
- Self-Service Profile Update: When an end-user modifies their profile through a self-service portal like the My Account application.
- Administrator-Initiated Profile Update: When an administrator updates a user's profile through a user management portal, such as the Console application.

Also the action can be conditionally triggered based on configurable rule criteria depending on the flow and the updating attributes.

Documentation: https://is.docs.wso2.com/en/next/guides/service-extensions/pre-flow-extensions/pre-update-profile-action/

### Support configuring actions (service extensions) at sub organization level

Identity Server now supports configuring actions (service extensions) in sub organizations providing greater flexibility for B2B reseller scenarios.

Supported actions,
- Pre update password: Lets you check a password during password update flows.
- Pre update profile: Lets you verify user attributes during profile update processes.

Documentation:
https://is.docs.wso2.com/en/next/guides/organization-management/service-extensions/service-extensions/

### Webhook Event Publishing

Identity Server now supports publishing key identity events to external systems through webhooks. Administrators can configure endpoints and choose which event types (such as login, registration, credential updates, token activity, session activity, or account management) should be delivered.

Payloads include contextual properties (for example initiatorType, action, and credentialType) to help downstream systems process events accurately.

This capability enables real-time integrations, improves automation, and allows organizations to build event-driven extensions on top of Identity Server while keeping configurations simple.

Documentation: https://is.docs.wso2.com/en/next/guides/webhooks/understanding-webhooks/

### AI Agent Identity Management (Experimental)

Identity Server now delivers first-class identity management designed specifically for AI agents, enabling organizations to manage AI agents securely and at scale. Each AI agent receives a unique, distinguishable identity with specific attributes, credentials, and metadata, allowing auditing, management, and lifecycle control while treating each agent as a trusted entity within the organization.

This feature provides comprehensive credential management with multiple authentication methods, role-based access control (RBAC) to ensure agents operate with minimum necessary permissions, while enabling organizations to log and monitor agent activities. Organizations can now support regulatory compliance, conduct forensic investigations, and detect unusual behavior while reducing security risks and enforcing strict access boundaries for their AI agents

Documentation: https://is.docs.wso2.com/en/next/guides/agentic-ai/ai-agents/

### Support for End-to-End Authorization between MCP servers and MCP clients

WSO2 Identity Server introduces key improvements for supporting authorization for MCP (Model Context Protocol) servers. MCP clients can be registered as applications using the preconfigured application template that follows the recommended identity configurations defined in the MCP specification. In addition, MCP servers can also be registered and their tools and resources managed as protected resources. Developers can define scopes for tools and resources in the registered MCP servers, authorize MCP client applications to access them, and apply fine-grained access control. These capabilities streamline MCP integrations in organizations, ensuring consistent authorization rules, and making sure that only the right applications and actors have access to the MCP servers.

Documentation:

MCP Clients:https://is.docs.wso2.com/en/next/guides/applications/register-mcp-client-app/
MCP Servers: https://is.docs.wso2.com/en/next/guides/authorization/mcp-server-authorization/

## Improvements

### Demonstrating Proof of Possession (DPoP)

Demonstrating Proof of Possession (DPoP) [RFC 9449](https://datatracker.ietf.org/doc/rfc9449/) defines a binding mechanism that ties an access token to the client’s private key. To prove possession of the key, the client includes a signed DPoP proof in the DPoP header of each request. This ensures that only the legitimate client holding the corresponding private key can use the access token. DPoP enhances security by preventing token misuse and replay attacks, making it a robust solution for securing access tokens across all OAuth 2.0 grant types.
Prior to IS 7.2.0, DPoP was supported only through a connector. Starting from IS 7.2.0, DPoP can be configured out-of-the-box.

Documentation: https://is.docs.wso2.com/en/next/references/token-binding/dpop/

### Unicode Character Support for User Attributes

- WSO2 Identity Server now supports Unicode characters for user attributes out of the box. With this improvement, user attributes such as names, addresses, and custom claims can seamlessly include characters from multiple languages.

- Prior to IS 7.2.0, Unicode support was not available out-of-the-box for MySQL and MS SQL. Starting from this release, Unicode is supported across all supported database types.


Documentation: 
- MSSQL https://is.docs.wso2.com/en/next/deploy/configure/databases/carbon-database/change-to-mssql/
- MYSQL https://github.com/wso2-enterprise/iam-product-management/issues/535 

### Operation-wise access control in SCIM bulk API

- The SCIM2 bulk API previously required the internal_bulk_resource_create scope to authorize operations on the endpoint. Starting with Identity Server 7.2, the bulk endpoint supports operation-wise scopes, meaning each operation in a bulk request can be executed only if the corresponding operation-specific scope is available.

- For backward compatibility, the internal_bulk_resource_create scope is still supported and allows performing any operation through the bulk endpoint.

Documentation: https://is.docs.wso2.com/en/next/apis/scim2/scim2-batch-operations/#scopepermission-required-for-batch-operations

### Support engaging pre update password extension at user registration when user onboards a password

Identity server now supports executing pre update password action in user registration flows. This allows the organizations to engage custom password validation in all the password set/ update flows in the Identity Server covering all user password update flows.

Documentation: https://is.docs.wso2.com/en/next/guides/organization-management/service-extensions/service-extensions/

### Support configuring specific headers and parameters to be shared with pre issue access token and custom authentication actions

In extension points such as Pre-Issue Access Token and Custom Authentication actions, it is common to rely on additional headers and parameters from the request flow. However, allowing unrestricted access to all headers and parameters poses security risks, as they may contain sensitive information, personally identifiable data (PII), or internal infrastructure details.

With this release, extension developers can now explicitly select which headers and parameters should be shared with the extension, in addition to the safeguards already applied at the server level. This ensures extensions get the required data while maintaining strong security controls.

Documentation: `<>`

### Enhanced Organization Search in Console with Nested Hierarchy Support

We’ve introduced a nested-level organization search option in the Console.
Previously, searches were limited to immediate child organizations. With this enhancement, you can now search across the entire organization hierarchy, making it easier to locate and manage organizations at any depth.

Documentation: https://is.docs.wso2.com/en/next/guides/organization-management/manage-organizations/#search-an-organization

## Deprecated features

In WSO2 Identity Server 7.2.0, we have deprecated several features to enhance security, streamline operations, and improve overall usability. These deprecations align with our commitment to maintaining a robust and future-ready platform. Below is a list of deprecated features along with recommended actions for users. Learn more about [WSO2 Identity Server Feature Deprecation]({{base_path}}/references/wso2-identity-server-feature-deprecation/).

- Branding Display Name: The previously available branding display name has been deprecated and replaced by the new, user-friendly, editable root organization display name for improved consistency and customization.

- Sub-Organization ID as Tenant Domain: Previously, the sub-organization ID was used as the tenant domain (organization handle). Going forward, these will be two separate values. Please ensure to update any locations, such as URLs and query parameters in B2B applications, where the sub-organization ID was used as the tenant domain.

- Root Organization Tenant Domain as Name: Similarly, the root organization tenant domain was used as its display name before. Going forward, these will be separate values. The new token claim org_handle will contain the organization handle (tenant domain), and org_name will now contain the newly introduced display name.

- V2 Roles API
This release deprecates the SCIM 2.0 Roles V2 API. Use the latest SCIM 2.0 Roles V3 API for listing roles and updating users and groups of the roles.

## Fixed issues

For a complete list of issues fixed in this release, see [WSO2 IS 7.2.0 - Fixed Issues](https://github.com/wso2/product-is/issues?q=state%3Aclosed%20project%3Awso2%2F113){:target="_blank"}.

## Known issues

For a complete list of open issues related to the WSO2 Identity Server, see [WSO2 IS - Open Issues](https://github.com/wso2/product-is/issues){:target="_blank"}.
