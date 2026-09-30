-- Archief van nieuwsartikelen uit de RSS-feeds van de kranten zelf. Alleen
-- titel, link, datum en de korte samenvatting uit de feed: NOOIT de volledige
-- tekst (die wordt pas opgehaald als een docent een bron kiest). Zo kan de
-- bronnenzoeker ook oudere artikelen vinden dan wat nu in de feeds staat.
--
-- Geen persoonsgegevens. Alleen de server (service_role) leest en schrijft;
-- docenten hebben geen directe toegang. Artikelen ouder dan 12 maanden worden
-- door de dagelijkse taak opgeruimd.
-- Idempotent: opnieuw draaien mag.

create table if not exists facula.bronnen_archief (
  url text primary key check (url like 'https://%' and length(url) <= 500),
  titel text not null check (length(titel) <= 400),
  domein text not null check (length(domein) <= 60),
  datum timestamptz,
  samenvatting text not null default '' check (length(samenvatting) <= 1200),
  gezien_op timestamptz not null default now()
);

create index if not exists bronnen_archief_datum_idx on facula.bronnen_archief (datum desc);

alter table facula.bronnen_archief enable row level security;
-- Bewust geen policies: authenticated en anon zien niets.

revoke all on facula.bronnen_archief from anon, authenticated;
grant usage on schema facula to service_role;
grant all on facula.bronnen_archief to service_role;
