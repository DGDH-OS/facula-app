-- Huisstijl — één rij per docent met de kleuren, het lettertype, de
-- schoolnaam en het schoollogo dat op lessen, toetsen en rapporten komt.
--
-- Eén rij per gebruiker, dus user_id IS de primary key: een docent heeft
-- één huisstijl, geen lijst. Dat scheelt een aparte id-kolom, maakt een
-- upsert triviaal (on conflict (user_id)) en sluit per constructie uit dat
-- er ooit twee rijen voor dezelfde docent bestaan.
--
-- In tegenstelling tot facula.profiles en facula.usage_counters mag de
-- gebruiker hier WEL zelf schrijven: dit zijn puur eigen voorkeuren zonder
-- gevolgen voor abonnement of quotum. Vandaar volledige eigen CRUD, altijd
-- afgebakend met auth.uid() = user_id.
--
-- Het logo zelf staat niet in deze tabel maar in de private storage-bucket
-- school-logos; hier staat alleen het pad plus het bestandstype. Zo blijft de
-- rij klein en kan een logo vervangen worden zonder de rest van de huisstijl
-- aan te raken.
--
-- Eén vast objectpad per docent: '<user_id>/logo', zonder extensie. Dat is
-- een bewuste keuze na een fout in de eerste opzet, waar het pad de extensie
-- van het bestandstype droeg. Daar kon één docent twee objecten hebben, en
-- dus moest elke upload het object met de ándere extensie opruimen. Twee
-- gelijktijdige uploads (de een png, de ander jpg) konden elkaars net
-- geüploade logo verwijderen: A uploadt en gaat opruimen, B uploadt intussen
-- het andere type, A's opruiming haalt B's verse object weg terwijl de rij er
-- wél naar wijst. Resultaat: een huisstijl die naar een verdwenen bestand
-- verwijst.
--
-- Met één pad bestaat dat probleem niet meer: een upload overschrijft altijd
-- hetzelfde object (upsert) en verwijdert er nooit een. Omdat het pad geen
-- extensie meer draagt, kan het bestandstype er niet meer uit afgeleid worden;
-- vandaar de kolom logo_mime ernaast.
--
-- Wat één vast pad NIET oplost: een upload en een verwijdering van dezelfde
-- docent die door elkaar lopen. Die raken hetzelfde object van twee kanten, en
-- object en rij zijn niet samen in een transactie te zetten. Daarvoor staat
-- onderaan deze migratie de logo-lease: de kolommen logo_lock_until en
-- logo_lock_token plus facula.claim_logo_lock() / facula.release_logo_lock()
-- en de twee schrijfpaden die hetzelfde token eisen
-- (facula.set_logo_with_lease, facula.logo_lock_held).
--
-- Idempotent: opnieuw draaien mag.

create table if not exists facula.huisstijl (
  user_id uuid primary key references auth.users (id) on delete cascade,
  preset text not null default 'facula'
    check (preset in ('facula', 'mihiriban', 'rustig', 'contrast', 'eigen')),
  -- Kleuren als #RRGGBB in hoofdletters. De check is bewust alleen een
  -- vormcheck: of de combinatie genoeg contrast heeft, wordt afgedwongen in
  -- src/lib/huisstijl/themes.ts en in PUT /api/huisstijl, want die regel
  -- (4,5:1 voor tekst, 3:1 voor accent) is niet in SQL uit te drukken.
  accent text not null default '#16233B' check (accent ~ '^#[0-9A-F]{6}$'),
  tekst text not null default '#2A2620' check (tekst ~ '^#[0-9A-F]{6}$'),
  achtergrond text not null default '#FAF6EF' check (achtergrond ~ '^#[0-9A-F]{6}$'),
  lettertype text not null default 'serif' check (lettertype in ('sans', 'serif')),
  schoolnaam text check (schoolnaam is null or char_length(schoolnaam) <= 120),
  -- Pad binnen de bucket school-logos: exact '<user_id>/logo', de enige naam
  -- die het storage-beleid onderaan deze migratie toelaat. De check hier is
  -- alleen een vormcheck (uuid gevolgd door /logo); dat het uuid de eigen
  -- user_id is, dwingt het storage-beleid af, en de app controleert het nog
  -- eens vóór elk gebruik van het pad (zie geldigLogoPad in
  -- src/lib/huisstijl/server.ts).
  logo_path text check (
    logo_path is null
    or logo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
  ),
  -- Het bestandstype van het object op dat pad. Nodig omdat het pad geen
  -- extensie meer heeft: zonder deze kolom zou elke lezer moeten gokken of
  -- vertrouwen op de content-type die storage teruggeeft.
  logo_mime text check (logo_mime is null or logo_mime in ('image/png', 'image/jpeg')),
  logo_standaard_aan boolean not null default true,
  -- Lease die logomutaties van dezelfde docent op een rij zet: zolang deze
  -- tijdstempel in de toekomst ligt, heeft een aanvraag het logo van deze
  -- docent in handen en krijgt een tweede aanvraag een 409. Zie
  -- facula.claim_logo_lock() onderaan deze migratie voor het waarom.
  logo_lock_until timestamptz,
  -- Welke aanvraag die lease in handen heeft. Elke geslaagde claim zet hier
  -- een nieuw uuid neer; teruggeven en schrijven kan alleen wie dat uuid
  -- meestuurt. Zonder dit onderscheid kan een aanvraag met een verlopen lease
  -- de lease van zijn opvolger wissen en dwars door diens mutatie heen
  -- schrijven.
  logo_lock_token uuid,
  updated_at timestamptz not null default now()
);

-- Voor omgevingen waar een eerdere versie van dit bestand al gedraaid heeft:
-- de create table hierboven doet niets meer zodra de tabel bestaat, dus de
-- nieuwe kolom en de aangescherpte padvorm moeten er apart bij.
alter table facula.huisstijl
  add column if not exists logo_mime text;

alter table facula.huisstijl
  add column if not exists logo_lock_until timestamptz;

alter table facula.huisstijl
  add column if not exists logo_lock_token uuid;

alter table facula.huisstijl drop constraint if exists huisstijl_logo_path_check;
alter table facula.huisstijl drop constraint if exists huisstijl_logo_mime_check;

-- Paden uit de oude opzet (met extensie) zouden de nieuwe vorm breken. Ze
-- wijzen naar objecten die het storage-beleid hieronder niet meer toelaat en
-- zijn dus toch onbruikbaar: leeghalen in plaats van de migratie erop laten
-- stuklopen. De docent uploadt zijn logo opnieuw; het achtergebleven object
-- gaat mee bij accountverwijdering, die de map uitlijst.
update facula.huisstijl
set logo_path = null, logo_mime = null
where logo_path is not null
  and logo_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$';

alter table facula.huisstijl
  add constraint huisstijl_logo_path_check check (
    logo_path is null
    or logo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/logo$'
  );

alter table facula.huisstijl
  add constraint huisstijl_logo_mime_check check (
    logo_mime is null or logo_mime in ('image/png', 'image/jpeg')
  );

comment on table facula.huisstijl is
  'Eigen huisstijl per docent: kleuren, lettertype, schoolnaam en pad (<user_id>/logo) plus bestandstype van het schoollogo in de bucket school-logos.';

alter table facula.huisstijl enable row level security;

drop policy if exists "huisstijl_select_own" on facula.huisstijl;
drop policy if exists "huisstijl_insert_own" on facula.huisstijl;
drop policy if exists "huisstijl_update_own" on facula.huisstijl;
drop policy if exists "huisstijl_delete_own" on facula.huisstijl;

create policy "huisstijl_select_own"
  on facula.huisstijl
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "huisstijl_insert_own"
  on facula.huisstijl
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Zowel using als with check: using bepaalt welke rij bijgewerkt mag worden,
-- with check wat de rij daarna mag zijn. Zonder de tweede zou een docent zijn
-- eigen rij naar een andere user_id kunnen schrijven.
create policy "huisstijl_update_own"
  on facula.huisstijl
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "huisstijl_delete_own"
  on facula.huisstijl
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant usage on schema facula to authenticated;
grant select, insert, update, delete on facula.huisstijl to authenticated;
grant all on facula.huisstijl to service_role;

-- ---------------------------------------------------------------------------
-- updated_at komt van de database.
-- ---------------------------------------------------------------------------
-- De routes stuurden hier zelf een tijdstempel mee (new Date().toISOString()).
-- Dat is de klok van de machine waarop die route toevallig draait, en die klok
-- kan afwijken van de klok waarmee alle andere tijden in deze database gezet
-- zijn — inclusief logo_lock_until, dat de volgorde van logomutaties bepaalt.
-- Twee bronnen voor "wanneer" naast elkaar is er een te veel. De trigger
-- overschrijft daarom wat de aanroeper ook meestuurt; de kolom is niet langer
-- door de client te zetten.
create or replace function facula.huisstijl_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists huisstijl_set_updated_at on facula.huisstijl;
create trigger huisstijl_set_updated_at
  before insert or update on facula.huisstijl
  for each row
  execute function facula.huisstijl_set_updated_at();

-- ---------------------------------------------------------------------------
-- De logo-lease: logomutaties van dezelfde docent serialiseren.
-- ---------------------------------------------------------------------------
-- Waarom dit nodig is. Een upload en een verwijdering raken twee dingen die
-- bij elkaar horen: het object '<user_id>/logo' in de bucket en de kolommen
-- logo_path/logo_mime in de rij hieronder. Die twee zijn niet in een
-- transactie te vatten (storage staat buiten deze database), dus gebeuren ze
-- na elkaar. Lopen een POST en een DELETE van dezelfde docent door elkaar, dan
-- is er geen ordening waarin het altijd goed gaat: de verwijdering kan het
-- object weghalen dat de upload er net heeft neergezet terwijl de rij ernaar
-- verwijst (huisstijl die naar een verdwenen bestand wijst), of de upload zet
-- een pad in de rij dat de verwijdering een moment later leegt terwijl het
-- object blijft liggen.
--
-- De oplossing is niet een slimmere volgorde maar minder gelijktijdigheid: per
-- docent mag er maar één logomutatie tegelijk lopen. Deze functie claimt dat
-- recht voor 30 seconden.
--
-- SECURITY INVOKER, in tegenstelling tot de usage-RPC's: hier is niets nodig
-- wat de docent zelf niet mag. Hij mag zijn eigen huisstijl-rij schrijven (zie
-- de policies hierboven), dus de claim loopt gewoon onder zijn eigen rechten
-- en RLS blijft de grens. Een definer-functie zou die grens hier onnodig
-- opheffen.
--
-- Waarom een tijdstempel in de rij en geen advisory lock: een lock leeft in
-- één databasesessie, en de route praat via PostgREST — elke aanroep kan een
-- andere sessie zijn, en een sessie die halverwege wegvalt geeft zijn lock
-- meteen terug. Een tijdstempel overleeft dat, en loopt na 30 seconden zelf af
-- als een aanvraag crasht voordat hij hem vrijgaf.
--
-- De volgorde in de functie is de kern. De update filtert op
-- "logo_lock_until is null or logo_lock_until < now()" en pakt daarmee een
-- rijlock. Twee gelijktijdige claims kunnen dus niet samen slagen: de tweede
-- wacht op de rijlock van de eerste, ziet daarna de bijgewerkte waarde in de
-- toekomst liggen, raakt nul rijen en geeft null terug. De klok is die van de
-- database (now()), niet die van de aanroeper.
--
-- Elke geslaagde claim krijgt bovendien een eigen token (logo_lock_token), en
-- dat token is wat de ene lease van de volgende onderscheidt. Dat onderscheid
-- is nodig zodra een aanvraag langer duurt dan zijn 30 seconden: zijn lease is
-- dan verlopen, een tweede aanvraag heeft intussen geclaimd, en een release
-- die alleen op user_id filtert zou de verse lease van die tweede wissen. Erger
-- nog, de eerste zou daarna gewoon doorschrijven en de mutatie van de tweede
-- overschrijven. Dat is niet "de serialisatie geldt even niet", dat is een
-- upload die de verwijdering van iemands logo ongedaan maakt.
--
-- Met het token kan dat niet meer. facula.release_logo_lock(p_token) raakt
-- alleen de rij waar dat token nog in staat, en beide schrijfpaden
-- (facula.set_logo_with_lease en facula.logo_lock_held) eisen hetzelfde token
-- én een lease die nog loopt. Een aanvraag die te lang deed, krijgt daar nul
-- rijen terug en stopt met een 409 in plaats van de mutatie van een ander te
-- overschrijven.

-- Eerst de vorige vormen weg: claim_logo_lock() gaf een boolean terug en
-- release_logo_lock() had geen parameters. Een create or replace kan het
-- returntype niet wijzigen, en de parameterloze release zou naast de nieuwe
-- blijven bestaan — precies de versie die zonder token elke lease wist.
drop function if exists facula.claim_logo_lock();
drop function if exists facula.release_logo_lock();

create or replace function facula.claim_logo_lock()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_token uuid := pg_catalog.gen_random_uuid();
  v_geclaimd uuid;
begin
  if v_user_id is null then
    raise exception 'Authenticatie vereist' using errcode = '42501';
  end if;

  -- De rij moet bestaan voordat er iets te vergrendelen valt: een docent die
  -- zijn eerste logo uploadt heeft nog geen huisstijl-rij.
  insert into facula.huisstijl (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  update facula.huisstijl h
  set logo_lock_until = now() + interval '30 seconds',
      logo_lock_token = v_token
  where h.user_id = v_user_id
    and (h.logo_lock_until is null or h.logo_lock_until < now())
  returning h.logo_lock_token into v_geclaimd;

  -- null betekent bezet: de lease van een andere aanvraag loopt nog.
  return v_geclaimd;
end;
$$;

comment on function facula.claim_logo_lock() is
  'Claimt het recht om het logo van de ingelogde docent te wijzigen, 30 seconden, en geeft het token van die claim terug. Null als een andere aanvraag de lease al heeft. Serialiseert POST en DELETE op /api/huisstijl/logo per docent.';

-- Teruggeven na afloop, zodat een volgende aanvraag niet de 30 seconden hoeft
-- uit te zitten. Zonder deze functie zou de lease alleen op tijd verlopen; met
-- de functie is de wachttijd normaal nul.
--
-- Alleen de houder geeft terug: user_id én token moeten kloppen. Een aanvraag
-- wiens lease verliep en die daarna alsnog afrondt, raakt hier nul rijen en
-- laat de lease van zijn opvolger dus met rust. Geeft terug of er echt iets
-- vrijgegeven is, zodat de route dat in de logs kan zien.
create or replace function facula.release_logo_lock(p_token uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or p_token is null then
    return false;
  end if;

  update facula.huisstijl h
  set logo_lock_until = null,
      logo_lock_token = null
  where h.user_id = v_user_id
    and h.logo_lock_token = p_token;

  return found;
end;
$$;

comment on function facula.release_logo_lock(uuid) is
  'Geeft de logo-lease van de ingelogde docent terug, maar alleen als het meegegeven token nog de houder is. Een verlopen lease van een ander wordt dus niet gewist.';

-- De rijmutatie van het logo, onder hetzelfde token. Dit is de enige plek waar
-- logo_path en logo_mime nog geschreven worden: doet de route het zelf met een
-- upsert, dan is er tussen "lease claimen" en "rij schrijven" geen enkele
-- controle meer dat de lease onderweg niet verlopen en overgenomen is.
--
-- Nul rijen terug betekent precies dat: de lease is niet (meer) van jou. De
-- route maakt daar een 409 van. Voorwaarde en schrijfactie zitten in hetzelfde
-- statement, dus er is geen moment tussen controleren en schrijven waarin de
-- lease alsnog kan verlopen.
create or replace function facula.set_logo_with_lease(
  p_token uuid,
  p_logo_path text,
  p_logo_mime text
)
returns table(
  preset text,
  accent text,
  tekst text,
  achtergrond text,
  lettertype text,
  schoolnaam text,
  logo_path text,
  logo_mime text,
  logo_standaard_aan boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authenticatie vereist' using errcode = '42501';
  end if;

  return query
  with bijgewerkt as (
    update facula.huisstijl h
    set logo_path = p_logo_path,
        logo_mime = p_logo_mime
    where h.user_id = v_user_id
      and h.logo_lock_token = p_token
      and h.logo_lock_until > now()
    returning h.preset, h.accent, h.tekst, h.achtergrond, h.lettertype,
              h.schoolnaam, h.logo_path, h.logo_mime, h.logo_standaard_aan
  )
  select b.* from bijgewerkt b;
end;
$$;

comment on function facula.set_logo_with_lease(uuid, text, text) is
  'Schrijft logo_path/logo_mime van de ingelogde docent, maar alleen zolang de lease met dit token nog loopt. Geeft de bijgewerkte huisstijl terug, of geen rij als de lease verlopen of van een ander is.';

-- Of de lease met dit token nu nog loopt. Nodig vlak vóór een handeling die
-- niet in de database gebeurt en dus niet in hetzelfde statement te vatten is:
-- het verwijderen van het object in de bucket. Dat blijft een controle op een
-- ander moment dan de handeling zelf — de rijmutatie erna is de harde grens,
-- deze functie voorkomt alleen dat er onnodig een object gesloopt wordt.
create or replace function facula.logo_lock_held(p_token uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from facula.huisstijl h
    where h.user_id = auth.uid()
      and h.logo_lock_token = p_token
      and h.logo_lock_until > now()
  );
$$;

comment on function facula.logo_lock_held(uuid) is
  'Of de logo-lease met dit token nu nog van de ingelogde docent is.';

revoke execute on function facula.claim_logo_lock() from public, anon;
revoke execute on function facula.release_logo_lock(uuid) from public, anon;
revoke execute on function facula.set_logo_with_lease(uuid, text, text) from public, anon;
revoke execute on function facula.logo_lock_held(uuid) from public, anon;
grant execute on function facula.claim_logo_lock() to authenticated;
grant execute on function facula.release_logo_lock(uuid) to authenticated;
grant execute on function facula.set_logo_with_lease(uuid, text, text) to authenticated;
grant execute on function facula.logo_lock_held(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket school-logos, privé.
-- ---------------------------------------------------------------------------
-- Privé (public = false), dus een logo is nooit via een raadbare URL op te
-- halen; de app leest het server-side en levert het uit via
-- GET /api/huisstijl/logo. Grootte en bestandstype staan ook op de bucket
-- zelf, zodat een client die de API-route omzeilt en rechtstreeks naar
-- storage schrijft nog steeds tegen dezelfde grenzen aanloopt als
-- POST /api/huisstijl/logo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-logos',
  'school-logos',
  false,
  2097152, -- 2 MB
  array['image/png', 'image/jpeg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Elke docent mag alleen bij zijn eigen logo, en het pad moet exact het pad
-- zijn dat de app schrijft: '<auth.uid()>/logo' (zie
-- src/app/api/huisstijl/logo/route.ts, dat logoPad(user.id) gebruikt).
--
-- Bewust één exacte naam in plaats van "de eerste map is mijn user-id": met
-- alleen een mapcheck kan een ingelogde docent onbeperkt eigen bestanden in
-- zijn map zetten (andere namen, diepere mappen, willekeurig veel objecten)
-- en de bucket zo als gratis opslag gebruiken. Met deze vorm bestaat er per
-- docent hooguit één object, overschrijft een upload altijd zichzelf, en
-- hoeft geen enkel opruimpad ooit een ander object te verwijderen.
drop policy if exists "school_logos_select_own" on storage.objects;
drop policy if exists "school_logos_insert_own" on storage.objects;
drop policy if exists "school_logos_update_own" on storage.objects;
drop policy if exists "school_logos_delete_own" on storage.objects;

create policy "school_logos_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'school-logos'
    and name = auth.uid()::text || '/logo'
  );

create policy "school_logos_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'school-logos'
    and name = auth.uid()::text || '/logo'
  );

create policy "school_logos_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'school-logos'
    and name = auth.uid()::text || '/logo'
  )
  with check (
    bucket_id = 'school-logos'
    and name = auth.uid()::text || '/logo'
  );

create policy "school_logos_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'school-logos'
    and name = auth.uid()::text || '/logo'
  );

notify pgrst, 'reload schema';
