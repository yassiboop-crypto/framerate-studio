# FrameRate Studio v1.4.1 — Production launch checklist

The current production site is served from the Cloudflare Worker at https://framerate-studio.ybenlahcen7.workers.dev/. This guide covers the current Cloudflare path first and keeps Netlify as an alternative/legacy hosting option. It does **not** deploy the site or change your Supabase project automatically.

## Important project facts

- Frontend: static HTML/CSS/JavaScript in this release folder.
- Current hosting: Cloudflare Worker `framerate-studio` at `https://framerate-studio.ybenlahcen7.workers.dev/`.
- Backend: Supabase project `FrameRate` (`lzrpvnwuiqlntpfuqfrz`) with database schema and two Edge Functions.
- In this repository, `js/supabase-config.js` already contains the public Supabase project URL and publishable key for this app. Preserve it for this project. Never put a `service_role`/secret key or an AI/TMDB/Fanart provider key in browser files.
- `movie-data-proxy` uses exact-origin allow-listing. Its production origin must be added to `FRAMERATE_ALLOWED_ORIGINS` before the deployed site can search movies.
- The app loads Tailwind, Supabase JS, JSZip and fonts from third-party CDNs. Internet access is required for those assets. Tailwind's browser CDN is convenient but not ideal for a strict production Content Security Policy; see the hardening section below.

## A. Configure the frontend

Edit `js/supabase-config.js` with the Supabase URL and public key from Supabase Dashboard → Project Settings → API:

```js
window.FRAMERATE_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  publishableKey: 'YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY'
};
```

Only the public browser key belongs here. Do not paste private API provider keys or Supabase service-role/secret keys into this file.

## B. Verify Supabase production configuration

In Supabase Dashboard, verify that `supabase/schema.sql` has been applied and that these exist:

- `framerate_user_data`
- `framerate_user_credentials`
- `framerate_proxy_rate_limits`
- `framerate_consume_rate_limit(text, integer, integer)`

Do not blindly reset existing data. The SQL includes `drop function`/policy updates, so inspect the current database and back up important data before rerunning it.

Set server-side Edge Function secrets in Supabase. Never commit their values:

- `FRAMERATE_CREDENTIALS_ENCRYPTION_KEY` — base64 of 32 random bytes; back it up securely and do not lose it after encrypted user credentials exist.
- `FRAMERATE_ALLOWED_ORIGINS` — comma-separated exact origins, e.g. `http://localhost:8000,https://YOUR-SITE.netlify.app,https://your-custom-domain.example`.
- `TMDB_API_READ_ACCESS_TOKEN` (or `TMDB_API_KEY`) — required for shared movie search/details.
- `FANART_API_KEY` — optional unless Fanart functionality is needed.
- `FRAMERATE_SITE_URL` — set to the production origin.

Deploy the two functions from the project root after linking the correct Supabase project:

```powershell
npx supabase login
npx supabase link --project-ref lzrpvnwuiqlntpfuqfrz
npx supabase functions deploy credential-vault
npx supabase functions deploy movie-data-proxy
```

The checked-in `supabase/config.toml` sets `credential-vault` to `verify_jwt = true` and `movie-data-proxy` to `verify_jwt = false`; the latter supports guest movie search, while the function applies its own origin and rate-limit checks.

## C. Cloudflare Workers (current production path)

The live site currently uses the Worker URL above. The repository's release folder contains the site assets and Supabase source, but it does not contain a checked-in Wrangler configuration file. Do not invent a Worker name, compatibility date, asset binding, entry point, or deploy command: those settings must match the already-working Worker.

1. In Cloudflare Dashboard, open **Workers & Pages → framerate-studio → Settings → Builds**.
2. Verify the connected Git repository is `yassiboop-crypto/framerate-studio`, the production branch is `main`, and the root directory points to `FrameRate-Studio-v1.4.1-Launch-Prep`.
3. Record the current build, deploy and preview commands before changing them. Keep the currently working deploy command and existing Worker configuration unchanged during this hardening release.
4. Once the root directory is confirmed, set the optional **Build command** to `npm run check`. This is a read-only quality gate: it checks JavaScript syntax, local asset references and regression tests before the existing deployment command runs.
5. Use the Cloudflare preview build for this branch/PR and test the preview URL before merging to `main`. Do not promote a preview manually until account, search, AI, imports, watchlist and mobile checks have passed.
6. After merge, confirm the new production build in Cloudflare's build history, then smoke-test the production URL. Keep Supabase production secrets in Supabase and Cloudflare runtime secrets only where the current Worker actually requires them.

Cloudflare Workers Builds reads the repository, branch, root directory, build command and deploy command from the Worker's **Settings → Builds** screen. A commit to the connected production branch triggers a build/deploy; a non-production branch can use the configured preview command. The Worker name must remain consistent with the active Wrangler configuration. See the [Workers Builds configuration guide](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) and [Workers Builds overview](https://developers.cloudflare.com/workers/ci-cd/builds/).

**Important:** this repository intentionally does not add a guessed `wrangler.toml` in this change. First confirm the current Worker runtime/build settings in Cloudflare. A mismatched Worker name or guessed assets configuration could replace or break the live deployment.

## D. Netlify alternative (not the current production path)

1. Create a new site in Netlify and connect a private Git repository, or use Netlify Drop for a one-off preview. Git deployment is recommended for future updates.
2. Publish directory: `.` (the root containing `index.html`). No build command is required for the current static app.
3. Set the production domain in Netlify and wait for HTTPS to be active.
4. Update `FRAMERATE_ALLOWED_ORIGINS` in Supabase with the exact HTTPS origin (no path, no trailing slash). Include the custom domain too if both `www` and apex domains are used.
5. In Supabase → Authentication → URL Configuration, set the Site URL to the production URL and add exact redirect URLs for the production domain. Keep localhost redirects only if still needed for development.
6. If email confirmation or password recovery is enabled, configure a real email/SMTP provider and test confirmation/recovery links. Configure OAuth callback/origins separately if Google login is enabled.
7. Do not deploy a configured `js/supabase-config.js` containing any private key. The publishable key is intended to be public; RLS and server-side checks must protect data.

## E. Production smoke test (desktop and mobile)

- Open the production URL over HTTPS and check there are no failed scripts/assets in browser DevTools.
- Guest mode: search films, load details/posters, open trailers, and check the movie proxy logs.
- Account A: sign up/sign in, refresh, update watchlist, remove a film, and confirm changes persist.
- Account B: sign in separately and confirm Account A's profile/watchlist/reviews/AI credential status are not exposed.
- Test sign out, password recovery, and email confirmation links if enabled.
- Test AI vault save/status/delete with a provider key; verify the raw key is never displayed in network responses or stored in the normal user-data payload.
- Backdrop validation: a valid HTTPS image URL should work; HTTP, `data:`, `javascript:`, malformed URLs, and URLs containing username/password must be rejected. Check existing TMDB/Fanart HTTPS backdrops still render.
- In a staging project, verify Credential Vault rate limits: status 120/min, save 10/min, delete 20/min, model list 45/min, and chat 30/min per account/action. Confirm excessive requests return HTTP 429 and ordinary sign-in/key-management flows remain below the limit.
- Test mobile viewport: header/navigation, modal scrolling, search suggestions, Watchlist List/Grid, profile stats, game UI, and cursor fallback. Touch devices should retain native touch behavior.
- Check dark/light theme contrast, keyboard focus, reduced-motion preference, and browser console/network errors.
- Check Cloudflare Workers build/deploy logs and Supabase Edge Function logs. Do not share secrets when reporting an error.

## F. Security and release limitations to address before a public launch

- A source review found the site loads Tailwind from `cdn.tailwindcss.com`, plus JSZip, Supabase JS and fonts from CDNs. For a stricter production deployment, bundle Tailwind and pin/self-host dependencies where practical.
- `netlify.toml` adds baseline response headers but intentionally does not add a Content-Security-Policy because inline scripts and third-party origins need a tested migration first. Do not copy a strict CSP from a template without testing all features.
- Custom backdrop URLs and saved watchlist artwork now accept HTTPS URLs only and reject malformed URLs and URL userinfo. This does not replace a full review of all image, link, and CSS sinks.
- Credential Vault status/save/delete actions now use the shared database-backed rate limiter (in addition to the existing model/chat limits). Rate limiting is a baseline control, not a guarantee against abuse.
- Continue reviewing every `innerHTML` insertion that receives user/imported/API content; escape untrusted strings or build DOM nodes with `textContent` to reduce XSS risk. The full application has not yet had an exhaustive XSS audit.
- Check upstream provider terms, API quotas, and costs before inviting public users. The proxy's included rate limits are a starting point, not a guarantee against abuse.
- Add a real Privacy Policy and Terms page with your contact/owner details before public launch, especially if accounts, analytics, or third-party APIs are used. Do not publish placeholder legal text as final advice.
- Add a custom domain only after the Netlify URL has passed the smoke tests.

## Validation performed for this package

The JavaScript files and inline scripts can be syntax-checked locally, and the ZIP can be integrity-checked. This does not prove a live Supabase/TMDB integration, successful Netlify deployment, or visual correctness across every browser. Those checks require the configured project and real browser/device testing.
