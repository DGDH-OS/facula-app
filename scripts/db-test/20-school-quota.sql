-- Tests: welk quotum geldt er, en klopt het tellen.
--
-- Bouwt voort op de opzet in 10-school-rls.sql (school A actief/onbeperkt,
-- school B pilot/pool van 2). Elke aanroep gaat langs
-- facula.save_with_quota_v2 als de echte docent, dus inclusief de
-- limietbeslissing, de insert en het tellen in één transactie.

-- ---------------------------------------------------------------------------
-- 1. Geen school, geen abonnement: het gratis maandquotum van 5
-- ---------------------------------------------------------------------------
do $$
declare
  v_over boolean;
  v_regime text;
  v_stand integer;
  v_id uuid;
begin
  perform testhulp.als('55555555-5555-4555-8555-555555555555');

  for i in 1..5 loop
    select content_id, quota_exceeded, new_count, regime
      into v_id, v_over, v_stand, v_regime
    from facula.save_with_quota_v2('lessons', '{"vak":"Economie"}'::jsonb, '{"titel":"Les"}'::jsonb);
    if v_over then
      raise exception 'FAAL: les % werd geweigerd terwijl er nog ruimte was', i;
    end if;
    if v_id is null then
      raise exception 'FAAL: les % gaf geen id terug', i;
    end if;
  end loop;
  perform testhulp.gelijk('vijf gratis lessen lukken, teller staat op 5', v_stand, 5);
  perform testhulp.gelijk('regime is gratis', v_regime, 'gratis');

  select content_id, quota_exceeded, regime
    into v_id, v_over, v_regime
  from facula.save_with_quota_v2('lessons', '{}'::jsonb, '{}'::jsonb);
  perform testhulp.waar('de zesde les wordt geweigerd', v_over);
  perform testhulp.waar('en er is niets opgeslagen', v_id is null);

  -- Een andere soort heeft zijn eigen teller.
  select quota_exceeded into v_over
  from facula.save_with_quota_v2('tests', '{}'::jsonb, '{}'::jsonb);
  perform testhulp.waar('een toets kan nog wel: eigen teller per soort', not v_over);
end $$;

do $$
declare v_lessen integer; v_toetsen integer;
begin
  perform testhulp.als_server();
  select lessons_generated, tests_generated into v_lessen, v_toetsen
  from facula.usage_counters
  where user_id = '55555555-5555-4555-8555-555555555555';
  perform testhulp.gelijk('persoonlijke teller lessen staat op 5', v_lessen, 5);
  perform testhulp.gelijk('persoonlijke teller toetsen staat op 1', v_toetsen, 1);
end $$;

do $$
declare v_lessen integer; v_regime text; v_limiet integer; v_school text;
begin
  perform testhulp.als('55555555-5555-4555-8555-555555555555');
  select lessons_generated, regime, limiet, school_naam
    into v_lessen, v_regime, v_limiet, v_school
  from facula.mijn_verbruik();
  perform testhulp.gelijk('mijn_verbruik: 5 lessen', v_lessen, 5);
  perform testhulp.gelijk('mijn_verbruik: regime gratis', v_regime, 'gratis');
  perform testhulp.gelijk('mijn_verbruik: limiet 5', v_limiet, 5);
  perform testhulp.waar('mijn_verbruik: geen schoolnaam', v_school is null);
end $$;

-- ---------------------------------------------------------------------------
-- 2. School met een actieve licentie en quota_mode 'onbeperkt'
-- ---------------------------------------------------------------------------
do $$
declare v_over boolean; v_regime text; v_stand integer;
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');

  for i in 1..7 loop
    select quota_exceeded, new_count, regime into v_over, v_stand, v_regime
    from facula.save_with_quota_v2('lessons', '{}'::jsonb, '{"titel":"Schoolles"}'::jsonb);
    if v_over then
      raise exception 'FAAL: les % geweigerd bij een onbeperkte schoollicentie', i;
    end if;
  end loop;
  perform testhulp.gelijk('zeven lessen op een schoollicentie, geen limiet', v_stand, 7);
  perform testhulp.gelijk('regime is school_onbeperkt', v_regime, 'school_onbeperkt');
end $$;

do $$
declare v_school_stand integer; v_persoonlijk integer;
begin
  perform testhulp.als_server();
  select lessons_generated into v_school_stand
  from facula.school_usage_counters
  where user_id = '22222222-2222-4222-8222-222222222222';
  perform testhulp.gelijk('het verbruik staat op de schoolteller', v_school_stand, 7);

  select count(*) into v_persoonlijk
  from facula.usage_counters
  where user_id = '22222222-2222-4222-8222-222222222222';
  perform testhulp.gelijk(
    'en niet op de persoonlijke teller, dus na een pilot begint hij niet vol',
    v_persoonlijk, 0);
end $$;

do $$
declare v_regime text; v_limiet integer; v_school text;
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  select regime, limiet, school_naam into v_regime, v_limiet, v_school
  from facula.mijn_verbruik();
  perform testhulp.gelijk('mijn_verbruik: regime school_onbeperkt', v_regime, 'school_onbeperkt');
  perform testhulp.waar('mijn_verbruik: geen limiet', v_limiet is null);
  perform testhulp.gelijk('mijn_verbruik: met schoolnaam',
    v_school, 'Sint Jan College (locatie Noord)');
end $$;

-- ---------------------------------------------------------------------------
-- 3. School in pilot met een pool: de limiet geldt voor de hele school
-- ---------------------------------------------------------------------------
do $$
declare v_over boolean; v_regime text;
begin
  perform testhulp.als('44444444-4444-4444-8444-444444444444');

  select quota_exceeded, regime into v_over, v_regime
  from facula.save_with_quota_v2('tests', '{}'::jsonb, '{"titel":"Toets 1"}'::jsonb);
  perform testhulp.waar('eerste toets uit de pool lukt', not v_over);
  perform testhulp.gelijk('regime is school_pool', v_regime, 'school_pool');

  select quota_exceeded into v_over
  from facula.save_with_quota_v2('tests', '{}'::jsonb, '{"titel":"Toets 2"}'::jsonb);
  perform testhulp.waar('tweede toets lukt ook', not v_over);

  select quota_exceeded into v_over
  from facula.save_with_quota_v2('tests', '{}'::jsonb, '{"titel":"Toets 3"}'::jsonb);
  perform testhulp.waar('derde toets is boven de pool van 2', v_over);
end $$;

-- Een tweede docent van dezelfde school loopt tegen dezelfde volle pool aan:
-- de limiet is van de school, niet van de docent.
do $$
declare v_over boolean;
begin
  perform testhulp.als_server();
  insert into auth.users (id, email)
  values ('88888888-8888-4888-8888-888888888888', 'tweede@westerhof.nl')
  on conflict (id) do nothing;
  insert into facula.profiles (id, email)
  values ('88888888-8888-4888-8888-888888888888', 'tweede@westerhof.nl')
  on conflict (id) do nothing;
  insert into facula.school_members (school_id, user_id, role, section_id, status)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          '88888888-8888-4888-8888-888888888888', 'docent',
          'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1', 'active')
  on conflict (school_id, user_id) do nothing;

  perform testhulp.als('88888888-8888-4888-8888-888888888888');
  select quota_exceeded into v_over
  from facula.save_with_quota_v2('tests', '{}'::jsonb, '{}'::jsonb);
  perform testhulp.waar('collega van dezelfde school zit ook aan de volle pool', v_over);

  -- Lessen zijn een eigen soort, dus die pool is nog leeg.
  select quota_exceeded into v_over
  from facula.save_with_quota_v2('lessons', '{}'::jsonb, '{}'::jsonb);
  perform testhulp.waar('een les kan nog wel: de pool geldt per soort', not v_over);
end $$;

do $$
declare v_toetsen integer; v_regime text; v_limiet integer;
begin
  perform testhulp.als('44444444-4444-4444-8444-444444444444');
  select tests_generated, regime, limiet into v_toetsen, v_regime, v_limiet
  from facula.mijn_verbruik();
  perform testhulp.gelijk('mijn_verbruik bij een pool telt de hele school', v_toetsen, 2);
  perform testhulp.gelijk('mijn_verbruik: regime school_pool', v_regime, 'school_pool');
  perform testhulp.gelijk('mijn_verbruik: limiet is de pool', v_limiet, 2);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Een betaald abonnement zonder school heeft geen limiet
-- ---------------------------------------------------------------------------
do $$
declare v_over boolean; v_regime text; v_limiet integer;
begin
  perform testhulp.als_server();
  update facula.profiles set subscription_status = 'active'
  where id = '55555555-5555-4555-8555-555555555555';

  perform testhulp.als('55555555-5555-4555-8555-555555555555');
  select quota_exceeded, regime into v_over, v_regime
  from facula.save_with_quota_v2('lessons', '{}'::jsonb, '{}'::jsonb);
  perform testhulp.waar('abonnee komt voorbij de vijf van gratis', not v_over);
  perform testhulp.gelijk('regime is abonnement', v_regime, 'abonnement');

  select regime, limiet into v_regime, v_limiet from facula.mijn_verbruik();
  perform testhulp.gelijk('mijn_verbruik: regime abonnement', v_regime, 'abonnement');
  perform testhulp.waar('mijn_verbruik: geen limiet voor een abonnee', v_limiet is null);
end $$;

-- ---------------------------------------------------------------------------
-- 5. Een verlopen pilot valt terug op het persoonlijke quotum
-- ---------------------------------------------------------------------------
do $$
declare v_regime text; v_limiet integer; v_over boolean;
begin
  perform testhulp.als_server();
  update facula.schools set pilot_ends_at = now() - interval '1 day'
  where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  perform testhulp.als('44444444-4444-4444-8444-444444444444');
  select regime, limiet into v_regime, v_limiet from facula.mijn_verbruik();
  perform testhulp.gelijk('na een verlopen pilot geldt het gratis quotum', v_regime, 'gratis');
  perform testhulp.gelijk('met de gratis limiet van 5', v_limiet, 5);

  select quota_exceeded, regime into v_over, v_regime
  from facula.save_with_quota_v2('tests', '{}'::jsonb, '{}'::jsonb);
  perform testhulp.waar('en de docent kan gewoon door op zijn eigen teller', not v_over);
  perform testhulp.gelijk('nu op het gratis regime', v_regime, 'gratis');
end $$;

-- ---------------------------------------------------------------------------
-- 6. Een gepauzeerde licentie idem
-- ---------------------------------------------------------------------------
do $$
declare v_regime text;
begin
  perform testhulp.als_server();
  update facula.schools set plan = 'gepauzeerd'
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  select regime into v_regime from facula.mijn_verbruik();
  perform testhulp.gelijk('een gepauzeerde licentie geeft geen schoolquotum meer',
    v_regime, 'gratis');

  perform testhulp.als_server();
  update facula.schools set plan = 'actief'
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
end $$;

-- ---------------------------------------------------------------------------
-- 7. De oude functie blijft werken tot de post-deploy hem weghaalt
-- ---------------------------------------------------------------------------
do $$
declare v_id uuid; v_over boolean;
begin
  perform testhulp.als('33333333-3333-4333-8333-333333333333');
  select content_id, quota_exceeded into v_id, v_over
  from facula.save_with_quota('lessons', '{}'::jsonb, '{"titel":"Via de oude weg"}'::jsonb);
  perform testhulp.waar('save_with_quota (v1) werkt nog', v_id is not null and not v_over);
end $$;

-- ---------------------------------------------------------------------------
-- 8. Het gebruiksoverzicht van de beheerder telt wat er echt is gemaakt
-- ---------------------------------------------------------------------------
do $$
declare v_lessen integer; v_sectie text;
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  select lessons_generated, section_naam into v_lessen, v_sectie
  from facula.school_usage_overzicht()
  where user_id = '22222222-2222-4222-8222-222222222222';
  perform testhulp.gelijk('beheerder ziet de 7 lessen van deze docent', v_lessen, 7);
  perform testhulp.gelijk('met de sectie erbij', v_sectie, 'Maatschappijleer');
end $$;

do $$
begin
  raise notice '';
  raise notice 'Quotumtests schoolmodel: alle controles geslaagd.';
end $$;
