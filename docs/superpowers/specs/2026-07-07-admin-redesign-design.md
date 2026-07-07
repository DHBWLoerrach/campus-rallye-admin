# Design: Redesign der Admin-App — Rallye-zentrierte Arbeitsfläche

Datum: 2026-07-07
Status: Entwurf, vom Product Owner freigegeben

## Problem und Ziel

Die Admin-App ist historisch als Standard-CRUD-Oberfläche gewachsen. Sichtbare Symptome:

- Zwei parallele „Rallye erstellen"-Dialoge (`components/RallyeDialog.tsx`, `components/rallyes/ProgramRallyeDialog.tsx`).
- Rallye-Bearbeitung inline in der Karte (`components/RallyeForm.tsx`), Fragen-Bearbeitung dagegen als eigene Seite — inkonsistente Paradigmen.
- Status-Wechsel über frei wählbare Radio-Buttons ohne geführten Ablauf.
- Ergebnisse und Foto-Uploads nur als Icon-Links auf der Karte erreichbar; `/locations` ist gar nicht verlinkt.
- Die Fragen-Zuordnung ist eine eigene Zwei-Spalten-Seite (`Assignment.tsx`, 799 Zeilen), losgelöst von der Rallye.

Zielgruppe des Redesigns sind **Gelegenheitsnutzer** (z. B. Marketing), die 2–3× im Jahr eine Rallye für Anlässe wie Studieninfotag oder Girl's Day erstellen und **am Event-Tag selbst durchführen** — primär am Laptop/Desktop. Die App muss ohne Einarbeitung und ohne technisches Vokabular bedienbar sein.

## Entscheidungen (aus dem Brainstorming)

- **Konzept**: Die Rallye wird zum zentralen Objekt mit eigener Detailseite; geführte Erstellung; verständliches Phasenmodell. Der Fragenkatalog bleibt als Bibliothek erhalten.
- **Scope**: Auch Datenmodell-Änderungen sind erlaubt.
- **Wiederverwendung**: „Rallye duplizieren" statt eines eigenen Vorlagen-Konzepts (konsistent mit ADR-0002).
- **Sichtbarkeit**: „Eigener Bereich im Fokus" — Nutzer werden einem Bereich zugeordnet; andere Bereiche bleiben erreichbar.
- **Umsetzung**: Gesamtkonzept steht, Implementierung Bereich für Bereich in atomaren Schritten (AGENTS.md-Workflow).

## Design

### 1. Informationsarchitektur & Navigation

Top-Navigation (`components/Navigation.tsx`):

1. **Rallyes** (`/rallyes`) — Startseite, Hauptarbeitsbereich.
2. **Fragenkatalog** (`/questions`) — Bibliothek.
3. **Verwaltung** (nur Admin) — bündelt Bereiche (`/departments`), Standorte (`/locations`) und die Nutzer→Bereich-Zuordnung.

### 2. Startseite „Rallyes"

`app/(protected)/rallyes/page.tsx` neu strukturiert:

- **Gruppierung nach Phase**, nicht nach Bereich: „● Läuft gerade" (Status running/voting/ranking) → „○ In Vorbereitung" (preparing/inactive) → „✓ Abgeschlossen" (ended).
- **Eigener Bereich zuerst**: Rallyes des dem Nutzer zugeordneten Bereichs prominent; „Andere Bereiche" und „Campus-Touren (Erkundungsmodus)" als eingeklappte Sektionen. Nutzer ohne Bereichszuordnung sehen alle gleichrangig.
- Jede Karte: Name, Phase, Fragenzahl, Endzeit; Klick → Rallye-Detailseite. Kein Inline-Edit, keine Icon-Link-Sammlung.
- Abgeschlossene Rallyes bieten „Duplizieren" direkt auf der Karte.
- `[+ Neue Rallye]` startet den geführten Erstell-Flow.

### 3. Rallye-Detailseite (neu: `app/(protected)/rallyes/[id]/page.tsx`)

Zentrale Arbeitsfläche, ersetzt Inline-Edit und verstreute Links:

```
┌─ Studieninfotag 2026 · Bereich: HoKo/Marketing ─────────┐
│  Phase: Entwurf → Bereit → Läuft → Abstimmung → Fertig  │
│  [ ▶ Rallye starten ]        (primärer Phasen-Button)   │
├─────────────────────────────────────────────────────────┤
│  Tabs:  Fragen (12) · Einstellungen · Ergebnisse · Fotos│
└─────────────────────────────────────────────────────────┘
```

- **Tab „Fragen"**: Liste der zugeordneten Fragen mit Punktesumme, Entfernen-Button und Abstimmungs-Toggle (nur Upload-Fragen, wie in `actions/assign_questions_to_rallye.ts` erzwungen). „+ Fragen hinzufügen" öffnet ein Katalog-Panel (Suche/Typ/Kategorie-Filter, wiederverwendet aus `components/questions/SearchFilters.tsx`). Ersetzt `Assignment.tsx`.
- **Tab „Einstellungen"**: Name, Endzeit (`components/ui/datetime-picker.tsx`), Passwort, Bereich; Gefahrenzone mit Löschen und Experten-Override für den Status (ersetzt die Radio-Buttons aus `RallyeForm.tsx`).
- **Tab „Ergebnisse"**: Inhalt der bisherigen Seite `rallyes/[id]/results`.
- **Tab „Fotos"**: Inhalt der bisherigen Seite `rallyes/[id]/uploads`.

### 4. Phasenmodell & Live-Steuerung

Das DB-Enum `rallye_status` bleibt unverändert; nur die Präsentation ändert sich:

| DB-Status | Nutzer-Phase | Primärer Button danach |
|---|---|---|
| preparing | Entwurf | „Vorbereitung abschließen" → inactive |
| inactive | Bereit | „▶ Rallye starten" → running |
| running | Läuft | „Abstimmung starten" (nur falls Abstimmungs-Fragen; sonst „Ranking zeigen") |
| voting | Abstimmung | „Ranking zeigen" → ranking |
| ranking | Ranking | „Rallye beenden" → ended |
| ended | Abgeschlossen | „Duplizieren" |

- Jeder Übergang mit kurzem Bestätigungsdialog inkl. Klartext-Erklärung („Teams können ab jetzt beitreten …").
- Labels und Phasenlogik zentral in `lib/types.ts` (`getRallyeStatusLabel`, `RALLYE_STATUSES`): Reihenfolge, nächste Aktion, Erklärtexte.
- Vote-Finalisierung beim Übergang voting→ranking/ended läuft weiter über den bestehenden DB-Trigger.
- Campus-Touren (ADR-0003) behalten ihren einfachen Aktiv/Inaktiv-Schalter (`components/rallyes/ExplorationRow.tsx`).

### 5. Geführte Erstellung + Duplizieren

- Neuer Erstell-Flow (drei Schritte, Dialog oder Seite `/rallyes/new`):
  1. Name + Bereich (Bereich vorbelegt aus Nutzer-Zuordnung).
  2. Fragen wählen (gleiche Katalog-Auswahl wie Tab „Fragen"; überspringbar).
  3. Endzeit + Passwort → „Erstellen" → weiter zur Detailseite.
- **Duplizieren**: neue Server-Action `duplicateRallye` in `actions/rallye.ts` — kopiert die Rallye (Status `preparing`, Name „… (Kopie)", Endzeit neu zu setzen) samt `join_rallye_questions`-Zuordnungen inkl. `is_voting`.
- Ersetzt beide Alt-Dialoge; `RallyeDialog.tsx` und `ProgramRallyeDialog.tsx` entfallen.

### 6. Fragenkatalog & Frage-Editor

- Katalog (`components/questions/QuestionsManagement.tsx`) bleibt strukturell, wird aufgeräumt: Typ-Badge immer sichtbar, Punkte als Spalte, „verwendet in N Rallyes" als Info.
- Frage-Editor (`components/questions/id/QuestionForm.tsx`): Formular nach Typ-Auswahl dynamisch aufbauen (erst Typ wählen, dann nur relevante Felder zeigen). Die Checkbox-Liste „Rallyes zuordnen" entfällt — Zuordnung passiert im Rallye-Kontext; stattdessen read-only Verwendungshinweis.
- Sprache konsequent vereinheitlichen (heute Mix aus Sie- und Du-Form).

### 7. Datenmodell-Änderungen (lokale SQLite, kein Supabase)

Nutzer-Daten liegen lokal in SQLite (`lib/db/local-user.ts`, Tabelle `local_users`), nicht in Supabase. Die Nutzer→Bereich-Zuordnung ist daher eine lokale Änderung:

- Neue Spalte `department_id INTEGER` (nullable) auf `local_users`; referenziert die Bereichs-ID aus Supabase (keine echte FK über Systemgrenzen möglich).
- `LocalUser`-Typ und Queries in `lib/db/local-user.ts` erweitern; Pflege über „Verwaltung".
- Anwendung per SQL in der SQLite-Shell (`ALTER TABLE local_users ADD COLUMN department_id INTEGER;`); README-Abschnitt zur Tabellen-Erstellung entsprechend aktualisieren.
- **Keine Supabase-Migration, kein Update von `supabase/schema_v*.sql` nötig**: Duplizieren, Phasen und Tabs sind reine App-Logik.

**Konsistenz SQLite↔Supabase über Anwendungslogik** (FK-Semantik in der Webapp nachbilden, da alle Änderungen durch sie laufen):

1. **Schreib-Validierung**: Die Server-Action zum Zuordnen validiert die `department_id` vor dem SQLite-Write gegen Supabase (`getDepartments` aus `actions/department.ts`); die Verwaltung-UI bietet ohnehin nur existierende Bereiche an.
2. **App-seitige Kaskade beim Löschen** (`ON DELETE SET NULL`-Semantik): `deleteDepartment` in `actions/department.ts` setzt zusätzlich `UPDATE local_users SET department_id = NULL WHERE department_id = ?`; die Verwaltung-UI zeigt vor dem Löschen an, wie viele Nutzer betroffen sind (analog zur bestehenden Rallye-Prüfung `getRallyeAssignmentsByDepartment`).
3. **Defensive Auflösung beim Lesen**: Sollte trotzdem eine verwaiste `department_id` auftreten (z. B. direkte DB-Manipulation), behandelt die App sie wie „kein Bereich zugeordnet"; die Verwaltung zeigt dies als Hinweis.

### 8. Visuelle Richtung

- DHBW-Rot (`--dhbw-500 #e2001a`) bleibt Markenanker, wird aber sparsamer eingesetzt: primäre Aktion + aktive Navigation. Status-Badges bekommen semantische, ruhige Farben (Läuft = grün, Entwurf = grau, …).
- Weniger Großbuchstaben-Badges, ruhigere Karten, klare Hierarchie.
- Dark Mode bleibt (bestehende Token in `app/globals.css`).

## Umsetzungsreihenfolge (je Block mehrere atomare Commits)

1. **Fundament**: Phasenmodell-Helper in `lib/types.ts` + Tests; SQLite-Spalte `local_users.department_id` (README-Update) + `LocalUser`-Erweiterung + Pflege-UI unter Verwaltung.
2. **Rallye-Detailseite**: neue Route mit Header/Phasen-Button + Tabs; Ergebnisse/Fotos als Tabs einziehen (alte Routen redirecten); Einstellungen-Tab ersetzt Inline-Edit.
3. **Fragen-Tab**: neue Zuordnungs-UI, ersetzt `Assignment.tsx`; bestehende Server-Actions wiederverwenden.
4. **Startseite**: Phasen-Gruppierung, Bereichs-Fokus, Karten verschlanken.
5. **Erstellen + Duplizieren**: geführter Flow, `duplicateRallye`-Action + Tests; Alt-Dialoge löschen.
6. **Fragenkatalog/Editor**: dynamisches Formular, Aufräumen, Sprach-Konsistenz.
7. **Verwaltung**: Bereiche + Standorte + Nutzer-Zuordnung bündeln; Navigation final.

## Verifikation

- Nach jedem Schritt: `npm run lint`, `npm run check:format`, `npx tsc --noEmit`, `npm test`.
- Neue Unit-Tests: Phasenmodell-Übergänge, `duplicateRallye`, Bereichs-Sortierung der Startseite.
- End-to-End: Dev-Server mit `DEV_AUTH_BYPASS=true`, Kernflow durchklicken: Neue Rallye anlegen → Fragen zuordnen → Phasen durchschalten bis Beendet → Duplizieren.
