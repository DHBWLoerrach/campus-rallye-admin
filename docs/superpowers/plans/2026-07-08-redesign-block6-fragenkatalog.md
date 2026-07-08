# Redesign Block 6: Fragenkatalog + Frage-Editor — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Fragenkatalog bekommt eine aufgeräumte Tabelle (Punkte und Rallye-Verwendung als eigene Spalten), der Frage-Editor zeigt erst nach der Typ-Auswahl die passenden Felder und verliert die „Rallyes zuordnen"-Checkboxen (Zuordnung passiert nur noch im Rallye-Kontext); die UI-Sprache wird konsistent neutral.

**Architecture:** Reine Umbauten bestehender Komponenten. Kritische Invariante: `updateQuestion` in `actions/question.ts:376` ruft `assignRallyesToQuestion` (Voll-Sync!) nur auf, wenn `rallyeIds !== undefined` übergeben wird — die Form darf das Feld also schlicht **weglassen**, dann bleiben Zuordnungen unangetastet; die Actions selbst bleiben unverändert. Der bestehende „Zugeordnet zu"-Banner in `QuestionPage.tsx` wird zum ständigen Read-only-Verwendungshinweis ausgebaut.

**Tech Stack:** React 19, Vitest + RTL (`fireEvent`), shadcn/ui.

## Global Constraints

- Nach jedem Task: `npm run lint`, `npm run check:format`, `npx tsc --noEmit`, `npm test` — alle grün, sonst kein Commit (AGENTS.md Hard Rule).
- Commits gemäß Block-Freigabe.
- Code-Kommentare Englisch; UI-Texte Deutsch in **neutraler Form** (keine Sie-/Du-Anrede: „Frage eingeben" statt „Geben Sie die Frage ein").
- Keine Änderungen an `actions/question.ts` — das `rallyeIds`-Sync-Verhalten bleibt für spätere Nutzung erhalten.

---

### Task 1: Katalog-Tabelle aufräumen (Punkte- und Rallye-Spalte)

**Files:**
- Modify: `components/questions/QuestionsTable.tsx` (Spalten: Frage | Typ | Punkte | Verwendet in | Aktionen)
- Modify: `components/questions/QuestionSummary.tsx` (Punkte-Mini-Badge und Rallye-Badge entfernen; Bild-/Hinweis-Icons bleiben)
- Modify: `components/questions/QuestionsTable.test.tsx` (vorher lesen; Assertions ergänzen/anpassen)

**Interfaces:**
- Produces: `QuestionsTable({ questions, rallyeMap })` unverändert von außen; neue Zellen: Typ-Label (`'—'` bei fehlendem Typ), Punkte rechtsbündig (`'—'` bei `undefined`/`0`? — Punkte `0` als `0` anzeigen, nur `undefined`/`null` als `'—'`), „Verwendet in" als `N Rallye(s)`-Text mit `title`-Attribut = Namen, `'—'` bei keiner.

- [ ] **Step 1: Failing Tests** — `components/questions/QuestionsTable.test.tsx` lesen und diesen Test ergänzen (bestehende Tests an neue Spaltenzahl anpassen, z. B. `colSpan`):

```tsx
it('shows points and rallye usage as own columns', () => {
  render(
    <QuestionsTable
      questions={[
        {
          id: 1,
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          points: 5,
          answers: [],
        },
        { id: 2, content: 'Ohne alles', type: '', answers: [] },
      ]}
      rallyeMap={{ 1: ['Studieninfotag', "Girl's Day"] }}
    />
  );

  const rows = screen.getAllByRole('row');
  expect(within(rows[1]).getByText('5')).toBeInTheDocument();
  expect(within(rows[1]).getByText('2 Rallyes')).toHaveAttribute(
    'title',
    "Studieninfotag, Girl's Day"
  );
  expect(within(rows[2]).getAllByText('—').length).toBeGreaterThanOrEqual(2);
  expect(
    screen.getByRole('columnheader', { name: 'Punkte' })
  ).toBeInTheDocument();
  expect(
    screen.getByRole('columnheader', { name: 'Verwendet in' })
  ).toBeInTheDocument();
});
```

(Import `within` aus `@testing-library/react` ergänzen.)

- [ ] **Step 2: Rot verifizieren** — `npx vitest run components/questions/QuestionsTable.test.tsx`.

- [ ] **Step 3: `QuestionsTable.tsx` umbauen** — Header:

```tsx
<TableRow>
  <TableHead className="w-8"></TableHead>
  <TableHead>Frage</TableHead>
  <TableHead>Typ</TableHead>
  <TableHead className="w-20 text-right">Punkte</TableHead>
  <TableHead className="w-32">Verwendet in</TableHead>
  <TableHead className="w-12 text-center">Aktionen</TableHead>
</TableRow>
```

Zellen (zwischen Typ und Aktionen einfügen; `colSpan` der Leer-/Detailzeilen auf `6` erhöhen):

```tsx
<TableCell>{questionTypeLabels[question.type] ?? '—'}</TableCell>
<TableCell className="text-right">{question.points ?? '—'}</TableCell>
<TableCell>
  {rallyeNames.length === 0 ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <span
      className="text-muted-foreground"
      title={rallyeNames.join(', ')}
    >
      {rallyeNames.length} {rallyeNames.length === 1 ? 'Rallye' : 'Rallyes'}
    </span>
  )}
</TableCell>
```

- [ ] **Step 4: `QuestionSummary.tsx` verschlanken** — die `hasPoints`- und `hasRallyes`-Badges samt zugehöriger Variablen entfernen (`showMeta` nur noch aus `hasImage || hasHint`); Prop `rallyeNames` entfernen, falls danach ungenutzt (Aufrufstelle in `QuestionsTable` mit anpassen; `QuestionDetailsRows` prüfen — falls sie `rallyeNames` nutzt, dort belassen).

- [ ] **Step 5: Alle Checks** → grün. **Step 6: Commit**

```bash
git add components/questions
git commit -m "Show points and rallye usage as catalog table columns"
```

---

### Task 2: Frage-Editor — dynamische Felder, Rallye-Checkboxen raus

**Files:**
- Modify: `components/questions/id/QuestionForm.tsx`
- Modify: `components/questions/id/QuestionForm.test.tsx` (vorher lesen)
- Modify: `components/questions/id/QuestionPage.tsx` (Banner ausbauen, Props verschlanken, `rallyeId`-Param-Logik entfernen)
- Modify: `components/questions/id/QuestionPage.test.tsx` (Banner-/Link-Assertions anpassen)

**Interfaces:**
- Produces: `QuestionForm`-Props ohne `rallyes`/`initialRallyeIds`; `QuestionFormData` wird ohne `rallyeIds` submitted (Feld bleibt im Typ optional — nicht setzen!). `QuestionPage`-Props unverändert (braucht `rallyes` + `initialRallyeIds` weiter für den Banner).

- [ ] **Step 1: Failing Tests** — in `QuestionForm.test.tsx` (bestehende Tests zuerst lesen; `rallyes`/`initialRallyeIds`-Props aus allen Aufrufen entfernen) ergänzen:

```tsx
it('shows only question and type until a type is chosen', () => {
  render(
    <QuestionForm
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
      categories={[]}
    />
  );
  expect(screen.getByLabelText('Frage*')).toBeInTheDocument();
  expect(screen.queryByLabelText('Punkte')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Hinweis')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Kategorie')).not.toBeInTheDocument();
  expect(
    screen.getByText(
      'Zuerst einen Fragetyp wählen — danach erscheinen die passenden Felder.'
    )
  ).toBeInTheDocument();
});

it('shows the relevant fields once a type is set', () => {
  render(
    <QuestionForm
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
      categories={[]}
      initialData={{ id: 1, content: 'X', type: 'knowledge', answers: [] }}
    />
  );
  expect(screen.getByLabelText('Punkte')).toBeInTheDocument();
  expect(screen.getByLabelText('Hinweis')).toBeInTheDocument();
  expect(screen.queryByText('Rallyes zuordnen')).not.toBeInTheDocument();
});

it('submits without a rallyeIds field', async () => {
  const onSubmit = vi.fn();
  render(
    <QuestionForm
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      categories={[]}
      initialData={{
        id: 1,
        content: 'X',
        type: 'knowledge',
        answers: [{ id: 1, correct: true, text: 'A' }],
      }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  expect(onSubmit.mock.calls[0][0].rallyeIds).toBeUndefined();
});
```

- [ ] **Step 2: Rot verifizieren.**

- [ ] **Step 3: `QuestionForm.tsx` umbauen**:
  1. Props `rallyes` und `initialRallyeIds` entfernen (Interface + Destructuring); `handleRallyeToggle` und den kompletten „Rallyes zuordnen"-Block (Zeilen 534–558 im Original) löschen; `Checkbox`- und `RallyeOption`-Imports entfernen, falls ungenutzt.
  2. In `buildInitialFormData` und `normalizeFormData` das Feld `rallyeIds` entfernen (in `normalizeFormData` ersatzlos streichen — der Dirty-Vergleich funktioniert weiter).
  3. Dynamik: Den Punkte-Block (`<div className="space-y-2"><Label htmlFor="points">…`) mit `{hasType && (…)}` wrappen; den kompletten Hinweis/Kategorie/Bild-Block (`<div className="grid gap-4 …">` ab „Hinweis") mit `{hasType && (…)}` wrappen. Direkt nach dem ersten Block (Frage+Typ) einfügen:

```tsx
{!hasType && (
  <p className="text-sm text-muted-foreground">
    Zuerst einen Fragetyp wählen — danach erscheinen die passenden Felder.
  </p>
)}
```

- [ ] **Step 4: `QuestionPage.tsx` anpassen**:
  1. `rallyeId`-Query-Param-Logik entfernen (`rallyeIdParam`/`rallyeIdValue`/`effectiveRallyeIds` — der einzige Erzeuger solcher Links war das in Block 3 gelöschte `Assignment.tsx`); stattdessen direkt `initialRallyeIds` verwenden.
  2. Banner immer zeigen, wenn `!isNew` (statt nur bei `hasAssignments`); Text bei 0 Zuordnungen: `In keiner Rallye verwendet. Die Zuordnung erfolgt auf der Rallye-Detailseite im Tab „Fragen".`; Banner-Links von `/rallyes/${rallye.id}/questions` auf `/rallyes/${rallye.id}` umstellen.
  3. `rallyes`- und `initialRallyeIds`-Props nicht mehr an `QuestionForm` durchreichen.
  4. `unsavedChangesMessage` neutral: `'Ungespeicherte Änderungen gehen verloren. Seite wirklich verlassen?'`.
  In `QuestionPage.test.tsx` die Assertions auf Banner-Links (`/rallyes/1/questions` → `/rallyes/1`) und ggf. `rallyeId`-Param-Tests anpassen/entfernen (Datei vorher lesen).

- [ ] **Step 5: Alle Checks** → grün. **Step 6: Commit**

```bash
git add components/questions/id
git commit -m "Make question form type-driven and drop rallye checkboxes"
```

---

### Task 3: Sprach-Konsistenz (neutrale Form)

**Files:**
- Modify: `components/questions/id/QuestionForm.tsx` (Placeholders + Validierungstexte)
- Modify: `app/(protected)/rallyes/page.tsx` (Empty-State-Text)
- Modify: `components/rallyes/RallyeCreateWizard.tsx` (Schritt-2-Hinweis)
- Ggf. betroffene Tests (Strings nachziehen)

**Ersetzungen (exakt):**

| Datei | Alt | Neu |
|---|---|---|
| QuestionForm | `Geben Sie die Frage ein` | `Frage eingeben` |
| QuestionForm | `Wählen Sie einen Fragetyp` | `Fragetyp wählen` |
| QuestionForm | `Geben Sie einen Hinweis ein` | `Hinweis eingeben (optional)` |
| QuestionForm | `Wählen Sie eine Kategorie` | `Kategorie wählen` |
| QuestionForm | `Bitte geben Sie eine Frage ein` | `Bitte eine Frage eingeben` |
| QuestionForm | `Bitte wählen Sie einen Fragetyp` | `Bitte einen Fragetyp wählen` |
| QuestionForm | `Bitte wählen Sie eine Kategorie oder geben Sie eine neue ein` | `Bitte eine Kategorie wählen oder eine neue eingeben` |
| QuestionForm | `Sind Sie sicher, dass Sie diese Frage löschen möchten?` | `Diese Frage wirklich löschen?` |
| QuestionForm | `Füge eine Antwort hinzu` | `Antwort eingeben` |
| rallyes/page | `Noch keine Rallyes. Erstelle die erste über „Rallye erstellen“.` | `Noch keine Rallyes. Die erste über „+ Neue Rallye“ anlegen.` |
| RallyeCreateWizard | `Wähle Fragen aus dem Katalog — oder überspringe diesen Schritt und ordne später zu.` | `Fragen aus dem Katalog wählen — dieser Schritt kann übersprungen werden.` |

- [ ] **Step 1: Ersetzungen durchführen**, danach `grep -rn "Sie " components/questions app/(protected)/rallyes components/rallyes --include="*.tsx" | grep -v test` — verbleibende Treffer bewerten (Lösch-Dialoge in `RallyeSettingsForm`/`DepartmentForm` gehören zu Block 7 bzw. bleiben vorerst).
- [ ] **Step 2: Alle Checks** → grün (Tests, die alte Strings asserten, mit anpassen). **Step 3: Commit**

```bash
git add components app
git commit -m "Use neutral German phrasing in question and rallye UI texts"
```

---

### Task 4: End-to-End-Verifikation + Build

- [ ] Dev-Server, per agent-browser:
  1. `/questions`: Tabelle zeigt Punkte- und „Verwendet in"-Spalten; Zeile aufklappen funktioniert.
  2. `/questions/new`: nur Frage + Fragetyp sichtbar + Hinweistext; nach Typwahl „Wissensfrage" erscheinen Punkte, Antwort, Hinweis, Kategorie; keine „Rallyes zuordnen"-Box.
  3. Bestehende Frage öffnen (z. B. aus Rallye 8): Banner „Verwendet in …" mit Link auf die Detailseite; speichern ohne Änderungen → Zuordnungen der Rallye 8 unverändert (unter `/rallyes/8` prüfen!).
  4. Testfrage anlegen (Typ Wissensfrage, 1 Antwort), im Katalog finden, wieder löschen.
- [ ] `npm run build` → erfolgreich.

---

## Nach Block 6

Block 7 (Verwaltung bündeln: Bereiche + Standorte + Nutzer, Navigation final) ist der letzte Block der Spec.
