# FrameRate Studio

A static HTML/CSS/JavaScript film workspace with Supabase Authentication, cloud sync, and Supabase Edge Functions.

- **Current release folder:** [FrameRate-Studio-v1.4.1-Launch-Prep](./FrameRate-Studio-v1.4.1-Launch-Prep/)
- **Production site:** https://framerate-studio.ybenlahcen7.workers.dev/
- **Deployment guide:** [Cloudflare Workers and Supabase](./FrameRate-Studio-v1.4.1-Launch-Prep/DEPLOYMENT-GUIDE.md)
- **Release notes:** [Current release notes](./FrameRate-Studio-v1.4.1-Launch-Prep/RELEASE-NOTES.md)
- **Source audit:** [Project audit report](./FrameRate-Studio-v1.4.1-Launch-Prep/PROJECT-AUDIT-REPORT.md)
- **Security reporting:** [SECURITY.md](./SECURITY.md)
- **Legal working drafts:** [Privacy policy](./legal/PRIVACY-POLICY-DRAFT.md) · [Terms of service](./legal/TERMS-OF-SERVICE-DRAFT.md)

## Quality checks

From the release folder, run `npm run check`. The GitHub Actions workflow runs the same checks for pull requests and main-branch pushes and type-checks the two Supabase Edge Functions with Deno.

## Secret handling

The Supabase publishable key in `js/supabase-config.js` is intended to be public. Never put Supabase service-role/secret keys, AI provider keys, TMDB/Fanart credentials, or the credential-vault encryption key in browser files.
