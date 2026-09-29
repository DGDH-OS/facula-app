-- Wat Supabase normaal meebrengt, nagebouwd in een wegwerp-Postgres.
--
-- Dit bestand is GEEN migratie en hoort nooit op een echte database. Het
-- bestaat zodat scripts/db-test.sh de migraties uit supabase/migrations/ kan
-- toepassen op een lege database in Docker en daarna de policies echt kan
-- testen met rollen, in plaats van ze te lezen en te hopen.
--
-- Twee soorten stubs:
--
--   1. Wat Supabase zelf levert: de rollen anon/authenticated/service_role, het
--      schema auth met auth.users en auth.uid()/auth.role(), en het schema
--      storage met buckets en objects. De implementatie van auth.uid()
--      hieronder is dezelfde als die van Supabase: hij leest de JWT-claim uit
--      een sessie-instelling, zodat een test kan zeggen "ik ben nu deze
--      gebruiker".
--
--   2. De basistabellen van facula die op de live database met de hand zijn
--      aangemaakt en waarvoor dus geen migratiebestand bestaat: profiles,
--      lessons, tests, reports en usage_counters, met de policies zoals ze
--      daar staan. Ze staan hier zo dicht op de werkelijkheid als de code ze
--      gebruikt; wijkt live hiervan af, dan is deze test daar blind voor. Dat
--      is de bekende beperking van deze opzet, en de reden dat een
--      live-verificatie na de deploy nog steeds hoort te gebeuren.

-- ---------------------------------------------------------------------------
-- Rollen
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- auth
-- ---------------------------------------------------------------------------
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

-- Zelfde vorm als bij Supabase: de gebruiker komt uit de JWT-claim die als
-- sessie-instelling is gezet. In de tests: set local request.jwt.claim.sub.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to service_role;

-- ---------------------------------------------------------------------------
-- storage
-- ---------------------------------------------------------------------------
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id) on delete cascade,
  name text not null,
  owner uuid,
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);

alter table storage.objects enable row level security;

grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated;
grant all on storage.objects to service_role;
grant all on storage.buckets to service_role;

-- ---------------------------------------------------------------------------
-- facula: de basistabellen zonder migratiebestand
-- ---------------------------------------------------------------------------
create schema if not exists facula;
grant usage on schema facula to anon, authenticated, service_role;

create table if not exists facula.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  subscription_status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create table if not exists facula.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists facula.tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists facula.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists facula.usage_counters (
  user_id uuid primary key references auth.users (id) on delete cascade,
  period_start date not null default (date_trunc('month', now()))::date,
  lessons_generated integer not null default 0,
  tests_generated integer not null default 0,
  reports_generated integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Trigger-functie waarnaar de hardening-migratie verwijst (revoke execute).
-- Body doet hier hetzelfde als op live: bij een nieuwe auth-gebruiker een
-- profielrij aanmaken.
create or replace function facula.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into facula.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

alter table facula.profiles enable row level security;
alter table facula.lessons enable row level security;
alter table facula.tests enable row level security;
alter table facula.reports enable row level security;
alter table facula.usage_counters enable row level security;

-- De policies zoals ze op live staan: eigen rijen, op user_id.
drop policy if exists "lessons_own" on facula.lessons;
create policy "lessons_own" on facula.lessons for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tests_own" on facula.tests;
create policy "tests_own" on facula.tests for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reports_own" on facula.reports;
create policy "reports_own" on facula.reports for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on facula.lessons to authenticated;
grant select, insert, update, delete on facula.tests to authenticated;
grant select, insert, update, delete on facula.reports to authenticated;
grant select, insert, update, delete on facula.profiles to authenticated;
grant select, insert, update, delete on facula.usage_counters to authenticated;
grant all on all tables in schema facula to service_role;
