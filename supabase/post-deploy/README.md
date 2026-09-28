# supabase/post-deploy

SQL dat pas ná een deploy van de app mag draaien, en daarom bewust niet in
`supabase/migrations/` staat.

`supabase db push` past alles toe wat in `supabase/migrations/` ligt, in
tijdstempelvolgorde, in één keer. Een bestand dat weghaalt wat de versie van de
app die op dat moment nog in productie draait nog aanroept, mag daar dus niet
tussen liggen: dan is de volgorde niet meer te kiezen en loopt de oude versie
stuk in het venster tussen migratie en deploy. Hier ligt het buiten bereik van
`db push` en is de volgorde een bewuste handeling.

Bestanden hier worden handmatig toegepast, niet door een tool, en ze staan niet
in de migratiegeschiedenis van Supabase. Elk bestand is idempotent: opnieuw
draaien mag.

## Releasevolgorde

Voor de branch `les-v2`, in deze volgorde:

1. **Migraties toepassen**: `20260928120000_facula_huisstijl.sql` en
   `20260928160000_facula_quota_atomic_save.sql` (via `supabase db push`, of
   handmatig in dezelfde volgorde). Beide zijn additief: ze voegen toe wat de
   nieuwe app nodig heeft en halen niets weg wat de draaiende versie gebruikt.
2. **App deployen**: de `les-v2`-versie live zetten. Vanaf dat moment loopt het
   opslaan van lessen, toetsen en rapporten via `facula.save_with_quota`.
3. **Smoke-test op opslaan**: als ingelogde docent één les opslaan op de nieuwe
   deploy, en controleren dat de teller meeloopt. Slaagt dit niet, dan stap 4
   niet doen: de oude RPC is dan nog de terugvalweg.
4. **Post-deploy-bestand handmatig toepassen**:
   `20260928170000_facula_drop_old_quota_rpc.sql`. Dit trekt het uitvoerrecht op
   `facula.try_increment_usage` in en haalt de functie weg.

Stap 4 vóór stap 2 doen betekent dat de versie in productie zijn quota-check
kwijt is: het opslaan faalt daar dan (fail-closed, er gaat niets verloren aan de
telling), maar een docent raakt wel zijn zojuist gegenereerde les kwijt.

## Toepassen

Vanuit de repo-map, met de databaseverbinding van het project:

```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/post-deploy/20260928170000_facula_drop_old_quota_rpc.sql
```

Of via de SQL-editor in het Supabase-dashboard: de inhoud van het bestand
plakken en uitvoeren.

## Controleren

Na stap 4 hoort deze query nul rijen te geven:

```sql
select p.oid::regprocedure::text
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'facula' and p.proname = 'try_increment_usage';
```
