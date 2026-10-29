import { createClient } from 'npm:@supabase/supabase-js@2';

const cache = new Map<string, { until: number; body: unknown }>();
const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
function allowedOrigins(): string[] {
  const defaults = [
    'https://framerate-studio.netlify.app',
    'https://framerate-studio.ybenlahcen7.workers.dev',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
  ];
  const configured = (Deno.env.get('FRAMERATE_ALLOWED_ORIGINS') || '')
    .split(',').map((value) => value.trim()).filter(Boolean);
  return [...new Set([...defaults, ...configured])];
}

function isAllowedOrigin(origin: string, configured: string[]): boolean {
  if (configured.includes(origin)) return true;
  // Permit only HTTPS Deploy Previews for this exact Netlify site slug.
  // This is intentionally narrower than accepting every *.netlify.app origin.
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' &&
      /^deploy-preview-\d+--framerate-studio\.netlify\.app$/.test(parsed.hostname) &&
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
function getAdminKey(): string {
  const modern = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (modern) { try { const parsed = JSON.parse(modern); if (parsed.default) return parsed.default; } catch (_) { /* legacy fallback */ } }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}
async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function requestTimeout(url: string, init: RequestInit, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}
async function consumeRateLimit(identity: string, max = 120) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const adminKey = getAdminKey();
  if (!supabaseUrl || !adminKey) throw new Error('The movie proxy rate-limit service is not configured.');
  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const keyHash = await sha256(identity);
  const { data, error } = await admin.rpc('framerate_consume_rate_limit', {
    p_key_hash: keyHash, p_window_seconds: 60, p_max_requests: max,
  });
  if (error) throw new Error('The movie proxy rate-limit table/function is missing. Run supabase/schema.sql.');
  if (data !== true) throw new Error('RATE_LIMITED');
}
function tmdbUrl(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const token = Deno.env.get('TMDB_API_READ_ACCESS_TOKEN') || '';
  const apiKey = Deno.env.get('TMDB_API_KEY') || '';
  if (!token && !apiKey) throw new Error('The site owner has not configured the TMDB server secret yet.');
  const url = new URL(`https://api.themoviedb.org/3/${path.replace(/^\/+/, '')}`);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && String(value)) url.searchParams.set(key, String(value));
  if (!token && apiKey) url.searchParams.set('api_key', apiKey);
  return { url: url.toString(), headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' } };
}
async function upstreamJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const response = await requestTimeout(url, { headers });
  if (!response.ok) throw new Error(`The movie data provider returned HTTP ${response.status}.`);
  return await response.json();
}
async function cached(key: string, ttlMs: number, fetcher: () => Promise<unknown>) {
  const now = Date.now();
  const current = cache.get(key);
  if (current && current.until > now) return current.body;
  const body = await fetcher();
  if (cache.size > 350) {
    for (const [entry, item] of cache.entries()) if (item.until <= now) cache.delete(entry);
    while (cache.size > 350) cache.delete(cache.keys().next().value!);
  }
  cache.set(key, { until: now + ttlMs, body });
  return body;
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') || '';
  if (!origin || !isAllowedOrigin(origin, allowedOrigins())) return new Response('Origin not allowed', { status: 403 });
  if (request.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders(origin) });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

  try {
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip';
    await consumeRateLimit(`movie:${origin}:${clientIp}`, 120);
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');
    let result: unknown;

    if (action === 'search') {
      const query = String(body.query || '').trim().slice(0, 180);
      if (!query) return json({ results: [] }, 200, origin);
      const page = Math.min(500, Math.max(1, Math.floor(Number(body.page) || 1)));
      const requestInfo = tmdbUrl('search/movie', { query, include_adult: false, language: 'en-US', page });
      result = await cached(`search:${query.toLowerCase()}:${page}`, 5 * 60_000, () => upstreamJson(requestInfo.url, requestInfo.headers));
    } else if (action === 'discover') {
      const page = Math.min(500, Math.max(1, Math.floor(Number(body.page) || 1)));
      const params: Record<string, string | number | boolean | undefined> = {
        page, include_adult: false, include_video: false, language: 'en-US',
      };
      const allowedSorts = new Set([
        'popularity.desc', 'popularity.asc', 'vote_average.desc', 'vote_average.asc',
        'primary_release_date.desc', 'primary_release_date.asc', 'release_date.desc',
        'revenue.desc', 'original_title.asc'
      ]);
      const sortBy = String(body.sort_by || 'popularity.desc');
      params.sort_by = allowedSorts.has(sortBy) ? sortBy : 'popularity.desc';
      const genreFilter = (value: unknown) => {
        const valueText = String(value || '').trim();
        return valueText && valueText.length <= 160 && /^\d+(,\d+)*$/.test(valueText) ? valueText : undefined;
      };
      const dateFilter = (value: unknown) => {
        const valueText = String(value || '').trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(valueText) ? valueText : undefined;
      };
      const numericFilter = (value: unknown, min: number, max: number) => {
        const n = Number(value);
        return value !== undefined && value !== null && value !== '' && Number.isFinite(n) && n >= min && n <= max ? n : undefined;
      };
      const originalLanguage = String(body.with_original_language || '').trim().toLowerCase();
      params.with_genres = genreFilter(body.with_genres);
      params.without_genres = genreFilter(body.without_genres);
      params['primary_release_date.gte'] = dateFilter(body.release_date_gte);
      params['primary_release_date.lte'] = dateFilter(body.release_date_lte);
      params['vote_average.gte'] = numericFilter(body.vote_average_gte, 0, 10);
      params['vote_count.gte'] = numericFilter(body.vote_count_gte, 0, 1000000);
      params['with_runtime.gte'] = numericFilter(body.with_runtime_gte, 0, 1000);
      params['with_runtime.lte'] = numericFilter(body.with_runtime_lte, 0, 1000);
      params.with_original_language = /^[a-z]{2}$/.test(originalLanguage) && originalLanguage !== 'xx' ? originalLanguage : undefined;
      if (params['primary_release_date.gte'] && params['primary_release_date.lte'] &&
          String(params['primary_release_date.gte']) > String(params['primary_release_date.lte'])) {
        return json({ error: 'Release date range is invalid.' }, 400, origin);
      }
      if (params['with_runtime.gte'] !== undefined && params['with_runtime.lte'] !== undefined &&
          Number(params['with_runtime.gte']) > Number(params['with_runtime.lte'])) {
        return json({ error: 'Runtime range is invalid.' }, 400, origin);
      }
      const cacheKey = 'discover:' + JSON.stringify(params);
      const requestInfo = tmdbUrl('discover/movie', params);
      result = await cached(cacheKey, 5 * 60_000, () => upstreamJson(requestInfo.url, requestInfo.headers));
    } else if (action === 'details') {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return json({ error: 'A valid TMDB movie ID is required.' }, 400, origin);
      const requestInfo = tmdbUrl(`movie/${id}`, {
        append_to_response: 'credits,images,videos', include_image_language: 'en,null', language: 'en-US',
      });
      result = await cached(`details:${id}`, 60 * 60_000, () => upstreamJson(requestInfo.url, requestInfo.headers));
    } else if (action === 'popular') {
      const page = Math.min(20, Math.max(1, Number(body.page) || 1));
      const requestInfo = tmdbUrl('movie/popular', { language: 'en-US', page });
      result = await cached(`popular:${page}`, 15 * 60_000, () => upstreamJson(requestInfo.url, requestInfo.headers));
    } else if (action === 'fanart') {
      const id = String(body.id || '').trim().slice(0, 40);
      if (!/^[a-zA-Z0-9]+$/.test(id)) return json({ error: 'A valid movie ID is required.' }, 400, origin);
      const key = Deno.env.get('FANART_API_KEY') || '';
      if (!key) throw new Error('The site owner has not configured the Fanart.tv server secret yet.');
      result = await cached(`fanart:${id}`, 6 * 60 * 60_000, () => upstreamJson(`https://webservice.fanart.tv/v3/movies/${encodeURIComponent(id)}?api_key=${encodeURIComponent(key)}`));
    } else {
      return json({ error: 'Unknown movie-data action.' }, 400, origin);
    }
    return json(result, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Movie proxy request failed.';
    if (message === 'RATE_LIMITED') return json({ error: 'Too many movie-data requests. Wait a moment and try again.' }, 429, origin);
    const status = /not configured/i.test(message) ? 503 : /valid TMDB|valid movie ID|Unknown movie/i.test(message) ? 400 : 502;
    return json({ error: message }, status, origin);
  }
});
