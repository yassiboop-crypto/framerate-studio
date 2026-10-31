## Current release and maintenance status

This folder contains the current FrameRate Studio browser app and Supabase backend source (v1.4.1). Historical notes below describe earlier feature releases and may refer to older hosting instructions; use the current deployment guide for the live Cloudflare Worker.

- Production site: https://framerate-studio.ybenlahcen7.workers.dev/
- Deployment guide: DEPLOYMENT-GUIDE.md (Cloudflare Workers + Supabase)
- Quality checks: run `npm run check` from this folder.
- Supabase browser config: this repo contains the public project URL and publishable key for the configured project. Preserve it. Never insert a service-role or secret key into browser files.
- Legal drafts are in the repository-level legal folder and are not linked from the public UI; fill and review them before publication.

---


This v1.3.8 release is an Arcade gameplay and visual-quality hotfix for the existing FrameRate Studio app. It retains the Watchlist, Profile & Stats, Trailer, AI review tools, dual themes, and the five-choice cursor suite from the previous releases.


## v1.3.4 — Advanced Watchlist + stronger dark/light theme contrast

- Added multi-select checkboxes for watchlist entries, including **Select visible** for the current search/filter.
- Added bulk actions to change selected films to **Want to Watch**, **Watching**, or **Watched**, and remove several selected films together. Removal events are recorded so the existing cloud merge can keep deletions from being resurrected by older copies.
- Added sort modes: recently added, oldest added, title A–Z, and year newest.
- Added **List** and **Grid** layouts; the preferred layout and sort order are saved in this browser.
- Added a **Film & Details** action to each watchlist entry. It attempts to resolve the saved film against the catalogue, then opens it in the main Film & Details workspace.
- Refined Watchlist, Profile & Stats, filter controls, selected states, borders, placeholders, and focus indicators using separate high-contrast color tokens for both Obsidian Dark and Cinema Sand/Light themes.
- Front-end only: this release does not require new SQL or Edge Function deployments. Preserve your configured `js/supabase-config.js` when replacing the project files.

### Quick smoke test

1. Open **My Cinema → Watchlist**, try each sort mode and switch between List/Grid.
2. Select two entries, apply a new status, refresh the page, and confirm their statuses remain.
3. Select a few entries and use **Remove selected**, then refresh and confirm the films stay removed.
4. Use **Film & Details** on a saved entry and confirm the selected film loads in the main workspace.
5. Toggle both themes and inspect text, select menus, cards, selection borders, and buttons for readable contrast.


## v1.3.6 — Artifact cursors + ambient effects

- Replaced emoji-in-bubble cursor visuals with custom inline SVG illustrations: FrameRate angular marker, film strip, magic wand, spider-web glyph, storm hammer, clapperboard, projector, popcorn carton, shooting star, and cinema camera.
- Removed the circular cursor halo / circular background treatment. The selected object itself is the cursor.
- Added cursor-specific ambient SVG animations: Thor-inspired lightning bolts, spell sparks, spider-web strands, projector beams, film-strip rails, clapper accents, popcorn sparkles, cosmic streaks, camera focus marks, and FrameRate corner strokes.
- Click effects now use the selected object's vector artwork and themed effects instead of emoji bursts.
- Preserved selection persistence, system-cursor reset, theme compatibility, and reduced-motion / touch-device handling.
- SVG artwork is original, stylized, and inspired by the described object themes rather than using movie screenshots or logos.



- Added a compact cursor-style picker with **10 original cinema-inspired themes**: FrameRate, Film Reel, Arcane Wand, Web Spinner, Storm Hammer, Neon Clapper, Projector, Popcorn Pop, Cosmic Star, and Director Lens.
- Added a theme-matched cursor halo, hover pulse, and a small animated burst on click. Each cursor has its own accent color and visual movement.
- Cursor choice persists in this browser. **Use the system cursor** is available in the picker for users who prefer the native pointer.
- The custom pointer and click burst automatically stay off on touch-first devices; click effects also respect the operating system's reduced-motion preference.
- Picker colors use the active Dark/Light theme variables and the layout adapts to narrow screens.
- No new SQL or Edge Function deployment is required. Preserve the configured `js/supabase-config.js` when replacing files.

### Cursor smoke test

1. Open the cursor icon beside **My Cinema** and try all 10 options.
2. Click buttons and blank space; confirm each enabled style emits a short, matching click burst.
3. Reload the page and check that the selected cursor persists.
4. Switch between dark and light themes; verify the picker remains readable.
5. Choose **Use the system cursor** to disable the custom pointer.
6. On a touch device, confirm the native touch/scroll interaction remains unchanged.

## What changed in v1.3

- Added **My Cinema** to the header, with search and status filters for the Watchlist.
- Added **Add to Watchlist / Remove from Watchlist** to a selected film. Entries support Want to Watch, Watching, and Watched.
- Added **Profile & Stats** using available Letterboxd imports and saved-review data, without fabricating missing information.
- Added `fr_watchlist` to the account-scoped local-storage and Supabase payload allow-lists. Watchlist entries merge by film title/year, and the latest status update is preferred across devices.
- No new SQL table or Edge Function is needed for this feature; the current `framerate_user_data.payload` and RLS setup are reused.

## What changed in v1.2

- **AI API keys persist per account:** Groq, OpenAI, Gemini, and OpenRouter credentials are encrypted with AES-256-GCM in the `framerate_user_credentials` table. The table grants no direct access to `anon` or `authenticated`; the `credential-vault` Edge Function verifies the caller's Supabase session and performs encryption/decryption server-side.
- **AI requests use the server vault:** model lists and review-generation calls are sent through the authenticated Edge Function. The raw saved key is never returned to the browser. Request limits are applied to AI model/chat calls.
- **Legacy key migration:** when a signed-in user's older profile contains a local AI key and no server copy exists, the deployed vault attempts a one-time save to the encrypted vault and removes the local copy after success. If the vault has not been deployed/configured, the existing local key is kept rather than erased.
- **Shared movie data:** the site owner configures TMDB and Fanart.tv credentials as Supabase Edge Function secrets. Search, movie details, posters/backdrops, and popular titles use `movie-data-proxy`; users don't enter or receive those shared keys. The proxy uses caching and a database-backed rate limiter and also works in Guest Mode after Supabase is configured.
- **Trailer player:** films with a TMDB YouTube Trailer/Teaser show a **Watch Trailer** button. It opens an embedded YouTube privacy-enhanced player (`youtube-nocookie.com`) and offers an external YouTube link. Movies without a supported trailer simply won't show the button.
- **Model selection fix:** fetched OpenRouter models are now assigned to the OpenRouter preset list, not the OpenAI list.
- **Safer key handling:** authenticated saves/tests use the cloud vault and avoid writing newly entered AI keys to browser storage. Guest keys remain browser-local by design.
- **Abuse controls:** the shared movie proxy has a per-IP fixed-window request limit; authenticated model/chat calls have per-account limits.

## Important deployment status

**For a fresh installation:** remote Supabase functions cannot be connected from this ZIP alone. You must configure the project URL/public key, run `supabase/schema.sql`, enter server-side secrets, and deploy the two functions before account-key persistence and shared movie data will work. This repository's `js/supabase-config.js` contains the public Supabase project URL and publishable key for the configured project.

**For this configured FrameRate repository:** preserve the existing `js/supabase-config.js` public project URL and publishable key when updating files. This Arcade-only release does not require new SQL or Edge Function redeployment; the backend setup below is for a fresh installation or when you are specifically repairing an older backend configuration.

## 1. Configure the front-end Supabase client

1. Create/open your Supabase project and go to **Project Settings → API** (dashboard labels can vary).
2. Copy the project URL and the public publishable key (or legacy public `anon` key).
3. Edit `js/supabase-config.js` and replace the placeholders:

```js
window.FRAMERATE_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  publishableKey: 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY'
};
```

Only the public publishable/anon key belongs here. **Never add a `service_role` key or a Supabase secret key to any front-end file.**

## 2. Run the database SQL

1. Open Supabase **SQL Editor**.
2. Run the whole `supabase/schema.sql` file.
3. Confirm these tables exist: `framerate_user_data`, `framerate_user_credentials`, and `framerate_proxy_rate_limits`.

The SQL keeps the app's existing account-scoped cloud-sync table and adds the encrypted AI-credential table and rate-limit table/function. The browser has no direct permission to read or write AI credentials. The rate-limit function is executable only by `service_role`.

## 3. Configure secrets for the Edge Functions

Add these values in **Supabase → Edge Functions → Secrets** or set them with the CLI. Keep them server-side; do not put them in `js/supabase-config.js`.

| Secret name | Purpose |
| --- | --- |
| `FRAMERATE_CREDENTIALS_ENCRYPTION_KEY` | Required; base64 encoding of exactly 32 random bytes for AES-256-GCM encryption. |
| `FRAMERATE_ALLOWED_ORIGINS` | Comma-separated exact origins allowed to call the functions. |
| `TMDB_API_READ_ACCESS_TOKEN` | Site-wide TMDB API Read Access Token (preferred). The function can also use `TMDB_API_KEY` if needed. |
| `FANART_API_KEY` | Site-wide Fanart.tv API key. |
| `FRAMERATE_SITE_URL` | Optional; your public site URL, used for OpenRouter request metadata. |

### Generate the encryption key (Windows PowerShell)

Run this in PowerShell where Node.js is installed:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the result into `FRAMERATE_CREDENTIALS_ENCRYPTION_KEY`. Keep a secure backup of it. **Do not rotate or lose this key after users have saved credentials**, unless you first decrypt and re-encrypt every stored credential. If it is lost, saved AI credentials cannot be decrypted and users will need to save their keys again.

### Allowed origins

Set `FRAMERATE_ALLOWED_ORIGINS` to exact origins (scheme + host + optional port; no URL paths and no trailing slash). For local development and a deployed site, for example:

```text
http://localhost:8000,http://127.0.0.1:8000,https://your-site.netlify.app
```

Replace `https://your-site.netlify.app` with the exact production origin you control. Add every origin you actually use. The default in the function source allows only the two localhost development origins.

### Deploy secrets and functions with the Supabase CLI

Run these commands from the project root in PowerShell. First install or use the current Supabase CLI, then log in and link your project:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

After generating the encryption key and obtaining your TMDB/Fanart.tv keys, set each secret. Replace example values with your real values; do not share them in chat or commit them to Git:

```powershell
npx supabase secrets set FRAMERATE_CREDENTIALS_ENCRYPTION_KEY="PASTE_GENERATED_BASE64_KEY"
npx supabase secrets set FRAMERATE_ALLOWED_ORIGINS="http://localhost:8000,http://127.0.0.1:8000,https://your-site.netlify.app"
npx supabase secrets set TMDB_API_READ_ACCESS_TOKEN="PASTE_TMDB_READ_ACCESS_TOKEN"
npx supabase secrets set FANART_API_KEY="PASTE_FANART_API_KEY"
npx supabase secrets set FRAMERATE_SITE_URL="https://your-site.netlify.app"
```

Then deploy both functions:

```powershell
npx supabase functions deploy credential-vault
npx supabase functions deploy movie-data-proxy
```

The included `supabase/config.toml` enables JWT verification for `credential-vault` and disables gateway JWT verification for `movie-data-proxy` so Guest Mode can use shared movie data. The movie proxy still checks the exact origin list and the database-backed rate limit; it does not expose the TMDB/Fanart.tv secret values to the browser.

## 4. Configure Authentication

For sign-in and cloud syncing:

1. In Supabase **Authentication → Sign In / Providers**, enable Email. Configure a reliable email/SMTP provider for production confirmation and recovery messages.
2. Under **Authentication → URL Configuration**, set your production Site URL and add allowed redirect URLs, including local development when needed:

```text
http://localhost:8000/**
http://127.0.0.1:8000/**
https://your-site.netlify.app/**
```

3. For Google login, configure a Google OAuth Web client. Put the Supabase callback URL shown in Supabase's Google provider screen (usually `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`) in Google Cloud's **Authorized redirect URIs**. Add your exact local and production site origins to Google **Authorized JavaScript origins**. Keep the Google client secret in Supabase, not in browser code.

## 5. Run locally and test

Do not open `index.html` directly as a `file://` URL. In Windows PowerShell, open the project directory and run:

```powershell
py -m http.server 8000
```

Then visit `http://localhost:8000`.

After SQL/secrets/functions are deployed, test these flows in order:

1. Guest mode: search a film and select a trailer-capable film. Shared search and trailers should work without entering a TMDB key in the UI.
2. Sign in to Account A, enter an AI provider key, choose **Save Agent & API Keys**, and confirm the status says the provider is saved securely. Generate a review.
3. Refresh the page, sign out, and sign back into Account A. The key field should remain blank with a “Saved securely” placeholder, while the AI request still works through the server vault.
4. Sign in to Account B and verify Account A's AI providers are not shown as saved. Test deleting a key from one account and confirm it does not delete another account's key.
5. Try each available provider/model and confirm that OpenRouter models show under OpenRouter. Check a film with a YouTube trailer and one without one.
6. Test the deployed origin as well as localhost. An origin missing from `FRAMERATE_ALLOWED_ORIGINS` is deliberately blocked.

If you were already signed in before deploying the functions, sign out and sign back in (or refresh the session) after deployment so the cloud-key status can be fetched and eligible older local AI keys can migrate. If the vault is unavailable, the app should show a diagnostic message and keep the existing local copy instead of deleting it.

## 6. How credentials are stored

### Signed-in users

AI keys for Groq, OpenAI, Gemini, and OpenRouter are encrypted by the `credential-vault` Edge Function before they are written to `framerate_user_credentials`. The raw key is never returned by the status endpoint and the normal JSONB app-sync payload does not contain it. AI model-list and chat calls use the server function, which decrypts the caller's own key only at request time. `auth.getUser()` verifies the caller, and each database query is constrained to that verified user ID.

### Guest users

Guest mode has no verified account to associate with a cloud credential row, so guest AI keys are saved only in that browser's local profile. They do not sync to other devices. Sign in and save the key through the cloud vault if you need cross-device persistence.

### Shared TMDB/Fanart.tv keys

Only the site owner adds the TMDB/Fanart.tv secrets to Supabase Edge Function secrets. All site users use the proxy; the shared raw keys are not included in HTML or JavaScript. A public site owner must monitor upstream quotas and Supabase function/database usage. The included rate-limit values are reasonable starting points, not a guarantee against every kind of abuse.

### Encryption key backup

`FRAMERATE_CREDENTIALS_ENCRYPTION_KEY` is essential to decrypt existing records. Store it in a secure password manager/secret store. Do not paste it into public chats, source control, client code, or the database. A key rotation requires a planned credential re-encryption migration.

## 7. Existing v1.1 users and data

- The existing `framerate_user_data` cloud-sync table is preserved; rerunning the SQL updates its RLS policies and adds the new tables/function.
- Existing locally scoped AI provider keys can migrate after the vault function is deployed and that account next loads its credential status. Migration is skipped for a provider that already has a cloud-saved key.
- Old TMDB/Fanart.tv local keys are only legacy fallback values. New users should not enter them; configure the shared server secrets instead.
- The previous account-isolation fix remains in place. The normal cloud snapshot still syncs saved review history, imported Letterboxd library data, Writing DNA, workspace draft, theme/language/cursor preference, and selected AI provider/model. The private AI key values are stored separately and are not placed in the cloud snapshot JSON.
- If two accounts were already contaminated by the older account-switch bug, code cannot determine which historical records belong to whom. Back up any needed data first. To reset only Account B's FrameRate cloud snapshot, replace `ACCOUNT_B_UUID` with that user's UUID and run this in SQL Editor:

```sql
update public.framerate_user_data
set payload = '{}'::jsonb,
    updated_at = now()
where user_id = 'ACCOUNT_B_UUID';
```

This clears only that account's FrameRate payload and does not delete the Supabase user. Do not run it for Account A if you want to keep its saved data.
- Keep a backup of your project and Supabase data before making production changes.

## 8. Security checklist

- Never place Supabase `service_role`/secret keys, the encryption key, TMDB read token, or Fanart.tv key in front-end files.
- Do not grant browser roles access to `framerate_user_credentials`; the SQL intentionally revokes those permissions and adds no client RLS policy.
- Use HTTPS and exact allow-listed origins in production.
- Keep the encryption key backed up and stable.
- Test with two accounts before opening registration to the public.
- Review third-party provider terms, privacy text, and quotas before public launch.

## Files introduced or updated for v1.2

- `supabase/functions/credential-vault/index.ts` — encrypted per-user AI key vault, server-side model listing/chat, authenticated rate limit.
- `supabase/functions/movie-data-proxy/index.ts` — shared TMDB/Fanart.tv proxy, caching, guest-compatible origin restrictions, IP rate limit.
- `supabase/schema.sql` — account data table/policies, encrypted credential table, proxy rate-limit table/function.
- `supabase/config.toml` — function JWT-verification settings.
- `js/auth.js`, `js/api.js`, `js/app.js`, and `index.html` — UI wiring, cloud persistence, shared movie data, model routing, and trailer modal.

## 9. Packaging verification

- All project JavaScript files passed `node --check`.
- Both Edge Function TypeScript files passed transpilation and a local syntax/type pass with ambient Deno/Supabase declarations. This is not a substitute for deploying them to a real Supabase project.
- Static HTML checks found no duplicate IDs or missing local asset references, and the stylesheet parsed without CSS syntax errors.
- Focused mock tests passed for trailer-key validation, trailer modal open/close behavior, OpenRouter model routing, and removal of a signed-in AI key from local profile storage after the cloud save reports success.
- A full browser visual pass and a real end-to-end Supabase/provider API test were not completed during packaging. Recheck responsiveness and the live login/vault/proxy flows after setting your own Supabase URL, secrets, and function deployment.

## v1.3 — My Cinema: Watchlist + Profile / Stats

This update adds a private, account-scoped Watchlist and a Profile & Stats dashboard.

### Watchlist
- Select a film in the main workspace, then use **Add to Watchlist**.
- Open **My Cinema** from the header to search and filter your saved films.
- Each entry can be labelled **Want to Watch**, **Watching**, or **Watched**, and can be removed.
- The Watchlist is stored under `fr_watchlist`, which is part of the existing account-scoped storage namespace and the explicit Supabase cloud-sync allow-list.
- Guest data stays in the guest namespace; signed-in users sync their own list via `framerate_user_data.payload` subject to the existing RLS policies.

### Profile & Stats
The dashboard summarizes only data already available to the current account: Watchlist count, imported Letterboxd library entries, dated diary entries, imported ratings and average, saved AI review drafts, liked films, rewatch entries, and a rating distribution. Imported data is not inferred or fabricated. Stats change when the dashboard is opened and after cloud data becomes ready.

### Upgrade notes
- The existing SQL schema does not need a new table for the Watchlist because it is stored as an allow-listed JSON string inside the existing `framerate_user_data.payload`.
- Keep the current `schema.sql`, Vault, TMDB/Fanart secrets, and Edge Function deployments as configured. Do not rerun destructive SQL or put secrets in front-end files.
- Before replacing files with this ZIP, preserve your configured `js/supabase-config.js` (or re-enter the same Project URL and publishable/anon key); this downloadable copy deliberately uses placeholders.
- After replacing the static files, run `npm install` if you keep the CLI's local devDependency, then start the local static server as before. Re-check Watchlist isolation with two accounts before public release.

### Validation
The JavaScript is checked for syntax errors and the HTML/CSS assets are checked for missing local references. Third-party Supabase, AI, TMDB, and Fanart service calls require your own configured project and are not simulated by static tests.

## v1.3.2 hotfixes (2026-10-27)

- Fixed header layout so the **My Cinema** button stays prominent and does not get pushed off-screen by the other controls.
- Moved **My Cinema** to the first position among the header controls, gave it a high-contrast orange style, and kept the full label visible on narrow screens.
- Header controls now wrap responsively; on small screens My Cinema is placed first in the controls row.
- This hotfix changes only front-end layout and styling. No new SQL or Edge Function redeploy is required for this specific button fix.

## v1.3.1 hotfixes (2026-10-27)

- The `Watch Trailer` action stays visible after a film is selected. If TMDB has a valid YouTube trailer it opens the in-app player; otherwise it opens a YouTube search for that film and year.
- Main film search now catches and displays catalogue/proxy errors instead of leaving the UI stuck on “Searching”. Live autocomplete also catches errors and ignores stale responses.
- Watchlist search now does both jobs: filters the saved watchlist and searches the movie catalogue to let the user add a result directly from My Cinema.
- Watchlist removal now happens immediately from the explicit × button; no browser confirm dialog can block it.
- Profile & Stats cards and rating-distribution rows are clickable. They open a poster grid of the related imported/watchlist films; selecting a poster opens the film's Letterboxd URL when present, otherwise a title-based Letterboxd film URL is generated.

### Backend note from the v1.3.1 search hotfix (historical)

The v1.3.1 search hotfix corrected `supabase/config.toml` so `movie-data-proxy` uses `verify_jwt = false` for Guest Mode. Only if your deployed proxy still has the older setting, redeploy both functions from the project folder. This does not apply to the v1.3.8 Arcade front-end-only changes:

```powershell
npx supabase functions deploy movie-data-proxy
npx supabase functions deploy credential-vault
```

Keep `FRAMERATE_ALLOWED_ORIGINS` set to the exact local origin you use (for example `http://localhost:8000,http://127.0.0.1:8000`). If the search still returns no results, check Supabase Dashboard → Edge Functions → `movie-data-proxy` → Logs. Confirm `TMDB_API_READ_ACCESS_TOKEN` is present as a server Secret. Do not put TMDB/Fanart or AI secrets in browser files.

Validation performed for this hotfix: `node --check` on all project JavaScript files. A live Supabase/TMDB call and full real-browser visual test could not be performed in this environment; verify those with your project's secrets and the steps above.


## v1.3.3 — Watchlist persistence + searchable Profile & Stats
- Watchlist add/remove actions now store timestamped change events per account. Cloud reconciliation filters removed movies instead of restoring stale remote copies on refresh. Re-adding a film records a newer add event.
- Profile & Stats category drilldowns now include a search field, result counts, and Load more pagination.
- Imported Letterboxd ZIP/CSV rows without poster artwork try to resolve posters through the existing movie catalogue and cache successful poster URLs in the imported library.
- Validation performed: JavaScript syntax checks and ZIP integrity. Live cloud/browser integration still needs to be verified in the user's Supabase project.


## v1.3.8 — Arcade QA + Cinematic Polish

- Fixed a race condition where the film-pool cache could resolve before the Arcade count element was re-created, leaving the status stuck on `loading…` even though questions were available.
- The Guess the Film poster now keeps the artwork visible (moderate blur and a small label) rather than covering almost the whole image with blur and an opaque veil. A correct or incorrect answer reveals the full poster.
- Added a branded poster fallback for broken/missing image URLs in all three games, so failed image requests no longer appear as blank/broken poster areas.
- Normalized poster fields from curated and selected-film records (`poster`, `posterUrl`, `poster_path`, or `image`).
- Improved answer handling: disallow repeated choices after submission, mark the correct answer, guard invalid choice indexes, and compare film identity by title + year.
- Kept clue scoring consistent: up to two clues, each costs 100 points, with a minimum award of 200 points for a correct answer.
- Static QA: JavaScript syntax, inline scripts, duplicate static IDs, local asset paths, and ZIP integrity checked. Live TMDB/Supabase availability still depends on your configured keys and deployed functions.

### Arcade smoke test

1. Open the review-card workflow and click **Cinema Arcade**.
2. Confirm the film pool count changes from `loading…` to a numeric count (or `unavailable` if the app has no usable pool).
3. Confirm the Guess the Film poster artwork is visible but the printed title is still difficult to read.
4. Try both clues, answer a question, and verify the poster reveals, the correct choice is highlighted, and score/streak update.
5. Switch to Guess the Director and Guess the Year; each should show a poster or branded fallback.

## v1.3.7 — Four Realistic Cursor Artifacts

This update replaces the previous 10-option cursor picker with five choices: Harry Potter Wand, Spider-Man Web, Star Wars Lightsaber, Thor's Hammer, and the native Windows/system pointer. The four custom pointers are small inline SVG illustrations using layered gradients, highlights and shadows; they are not emoji icons and have no bubble/circle backdrop. Each themed pointer has its own low-opacity ambient background effect and click animation. The native pointer choice disables the custom overlay.

Accessibility and performance: custom cursors/effects only apply to fine hover pointers; touch devices retain native behavior; `prefers-reduced-motion` disables cursor animations; no remote cursor assets or extra runtime libraries are required.


## v1.4.0 — Global Design Polish

This front-end update adds a consistent site-wide visual layer: improved typography rendering, soft cinematic ambient background lighting, more consistent panel radii and shadows, clearer keyboard focus, tactile button states, refined input focus rings, scrollbar styling, and narrow-screen spacing adjustments. Reduced-motion preferences are respected.

No database schema or Supabase Edge Function changes are required. Preserve your real `js/supabase-config.js` when upgrading.
