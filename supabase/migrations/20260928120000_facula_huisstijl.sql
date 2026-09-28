-- Huisstijl — één rij per docent met de kleuren, het lettertype, de
-- schoolnaam en het schoollogo dat op lessen, toetsen en rapporten komt.
--
-- Eén rij per gebruiker, dus user_id IS de primary key: een docent heeft
-- één huisstijl, geen lijst. Dat scheelt een aparte id-kolom, maakt een
-- upsert triviaal (on conflict (user_id)) en sluit per constructie uit dat
-- er ooit twee rijen voor dezelfde docent bestaan.
--
-- In tegenstelling tot facula.profiles en facula.usage_counters mag de
-- gebruiker hier WEL zelf schrijven: dit zijn puur eigen voorkeuren zonder
-- gevolgen voor abonnement of quotum. Vandaar volledige eigen CRUD, altijd
-- afgebakend met auth.uid() = user_id.
--
-- Het logo zelf staat niet in deze tabel maar in de private storage-bucket
-- school-logos; hier staat alleen het pad. Zo blijft de rij klein en kan een
-- logo vervangen worden zonder de rest van de huisstijl aan te raken.
--
-- Idempotent: opnieuw draaien mag.

create table if not exists facula.huisstijl (
  user_id uuid primary key references auth.users (id) on delete cascade,
  preset text not null default 'facula'
    check (preset in ('facula', 'mihiriban', 'rustig', 'contrast', 'eigen')),
  -- Kleuren als #RRGGBB in hoofdletters. De check is bewust alleen een
  -- vormcheck: of de combinatie genoeg contrast heeft, wordt afgedwongen in
  -- src/lib/huisstijl/themes.ts en in PUT /api/huisstijl, want die regel
  -- (4,5:1 voor tekst, 3:1 voor accent) is niet in SQL uit te drukken.
  accent text not null default '#16233B' check (accent ~ '^#[0-9A-F]{6}$'),
  tekst text not null default '#2A2620' check (tekst ~ '^#[0-9A-F]{6}$'),
  achtergrond text not null default '#FAF6EF' check (achtergrond ~ '^#[0-9A-F]{6}$'),
  lettertype text not null default 'serif' check (lettertype in ('sans', 'serif')),
  schoolnaam text check (schoolnaam is null or char_length(schoolnaam) <= 120),
  -- Pad binnen de bucket school-logos, altijd '<user_id>/<bestandsnaam>'.
  logo_path text check (logo_path is null or char_length(logo_path) <= 400),
  logo_standaard_aan boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table facula.huisstijl is
  'Eigen huisstijl per docent: kleuren, lettertype, schoolnaam en pad naar het schoollogo in de bucket school-logos.';

alter table facula.huisstijl enable row level security;

drop policy if exists "huisstijl_select_own" on facula.huisstijl;
drop policy if exists "huisstijl_insert_own" on facula.huisstijl;
drop policy if exists "huisstijl_update_own" on facula.huisstijl;
drop policy if exists "huisstijl_delete_own" on facula.huisstijl;

create policy "huisstijl_select_own"
  on facula.huisstijl
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "huisstijl_insert_own"
  on facula.huisstijl
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Zowel using als with check: using bepaalt welke rij bijgewerkt mag worden,
-- with check wat de rij daarna mag zijn. Zonder de tweede zou een docent zijn
-- eigen rij naar een andere user_id kunnen schrijven.
create policy "huisstijl_update_own"
  on facula.huisstijl
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "huisstijl_delete_own"
  on facula.huisstijl
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant usage on schema facula to authenticated;
grant select, insert, update, delete on facula.huisstijl to authenticated;
grant all on facula.huisstijl to service_role;

-- ---------------------------------------------------------------------------
-- Storage: bucket school-logos, privé.
-- ---------------------------------------------------------------------------
-- Privé (public = false), dus een logo is nooit via een raadbare URL op te
-- halen; de app levert het uit via een kortlopende signed URL of leest het
-- server-side. Grootte en bestandstype staan ook op de bucket zelf, zodat een
-- client die de API-route omzeilt en rechtstreeks naar storage schrijft nog
-- steeds tegen dezelfde grenzen aanloopt als POST /api/huisstijl/logo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-logos',
  'school-logos',
  false,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Elke docent mag alleen bij objecten onder zijn eigen map '<auth.uid()>/'.
-- storage.foldername(name) geeft de padonderdelen; het eerste onderdeel moet
-- de eigen user-id zijn. Een pad zonder map (dus zonder '/') levert een lege
-- array op en valt daarmee vanzelf buiten de policy.
drop policy if exists "school_logos_select_own" on storage.objects;
drop policy if exists "school_logos_insert_own" on storage.objects;
drop policy if exists "school_logos_update_own" on storage.objects;
drop policy if exists "school_logos_delete_own" on storage.objects;

create policy "school_logos_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'school-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "school_logos_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'school-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "school_logos_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'school-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'school-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "school_logos_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'school-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
