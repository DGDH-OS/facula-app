-- Tests: wie mag wat in het schoolmodel.
--
-- Twee scholen, vijf mensen, en voor elke bewering in
-- 20260929130000_facula_school.sql een test die stuk gaat als hij niet waar is.
-- Elke test staat in een eigen DO-blok en begint met testhulp.als(): de rol en
-- de JWT-claim gaan mee, dus RLS werkt hier precies zoals bij een echte
-- ingelogde docent.

-- ---------------------------------------------------------------------------
-- Opzet (als eigenaar van de database, dus zonder RLS in de weg)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'beheerder@sintjan.nl'),
  ('22222222-2222-4222-8222-222222222222', 'docent1@sintjan.nl'),
  ('33333333-3333-4333-8333-333333333333', 'voorzitter@sintjan.nl'),
  ('44444444-4444-4444-8444-444444444444', 'docent@westerhof.nl'),
  ('55555555-5555-4555-8555-555555555555', 'niemand@gmail.com'),
  ('66666666-6666-4666-8666-666666666666', 'nieuw@sintjan.nl')
on conflict (id) do nothing;

insert into facula.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

insert into facula.schools
  (id, name, domains, plan, seat_limit, quota_mode, monthly_pool, enforce_huisstijl)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Sint Jan College', array['sintjan.nl'],
   'actief', 3, 'onbeperkt', null, true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Westerhof Lyceum', array['westerhof.nl'],
   'pilot', 5, 'pool', 2, false)
on conflict (id) do nothing;

update facula.schools
set pilot_ends_at = now() + interval '30 days'
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

insert into facula.sections (id, school_id, naam) values
  ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Maatschappijleer'),
  ('b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Economie')
on conflict (id) do nothing;

insert into facula.school_members (school_id, user_id, role, section_id, status) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'beheerder', 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1', 'active'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'docent', 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1', 'active'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'sectievoorzitter', 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1', 'active'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '44444444-4444-4444-8444-444444444444', 'docent', 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1', 'active')
on conflict (school_id, user_id) do nothing;

-- Een open uitnodiging van school A, en twee die niet horen te werken.
insert into facula.school_invites
  (school_id, email, role, section_id, token_hash, expires_at, created_by)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'nieuw@sintjan.nl', 'docent',
   'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1',
   repeat('a', 64), now() + interval '14 days',
   '11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'verlopen@sintjan.nl', 'docent', null,
   repeat('b', 64), now() - interval '1 day',
   '11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'docent1@sintjan.nl', 'docent', null,
   repeat('c', 64), now() + interval '14 days',
   '44444444-4444-4444-8444-444444444444')
on conflict (token_hash) do nothing;

-- ---------------------------------------------------------------------------
-- 1. Een school ziet alleen zichzelf
-- ---------------------------------------------------------------------------
do $$
declare v_aantal integer; v_naam text;
begin
  perform testhulp.als('44444444-4444-4444-8444-444444444444');
  select count(*) into v_aantal from facula.schools;
  perform testhulp.gelijk('docent van B ziet precies 1 school', v_aantal, 1);
  select name into v_naam from facula.schools;
  perform testhulp.gelijk('en dat is zijn eigen school', v_naam, 'Westerhof Lyceum');
end $$;

do $$
declare v_aantal integer;
begin
  perform testhulp.als('44444444-4444-4444-8444-444444444444');
  select count(*) into v_aantal from facula.sections;
  perform testhulp.gelijk('docent van B ziet alleen secties van B', v_aantal, 1);

  select count(*) into v_aantal from facula.school_members;
  perform testhulp.gelijk('docent van B ziet alleen leden van B', v_aantal, 1);
end $$;

do $$
declare v_aantal integer;
begin
  perform testhulp.als('55555555-5555-4555-8555-555555555555');
  select count(*) into v_aantal from facula.schools;
  perform testhulp.gelijk('iemand zonder school ziet 0 scholen', v_aantal, 0);
  select count(*) into v_aantal from facula.school_members;
  perform testhulp.gelijk('en 0 leden', v_aantal, 0);
  perform testhulp.waar('mijn_school_id is null zonder lidmaatschap',
    facula.mijn_school_id() is null);
end $$;

-- ---------------------------------------------------------------------------
-- 2. Uitnodigingen zijn alleen voor de beheerder
-- ---------------------------------------------------------------------------
do $$
declare v_aantal integer;
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  select count(*) into v_aantal from facula.school_invites;
  perform testhulp.gelijk('gewone docent ziet 0 uitnodigingen', v_aantal, 0);
end $$;

do $$
declare v_aantal integer;
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  select count(*) into v_aantal from facula.school_invites;
  perform testhulp.gelijk('beheerder ziet de 2 uitnodigingen van zijn school', v_aantal, 2);
end $$;

-- Een beheerder kan geen uitnodiging voor een andere school maken.
do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  begin
    insert into facula.school_invites (school_id, email, token_hash, expires_at)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'kaper@sintjan.nl',
            repeat('d', 64), now() + interval '7 days');
  exception when others then
    v_fout := sqlstate;
  end;
  perform testhulp.gelijk('uitnodiging voor een andere school wordt geweigerd', v_fout, '42501');
end $$;

-- En geen uitnodiging die een jaar geldig is.
do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  begin
    insert into facula.school_invites (school_id, email, token_hash, expires_at)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'lang@sintjan.nl',
            repeat('e', 64), now() + interval '400 days');
  exception when others then
    v_fout := sqlstate;
  end;
  perform testhulp.gelijk('uitnodiging langer dan 30 dagen wordt geweigerd', v_fout, '42501');
end $$;

-- ---------------------------------------------------------------------------
-- 3. De contractvelden zijn niet door de klant te wijzigen
-- ---------------------------------------------------------------------------
do $$
declare v_rijen integer;
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  update facula.schools set name = 'Gekaapt' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics v_rijen = row_count;
  perform testhulp.gelijk('gewone docent wijzigt de schoolnaam niet', v_rijen, 0);
end $$;

do $$
declare v_rijen integer; v_naam text;
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  update facula.schools set name = 'Sint Jan College (locatie Noord)'
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics v_rijen = row_count;
  perform testhulp.gelijk('beheerder wijzigt de schoolnaam wel', v_rijen, 1);
  select name into v_naam from facula.schools;
  perform testhulp.gelijk('nieuwe naam staat er', v_naam, 'Sint Jan College (locatie Noord)');
end $$;

do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  begin
    update facula.schools set seat_limit = 999
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  exception when insufficient_privilege then
    v_fout := 'geweigerd';
  end;
  perform testhulp.gelijk('beheerder kan seat_limit niet oprekken', v_fout, 'geweigerd');
end $$;

do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  begin
    update facula.schools set quota_mode = 'onbeperkt', monthly_pool = 100000
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  exception when insufficient_privilege then
    v_fout := 'geweigerd';
  end;
  perform testhulp.gelijk('beheerder kan zijn quotum niet wijzigen', v_fout, 'geweigerd');
end $$;

do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  begin
    update facula.schools set domains = array['gmail.com']
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  exception when insufficient_privilege then
    v_fout := 'geweigerd';
  end;
  perform testhulp.gelijk('beheerder kan de toegestane domeinen niet wijzigen', v_fout, 'geweigerd');
end $$;

-- Een school verwijderen kan niemand behalve wij. Dit loopt al stuk op het
-- tabelrecht (er is geen delete-grant), dus nog vóór de policy.
do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  begin
    delete from facula.schools where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  exception when insufficient_privilege then
    v_fout := 'geweigerd';
  end;
  perform testhulp.gelijk('beheerder verwijdert zijn school niet', v_fout, 'geweigerd');
end $$;

-- Lid worden kan alleen via de uitnodiging, niet door het lid erin te typen.
do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  begin
    insert into facula.school_members (school_id, user_id, role, status)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            '55555555-5555-4555-8555-555555555555', 'docent', 'active');
  exception when insufficient_privilege then
    v_fout := 'geweigerd';
  end;
  perform testhulp.gelijk('beheerder hangt niemand zelf aan de school', v_fout, 'geweigerd');
end $$;

-- ---------------------------------------------------------------------------
-- 4. Sectiebibliotheek
-- ---------------------------------------------------------------------------
do $$
declare v_id uuid;
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  insert into facula.section_shares
    (school_id, section_id, kind, owner_id, titel, input, output)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1',
          'lessons', '22222222-2222-4222-8222-222222222222', 'Les over framing',
          '{"vak":"Maatschappijleer"}'::jsonb, '{"titel":"Les over framing"}'::jsonb)
  returning id into v_id;
  perform testhulp.waar('docent deelt een les met zijn eigen sectie', v_id is not null);
end $$;

do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  begin
    insert into facula.section_shares
      (school_id, section_id, kind, owner_id, titel, input, output)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1',
            'lessons', '33333333-3333-4333-8333-333333333333', 'Van iemand anders',
            '{}'::jsonb, '{}'::jsonb);
  exception when others then
    v_fout := sqlstate;
  end;
  perform testhulp.gelijk('delen op naam van een collega wordt geweigerd', v_fout, '42501');
end $$;

do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  begin
    insert into facula.section_shares
      (school_id, section_id, kind, owner_id, titel, input, output, is_sectiestandaard)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1',
            'lessons', '22222222-2222-4222-8222-222222222222', 'Zelf standaard',
            '{}'::jsonb, '{}'::jsonb, true);
  exception when others then
    v_fout := sqlstate;
  end;
  perform testhulp.gelijk('een docent zet zijn eigen les niet als sectiestandaard', v_fout, '42501');
end $$;

do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  begin
    insert into facula.section_shares
      (school_id, section_id, kind, owner_id, titel, input, output)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1',
            'reports', '22222222-2222-4222-8222-222222222222', 'Rapporttekst',
            '{}'::jsonb, '{}'::jsonb);
  exception when others then
    v_fout := sqlstate;
  end;
  -- 23514 = check constraint: kind staat alleen lessons en tests toe.
  perform testhulp.gelijk('een rapporttekst kan niet gedeeld worden', v_fout, '23514');
end $$;

do $$
declare v_aantal integer;
begin
  perform testhulp.als('44444444-4444-4444-8444-444444444444');
  select count(*) into v_aantal from facula.section_shares;
  perform testhulp.gelijk('docent van B ziet de bibliotheek van A niet', v_aantal, 0);
end $$;

do $$
declare v_aantal integer;
begin
  perform testhulp.als('33333333-3333-4333-8333-333333333333');
  select count(*) into v_aantal from facula.section_shares;
  perform testhulp.gelijk('collega in dezelfde sectie ziet de deling wel', v_aantal, 1);
end $$;

do $$
declare v_rijen integer;
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  update facula.section_shares set is_sectiestandaard = true;
  get diagnostics v_rijen = row_count;
  perform testhulp.gelijk('docent vlagt niets als sectiestandaard', v_rijen, 0);
end $$;

do $$
declare v_rijen integer;
begin
  perform testhulp.als('33333333-3333-4333-8333-333333333333');
  update facula.section_shares set is_sectiestandaard = true;
  get diagnostics v_rijen = row_count;
  perform testhulp.gelijk('sectievoorzitter vlagt wel als sectiestandaard', v_rijen, 1);
end $$;

do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('33333333-3333-4333-8333-333333333333');
  begin
    update facula.section_shares set titel = 'Herschreven';
  exception when insufficient_privilege then
    v_fout := 'geweigerd';
  end;
  perform testhulp.gelijk('sectievoorzitter herschrijft de deling niet', v_fout, 'geweigerd');
end $$;

-- Overnemen naar eigen materiaal.
do $$
declare v_share uuid; v_status text; v_content uuid; v_eigenaar uuid;
begin
  perform testhulp.als('33333333-3333-4333-8333-333333333333');
  select id into v_share from facula.section_shares limit 1;
  select status, content_id into v_status, v_content
  from facula.copy_share_to_own(v_share);
  perform testhulp.gelijk('collega neemt de les over', v_status, 'ok');

  perform testhulp.als_server();
  select user_id into v_eigenaar from facula.lessons where id = v_content;
  perform testhulp.gelijk('de kopie staat op naam van wie hem overnam',
    v_eigenaar, '33333333-3333-4333-8333-333333333333'::uuid);
end $$;

do $$
declare v_share uuid; v_status text;
begin
  perform testhulp.als_server();
  select id into v_share from facula.section_shares limit 1;

  perform testhulp.als('44444444-4444-4444-8444-444444444444');
  select status into v_status from facula.copy_share_to_own(v_share);
  perform testhulp.gelijk('docent van B kan een deling van A niet overnemen',
    v_status, 'niet_gevonden');
end $$;

do $$
declare v_share uuid; v_status text;
begin
  perform testhulp.als_server();
  select id into v_share from facula.section_shares limit 1;

  perform testhulp.als('55555555-5555-4555-8555-555555555555');
  select status into v_status from facula.copy_share_to_own(v_share);
  perform testhulp.gelijk('iemand zonder school kan niets overnemen', v_status, 'geen_lid');
end $$;

-- ---------------------------------------------------------------------------
-- 5. Gebruiksoverzicht
-- ---------------------------------------------------------------------------
do $$
declare v_aantal integer;
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  select count(*) into v_aantal from facula.school_usage_overzicht();
  perform testhulp.gelijk('beheerder ziet zijn 3 leden in het overzicht', v_aantal, 3);
end $$;

do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  begin
    perform * from facula.school_usage_overzicht();
  exception when insufficient_privilege then
    v_fout := 'geweigerd';
  end;
  perform testhulp.gelijk('gewone docent krijgt geen gebruiksoverzicht', v_fout, 'geweigerd');
end $$;

-- ---------------------------------------------------------------------------
-- 6. Uitnodiging accepteren
-- ---------------------------------------------------------------------------
do $$
declare v_status text;
begin
  perform testhulp.als('66666666-6666-4666-8666-666666666666');
  select status into v_status from facula.accept_school_invite(repeat('z', 64));
  perform testhulp.gelijk('onbekend token', v_status, 'ongeldig');

  select status into v_status from facula.accept_school_invite(repeat('b', 64));
  perform testhulp.gelijk('verlopen uitnodiging', v_status, 'verlopen');
end $$;

-- School A heeft 3 plekken en 3 actieve leden: de vierde past niet.
do $$
declare v_status text;
begin
  perform testhulp.als('66666666-6666-4666-8666-666666666666');
  select status into v_status from facula.accept_school_invite(repeat('a', 64));
  perform testhulp.gelijk('uitnodiging boven het aantal plekken', v_status, 'vol');
end $$;

do $$
declare v_status text; v_rol text; v_leden integer;
begin
  perform testhulp.als_server();
  update facula.schools set seat_limit = 4
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  perform testhulp.als('66666666-6666-4666-8666-666666666666');
  select status, rol into v_status, v_rol from facula.accept_school_invite(repeat('a', 64));
  perform testhulp.gelijk('met een plek vrij lukt het wel', v_status, 'ok');
  perform testhulp.gelijk('en met de rol uit de uitnodiging', v_rol, 'docent');

  perform testhulp.als_server();
  select count(*) into v_leden
  from facula.school_members
  where school_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and status = 'active';
  perform testhulp.gelijk('school A heeft nu 4 actieve leden', v_leden, 4);
end $$;

-- Dezelfde link een tweede keer werkt niet meer.
do $$
declare v_status text;
begin
  perform testhulp.als('66666666-6666-4666-8666-666666666666');
  select status into v_status from facula.accept_school_invite(repeat('a', 64));
  perform testhulp.gelijk('een geaccepteerde uitnodiging is verbruikt', v_status, 'ongeldig');
end $$;

-- Een link die voor iemand anders is, en het adres zit niet op een schooldomein.
do $$
declare v_status text;
begin
  perform testhulp.als_server();
  insert into facula.school_invites
    (school_id, email, role, token_hash, expires_at, created_by)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'iemand.anders@sintjan.nl', 'docent',
          repeat('f', 64), now() + interval '7 days',
          '11111111-1111-4111-8111-111111111111');

  perform testhulp.als('55555555-5555-4555-8555-555555555555');
  select status into v_status from facula.accept_school_invite(repeat('f', 64));
  perform testhulp.gelijk('link van iemand anders, adres buiten het schooldomein',
    v_status, 'verkeerd_domein');
end $$;

-- Iemand met een adres OP het schooldomein mag dezelfde link wel gebruiken:
-- dat is de docent die zich met zijn andere adres aanmeldt.
do $$
declare v_status text;
begin
  perform testhulp.als_server();
  insert into auth.users (id, email)
  values ('77777777-7777-4777-8777-777777777777', 'ander.adres@sintjan.nl')
  on conflict (id) do nothing;
  insert into facula.profiles (id, email)
  values ('77777777-7777-4777-8777-777777777777', 'ander.adres@sintjan.nl')
  on conflict (id) do nothing;
  update facula.schools set seat_limit = 5
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  perform testhulp.als('77777777-7777-4777-8777-777777777777');
  select status into v_status from facula.accept_school_invite(repeat('f', 64));
  perform testhulp.gelijk('adres op het schooldomein mag de link gebruiken', v_status, 'ok');
end $$;

-- Al lid van A, dan kan B niet ook.
do $$
declare v_status text;
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  select status into v_status from facula.accept_school_invite(repeat('c', 64));
  perform testhulp.gelijk('lid van A accepteert geen uitnodiging van B',
    v_status, 'al_lid_andere_school');
end $$;

-- En de database laat een tweede actief lidmaatschap ook niet toe, zelfs niet
-- als iemand met service_role langs de functie heen zou werken.
do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als_server();
  begin
    insert into facula.school_members (school_id, user_id, role, status)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            '22222222-2222-4222-8222-222222222222', 'docent', 'active');
  exception when unique_violation then
    v_fout := 'geweigerd';
  end;
  perform testhulp.gelijk('twee actieve lidmaatschappen kan de database niet', v_fout, 'geweigerd');
end $$;

-- ---------------------------------------------------------------------------
-- 7. Schoollogo in storage
-- ---------------------------------------------------------------------------
do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  insert into storage.objects (bucket_id, name)
  values ('school-logos', 'school/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/logo');
  perform testhulp.gelijk('beheerder zet het logo van zijn school', v_fout, 'geen fout');
end $$;

do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  begin
    insert into storage.objects (bucket_id, name)
    values ('school-logos', 'school/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/logo2');
  exception when others then
    v_fout := sqlstate;
  end;
  perform testhulp.gelijk('gewone docent zet geen schoollogo', v_fout, '42501');
end $$;

do $$
declare v_fout text := 'geen fout';
begin
  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  begin
    insert into storage.objects (bucket_id, name)
    values ('school-logos', 'school/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/logo');
  exception when others then
    v_fout := sqlstate;
  end;
  perform testhulp.gelijk('beheerder van A zet geen logo bij B', v_fout, '42501');
end $$;

do $$
declare v_aantal integer;
begin
  perform testhulp.als('44444444-4444-4444-8444-444444444444');
  select count(*) into v_aantal from storage.objects
  where bucket_id = 'school-logos';
  perform testhulp.gelijk('docent van B ziet het logo van A niet', v_aantal, 0);
end $$;

do $$
declare v_fout text := 'geen fout'; v_pad text;
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  begin
    perform facula.set_school_logo('image/png');
  exception when insufficient_privilege then
    v_fout := 'geweigerd';
  end;
  perform testhulp.gelijk('gewone docent legt geen schoollogo vast', v_fout, 'geweigerd');

  perform testhulp.als('11111111-1111-4111-8111-111111111111');
  select logo_path into v_pad from facula.set_school_logo('image/png');
  perform testhulp.gelijk('beheerder legt het pad vast, afgeleid uit zijn school',
    v_pad, 'school/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/logo');
end $$;

-- ---------------------------------------------------------------------------
-- 8. De huisstijl van de school
-- ---------------------------------------------------------------------------
do $$
declare v_naam text; v_afdwingen boolean; v_aantal integer;
begin
  perform testhulp.als('22222222-2222-4222-8222-222222222222');
  select schoolnaam, enforce_huisstijl into v_naam, v_afdwingen
  from facula.school_huisstijl();
  perform testhulp.gelijk('docent leest de huisstijl van zijn school',
    v_naam, 'Sint Jan College (locatie Noord)');
  perform testhulp.waar('en ziet dat die afgedwongen wordt', v_afdwingen);

  perform testhulp.als('55555555-5555-4555-8555-555555555555');
  select count(*) into v_aantal from facula.school_huisstijl();
  perform testhulp.gelijk('iemand zonder school krijgt geen schoolhuisstijl', v_aantal, 0);
end $$;

do $$
begin
  raise notice '';
  raise notice 'RLS-tests schoolmodel: alle controles geslaagd.';
end $$;
