-- Periodes: per docent, per schooljaar en per periode (1 t/m 4) de leerdoelen
-- en de begrippen met definities uit het lesboek. De toets aan het einde van
-- een periode wordt hieruit gemaakt, dus de docent typt ze één keer.
--
-- NIET automatisch toegepast: eerst ja van Ruben (gedeelde Supabase).
-- Idempotent: opnieuw draaien mag.

create table if not exists facula.periodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schooljaar text not null check (length(schooljaar) between 4 and 9),
  periode smallint not null check (periode between 1 and 4),
  vak text not null default 'Maatschappijleer',
  niveau text not null default 'havo',
  leerjaar smallint not null default 4 check (leerjaar between 1 and 6),
  leerdoelen text not null default '' check (length(leerdoelen) <= 4000),
  begrippen text not null default '' check (length(begrippen) <= 6000),
  updated_at timestamptz not null default now(),
  unique (user_id, schooljaar, periode, vak, niveau, leerjaar)
);

alter table facula.periodes enable row level security;

drop policy if exists "periodes_select_own" on facula.periodes;
create policy "periodes_select_own" on facula.periodes
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "periodes_insert_own" on facula.periodes;
create policy "periodes_insert_own" on facula.periodes
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "periodes_update_own" on facula.periodes;
create policy "periodes_update_own" on facula.periodes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "periodes_delete_own" on facula.periodes;
create policy "periodes_delete_own" on facula.periodes
  for delete to authenticated using (auth.uid() = user_id);

grant usage on schema facula to authenticated;
grant select, insert, update, delete on facula.periodes to authenticated;
grant all on facula.periodes to service_role;
