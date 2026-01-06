# Campus Rallye Admin Webanwendung

Webanwendung zur Verwaltung der Daten für die
[Campus Rallye App](https://github.com/DHBWLoerrach/CampusRallyeApp)
an der [DHBW Lörrach](https://www.dhbw-loerrach.de).

## Supabase-Datenbank erstellen

- Bei https://supabase.com kostenlos anmelden
- In Supabase ein neues Projekt erstellen (z.B. `CampusRallye`)
- Im Supabase-Projekt zum _SQL Editor_ wechseln (via linker Seitenleiste)
- Das SQL-Schema aus der Datei [`supabase/schema.sql`](supabase/schema.sql) in die Zwischenablage kopieren
- Das eben kopierte SQL-Schema im SQL-Editor einfügen und ausführen (grüner `Run`-Button).
- Zusätzlich die "Buckets" für Dateiverwaltung erstellen, siehe [`supabase/bucket.md`](supabase/bucket.md).

Supabase-Owner können einen SQL-Dump des Schemas (Tabellen, Funktionen, usw.) ohne Daten wie folgt mit dem Supabase-CLI erstellen:

```
supabase db dump --db-url "postgresql://postgres:<password>@<serverurl>/postgres" -f schema.sql --schema public
```

## KeyCloak für Authentifizierung

Die Authentifizierung der Nutzer in dieser Webanwendung erfolgt über KeyCloak. Dazu muss ein KeyCloak-Test-Server lokal als Docker-Container installiert werden. Siehe dazu das Repository und die zugehörige Anleitung im Readme: https://github.com/DHBWLoerrach/keycloak-test-server

**Achtung:** Benutzer dieser Webanwendung müssen Mitarbeiter der DHBW Lörrach sein, d.h. die KeyCloak-User müssen in der Rolle `staff` sein, um Zugriff auf die Webanwendung zu erhalten.

## Node.js installieren

Wenn noch nicht vorhanden, dann muss Node.js installiert werden (siehe https://nodejs.org)

## Webanwendung `campus-rallye-admin` lokal installieren

Dieses Projekt klonen und im Terminal in das Projektverzeichnis wechseln.

Im Projektverzeichnis die Abhängigkeiten installieren:

```sh
npm install
```

## Supabase in Webanwendung konfigurieren

Zum Schluss muss noch die Konfiguration zu Supabase angepasst werden. Dazu ist zunächst die Datei `.env.local`
im Projektverzeichnis zu erstellen. In `.env.local` müssen drei Einträge vorgenommen werden:

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
```

Optional kann zusätzlich `SUPABASE_URL` gesetzt werden (server-seitiger Override). Wenn es nicht gesetzt ist, wird server-seitig `NEXT_PUBLIC_SUPABASE_URL` verwendet.

Die Werte dazu sind folgendermaßen zu finden.

Im Webinterface von Supabase oben auf _Connect_ klicken und für `NEXT_PUBLIC_SUPABASE_URL` den passenden Wert im Reiter _App Frameworks_ verwenden.
Wenn `SUPABASE_URL` gesetzt wird, sollte es in der Regel denselben Wert haben.

Der benötigte API-Key für `SUPABASE_ANON_KEY` ist unter _Project Settings_ (Zahnrad in der linken Seitenleiste) und dort unter _API Keys_ zu finden.
Der Wert für `SUPABASE_JWT_SECRET` kann via _JWY Keys_ gefunden werden.

## Lokale SQLite-DB für Nutzerdaten

Jeder Nutzer dieser Webanwendung wird zusätzlich lokal in einer SQLite-DB gespeichert. Dafür SQLite installieren: https://sqlite.org

Folgendes zusätzlich zur Supabase-Config (s.o.) in `.env.local` eintragen:

```
SQLITE_DB_PATH=local-users.db
```

Dann das CLI von SQLite im Terminal starten mit (ggf. mit `sqlite3.exe` o.ä. unter Windows):

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
