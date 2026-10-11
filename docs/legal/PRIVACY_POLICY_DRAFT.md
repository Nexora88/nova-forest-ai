# NexoraWildfire AI — Gizlilik Politikası (Taslak)

> **DRAFT — NOT READY FOR PUBLICATION.** This is a working draft, not a legal-compliance certification. The privacy contact, hosting/subprocessor details, retention periods, and actual production data flows have not yet been verified. Obtain a review from a qualified privacy professional before publication.

**Draft version:** 0.1  
**Prepared:** 11 October 2026  
**Project:** NexoraWildfire AI  
**Project owner / proposed data controller:** Ahmet Eymen Bakraç (individual project owner)  
**Country:** Türkiye  
**Public address:** Not verified; intentionally omitted.  
**Privacy email / contact channel:** Not provided yet; must be added before publication.

## 1. About this policy

NexoraWildfire AI is an experimental web application in development for map-based environmental observations, wildfire awareness, agriculture, land monitoring, and beekeeping-related workflows. Data processing depends on which features are enabled in a given release. This draft must be checked against the production application before it is published.

## 2. Information that may be processed

Depending on enabled features, the service may process:

- **Account information:** user ID, username, and information maintained by the authentication provider.
- **User content and preferences:** saved areas, coordinates or locations entered by the user, language, and app preferences.
- **Push-notification data:** a browser push subscription endpoint and technical keys if the user enables web notifications.
- **Usage and security events:** feature-use events, timestamps, and technical diagnostics or error information.
- **Support messages:** information a user chooses to include when using a support or feedback channel, if one is made available.

Saved coordinates can reveal sensitive location details. The service should request only data needed for its stated features and should not encourage users to submit unnecessary personal or sensitive information. The actual categories must be confirmed by reviewing production requests, database records, and logs.

## 3. Purposes

Data may be processed, where necessary for enabled features, to authenticate users, maintain account security, sync user-saved areas and preferences, deliver notifications requested by the user, diagnose errors, protect the service, answer user-initiated support requests, and comply with applicable legal obligations.

Data should not be repurposed for unrelated advertising or profiling. If purposes change, the policy and relevant notices must be updated.

## 4. Legal basis

The legal basis must be assessed for each purpose and data category under applicable law, including Türkiye's Personal Data Protection Law No. 6698 (KVKK). Contract necessity, legal obligation, legitimate rights-related grounds, or valid consent should be relied upon only where the specific processing actually meets the relevant legal requirements. This draft does not claim that one legal basis applies to all processing.

Where consent is required, it should be specific, informed, freely given, and separate from the privacy notice. Optional processing should not be bundled with essential service terms.

## 5. Service providers and international transfers

Depending on the live configuration, data may be processed by authentication/database hosting, application hosting, push-notification infrastructure, or environmental-data providers requested by the user. The exact providers, data-center regions, subprocessors, and possible international transfers have not yet been verified.

Before publication, review the deployed configuration and provider contracts. Any transfer outside Türkiye must be assessed against the applicable KVKK requirements and safeguards. Secret API keys and privileged service credentials must never be exposed in public client code.

## 6. Retention and deletion

Data should be retained only as long as necessary for its purpose and applicable legal obligations. Separate retention periods and deletion procedures should be established for account data, saved areas, push subscriptions, and technical events.

**Retention periods are not yet verified.** Before publication, document the period and deletion method for each category, including account deletion, backups, and copies held by service providers.

## 7. Your rights and contact

Depending on the circumstances, people may have rights under applicable data-protection law, including access, correction, deletion where legally available, information about processing and recipients, objection to certain processing, and other statutory remedies.

A working privacy contact has not been supplied. This draft therefore does not yet provide a usable contact channel for privacy requests. A monitored email address or equivalent reliable process must be added and tested before publication.

## 8. Children and young users

If the service is available to young users, age-appropriate notices and any required parent/guardian processes should be assessed for account creation, saved locations, notifications, and other data processing. This draft does not itself implement age verification or guardian consent.

## 9. Security

The project should apply data minimization, least-privilege access controls, secure authentication, properly configured database access policies, server-side secret management, privacy-aware logging, and incident handling. The implementation must be tested; this statement is not proof that every control is already effective.

## 10. Changes

This policy should be revised when the application, data flows, providers, purposes, legal bases, or retention practices change. Do not publish this draft as final until the outstanding verification items below are complete.

### Publication checklist

- [ ] Confirm the data controller's legal status and public identification details.
- [ ] Verify all providers, subprocessors, hosting regions, and international transfers.
- [ ] Audit actual production data flows and data categories.
- [ ] Determine the legal basis for each processing purpose.
- [ ] Set and implement retention/deletion periods.
- [ ] Add and test a monitored privacy contact channel.
- [ ] Review registration notices and separate consent flows with a qualified privacy professional.
- [ ] Align this English version with the Turkish version.
