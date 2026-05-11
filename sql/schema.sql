-- ARCHI Brief — Supabase schema
-- Run this in Supabase SQL Editor.

-- 1) PROFILES — extends auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  categories text[] not null default '{}',
  morning_time time not null default '09:00',
  evening_time time not null default '18:00',
  paused boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2) NEWS_ITEMS — crawled articles (shared, read by everyone)
create table if not exists public.news_items (
  id bigserial primary key,
  source text not null,
  region text not null check (region in ('kr','int')),
  category text not null,
  title text not null,
  excerpt text,
  url text,
  published_at timestamptz,
  crawled_at timestamptz not null default now(),
  unique(url)
);
create index if not exists news_items_region_crawled_idx
  on public.news_items (region, crawled_at desc);

-- 3) DIGESTS — record of emails sent (per-user archive)
create table if not exists public.digests (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  region text not null check (region in ('kr','int','now')),
  sent_at timestamptz not null default now(),
  items jsonb not null
);
create index if not exists digests_user_sent_idx
  on public.digests (user_id, sent_at desc);

-- 4) RLS — row-level security
alter table public.profiles    enable row level security;
alter table public.digests     enable row level security;
alter table public.news_items  enable row level security;

drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
create policy "read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "read own digests" on public.digests;
create policy "read own digests" on public.digests for select using (auth.uid() = user_id);

drop policy if exists "read all news" on public.news_items;
create policy "read all news" on public.news_items for select using (true);

-- 5) Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
