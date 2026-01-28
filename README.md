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
- Zusätzlich die "Buckets" für Dateiverwaltung erstellen, siehe [`supabase/buckets.md`](supabase/buckets.md).

Supabase-Owner können einen SQL-Dump des Schemas (Tabellen, Funktionen, usw.) ohne Daten wie folgt mit dem Supabase-CLI erstellen:

```
supabase db dump --db-url "postgresql://postgres:<password>@<serverurl>/postgres" -f schema.sql --schema public
```

### Hinweis zum Datenmodell

- `studiengang` wurde durch Departments ersetzt (Tabelle `department` + Verknüpfung über `join_department_rallye`).
- `tour_mode` existiert nicht mehr in `rallye`. Tour-Mode wird über `organization.default_rallye_id` abgebildet.
- Rallye-Statuswerte: `preparing`, `inactive`, `running`, `voting`, `ranking`, `ended`.

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

Zum Schluss muss noch die Konfiguration zu Supabase angepasst werden.
Im Projektverzeichnis wird eine Datei `.env.local` benötigt. Dafür kann
die bestehende Datei `env.example` mit Defaultwerten in eine `.env.local`
kopiert werden:

```
cp env.example .env.local
```

In `.env.local` müssen drei Einträge angepasst werden:

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWT_JWK=
```

Optional kann zusätzlich `SUPABASE_URL` gesetzt werden (server-seitiger Override). Wenn es nicht gesetzt ist, wird server-seitig `NEXT_PUBLIC_SUPABASE_URL` verwendet.

Die Werte dazu sind folgendermaßen zu finden.

Im Webinterface von Supabase oben auf _Connect_ klicken und für `NEXT_PUBLIC_SUPABASE_URL` den passenden Wert im Reiter _App Frameworks_ verwenden.
Wenn `SUPABASE_URL` gesetzt wird, sollte es in der Regel denselben Wert haben.

Der benötigte API-Key für `SUPABASE_ANON_KEY` ist unter _Project Settings_ (Zahnrad in der linken Seitenleiste) und dort unter _API Keys_ zu finden.

`SUPABASE_JWT_JWK` ist ein privater JWK (Elliptic Curve, P-256) und muss selbst lokal erzeugt und in Supabase importiert werden (dazu die Supabase-CLI installieren):

```
supabase gen signing-key --algorithm ES256
```

Dieser Befehl erzeugt ein JWK-JSON (inkl. `d`) und gibt es auf der Konsole aus. Wir benötigen nur den JSON-String. Das durch obigen Befehl generierte JWK-JSON (inkl. `d`) in Supabase importieren:

- Navigieren zu _Project Settings_ → _JWT Keys_ → _JWT Signing Keys_
- Neuen Key Standby Key erstellen mit `Create Standby Key`-Button
- Im Dialog `ES256 (ECC)` wählen und Haken bei `Import an existing private key` setzen
- In das Textfeld den JSON-String aus dem `supabase gen`- Befehl von oben einfügen und auf `Create standby key` klicken
- Mit Klick auf `Rotate keys`-Button wird der eben erstellte Key als Current Key aktiviert.

Das JWK-JSON vollständig als `SUPABASE_JWT_JWK` in `.env.local` ablegen:

```
SUPABASE_JWT_JWK='{"kty":"EC","kid":"1234ABC…", …Rest des JWK-JSONs…}'
```

## Lokale SQLite-DB für Nutzerdaten

Jeder Nutzer dieser Webanwendung wird zusätzlich lokal in einer SQLite-DB gespeichert. Dafür SQLite installieren: https://sqlite.org

Wenn `.env.local` aus `env.example` kopiert wurde, dann gibt es dort bereits folgenden Eintrag:

```
SQLITE_DB_PATH=local-users.db
```

Um die benötigte Tabelle zu erstellen, das CLI von SQLite im Terminal starten mit (ggf. mit `sqlite3.exe` o.ä. unter Windows):

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
