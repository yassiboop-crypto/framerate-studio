# FrameRate Studio — Legal Publication Checklist

**Status:** Internal working checklist — not a public policy  
**Reviewed against source:** 1 November 2026  
**Scope:** Privacy Notice and Terms of Service drafts in this folder

This checklist separates items confirmed in the current application source from decisions and operational controls that the Operator must still supply. It is not legal advice or proof of regulatory compliance.

## A. Confirmed in the source reviewed

- Account sign-in is implemented through Supabase Authentication using email/password and a Google sign-in option (subject to live Supabase configuration).
- Guest Mode exists. Browser data is scoped separately from signed-in account data.
- The account-sync allow-list includes theme/language/cursor preferences, selected AI provider/model, Writing DNA, saved reviews, a compact Letterboxd library snapshot, watchlist and status, workspace draft, Taste Lab feedback, filters and language.
- The full Letterboxd ZIP/CSV archive is parsed in the browser and stored in IndexedDB. A compact version is also written to account-sync storage for signed-in users.
- Guest AI provider keys remain in browser localStorage.
- Signed-in AI provider keys for Gemini, Groq, OpenAI and OpenRouter can be saved through a separate server-side credential vault. The Edge Function encrypts keys with AES-GCM before database storage and decrypts them when calling the selected provider.
- TMDB film metadata is requested through the Supabase movie-data proxy. Fanart.tv is part of the configured artwork path; legacy direct/browser key handling remains in the source and must be tested against the production configuration.
- Optional AI requests send relevant prompt and selected film/review context to the provider chosen in the app. Taste Lab's current ranking flow can include up to 12 review excerpts and up to 18 candidate-film summaries.
- Optional Letterboxd RSS sync may contact CORS.dev, AllOrigins, RSS2JSON and CodeTabs relays using a public RSS feed URL. More than one relay may receive the request while the application waits for the first usable response.
- YouTube trailer playback uses the privacy-enhanced YouTube embed host when available.
- The pages load third-party assets such as Google Fonts, Tailwind CSS, JSZip and the Supabase JavaScript client.
- The movie-data proxy reads an IP address for rate limiting and stores a hash-derived rate-limit identifier in its database lookup.
- The current application does not expose complete self-service account deletion or a cloud-data deletion workflow.
- The current sign-up UI reviewed for these drafts does not display a Terms acceptance checkbox or visible Privacy Notice / Terms links.
- The reviewed application source does not show an in-app subscription checkout or payment processor. Confirm this against the actual production environment before making a pricing statement.

## B. Operator decisions required

- [ ] Identity of the individual Operator responsible for this personal, non-commercial project (confirm what must be public). No company or association is currently identified.
- [ ] Where the individual Operator is established and which target countries are intended.
- [ ] Countries in which the Service will be offered and users targeted.
- [ ] Working privacy email, support email and postal/legal address.
- [ ] Governing law, dispute forum and applicable consumer-rights wording.
- [ ] Minimum age, parental-consent rule (if any), and how eligibility is actually checked.
- [ ] Confirm whether users pay anything, whether donations/sponsorships exist, and whether shared API quotas or other limits apply. Do not infer the price model solely from the project's non-commercial purpose.
- [ ] Data retention periods for account data, AI credentials, security logs, backups and support records.
- [ ] Actual account closure and data deletion request procedure, including backup handling and completion time.
- [ ] Actual cookie/tracker inventory from the deployed production environment.
- [ ] Whether users' reviews or imported library material may ever be used for anything beyond providing the feature they requested. No broader use should be claimed or introduced without legal review and appropriate notice/consent.

## C. Technical and vendor verification

- [ ] Confirm the live Cloudflare Worker account, deployment settings, domains, request logs and retention.
- [ ] Confirm the Supabase project region, enabled Auth providers, email delivery provider, database region, backups, Edge Function logs and retention.
- [ ] Confirm all deployed Edge Function secrets and which third-party systems receive requests.
- [ ] Record the current AI providers (Gemini, Groq, OpenAI, OpenRouter), their applicable API privacy terms, retention and data-use options.
- [ ] Record TMDB and Fanart.tv API terms, attribution requirements and any stored metadata/cache behaviour.
- [ ] Record YouTube embed behaviour and any browser data received by YouTube.
- [ ] Confirm the RSS relay list and decide whether to keep it, replace it with a first-party proxy, or remove RSS sync. If retained, keep the on-screen disclosure.
- [ ] Record third-party CDN/library/font providers and determine whether consent or additional notice is required.
- [ ] Review any current server, provider or browser logs for accidental storage of prompts, raw API keys, request bodies or unnecessary identifiers.

## D. Morocco-specific legal review

If Moroccan Law No. 09-08 may apply to the individual Operator or the processing:

- [ ] Ask qualified Moroccan counsel or the CNDP whether the personal/domestic-activity exception applies to this public, non-commercial website, and if not, which prior declaration or authorisation applies to each processing purpose.
- [ ] Identify every foreign hosting, storage and provider destination, including Cloudflare, Supabase and selected AI vendors.
- [ ] Complete any required prior foreign-transfer procedure and obtain the necessary CNDP approval before the transfer begins.
- [ ] Review the applicable rights, notices, consent, processor contracts, retention and security requirements.
- [ ] Keep copies of CNDP receipts, authorisations, transfer approvals and processor agreements.

Official starting points:
- CNDP legislation: https://www.cndp.ma/textes-et-lois/
- CNDP obligations: https://www.cndp.ma/conditions/
- Website compliance: https://www.cndp.ma/conformite-des-sites-web/
- Foreign transfers: https://www.cndp.ma/transfert-de-donnees-a-letranger/

## E. Product work required before public legal launch

- [ ] Add Privacy Notice and Terms links to the main footer and Taste Lab footer.
- [ ] Add clear notice and the required Terms acceptance action to the account sign-up flow. Store only the minimum evidence needed to demonstrate acceptance.
- [ ] Provide a working privacy/support contact.
- [ ] Build and test a complete account deletion request workflow covering Supabase Auth, account-sync records, saved credential rows and relevant backups/logs.
- [ ] Provide access/correction/deletion request handling and a documented identity-verification process.
- [ ] Define how a user can export their own saved data and what happens to browser-local IndexedDB data when they change accounts or close an account.
- [ ] Set and enforce age eligibility and parental authorisation where required.
- [ ] Perform a final browser Network / Storage audit on the Cloudflare production domain, including PC and mobile.
- [ ] Obtain legal approval and replace all draft markers before linking these documents publicly.

## F. Release rule

**Do not merge or deploy a public legal-policy release while bracketed fields remain, while the account-deletion process is not operational, or before the Operator has completed the required jurisdictional and cross-border-transfer review.** These documents are being kept as internal drafts and are not linked from the public app in this change.