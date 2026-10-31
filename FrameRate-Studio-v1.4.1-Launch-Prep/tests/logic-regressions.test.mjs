import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(join(projectRoot, path), 'utf8');

test('Taste Lab feedback merge preserves the newest action across devices', () => {
  const context = {
    window: { FRAMERATE_SUPABASE_CONFIG: {} },
    document: { addEventListener() {} },
    localStorage: { getItem() { return null; } },
    Storage: { prototype: {} },
    console
  };
  vm.createContext(context);
  vm.runInContext(read('js/auth.js'), context, { filename: 'auth.js' });
  const auth = context.window.FrameRateAuth;
  const local = {
    fr_taste_feedback_v1: JSON.stringify([
      { title: 'Film A', year: '2020', action: 'not-for-me', updatedAt: '2026-10-30T12:00:00.000Z' }
    ]),
    fr_taste_filters_v1: JSON.stringify({ genre: '18' }),
    fr_taste_language: 'darija'
  };
  const remote = {
    fr_taste_feedback_v1: JSON.stringify([
      { title: 'Film A', year: '2020', action: 'more-like-this', updatedAt: '2026-10-29T12:00:00.000Z' },
      { title: 'Film B', year: '2021', action: 'not-for-me', updatedAt: '2026-10-29T11:00:00.000Z' }
    ]),
    fr_taste_filters_v1: JSON.stringify({ genre: '28' }),
    fr_taste_language: 'en'
  };
  const merged = auth.mergePayloads(local, remote, true);
  const feedback = JSON.parse(merged.fr_taste_feedback_v1);
  const filmA = feedback.find(item => item.title === 'Film A');
  assert.equal(filmA.action, 'not-for-me');
  assert.equal(feedback.length, 2);
  assert.equal(merged.fr_taste_language, 'darija');
  assert.equal(JSON.parse(merged.fr_taste_filters_v1).genre, '18');
});

test('Taste Lab does not retry a failed selected provider using another saved provider', async () => {
  const values = {
    fr_ai_provider: 'gemini',
    fr_ai_model: 'gemini-2.5-flash',
    fr_key_gemini: 'test-only-key',
    fr_key_groq: 'another-test-only-key',
    fr_taste_ai_rank_v3: null
  };
  let calls = 0;
  const context = {
    window: {},
    localStorage: { getItem(key) { return values[key] ?? null; }, setItem() {} },
    fetch: async () => {
      calls += 1;
      return { ok: false, status: 403, json: async () => ({}) };
    },
    AbortController,
    setTimeout,
    clearTimeout,
    console
  };
  vm.createContext(context);
  vm.runInContext(read('js/taste-lab/ai-enhancer.js'), context, { filename: 'ai-enhancer.js' });
  await assert.rejects(
    context.window.TasteLabAI.rank({
      profile: {},
      library: [],
      candidates: [{ id: 10, title: 'Sample Film', release_date: '2020-01-01', overview: '', _tasteGenres: [], _tasteReasons: [] }]
    }),
    /Selected AI provider failed/
  );
  assert.equal(calls, 1, 'only the explicitly selected Gemini provider should be called');
});
