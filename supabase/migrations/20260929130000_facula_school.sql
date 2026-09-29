-- Schoolaccount: scholen, secties, leden, uitnodigingen en de gedeelde
-- sectiebibliotheek.
--
-- Waarom dit er is: Facula was één docent, één account. Een school werkt in
-- secties, met een beheerder die inkoopt en een sectievoorzitter die bepaalt
-- wat de sectiestandaard is. Zonder dat model is er geen schoollicentie te
-- verkopen, hoe goed de lessen ook zijn.
--
-- ---------------------------------------------------------------------------
-- De vier keuzes die de rest van dit bestand verklaren
-- ---------------------------------------------------------------------------
--
-- 1. EEN DOCENT HOORT BIJ HOOGSTENS EEN SCHOOL (actief).
--    Afgedwongen met een partiële unieke index op user_id waar status =
--    'active'. Dat is geen beperking om de beperking: zodra iemand bij twee
--    scholen actief lid kan zijn, is niet meer te zeggen welk quotum geldt en
--    welke huisstijl afgedwongen wordt. Twee antwoorden op die vraag is er een
--    te veel. Wisselen van school kan: het oude lidmaatschap gaat op
--    'inactive', het nieuwe wordt actief.
--
-- 2. ELKE TOEGANGSVRAAG LOOPT VIA DRIE SECURITY DEFINER-FUNCTIES.
--    facula.mijn_school_id(), facula.mijn_school_rol() en
--    facula.mijn_sectie_id() lezen het lidmaatschap van auth.uid(). De
--    policies op alle schooltabellen gebruiken die functies in plaats van zelf
--    in school_members te kijken. Dat moet ook: een policy op school_members
--    die school_members bevraagt, is oneindige recursie. Definer-functies
--    omzeilen RLS en breken die cirkel.
--
-- 3. DE COMMERCIELE KOLOMMEN ZIJN NIET DOOR DE KLANT TE WIJZIGEN.
--    Een beheerder mag de naam en de huisstijl van zijn school aanpassen.
--    plan, seat_limit, pilot_ends_at, quota_mode, monthly_pool en domains niet:
--    dat zijn de afspraken uit het contract. Dat is hier geen policy maar een
--    kolomrecht (grant update (kolom, ...)), want een policy kan niet zeggen
--    WELKE kolom mag. Zonder dit onderscheid kan elke beheerder zijn eigen
--    licentie oprekken en zichzelf onbeperkt quotum geven.
--
-- 4. IN DE SECTIEBIBLIOTHEEK STAAT EEN MOMENTOPNAME, GEEN VERWIJZING.
--    facula.section_shares bewaart input en output van de gedeelde les of
--    toets als jsonb, en niet een content_id naar facula.lessons. Twee redenen:
--    delen hoort een vast moment te zijn (wat de sectie ziet verandert niet
--    doordat de maker later iets bijschaaft), en een verwijzing zou een lezer
--    dwingen om langs de RLS van de eigenaar te kijken. Dat laatste is precies
--    het soort doorgeefluik waarmee per ongeluk andermans materiaal
--    bereikbaar wordt.
--    RAPPORTTEKSTEN KUNNEN NIET GEDEELD WORDEN. Daar staat een leerling in, en
--    delen met een sectie is geen doel waarvoor die gegevens verzameld zijn
--    (AVG, doelbinding). De check op `kind` staat alleen 'lessons' en 'tests'
--    toe, dus dat is niet later per ongeluk aan te zetten.
--
-- ---------------------------------------------------------------------------
-- Wat hier NIET in zit, met opzet
-- ---------------------------------------------------------------------------
-- * SSO (Entra ID, Google Workspace, Entree Federatie). Een lid wordt hier
--   altijd een bestaande auth.users-rij die een uitnodiging accepteert.
--   TODO(SSO): bij SSO komt er een tweede weg naar binnen, namelijk
--   "gebruiker uit onze tenant, dus automatisch lid van school X". Dat wordt
--   een extra tak in facula.accept_school_invite of een broertje ernaast; het
--   ledenmodel en de policies hieronder blijven hetzelfde.
-- * Facturatie. TODO(billing): plan/seat_limit/pilot_ends_at zijn de velden
--   waar een Stripe-abonnement per school straks op landt. Ze staan bewust nu
--   al in de tabel, zodat dat later geen migratie op een gevulde tabel wordt.
--   De quotumfunctie leest ze al.
--
-- Idempotent: opnieuw draaien mag (create ... if not exists, drop policy if
-- exists, create or replace function).
--
-- ---------------------------------------------------------------------------
-- Terugdraaien
-- ---------------------------------------------------------------------------
-- In deze volgorde, want de functies hangen aan de tabellen en de policies aan
-- de functies:
--
--   drop policy if exists "school_logos_select_member" on storage.objects;
--   drop policy if exists "school_logos_insert_beheerder" on storage.objects;
--   drop policy if exists "school_logos_update_beheerder" on storage.objects;
--   drop policy if exists "school_logos_delete_beheerder" on storage.objects;
--   drop function if exists facula.mijn_verbruik();
--   drop function if exists facula.set_school_logo(text);
--   drop function if exists facula.save_with_quota_v2(text, jsonb, jsonb);
--   drop function if exists facula.accept_school_invite(text);
--   drop function if exists facula.copy_share_to_own(uuid);
--   drop function if exists facula.school_usage_overzicht();
--   drop function if exists facula.school_huisstijl();
--   drop function if exists facula.is_school_beheerder();
--   drop function if exists facula.mijn_sectie_id();
--   drop function if exists facula.mijn_school_rol();
--   drop function if exists facula.mijn_school_id();
--   drop table if exists facula.section_shares;
--   drop table if exists facula.school_usage_counters;
--   drop table if exists facula.school_invites;
--   drop table if exists facula.school_members;
--   drop table if exists facula.sections;
--   drop table if exists facula.schools;
--
-- facula.save_with_quota (de huidige versie) wordt hier NIET aangeraakt en
-- blijft werken. Het weghalen daarvan staat apart in supabase/post-deploy/,
-- pas toe te passen ná de deploy die op v2 overstapt.

-- ===========================================================================
-- 1. Tabellen
-- ===========================================================================

create table if not exists facula.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  -- E-maildomeinen van de school, in kleine letters en zonder apenstaartje
  -- ('sintjan.nl'). Een uitnodiging mag geaccepteerd worden door wie op het
  -- uitgenodigde adres zit, of door wie een adres op een van deze domeinen
  -- heeft. Bewust alleen door ons te wijzigen (zie keuze 3): dit is de grens
  -- van wie er binnen kan komen.
  domains text[] not null default '{}',
  plan text not null default 'pilot' check (plan in ('pilot', 'actief', 'gepauzeerd')),
  -- Einddatum van een pilot. Null = geen einddatum afgesproken.
  pilot_ends_at timestamptz,
  -- Hoeveel docenten er actief lid mogen zijn. In de UI heet dit een
  -- "docentplek", nooit een "seat".
  seat_limit integer not null default 10 check (seat_limit between 1 and 5000),
  -- 'onbeperkt': elke docent van deze school genereert zonder maandlimiet.
  -- 'pool': de hele school heeft per soort per maand samen monthly_pool stuks.
  quota_mode text not null default 'onbeperkt' check (quota_mode in ('onbeperkt', 'pool')),
  monthly_pool integer check (monthly_pool is null or monthly_pool between 1 and 100000),

  -- De schoolhuisstijl. Zelfde kolommen en zelfde checks als
  -- facula.huisstijl, zodat resolveHuisstijl() in de app er niets nieuws van
  -- hoeft te leren.
  huisstijl_preset text not null default 'facula'
    check (huisstijl_preset in ('facula', 'mihiriban', 'rustig', 'contrast', 'eigen')),
  accent text not null default '#16233B' check (accent ~ '^#[0-9A-F]{6}$'),
  tekst text not null default '#2A2620' check (tekst ~ '^#[0-9A-F]{6}$'),
  achtergrond text not null default '#FAF6EF' check (achtergrond ~ '^#[0-9A-F]{6}$'),
  lettertype text not null default 'serif' check (lettertype in ('sans', 'serif')),
  -- Pad in de bucket school-logos: exact 'school/<school_id>/logo'. Zelfde
  -- reden als bij het docentlogo: één vast pad per school, dus een upload
  -- overschrijft zichzelf en geen opruiming hoeft ooit een ander object te
  -- verwijderen.
  logo_path text check (
    logo_path is null
    or logo_path ~ '^school/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
  ),
  logo_mime text check (logo_mime is null or logo_mime in ('image/png', 'image/jpeg')),
  -- Staat dit aan, dan gebruiken alle docenten van deze school de
  -- schoolhuisstijl en kunnen ze hun eigen kleuren niet meer laten winnen.
  enforce_huisstijl boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table facula.schools is
  'Een school met een licentie. Beheerders mogen alleen naam en huisstijl wijzigen; plan, seat_limit, pilot_ends_at, quota_mode, monthly_pool en domains zijn contractvelden en alleen voor service_role.';

create table if not exists facula.sections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references facula.schools (id) on delete cascade,
  -- Meestal een vaknaam ("Maatschappijleer"), soms een team ("Onderbouw").
  naam text not null check (char_length(naam) between 1 and 120),
  created_at timestamptz not null default now(),
  -- Twee secties met dezelfde naam binnen één school is altijd een vergissing.
  unique (school_id, naam),
  -- Nodig voor de samengestelde foreign keys hieronder: die dwingen af dat een
  -- sectie bij dezelfde school hoort als het lid of de gedeelde les. Zonder
  -- deze unieke sleutel kan een lid van school A naar een sectie van school B
  -- verwijzen, en dan lekt de bibliotheek over de schoolgrens.
  unique (id, school_id)
);

comment on table facula.sections is
  'Secties binnen een school. De unieke sleutel (id, school_id) bestaat zodat leden en gedeeld materiaal via een samengestelde foreign key alleen naar een sectie van hun eigen school kunnen wijzen.';

create table if not exists facula.school_members (
  school_id uuid not null references facula.schools (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'docent'
    check (role in ('beheerder', 'sectievoorzitter', 'docent')),
  section_id uuid,
  status text not null default 'active'
    check (status in ('invited', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (school_id, user_id),
  -- De sectie moet van dezelfde school zijn. Zie de unieke sleutel op
  -- facula.sections. on delete set null: een verwijderde sectie laat het lid
  -- staan, zonder sectie.
  foreign key (section_id, school_id)
    references facula.sections (id, school_id) on delete set null
);

comment on table facula.school_members is
  'Wie bij welke school hoort en in welke rol. Hoogstens één actief lidmaatschap per gebruiker, zie school_members_een_actieve_school.';

-- Keuze 1: hoogstens één actief lidmaatschap per gebruiker.
create unique index if not exists school_members_een_actieve_school
  on facula.school_members (user_id)
  where status = 'active';

create index if not exists school_members_school_idx
  on facula.school_members (school_id, status);

create table if not exists facula.school_invites (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references facula.schools (id) on delete cascade,
  -- Het adres waar de uitnodiging voor bedoeld is, in kleine letters.
  email text not null check (char_length(email) between 5 and 200 and position('@' in email) > 1),
  role text not null default 'docent'
    check (role in ('beheerder', 'sectievoorzitter', 'docent')),
  section_id uuid,
  -- SHA-256 van het token, als 64 hexcijfers. Het token zelf staat NERGENS in
  -- de database: het wordt één keer gegenereerd in de route, één keer aan de
  -- beheerder getoond, en daarna is alleen deze hash er nog. Wie de database
  -- leest kan dus geen uitnodiging accepteren. Hashen gebeurt in Node en niet
  -- in SQL, zodat deze migratie geen pgcrypto nodig heeft.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (section_id, school_id)
    references facula.sections (id, school_id) on delete set null
);

comment on table facula.school_invites is
  'Open uitnodigingen. Bevat alleen de SHA-256 van het token, nooit het token zelf; accepteren loopt via facula.accept_school_invite(token_hash).';

-- Eén open uitnodiging per adres per school. Een tweede keer uitnodigen
-- vervangt de eerste (de route verwijdert de open uitnodiging eerst), zodat er
-- nooit twee geldige links naast elkaar leven.
create unique index if not exists school_invites_een_open_per_email
  on facula.school_invites (school_id, lower(email))
  where accepted_at is null;

create table if not exists facula.school_usage_counters (
  school_id uuid not null references facula.schools (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null default (date_trunc('month', now()))::date,
  lessons_generated integer not null default 0 check (lessons_generated >= 0),
  tests_generated integer not null default 0 check (tests_generated >= 0),
  reports_generated integer not null default 0 check (reports_generated >= 0),
  updated_at timestamptz not null default now(),
  primary key (school_id, user_id)
);

comment on table facula.school_usage_counters is
  'Verbruik per docent per school per maand. Voedt zowel de poollimiet (som over de school) als het gebruiksoverzicht in het beheerpaneel. Bevat aantallen, nooit inhoud.';

create index if not exists school_usage_counters_school_idx
  on facula.school_usage_counters (school_id, period_start);

create table if not exists facula.section_shares (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references facula.schools (id) on delete cascade,
  section_id uuid not null,
  -- Alleen lessen en toetsen. Zie keuze 4: een rapporttekst gaat over een
  -- leerling en wordt daarom nooit gedeeld.
  kind text not null check (kind in ('lessons', 'tests')),
  owner_id uuid not null references auth.users (id) on delete cascade,
  titel text not null check (char_length(titel) between 1 and 300),
  -- Momentopname, geen verwijzing. Zie keuze 4.
  input jsonb not null,
  output jsonb not null,
  is_sectiestandaard boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (section_id, school_id)
    references facula.sections (id, school_id) on delete cascade
);

comment on table facula.section_shares is
  'Gedeelde lessen en toetsen per sectie, als momentopname (input/output in jsonb). Nooit rapportteksten: daar staat een leerling in.';

create index if not exists section_shares_sectie_idx
  on facula.section_shares (section_id, created_at desc);

-- ===========================================================================
-- 2. Wie ben ik, waar hoor ik bij (security definer, zie keuze 2)
-- ===========================================================================
--
-- Alle drie stable en met een lege search_path. Ze staan in de policies
-- hieronder, dus ze worden per rij aangeroepen: stable laat Postgres het
-- resultaat binnen één statement hergebruiken.

create or replace function facula.mijn_school_id()
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select m.school_id
  from facula.school_members m
  where m.user_id = auth.uid()
    and m.status = 'active'
  limit 1;
$$;

comment on function facula.mijn_school_id() is
  'De school van het actieve lidmaatschap van auth.uid(), of null. Security definer, zodat policies op school_members hem kunnen gebruiken zonder recursie.';

create or replace function facula.mijn_school_rol()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select m.role
  from facula.school_members m
  where m.user_id = auth.uid()
    and m.status = 'active'
  limit 1;
$$;

comment on function facula.mijn_school_rol() is
  'De rol van auth.uid() binnen zijn actieve school: beheerder, sectievoorzitter of docent. Null zonder lidmaatschap.';

create or replace function facula.mijn_sectie_id()
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select m.section_id
  from facula.school_members m
  where m.user_id = auth.uid()
    and m.status = 'active'
  limit 1;
$$;

comment on function facula.mijn_sectie_id() is
  'De sectie van auth.uid() binnen zijn actieve school, of null.';

create or replace function facula.is_school_beheerder()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from facula.school_members m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'beheerder'
  );
$$;

comment on function facula.is_school_beheerder() is
  'Of auth.uid() beheerder is van zijn actieve school. Gebruikt in policies en in de storage-policies voor het schoollogo.';

revoke execute on function facula.mijn_school_id() from public, anon;
revoke execute on function facula.mijn_school_rol() from public, anon;
revoke execute on function facula.mijn_sectie_id() from public, anon;
revoke execute on function facula.is_school_beheerder() from public, anon;
grant execute on function facula.mijn_school_id() to authenticated, service_role;
grant execute on function facula.mijn_school_rol() to authenticated, service_role;
grant execute on function facula.mijn_sectie_id() to authenticated, service_role;
grant execute on function facula.is_school_beheerder() to authenticated, service_role;

-- ===========================================================================
-- 3. RLS
-- ===========================================================================

alter table facula.schools enable row level security;
alter table facula.sections enable row level security;
alter table facula.school_members enable row level security;
alter table facula.school_invites enable row level security;
alter table facula.school_usage_counters enable row level security;
alter table facula.section_shares enable row level security;

-- --- schools ---------------------------------------------------------------
drop policy if exists "schools_select_own" on facula.schools;
drop policy if exists "schools_update_beheerder" on facula.schools;

-- Elk lid ziet zijn eigen school (naam en huisstijl heeft de app nodig).
create policy "schools_select_own"
  on facula.schools
  for select
  to authenticated
  using (id = facula.mijn_school_id());

-- Alleen de beheerder mag wijzigen, en alleen zijn eigen school. WELKE
-- kolommen, regelt het kolomrecht onderaan dit blok (keuze 3).
create policy "schools_update_beheerder"
  on facula.schools
  for update
  to authenticated
  using (id = facula.mijn_school_id() and facula.is_school_beheerder())
  with check (id = facula.mijn_school_id() and facula.is_school_beheerder());

-- Geen insert- en geen delete-policy: een school aanmaken of opheffen doen wij
-- (service_role), niet de klant. Een beheerder die zijn school kan verwijderen
-- kan in één klik al het materiaal van al zijn docenten weggooien.

-- --- sections --------------------------------------------------------------
drop policy if exists "sections_select_own_school" on facula.sections;
drop policy if exists "sections_insert_beheerder" on facula.sections;
drop policy if exists "sections_update_beheerder" on facula.sections;
drop policy if exists "sections_delete_beheerder" on facula.sections;

create policy "sections_select_own_school"
  on facula.sections
  for select
  to authenticated
  using (school_id = facula.mijn_school_id());

create policy "sections_insert_beheerder"
  on facula.sections
  for insert
  to authenticated
  with check (school_id = facula.mijn_school_id() and facula.is_school_beheerder());

create policy "sections_update_beheerder"
  on facula.sections
  for update
  to authenticated
  using (school_id = facula.mijn_school_id() and facula.is_school_beheerder())
  with check (school_id = facula.mijn_school_id() and facula.is_school_beheerder());

create policy "sections_delete_beheerder"
  on facula.sections
  for delete
  to authenticated
  using (school_id = facula.mijn_school_id() and facula.is_school_beheerder());

-- --- school_members --------------------------------------------------------
drop policy if exists "school_members_select_own_school" on facula.school_members;
drop policy if exists "school_members_update_beheerder" on facula.school_members;
drop policy if exists "school_members_delete_beheerder" on facula.school_members;

-- Iedereen in de school ziet wie er nog in zit. Dat is nodig om materiaal te
-- kunnen delen met een sectie, en het is dezelfde informatie als de gang op
-- school: wie is hier collega.
create policy "school_members_select_own_school"
  on facula.school_members
  for select
  to authenticated
  using (school_id = facula.mijn_school_id());

create policy "school_members_update_beheerder"
  on facula.school_members
  for update
  to authenticated
  using (school_id = facula.mijn_school_id() and facula.is_school_beheerder())
  with check (school_id = facula.mijn_school_id() and facula.is_school_beheerder());

create policy "school_members_delete_beheerder"
  on facula.school_members
  for delete
  to authenticated
  using (school_id = facula.mijn_school_id() and facula.is_school_beheerder());

-- Geen insert-policy en verderop geen insert-recht: lid worden kan alleen via
-- facula.accept_school_invite(). Anders zou een beheerder een willekeurige
-- user_id kunnen intypen en iemand zonder diens toestemming aan zijn school
-- hangen, met diens materiaal onder de schoolhuisstijl.

-- --- school_invites --------------------------------------------------------
drop policy if exists "school_invites_select_beheerder" on facula.school_invites;
drop policy if exists "school_invites_insert_beheerder" on facula.school_invites;
drop policy if exists "school_invites_delete_beheerder" on facula.school_invites;

-- Alleen de beheerder, want hier staan e-mailadressen van collega's in. Een
-- gewone docent heeft er niets te zoeken.
create policy "school_invites_select_beheerder"
  on facula.school_invites
  for select
  to authenticated
  using (school_id = facula.mijn_school_id() and facula.is_school_beheerder());

create policy "school_invites_insert_beheerder"
  on facula.school_invites
  for insert
  to authenticated
  with check (
    school_id = facula.mijn_school_id()
    and facula.is_school_beheerder()
    -- Een uitnodiging kan nooit als geaccepteerd worden ingevoerd: dat is iets
    -- wat accept_school_invite doet, niet iets wat je meestuurt.
    and accepted_at is null
    and accepted_by is null
    -- Bovengrens op de geldigheid. Een uitnodiging die een jaar open staat is
    -- een sleutel die een jaar onder de mat ligt.
    and expires_at > now()
    and expires_at < now() + interval '30 days'
  );

create policy "school_invites_delete_beheerder"
  on facula.school_invites
  for delete
  to authenticated
  using (school_id = facula.mijn_school_id() and facula.is_school_beheerder());

-- Geen update-policy: een uitnodiging wijzig je niet, je trekt hem in en maakt
-- een nieuwe. Dat houdt token_hash en expires_at onaantastbaar.

-- --- school_usage_counters -------------------------------------------------
drop policy if exists "school_usage_select_beheerder_of_eigen" on facula.school_usage_counters;

-- De beheerder ziet de hele school, een docent alleen zijn eigen rij. Er staan
-- aantallen in en nooit inhoud, maar "hoeveel maakt collega X" is voor een
-- collega geen informatie waar hij recht op heeft.
create policy "school_usage_select_beheerder_of_eigen"
  on facula.school_usage_counters
  for select
  to authenticated
  using (
    (school_id = facula.mijn_school_id() and facula.is_school_beheerder())
    or user_id = auth.uid()
  );

-- Geen schrijfpolicy: tellen doet facula.save_with_quota_v2 (definer).

-- --- section_shares --------------------------------------------------------
drop policy if exists "section_shares_select_sectie" on facula.section_shares;
drop policy if exists "section_shares_insert_eigen" on facula.section_shares;
drop policy if exists "section_shares_update_voorzitter" on facula.section_shares;
drop policy if exists "section_shares_delete_eigen_of_beheer" on facula.section_shares;

-- Lezen: wie in die sectie zit, plus de beheerder van de school.
create policy "section_shares_select_sectie"
  on facula.section_shares
  for select
  to authenticated
  using (
    school_id = facula.mijn_school_id()
    and (section_id = facula.mijn_sectie_id() or facula.is_school_beheerder())
  );

-- Delen: alleen je eigen materiaal, alleen met je eigen sectie, en
-- sectiestandaard kun je niet zelf aanzetten (dat is een besluit van de
-- sectievoorzitter, zie de update-policy).
create policy "section_shares_insert_eigen"
  on facula.section_shares
  for insert
  to authenticated
  with check (
    school_id = facula.mijn_school_id()
    and section_id = facula.mijn_sectie_id()
    and owner_id = auth.uid()
    and is_sectiestandaard = false
  );

-- Vlaggen als sectiestandaard: de sectievoorzitter van die sectie, of de
-- beheerder. De policy staat elke kolom toe; het kolomrecht onderaan beperkt
-- het tot is_sectiestandaard, zodat niemand de inhoud van andermans deling kan
-- herschrijven.
create policy "section_shares_update_voorzitter"
  on facula.section_shares
  for update
  to authenticated
  using (
    school_id = facula.mijn_school_id()
    and (
      (section_id = facula.mijn_sectie_id() and facula.mijn_school_rol() = 'sectievoorzitter')
      or facula.is_school_beheerder()
    )
  )
  with check (
    school_id = facula.mijn_school_id()
    and (
      (section_id = facula.mijn_sectie_id() and facula.mijn_school_rol() = 'sectievoorzitter')
      or facula.is_school_beheerder()
    )
  );

-- Weghalen: je eigen deling, of die van iemand anders als je voorzitter of
-- beheerder bent (iets wat niet in de bibliotheek hoort moet eruit kunnen).
create policy "section_shares_delete_eigen_of_beheer"
  on facula.section_shares
  for delete
  to authenticated
  using (
    school_id = facula.mijn_school_id()
    and (
      owner_id = auth.uid()
      or facula.is_school_beheerder()
      or (section_id = facula.mijn_sectie_id() and facula.mijn_school_rol() = 'sectievoorzitter')
    )
  );

-- ===========================================================================
-- 4. Rechten: eerst alles dicht, dan precies wat nodig is
-- ===========================================================================

grant usage on schema facula to authenticated;

revoke all on facula.schools from anon, authenticated;
revoke all on facula.sections from anon, authenticated;
revoke all on facula.school_members from anon, authenticated;
revoke all on facula.school_invites from anon, authenticated;
revoke all on facula.school_usage_counters from anon, authenticated;
revoke all on facula.section_shares from anon, authenticated;

-- schools: lezen mag, en van de wijzigbare velden alleen naam en huisstijl
-- (keuze 3). logo_path en logo_mime staan er NIET bij: die horen bij een
-- upload en lopen via de route, zodat het pad en het bestandstype altijd bij
-- een echt object in de bucket horen.
grant select on facula.schools to authenticated;
grant update (
  name,
  huisstijl_preset,
  accent,
  tekst,
  achtergrond,
  lettertype,
  enforce_huisstijl,
  updated_at
) on facula.schools to authenticated;

grant select, insert, update, delete on facula.sections to authenticated;

-- school_members: geen insert (zie de policy-uitleg). Van de wijzigbare velden
-- alleen rol, sectie en status: user_id en school_id veranderen is geen
-- wijziging maar een ander lidmaatschap.
grant select on facula.school_members to authenticated;
grant update (role, section_id, status, updated_at) on facula.school_members to authenticated;
grant delete on facula.school_members to authenticated;

grant select, insert, delete on facula.school_invites to authenticated;

grant select on facula.school_usage_counters to authenticated;

-- section_shares: van update alleen de vlag, zodat een voorzitter nooit de
-- inhoud van andermans deling kan herschrijven.
grant select, insert, delete on facula.section_shares to authenticated;
grant update (is_sectiestandaard) on facula.section_shares to authenticated;

grant all on facula.schools to service_role;
grant all on facula.sections to service_role;
grant all on facula.school_members to service_role;
grant all on facula.school_invites to service_role;
grant all on facula.school_usage_counters to service_role;
grant all on facula.section_shares to service_role;

-- ===========================================================================
-- 5. updated_at door de database, niet door de route
-- ===========================================================================
-- Zelfde keuze als bij facula.huisstijl: één klok voor alle tijdstempels in
-- deze tabellen.

create or replace function facula.zet_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists schools_set_updated_at on facula.schools;
create trigger schools_set_updated_at
  before update on facula.schools
  for each row
  execute function facula.zet_updated_at();

drop trigger if exists school_members_set_updated_at on facula.school_members;
create trigger school_members_set_updated_at
  before update on facula.school_members
  for each row
  execute function facula.zet_updated_at();

-- ===========================================================================
-- 6. Uitnodiging accepteren
-- ===========================================================================
--
-- Security definer, want de aanvrager is op dit moment nog geen lid en mag
-- dus per definitie niets in deze tabellen. Alles wat de uitkomst bepaalt
-- leest deze functie zelf: wie je bent (auth.uid()), welk adres daarbij hoort
-- (auth.users), en wat de uitnodiging zegt. Het enige argument is de hash van
-- het token uit de link.
--
-- Geeft een status terug in plaats van een exception, zodat de route er een
-- Nederlandse zin van kan maken. Een exception zou niet te onderscheiden zijn
-- van een kapotte database.
--
-- Statussen: ok, ongeldig, verlopen, verkeerd_domein, vol,
-- al_lid_andere_school, niet_ingelogd.

create or replace function facula.accept_school_invite(p_token_hash text)
returns table(status text, school_naam text, rol text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_domein text;
  v_invite facula.school_invites;
  v_school facula.schools;
  v_actief integer;
  v_bestaand_school uuid;
begin
  if v_user is null then
    return query select 'niet_ingelogd', null::text, null::text;
    return;
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_user;
  if v_email is null then
    return query select 'niet_ingelogd', null::text, null::text;
    return;
  end if;
  v_domein := split_part(v_email, '@', 2);

  -- Vergrendel de uitnodiging: twee tabbladen met dezelfde link mogen niet
  -- beide een plek innemen.
  select * into v_invite
  from facula.school_invites i
  where i.token_hash = p_token_hash
  for update;

  if v_invite.id is null or v_invite.accepted_at is not null then
    return query select 'ongeldig', null::text, null::text;
    return;
  end if;

  if v_invite.expires_at <= now() then
    return query select 'verlopen', null::text, null::text;
    return;
  end if;

  select * into v_school from facula.schools s where s.id = v_invite.school_id;
  if v_school.id is null then
    return query select 'ongeldig', null::text, null::text;
    return;
  end if;

  -- Wie is deze link voor: het uitgenodigde adres zelf, of iemand met een
  -- adres op een schooldomein. Dat tweede is er omdat een docent vaak een
  -- ander adres gebruikt dan waar de beheerder de uitnodiging naartoe stuurde
  -- (voornaam.achternaam versus initialen). Alles daarbuiten is een link die
  -- bij iemand anders hoort.
  if lower(v_invite.email) <> v_email
     and not (v_domein = any (v_school.domains)) then
    return query select 'verkeerd_domein', v_school.name, null::text;
    return;
  end if;

  -- Al actief lid van een ANDERE school: dat botst met keuze 1. Eerst daar
  -- weg, en dat is een beslissing die een mens moet nemen.
  select m.school_id into v_bestaand_school
  from facula.school_members m
  where m.user_id = v_user and m.status = 'active';

  if v_bestaand_school is not null and v_bestaand_school <> v_school.id then
    return query select 'al_lid_andere_school', v_school.name, null::text;
    return;
  end if;

  -- Plekken tellen ná de lock op de uitnodiging, maar dat is niet genoeg:
  -- twee verschillende uitnodigingen kunnen tegelijk de laatste plek pakken.
  -- Daarom ook de schoolrij vergrendelen, net als bij de poollimiet.
  perform 1 from facula.schools s where s.id = v_school.id for update;

  select count(*) into v_actief
  from facula.school_members m
  where m.school_id = v_school.id
    and m.status = 'active'
    and m.user_id <> v_user;

  if v_actief >= v_school.seat_limit then
    return query select 'vol', v_school.name, null::text;
    return;
  end if;

  insert into facula.school_members as m
    (school_id, user_id, role, section_id, status)
  values (v_school.id, v_user, v_invite.role, v_invite.section_id, 'active')
  on conflict (school_id, user_id) do update
  set role = excluded.role,
      section_id = excluded.section_id,
      status = 'active';

  update facula.school_invites i
  set accepted_at = now(),
      accepted_by = v_user
  where i.id = v_invite.id;

  return query select 'ok', v_school.name, v_invite.role;
end;
$$;

comment on function facula.accept_school_invite(text) is
  'Accepteert een uitnodiging op basis van de SHA-256 van het token. Controleert geldigheid, verloop, adres of schooldomein, het aantal plekken en of de gebruiker al bij een andere school hoort. Geeft een status terug in plaats van een exception.';

revoke execute on function facula.accept_school_invite(text) from public, anon;
grant execute on function facula.accept_school_invite(text) to authenticated;

-- ===========================================================================
-- 7. Iets uit de sectiebibliotheek overnemen
-- ===========================================================================
--
-- Definer, omdat er in facula.lessons/tests geschreven wordt namens de
-- overnemer terwijl de bron van iemand anders is. De functie bepaalt zelf voor
-- wie hij schrijft (auth.uid()) en controleert zelf of de aanvrager die
-- deling mag zien. Er is geen parameter waarmee je voor iemand anders kunt
-- opslaan.
--
-- Bewust GEEN quotum: dit kost geen AI-aanroep, en een sectie waar overnemen
-- geld kost gaat niet delen. Dat is het hele punt van een bibliotheek.

create or replace function facula.copy_share_to_own(p_share_id uuid)
returns table(status text, content_id uuid, kind text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_school uuid;
  v_sectie uuid;
  v_beheerder boolean;
  v_share facula.section_shares;
  v_id uuid;
begin
  if v_user is null then
    return query select 'niet_ingelogd', null::uuid, null::text;
    return;
  end if;

  select m.school_id, m.section_id into v_school, v_sectie
  from facula.school_members m
  where m.user_id = v_user and m.status = 'active';

  if v_school is null then
    return query select 'geen_lid', null::uuid, null::text;
    return;
  end if;

  v_beheerder := facula.is_school_beheerder();

  select * into v_share from facula.section_shares s where s.id = p_share_id;

  -- Dezelfde voorwaarde als de select-policy, hier opnieuw: een definer-functie
  -- ziet alles, dus de controle die de policy normaal doet moet hier met de
  -- hand. Niet gevonden en niet mogen zien geven hetzelfde antwoord, zodat je
  -- met een gokje geen id's van andere scholen kunt aftasten.
  if v_share.id is null
     or v_share.school_id <> v_school
     or (v_share.section_id <> v_sectie and not v_beheerder) then
    return query select 'niet_gevonden', null::uuid, null::text;
    return;
  end if;

  if v_share.kind = 'lessons' then
    insert into facula.lessons as l (user_id, input, output)
    values (v_user, v_share.input, v_share.output)
    returning l.id into v_id;
  else
    insert into facula.tests as t (user_id, input, output)
    values (v_user, v_share.input, v_share.output)
    returning t.id into v_id;
  end if;

  return query select 'ok', v_id, v_share.kind;
end;
$$;

comment on function facula.copy_share_to_own(uuid) is
  'Kopieert een gedeelde les of toets naar het eigen materiaal van auth.uid(). Controleert zelf school en sectie, want een definer-functie ziet langs RLS heen. Kost geen quotum: er komt geen AI aan te pas.';

revoke execute on function facula.copy_share_to_own(uuid) from public, anon;
grant execute on function facula.copy_share_to_own(uuid) to authenticated;

-- ===========================================================================
-- 8. Gebruiksoverzicht voor het beheerpaneel
-- ===========================================================================
--
-- Definer om één reden: het e-mailadres van een lid staat in auth.users en dat
-- is voor authenticated niet leesbaar. Zonder adres is een lijst met user-id's
-- onbruikbaar voor een beheerder.
--
-- De functie geeft alleen aantallen terug, nooit inhoud, en weigert als de
-- aanvrager geen beheerder is.

create or replace function facula.school_usage_overzicht()
returns table(
  user_id uuid,
  email text,
  role text,
  status text,
  section_id uuid,
  section_naam text,
  lessons_generated integer,
  tests_generated integer,
  reports_generated integer
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_school uuid := facula.mijn_school_id();
  v_period date := (date_trunc('month', now()))::date;
begin
  if v_school is null or not facula.is_school_beheerder() then
    raise exception 'Alleen een beheerder van deze school' using errcode = '42501';
  end if;

  return query
  select
    m.user_id,
    u.email::text,
    m.role,
    m.status,
    m.section_id,
    sec.naam,
    -- Een teller van vorige maand hoort als 0 te lezen, niet als het oude
    -- getal: hetzelfde patroon als facula.get_current_usage.
    case when c.period_start = v_period then c.lessons_generated else 0 end,
    case when c.period_start = v_period then c.tests_generated else 0 end,
    case when c.period_start = v_period then c.reports_generated else 0 end
  from facula.school_members m
  left join auth.users u on u.id = m.user_id
  left join facula.sections sec on sec.id = m.section_id
  left join facula.school_usage_counters c
    on c.school_id = m.school_id and c.user_id = m.user_id
  where m.school_id = v_school
  order by m.role, u.email;
end;
$$;

comment on function facula.school_usage_overzicht() is
  'Ledenlijst met verbruik van deze maand voor het beheerpaneel. Alleen voor de beheerder van de eigen school. Aantallen, geen inhoud.';

revoke execute on function facula.school_usage_overzicht() from public, anon;
grant execute on function facula.school_usage_overzicht() to authenticated;

-- ===========================================================================
-- 9. De huisstijl die voor deze docent geldt
-- ===========================================================================
--
-- Definer, want een docent mag de schoolrij pas lezen als hij lid is en die
-- controle zit al in mijn_school_id(). Geeft één rij terug in dezelfde vorm
-- als facula.huisstijl, zodat resolveHuisstijl() in de app er niets nieuws van
-- hoeft te leren.
--
-- Geeft niets terug als er geen school is, of als de school geen huisstijl
-- afdwingt EN de docent zijn eigen huisstijl al heeft ingesteld. Die afweging
-- maakt de app (src/lib/huisstijl/server.ts), niet deze functie: hier komt
-- alleen "dit is de huisstijl van jouw school, en dit is of hij verplicht is".

create or replace function facula.school_huisstijl()
returns table(
  preset text,
  accent text,
  tekst text,
  achtergrond text,
  lettertype text,
  schoolnaam text,
  logo_path text,
  logo_mime text,
  enforce_huisstijl boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.huisstijl_preset,
    s.accent,
    s.tekst,
    s.achtergrond,
    s.lettertype,
    s.name,
    s.logo_path,
    s.logo_mime,
    s.enforce_huisstijl
  from facula.schools s
  where s.id = facula.mijn_school_id();
$$;

comment on function facula.school_huisstijl() is
  'De huisstijl van de school van auth.uid(), in dezelfde vorm als facula.huisstijl, plus of hij afgedwongen wordt.';

revoke execute on function facula.school_huisstijl() from public, anon;
grant execute on function facula.school_huisstijl() to authenticated;

-- ===========================================================================
-- 10. Quotum: save_with_quota_v2
-- ===========================================================================
--
-- Zelfde contract en zelfde belofte als facula.save_with_quota: controleren,
-- opslaan en tellen in één transactie, met alles wat de uitkomst bepaalt uit
-- de server en niets uit de parameters. Nieuw is de vraag welk regime geldt:
--
--   1. SCHOOL met een lopende licentie (plan 'actief', of 'pilot' waarvan de
--      einddatum nog niet voorbij is):
--        - quota_mode = 'onbeperkt' -> geen limiet;
--        - quota_mode = 'pool'      -> de hele school heeft per soort per maand
--                                      monthly_pool stuks samen.
--      Het verbruik gaat naar facula.school_usage_counters (per docent, zodat
--      het beheerpaneel het per sectie kan optellen) en NIET naar de
--      persoonlijke teller. Zo zit een docent na een pilot niet ineens tegen
--      een volle persoonlijke teller aan.
--   2. BETAALD ABONNEMENT (facula.profiles.subscription_status = 'active'):
--      geen limiet, zoals nu.
--   3. ANDERS: het persoonlijke gratis quotum, ongewijzigd.
--
-- Waarom een nieuwe naam en niet `create or replace` op save_with_quota: de
-- versie van de app die nu in productie draait roept de oude aan. Die moet
-- blijven werken tot de nieuwe deploy erop staat. Het weghalen van de oude
-- staat in supabase/post-deploy/, ná de deploy. Dezelfde volgorde die bij de
-- vorige quotum-wijziging werkte.

create or replace function facula.save_with_quota_v2(
  p_kind text,
  p_input jsonb,
  p_output jsonb
)
returns table(
  content_id uuid,
  content_created_at timestamptz,
  quota_exceeded boolean,
  new_count integer,
  -- Welk regime er gold. De route logt dit; de app gebruikt het niet om iets
  -- te beslissen.
  regime text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Zelfde getal als FREE_QUOTA_PER_MONTH in src/lib/quota.ts. Zie de
  -- toelichting in 20260928160000_facula_quota_atomic_save.sql.
  c_gratis_limiet constant integer := 5;
  v_user_id uuid := auth.uid();
  v_period date := (date_trunc('month', now()))::date;
  v_rij_periode date;
  v_current integer;
  v_betaald boolean;
  v_id uuid;
  v_created timestamptz;
  v_school facula.schools;
  v_regime text;
  v_pool_gebruikt integer;
begin
  if v_user_id is null then
    raise exception 'Authenticatie vereist' using errcode = '42501';
  end if;

  if p_kind not in ('lessons','tests','reports') then
    raise exception 'Ongeldig usage-kind: %', p_kind;
  end if;

  if p_input is null or p_output is null then
    raise exception 'Input en output zijn verplicht';
  end if;

  -- Welke school, als die er is en de licentie loopt.
  select s.* into v_school
  from facula.school_members m
  join facula.schools s on s.id = m.school_id
  where m.user_id = v_user_id
    and m.status = 'active'
    and (
      s.plan = 'actief'
      or (s.plan = 'pilot' and (s.pilot_ends_at is null or s.pilot_ends_at > now()))
    );

  if v_school.id is not null then
    v_regime := 'school_' || v_school.quota_mode;

    if v_school.quota_mode = 'pool' then
      -- De poollimiet gaat over de hele school, dus de som over alle docenten.
      -- Een som is niet met één rijlock te beschermen: twee docenten die
      -- tegelijk de laatste plek pakken, lezen beiden dezelfde som. Daarom
      -- eerst de schoolrij vergrendelen. Dat serialiseert alleen het
      -- quotumdeel, en alleen binnen dezelfde school.
      perform 1 from facula.schools s where s.id = v_school.id for update;

      select coalesce(sum(
        case p_kind
          when 'lessons' then c.lessons_generated
          when 'tests' then c.tests_generated
          else c.reports_generated
        end
      ), 0)
      into v_pool_gebruikt
      from facula.school_usage_counters c
      where c.school_id = v_school.id
        and c.period_start = v_period;

      if v_school.monthly_pool is not null and v_pool_gebruikt >= v_school.monthly_pool then
        return query select null::uuid, null::timestamptz, true, v_pool_gebruikt, v_regime;
        return;
      end if;
    end if;

    -- Opslaan, dan tellen. Slaat de insert stuk, dan rolt de teller mee terug.
    if p_kind = 'lessons' then
      insert into facula.lessons as l (user_id, input, output)
      values (v_user_id, p_input, p_output)
      returning l.id, l.created_at into v_id, v_created;
    elsif p_kind = 'tests' then
      insert into facula.tests as t (user_id, input, output)
      values (v_user_id, p_input, p_output)
      returning t.id, t.created_at into v_id, v_created;
    else
      insert into facula.reports as r (user_id, input, output)
      values (v_user_id, p_input, p_output)
      returning r.id, r.created_at into v_id, v_created;
    end if;

    insert into facula.school_usage_counters as c
      (school_id, user_id, period_start, lessons_generated, tests_generated, reports_generated)
    values (
      v_school.id,
      v_user_id,
      v_period,
      case when p_kind = 'lessons' then 1 else 0 end,
      case when p_kind = 'tests' then 1 else 0 end,
      case when p_kind = 'reports' then 1 else 0 end
    )
    on conflict (school_id, user_id) do update
    set
      -- Maandwissel in hetzelfde statement: staat er nog een periode van
      -- vorige maand, dan begint deze soort op 1 en de andere twee op 0.
      period_start = v_period,
      lessons_generated = case
        when c.period_start = v_period then c.lessons_generated else 0 end
        + case when p_kind = 'lessons' then 1 else 0 end,
      tests_generated = case
        when c.period_start = v_period then c.tests_generated else 0 end
        + case when p_kind = 'tests' then 1 else 0 end,
      reports_generated = case
        when c.period_start = v_period then c.reports_generated else 0 end
        + case when p_kind = 'reports' then 1 else 0 end,
      updated_at = now()
    returning case p_kind
      when 'lessons' then c.lessons_generated
      when 'tests' then c.tests_generated
      else c.reports_generated
    end
    into v_current;

    return query select v_id, v_created, false, v_current, v_regime;
    return;
  end if;

  -- Geen school: precies het gedrag van facula.save_with_quota.
  select coalesce(p.subscription_status = 'active', false)
    into v_betaald
  from facula.profiles p
  where p.id = v_user_id;
  v_betaald := coalesce(v_betaald, false);
  v_regime := case when v_betaald then 'abonnement' else 'gratis' end;

  insert into facula.usage_counters as uc
    (user_id, period_start, lessons_generated, tests_generated, reports_generated)
  values (v_user_id, v_period, 0, 0, 0)
  on conflict (user_id) do update set updated_at = now()
  returning uc.period_start,
    case p_kind
      when 'lessons' then uc.lessons_generated
      when 'tests' then uc.tests_generated
      else uc.reports_generated
    end
  into v_rij_periode, v_current;

  if v_rij_periode is distinct from v_period then
    update facula.usage_counters uc
    set period_start = v_period,
        lessons_generated = 0,
        tests_generated = 0,
        reports_generated = 0,
        updated_at = now()
    where uc.user_id = v_user_id;
    v_current := 0;
  end if;

  if not v_betaald and v_current >= c_gratis_limiet then
    return query select null::uuid, null::timestamptz, true, v_current, v_regime;
    return;
  end if;

  if p_kind = 'lessons' then
    insert into facula.lessons as l (user_id, input, output)
    values (v_user_id, p_input, p_output)
    returning l.id, l.created_at into v_id, v_created;
  elsif p_kind = 'tests' then
    insert into facula.tests as t (user_id, input, output)
    values (v_user_id, p_input, p_output)
    returning t.id, t.created_at into v_id, v_created;
  else
    insert into facula.reports as r (user_id, input, output)
    values (v_user_id, p_input, p_output)
    returning r.id, r.created_at into v_id, v_created;
  end if;

  if not v_betaald then
    update facula.usage_counters uc
    set
      lessons_generated = uc.lessons_generated + case when p_kind = 'lessons' then 1 else 0 end,
      tests_generated = uc.tests_generated + case when p_kind = 'tests' then 1 else 0 end,
      reports_generated = uc.reports_generated + case when p_kind = 'reports' then 1 else 0 end,
      updated_at = now()
    where uc.user_id = v_user_id
    returning case p_kind
      when 'lessons' then uc.lessons_generated
      when 'tests' then uc.tests_generated
      else uc.reports_generated
    end
    into v_current;
  end if;

  return query select v_id, v_created, false, v_current, v_regime;
end;
$$;

comment on function facula.save_with_quota_v2(text, jsonb, jsonb) is
  'Slaat een les/toets/rapport op en verrekent het quotum in één transactie. Kiest zelf het regime: schoollicentie (onbeperkt of pool per soort per maand), betaald abonnement, of het persoonlijke gratis quotum. Gebruiker, limieten en abonnementsstatus komen uit de server, niet uit de parameters.';

revoke execute on function facula.save_with_quota_v2(text, jsonb, jsonb) from public, anon;
grant execute on function facula.save_with_quota_v2(text, jsonb, jsonb) to authenticated;

-- ===========================================================================
-- 11. Het huidige verbruik van deze docent, inclusief schoolregime
-- ===========================================================================
-- Voor het startscherm: hoeveel is er deze maand gemaakt en wat is de limiet.
-- Eén aanroep in plaats van drie, en de app hoeft de regimekeuze niet na te
-- bouwen (die stond dan op twee plekken en zou daar uiteen lopen).

create or replace function facula.mijn_verbruik()
returns table(
  lessons_generated integer,
  tests_generated integer,
  reports_generated integer,
  -- 'gratis', 'abonnement', 'school_onbeperkt' of 'school_pool'.
  regime text,
  -- De limiet per soort per maand, of null als er geen limiet is. Bij een pool
  -- is dit de poollimiet van de hele school.
  limiet integer,
  school_naam text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  c_gratis_limiet constant integer := 5;
  v_user_id uuid := auth.uid();
  v_period date := (date_trunc('month', now()))::date;
  v_school facula.schools;
  v_betaald boolean;
begin
  if v_user_id is null then
    raise exception 'Authenticatie vereist' using errcode = '42501';
  end if;

  select s.* into v_school
  from facula.school_members m
  join facula.schools s on s.id = m.school_id
  where m.user_id = v_user_id
    and m.status = 'active'
    and (
      s.plan = 'actief'
      or (s.plan = 'pilot' and (s.pilot_ends_at is null or s.pilot_ends_at > now()))
    );

  if v_school.id is not null then
    if v_school.quota_mode = 'pool' then
      -- Bij een pool telt de stand van de hele school: dat is de enige lezing
      -- waar een docent iets aan heeft ("de school heeft er nog 12").
      return query
      select
        coalesce(sum(case when c.period_start = v_period then c.lessons_generated else 0 end), 0)::integer,
        coalesce(sum(case when c.period_start = v_period then c.tests_generated else 0 end), 0)::integer,
        coalesce(sum(case when c.period_start = v_period then c.reports_generated else 0 end), 0)::integer,
        'school_pool',
        v_school.monthly_pool,
        v_school.name
      from facula.school_usage_counters c
      where c.school_id = v_school.id;
      return;
    end if;

    return query
    select
      coalesce(max(case when c.period_start = v_period then c.lessons_generated else 0 end), 0)::integer,
      coalesce(max(case when c.period_start = v_period then c.tests_generated else 0 end), 0)::integer,
      coalesce(max(case when c.period_start = v_period then c.reports_generated else 0 end), 0)::integer,
      'school_onbeperkt',
      null::integer,
      v_school.name
    from facula.school_usage_counters c
    where c.school_id = v_school.id and c.user_id = v_user_id;
    return;
  end if;

  select coalesce(p.subscription_status = 'active', false)
    into v_betaald
  from facula.profiles p
  where p.id = v_user_id;
  v_betaald := coalesce(v_betaald, false);

  return query
  select
    coalesce(max(case when uc.period_start = v_period then uc.lessons_generated else 0 end), 0)::integer,
    coalesce(max(case when uc.period_start = v_period then uc.tests_generated else 0 end), 0)::integer,
    coalesce(max(case when uc.period_start = v_period then uc.reports_generated else 0 end), 0)::integer,
    case when v_betaald then 'abonnement' else 'gratis' end,
    case when v_betaald then null::integer else c_gratis_limiet end,
    null::text
  from facula.usage_counters uc
  where uc.user_id = v_user_id;
end;
$$;

comment on function facula.mijn_verbruik() is
  'Verbruik van deze maand plus het geldende regime en de limiet voor auth.uid(). Eén bron voor het startscherm, zodat de regimekeuze niet in de app wordt nagebouwd.';

revoke execute on function facula.mijn_verbruik() from public, anon;
grant execute on function facula.mijn_verbruik() to authenticated;

-- ===========================================================================
-- 11b. Het schoollogo vastleggen
-- ===========================================================================
--
-- logo_path en logo_mime staan niet in het kolomrecht voor authenticated: een
-- pad mag alleen in de rij komen als er ook echt een object in de bucket
-- staat, en dat weet alleen de route die net geüpload heeft. Vandaar deze
-- definer-functie in plaats van een update-recht.
--
-- Het pad wordt hier afgeleid en NIET meegegeven: de aanroeper zegt alleen
-- "er staat nu een logo van dit type" of "er staat niets meer". Daarmee kan
-- geen enkele aanroep de rij naar het logo van een andere school laten wijzen.
--
-- Bewust geen lease zoals bij het docentlogo (claim_logo_lock): daar kon elke
-- docent zijn eigen logo vervangen en verwijderen, hier kan dat alleen een
-- beheerder en gebeurt het een paar keer per jaar. Het slechtste geval van
-- twee beheerders die tegelijk bezig zijn, is een rij die naar een verwijderd
-- object wijst; de app leest dat als "geen logo" en gaat gewoon door.

create or replace function facula.set_school_logo(p_logo_mime text)
returns table(status text, logo_path text, logo_mime text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school uuid := facula.mijn_school_id();
  v_pad text;
begin
  if v_school is null or not facula.is_school_beheerder() then
    raise exception 'Alleen een beheerder van deze school' using errcode = '42501';
  end if;

  if p_logo_mime is not null and p_logo_mime not in ('image/png', 'image/jpeg') then
    raise exception 'Ongeldig bestandstype: %', p_logo_mime;
  end if;

  v_pad := case when p_logo_mime is null then null else 'school/' || v_school::text || '/logo' end;

  update facula.schools s
  set logo_path = v_pad,
      logo_mime = p_logo_mime
  where s.id = v_school;

  return query select 'ok', v_pad, p_logo_mime;
end;
$$;

comment on function facula.set_school_logo(text) is
  'Legt vast dat er een schoollogo staat (met bestandstype) of dat het weg is (null). Het pad wordt afgeleid uit de eigen school en komt nooit uit de parameters. Alleen voor de beheerder.';

revoke execute on function facula.set_school_logo(text) from public, anon;
grant execute on function facula.set_school_logo(text) to authenticated;

-- ===========================================================================
-- 12. Storage: het schoollogo
-- ===========================================================================
-- Zelfde bucket als het docentlogo (school-logos, privé), en zelfde regel:
-- exact één toegestane objectnaam, hier 'school/<school_id>/logo'. Geen
-- mapcheck, want dan kan een beheerder de bucket als gratis opslag gebruiken.
--
-- mijn_school_id() geeft null voor wie geen lid is; 'school/' || null is null
-- en dan matcht de naam nooit. Lezen mag elk lid (de exports halen het logo
-- server-side op met de sessie van de docent), schrijven alleen de beheerder.

drop policy if exists "school_logos_select_member" on storage.objects;
drop policy if exists "school_logos_insert_beheerder" on storage.objects;
drop policy if exists "school_logos_update_beheerder" on storage.objects;
drop policy if exists "school_logos_delete_beheerder" on storage.objects;

create policy "school_logos_select_member"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'school-logos'
    and name = 'school/' || facula.mijn_school_id()::text || '/logo'
  );

create policy "school_logos_insert_beheerder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'school-logos'
    and name = 'school/' || facula.mijn_school_id()::text || '/logo'
    and facula.is_school_beheerder()
  );

create policy "school_logos_update_beheerder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'school-logos'
    and name = 'school/' || facula.mijn_school_id()::text || '/logo'
    and facula.is_school_beheerder()
  )
  with check (
    bucket_id = 'school-logos'
    and name = 'school/' || facula.mijn_school_id()::text || '/logo'
    and facula.is_school_beheerder()
  );

create policy "school_logos_delete_beheerder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'school-logos'
    and name = 'school/' || facula.mijn_school_id()::text || '/logo'
    and facula.is_school_beheerder()
  );

notify pgrst, 'reload schema';
