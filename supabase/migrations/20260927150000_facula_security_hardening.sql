-- Security hardening — bevindingen uit een audit van de live database.
--
-- (a) facula.profiles: rol authenticated had insert/update/delete via een
--     FOR ALL "own profile"-policy. Een ingelogde gebruiker kon zo zelf
--     subscription_status='active' zetten. Profielen horen alleen
--     geschreven te worden door de handle_new_user-trigger en de
--     Stripe-webhook (service_role) — nooit door de client zelf.
-- (b) facula.usage_counters: zelfde patroon, een gebruiker kon zijn eigen
--     teller op 0 zetten. Schrijven gebeurt alleen via de
--     try_increment_usage-RPC (security definer).
-- (c) facula.try_increment_usage / facula.get_current_usage: SECURITY
--     DEFINER, uitvoerbaar door anon, en vertrouwden p_user_id zonder het
--     tegen de ingelogde sessie te controleren — elke ingelogde (of zelfs
--     anonieme) aanroeper kon zo andermans usage lezen of ophogen.
-- (d) facula.handle_new_user: trigger-functie, hoort niet direct aanroepbaar
--     te zijn door anon/authenticated/public.
--
-- Idempotent: opnieuw draaien mag, revoke/policy-drop-if-exists/create or
-- replace maken herhaling veilig.

-- (a) profiles: alleen SELECT voor de eigenaar, schrijven alleen via
-- service_role (trigger/webhook).
revoke insert, update, delete on facula.profiles from authenticated, anon;

drop policy if exists "own profile" on facula.profiles;
drop policy if exists "profiles_select_own" on facula.profiles;

create policy "profiles_select_own"
  on facula.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- (b) usage_counters: alleen SELECT voor de eigenaar, schrijven alleen via
-- try_increment_usage (security definer, hieronder herdefinieerd).
revoke insert, update, delete on facula.usage_counters from authenticated, anon;

drop policy if exists "own usage" on facula.usage_counters;
drop policy if exists "usage_counters_select_own" on facula.usage_counters;

create policy "usage_counters_select_own"
  on facula.usage_counters
  for select
  to authenticated
  using (auth.uid() = user_id);

-- (c) try_increment_usage: zelfde signatuur/gedrag, nu met search_path-hardening
-- en een guard tegen het misbruiken van p_user_id door iemand anders dan de
-- ingelogde gebruiker zelf (of service_role, voor server-side gebruik).
create or replace function facula.try_increment_usage(
  p_user_id uuid,
  p_kind text,
  p_limit integer
)
returns table(allowed boolean, new_count integer, period_start date)
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

  if p_limit < 0 or p_limit > 10000 then
    raise exception 'Ongeldige limiet: %', p_limit;
  end if;

  insert into facula.usage_counters (user_id, period_start, lessons_generated, tests_generated, reports_generated)
  values (p_user_id, v_period, 0, 0, 0)
  on conflict (user_id) do nothing;

  perform 1 from facula.usage_counters uc where uc.user_id = p_user_id for update;

  update facula.usage_counters uc
  set period_start = v_period, lessons_generated = 0, tests_generated = 0, reports_generated = 0, updated_at = now()
  where uc.user_id = p_user_id and uc.period_start <> v_period;

  select case p_kind
    when 'lessons' then uc.lessons_generated
    when 'tests' then uc.tests_generated
    when 'reports' then uc.reports_generated
  end into v_current
  from facula.usage_counters uc
  where uc.user_id = p_user_id;

  if v_current >= p_limit then
    return query select false, v_current, v_period;
    return;
  end if;

  update facula.usage_counters uc
  set
    lessons_generated = uc.lessons_generated + case when p_kind = 'lessons' then 1 else 0 end,
    tests_generated = uc.tests_generated + case when p_kind = 'tests' then 1 else 0 end,
    reports_generated = uc.reports_generated + case when p_kind = 'reports' then 1 else 0 end,
    updated_at = now()
  where uc.user_id = p_user_id
  returning case p_kind
    when 'lessons' then uc.lessons_generated
    when 'tests' then uc.tests_generated
    when 'reports' then uc.reports_generated
  end into v_current;

  return query select true, v_current, v_period;
end;
$$;

revoke execute on function facula.try_increment_usage(uuid, text, integer) from public, anon;
grant execute on function facula.try_increment_usage(uuid, text, integer) to authenticated, service_role;

-- (c) get_current_usage: zelfde output, nu plpgsql zodat de guard kan.
create or replace function facula.get_current_usage(p_user_id uuid)
returns table(
  lessons_generated integer,
  tests_generated integer,
  reports_generated integer,
  period_start date
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.role() <> 'service_role' and (auth.uid() is null or p_user_id <> auth.uid()) then
    raise exception 'Niet toegestaan' using errcode = '42501';
  end if;

  return query
  select
    case when uc.period_start = (date_trunc('month', now()))::date then uc.lessons_generated else 0 end,
    case when uc.period_start = (date_trunc('month', now()))::date then uc.tests_generated else 0 end,
    case when uc.period_start = (date_trunc('month', now()))::date then uc.reports_generated else 0 end,
    uc.period_start
  from facula.usage_counters uc
  where uc.user_id = p_user_id
  union all
  select 0, 0, 0, (date_trunc('month', now()))::date
  where not exists (select 1 from facula.usage_counters uc where uc.user_id = p_user_id)
  limit 1;
end;
$$;

revoke execute on function facula.get_current_usage(uuid) from public, anon;
grant execute on function facula.get_current_usage(uuid) to authenticated, service_role;

-- (d) handle_new_user is een trigger-functie, hoort niet direct aanroepbaar
-- te zijn door anon/authenticated/public. Body wordt hier NIET aangeraakt.
revoke execute on function facula.handle_new_user() from public, anon, authenticated;

notify pgrst, 'reload schema';
