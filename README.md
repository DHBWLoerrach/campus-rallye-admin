# Campus Rallye Admin Webanwendung

Webanwendung zur Verwaltung der Daten von Campus Rallyes an der
[DHBW Lörrach](https://www.dhbw-loerrach.de). 

## Vorbereitungen (Supabase)

Die Daten werden in Supabase gespeichert. Zur Weiterentwicklung und
Test der Webanwendung sollte diese mit einer lokalen Supabase-Instanz
auf dem eigenen Rechner verknüpft werden. Die Einrichtung einer lokalen
Supabase-Instanz wird in der 
[Supabase-Dokumentation](https://supabase.com/docs/guides/local-development/cli/getting-started) beschrieben.

Hier werden die für dieses Projekt benötigten Schritte aufgelistet:

- Supabase CLI installieren, siehe [Supabase-Dokumentation](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Docker](https://www.docker.com) installieren (Docker Desktop)
- Verzeichnis für die lokale Supabase-Instanz erstellen, z.B. `projects/rallye-db`
- Im Terminal in das eben erstellte Verzeichnis wechseln (`cd rallye-db`)
- Dort diesen Befehl ausführen: `supabase init`
- Supabase starten mit `supabase start` (Docker-Images werden heruntergeladen)
- Aktuelles Datenbankschema und Datenbankinhalt vom Projektverantwortlichen anfragen
- Das Datenbankschema als SQL-Datei speichern unter `rallye-db/supabase/migrations/`
- Den Datenbankinhalt als Datei `seed.sql` speichern unter `rallye-db/supabase/`
- Datenbank aus der Schema-SQL-Datei erstellen mit `supabase db reset`

Die Supabase-Instanz kann folgendermaßen heruntergefahren werden: `supabase stop`

## Webanwendung `campus-rallye-admin` lokal installieren

Projekt klonen.

Im Projektverzeichnis die Abhängigkeiten installieren:

```sh
npm install
```

## Webanwendung starten 

Im Projektverzeichnis ausführen:

```sh
npm run dev
```
