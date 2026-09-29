-- Hulpgereedschap voor de tests: doen alsof je iemand bent, en beweringen die
-- hard stuklopen als ze niet waar zijn.
--
-- Draait alleen in de wegwerp-database van scripts/db-test.ts. Hoort nooit op
-- een echte database, en staat daarom ook niet in supabase/migrations/.
--
-- `als()` doet precies wat PostgREST doet bij een ingelogde gebruiker: de rol
-- op authenticated zetten en de JWT-claim 'sub' vullen. Daarna geldt RLS voor
-- deze sessie alsof die gebruiker het zelf vraagt. Dat is het enige punt
-- waarop deze tests iets nabootsen; de policies die eronder getest worden, zijn
-- de echte.

create schema if not exists testhulp;

-- De tests draaien deels als rol authenticated, dus die rol moet dit
-- gereedschap kunnen aanroepen. Het staat los van schema facula, zodat het
-- nooit met de echte objecten verward kan worden.
grant usage on schema testhulp to authenticated, anon, service_role;

create or replace function testhulp.als(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
end;
$$;

/** Terug naar de eigenaar van de database, voor opzetwerk tussen tests. */
create or replace function testhulp.als_server()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);
  execute 'set local role postgres';
end;
$$;

create or replace function testhulp.gelijk(
  p_wat text,
  p_gevonden anyelement,
  p_verwacht anyelement
)
returns void
language plpgsql
as $$
begin
  if p_gevonden is distinct from p_verwacht then
    raise exception 'FAAL: % -> gevonden %, verwacht %', p_wat, p_gevonden, p_verwacht;
  end if;
  raise notice 'ok    %  (%)', p_wat, p_gevonden;
end;
$$;

create or replace function testhulp.waar(p_wat text, p_uitkomst boolean)
returns void
language plpgsql
as $$
begin
  if p_uitkomst is not true then
    raise exception 'FAAL: % -> niet waar', p_wat;
  end if;
  raise notice 'ok    %', p_wat;
end;
$$;
