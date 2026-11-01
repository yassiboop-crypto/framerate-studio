# Privacy Notice — Working Draft (Owner and Legal Review Required)

> **DRAFT — NOT READY TO PUBLISH.** This notice is a source-informed drafting document, not legal advice. The Operator must complete every bracketed field, verify production settings and vendor contracts, establish the data-rights and deletion processes described below, and obtain legal review for the countries in which FrameRate Studio is offered.

**Service:** FrameRate Studio  
**Public website:** https://framerate-studio.ybenlahcen7.workers.dev/  
**Individual Operator (personal, non-commercial project):** [IDENTITY REQUIRED BY APPLICABLE LAW — CONFIRM BEFORE PUBLICATION]  
**Privacy contact:** [WORKING PRIVACY EMAIL]  
**Postal address:** [PUBLIC PRIVACY CONTACT DETAILS REQUIRED BY LAW — DO NOT PUBLISH A PRIVATE HOME ADDRESS WITHOUT ADVICE]  
**Applicable jurisdiction(s):** [CONFIRM WITH LEGAL COUNSEL]  
**Effective date:** [DATE OF PUBLICATION]  
**Last source review:** 1 November 2026

## 1. Who is responsible for your information?

FrameRate Studio is maintained by an individual as a personal, non-commercial hobby project. It is not operated by a company, institution or registered association. The individual who operates the service is referred to in this notice as the “Operator”. This does not remove the need to check whether data-protection laws apply to the service. Before publication, confirm what identifying details and contact method must legally be disclosed; do not publish a private home address without appropriate advice.

FrameRate Studio is a film-discovery and personal cinema workspace. It includes film search and details, ratings and reviews, a watchlist, Letterboxd import tools, Taste Lab recommendations, optional AI-assisted writing and ranking, and shareable review cards.

## 2. Information that may be processed

The information depends on whether you use Guest Mode, create an account, import a library, or activate optional features.

### Account and sign-in information

When you create or use an account, the authentication service may process your email address, account identifier, authentication provider, sign-in/session information and related security metadata. Email/password authentication and Google sign-in are implemented through Supabase Authentication; Google information is involved only when that sign-in option is enabled and used. Authentication credentials are handled through the authentication service.

### Film activity and content you create

Depending on the features you use, FrameRate may store or process:
- film titles, years, catalogue identifiers, poster/artwork references and other selected film information;
- ratings, likes, watchlist items and watchlist status;
- reviews, review drafts, diary-related entries, tags and rewatch information imported from a Letterboxd export;
- Writing DNA preferences, workspace drafts and other writing preferences;
- Taste Lab feedback, filters, language preference and recommendation-related settings.

Your review text and library are not a public social feed in the current application. You may choose to export, copy, download or share material yourself, or open an external service such as Letterboxd.

### Imported files

The Letterboxd ZIP/CSV importer currently reads the selected file in your browser. The original ZIP/CSV archive is not intentionally uploaded as a file to the FrameRate server by that importer. Parsed film records may be kept in browser storage. For signed-in accounts, a compact library snapshot is also included in the account-sync data; the complete imported library is stored in the browser's IndexedDB.

### Preferences and technical information

The application stores interface preferences such as theme, language and cursor style, as well as selected AI provider/model and some local recommendation caches. The movie-data proxy reads a request IP address for rate limiting and uses a hashed rate-limit identifier for its database lookup. Hosting, authentication, database, CDN and API providers may separately process IP addresses, device/browser information, request headers, timestamps and service logs for security, operation and troubleshooting.

### AI-provider credentials

FrameRate supports user-supplied API credentials for Gemini, Groq, OpenAI and OpenRouter.

- In Guest Mode, AI provider keys are stored in the browser's local storage and do not sync to another device.
- For signed-in users who choose to save a key to the cloud vault, the current implementation encrypts the key server-side using AES-GCM before storing it in a separate credential table. The key is decrypted in server memory when needed to contact the selected provider. The normal account-sync payload and credential-status response do not contain the raw saved key.
- Legacy or optional TMDB/Fanart.tv browser keys may remain in local browser storage when configured through older or fallback settings.

Do not enter a key unless you own it or are authorised to use it. Browser-local keys may be accessible to scripts running in that browser context. Never paste private keys into reviews, public posts or support messages.

## 3. Why information is used

The Operator may use information, as necessary, to:
- authenticate users and maintain account sessions;
- save and synchronise a user's own reviews, watchlist, writing preferences and other selected application data;
- import, parse, display and search film-library records;
- provide film search, metadata, artwork and trailer-related features;
- generate AI-assisted writing or Taste Lab rankings when the user actively requests those features;
- save, display, update or delete AI credentials through the credential vault;
- enforce rate limits, protect the service, investigate errors and prevent misuse;
- respond to privacy, support, security or legal requests; and
- comply with legal obligations.

The Operator must not use personal information for a materially different purpose without first providing any notice and obtaining any consent or regulatory authorisation required by applicable law.

## 4. Browser storage and account synchronisation

### Guest Mode

Guest data is stored in the browser profile where it was created, using browser storage including localStorage and IndexedDB. It is not automatically available on another device. Clearing browser site data, using a different browser/profile or resetting the browser may remove Guest Mode data. The complete Letterboxd library is stored locally in an IndexedDB database named for the FrameRate library.

### Signed-in accounts

For signed-in users, the application synchronises an explicit set of account data to the configured Supabase project. This includes selected preferences and the user's saved reviews, imported-library snapshot, watchlist, workspace draft, Writing DNA and Taste Lab feedback/settings. The current code applies account-scoped access controls to the cloud-sync table.

The complete imported Letterboxd archive remains in the browser's IndexedDB; the account-sync payload contains a compact snapshot, currently limited to the first 3,000 parsed records. Derived Taste Lab caches and temporary recommendation state are generally kept locally rather than treated as the cloud source of truth.

Signing out does **not** delete the cloud copy. Clearing browser storage does **not** delete cloud account data. Clearing the local Letterboxd library only clears the local archive for the active browser/account scope.

### AI credential vault

Saved signed-in AI credentials are stored separately from normal account data. The current server function encrypts them with AES-GCM before database storage and decrypts them only when a request needs to contact the selected AI provider. Users can remove an individual saved provider key from the Vault. This is not the same as deleting the user's full FrameRate account or all synced content.

## 5. When information is sent to third parties

FrameRate relies on external services to operate. The exact configuration, destination country, retention terms and current vendor list must be verified by the Operator before publication.

| Provider or service | When it is involved | Information that may be received |
| --- | --- | --- |
| **Supabase** | Account authentication, account-scoped cloud sync, database and Edge Functions | Account identifiers, email/authentication information, synced application content, credential-vault records and request/security metadata |
| **Cloudflare** | Hosting the public Worker and related infrastructure | IP address, request data, browser/device and operational metadata, and service logs according to the deployed configuration |
| **TMDB** | Film search, discovery and film details through the movie-data proxy | Film search terms, film/catalogue identifiers and request metadata |
| **Fanart.tv** | Artwork lookup when the feature and provider are configured | Film/catalogue identifiers and request metadata; any browser-held legacy key is sent only when the corresponding direct/fallback request is used |
| **Selected AI provider: Google Gemini, Groq, OpenAI or OpenRouter** | Only when the user activates AI writing, model discovery or Taste Lab AI ranking | The prompt and relevant selected film, review or preference context needed for that request. Taste Lab's current ranking flow can send up to 12 review excerpts and up to 18 candidate-film summaries. The selected provider processes the request under its own terms and privacy documentation |
| **Letterboxd and third-party RSS/CORS relays** | When the optional public Letterboxd RSS sync is used | The public RSS feed URL, which contains the entered Letterboxd username, and request metadata. The current importer may try CORS.dev, AllOrigins, RSS2JSON and CodeTabs relays; more than one relay may receive a request while the importer waits for the first usable response |
| **YouTube** | When an available trailer is played or a YouTube link is opened | Video request, browser/network information and interaction with the YouTube service. Embedded playback uses YouTube's privacy-enhanced host where available |
| **Apple iTunes Search API** | As a fallback catalogue source in the movie-search workflow | Search terms and request metadata |
| **External assets and libraries** | When pages load fonts or browser libraries from third-party CDNs | IP address, browser request information and the requested asset URL. The current pages load resources including Google Fonts, Tailwind CSS, JSZip and the Supabase JavaScript client from external services |

A provider may process data on servers outside your country and may have its own retention, security, training, subprocessors and disclosure practices. Review the applicable provider's current terms and privacy notice before using that feature. The Operator must publish a verified vendor list and links to the applicable provider documents here before launch: [INSERT VERIFIED VENDOR POLICY / DPA LINKS].

The RSS feature reads a public Letterboxd RSS feed through external relays. Use the ZIP/CSV importer instead if you do not want to send the feed URL to those relay services.

## 6. International processing and transfers

The Operator must identify where the Supabase project, Cloudflare service, AI providers, data stores, backups, support systems and other processors actually process or store information. Do not assume that information remains in the country where the user is located.

**Morocco-specific launch check:** FrameRate is described by its creator as an individual, non-commercial hobby project, not a company or association. That fact alone does not determine whether Moroccan Law No. 09-08 applies. The law contains an exception for processing by a natural person for exclusively personal or domestic activities; whether a public website that accepts accounts and processes other users’ information fits that exception needs a case-specific legal assessment. If the law applies, the Operator must determine the applicable CNDP filing/authorisation requirements before processing begins. Hosting or transferring personal information outside Morocco may require a separate transfer procedure and approval. The CNDP's official guidance explains the relevant website-processing and foreign-transfer procedures:
- https://www.cndp.ma/conditions/
- https://www.cndp.ma/conformite-des-sites-web/
- https://www.cndp.ma/transfert-de-donnees-a-letranger/
- https://www.cndp.ma/textes-et-lois/

These requirements cannot be satisfied merely by adding a paragraph to this notice. The Operator must obtain jurisdiction-specific advice and complete any required CNDP formalities before public operation.

**Countries/regions used by the actual production configuration:** [LIST AFTER CHECKING CLOUDFLARE, SUPABASE PROJECT REGION, AI PROVIDERS, BACKUPS AND OTHER VENDORS].  
**Transfer mechanism / CNDP reference, where required:** [COMPLETE ONLY AFTER LEGAL AND REGULATORY REVIEW].

## 7. Retention

The Operator must define and implement retention periods before publication.

- Browser-local data remains in the browser until the user clears it, removes the relevant data through an application control, or the browser removes it.
- Synced account data and saved credential records may remain in the Supabase project until deleted by the Operator under an established account-closure or data-request procedure.
- Third-party providers retain request information under their own policies and contracts.
- Backups, security logs and rate-limit records may have separate retention periods that must be documented by the Operator.

**Retention schedule:** [SPECIFY PERIODS FOR AUTHENTICATION RECORDS, ACCOUNT DATA, SAVED CREDENTIALS, SECURITY LOGS, BACKUPS, SUPPORT REQUESTS AND DELETION QUEUES].

The current application does not provide a complete self-service account-deletion workflow. Do not state that account deletion is automatic or immediate until the Operator has implemented, tested and documented deletion of the authentication account, cloud-sync row, saved credential rows, relevant logs and backup copies where applicable.

## 8. Your privacy rights and requests

Depending on the law that applies, you may have rights to request access to, correction of, objection to or deletion of personal information, or to withdraw consent where processing is based on consent.

To make a request, contact **[PRIVACY EMAIL]** and include enough information for the Operator to identify the relevant account without sending a password or API key. The Operator must verify the requester's identity, respond within the time required by applicable law, and explain any lawful reason why a request cannot be fully completed.

The Operator must establish a working process for access, correction, objection, consent withdrawal, account closure and deletion before this notice is published. Signing out or clearing browser storage is not a substitute for a cloud-data deletion request.

## 9. Security

The current source includes account-scoped cloud data, Supabase row-level security, a separate server-side credential vault that encrypts saved AI keys with AES-GCM, origin checks and rate limiting on Edge Functions, and baseline response headers. These are security measures, not a guarantee that a service or transmission is risk-free.

The Operator must keep production secrets protected, restrict administrative access, maintain encryption-key backups and rotation procedures, monitor service logs, patch dependencies, test access controls and maintain an incident-response process. Do not send passwords, private API keys or full payment details to support.

## 10. Children and age policy

**Minimum age and parental-consent rule:** [SET THE MINIMUM AGE AND ANY PARENT/GUARDIAN AUTHORISATION REQUIREMENTS AFTER REVIEW OF THE LAWS IN EACH TARGET MARKET].

Do not publish this notice or open public registration until the Operator has selected an age policy, implemented an appropriate sign-up process, and established a process for handling information collected from a child contrary to that policy. Do not claim that parental consent is collected or verified unless the product actually implements it.

## 11. Cookies and similar technologies

The reviewed application uses localStorage and IndexedDB for app preferences, account-scoped data and local libraries. It also loads third-party scripts, styles, fonts and embedded media. The Operator must inspect the final production deployment and each vendor's behaviour to determine whether cookies, pixels or other device-storage technologies are set, and whether a consent banner or preference control is legally required.

**Final production cookie / tracker inventory:** [COMPLETE AFTER A BROWSER NETWORK AND STORAGE AUDIT].

## 12. Changes to this notice

The Operator may update this notice when the service, providers or legal requirements change. The public version must show an effective date. Material changes must be communicated in the manner required by applicable law.

## 13. Contact and complaints

**Privacy contact:** [PRIVACY EMAIL]  
**Individual Operator:** [IDENTITY REQUIRED BY APPLICABLE LAW — CONFIRM BEFORE PUBLICATION]  
**Postal contact, if legally required:** [CONFIRM THE ACCEPTABLE PUBLIC CONTACT METHOD; DO NOT PUBLISH A PRIVATE HOME ADDRESS WITHOUT ADVICE]  
**Applicable regulator / complaint route:** [INSERT THE CORRECT REGULATOR AND PROCESS AFTER JURISDICTIONAL REVIEW].

For a Morocco-related enquiry, consult the official CNDP website at https://www.cndp.ma/.

---

## Publication blockers — do not remove this section until each item is completed

1. Confirm the individual Operator's legally required public identity/contact details, privacy email, effective date and applicable jurisdictions. No company or association details should be invented. Do not publish a private home address without advice.
2. Verify the live Cloudflare Worker configuration, Supabase project region, Edge Function secrets, authentication providers, database, backups and logs.
3. Confirm the actual list of AI, movie-data, hosting, CDN, RSS relay and media providers, their current privacy/DPA terms, and processing countries.
4. Obtain legal advice on applicable data-protection law and complete any required CNDP or other regulator notification/authorisation and international-transfer procedure.
5. Define retention periods and implement/test a full account-data deletion and rights-request workflow. The current app does not provide full self-service account deletion.
6. Decide and enforce the age/parental-consent policy.
7. Audit cookies, local storage, third-party scripts and embedded media in the live production browser.
8. Add a visible privacy-notice link at the point of account registration and in the site's footer, and ensure the displayed notice matches the final deployed behaviour.
9. Obtain legal review and record approval by the responsible Operator before publication.