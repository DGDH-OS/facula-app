-- De oude quota-RPC dichtzetten: facula.try_increment_usage.
--
-- TOEPASSEN: pas draaien NADAT de les-v2-versie van de app is gedeployed
-- (apply only after the les-v2 app is deployed). Alles wat deze branch nodig
-- heeft, staat in 20260928160000_facula_quota_atomic_save.sql; dit bestand
-- voegt niets toe waar de nieuwe code van afhangt en haalt alleen weg wat
-- alleen de oude versie nog aanroept.
--
-- Waarom die volgorde. De versie van de app die nu in productie draait (map
-- facula-app) doet zijn quota-check via facula.try_increment_usage. Draait dit
-- bestand vóór de deploy, dan faalt het opslaan daar met een fout. Dat is
-- fail-closed (er wordt niets geteld en niets opgeslagen), maar het is wel een
-- docent die zijn les kwijt is, en dat is geen migratievenster waard.
--
-- Waarom het dicht moet. facula.try_increment_usage is SECURITY DEFINER, mag
-- door authenticated uitgevoerd worden en neemt de limiet als parameter
-- (p_limit) aan. Dat laatste maakt hem tot een volwaardige omweg om het quotum
-- heen: wie een sessietoken heeft, kan hem rechtstreeks via PostgREST aanroepen
-- met p_limit => 10000 en zo de teller straffeloos laten oplopen. De guard erin
-- controleert alleen WIE je bent, niet HOEVEEL je mag. Zolang hij bestaat, is
-- de limiet in facula.save_with_quota dus optioneel, en een optionele limiet is
-- geen limiet.
--
-- Eerst het uitvoerrecht intrekken, dan de functie weghalen. De intrekking is
-- wat de bevinding dicht (niemand mag hem nog aanroepen); de drop haalt daarna
-- weg wat niemand meer nodig heeft, zodat een latere grant hem ook niet per
-- ongeluk weer kan openzetten. De lus pakt elke overload die er in een
-- omgeving ooit is aangemaakt, niet alleen de signatuur van vandaag.
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
      and p.proname = 'try_increment_usage'
  loop
    execute 'revoke execute on function ' || r.signatuur
      || ' from public, anon, authenticated';
    execute 'drop function ' || r.signatuur;
  end loop;
end $$;

notify pgrst, 'reload schema';
