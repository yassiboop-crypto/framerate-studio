# FrameRate Studio — Source Audit & Hardening Notes

**Reviewed source:** GitHub main at 1bf8a18 (31 October 2026)  
**Hardening branch:** chore/production-hardening-2026-10  
**Validated PR head:** `e138f0280a67b1cd568d1bddeba24c8ec0e9cb90`  
**Scope:** source code, account/data flow, Supabase SQL/functions, page assets, and deployment documentation.

## Changes in this hardening branch

- Taste Lab feedback, filter preferences and Taste Lab language are now included in the account-scoped cloud-sync allow-list. Feedback records merge by film title/year and latest updatedAt, so a more recent feedback action can replace an older action when devices sync.
- Taste Lab and Studio AI no longer silently send prompts/review excerpts to a different provider when the selected provider fails. Local review generation remains the Studio fallback; Taste Lab preserves its deterministic local ranking and reports the selected-provider failure.
- A shared modal focus helper traps keyboard focus inside open dialogs and restores focus to the opener when possible. It is loaded on both Studio and Taste Lab pages.
- The optional Letterboxd RSS importer now discloses that it uses third-party CORS/RSS relays and that those services may see the public feed URL and request metadata.
- Added an SVG favicon and made the Studio home logo a real keyboard-operable button.
- Added dependency-free Node syntax/project checks, regression tests, and a GitHub Actions workflow. The workflow also type-checks both Supabase Edge Functions with Deno.
- Updated the repository landing README and Cloudflare-first deployment guidance. Added owner-reviewed privacy and terms drafts plus a security reporting template.

## Architecture and controls observed in the reviewed source

- Static HTML/CSS/JavaScript frontend; Supabase Authentication and account-scoped cloud data.
- framerate_user_data applies RLS policies tied to auth.uid().
- AI provider credentials use a separate server-side credential vault and AES-GCM encryption; the browser payload allow-list excludes raw provider keys.
- The movie proxy applies an origin allow-list, input validation, upstream timeouts, caching, and a database-backed rate limiter.
- Letterboxd imports use browser storage/IndexedDB; not every derived Taste Lab cache or temporary discovery batch is cloud-synced.

## Remaining work before a public launch

1. **CI passed on the reviewed PR head:** GitHub Actions completed the JavaScript syntax checks, all 10 regression/contract tests, and Deno type-checking for both Supabase Edge Functions. Re-run the workflow for any later source changes.
2. **Verify the live Cloudflare Worker settings:** the repository does not include a Wrangler configuration, so the Worker entry point/assets binding/name must be confirmed in Cloudflare before changing deploy configuration.
3. **Security Content Policy:** no strict Content-Security-Policy was added. The current pages use inline scripts/handlers and several third-party script, font, image, video and API origins. A strict CSP should follow a deliberate migration to external scripts/handlers and a measured origin inventory, then be tested in report-only mode before enforcement.
4. **Complete the HTML/data-sink review:** multiple innerHTML sites remain. The reviewed sample uses escaping or fixed SVG/markup in many places, but this branch does not claim an exhaustive XSS audit.
5. **Review RSS relay providers:** the new disclosure improves transparency but does not remove third-party relay dependencies. A first-party proxy would reduce exposure.
6. **Finalize legal documents:** drafts are intentionally not linked from the public UI. The owner must fill in contact details, jurisdiction, age policy, retention/deletion process, vendor list and effective dates, then obtain legal review.
7. **Live verification:** test account creation/sign-in/sign-out, two-account isolation, cloud sync across devices, API Vault save/status/delete, AI provider routing, movie search/details/artwork, RSS and ZIP import, watchlist persistence, trailer playback, desktop/mobile layout and keyboard navigation.

## Validation boundary

Static code checks, 10 regression/contract tests, and Deno type-checking passed in GitHub Actions on the PR head listed above. These checks do not prove that the production Worker, Supabase project, TMDB/Fanart secrets, provider quotas, YouTube embeds, or all mobile browsers work end to end.
