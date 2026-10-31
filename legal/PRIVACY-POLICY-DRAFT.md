# Privacy Policy — DRAFT — OWNER REVIEW REQUIRED

> This is a source-informed working draft, not legal advice and not ready to publish. The site owner must fill every bracketed field, verify the actual production configuration and vendor terms, and obtain appropriate legal review before making it public.

**Last draft review:** 31 October 2026  
**Service:** FrameRate Studio  
**Operator:** [LEGAL NAME / BUSINESS NAME]  
**Contact:** [PRIVACY CONTACT EMAIL AND POSTAL ADDRESS]  
**Applicable jurisdiction:** [CONFIRM COUNTRY / REGION]

## 1. Information the service may process

Depending on the features a visitor chooses to use, FrameRate Studio may process:

- Account information, such as an email address and authentication identifiers, through Supabase Authentication. Google sign-in may also be offered when enabled in the Supabase project.
- Film records, ratings, reviews, watchlist entries, writing preferences, and settings that a visitor creates or imports.
- Imported Letterboxd ZIP/CSV files. The application processes the selected archive in the browser; account-scoped snapshots and the local library store are used for persistence.
- AI provider credentials. Guest credentials are stored in that browser's local storage. For signed-in accounts, saved provider credentials are sent to the credential-vault function and encrypted server-side before database storage. The browser does not receive the decrypted saved key in the normal status response.
- Technical request information processed by hosting, Supabase, AI providers, movie-data providers, video platforms, and other services needed to deliver a requested feature.

The application uses browser local storage and IndexedDB for local settings and library data. A limited, explicit list of account data/preferences is synchronized to the FrameRate Supabase project for signed-in users. Some derived Taste Lab caches and temporary recommendation state remain local to a browser profile.

## 2. When information is sent to other services

- **Supabase:** account authentication, account-scoped cloud synchronization, and encrypted credential-vault operations.
- **TMDB and Fanart.tv:** film searches, film details, and artwork are requested through the site's movie-data proxy when configured.
- **AI providers:** when a visitor explicitly requests AI-assisted writing or Taste Lab AI ranking, relevant prompts and selected film/review context are sent to the provider selected in the app. Taste Lab currently limits the ranking input to up to 12 review excerpts and up to 18 candidate film summaries. AI providers process requests under their own terms and privacy policies.
- **YouTube:** trailer playback is embedded from YouTube's privacy-enhanced host when a trailer is available. Opening YouTube links transfers the visitor to YouTube.
- **Letterboxd RSS relays:** the optional public RSS importer currently tries third-party CORS/RSS relay services. Those relay operators may receive the public feed URL and request metadata. Visitors who do not want to send a feed URL to those services should use the ZIP/CSV importer instead.
- **Other assets/services:** the pages load fonts and some browser libraries from third-party CDNs. The movie search code may also use the iTunes Search API as a fallback catalogue source.

The exact vendors, configuration, and terms must be rechecked by the operator before publication.

## 3. Local storage and cloud synchronization

Guest data is held in the browser profile where it was created. Clearing browser site data may remove locally stored information. Signed-in accounts synchronize only the explicit application data allow-list to the configured Supabase project. Taste Lab feedback, filters, and language preference are included in the account synchronization allow-list; derived caches and recommendation batches are not treated as the source of truth.

## 4. AI and API credentials

Do not enter a key unless you are authorized to use it. Guest-mode API keys remain in the browser profile and may be accessible to scripts running in that browser context. For signed-in users, saved provider credentials are stored through the server-side encrypted credential vault. The operator should keep the encryption key protected and backed up.

A request is sent to an AI provider only after the visitor activates an AI feature. The provider may process prompts under its own terms. The operator must publish the actual provider list and relevant links before launch.

## 5. Retention, access, correction and deletion

[OWNER: DEFINE RETENTION PERIODS, CLOUD ACCOUNT DELETION PROCESS, BACKUP RETENTION, AND HOW USERS CAN REQUEST ACCESS/CORRECTION/DELETION.]

The current application source does not expose a complete self-service account-deletion workflow. Do not promise automatic deletion until the operator implements and tests it. Browser-local data can be cleared by the visitor through the browser or application controls, but that does not by itself delete remote account data.

## 6. Security

The project uses Supabase row-level security for account data, a separate server-side credential vault, encryption for saved provider credentials, origin checks and request limits on its Edge Functions, and baseline response headers. These controls reduce risk but cannot guarantee absolute security. The operator should complete production security testing and maintain secret-management procedures.

## 7. Children and age-related requirements

[OWNER: STATE THE SERVICE'S AGE POLICY AND ANY PARENTAL-CONSENT REQUIREMENTS AFTER LEGAL REVIEW.]

## 8. Changes and contact

The operator may update this policy as the service changes. The public policy must display an effective date and a working contact address.

**Before publishing:** replace all bracketed fields, verify every vendor and data flow, confirm the active Cloudflare/Supabase settings, and obtain legal review for the countries where the service is offered.
