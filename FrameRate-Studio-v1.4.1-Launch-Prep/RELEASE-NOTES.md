# v1.4.1 — Production hardening follow-up

- Added Taste Lab feedback/preferences/language to account-scoped cloud synchronization and merged feedback actions by latest timestamp.
- Disabled silent cross-provider AI fallback in both Studio and Taste Lab; provider selection now remains explicit.
- Added accessible keyboard focus trapping/restoration for modals in both pages.
- Added a notice about third-party CORS/RSS relays before Letterboxd RSS sync.
- Added the FrameRate SVG favicon and keyboard-operable Studio home logo.
- Added local JavaScript/project checks, regression tests and GitHub Actions CI, including Deno checks for both Supabase functions.
- Rewrote the deployment documentation to explain the current Cloudflare Worker path and preserve the existing working deploy configuration.
- Added unpublished owner-review drafts for Privacy Policy and Terms of Service, plus a security reporting template.

No SQL migration or Supabase Edge Function behavior change is required by these frontend/account-sync changes. Existing framerate_user_data.payload and RLS policies are reused.

## Validation status

The source includes a reproducible `npm run check` command. GitHub Actions passed the JavaScript checks, all 10 tests, and Deno type-checks for both Supabase Edge Functions on PR head `e138f0280a67b1cd568d1bddeba24c8ec0e9cb90`. Live Cloudflare/Supabase/provider and PC/mobile tests remain required.
