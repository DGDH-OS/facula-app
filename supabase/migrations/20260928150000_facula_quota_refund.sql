-- Quotum terugboeken — tegenhanger van facula.try_increment_usage.
--
-- try_increment_usage doet de check en de verhoging in één transactie, want
-- anders kunnen twee gelijktijdige aanvragen allebei door dezelfde laatste
-- vrije plek heen. Het gevolg was wel dat het quotum al verbruikt was zodra
-- de teller omhoog ging, ook als de les daarna niet opgeslagen kon worden:
-- de docent raakte dan een les kwijt zonder er een te krijgen.
--
-- Deze functie boekt precies één eenheid terug, zodat de aanroepende route
-- de verhoging kan compenseren als het opslaan alsnog mislukt. Bewust geen
-- vrije "zet de teller op X": alleen -1, nooit onder nul, en alleen binnen de
-- lopende periode. Een terugboeking na een maandwissel telt dus niet mee in
-- de nieuwe maand (waar de teller toch al op 0 staat).
--
-- Zelfde beveiliging als de andere usage-RPC's: security definer met een
-- lege search_path, en een guard die p_user_id tegen de ingelogde sessie
-- controleert zodat niemand andermans teller kan verlagen.
--
-- Idempotent: opnieuw draaien mag (create or replace).

create or replace function facula.refund_usage(
  p_user_id uuid,
  p_kind text
)
returns table(new_count integer, period_start date)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period date := (date_trunc('month', now()))::date;
  v_current int;
begin
  if auth.role() <> 'service_role' and (auth.uid() is null or p_user_id <> auth.uid()) then
    raise exception 'Niet toegestaan' using errcode = '42501';
  end if;

  if p_kind not in ('lessons','tests','reports') then
    raise exception 'Ongeldig usage-kind: %', p_kind;
  end if;

  update facula.usage_counters uc
  set
    lessons_generated = greatest(0, uc.lessons_generated - case when p_kind = 'lessons' then 1 else 0 end),
    tests_generated = greatest(0, uc.tests_generated - case when p_kind = 'tests' then 1 else 0 end),
    reports_generated = greatest(0, uc.reports_generated - case when p_kind = 'reports' then 1 else 0 end),
    updated_at = now()
  where uc.user_id = p_user_id and uc.period_start = v_period
  returning case p_kind
    when 'lessons' then uc.lessons_generated
    when 'tests' then uc.tests_generated
    when 'reports' then uc.reports_generated
  end into v_current;

  return query select coalesce(v_current, 0), v_period;
end;
$$;

comment on function facula.refund_usage(uuid, text) is
  'Boekt één eenheid van het maandquotum terug na een mislukte generatie/opslag. Tegenhanger van try_increment_usage.';

revoke execute on function facula.refund_usage(uuid, text) from public, anon;
grant execute on function facula.refund_usage(uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';
