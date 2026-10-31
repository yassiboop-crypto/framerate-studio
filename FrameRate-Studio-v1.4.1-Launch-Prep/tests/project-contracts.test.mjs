import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(projectRoot, path), 'utf8');

test('all local scripts, stylesheets and favicon references resolve', () => {
  for (const page of ['index.html', 'taste-lab.html']) {
    const html = read(page), assets = [];
    for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) assets.push(match[1]);
    for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
      const tag = match[0], rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1] || '';
      const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
      if (href && /stylesheet|icon/i.test(rel)) assets.push(href);
    }
    for (const asset of assets) {
      if (/^(?:https?:|data:|\/\/)/i.test(asset)) continue;
      const path = decodeURIComponent(new URL(asset, 'https://framerate.test/').pathname).replace(/^\//, '');
      assert.ok(existsSync(join(projectRoot, path)), page + ' references missing local asset: ' + asset);
    }
  }
});

test('Supabase browser configuration contains only the public client key', () => {
  const config = read('js/supabase-config.js');
  assert.match(config, /publishableKey\s*:/);
  assert.doesNotMatch(config, /service_role|sb_secret_|SUPABASE_SECRET_KEYS/i);
});

test('account sync allow-list includes Taste Lab feedback and preferences', () => {
  const auth = read('js/auth.js');
  for (const key of ['fr_taste_feedback_v1', 'fr_taste_filters_v1', 'fr_taste_language']) {
    assert.ok(auth.includes("'" + key + "'"), 'Missing cloud/account-scope key: ' + key);
  }
  assert.match(auth, /key === 'fr_taste_feedback_v1'/);
});

test('SQL keeps account rows isolated and credential rows server-only', () => {
  const sql = read('supabase/schema.sql');
  assert.match(sql, /alter table public\.framerate_user_data enable row level security/i);
  assert.match(sql, /auth\.uid\(\)\)\s*=\s*user_id/i);
  assert.match(sql, /revoke all on table public\.framerate_user_credentials from public, anon, authenticated/i);
  assert.match(sql, /grant all on table public\.framerate_user_credentials to service_role/i);
});

test('AI engines do not silently switch the selected provider', () => {
  const tasteAI = read('js/taste-lab/ai-enhancer.js'), studioAI = read('js/api.js');
  assert.match(tasteAI, /const configs=\[primary\]/);
  assert.doesNotMatch(tasteAI, /PROVIDERS\.filter\(provider=>provider!==primary\.provider/);
  assert.doesNotMatch(studioAI, /Auto-Backup|Groq silently/i);
});

test('modal accessibility helper is loaded on both pages', () => {
  for (const page of ['index.html', 'taste-lab.html']) {
    assert.match(read(page), /js\/modal-accessibility\.js\?v=20261031-hardening-1/);
  }
  const helper = read('js/modal-accessibility.js');
  assert.match(helper, /event\.key !== 'Tab'/);
  assert.match(helper, /focusin/);
});

test('RSS UI discloses the use of third-party relays', () => {
  assert.match(read('js/app.js'), /third-party CORS relay services/i);
  assert.match(read('js/app.js'), /Relay operators may see the feed URL/i);
});

test('legal documents are marked as owner-review drafts', () => {
  assert.match(read('../legal/PRIVACY-POLICY-DRAFT.md'), /DRAFT — OWNER REVIEW REQUIRED/i);
  assert.match(read('../legal/TERMS-OF-SERVICE-DRAFT.md'), /DRAFT — OWNER REVIEW REQUIRED/i);
});
