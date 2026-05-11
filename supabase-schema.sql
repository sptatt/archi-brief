-- 1) Profile per user (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  categories text[] default '{}',
  send_morning time default '09:00:00',
  send_evening time default '18:00:00',
  paused boolean default false,
  created_at timestamptz default now()
);

-- 2) News items collected from crawlers
create table if not exists news_items (
  id bigserial primary key,
  title text not null,
  url text unique not null,
  source text,
  excerpt text,
  category text,
  region text not null check (region in ('kr','int')),
  published_at timestamptz,
  fetched_at timestamptz default now()
);
create index if not exists idx_news_region_date on news_items(region, published_at desc);

-- 3) Sent-digest archive
create table if not exists digests (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  slot text check (slot in ('morning','evening','now')),
  region text,
  items jsonb not null,
  sent_at timestamptz default now()
);
create index if not exists idx_digests_user on digests(user_id, sent_at desc);

-- 4) Row Level Security
alter table profiles enable row level security;
alter table digests enable row level security;
alter table news_items enable row level security;

drop policy if exists "own profile read" on profiles;
drop policy if exists "own profile write" on profiles;
drop policy if exists "own digests read" on digests;
drop policy if exists "read news" on news_items;

create policy "own profile read"  on profiles for select using (auth.uid() = id);
create policy "own profile write" on profiles for insert with check (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);
create policy "own digests read"  on digests for select using (auth.uid() = user_id);
create policy "read news"         on news_items for select using (true);

-- 5) Auto-create profile when new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name) values (new.id, new.raw_user_meta_data->>'name');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
