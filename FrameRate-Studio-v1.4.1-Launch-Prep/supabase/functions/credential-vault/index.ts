import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
const PROVIDERS = ['groq', 'openai', 'gemini', 'openrouter'] as const;
type Provider = (typeof PROVIDERS)[number];
type CredentialMap = Partial<Record<Provider, string>>;

function allowedOrigins(): string[] {
  const defaults = [
    'https://framerate-studio.netlify.app',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
  ];
  const configured = (Deno.env.get('FRAMERATE_ALLOWED_ORIGINS') || '')
    .split(',').map((value) => value.trim()).filter(Boolean);
  return [...new Set([...defaults, ...configured])];
}
function isAllowedOrigin(origin: string, configured: string[]): boolean {
  if (configured.includes(origin)) return true;
  // Only permit HTTPS Netlify Deploy Previews for this exact project slug.
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' &&
      /^deploy-preview-\\d+--framerate-studio\\.netlify\\.app$/.test(parsed.hostname) &&
      parsed.origin === origin;
  } catch (_) {
    return false;
  }
}
function json(data: unknown, status = 200, origin = ''): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(origin) },
  });
}
function getPublishableKey(): string {
  const modern = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (modern) {
    try { const parsed = JSON.parse(modern); if (parsed.default) return parsed.default; } catch (_) { /* legacy fallback */ }
  }
  return Deno.env.get('SUPABASE_ANON_KEY') || '';
}
function getAdminKey(): string {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (modern) {
    try { const parsed = JSON.parse(modern); if (parsed.default) return parsed.default; } catch (_) { /* legacy fallback */ }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}
function isProvider(value: unknown): value is Provider {
  return typeof value === 'string' && PROVIDERS.includes(value as Provider);
}
function b64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function b64Decode(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
async function getEncryptionKey(): Promise<CryptoKey> {
  const encoded = Deno.env.get('FRAMERATE_CREDENTIALS_ENCRYPTION_KEY') || '';
  if (!encoded) throw new Error('The server-side credential encryption key is not configured.');
  const bytes = b64Decode(encoded);
  if (bytes.length !== 32) throw new Error('The credential encryption key must decode to exactly 32 bytes.');
  return await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
async function encryptSecret(secret: string) {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(secret);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return { ciphertext: b64Encode(new Uint8Array(cipher)), iv: b64Encode(iv) };
}
async function decryptSecret(ciphertext: string, iv: string): Promise<string> {
  const key = await getEncryptionKey();
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64Decode(iv) }, key, b64Decode(ciphertext));
  return new TextDecoder().decode(plain);
}
function timeoutFetch(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}
async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function consumeCredentialRateLimit(admin: any, userId: string, action: string, max = 30) {
  const keyHash = await sha256(`credential:${userId}:${action}`);
  const { data, error } = await admin.rpc('framerate_consume_rate_limit', {
    p_key_hash: keyHash, p_window_seconds: 60, p_max_requests: max,
  });
  if (error) throw new Error('The credential-vault rate limiter is missing. Run supabase/schema.sql.');
  if (data !== true) throw new Error('RATE_LIMITED');
}

async function loadCredential(admin: any, userId: string, provider: Provider): Promise<string> {
  const { data, error } = await admin.from('framerate_user_credentials')
    .select('ciphertext, iv').eq('user_id', userId).eq('provider', provider).maybeSingle();
  if (error) throw new Error('Could not load the saved provider credential. Check supabase/schema.sql.');
  if (!data) throw new Error(`No saved ${provider} API key exists for this account.`);
  return await decryptSecret(data.ciphertext, data.iv);
}
async function callProviderModels(provider: Provider, key: string): Promise<string[]> {
  let endpoint = '';
  let headers: Record<string, string> = {};
  if (provider === 'gemini') {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
  } else if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/models'; headers = { Authorization: `Bearer ${key}` };
  } else if (provider === 'openai') {
    endpoint = 'https://api.openai.com/v1/models'; headers = { Authorization: `Bearer ${key}` };
  } else {
    endpoint = 'https://openrouter.ai/api/v1/models'; headers = { Authorization: `Bearer ${key}` };
  }
  const response = await timeoutFetch(endpoint, { headers }, 15000);
  if (!response.ok) throw new Error(`${provider} did not return its model list (HTTP ${response.status}).`);
  const payload = await response.json();
  let models: string[];
  if (provider === 'gemini') {
    models = (payload.models || []).filter((item: any) =>
      (item.supportedGenerationMethods || []).includes('generateContent') &&
      /gemini/i.test(item.name || '') && !/(embedding|imagen|tts|audio|robotics|computer-use)/i.test(item.name || '')
    ).map((item: any) => String(item.name || '').replace(/^models\//, ''));
  } else {
    models = (payload.data || []).map((item: any) => String(item.id || '')).filter(Boolean);
    if (provider === 'openai') models = models.filter((id) => id.startsWith('gpt-'));
    if (provider === 'groq') models = models.filter((id) => !/(whisper|guard|tts)/i.test(id));
  }
  return [...new Set(models)].sort().slice(0, 150);
}
async function callProviderChat(provider: Provider, key: string, body: any): Promise<string> {
  const model = String(body.model || '').trim();
  const system = String(body.system || '').slice(0, 12000);
  const prompt = String(body.prompt || '').slice(0, 30000);
  const requestedTokens = Number(body.maxTokens);
  const maxTokens = Number.isFinite(requestedTokens) && requestedTokens > 0
    ? Math.max(512, Math.min(3000, Math.floor(requestedTokens)))
    : 1100;
  const requestedTemperature = Number(body.temperature);
  const temperature = Number.isFinite(requestedTemperature)
    ? Math.max(0, Math.min(1.5, requestedTemperature))
    : 0.78;
  if (!model || model.length > 160 || !prompt) throw new Error('A valid model and non-empty prompt are required.');
  let response: Response;
  if (provider === 'gemini') {
    const cleanModel = model.replace(/^models\//, '');
    response = await timeoutFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      }, 45000,
    );
    if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}. Check the selected model and API key.`);
    const data = await response.json();
    return (data.candidates?.[0]?.content?.parts || []).map((part: any) => part.text || '').join('\n').trim();
  }

  const endpoint = provider === 'groq'
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : provider === 'openai'
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
  if (provider === 'openrouter') {
    const siteUrl = Deno.env.get('FRAMERATE_SITE_URL') || 'https://framerate-studio.app';
    headers['HTTP-Referer'] = siteUrl;
    headers['X-Title'] = 'FrameRate Studio';
  }
  response = await timeoutFetch(endpoint, {
    method: 'POST', headers,
    body: JSON.stringify({
      model, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      temperature, max_tokens: maxTokens,
    }),
  }, 45000);
  if (!response.ok) throw new Error(`${provider} returned HTTP ${response.status}. Check the selected model and account quota.`);
  const data = await response.json();
  return String(data.choices?.[0]?.message?.content || '').trim();
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') || '';
  const origins = allowedOrigins();
  if (!origin || !isAllowedOrigin(origin, origins)) return new Response('Origin not allowed', { status: 403 });
  if (request.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders(origin) });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const publishableKey = getPublishableKey();
    const adminKey = getAdminKey();
    if (!supabaseUrl || !publishableKey || !adminKey) throw new Error('Supabase server keys are not available to this Edge Function.');
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'Sign in to use your cloud AI vault.' }, 401, origin);
    const userClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userResult, error: userError } = await userClient.auth.getUser();
    if (userError || !userResult.user) return json({ error: 'Your session is not valid. Sign in again.' }, 401, origin);
    const userId = userResult.user.id;
    const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');

    if (action === 'status') {
      await consumeCredentialRateLimit(admin, userId, 'status', 120);
      const { data, error } = await admin.from('framerate_user_credentials').select('provider').eq('user_id', userId);
      if (error) throw new Error('Credential table is missing. Run supabase/schema.sql.');
      const credentials = Object.fromEntries(PROVIDERS.map((provider) => [provider, false])) as Record<Provider, boolean>;
      (data || []).forEach((row: any) => { if (isProvider(row.provider)) credentials[row.provider] = true; });
      return json({ credentials }, 200, origin);
    }

    if (action === 'save') {
      await consumeCredentialRateLimit(admin, userId, 'save', 10);
      const incoming = body.credentials && typeof body.credentials === 'object' ? body.credentials as CredentialMap : {};
      const saved: string[] = [];
      for (const provider of PROVIDERS) {
        const secret = incoming[provider];
        if (typeof secret !== 'string' || !secret.trim()) continue;
        if (secret.length > 500) throw new Error(`The ${provider} key is too long to save.`);
        const encrypted = await encryptSecret(secret.trim());
        const { error } = await admin.from('framerate_user_credentials').upsert({
          user_id: userId, provider, ciphertext: encrypted.ciphertext, iv: encrypted.iv, updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider' });
        if (error) throw new Error(`Could not save the ${provider} key. Check the credential table. ${error.message}`);
        saved.push(provider);
      }
      const { data, error } = await admin.from('framerate_user_credentials').select('provider').eq('user_id', userId);
      if (error) throw new Error('Could not refresh saved credential status.');
      const credentials = Object.fromEntries(PROVIDERS.map((provider) => [provider, (data || []).some((row: any) => row.provider === provider)]));
      return json({ saved, credentials }, 200, origin);
    }

    if (action === 'delete') {
      await consumeCredentialRateLimit(admin, userId, 'delete', 20);
      if (!isProvider(body.provider)) return json({ error: 'Unknown AI provider.' }, 400, origin);
      const { error } = await admin.from('framerate_user_credentials').delete().eq('user_id', userId).eq('provider', body.provider);
      if (error) throw new Error(`Could not delete the saved ${body.provider} key.`);
      const { data } = await admin.from('framerate_user_credentials').select('provider').eq('user_id', userId);
      const credentials = Object.fromEntries(PROVIDERS.map((provider) => [provider, (data || []).some((row: any) => row.provider === provider)]));
      return json({ credentials }, 200, origin);
    }

    if (action === 'models' || action === 'chat') {
      if (!isProvider(body.provider)) return json({ error: 'Unknown AI provider.' }, 400, origin);
      await consumeCredentialRateLimit(admin, userId, action, action === 'chat' ? 30 : 45);
      const provider = body.provider;
      const key = await loadCredential(admin, userId, provider);
      if (action === 'models') return json({ models: await callProviderModels(provider, key) }, 200, origin);
      const text = await callProviderChat(provider, key, body);
      if (!text) throw new Error('The AI provider returned an empty response.');
      return json({ text }, 200, origin);
    }

    return json({ error: 'Unknown vault action.' }, 400, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    const status = message === 'RATE_LIMITED' ? 429
      : /not saved|not configured|must decode|too long|valid model|non-empty prompt|Unknown AI provider/i.test(message) ? 400 : 500;
    return json({ error: message === 'RATE_LIMITED' ? 'Too many AI requests. Wait a moment and try again.' : message }, status, origin);
  }
});
