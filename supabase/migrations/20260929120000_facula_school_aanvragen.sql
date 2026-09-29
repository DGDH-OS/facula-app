-- Aanvragen voor een schoollicentie, ingediend op de publieke website.
--
-- Waarom een tabel en geen mailtje: er gaat in deze branch bewust geen mail
-- de deur uit (geen SMTP, geen bounce-risico op de gedeelde Supabase). Een rij
-- in de database is de eenvoudigste vorm die niets kan verliezen: de aanvraag
-- staat er, ook als niemand er dezelfde dag naar kijkt.
--
-- Deze tabel bevat zakelijke contactgegevens van een medewerker van een school
-- (naam, e-mail, eventueel telefoon). Dat zijn persoonsgegevens, dus geldt
-- dezelfde regel als voor de rest van dit schema: niemand mag erbij behalve de
-- server zelf.
--
-- Toegangsmodel, bewust het striktste van de drie mogelijke:
--   1. RLS staat aan en er is GEEN policy. Voor anon en authenticated betekent
--      dat: geen enkele rij, ook niet de eigen. Er is dus niets te lezen voor
--      wie de anon-key in handen heeft.
--   2. Alle rechten voor anon en authenticated zijn ingetrokken, zodat een
--      poging al op het tabelrecht stukloopt en niet pas op de policy.
--   3. Alleen service_role kan schrijven en lezen, en die sleutel staat alleen
--      in de serveromgeving. POST /api/school-aanvragen is de enige weg naar
--      binnen, en die route doet de validatie, de Origin-controle en een
--      eenvoudige rem op herhaald indienen.
--
-- Geen SECURITY DEFINER-functie voor het invoeren dus. Die zou uitvoerrecht
-- voor anon nodig hebben, en daarmee een weg naar deze tabel die buiten onze
-- route om gaat. Een aanvraagformulier is niet tijdkritisch genoeg om dat
-- risico waard te zijn.
--
-- Idempotent: opnieuw draaien mag.
--
-- Terugdraaien:
--   drop table if exists facula.school_aanvragen;
-- Er hangt niets aan deze tabel (geen foreign keys naar andere tabellen, geen
-- functies die hem lezen), dus die drop is veilig en compleet.

create table if not exists facula.school_aanvragen (
  id uuid primary key default gen_random_uuid(),
  -- De school zelf. Naam is het enige dat echt nodig is om terug te bellen.
  schoolnaam text not null check (char_length(schoolnaam) between 2 and 200),
  -- Wie de aanvraag doet. Geen achternaam-verplichting: "Marieke, teamleider"
  -- is voor een eerste gesprek genoeg.
  contactpersoon text not null check (char_length(contactpersoon) between 2 and 120),
  email text not null check (char_length(email) between 5 and 200 and position('@' in email) > 1),
  telefoon text check (telefoon is null or char_length(telefoon) <= 40),
  -- Hoeveel docenten het ongeveer betreft. Bepaalt de staffel, dus handig om
  -- vooraf te weten, maar nooit verplicht: wie het niet weet moet door kunnen.
  aantal_docenten integer check (aantal_docenten is null or aantal_docenten between 1 and 5000),
  bericht text check (bericht is null or char_length(bericht) <= 2000),
  -- Waar de aanvraag vandaan komt. Nu altijd 'website'; later kan hier
  -- 'pilotgesprek' of 'beurs' bij zonder schemawijziging.
  bron text not null default 'website' check (char_length(bron) <= 40),
  status text not null default 'nieuw'
    check (status in ('nieuw', 'in_gesprek', 'afgerond', 'afgewezen')),
  created_at timestamptz not null default now()
);

comment on table facula.school_aanvragen is
  'Aanvragen voor een schoollicentie vanaf de publieke site. Alleen service_role heeft toegang: RLS staat aan zonder policy en anon/authenticated hebben geen tabelrechten. Invoer loopt via POST /api/school-aanvragen.';

-- Nieuwste eerst opvragen is straks de enige leesvraag die hierop komt.
create index if not exists school_aanvragen_created_at_idx
  on facula.school_aanvragen (created_at desc);

alter table facula.school_aanvragen enable row level security;

-- Geen policies: zie punt 1 hierboven. Voor de zekerheid ook expliciet de
-- rechten intrekken, zodat een omgeving waar ooit een grant is gezet
-- (bijvoorbeeld door een breed 'grant all on all tables') alsnog dichtgaat.
revoke all on facula.school_aanvragen from anon, authenticated;
grant all on facula.school_aanvragen to service_role;

notify pgrst, 'reload schema';
