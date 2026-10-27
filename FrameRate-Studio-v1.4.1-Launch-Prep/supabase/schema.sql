-- FrameRate Studio account-scoped cloud sync.
-- Run this whole file in Supabase Dashboard -> SQL Editor.
-- One row per authenticated user; RLS prevents reading/writing another user's row.

create table if not exists public.framerate_user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.framerate_user_data enable row level security;

-- Do not allow anonymous guests to read or write cloud snapshots.
revoke all on table public.framerate_user_data from public, anon, authenticated;
grant select, insert, update, delete on table public.framerate_user_data to authenticated;

drop policy if exists "FrameRate users can select their own data" on public.framerate_user_data;
drop policy if exists "FrameRate users can insert their own data" on public.framerate_user_data;
drop policy if exists "FrameRate users can update their own data" on public.framerate_user_data;
drop policy if exists "FrameRate users can delete their own data" on public.framerate_user_data;

create policy "FrameRate users can select their own data"
on public.framerate_user_data for select to authenticated
using ((select auth.uid()) = user_id);

create policy "FrameRate users can insert their own data"
on public.framerate_user_data for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "FrameRate users can update their own data"
on public.framerate_user_data for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "FrameRate users can delete their own data"
on public.framerate_user_data for delete to authenticated
using ((select auth.uid()) = user_id);


-- Private AI provider credentials. Values are AES-GCM encrypted by the credential-vault
-- Edge Function before insertion; clients have no direct table permissions.
create table if not exists public.framerate_user_credentials (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('groq', 'openai', 'gemini', 'openrouter')),
  ciphertext text not null,
  iv text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.framerate_user_credentials enable row level security;
revoke all on table public.framerate_user_credentials from public, anon, authenticated;
grant all on table public.framerate_user_credentials to service_role;
-- Intentionally no authenticated policies/grants: only the server-side vault function
-- uses its privileged key after verifying the caller's Supabase session.

-- Simple database-backed fixed-window limiter shared by movie-data proxy instances.
create table if not exists public.framerate_proxy_rate_limits (
  bucket_key text primary key,
  window_start timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.framerate_proxy_rate_limits enable row level security;
revoke all on table public.framerate_proxy_rate_limits from public, anon, authenticated;
grant all on table public.framerate_proxy_rate_limits to service_role;

drop function if exists public.framerate_consume_rate_limit(text, integer, integer);
create function public.framerate_consume_rate_limit(
  p_key_hash text,
  p_window_seconds integer,
  p_max_requests integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_key_hash is null or length(p_key_hash) < 32 or p_window_seconds < 1 or p_window_seconds > 3600 or p_max_requests < 1 then
    return false;
  end if;

  insert into public.framerate_proxy_rate_limits as current_bucket
    (bucket_key, window_start, request_count, updated_at)
  values (p_key_hash, now(), 1, now())
  on conflict (bucket_key) do update set
    window_start = case
      when current_bucket.window_start <= now() - make_interval(secs => p_window_seconds) then now()
      else current_bucket.window_start
    end,
    request_count = case
      when current_bucket.window_start <= now() - make_interval(secs => p_window_seconds) then 1
      else current_bucket.request_count + 1
    end,
    updated_at = now()
  returning request_count into v_count;

  return v_count <= p_max_requests;
end;
$$;

revoke all on function public.framerate_consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.framerate_consume_rate_limit(text, integer, integer) to service_role;
