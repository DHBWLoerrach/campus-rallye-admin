# Campus Rallye Admin Webanwendung

Webanwendung zur Verwaltung der Daten für die
[Campus Rallye App](https://github.com/DHBWLoerrach/CampusRallyeApp)
an der [DHBW Lörrach](https://www.dhbw-loerrach.de).

## Node.js installieren

Siehe https://nodejs.org

## Supabase-Datenbank erstellen

- Bei https://supabase.com kostenlos anmelden
- In Supabase ein neues Projekt erstellen (z.B. `CampusRallye`)
- Im Supabase-Projekt zum _SQL Editor_ wechseln (via linker Seitenleist)
- Das SQL-Schema aus dem zugehörigen Backend-Projekt kopieren (siehe Datei [`supabase/schema.sql`](supabase/schema.sql))
- SQL-Schema im SQL-Editor einfügen und ausführen

## KeyCloak für Authentifizierung

Die Authentifizierung der Nutzer erfolgt über KeyCloak. Dazu muss ein KeyCloak-Test-Server lokal als Docker-Container installiert werden. Siehe dazu https://github.com/DHBWLoerrach/keycloak-test-server

Achtung: Benutzer müssen Mitarbeiter der DHBW Lörrach sein, d.h. die KeyCloak-User müssen in der Rolle `staff` sein, um Zugriff auf die Webanwendung zu erhalten.

## Webanwendung `campus-rallye-admin` lokal installieren

Dieses Projekt klonen.

Im Projektverzeichnis die Abhängigkeiten installieren:

```sh
npm install
```

## Supabase in Webanwendung konfigurieren

Zum Schluss muss noch die Konfiguration zu Supabase angepasst werden. Dazu ist zunächst die Datei `.env.local`
im Projektverzeichnis zu erstellen. Dort `.env.local` müssen zwei Einträge vorgenommen werden:

```
SUPABASE_URL=http://SERVER:54321
SUPABASE_ANON_KEY=SUPABASE_ANON_KEY
```
Im Webinterface von Supabase oben auf _Connect_ klicken und für `SUPABASE_URL` den Wert im Reiter _App Frameworks_ verwenden.

Der benötigte API-Key für `SUPABASE_ANON_KEY` ist unter _Project Settings_ (Zahnrad in der linken Seitenleiste) und dort unter _API Keys_ zu finden.

## Lokale SQLite-DB für Nutzerdaten

SQLite installieren: https://sqlite.org

Folgendes zusätzlich zur Supabase-Config (s.o.) in `.env.local` eintragen:

```
SQLITE_DB_PATH=local-users.db
```

Dann das CLI von SQLite starten mit (ggf. mit `sqlite3.exe` o.ä. unter Windows):

```
sqlite3 local-users.db
```

In der SQLite-Shell folgenden SQL-Befehl ausführen:

```
CREATE TABLE IF NOT EXISTS local_users (
    user_id TEXT PRIMARY KEY,
    email TEXT,
    registered_at TEXT
);
```

SQLite-Shell mit `.exit` verlassen.

## Webanwendung starten

Im Projektverzeichnis ausführen:

```sh
npm run dev
```

Campus Rallye Admin Webapp im Browser öffnen: http://localhost:3000. Mit einem in KeyCloak erstellten User anmelden.
