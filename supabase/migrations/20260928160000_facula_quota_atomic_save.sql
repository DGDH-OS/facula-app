-- Quotum en opslag in één transactie — vervangt de terugboek-aanpak.
--
-- Wat er niet klopte aan de oude opzet: de route hoogde de teller op
-- (facula.try_increment_usage), sloeg daarna de les/toets/rapport op, en
-- boekte bij een mislukte insert een eenheid terug (facula.refund_usage).
-- Twee losse stappen betekent twee manieren om het fout te doen: een crash
-- of timeout tussen stap 1 en stap 2 laat de teller opgehoogd achter zonder
-- dat er iets opgeslagen is, en de terugboeking zelf kan ook mislukken.
-- Een quotum dat kan afwijken van het aantal daadwerkelijk bewaarde items,
-- is geen quotum maar een schatting.
--
-- Deze functie doet daarom alles wat moet kloppen in één transactie: de
-- teller-rij van de lopende periode vergrendelen, de limiet controleren, de
-- rij in facula.lessons/tests/reports inserten, en pas dan de teller
-- ophogen. Slaat de insert stuk, dan rolt de verhoging mee terug; er valt
-- dus niets meer terug te boeken. facula.refund_usage wordt hieronder
-- verwijderd (de migratie die hem aanmaakte is nooit op live toegepast).
--
-- De generatie zelf gebeurt VOOR deze aanroep, in de route. Daar staat een
-- goedkope, niet-ophogende voorcheck (facula.get_current_usage) zodat een
-- docent die al over de limiet is geen AI-aanroep kost. Die voorcheck is
-- bewust niet bindend — alleen de vergrendeling hieronder is bestand tegen
-- twee gelijktijdige aanvragen die door dezelfde laatste vrije plek willen.
--
-- Wie de gebruiker is, komt uit auth.uid() en is géén parameter: een
-- aanroeper kan dus niet voor iemand anders opslaan of iemand anders teller
-- ophogen. Betalend of niet wordt hier ook zelf uit facula.profiles gelezen
-- in plaats van door de route meegegeven, zodat het abonnement en de
-- quotum-beslissing dezelfde transactie en dezelfde waarheid delen.
--
-- Security definer met een lege search_path, zoals de andere usage-RPC's:
-- facula.usage_counters is voor authenticated read-only (zie
-- 20260927150000_facula_security_hardening.sql), dus schrijven kan alleen
-- via een definer-functie. De insert in lessons/tests/reports zet altijd
-- user_id = auth.uid(), dezelfde regel die de RLS-policies op die tabellen
-- afdwingen voor de client-kant.
--
-- Idempotent: opnieuw draaien mag (create or replace, drop ... if exists).

-- Weg met de terugboeking. Bewust een drop en geen "laat maar staan": een
-- functie die het quotum kan verlagen is precies wat je niet wil laten
-- rondslingeren zodra niets hem meer nodig heeft.
drop function if exists facula.refund_usage(uuid, text);

-- facula.try_increment_usage blijft WEL staan: zolang de vorige versie van de
-- app nog in productie draait, is dat de RPC die zijn quota-check doet. Hij
-- wordt door de nieuwe code niet meer aangeroepen.

create or replace function facula.save_with_quota(
  p_kind text,
  p_input jsonb,
  p_output jsonb,
  p_limit integer
)
returns table(
  content_id uuid,
  content_created_at timestamptz,
  quota_exceeded boolean,
  new_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_period date := (date_trunc('month', now()))::date;
  v_rij_periode date;
  v_current integer;
  v_betaald boolean;
  v_id uuid;
  v_created timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authenticatie vereist' using errcode = '42501';
  end if;

  if p_kind not in ('lessons','tests','reports') then
    raise exception 'Ongeldig usage-kind: %', p_kind;
  end if;

  if p_limit < 0 or p_limit > 10000 then
    raise exception 'Ongeldige limiet: %', p_limit;
  end if;

  if p_input is null or p_output is null then
    raise exception 'Input en output zijn verplicht';
  end if;

  -- Abonnees hebben geen maandquotum. Ze slaan hieronder de limietcheck en
  -- de verhoging over, maar niet de insert: hun les hoort net zo goed
  -- opgeslagen te worden.
  select coalesce(p.subscription_status = 'active', false)
    into v_betaald
  from facula.profiles p
  where p.id = v_user_id;
  v_betaald := coalesce(v_betaald, false);

  -- Eén statement dat de teller-rij aanmaakt óf vergrendelt. Een upsert met
  -- DO UPDATE pakt een rijlock op de bestaande rij en geeft hem terug; een
  -- losse "insert ... do nothing" gevolgd door "select ... for update" zou
  -- bij een gelijktijdig teruggedraaide insert zonder rij eindigen.
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

  -- Maandwissel: dezelfde rij, nieuwe periode, tellers op 0. Gebeurt hier en
  -- niet met een geplande taak, zodat er geen moment bestaat waarop een
  -- docent op de teller van vorige maand vastzit.
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

  -- Over de limiet: geen insert, geen verhoging, en een signaal in plaats van
  -- een exception. De route zet dit om in een 402 met een Nederlandse
  -- melding; een exception zou daar niet van een echte fout te onderscheiden
  -- zijn.
  if not v_betaald and v_current >= p_limit then
    return query select null::uuid, null::timestamptz, true, v_current;
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

  -- Pas ophogen als de rij er echt staat. Slaat de insert hierboven stuk,
  -- dan komt deze update nooit aan de beurt en rolt de hele transactie terug.
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

  return query select v_id, v_created, false, v_current;
end;
$$;

comment on function facula.save_with_quota(text, jsonb, jsonb, integer) is
  'Slaat een les/toets/rapport op en verrekent het maandquotum in één transactie: teller-rij vergrendelen, limiet controleren, insert, dan ophogen. Gebruiker komt uit auth.uid(). Geeft quota_exceeded = true in plaats van een exception als de limiet vol is.';

-- anon heeft hier niets te zoeken (auth.uid() is dan null en de functie zou
-- toch weigeren, maar uitvoerrecht geven wat nooit werkt is ruis).
-- service_role ook niet: die heeft geen auth.uid(), dus deze functie is per
-- constructie alleen bruikbaar namens een ingelogde docent.
revoke execute on function facula.save_with_quota(text, jsonb, jsonb, integer) from public, anon;
grant execute on function facula.save_with_quota(text, jsonb, jsonb, integer) to authenticated;

notify pgrst, 'reload schema';
