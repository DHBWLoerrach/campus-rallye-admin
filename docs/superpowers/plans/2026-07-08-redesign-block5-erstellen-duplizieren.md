# Redesign Block 5: Geführter Erstell-Flow + Duplizieren — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Rallyes entstehen über einen geführten 3-Schritte-Flow (`/rallyes/new`: Name+Bereich → Fragen wählen → Termin+Passwort), abgeschlossene Rallyes lassen sich duplizieren; die beiden Alt-Dialoge (`RallyeDialog`, `ProgramRallyeDialog`) und die alte `createRallye`-Action entfallen.

**Architecture:** Eine neue Server-Action `createRallyeWithQuestions` legt Rallye (Status `draft` = Entwurf) und Fragen-Zuordnungen in einem Aufruf an; der Client-Wizard `RallyeCreateWizard` sammelt die Eingaben lokal (Fragen-Auswahl mit den bestehenden `SearchFilters`) und leitet nach Erfolg auf die Detailseite. `duplicateRallye` kopiert Rallye + `join_rallye_questions` inkl. `is_voting` (Status `draft`, Name „… (Kopie)", Endzeit = jetzt, Passwort leer). **Abweichung von der Spec:** Der „Duplizieren"-Button sitzt im Detail-Header (als Primäraktion der Phase „Abgeschlossen", konsistent mit der Phasen-Tabelle in Spec Abschnitt 4) statt auf der Startseiten-Karte — die Karte ist seit Block 4 ein reiner Link, und interaktive Buttons in Links sind invalides HTML.

**Tech Stack:** Next.js 16 App Router, Supabase-JS, Vitest + RTL (`fireEvent`), shadcn/ui (`DateTimePicker`, `Checkbox`, `Select`), `SearchFilters` (compact).

## Global Constraints

- Nach jedem Task: `npm run lint`, `npm run check:format`, `npx tsc --noEmit`, `npm test` — alle grün, sonst kein Commit (AGENTS.md Hard Rule).
- Commits gemäß Block-Freigabe des Nutzers.
- Code-Kommentare Englisch, UI-Texte Deutsch, Prettier, Aliasse `@/…`.
- Neue Rallyes und Kopien starten im Status `draft` (Entwurf) — der Phasen-Button führt dann durch „Entwurf abschließen".
- `/rallyes/new` ist eine statische Route neben `[id]` — Next.js priorisiert statische Segmente, die `[id]`-Seiten guarden ohnehin mit `/^\d+$/`.

---

### Task 1: Server-Action `duplicateRallye`

**Files:**
- Modify: `actions/rallye.ts` (ans Dateiende)
- Modify: `actions/rallye.test.ts` (neuer describe-Block; Mocks `mockRequireProfile`/`mockCreateClient`/`mockRevalidatePath` existieren)

**Interfaces:**
- Produces: `duplicateRallye(rallyeId: number): Promise<ActionResult<{ rallyeId: number; message: string }>>` — Kopie mit `status: 'draft'`, Name `${name} (Kopie)`, `end_time: new Date()`, `password: ''`, gleicher `department_id`; kopiert alle `join_rallye_questions`-Zeilen inkl. `is_voting`.

- [ ] **Step 1: Failing Tests** in `actions/rallye.test.ts`:

```ts
describe('duplicateRallye', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const makeSupabase = (opts: {
    source?: {
      id: number;
      name: string;
      department_id: number | null;
    } | null;
    joins?: Array<{ question_id: number; is_voting: boolean }>;
    insertError?: unknown;
  }) => {
    const insertedRallye = { id: 99 };
    const insertSelectSingle = vi
      .fn()
      .mockResolvedValue({ data: insertedRallye, error: opts.insertError ?? null });
    const insertSelect = vi.fn(() => ({ single: insertSelectSingle }));
    const rallyeInsert = vi.fn(() => ({ select: insertSelect }));
    const joinInsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'rallye') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data:
                  opts.source === null
                    ? null
                    : (opts.source ?? {
                        id: 5,
                        name: 'Studieninfotag',
                        department_id: 7,
                      }),
                error: null,
              }),
            })),
          })),
          insert: rallyeInsert,
        };
      }
      // join_rallye_questions
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: opts.joins ?? [], error: null }),
        })),
        insert: joinInsert,
      };
    });
    return { from, rallyeInsert, joinInsert };
  };

  it('creates a draft copy with suffixed name', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({});
    mockCreateClient.mockResolvedValue(supabase);

    const { duplicateRallye } = await import('./rallye');
    const result = await duplicateRallye(5);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data?.rallyeId).toBe(99);
    expect(supabase.rallyeInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Studieninfotag (Kopie)',
        status: 'draft',
        password: '',
        department_id: 7,
      })
    );
  });

  it('copies question assignments including voting flags', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({
      joins: [
        { question_id: 1, is_voting: false },
        { question_id: 2, is_voting: true },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { duplicateRallye } = await import('./rallye');
    await duplicateRallye(5);

    expect(supabase.joinInsert).toHaveBeenCalledWith([
      { rallye_id: 99, question_id: 1, is_voting: false },
      { rallye_id: 99, question_id: 2, is_voting: true },
    ]);
  });

  it('skips join insert when the source has no questions', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({ joins: [] });
    mockCreateClient.mockResolvedValue(supabase);

    const { duplicateRallye } = await import('./rallye');
    const result = await duplicateRallye(5);

    expect(result.success).toBe(true);
    expect(supabase.joinInsert).not.toHaveBeenCalled();
  });

  it('fails for unknown rallye', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase({ source: null }));

    const { duplicateRallye } = await import('./rallye');
    expect((await duplicateRallye(999)).success).toBe(false);
  });

  it('rejects invalid ids without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { duplicateRallye } = await import('./rallye');
    expect((await duplicateRallye(0)).success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rot verifizieren** — `npx vitest run actions/rallye.test.ts` → FAIL.

- [ ] **Step 3: Implementierung** in `actions/rallye.ts`:

```ts
export async function duplicateRallye(
  rallyeId: number
): Promise<ActionResult<{ rallyeId: number; message: string }>> {
  await requireProfile();

  const idResult = idSchema.safeParse(rallyeId);
  if (!idResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(idResult.error));
  }

  const supabase = await createClient();

  const { data: source, error: sourceError } = await supabase
    .from('rallye')
    .select('id, name, department_id')
    .eq('id', idResult.data)
    .maybeSingle();
  if (sourceError) {
    console.error('Error loading rallye:', sourceError);
    return fail('Es ist ein Fehler aufgetreten');
  }
  if (!source) {
    return fail('Rallye nicht gefunden');
  }

  const { data: joins, error: joinsError } = await supabase
    .from('join_rallye_questions')
    .select('question_id, is_voting')
    .eq('rallye_id', idResult.data);
  if (joinsError) {
    console.error('Error loading question assignments:', joinsError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  // The copy starts as a fresh draft with an end time to be set and no password.
  const { data: created, error: insertError } = await supabase
    .from('rallye')
    .insert({
      name: `${source.name} (Kopie)`,
      status: 'draft' as RallyeStatus,
      end_time: new Date(),
      password: '',
      department_id: source.department_id,
    })
    .select('id')
    .single();
  if (insertError || !created) {
    console.error('Error duplicating rallye:', insertError);
    return fail('Rallye konnte nicht dupliziert werden');
  }

  if ((joins ?? []).length > 0) {
    const { error: joinInsertError } = await supabase
      .from('join_rallye_questions')
      .insert(
        (joins ?? []).map((row) => ({
          rallye_id: created.id,
          question_id: row.question_id,
          is_voting: row.is_voting === true,
        }))
      );
    if (joinInsertError) {
      console.error('Error copying question assignments:', joinInsertError);
      return fail('Fragen konnten nicht kopiert werden');
    }
  }

  revalidatePath('/rallyes');
  return ok({ rallyeId: created.id, message: 'Rallye dupliziert' });
}
```

- [ ] **Step 4: Alle Checks** → grün. **Step 5: Commit**

```bash
git add actions/rallye.ts actions/rallye.test.ts
git commit -m "Add duplicateRallye action copying question assignments"
```

---

### Task 2: „Duplizieren" als Primäraktion bei abgeschlossenen Rallyes

**Files:**
- Modify: `components/rallyes/RallyePhaseControls.tsx` (ended-Zweig statt `return null`)
- Modify: `components/rallyes/RallyePhaseControls.test.tsx` (Test „renders nothing when ended" ersetzen, neue Tests)

**Interfaces:**
- Consumes: `duplicateRallye` (Task 1); `useRouter` (`push` zur Kopie).

- [ ] **Step 1: Tests anpassen** — in `RallyePhaseControls.test.tsx` den Mock erweitern und den ended-Test ersetzen:

```tsx
const { mockAdvance, mockDuplicate, mockPush } = vi.hoisted(() => ({
  mockAdvance: vi.fn(),
  mockDuplicate: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  advanceRallyeStatus: mockAdvance,
  duplicateRallye: mockDuplicate,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
```

Ersetze den Test `renders nothing when the rallye has ended` durch:

```tsx
  it('offers duplication when the rallye has ended', async () => {
    mockDuplicate.mockResolvedValue({
      success: true,
      data: { rallyeId: 99, message: 'ok' },
    });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="ended"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Duplizieren' }));
    await waitFor(() => expect(mockDuplicate).toHaveBeenCalledWith(5));
    expect(mockPush).toHaveBeenCalledWith('/rallyes/99');
  });

  it('shows the error when duplication fails', async () => {
    mockDuplicate.mockResolvedValue({ success: false, error: 'Kaputt' });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="ended"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Duplizieren' }));
    await waitFor(() => expect(screen.getByText('Kaputt')).toBeInTheDocument());
  });
```

Zusätzlich in `beforeEach` (neu anlegen, falls nicht vorhanden) `vi.clearAllMocks()` aufrufen.

- [ ] **Step 2: Rot verifizieren.** — `npx vitest run components/rallyes/RallyePhaseControls.test.tsx`

- [ ] **Step 3: Implementierung** — in `RallyePhaseControls.tsx`: Imports ergänzen (`useRouter` aus `next/navigation`, `duplicateRallye` aus `@/actions/rallye`, `Copy` aus `lucide-react`); im Body `const router = useRouter();` ergänzen; den `if (!transition) return null;`-Block ersetzen durch:

```tsx
  const handleDuplicate = () => {
    setError(null);
    startTransition(async () => {
      const result = await duplicateRallye(rallyeId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        router.push(`/rallyes/${result.data.rallyeId}`);
      }
    });
  };

  if (!transition) {
    // Final phase: the only remaining action is creating a fresh copy (ADR-0002).
    return (
      <div className="flex flex-col items-start gap-2">
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={handleDuplicate}
          disabled={isPending}
        >
          <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
          {isPending ? 'Wird dupliziert…' : 'Duplizieren'}
        </Button>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
```

Achtung: `useState`/`useTransition`-Hooks müssen vor dem `if` stehen (sind sie bereits).

- [ ] **Step 4: Alle Checks** → grün. **Step 5: Commit**

```bash
git add components/rallyes/RallyePhaseControls.tsx components/rallyes/RallyePhaseControls.test.tsx
git commit -m "Offer duplication as primary action for ended rallyes"
```

---

### Task 3: Server-Action `createRallyeWithQuestions` + Wizard `/rallyes/new`

**Files:**
- Modify: `actions/rallye.ts` (neue Action; `rallyeCreateSchema` aus `lib/validation.ts` für den Namen wiederverwenden)
- Modify: `actions/rallye.test.ts` (describe-Block)
- Create: `components/rallyes/RallyeCreateWizard.tsx`
- Create: `components/rallyes/RallyeCreateWizard.test.tsx`
- Create: `app/(protected)/rallyes/new/page.tsx`

**Interfaces:**
- Produces:
  ```ts
  createRallyeWithQuestions(input: {
    name: string;
    departmentId: number;
    endTime: string | null; // ISO string; null → jetzt (wird später in den Einstellungen gesetzt)
    password: string;
    questionIds: number[];
  }): Promise<ActionResult<{ rallyeId: number; message: string }>>;
  ```
  `RallyeCreateWizard({ departmentOptions: DepartmentOption[]; defaultDepartmentId: number | null; questions: Question[]; categories: string[] })`
- Consumes: `idSchema`/`idArraySchema`/`rallyeCreateSchema`, `SearchFilters` (compact), `DateTimePicker`, `getUserContext`+`getLocalUser` (Vorbelegung Bereich).

- [ ] **Step 1: Failing Action-Tests** in `actions/rallye.test.ts`:

```ts
describe('createRallyeWithQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const makeSupabase = (opts: { departmentExists?: boolean }) => {
    const insertSelectSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 42 }, error: null });
    const insertSelect = vi.fn(() => ({ single: insertSelectSingle }));
    const rallyeInsert = vi.fn(() => ({ select: insertSelect }));
    const joinInsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'department') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: opts.departmentExists === false ? null : { id: 7 },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === 'rallye') {
        return { insert: rallyeInsert };
      }
      return { insert: joinInsert };
    });
    return { from, rallyeInsert, joinInsert };
  };

  it('creates a draft rallye with question assignments', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({});
    mockCreateClient.mockResolvedValue(supabase);

    const { createRallyeWithQuestions } = await import('./rallye');
    const result = await createRallyeWithQuestions({
      name: 'Girl\'s Day 2027',
      departmentId: 7,
      endTime: '2027-04-22T13:00:00.000Z',
      password: 'geheim',
      questionIds: [1, 2],
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data?.rallyeId).toBe(42);
    expect(supabase.rallyeInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Girl's Day 2027",
        status: 'draft',
        password: 'geheim',
        department_id: 7,
      })
    );
    expect(supabase.joinInsert).toHaveBeenCalledWith([
      { rallye_id: 42, question_id: 1, is_voting: false },
      { rallye_id: 42, question_id: 2, is_voting: false },
    ]);
  });

  it('fails when the department does not exist', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase({ departmentExists: false }));

    const { createRallyeWithQuestions } = await import('./rallye');
    const result = await createRallyeWithQuestions({
      name: 'X',
      departmentId: 99,
      endTime: null,
      password: '',
      questionIds: [],
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Bereich nicht gefunden');
  });

  it('rejects an empty name without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { createRallyeWithQuestions } = await import('./rallye');
    const result = await createRallyeWithQuestions({
      name: '',
      departmentId: 7,
      endTime: null,
      password: '',
      questionIds: [],
    });
    expect(result.success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('rejects an invalid end time', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { createRallyeWithQuestions } = await import('./rallye');
    const result = await createRallyeWithQuestions({
      name: 'X',
      departmentId: 7,
      endTime: 'kein-datum',
      password: '',
      questionIds: [],
    });
    expect(result.success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rot verifizieren.**

- [ ] **Step 3: Action implementieren** in `actions/rallye.ts` (Import `idArraySchema` aus `@/lib/validation` ergänzen):

```ts
export async function createRallyeWithQuestions(input: {
  name: string;
  departmentId: number;
  endTime: string | null;
  password: string;
  questionIds: number[];
}): Promise<ActionResult<{ rallyeId: number; message: string }>> {
  await requireProfile();

  const nameResult = rallyeCreateSchema.safeParse({ name: input.name });
  if (!nameResult.success) {
    return fail('Ungültige Eingaben', formatZodError(nameResult.error));
  }

  const departmentIdResult = idSchema.safeParse(input.departmentId);
  if (!departmentIdResult.success) {
    return fail('Genau ein Bereich muss zugeordnet werden');
  }

  const questionIdsResult = idArraySchema.safeParse(input.questionIds);
  if (!questionIdsResult.success) {
    return fail('Ungültige Fragen', formatZodError(questionIdsResult.error));
  }

  let endTime = new Date();
  if (input.endTime !== null) {
    const parsed = new Date(input.endTime);
    if (Number.isNaN(parsed.getTime())) {
      return fail('Ungültiges Datum');
    }
    endTime = parsed;
  }

  const supabase = await createClient();

  const { data: department, error: departmentError } = await supabase
    .from('department')
    .select('id')
    .eq('id', departmentIdResult.data)
    .maybeSingle();
  if (departmentError) {
    console.error('Error checking department:', departmentError);
    return fail('Es ist ein Fehler aufgetreten');
  }
  if (!department) {
    return fail('Bereich nicht gefunden');
  }

  const { data: created, error: insertError } = await supabase
    .from('rallye')
    .insert({
      name: nameResult.data.name,
      status: 'draft' as RallyeStatus,
      end_time: endTime,
      password: input.password,
      department_id: departmentIdResult.data,
    })
    .select('id')
    .single();
  if (insertError || !created) {
    console.error('Error creating rallye:', insertError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  const uniqueQuestionIds = Array.from(new Set(questionIdsResult.data));
  if (uniqueQuestionIds.length > 0) {
    const { error: joinError } = await supabase
      .from('join_rallye_questions')
      .insert(
        uniqueQuestionIds.map((questionId) => ({
          rallye_id: created.id,
          question_id: questionId,
          is_voting: false,
        }))
      );
    if (joinError) {
      console.error('Error assigning questions:', joinError);
      return fail('Fragen konnten nicht zugeordnet werden');
    }
  }

  revalidatePath('/rallyes');
  return ok({ rallyeId: created.id, message: 'Rallye erstellt' });
}
```

- [ ] **Step 4: Failing Wizard-Tests** — `components/rallyes/RallyeCreateWizard.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RallyeCreateWizard from './RallyeCreateWizard';

const { mockCreate, mockPush } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  createRallyeWithQuestions: mockCreate,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const departmentOptions = [
  { id: 7, name: 'HoKo/Marketing' },
  { id: 8, name: 'SZI' },
];

const questions = [
  {
    id: 1,
    content: 'Wo ist die Mensa?',
    type: 'knowledge',
    points: 3,
    category: 'Campus',
    answers: [],
  },
];

describe('RallyeCreateWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('walks through the three steps and creates the rallye', async () => {
    mockCreate.mockResolvedValue({
      success: true,
      data: { rallyeId: 42, message: 'ok' },
    });
    render(
      <RallyeCreateWizard
        departmentOptions={departmentOptions}
        defaultDepartmentId={7}
        questions={questions}
        categories={['Campus']}
      />
    );

    // Step 1: name is required, department is preselected
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Studieninfotag 2027' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    // Step 2: select a question
    fireEvent.click(screen.getByRole('checkbox', { name: /Wo ist die Mensa/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    // Step 3: create
    fireEvent.click(screen.getByRole('button', { name: 'Rallye erstellen' }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Studieninfotag 2027',
          departmentId: 7,
          questionIds: [1],
        })
      )
    );
    expect(mockPush).toHaveBeenCalledWith('/rallyes/42');
  });

  it('disables Weiter until a name is entered', () => {
    render(
      <RallyeCreateWizard
        departmentOptions={departmentOptions}
        defaultDepartmentId={null}
        questions={questions}
        categories={[]}
      />
    );
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled();
  });

  it('allows skipping the question step', async () => {
    mockCreate.mockResolvedValue({
      success: true,
      data: { rallyeId: 43, message: 'ok' },
    });
    render(
      <RallyeCreateWizard
        departmentOptions={departmentOptions}
        defaultDepartmentId={7}
        questions={questions}
        categories={[]}
      />
    );
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Ohne Fragen' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rallye erstellen' }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ questionIds: [] })
      )
    );
  });

  it('shows the action error', async () => {
    mockCreate.mockResolvedValue({ success: false, error: 'Kaputt' });
    render(
      <RallyeCreateWizard
        departmentOptions={departmentOptions}
        defaultDepartmentId={7}
        questions={[]}
        categories={[]}
      />
    );
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'X' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rallye erstellen' }));
    await waitFor(() => expect(screen.getByText('Kaputt')).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Wizard implementieren** — `components/rallyes/RallyeCreateWizard.tsx`:

```tsx
'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { de } from 'date-fns/locale';
import { createRallyeWithQuestions } from '@/actions/rallye';
import SearchFilters from '@/components/questions/SearchFilters';
import { questionTypes } from '@/helpers/questionTypes';
import type { Question } from '@/helpers/questions';
import type { DepartmentOption } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Filters = {
  question?: string;
  answer?: string;
  type?: string;
  category?: string;
};

interface RallyeCreateWizardProps {
  departmentOptions: DepartmentOption[];
  defaultDepartmentId: number | null;
  questions: Question[];
  categories: string[];
}

const STEPS = ['Name & Bereich', 'Fragen wählen', 'Termin & Passwort'];

const getTypeLabel = (type: string | null | undefined): string =>
  questionTypes.find((t) => t.id === type)?.name ?? '—';

const matchesFilters = (question: Question, filters: Filters): boolean => {
  if (
    filters.question &&
    !question.content?.toLowerCase().includes(filters.question.toLowerCase())
  ) {
    return false;
  }
  if (
    filters.answer &&
    !(question.answers ?? []).some((answer) =>
      answer.text?.toLowerCase().includes(filters.answer!.toLowerCase())
    )
  ) {
    return false;
  }
  if (filters.type && filters.type !== 'all' && question.type !== filters.type) {
    return false;
  }
  if (
    filters.category &&
    filters.category !== 'all' &&
    question.category !== filters.category
  ) {
    return false;
  }
  return true;
};

export default function RallyeCreateWizard({
  departmentOptions,
  defaultDepartmentId,
  questions,
  categories,
}: RallyeCreateWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState<string>(
    defaultDepartmentId ? String(defaultDepartmentId) : ''
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<Filters>({});
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredQuestions = useMemo(
    () => questions.filter((question) => matchesFilters(question, filters)),
    [questions, filters]
  );

  const canLeaveStep1 = name.trim().length > 0 && departmentId.length > 0;

  const toggleQuestion = (questionId: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(questionId);
      else next.delete(questionId);
      return next;
    });
  };

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await createRallyeWithQuestions({
        name: name.trim(),
        departmentId: Number(departmentId),
        endTime: endTime ? endTime.toISOString() : null,
        password,
        questionIds: Array.from(selectedIds),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        router.push(`/rallyes/${result.data.rallyeId}`);
      }
    });
  };

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-1">
            {index > 0 && (
              <span aria-hidden="true" className="text-muted-foreground/60">
                →
              </span>
            )}
            <span
              aria-current={index === step ? 'step' : undefined}
              className={
                index === step
                  ? 'rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary'
                  : 'text-muted-foreground'
              }
            >
              {`${index + 1}. ${label}`}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="flex max-w-xl flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="wizard-name">Name</Label>
            <Input
              id="wizard-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Studieninfotag 2027"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wizard-department">Bereich</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger id="wizard-department" className="max-w-sm">
                <SelectValue placeholder="Bereich auswählen" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((department) => (
                  <SelectItem
                    key={department.id}
                    value={String(department.id)}
                  >
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size === 0
              ? 'Wähle Fragen aus dem Katalog — oder überspringe diesen Schritt und ordne später zu.'
              : `${selectedIds.size} ${selectedIds.size === 1 ? 'Frage' : 'Fragen'} ausgewählt.`}
          </p>
          <SearchFilters
            onFilterChange={setFilters}
            categories={categories}
            showAssignedToggle={false}
            compact
          />
          <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-muted/30 p-3">
            {filteredQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine passenden Fragen gefunden.
              </p>
            ) : (
              filteredQuestions.map((question) => (
                <div key={question.id} className="flex items-start gap-2">
                  <Checkbox
                    id={`wizard-question-${question.id}`}
                    checked={selectedIds.has(question.id)}
                    onCheckedChange={(checked) =>
                      toggleQuestion(question.id, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`wizard-question-${question.id}`}
                    className="text-sm font-normal"
                  >
                    {question.content}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {getTypeLabel(question.type)}
                      {question.points ? ` · ${question.points} P` : ''}
                    </span>
                  </Label>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex max-w-xl flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="wizard-endtime">Ende der Rallye</Label>
            <DateTimePicker
              locale={de}
              hourCycle={24}
              value={endTime}
              onChange={setEndTime}
              className="max-w-sm"
            />
            <p className="text-xs text-muted-foreground">
              Kann später in den Einstellungen geändert werden.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wizard-password">Passwort (optional)</Label>
            <Input
              id="wizard-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-border/60 pt-4">
        <Button
          variant="outline"
          className="cursor-pointer"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Zurück
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            variant="dhbwStyle"
            className="cursor-pointer"
            disabled={step === 0 && !canLeaveStep1}
            onClick={() => setStep((s) => s + 1)}
          >
            Weiter
          </Button>
        ) : (
          <Button
            variant="dhbwStyle"
            className="cursor-pointer"
            disabled={isPending}
            onClick={handleCreate}
          >
            {isPending ? 'Wird erstellt…' : 'Rallye erstellen'}
          </Button>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Seite** — `app/(protected)/rallyes/new/page.tsx`:

```tsx
import Link from 'next/link';
import createClient from '@/lib/supabase';
import RallyeCreateWizard from '@/components/rallyes/RallyeCreateWizard';
import { getUserContext } from '@/lib/user-context';
import { getLocalUser } from '@/lib/db/local-user';
import { Button } from '@/components/ui/button';
import type { DepartmentOption } from '@/lib/types';
import type { Question } from '@/helpers/questions';

async function getUserDepartmentId(): Promise<number | null> {
  try {
    const { uuid } = await getUserContext();
    return getLocalUser(uuid)?.department_id ?? null;
  } catch {
    return null;
  }
}

export default async function NewRallyePage() {
  const supabase = await createClient();
  const defaultDepartmentId = await getUserDepartmentId();

  const [{ data: departments }, { data: questionRows }] = await Promise.all([
    supabase.from('department').select('id, name').order('name'),
    supabase
      .from('questions')
      .select('id, content, type, points, category, answers(id, correct, text)'),
  ]);

  const questions = (questionRows ?? []) as Question[];
  const categories = Array.from(
    new Set(
      questions
        .map((question) => question.category)
        .filter((category): category is string => Boolean(category))
    )
  ).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

  return (
    <main className="mx-auto flex w-full max-w-350 flex-col gap-4 px-4 py-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div>
          <Button asChild variant="outline" size="sm">
            <Link href="/rallyes">← Zurück zu Rallyes</Link>
          </Button>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Rallyes
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Neue Rallye erstellen
          </h1>
        </div>
      </section>
      <RallyeCreateWizard
        departmentOptions={(departments ?? []) as DepartmentOption[]}
        defaultDepartmentId={defaultDepartmentId}
        questions={questions}
        categories={categories}
      />
    </main>
  );
}
```

- [ ] **Step 7: Alle Checks** → grün. **Step 8: Commit**

```bash
git add actions/rallye.ts actions/rallye.test.ts components/rallyes/RallyeCreateWizard.tsx components/rallyes/RallyeCreateWizard.test.tsx "app/(protected)/rallyes/new/page.tsx"
git commit -m "Add guided rallye creation wizard at /rallyes/new"
```

---

### Task 4: Alt-Dialoge und alte `createRallye`-Action entfernen

**Files:**
- Delete: `components/RallyeDialog.tsx`, `components/RallyeDialog.test.tsx`, `components/rallyes/ProgramRallyeDialog.tsx`, `components/rallyes/ProgramRallyeDialog.test.tsx` (via `git rm`)
- Modify: `actions/rallye.ts` (Funktion `createRallye` entfernen; `rallyeCreateSchema`-Import bleibt — wird von `createRallyeWithQuestions` genutzt)
- Modify: `app/(protected)/rallyes/page.tsx` (Dialog → Link-Button „+ Neue Rallye")
- Modify: `app/(protected)/rallyes/page.test.tsx` (Dialog-Mock raus, Assertion auf Link)

- [ ] **Step 1: Löschen und Header umbauen**

```bash
git rm components/RallyeDialog.tsx components/RallyeDialog.test.tsx components/rallyes/ProgramRallyeDialog.tsx components/rallyes/ProgramRallyeDialog.test.tsx
```

In `app/(protected)/rallyes/page.tsx`: Import `ProgramRallyeDialog` entfernen, `Link` aus `next/link` und `Button` aus `@/components/ui/button` importieren; im Header-`<section>` den Dialog ersetzen durch:

```tsx
<Button asChild variant="dhbwStyle" className="w-full sm:w-auto">
  <Link href="/rallyes/new">+ Neue Rallye</Link>
</Button>
```

`departmentOptions` wird auf der Startseite danach nur noch für `departmentById`/Labels gebraucht — die Variable `departmentOptions` entfernen, falls ungenutzt.

In `app/(protected)/rallyes/page.test.tsx`: den `ProgramRallyeDialog`-Mock löschen; den Test `renders the create button in the page header` ersetzen durch:

```tsx
  it('renders the create link in the page header', async () => {
    render(await Home());
    expect(screen.getByRole('link', { name: '+ Neue Rallye' })).toHaveAttribute(
      'href',
      '/rallyes/new'
    );
  });
```

Außerdem in `actions/rallye.ts` die Funktion `createRallye` (FormData-Variante) komplett entfernen — vorher per `grep -rn "createRallye\b" app components --include="*.tsx"` verifizieren, dass keine Konsumenten mehr existieren. Der Typ `FormState` bleibt (wird von `updateRallye` genutzt).

- [ ] **Step 2: Alle Checks** → grün. **Step 3: Commit**

```bash
git add -A actions components "app/(protected)/rallyes"
git commit -m "Remove legacy create dialogs in favor of guided wizard"
```

---

### Task 5: End-to-End-Verifikation + Build

- [ ] Dev-Server, per agent-browser:
  1. `/rallyes` → „+ Neue Rallye" → Wizard: Name „E2E Wizard-Test", Bereich wählen, Weiter; eine Frage anhaken, Weiter; Endzeit offen lassen, „Rallye erstellen" → landet auf `/rallyes/<neu>` im Status Entwurf mit 1 zugeordneter Frage.
  2. Die neue Rallye per Phasen-Button bis „Abgeschlossen" durchschalten (Entwurf abschließen → Starten → Ergebnisse anzeigen → Beenden).
  3. „Duplizieren" klicken → landet auf der Kopie („… (Kopie)", Entwurf, 1 Frage übernommen).
  4. Beide Test-Rallyes über Einstellungen → Löschen entfernen (Ausgangszustand).
- [ ] `npm run build` → erfolgreich, Route `/rallyes/new` im Output.

---

## Nach Block 5

Block 6 (Fragenkatalog/Editor) und Block 7 (Verwaltung bündeln) sind unabhängig voneinander planbar.
