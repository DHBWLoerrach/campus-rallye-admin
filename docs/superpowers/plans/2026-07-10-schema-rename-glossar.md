# Schema-Umbenennung an das Domänen-Glossar — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle Tabellen-, Spalten- und Objekt-Namen der Supabase-DB und alle sie referenzierenden Code-Bezeichner an die in `CONTEXT.md` festgelegte Ubiquitous Language angleichen (reine Umbenennung, kein Struktur-Umbau).

**Architecture:** Eine transaktionale DB-Migration (`supabase/migration_20260710_rename_to_glossary.sql`) benennt in einem Rutsch Tabellen, Spalten, Constraints, Indexe, Sequences und Funktions-Körper um; `schema.sql` wird auf den Endzustand nachgezogen. Anschließend werden die Code-Referenzen tabellenweise in atomaren Commits umgezogen. Tests laufen gegen **gemockte** Supabase-Clients, die auf den `.from(<name>)`-String schalten — Quelldatei und Test müssen daher pro Tabelle im selben Commit geändert werden.

**Tech Stack:** Next.js 16 (App Router), Supabase (PostgREST), TypeScript, Vitest + React Testing Library, Zod.

## Global Constraints

- Ziel-Namen kommen ausschließlich aus dem `CONTEXT.md`-Glossar; darüber hinausgehende Namen nur bei den unten dokumentierten Grenzfällen.
- Tabellennamen **durchgehend Plural**; FK-Spalten bleiben Singular (`rallye_id`, `question_id`, `team_id`, `location_id`, `department_id`).
- Big-Bang, **keine** Kompatibilitäts-Views/Aliase. Die mobile Rallye-App (separates Repo) passt der Nutzer parallel an.
- Nach **jedem** Code-Task müssen `npm run lint`, `npm run check:format`, `npx tsc --noEmit` und `npm test` grün sein (Hard Rule aus AGENTS.md). Kein Commit bei rotem Zustand.
- Nach jedem Task Stopp und auf OK des Nutzers warten, bevor committet/weitergegangen wird.
- Code-Kommentare in Englisch; Prettier (2 Spaces, Single Quotes, Semikolons).

## Naming-Entscheidungen (aus Brainstorming + Spec)

| Bereich | Entscheidung |
| --- | --- |
| `answers` (Frage-Optionen) | **Voll** auf `solutionOption` umbenennen: DB `solution_options`, Rückgabe-Key, `Question`-Typ, Formular-State, Action-Parameter, Validierung. |
| `answers` in `upload-answers.ts` | Das ist die **Team-Antwort-Seite** (Upload-Fotos), NICHT solution_options. Property `UploadAnswerQuestion.answers` → `uploadAnswers` (Konsistenz, überladenen Begriff vermeiden). |
| `team_answer`-Spalte | DB-Spalte → `answer` (Präfix redundant in `team_answers`). Code-Row-Accessor entsprechend `answer`. |
| berechnete `points` | `RallyeResultRow.points` und die Aggregat-Map `pointsByTeam` sind **keine** DB-Spalten (Team-Gesamtsumme) → bleiben `points`. |

## Rename-Referenz (maßgeblich für alle Tasks)

### Tabellen

| Aktuell | Ziel |
| --- | --- |
| `rallye` | `rallyes` |
| `rallye_team` | `teams` |
| `join_rallye_questions` | `rallye_questions` |
| `questions_geocaching` | `geocaching_questions` |
| `answers` | `solution_options` |
| `team_questions` | `team_answers` |
| `location` | `locations` |
| `department` | `departments` |
| `voting_finalization` | `voting_finalizations` |
| `questions`, `voting_votes` | unverändert |

### Spalten

| Tabelle (neu) | Aktuell → Ziel |
| --- | --- |
| `rallyes` | `password` → `rallye_code`; `end_time` → `rallye_end` |
| `teams` | `time_played` → `play_time` |
| `questions` | `points` → `point_value` |
| `team_answers` | `points` → `team_points`; `team_answer` → `answer` |
| `geocaching_questions` | `geocaching_input_type` → `input_type` |

---

## Task 1: DB-Migration + schema.sql (Vertrag)

**Files:**
- Create: `supabase/migration_20260710_rename_to_glossary.sql`
- Modify: `supabase/schema.sql`

**Interfaces:**
- Produces: den neuen DB-Kontrakt (Tabellen-/Spalten-/Objektnamen), auf den alle folgenden Code-Tasks referenzieren.

Dieser Task ändert **keinen** TypeScript-Code; `npm test`/`tsc` sind davon unberührt (Tests mocken Supabase). Deliverable sind die zwei SQL-Dateien; die Migration wird vom Nutzer im Supabase-SQL-Editor **auf Dev** angewendet und dort verifiziert.

- [ ] **Step 1: Migrationsdatei anlegen**

Create `supabase/migration_20260710_rename_to_glossary.sql` mit exakt diesem Inhalt:

```sql
-- Rename schema objects to match the CONTEXT.md domain glossary.
-- Rename-only: no structural changes. Run once per environment (dev, then prod).
BEGIN;

-- 1. Tables
ALTER TABLE "public"."rallye" RENAME TO "rallyes";
ALTER TABLE "public"."rallye_team" RENAME TO "teams";
ALTER TABLE "public"."join_rallye_questions" RENAME TO "rallye_questions";
ALTER TABLE "public"."questions_geocaching" RENAME TO "geocaching_questions";
ALTER TABLE "public"."answers" RENAME TO "solution_options";
ALTER TABLE "public"."team_questions" RENAME TO "team_answers";
ALTER TABLE "public"."location" RENAME TO "locations";
ALTER TABLE "public"."department" RENAME TO "departments";
ALTER TABLE "public"."voting_finalization" RENAME TO "voting_finalizations";

-- 2. Columns
ALTER TABLE "public"."rallyes" RENAME COLUMN "password" TO "rallye_code";
ALTER TABLE "public"."rallyes" RENAME COLUMN "end_time" TO "rallye_end";
ALTER TABLE "public"."teams" RENAME COLUMN "time_played" TO "play_time";
ALTER TABLE "public"."questions" RENAME COLUMN "points" TO "point_value";
ALTER TABLE "public"."team_answers" RENAME COLUMN "points" TO "team_points";
ALTER TABLE "public"."team_answers" RENAME COLUMN "team_answer" TO "answer";
ALTER TABLE "public"."geocaching_questions" RENAME COLUMN "geocaching_input_type" TO "input_type";

-- 3. Constraints
ALTER TABLE "public"."rallyes" RENAME CONSTRAINT "rallye_pkey" TO "rallyes_pkey";
ALTER TABLE "public"."rallyes" RENAME CONSTRAINT "rallye_department_id_fkey" TO "rallyes_department_id_fkey";
ALTER TABLE "public"."teams" RENAME CONSTRAINT "rallyeTeam_pkey" TO "teams_pkey";
ALTER TABLE "public"."teams" RENAME CONSTRAINT "rallyeTeam_rallye_id_fkey" TO "teams_rallye_id_fkey";
ALTER TABLE "public"."rallye_questions" RENAME CONSTRAINT "JOIN_rallye_questions_pkey" TO "rallye_questions_pkey";
ALTER TABLE "public"."rallye_questions" RENAME CONSTRAINT "JOIN_rallye_questions_question_id_fkey" TO "rallye_questions_question_id_fkey";
ALTER TABLE "public"."rallye_questions" RENAME CONSTRAINT "JOIN_rallye_questions_rallye_id_fkey" TO "rallye_questions_rallye_id_fkey";
ALTER TABLE "public"."solution_options" RENAME CONSTRAINT "answers_pkey" TO "solution_options_pkey";
ALTER TABLE "public"."solution_options" RENAME CONSTRAINT "answers_question_id_fkey" TO "solution_options_question_id_fkey";
ALTER TABLE "public"."team_answers" RENAME CONSTRAINT "teamQuestions_pkey" TO "team_answers_pkey";
ALTER TABLE "public"."team_answers" RENAME CONSTRAINT "team_questions_team_id_question_id_key" TO "team_answers_team_id_question_id_key";
ALTER TABLE "public"."team_answers" RENAME CONSTRAINT "teamQuestions_question_id_fkey" TO "team_answers_question_id_fkey";
ALTER TABLE "public"."team_answers" RENAME CONSTRAINT "teamQuestions_team_id_fkey" TO "team_answers_team_id_fkey";
ALTER TABLE "public"."geocaching_questions" RENAME CONSTRAINT "questions_geocaching_pkey" TO "geocaching_questions_pkey";
ALTER TABLE "public"."geocaching_questions" RENAME CONSTRAINT "questions_geocaching_input_type_check" TO "geocaching_questions_input_type_check";
ALTER TABLE "public"."geocaching_questions" RENAME CONSTRAINT "questions_geocaching_question_id_fkey" TO "geocaching_questions_question_id_fkey";
ALTER TABLE "public"."locations" RENAME CONSTRAINT "location_pkey" TO "locations_pkey";
ALTER TABLE "public"."locations" RENAME CONSTRAINT "location_default_rallye_id_fkey" TO "locations_default_rallye_id_fkey";
ALTER TABLE "public"."departments" RENAME CONSTRAINT "department_pkey" TO "departments_pkey";
ALTER TABLE "public"."departments" RENAME CONSTRAINT "department_location_id_fkey" TO "departments_location_id_fkey";
ALTER TABLE "public"."voting_finalizations" RENAME CONSTRAINT "voting_finalization_pkey" TO "voting_finalizations_pkey";
ALTER TABLE "public"."voting_finalizations" RENAME CONSTRAINT "voting_finalization_question_id_fkey" TO "voting_finalizations_question_id_fkey";
ALTER TABLE "public"."voting_finalizations" RENAME CONSTRAINT "voting_finalization_rallye_id_fkey" TO "voting_finalizations_rallye_id_fkey";

-- 4. Indexes
ALTER INDEX "public"."rallye_department_id_idx" RENAME TO "rallyes_department_id_idx";

-- 5. Sequences
ALTER SEQUENCE "public"."rallye_id_seq" RENAME TO "rallyes_id_seq";
ALTER SEQUENCE "public"."rallye_team_id_seq" RENAME TO "teams_id_seq";
ALTER SEQUENCE "public"."answers_id_seq" RENAME TO "solution_options_id_seq";
ALTER SEQUENCE "public"."team_questions_id_seq" RENAME TO "team_answers_id_seq";
ALTER SEQUENCE "public"."location_id_seq" RENAME TO "locations_id_seq";
ALTER SEQUENCE "public"."department_id_seq" RENAME TO "departments_id_seq";

-- 6. Functions (bodies updated to new names; two functions renamed)
DROP FUNCTION IF EXISTS "public"."JOIN_question_answer"(bigint);
CREATE OR REPLACE FUNCTION "public"."join_question_answer"("rallye_id" bigint) RETURNS "record"
    LANGUAGE "sql"
    AS $$SELECT *
FROM solution_options A, rallye_questions RQ
WHERE RQ.rallye_id = rallye_id
AND RQ.question_id = A.question_id$$;
ALTER FUNCTION "public"."join_question_answer"("rallye_id" bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."auto_finalize_voting"() RETURNS trigger
        LANGUAGE "plpgsql" SECURITY DEFINER
        SET search_path TO 'public'
        AS $$
DECLARE
    voting_question record;
BEGIN
    IF OLD."status" = 'voting' AND NEW."status" IN ('results', 'ended') THEN
        FOR voting_question IN
            SELECT "question_id"
            FROM "public"."rallye_questions"
            WHERE "rallye_id" = NEW."id"
                AND "is_voting" = true
        LOOP
            PERFORM "public"."finalize_voting_for_question"(NEW."id", voting_question."question_id");
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."cast_voting_vote"("rallye_id_param" bigint, "question_id_param" bigint, "voting_team_id_param" bigint, "voted_for_team_id_param" bigint) RETURNS void
        LANGUAGE "plpgsql" SECURITY DEFINER
        SET search_path TO 'public'
        AS $$
DECLARE
    rallye_status "public"."rallye_status";
BEGIN
    IF "voting_team_id_param" = "voted_for_team_id_param" THEN
        RAISE EXCEPTION 'Voting team cannot vote for itself.';
    END IF;

    SELECT "status" INTO rallye_status
    FROM "public"."rallyes" WHERE "id" = "rallye_id_param";

    IF rallye_status IS NULL THEN
        RAISE EXCEPTION 'Rallye % does not exist.', "rallye_id_param";
    END IF;
    IF rallye_status <> 'voting' THEN
        RAISE EXCEPTION 'Rallye % is not in voting status.', "rallye_id_param";
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "public"."rallye_questions"
        WHERE "rallye_id" = "rallye_id_param"
            AND "question_id" = "question_id_param"
            AND "is_voting" = true
    ) THEN
        RAISE EXCEPTION 'Question % is not a voting question for rallye %.', "question_id_param", "rallye_id_param";
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "public"."teams"
        WHERE "id" = "voting_team_id_param" AND "rallye_id" = "rallye_id_param"
    ) THEN
        RAISE EXCEPTION 'Voting team % does not belong to rallye %.', "voting_team_id_param", "rallye_id_param";
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "public"."teams"
        WHERE "id" = "voted_for_team_id_param" AND "rallye_id" = "rallye_id_param"
    ) THEN
        RAISE EXCEPTION 'Voted-for team % does not belong to rallye %.', "voted_for_team_id_param", "rallye_id_param";
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "public"."team_answers"
        WHERE "team_id" = "voted_for_team_id_param"
            AND "question_id" = "question_id_param"
            AND "answer" IS NOT NULL
            AND btrim("answer") <> ''
    ) THEN
        RAISE EXCEPTION 'Voted-for team % has no answer for question %.', "voted_for_team_id_param", "question_id_param";
    END IF;

    INSERT INTO "public"."voting_votes" (
        "rallye_id", "question_id", "voting_team_id", "voted_for_team_id"
    )
    VALUES (
        "rallye_id_param", "question_id_param", "voting_team_id_param", "voted_for_team_id_param"
    )
    ON CONFLICT ("rallye_id", "question_id", "voting_team_id") DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."finalize_voting_for_question"("rallye_id_param" bigint, "question_id_param" bigint) RETURNS void
        LANGUAGE "plpgsql" SECURITY DEFINER
        SET search_path TO 'public'
        AS $$
DECLARE
    did_finalize_count integer := 0;
    winner_team_id bigint;
    question_points bigint := 0;
BEGIN
    INSERT INTO "public"."voting_finalizations" ("rallye_id", "question_id")
    VALUES ("rallye_id_param", "question_id_param")
    ON CONFLICT ("rallye_id", "question_id") DO NOTHING;

    GET DIAGNOSTICS did_finalize_count = ROW_COUNT;
    IF did_finalize_count = 0 THEN
        RETURN;
    END IF;

    SELECT COALESCE("questions"."point_value", 0) INTO question_points
    FROM "public"."questions" WHERE "questions"."id" = "question_id_param";

    SELECT "voting_votes"."voted_for_team_id" INTO winner_team_id
    FROM "public"."voting_votes"
    INNER JOIN "public"."team_answers"
        ON "team_answers"."team_id" = "voting_votes"."voted_for_team_id"
     AND "team_answers"."question_id" = "voting_votes"."question_id"
    WHERE "voting_votes"."rallye_id" = "rallye_id_param"
        AND "voting_votes"."question_id" = "question_id_param"
        AND "team_answers"."answer" IS NOT NULL
        AND btrim("team_answers"."answer") <> ''
    GROUP BY "voting_votes"."voted_for_team_id"
    ORDER BY COUNT(*) DESC, MIN("voting_votes"."created_at") ASC, "voting_votes"."voted_for_team_id" ASC
    LIMIT 1;

    IF winner_team_id IS NULL THEN
        RETURN;
    END IF;

    UPDATE "public"."team_answers"
    SET "correct" = true, "team_points" = question_points
    WHERE "team_id" = winner_team_id AND "question_id" = "question_id_param";
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_voted_voting_question_ids"("rallye_id_param" bigint, "voting_team_id_param" bigint) RETURNS TABLE("question_id" bigint)
        LANGUAGE "sql" SECURITY DEFINER
        SET search_path TO 'public'
        AS $$
        SELECT "voting_votes"."question_id"
        FROM "public"."voting_votes"
        INNER JOIN "public"."teams"
            ON "teams"."id" = "voting_votes"."voting_team_id"
         AND "teams"."rallye_id" = "voting_votes"."rallye_id"
        WHERE "voting_votes"."rallye_id" = "rallye_id_param"
            AND "voting_votes"."voting_team_id" = "voting_team_id_param";
$$;

DROP FUNCTION IF EXISTS "public"."increment_team_question_points"(integer);
CREATE OR REPLACE FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) RETURNS "public"."team_answers"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  updated_row team_answers%ROWTYPE;
BEGIN
  UPDATE team_answers
  SET team_points = team_points + 1
  WHERE id = target_answer_id
  RETURNING * INTO updated_row;
  RETURN updated_row;
END;
$$;
ALTER FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) OWNER TO "postgres";

-- 7. Re-grant the two renamed functions (grants on the old names were dropped)
GRANT ALL ON FUNCTION "public"."join_question_answer"("rallye_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."join_question_answer"("rallye_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_question_answer"("rallye_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) TO "service_role";

COMMIT;
```

Hinweise: RLS-Policies, GRANTs auf Tabellen/Sequences und der Trigger `trigger_auto_finalize_voting` folgen den umbenannten Objekten automatisch (an OID gebunden) und brauchen im Migrationsskript keine Anpassung. Nur die zwei umbenannten Funktionen (`join_question_answer`, `increment_team_answer_points`) benötigen neue GRANTs (Schritt 7).

- [ ] **Step 2: schema.sql auf Endzustand nachziehen**

`schema.sql` ist die Single Source of Truth für Neuaufsetzungen und muss den Post-Migrations-Zustand exakt abbilden. Wende in `supabase/schema.sql` diese Identifier-Ersetzungen global an (quotierte und unquotierte Vorkommen). Reihenfolge beachten: **spezifischere zuerst**, damit z. B. `questions_geocaching` vor `questions` greift.

1. `questions_geocaching` → `geocaching_questions` (Tabelle, Constraints, Policies, Grants)
2. `join_rallye_questions` → `rallye_questions`; `JOIN_rallye_questions` → `rallye_questions`
3. `JOIN_question_answer` → `join_question_answer`
4. `rallye_team` → `teams`; `rallyeTeam` → `teams`
5. `team_questions` → `team_answers`; `teamQuestions` → `team_answers`
6. `increment_team_question_points` → `increment_team_answer_points`
7. `voting_finalization` → `voting_finalizations`
8. `"answers"` (Tabelle/Constraint/Policy/Grant/Sequence `answers_id_seq`) → `solution_options` / `solution_options_id_seq`
9. `"rallye"` (Tabelle `rallye`, `rallye_pkey`, `rallye_id_seq`, `rallye_department_id_fkey`, `rallye_department_id_idx`, Policies/Grants auf `rallye`) → `rallyes` / `rallyes_pkey` / `rallyes_id_seq` / `rallyes_department_id_fkey` / `rallyes_department_id_idx`. **Nicht** `rallye_id`, `rallye_status`, `rallye_questions`, `rallye_team`, `rallye_code` anfassen.
10. `"location"` → `locations`; `location_pkey`/`location_id_seq`/`location_default_rallye_id_fkey`/`location_id_fkey` entsprechend. **Nicht** `location_id` anfassen.
11. `"department"` → `departments`; `department_pkey`/`department_id_seq`/`department_location_id_fkey` entsprechend. **Nicht** `department_id` anfassen.
12. Spalten: `rallye`.`password`→`rallye_code`, `end_time`→`rallye_end`; `teams`.`time_played`→`play_time`; `questions`.`points`→`point_value`; `team_answers`.`points`→`team_points`, `team_answer`→`answer`; `geocaching_questions`.`geocaching_input_type`→`input_type`.
13. Funktions-Körper (`JOIN_question_answer`, `auto_finalize_voting`, `cast_voting_vote`, `finalize_voting_for_question`, `get_voted_voting_question_ids`, `increment_team_question_points`) exakt durch die in Step 1 gezeigten neuen Definitionen ersetzen.

- [ ] **Step 3: Verifizieren, dass keine Alt-Namen mehr in schema.sql stehen**

Run:
```bash
grep -nE '"(rallye|rallye_team|join_rallye_questions|questions_geocaching|answers|team_questions|location|department|voting_finalization)"|rallyeTeam|teamQuestions|JOIN_|geocaching_input_type|"end_time"|"time_played"|"password"' supabase/schema.sql
```
Expected: keine Treffer (außer bewusst beibehaltenen wie `rallye_id`, `rallye_status`, `rallye_code`, `rallye_questions`, `department_id`, `location_id`, die das Muster nicht matchen).

- [ ] **Step 4: Migration auf Dev anwenden (Nutzer)**

Der Nutzer führt `supabase/migration_20260710_rename_to_glossary.sql` im Supabase-SQL-Editor der **Dev**-DB aus. Erwartet: `COMMIT` ohne Fehler. Gemeinsame Kurzprüfung: `SELECT * FROM rallyes LIMIT 1;`, `SELECT * FROM team_answers LIMIT 1;` liefern die neuen Spalten.

- [ ] **Step 5: Commit**

```bash
git add supabase/migration_20260710_rename_to_glossary.sql supabase/schema.sql
git commit -m "Rename DB schema objects to match domain glossary"
```

---

## Task 2: Code — `rallye` → `rallyes` (Tabellen-String)

**Files (alle `.from('rallye')`):**
- `actions/rallye.ts`, `actions/rallye-results.ts` (Z. 59), `actions/upload-answers.ts` (Z. 69), `actions/assign_questions_to_rallye.ts`, `actions/department.ts`, `actions/location.ts`
- `app/(protected)/rallyes/page.tsx`, `app/(protected)/rallyes/[id]/(tabs)/page.tsx`, `app/(protected)/rallyes/[id]/(tabs)/layout.tsx`, `app/(protected)/rallyes/[id]/(tabs)/settings/page.tsx`, `app/(protected)/rallyes/[id]/(tabs)/uploads/page.tsx`, `app/(protected)/rallyes/[id]/(tabs)/results/page.tsx`, `app/(protected)/admin/departments/page.tsx`, `app/(protected)/admin/locations/page.tsx`
- Test-Mocks, die auf den Tabellen-String schalten: `actions/rallye.test.ts`, `actions/rallye-results.test.ts`, `actions/upload-answers.test.ts`, `app/(protected)/rallyes/page.test.tsx` (jede Stelle mit `'rallye'` als `.from`-Argument oder Mock-Table-Switch)

**Interfaces:**
- Consumes: neuer DB-Kontrakt aus Task 1.
- Produces: `.from('rallyes')` als kanonischer Tabellen-String.

- [ ] **Step 1: Ersetzen**

In allen oben genannten Dateien jedes `.from('rallye')` → `.from('rallyes')`. In den Test-Dateien zusätzlich jeden Mock-Vergleich `table === 'rallye'` bzw. `case 'rallye'` → `'rallyes'`. **Nur** den exakten String `'rallye'` treffen — `'rallye_team'`, `'rallye_questions'` (kommen später), `rallye_id`, `rallyeId` bleiben unberührt.

- [ ] **Step 2: Prüfen, dass keine Alt-Referenz bleibt**

Run:
```bash
grep -rn --include="*.ts" --include="*.tsx" "\.from('rallye')\|=== 'rallye'\|case 'rallye'" actions lib app components
```
Expected: keine Treffer.

- [ ] **Step 3: Suite grün**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alle grün.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Rename rallye table references to rallyes"
```

---

## Task 3: Code — `rallyes`-Spalten `password`→`rallye_code`, `end_time`→`rallye_end`

**Files:**
- `lib/types.ts` (Interface `Rallye`: Felder `password`, `end_time`)
- `lib/validation.ts` (Rallye-Schema/Objektfelder mit `password`, `end_time`)
- `actions/rallye.ts` (+ `actions/rallye.test.ts`)
- `app/(protected)/rallyes/page.tsx` (+ `app/(protected)/rallyes/page.test.tsx`)
- `app/(protected)/rallyes/[id]/(tabs)/settings/page.tsx`
- `components/rallyes/RallyeSettingsForm.tsx` (+ `components/rallyes/RallyeSettingsForm.test.tsx`)
- `components/rallyes/RallyeCreateWizard.tsx`
- `components/RallyeCard.tsx` (+ `components/RallyeCard.test.tsx`)

**Interfaces:**
- Produces: `Rallye.rallye_code: string`, `Rallye.rallye_end: string | null`.

- [ ] **Step 1: Typ anpassen**

In `lib/types.ts`, Interface `Rallye`: `password: string` → `rallye_code: string`; `end_time: string | null` → `rallye_end: string | null`.

- [ ] **Step 2: Alle Nutzungen umziehen**

In allen oben genannten Dateien (Quelle **und** Test): jede Objekt-Property, Select-/Insert-/Update-Spalte, Form-Feld und Assertion mit `password` (im Rallye-Kontext) → `rallye_code`; `end_time` → `rallye_end`. Achtung: `password` erscheint nur im Rallye-Kontext (Rallye-Code) — es gibt keine anderen `password`-Felder im Projekt (verifiziert). UI-Labels/Texte (deutsche Anzeigetexte wie „Passwort"/„Rallye-Code") sind reine Strings und bleiben inhaltlich unverändert; nur Bezeichner ändern.

- [ ] **Step 3: Prüfen**

Run:
```bash
grep -rn --include="*.ts" --include="*.tsx" "\bpassword\b\|\bend_time\b" actions lib app components
```
Expected: keine Treffer (alle DB-Bezeichner umbenannt).

- [ ] **Step 4: Suite grün**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alle grün.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Rename rallye password/end_time to rallye_code/rallye_end"
```

---

## Task 4: Code — `rallye_team`→`teams` + `time_played`→`play_time`

**Files:**
- `actions/rallye-results.ts` (Z. 79 `.from('rallye_team')`; `TeamRow.time_played` Z. 27; `team.time_played` Z. 39/41; Select-String Z. 80)
- `actions/upload-answers.ts` (Z. 111 `.from('rallye_team')`)
- `actions/rallye-results.test.ts` (Mock-Table-Switch `'rallye_team'`; `time_played`-Fixtures)

**Interfaces:**
- Consumes: `TeamRow` bleibt lokal; Feld `time_played` → `play_time`.

- [ ] **Step 1: Ersetzen**

- Jedes `.from('rallye_team')` → `.from('teams')` (Quelle + Test-Mock-Switch).
- `actions/rallye-results.ts`: Select `'id, name, created_at, time_played'` → `'id, name, created_at, play_time'`; `TeamRow` Feld `time_played: string | null` → `play_time: string | null`; in `formatDurationMs` `team.time_played` → `team.play_time` (2×).
- `actions/rallye-results.test.ts`: Fixtures/Assertions `time_played` → `play_time`.

- [ ] **Step 2: Prüfen**

Run:
```bash
grep -rn --include="*.ts" --include="*.tsx" "\.from('rallye_team')\|'rallye_team'\|time_played" actions lib app components
```
Expected: keine Treffer.

- [ ] **Step 3: Suite grün**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alle grün.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Rename rallye_team table to teams and time_played to play_time"
```

---

## Task 5: Code — `join_rallye_questions` → `rallye_questions`

**Files (alle `.from('join_rallye_questions')`):**
- `actions/rallye.ts`, `actions/rallye-results.ts` (Z. 200), `actions/question.ts` (Z. 100), `actions/assign_questions_to_rallye.ts`, `actions/upload-answers.ts` (Z. 85)
- `app/(protected)/rallyes/page.tsx`, `app/(protected)/rallyes/[id]/(tabs)/page.tsx`, `app/(protected)/rallyes/[id]/(tabs)/layout.tsx`
- Test-Mocks mit `'join_rallye_questions'`: `actions/rallye.test.ts`, `actions/rallye-results.test.ts`, `actions/upload-answers.test.ts` (falls vorhanden), `app/(protected)/rallyes/page.test.tsx`

**Interfaces:**
- Produces: `.from('rallye_questions')`.

- [ ] **Step 1: Ersetzen**

Jedes `.from('join_rallye_questions')` → `.from('rallye_questions')` und jeden Mock-Switch `'join_rallye_questions'` → `'rallye_questions'`. Spalten (`rallye_id`, `question_id`, `is_voting`) bleiben unverändert.

- [ ] **Step 2: Prüfen**

Run:
```bash
grep -rn --include="*.ts" --include="*.tsx" "join_rallye_questions" actions lib app components
```
Expected: keine Treffer.

- [ ] **Step 3: Suite grün**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alle grün.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Rename join_rallye_questions table to rallye_questions"
```

---

## Task 6: Code — `questions.points` → `point_value`

Die Tabelle `questions` heißt weiterhin `questions`; nur die Spalte `points` wird zu `point_value`. **Nicht** betroffen: die berechnete Team-Gesamtsumme `points` in `rallye-results.ts` (`RallyeResultRow.points`, `pointsByTeam`) und `team_answers.points` (Task 8).

**Files:**
- `helpers/questions.ts` (Interface `Question.points?` → `point_value?`; `QuestionFormData` erbt via `Omit<Question,'id'>`)
- `actions/question.ts`: Select-Strings Z. 54/81 (`... type, points, hint ...` → `... type, point_value, hint ...`); Param-Typen `points?: number` Z. 167/258 → `point_value?: number`; Insert Z. 191 `points: parsed.data.points` → `point_value: parsed.data.point_value`; Update Z. 303 analog
- `lib/validation.ts`: `pointsSchema` (Z. 17) → `pointValueSchema`; Feld `points: pointsSchema` (Z. 109) → `point_value: pointValueSchema`
- `lib/validation.test.ts` (Z. 9 `points: 1` → `point_value: 1`)
- `actions/question.test.ts` (Fixtures/Assertions `points` → `point_value`; Z. 67 `result.issues?.points` → `result.issues?.point_value`)
- `actions/rallye-results.ts`: `getRallyeMaxPoints` Select Z. 216 `'points'` → `'point_value'`; Z. 225 `q.points` → `q.point_value`. (Lokale Variablennamen `totalPoints`/`points` können bleiben, sind keine DB-Bezeichner — aber `q.point_value` muss stimmen.)
- `actions/rallye-results.test.ts`: Z. 330 Fixture `data: [{ points: 5 }, ...]` (für `getRallyeMaxPoints`, kommt aus `questions`) → `{ point_value: 5 }` etc. **Nur** die Fixtures für `getRallyeMaxPoints`; die `points`-Fixtures für Team-Ergebnisse (Z. 98/99/218–220) bleiben (Task 8).
- `app/(protected)/rallyes/new/page.tsx` Z. 28 Select-String; `app/(protected)/rallyes/[id]/(tabs)/page.tsx` Z. 40 Select-String
- `components/questions/id/QuestionForm.tsx`: Feld `points` in `formData`, `errors`, Handler, Label-`htmlFor`/`id` — der DB-gebundene Wert wird `point_value`; das interne Form-State-Feld ebenfalls `point_value` konsistent umbenennen (Z. 33/42/54/235/236/339/342/343/345/350/355/357). UI-Text „Punkte"/„P" bleibt.
- `components/questions/QuestionsTable.tsx` Z. 89 `question.points` → `question.point_value`
- `components/questions/QuestionsTable.test.tsx` (Fixtures `points`)
- `components/rallyes/RallyeCreateWizard.tsx` Z. 215 `question.points` → `question.point_value` (+ `RallyeCreateWizard.test.tsx` Fixture Z. 28)
- `components/rallyes/RallyeQuestionsManager.tsx` Z. 104/208/263 `question.points`/`entry.question.points` → `point_value` (+ `RallyeQuestionsManager.test.tsx` Fixtures Z. 27/37)

**Interfaces:**
- Produces: `Question.point_value?: number`; Validierungsfeld `point_value`.

- [ ] **Step 1: Typ + Validierung**

`helpers/questions.ts`: `points?: number` → `point_value?: number`. `lib/validation.ts`: `pointsSchema` → `pointValueSchema`, Objektfeld `points` → `point_value`.

- [ ] **Step 2: Actions, Pages, Components, Tests**

Alle oben gelisteten Vorkommen umziehen. Achtung Disambiguierung in `rallye-results.ts`/`.test.ts`: nur die `getRallyeMaxPoints`-Pfad-Vorkommen (aus `questions`) werden `point_value`; die Team-Aggregat-`points` bleiben.

- [ ] **Step 3: Prüfen**

Run:
```bash
grep -rn --include="*.ts" --include="*.tsx" "question\.points\|\.question\.points\|'.*, points,\|, points, hint\|issues?\.points\|pointsSchema" actions lib app components helpers
```
Expected: keine Treffer. (Verbleibende `points`-Treffer dürfen nur die Team-Aggregate in `rallye-results.ts`/`.test.ts` und `results/page.tsx` sein — diese sind absichtlich unverändert.)

- [ ] **Step 4: Suite grün**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alle grün.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Rename questions.points column to point_value"
```

---

## Task 7: Code — `answers` → `solution_options` (voll)

Vollständige Umbenennung der **Frage-Optionen** (nicht der Team-Upload-Antworten in `upload-answers.ts` — die bleiben hier unberührt). Da das Umbenennen des eingebetteten Select-Keys den Rückgabe-Key ändert, müssen Query, Typ und alle Konsumenten im selben Commit umziehen.

**Files:**
- `helpers/questions.ts`: `interface Answer` → `interface SolutionOption`; `Question.answers?: Answer[]` → `Question.solutionOptions?: SolutionOption[]`
- `actions/question.ts`: 
  - Select-Strings Z. 54/81 `... bucket_path, answers(id, correct, text)` → `... bucket_path, solution_options(id, correct, text)`
  - Direkte Queries `.from('answers')` (Z. 128, 226, 317, 337, 352, 363, 427) → `.from('solution_options')`
  - Filter-Query Z. 128–130 (`.from('answers').select('question_id').ilike('text', ...)`) → `solution_options`
  - Param-Typen `answers: {...}[]` Z. 171/262 → `solutionOptions: {...}[]`; alle `parsed.data.answers` → `parsed.data.solutionOptions`; lokale `answers`/`answersData`/`answersToDelete`/`existingAnswers`/`newAnswerIds` dürfen als lokale Namen bleiben, müssen aber konsistent auf die neue Param-Property zugreifen
  - `type AnswerInsert` → `type SolutionOptionInsert`
- `lib/validation.ts`: `answerSchema` → `solutionOptionSchema`; Feld `answers: z.array(...)` (Z. 113/122) → `solutionOptions`; Custom-Issue-`path: ['answers']` (Z. 82/93/100) → `['solutionOptions']`; `data.answers`/`normalizedAnswers` (Z. 70/74) → `data.solutionOptions`
- `lib/validation.test.ts` Z. 13 `answers: [...]` → `solutionOptions: [...]`
- `actions/question.test.ts`: Fixtures `answers: [...]` (Z. 38/59/85/101/250) → `solutionOptions`; Mock-Table-Switch `table === 'answers'` (Z. 159/196/258) → `'solution_options'`; `answersQuery`-Variablennamen dürfen bleiben; Assertion Z. 269/270 (select `'question_id'`, ilike `'text'`) bleiben inhaltlich
- `components/questions/id/QuestionForm.tsx`: Form-State-Feld `answers` → `solutionOptions` (inkl. `QuestionFormData`-Nutzung)
- `components/questions/QuestionDetailsRows.tsx` Z. 24 `question.answers ?? []` → `question.solutionOptions ?? []`
- `app/(protected)/rallyes/new/page.tsx` Z. 28 Select `answers(id, correct, text)` → `solution_options(id, correct, text)`
- `app/(protected)/rallyes/[id]/(tabs)/page.tsx` Z. 40 Select analog
- Weitere Fixtures mit `answers: []` in Frage-Kontext: `components/rallyes/RallyeQuestionsManager.test.tsx` Z. 29, `components/rallyes/RallyeCreateWizard.test.tsx` Z. 30 → `solutionOptions: []`

**Interfaces:**
- Consumes: `Question` aus `helpers/questions.ts`.
- Produces: `SolutionOption`, `Question.solutionOptions`, Validierungsfeld `solutionOptions`, Rückgabe-Key `solution_options`.

- [ ] **Step 1: Typ + Validierung**

`helpers/questions.ts` und `lib/validation.ts` gemäß Fileliste umbenennen.

- [ ] **Step 2: Actions/Queries + Pages**

`actions/question.ts`, `new/page.tsx`, `[id]/page.tsx` — Tabellen-Strings, eingebettete Select-Keys und Param-Properties umziehen.

- [ ] **Step 3: Components + Tests**

`QuestionForm.tsx`, `QuestionDetailsRows.tsx` und alle Test-Fixtures/Mock-Switches gemäß Fileliste.

- [ ] **Step 4: Prüfen**

Run:
```bash
grep -rn --include="*.ts" --include="*.tsx" "\.from('answers')\|answers(id, correct\|=== 'answers'\|\.answers\b\|answerSchema\|interface Answer\b" actions lib app components helpers
```
Expected: keine Treffer im Frage-Options-Kontext. (Treffer in `actions/upload-answers.ts`/`upload-answers.test.ts`/`uploads/page.tsx` sind Team-Upload-Antworten und gehören zu Task 8 — hier noch vorhanden, das ist ok.)

- [ ] **Step 5: Suite grün**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alle grün.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Rename answers to solution_options across queries, types and forms"
```

---

## Task 8: Code — `team_questions` → `team_answers` (+ `team_answer`→`answer`, `points`→`team_points`, upload `answers`→`uploadAnswers`)

**Files:**
- `actions/rallye-results.ts`:
  - `.from('team_questions')` Z. 95 + Z. 113 → `.from('team_answers')`
  - Z. 96 Select `'team_id, points'` → `'team_id, team_points'`; Z. 107 `row.points` → `row.team_points`
  - Z. 114 Select `'team_id, team_answer, created_at, questions!inner(type)'` → `'team_id, answer, created_at, questions!inner(type)'`
  - `UploadRow.team_answer` Z. 32 → `answer`; Z. 129 `upload.team_answer` → `upload.answer`
- `actions/rallye-results.test.ts`: Mock-Switch `'team_questions'` → `'team_answers'`; Team-Ergebnis-Fixtures `points` (Z. 98/99/218–220) → `team_points`; `team_answer`-Fixtures → `answer`
- `actions/upload-answers.ts`:
  - `.from('team_questions')` Z. 127 → `.from('team_answers')`
  - `TeamQuestionRow.team_answer` Z. 44 → `answer`; Select Z. 128 `'id, team_id, question_id, team_answer'` → `'id, team_id, question_id, answer'`; Z. 144 `row.team_answer` → `row.answer`
  - `UploadAnswerQuestion.answers` Z. 24 → `uploadAnswers`; Ergebnis-Bau Z. 208 `answers:` → `uploadAnswers:` (lokale `answersByQuestionId` darf bleiben)
- `actions/upload-answers.test.ts`: Mock-Switch `'team_questions'` → `'team_answers'`; `result.data?.[0].answers` (Z. 133) → `.uploadAnswers`; `team_answer`-Fixtures → `answer`
- `app/(protected)/rallyes/[id]/(tabs)/uploads/page.tsx`: `question.answers` (Z. 47/51/69/79) → `question.uploadAnswers`

**Interfaces:**
- Consumes: `UploadAnswerQuestion` (jetzt mit `uploadAnswers`).
- Produces: DB-Zugriffe auf `team_answers` mit Spalten `answer`, `team_points`.

- [ ] **Step 1: rallye-results.ts + Test**

Tabellen-String, `answer`- und `team_points`-Spalten umziehen; berechnete `RallyeResultRow.points`/`pointsByTeam` NICHT anfassen (nur `row.team_points` beim Lesen der DB-Zeile Z. 107).

- [ ] **Step 2: upload-answers.ts + Test + uploads/page.tsx**

Tabellen-String, `answer`-Spalte und die `answers`→`uploadAnswers`-Property umziehen.

- [ ] **Step 3: Prüfen**

Run:
```bash
grep -rn --include="*.ts" --include="*.tsx" "team_questions\|team_answer\b\|question\.answers\|\.answers\b" actions lib app components
```
Expected: keine Treffer (alle `answers`-Properties sind jetzt entweder `solutionOptions` (Task 7) oder `uploadAnswers`).

- [ ] **Step 4: Suite grün**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alle grün.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Rename team_questions to team_answers with answer/team_points columns"
```

---

## Task 9: Code — `location`→`locations` und `department`→`departments`

**Files (alle `.from('location')` / `.from('department')`):**
- `actions/location.ts` (+ `actions/location.test.ts`), `actions/department.ts`, `actions/local-users.ts`, `actions/rallye.ts`
- `app/(protected)/admin/locations/page.tsx`, `app/(protected)/admin/departments/page.tsx`, `app/(protected)/admin/users/page.tsx`, `app/(protected)/rallyes/page.tsx` (+ `page.test.tsx`), `app/(protected)/rallyes/new/page.tsx`, `app/(protected)/rallyes/[id]/(tabs)/settings/page.tsx`, `app/(protected)/rallyes/[id]/(tabs)/layout.tsx`
- `lib/types.ts` (Interfaces `Location`, `Department` — nur ggf. Doc/Namen; Feldnamen `default_rallye_id`, `location_id` bleiben)
- `components/LocationForm.tsx`

**Interfaces:**
- Produces: `.from('locations')`, `.from('departments')`. Spalten `default_rallye_id`, `location_id` unverändert.

- [ ] **Step 1: Ersetzen**

Jedes `.from('location')` → `.from('locations')`; jedes `.from('department')` → `.from('departments')`; Mock-Switches `=== 'location'`/`=== 'department'` entsprechend. **Nicht** `location_id`, `default_rallye_id`, `LocationForm`, Typnamen `Location`/`Department` (TS-Typen, kein DB-String) anfassen.

- [ ] **Step 2: Prüfen**

Run:
```bash
grep -rn --include="*.ts" --include="*.tsx" "\.from('location')\|\.from('department')\|=== 'location'\|=== 'department'" actions lib app components
```
Expected: keine Treffer.

- [ ] **Step 3: Suite grün**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alle grün.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Rename location/department tables to locations/departments"
```

---

## Task 10: Endverifikation + Prod-Migration

**Files:** keine (Verifikation + Deployment).

- [ ] **Step 1: Globaler Alt-Namen-Scan (Code)**

Run:
```bash
grep -rnE "\.from\('(rallye|rallye_team|join_rallye_questions|questions_geocaching|answers|team_questions|location|department|voting_finalization)'\)|team_answer\b|time_played|\bend_time\b|questions_geocaching|increment_team_question_points|JOIN_question_answer" actions lib app components helpers
```
Expected: keine Treffer.

- [ ] **Step 2: Volle Suite**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test && npm run build`
Expected: alle grün; Build erfolgreich.

- [ ] **Step 3: E2E gegen Dev**

App gegen Dev-DB starten (`npm run dev`) und Kernflüsse durchklicken: Rallye-Liste, Rallye-Detail (Fragen-Tab), Fragen erstellen/bearbeiten (Lösungsoptionen speichern), Ergebnisse, Uploads-Tab, Admin → Standorte/Bereiche. Erwartet: keine Konsolen-/Netzwerkfehler, Daten laden korrekt.

- [ ] **Step 4: Prod-Migration (Nutzer)**

Nutzer wendet `supabase/migration_20260710_rename_to_glossary.sql` im Supabase-SQL-Editor der **Prod**-DB an. Parallel deployt der Nutzer die angepasste mobile Rallye-App. Erwartet: `COMMIT` ohne Fehler.

- [ ] **Step 5: Abschluss-Commit (falls noch offen)**

```bash
git add -A
git commit -m "Verify glossary rename end-to-end" --allow-empty
```

---

## Self-Review-Notiz

- **Spec-Abdeckung:** Alle Tabellen-/Spalten-/Objekt-Renames der Spec sind Tasks zugeordnet (Task 1 DB; Tasks 2–9 Code; `voting_finalizations`/`geocaching_questions`/`input_type` haben keine Code-Refs → nur Task 1).
- **Disambiguierung `points`:** In Task 6 (questions→point_value) und Task 8 (team→team_points) getrennt; berechnete Aggregate bleiben `points`.
- **Zwei `answers`-Konzepte:** Frage-Optionen (Task 7 → `solutionOptions`) vs. Team-Upload-Antworten (Task 8 → `uploadAnswers`) sauber getrennt.
- **Test-Kopplung:** Jede Tabellen-Task ändert Quelle + zugehörige Mock-Switches im selben Commit (Tests schalten auf den `.from`-String).
