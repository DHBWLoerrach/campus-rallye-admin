# Campus Rallye Admin Webanwendung

Webanwendung zur Verwaltung der Daten für die
[Campus Rallye App](https://github.com/DHBWLoerrach/CampusRallyeApp)
an der [DHBW Lörrach](https://www.dhbw-loerrach.de).

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

Wenn alles geklappt hat, dann kann die lokale Supabase-Instanz mit dem Webinterface im Browser verwaltet werden: http://127.0.0.1:54323

Die Supabase-Instanz kann folgendermaßen heruntergefahren werden: `supabase stop`

## KeyCloak für Authentifizierung

Die Authentifizierung der Nutzer erfolgt über KeyCloak. Dazu muss ein KeyCloak-Test-Server lokal als Docker-Container installiert werden. Siehe dazu https://github.com/DHBWLoerrach/keycloak-test-server

Achtung: Benutzer müssen Mitarbeiter der DHBW Lörrach sein, d.h. die KeyCloak-User müssen in der Rolle `staff` sein, um Zugriff auf die Webanwendung zu erhalten.

## Webanwendung `campus-rallye-admin` lokal installieren

Projekt klonen.

Im Projektverzeichnis die Abhängigkeiten installieren:

```sh
npm install
```

## Supabase in Webanwendung konfigurieren

Zum Schluss muss noch die Konfiguration zu Supabase angepasst werden. Dazu ist zunächst die Datei `.env.local`
im Projektverzeichnis zu erstellen. Dort `.env.local` müssen zwei Einträge vorgenommen werden:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<LOCAL_SUPABASE_ANON_KEY>
```

Dort muss nun der Anon Key eingefügt werden. Dieser kann im Terminal
abgefragt werden (dazu ins Verzeichnis der lokalen Supabase-Instanz wechseln):

```sh
supabase status
```

## Lokale SQLite-DB für Nutzerdaten

TODO

```
CREATE TABLE IF NOT EXISTS local_users (
    user_id TEXT PRIMARY KEY,
    email TEXT,
    registered_at TEXT
);
```

## Webanwendung starten

Im Projektverzeichnis ausführen:

```sh
npm run dev
```
