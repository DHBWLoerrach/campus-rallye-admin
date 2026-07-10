# Schema-Umbenennung an das Domänen-Glossar

**Datum:** 2026-07-10
**Status:** Design (zur Umsetzung freigegeben)
**Typ:** Reine Umbenennung (rename-only), kein Struktur-Umbau

## Ziel

Die Tabellen- und Spaltennamen in `supabase/schema.sql` an die in `CONTEXT.md`
festgelegte Ubiquitous Language (Domänen-Glossar, Abschnitt „Begriffe /
Datenmodell-Bezeichner") angleichen. Die aktuelle Benennung ist historisch
gewachsen und inkonsistent (Singular/Plural gemischt, redundante Präfixe,
camelCase-Constraint-Namen, Begriffe, die vom Glossar abweichen).

Das Glossar ist die **maßgebliche Quelle** für alle Ziel-Namen. Wo das Glossar
einen Begriff festlegt, gilt dieser.

## Rahmenentscheidungen

- **Autorität:** `CONTEXT.md`-Glossar. Kein neuer Namensvorschlag außerhalb des
  Glossars, außer bei den unten explizit gelisteten Grenzfällen.
- **Scope:** Nur Umbenennen. Keine neuen Tabellen, keine Strukturaufteilung
  (kein `rallye_template`, `campus_tour`, `question_origin`,
  `location_question`/`department_question` usw. — das bleibt einem späteren,
  eigenen Projekt vorbehalten).
- **Konvention:** Tabellennamen **durchgehend Plural**. FK-Spalten bleiben
  Singular (`rallye_id`, `question_id`, `team_id`, …).
- **Vorgehen:** Big-Bang, **keine** Kompatibilitäts-Views. Die mobile Rallye-App
  (separates Repo) wird vom Nutzer parallel angepasst.
- **Objekt-Namen:** Auch Funktions-, Constraint-, Index- und Sequence-Namen
  werden an die snake_case-Konvention und die neuen Tabellennamen angeglichen.

## Rename-Mapping

### Tabellen

| Aktuell                 | Ziel                    | Glossar-Begriff        |
| ----------------------- | ----------------------- | ---------------------- |
| `rallye`                | `rallyes`               | Rallye                 |
| `rallye_team`           | `teams`                 | Team                   |
| `join_rallye_questions` | `rallye_questions`      | Rallye-Frage           |
| `questions`             | `questions`             | Frage (unverändert)    |
| `questions_geocaching`  | `geocaching_questions`  | Geocaching-Frage       |
| `answers`               | `solution_options`      | Lösungsoption          |
| `team_questions`        | `team_answers`          | Team-Antwort           |
| `location`              | `locations`             | Standort               |
| `department`            | `departments`           | Bereich                |
| `voting_votes`          | `voting_votes`          | (unverändert)          |
| `voting_finalization`   | `voting_finalizations`  | (unverändert)          |

### Spalten (nur geänderte)

| Tabelle (neu)      | Aktuell                | Ziel          | Herkunft                          |
| ------------------ | ---------------------- | ------------- | --------------------------------- |
| `rallyes`          | `password`             | `rallye_code` | Glossar „Rallye-Code, nicht password" |
| `rallyes`          | `end_time`             | `rallye_end`  | Glossar „Rallye-Ende"             |
| `teams`            | `time_played`          | `play_time`   | Glossar „Spielzeit"               |
| `questions`        | `points`               | `point_value` | Glossar „Punktwert"               |
| `team_answers`     | `points`               | `team_points` | Glossar „Team-Punkte"             |
| `team_answers`     | `team_answer`          | `answer`      | Grenzfall: Präfix redundant im Tabellenkontext |
| `geocaching_questions` | `geocaching_input_type` | `input_type` | Grenzfall: Präfix redundant im Tabellenkontext |

Alle übrigen Spalten (`id`, `created_at`, `name`, `status`, `content`, `type`,
`hint`, `category`, `bucket_path`, `correct`, `text`, alle `*_id`-FKs,
`target_latitude`, `target_longitude`, `proximity_radius`, `is_voting`,
`finalized_at`, `voting_team_id`, `voted_for_team_id`, `default_rallye_id`)
bleiben unverändert.

### Objekte (Funktionen, Constraints, Indexe, Sequences, Trigger)

Nicht-Tabellen-Objekte werden konsistent nachgezogen. Kernpunkte:

- **Funktionen** (Körper an neue Tabellennamen anpassen; Namen an snake_case):
  - `JOIN_question_answer` → `join_question_answer`
  - `increment_team_question_points` → `increment_team_answer_points`
    (referenziert Tabelle `team_answers`)
  - `auto_finalize_voting`, `cast_voting_vote`,
    `finalize_voting_for_question`, `get_voted_voting_question_ids`:
    Namen bleiben, aber Körper referenzieren `rallyes`, `rallye_questions`,
    `teams`, `team_answers`, `solution_options`, `voting_votes`,
    `voting_finalizations`.
- **Constraints** an neue snake_case-Konvention:
  - `rallyeTeam_pkey` → `teams_pkey`; `rallyeTeam_rallye_id_fkey` → `teams_rallye_id_fkey`
  - `teamQuestions_pkey` → `team_answers_pkey`; `teamQuestions_*_fkey` → `team_answers_*_fkey`
  - `JOIN_rallye_questions_pkey` → `rallye_questions_pkey`; zugehörige FKs analog
  - übrige `*_pkey`/`*_fkey`/CHECK/UNIQUE-Namen an neue Tabellennamen angleichen
- **Indexe:** `voting_votes_*`, `rallye_department_id_idx` → `rallyes_department_id_idx` usw.
- **Sequences:** `answers_id_seq` → `solution_options_id_seq`,
  `rallye_team_id_seq` → `teams_id_seq`, `team_questions_id_seq` →
  `team_answers_id_seq`, `rallye_id_seq` → `rallyes_id_seq`,
  `location_id_seq` → `locations_id_seq`, `department_id_seq` →
  `departments_id_seq`, `questions_id_seq` bleibt.
- **Trigger:** `trigger_auto_finalize_voting` auf `rallyes` neu anlegen.
- **RLS-Policies & GRANTs:** referenzieren jeweils die neuen Tabellennamen.

## Betroffene Artefakte

- `supabase/schema.sql` — vollständig auf Endzustand neu geschrieben.
- `supabase/migration_20260710_rename_to_glossary.sql` — neue Datei (bisher
  existiert keine Migrations-Konvention im Repo).
- `lib/types.ts` — handgeschriebene Interfaces (`Rallye`, `Location`,
  `Department`, …) und deren Feldnamen. **Keine generierte Supabase-Typdatei**
  im Projekt, daher überschaubar.
- `actions/*.ts` — `.from('…')`-Aufrufe und Spalten-Selektionen. Verteilung der
  `.from()`-Referenzen (Ausgangslage): `rallye` 35, `join_rallye_questions` 26,
  `questions` 17, `department` 16, `location` 12, `answers` 7,
  `team_questions` 3, `rallye_team` 2.
- `app/**`, `components/**` — abgeleitete Feld-/Typnutzung.
- Tests (`*.test.ts(x)`) — laufen gegen **gemockte** Supabase-Clients, nicht
  gegen eine echte DB. Der Code-Sweep ist damit unabhängig vom
  DB-Migrationszeitpunkt; Tests müssen nach jedem Schritt grün bleiben.

### Risikoschwerpunkt `points`

`points` erscheint in ~16 Dateien und spaltet sich in **zwei** Zielnamen:
`questions.point_value` und `team_answers.team_points`. Zusätzlich gibt es
`points`-Vorkommen, die **keine** Spalte sind (Ergebnis-Summen, UI-Anzeige,
lokale Variablen). Kein globales Suchen-Ersetzen: jedes Vorkommen wird einzeln
zugeordnet. Dieser Punkt bekommt einen eigenen Umsetzungsschritt.

## Migrationsstrategie

**DB-Seite — eine transaktionale Migration:**

1. Eine Datei `supabase/migration_20260710_rename_to_glossary.sql`, in einer
   Transaktion, in dieser Reihenfolge:
   1. `ALTER TABLE … RENAME TO …` für alle Tabellen.
   2. `ALTER TABLE … RENAME COLUMN …` für alle Spalten-Renames.
   3. Constraints, Indexe, Sequences, Trigger umbenennen.
   4. `CREATE OR REPLACE FUNCTION …` für alle sechs Funktionen mit an die neuen
      Tabellennamen angepassten Körpern (und ggf. neuem Funktionsnamen samt
      `DROP FUNCTION` des alten Namens, wo umbenannt wird).
2. `supabase/schema.sql` wird auf den Endzustand neu geschrieben (Single Source
   of Truth für Neuaufsetzungen).
3. **Anwendung:** Der Nutzer spielt die Migration über den Supabase SQL-Editor
   **zuerst auf Dev** ein; gemeinsame Verifikation; danach auf **Prod**.

**Code-Seite — atomare Schritte (AGENTS.md):**

- Pro Tabelle ein Schritt: `.from()`-Referenzen, `lib/types.ts`-Interfaces,
  Komponenten und Tests. Je ein Commit, Stopp für OK, nach jedem Schritt
  `npm run lint`, `npm run check:format`, `npx tsc --noEmit`, `npm test`.
- `points` als eigener, sorgfältiger Schritt mit Vorkommen-für-Vorkommen-Zuordnung.

**Reihenfolge insgesamt:**

1. „Vertrags"-Schritt: Migrations-SQL + neu geschriebene `schema.sql`; auf Dev
   anwenden und verifizieren.
2. Code-Sweeps (atomare Schritte, Tests bleiben grün).
3. Prod-Migration + End-to-End-Verifikation der Admin-App gegen die migrierte DB.

## Verifikation

- Nach jedem Code-Schritt: `lint`, `check:format`, `tsc --noEmit`, `test` grün.
- Nach der Dev-Migration: Admin-App gegen Dev-DB starten und die Kernflüsse
  (Rallye-Liste, Rallye-Detail, Fragen-Zuordnung, Ergebnisse) durchklicken.
- Suche nach verbliebenen alten Bezeichnern im Code
  (`rallye_team`, `join_rallye_questions`, `team_questions`, `questions_geocaching`,
  `\.from\('answers'\)`, `end_time`, `time_played`, `password`, `team_answer`)
  muss leer sein (außer beabsichtigten Vorkommen).

## Nicht im Scope

- Neue Tabellen/Konzepte aus dem Glossar (Vorlagen, Campus-Tour, Studiengang/
  Studienzentrum, question_origin, Frage-Herkunft-Aufteilung).
- Inhaltliche/Verhaltensänderungen an Funktionen (nur Referenz-Anpassung).
- Anpassung der mobilen Rallye-App (separates Repo, vom Nutzer parallel).
