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

-- Bewust geen update/delete-policy: versiegeschiedenis is append-only, ook
-- voor de eigenaar zelf. Terugzetten gebeurt door een NIEUWE update op de
-- brontabel (die op zijn beurt weer een nieuwe versie-rij wegschrijft), niet
-- door een oude versie-rij te wijzigen.

grant usage on schema facula to authenticated;
grant select on facula.content_versions to authenticated;

create or replace function facula.save_version_and_update(
  p_content_type text,
  p_content_id uuid,
  p_new_input jsonb,
  p_new_output jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_input jsonb;
  v_current_output jsonb;
  v_version_number integer;
begin
  if v_user_id is null then
    raise exception 'Authenticatie vereist' using errcode = 'P0001';
  end if;

  if p_content_type = 'lesson' then
    select input, output into v_current_input, v_current_output
    from facula.lessons
    where id = p_content_id and user_id = v_user_id
    for update;
  elsif p_content_type = 'test' then
    select input, output into v_current_input, v_current_output
    from facula.tests
    where id = p_content_id and user_id = v_user_id
    for update;
  elsif p_content_type = 'report' then
    select input, output into v_current_input, v_current_output
    from facula.reports
    where id = p_content_id and user_id = v_user_id
    for update;
  else
    raise exception 'Ongeldig content type' using errcode = 'P0001';
  end if;

  if not found then
    raise exception 'Bronrij niet gevonden' using errcode = 'P0002';
  end if;

  select coalesce(max(version_number), 0) + 1 into v_version_number
  from facula.content_versions
  where content_type = p_content_type and content_id = p_content_id;

  insert into facula.content_versions
    (content_type, content_id, user_id, version_number, input, output)
  values
    (p_content_type, p_content_id, v_user_id, v_version_number,
     v_current_input, v_current_output);

  if p_content_type = 'lesson' then
    update facula.lessons set input = p_new_input, output = p_new_output, updated_at = now()
    where id = p_content_id and user_id = v_user_id;
  elsif p_content_type = 'test' then
    update facula.tests set input = p_new_input, output = p_new_output, updated_at = now()
    where id = p_content_id and user_id = v_user_id;
  else
    update facula.reports set input = p_new_input, output = p_new_output, updated_at = now()
    where id = p_content_id and user_id = v_user_id;
  end if;

  return v_version_number;
end;
$$;

revoke execute on function facula.save_version_and_update(text, uuid, jsonb, jsonb) from public;
grant execute on function facula.save_version_and_update(text, uuid, jsonb, jsonb) to authenticated;
