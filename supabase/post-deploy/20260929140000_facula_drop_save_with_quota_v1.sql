-- De vorige quotumfunctie dichtzetten: facula.save_with_quota (3 argumenten).
--
-- TOEPASSEN: pas draaien NADAT de school-v1-versie van de app is gedeployed
-- (apply only after the school-v1 app is deployed). Vanaf die deploy loopt het
-- opslaan via facula.save_with_quota_v2, dat de schoollicentie meeneemt. Deze
-- functie is dan de vorige versie en heeft geen aanroepers meer.
--
-- Waarom het in supabase/post-deploy/ ligt en niet in supabase/migrations/:
-- `supabase db push` past de migratiemap in één keer toe en laat geen ruimte om
-- er een deploy tussen te zetten. De versie die nu in productie draait roept
-- save_with_quota aan; die weghalen vóór de deploy betekent dat een docent zijn
-- net gegenereerde les kwijt is (fail-closed, dus de telling blijft kloppen,
-- maar de les is weg). Zelfde afweging en zelfde volgorde als bij
-- 20260928170000_facula_drop_old_quota_rpc.sql.
--
-- Waarom het weg moet en niet mag blijven staan: save_with_quota kent het
-- schoolmodel niet. Een docent van een school met een pool die hem rechtstreeks
-- via PostgREST aanroept, wordt daar tegen het PERSOONLIJKE gratis quotum
-- gehouden en zijn verbruik landt op de persoonlijke teller. Daarmee staat de
-- poollimiet van de school open: de rem die de school heeft afgesproken, geldt
-- alleen in de functie die de app gebruikt. Twee quotumfuncties naast elkaar is
-- er een te veel, en de oudste is degene die het nieuwe model niet kent.
--
-- Terugdraaien is niet nodig en niet mogelijk: de functie staat in
-- supabase/migrations/20260928160000_facula_quota_atomic_save.sql, dus opnieuw
-- aanmaken is die migratie opnieuw toepassen.
--
-- Idempotent: opnieuw draaien mag (de lus vindt dan niets meer).

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure::text as signatuur
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'facula'
      and p.proname = 'save_with_quota'
  loop
    execute 'revoke execute on function ' || r.signatuur
      || ' from public, anon, authenticated';
    execute 'drop function ' || r.signatuur;
  end loop;
end $$;

notify pgrst, 'reload schema';
