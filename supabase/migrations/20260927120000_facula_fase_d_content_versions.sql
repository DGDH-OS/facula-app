-- Fase D — versiegeschiedenis voor lessons/tests/reports.
--
-- Eén generieke facula.content_versions-tabel i.p.v. drie losse
-- lesson_versions/test_versions/report_versions-tabellen: lessons, tests en
-- reports delen exact dezelfde input/output-jsonb-vorm en dezelfde
-- eigenaarschapsregel (user_id = auth.uid()). Drie tabellen zouden drie keer
-- identieke kolommen, policies en query-logica betekenen voor geen enkel
-- functioneel voordeel. content_type onderscheidt de bron; de FK naar de
-- brontabel is bewust weggelaten (geen native multi-tabel-FK in Postgres) en
-- wordt in plaats daarvan afgedwongen door de server-routes, die content_id
-- altijd samen met user_id opvragen uit de brontabel voordat er geschreven
-- wordt.
--
-- Een versie-rij is altijd een AFGESLOTEN vorige staat: vlak vóórdat een
-- route een lessons/tests/reports-rij overschrijft, wordt de staat zoals hij
-- was hier weggeschreven met een oplopend versienummer. De huidige staat
-- leeft alleen in de brontabel zelf, nooit dubbel in content_versions.

create table if not exists facula.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('lesson', 'test', 'report')),
  content_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  input jsonb not null,
  output jsonb not null,
  created_at timestamptz not null default now(),
  unique (content_type, content_id, version_number)
);

comment on table facula.content_versions is
  'Fase D: bevroren vorige staten (input+output) van lessons/tests/reports, weggeschreven vlak vóór elke update.';

alter table facula.content_versions enable row level security;

-- Lezen: alleen eigen versies, zelfde patroon als lessons/tests/reports.
create policy "content_versions_select_own"
  on facula.content_versions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Schrijven: alleen via de server-routes (createServerSupabaseClient, met de
-- sessie van de ingelogde gebruiker) die user_id altijd zelf zetten uit de
-- sessie — nooit uit de request-body. Geen enkele route staat een client toe
-- om zelf een user_id mee te geven, dus "auth.uid() = user_id" is hier
-- voldoende en niet omzeilbaar vanaf de client.
create policy "content_versions_insert_own"
  on facula.content_versions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Bewust geen update/delete-policy: versiegeschiedenis is append-only, ook
-- voor de eigenaar zelf. Terugzetten gebeurt door een NIEUWE update op de
-- brontabel (die op zijn beurt weer een nieuwe versie-rij wegschrijft), niet
-- door een oude versie-rij te wijzigen.

grant usage on schema facula to authenticated;
grant select, insert on facula.content_versions to authenticated;
