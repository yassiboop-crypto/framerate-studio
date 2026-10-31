# Security policy

This repository contains a browser application and Supabase Edge Functions.

## Reporting a vulnerability

Please do not post credentials, access tokens, encryption keys, or personal data in a public issue. Contact the project operator privately at:

**[REPLACE WITH A MONITORED SECURITY CONTACT EMAIL]**

Include a concise description, affected component, reproduction steps that do not access another person's data, and the potential impact. The operator should confirm receipt and coordinate a fix before public disclosure.

## Secret handling

- The Supabase publishable/anon key in browser configuration is intended to be public.
- Never commit Supabase service-role/secret keys, TMDB/Fanart credentials, AI provider keys, or the credential encryption key.
- Keep AI provider credentials and the credential-vault encryption key in server-side secret storage.
- Do not attach raw secrets to screenshots, logs, bug reports, or support messages.
