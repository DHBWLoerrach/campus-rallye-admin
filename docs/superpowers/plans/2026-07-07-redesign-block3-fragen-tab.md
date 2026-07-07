# Redesign Block 3: Zuordnungs-UI im Fragen-Tab — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Fragen-Tab der Rallye-Detailseite wird zur vollwertigen Zuordnungs-UI (hinzufügen, entfernen, Abstimmungs-Toggle) und ersetzt die separate Zwei-Spalten-Seite `Assignment.tsx` (799 Zeilen).

**Architecture:** **Sofort-Persistenz statt Batch-Save**: Jede Aktion (Frage hinzufügen/entfernen, Abstimmung an/aus) ruft eine granulare Server-Action und speichert direkt — das eliminiert die Save/Discard/Leave-Confirm-Komplexität des alten `Assignment.tsx` und passt zur Zielgruppe (Gelegenheitsnutzer, keine verlorenen Änderungen). Die Client-Komponente `RallyeQuestionsManager` hält lokalen State (optimistisch aktualisiert) und ruft `router.refresh()`, damit Layout-Header (Voting-Zähler) und Tab konsistent bleiben. Die alte Route `/rallyes/[id]/questions` wird zum Redirect auf `/rallyes/[id]`. Abweichung von der Spec-Formulierung „bestehende Server-Actions wiederverwenden": Der Voll-Sync `assignQuestionsToRallye` bleibt bestehen (Kandidat für Block 5, geführter Erstell-Flow), aber Einzelaktionen bekommen eigene schlanke Actions — ein Voll-Sync pro Klick wäre unnötig race-anfällig.

**Tech Stack:** Next.js 16 App Router, Supabase-JS, Vitest + RTL (`fireEvent`, kein user-event installiert), shadcn/ui (`Dialog`, `Table`, `Checkbox`), bestehende `SearchFilters`-Komponente (compact-Modus).

## Global Constraints

- Nach jedem Task: `npm run lint`, `npm run check:format`, `npx tsc --noEmit`, `npm test` — alle grün, sonst kein Commit (AGENTS.md Hard Rule).
- Commits nur nach Nutzer-Freigabe (Block-weises OK einholen, wie bei Block 1/2).
- Code-Kommentare Englisch, UI-Texte Deutsch, Prettier-Stil, Pfad-Aliasse `@/…`.
- Die alte URL `/rallyes/[id]/questions` muss weiter funktionieren (Redirect auf `/rallyes/[id]`).
- `.next/standalone/**` ist Build-Output — niemals dort editieren oder committen.

---

### Task 1: Granulare Server-Actions für Einzelzuordnung

**Files:**
- Modify: `actions/assign_questions_to_rallye.ts` (drei neue Funktionen ans Dateiende)
- Modify: `actions/assign_questions_to_rallye.test.ts` (neue describe-Blöcke; Mock-Muster der Datei vorher lesen und übernehmen — sie nutzt `vi.hoisted` mit `mockRequireProfile`/`mockCreateClient`/`mockRevalidatePath` wie `actions/rallye.test.ts`)

**Interfaces:**
- Produces:
  ```ts
  addQuestionToRallye(rallyeId: number, questionId: number): Promise<ActionResult<{ message: string }>>;
  removeQuestionFromRallye(rallyeId: number, questionId: number): Promise<ActionResult<{ message: string }>>;
  setQuestionVoting(rallyeId: number, questionId: number, isVoting: boolean): Promise<ActionResult<{ message: string }>>;
  ```
- Consumes: `idSchema`, `formatZodError` aus `@/lib/validation`; `ok`/`fail`; `requireProfile`.

- [ ] **Step 1: Failing Tests** — an `actions/assign_questions_to_rallye.test.ts` anhängen (Mock-Namen an die Datei anpassen):

```ts
describe('addQuestionToRallye', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // Supabase mock: rallye lookup, question lookup, existing-join lookup, insert
  const makeSupabase = (opts: {
    rallyeExists?: boolean;
    questionType?: string | null;
    alreadyAssigned?: boolean;
    insertError?: unknown;
  }) => {
    const insert = vi.fn().mockResolvedValue({ error: opts.insertError ?? null });
    const from = vi.fn((table: string) => {
      if (table === 'rallye') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: opts.rallyeExists === false ? null : { id: 5 },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === 'questions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data:
                  opts.questionType === null
                    ? null
                    : { id: 7, type: opts.questionType ?? 'knowledge' },
                error: null,
              }),
            })),
          })),
        };
      }
      // join_rallye_questions
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: opts.alreadyAssigned ? { question_id: 7 } : null,
                error: null,
              }),
            })),
          })),
        })),
        insert,
      };
    });
    return { from, insert };
  };

  it('inserts a new assignment with voting disabled', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({});
    mockCreateClient.mockResolvedValue(supabase);

    const { addQuestionToRallye } = await import(
      './assign_questions_to_rallye'
    );
    const result = await addQuestionToRallye(5, 7);

    expect(result.success).toBe(true);
    expect(supabase.insert).toHaveBeenCalledWith({
      rallye_id: 5,
      question_id: 7,
      is_voting: false,
    });
  });

  it('is idempotent when the question is already assigned', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({ alreadyAssigned: true });
    mockCreateClient.mockResolvedValue(supabase);

    const { addQuestionToRallye } = await import(
      './assign_questions_to_rallye'
    );
    const result = await addQuestionToRallye(5, 7);

    expect(result.success).toBe(true);
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it('fails when the question does not exist', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase({ questionType: null }));

    const { addQuestionToRallye } = await import(
      './assign_questions_to_rallye'
    );
    const result = await addQuestionToRallye(5, 999);
    expect(result.success).toBe(false);
  });

  it('rejects invalid ids without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { addQuestionToRallye } = await import(
      './assign_questions_to_rallye'
    );
    expect((await addQuestionToRallye(-1, 7)).success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe('removeQuestionFromRallye', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('deletes the join row', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const deleteEq2 = vi.fn().mockResolvedValue({ error: null });
    const deleteEq1 = vi.fn(() => ({ eq: deleteEq2 }));
    const deleteFn = vi.fn(() => ({ eq: deleteEq1 }));
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({ delete: deleteFn })),
    });

    const { removeQuestionFromRallye } = await import(
      './assign_questions_to_rallye'
    );
    const result = await removeQuestionFromRallye(5, 7);

    expect(result.success).toBe(true);
    expect(deleteFn).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/rallyes/5', 'layout');
  });

  it('rejects invalid ids', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { removeQuestionFromRallye } = await import(
      './assign_questions_to_rallye'
    );
    expect((await removeQuestionFromRallye(5, 0)).success).toBe(false);
  });
});

describe('setQuestionVoting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const makeSupabase = (opts: {
    questionType?: string | null;
    rowUpdated?: boolean;
  }) => {
    const updatedRows = opts.rowUpdated === false ? [] : [{ question_id: 7 }];
    const updateSelect = vi
      .fn()
      .mockResolvedValue({ data: updatedRows, error: null });
    const updateEq2 = vi.fn(() => ({ select: updateSelect }));
    const updateEq1 = vi.fn(() => ({ eq: updateEq2 }));
    const update = vi.fn(() => ({ eq: updateEq1 }));
    const from = vi.fn((table: string) => {
      if (table === 'questions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data:
                  opts.questionType === null
                    ? null
                    : { id: 7, type: opts.questionType ?? 'upload' },
                error: null,
              }),
            })),
          })),
        };
      }
      return { update };
    });
    return { from, update };
  };

  it('enables voting for an assigned upload question', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({ questionType: 'upload' });
    mockCreateClient.mockResolvedValue(supabase);

    const { setQuestionVoting } = await import('./assign_questions_to_rallye');
    const result = await setQuestionVoting(5, 7, true);

    expect(result.success).toBe(true);
    expect(supabase.update).toHaveBeenCalledWith({ is_voting: true });
  });

  it('rejects enabling voting for non-upload questions', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(
      makeSupabase({ questionType: 'knowledge' })
    );

    const { setQuestionVoting } = await import('./assign_questions_to_rallye');
    const result = await setQuestionVoting(5, 7, true);

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Abstimmung nur für Upload-Fragen möglich');
  });

  it('fails when the question is not assigned to the rallye', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(
      makeSupabase({ questionType: 'upload', rowUpdated: false })
    );

    const { setQuestionVoting } = await import('./assign_questions_to_rallye');
    const result = await setQuestionVoting(5, 7, true);
    expect(result.success).toBe(false);
  });

  it('disables voting without checking the question type', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({});
    mockCreateClient.mockResolvedValue(supabase);

    const { setQuestionVoting } = await import('./assign_questions_to_rallye');
    const result = await setQuestionVoting(5, 7, false);

    expect(result.success).toBe(true);
    expect(supabase.update).toHaveBeenCalledWith({ is_voting: false });
  });
});
```

- [ ] **Step 2: Rot verifizieren** — `npx vitest run actions/assign_questions_to_rallye.test.ts` → FAIL (Funktionen existieren nicht).

- [ ] **Step 3: Implementierung** — ans Ende von `actions/assign_questions_to_rallye.ts`:

```ts
const validateIdPair = (rallyeId: number, questionId: number) => {
  const rallyeIdResult = idSchema.safeParse(rallyeId);
  if (!rallyeIdResult.success) {
    return {
      error: fail('Ungültige Rallye-ID', formatZodError(rallyeIdResult.error)),
    } as const;
  }
  const questionIdResult = idSchema.safeParse(questionId);
  if (!questionIdResult.success) {
    return {
      error: fail(
        'Ungültige Frage-ID',
        formatZodError(questionIdResult.error)
      ),
    } as const;
  }
  return {
    rallyeId: rallyeIdResult.data,
    questionId: questionIdResult.data,
  } as const;
};

const revalidateRallyeDetail = (rallyeId: number) => {
  revalidatePath('/rallyes');
  revalidatePath(`/rallyes/${rallyeId}`, 'layout');
};

export async function addQuestionToRallye(
  rallyeId: number,
  questionId: number
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const ids = validateIdPair(rallyeId, questionId);
  if ('error' in ids) return ids.error;

  const supabase = await createClient();

  const { data: existingRallye, error: rallyeError } = await supabase
    .from('rallye')
    .select('id')
    .eq('id', ids.rallyeId)
    .maybeSingle();
  if (rallyeError) {
    console.error('Error checking rallye:', rallyeError);
    return fail('Rallye konnte nicht aktualisiert werden');
  }
  if (!existingRallye) {
    return fail('Rallye nicht gefunden');
  }

  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select('id, type')
    .eq('id', ids.questionId)
    .maybeSingle();
  if (questionError) {
    console.error('Error checking question:', questionError);
    return fail('Frage konnte nicht geladen werden');
  }
  if (!question) {
    return fail('Frage nicht gefunden');
  }

  const { data: existingJoin, error: joinError } = await supabase
    .from('join_rallye_questions')
    .select('question_id')
    .eq('rallye_id', ids.rallyeId)
    .eq('question_id', ids.questionId)
    .maybeSingle();
  if (joinError) {
    console.error('Error checking assignment:', joinError);
    return fail('Rallye konnte nicht aktualisiert werden');
  }
  if (existingJoin) {
    return ok({ message: 'Frage ist bereits zugeordnet' });
  }

  const { error: insertError } = await supabase
    .from('join_rallye_questions')
    .insert({
      rallye_id: ids.rallyeId,
      question_id: ids.questionId,
      is_voting: false,
    });
  if (insertError) {
    console.error('Error adding question to rallye:', insertError);
    return fail('Rallye konnte nicht aktualisiert werden');
  }

  revalidateRallyeDetail(ids.rallyeId);
  return ok({ message: 'Frage hinzugefügt' });
}

export async function removeQuestionFromRallye(
  rallyeId: number,
  questionId: number
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const ids = validateIdPair(rallyeId, questionId);
  if ('error' in ids) return ids.error;

  const supabase = await createClient();
  const { error } = await supabase
    .from('join_rallye_questions')
    .delete()
    .eq('rallye_id', ids.rallyeId)
    .eq('question_id', ids.questionId);
  if (error) {
    console.error('Error removing question from rallye:', error);
    return fail('Rallye konnte nicht aktualisiert werden');
  }

  revalidateRallyeDetail(ids.rallyeId);
  return ok({ message: 'Frage entfernt' });
}

export async function setQuestionVoting(
  rallyeId: number,
  questionId: number,
  isVoting: boolean
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const ids = validateIdPair(rallyeId, questionId);
  if ('error' in ids) return ids.error;

  const supabase = await createClient();

  // Voting is only allowed for upload questions (same rule as the full sync).
  if (isVoting) {
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, type')
      .eq('id', ids.questionId)
      .maybeSingle();
    if (questionError) {
      console.error('Error checking question:', questionError);
      return fail('Frage konnte nicht geladen werden');
    }
    if (!question || question.type !== 'upload') {
      return fail('Abstimmung nur für Upload-Fragen möglich');
    }
  }

  const { data: updatedRows, error } = await supabase
    .from('join_rallye_questions')
    .update({ is_voting: isVoting })
    .eq('rallye_id', ids.rallyeId)
    .eq('question_id', ids.questionId)
    .select('question_id');
  if (error) {
    console.error('Error updating voting flag:', error);
    return fail('Rallye konnte nicht aktualisiert werden');
  }
  if (!updatedRows || updatedRows.length === 0) {
    return fail('Frage ist dieser Rallye nicht zugeordnet');
  }

  revalidateRallyeDetail(ids.rallyeId);
  return ok({ message: 'Abstimmung aktualisiert' });
}
```

- [ ] **Step 4: Alle Checks** → grün. **Step 5: Commit (nach Freigabe)**

```bash
git add actions/assign_questions_to_rallye.ts actions/assign_questions_to_rallye.test.ts
git commit -m "Add granular assignment actions for single questions"
```

---

### Task 2: Client-Komponente `RallyeQuestionsManager`

**Files:**
- Create: `components/rallyes/RallyeQuestionsManager.tsx`
- Create: `components/rallyes/RallyeQuestionsManager.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  type AssignedQuestion = { question: Question; isVoting: boolean };
  RallyeQuestionsManager({
    rallyeId: number;
    initialAssigned: AssignedQuestion[];
    initialAvailable: Question[]; // nicht zugeordnete Fragen
    categories: string[];
  })
  ```
- Consumes: `addQuestionToRallye`/`removeQuestionFromRallye`/`setQuestionVoting` (Task 1); `Question` aus `@/helpers/questions`; `SearchFilters` (`compact`, `showAssignedToggle={false}`, ohne `rallyes`); `questionTypes` aus `@/helpers/questionTypes`; shadcn `Dialog`/`Table`/`Checkbox`/`Badge`/`Button`; `useRouter` (`router.refresh()` nach jeder erfolgreichen Aktion).

- [ ] **Step 1: Failing Tests** — `components/rallyes/RallyeQuestionsManager.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import RallyeQuestionsManager from './RallyeQuestionsManager';
import type { Question } from '@/helpers/questions';

const { mockAdd, mockRemove, mockSetVoting, mockRefresh } = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockRemove: vi.fn(),
  mockSetVoting: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock('@/actions/assign_questions_to_rallye', () => ({
  addQuestionToRallye: mockAdd,
  removeQuestionFromRallye: mockRemove,
  setQuestionVoting: mockSetVoting,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const makeQuestion = (overrides: Partial<Question>): Question =>
  ({
    id: 1,
    content: 'Frage',
    type: 'knowledge',
    points: 3,
    hint: null,
    category: 'Campus',
    bucket_path: null,
    answers: [],
    ...overrides,
  }) as Question;

const uploadQuestion = makeQuestion({
  id: 2,
  content: 'Macht ein Gruppenfoto',
  type: 'upload',
  points: 8,
});

describe('RallyeQuestionsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows assigned questions with points total', () => {
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[
          { question: makeQuestion({}), isVoting: false },
          { question: uploadQuestion, isVoting: true },
        ]}
        initialAvailable={[]}
        categories={[]}
      />
    );
    expect(screen.getByText('2 Fragen · 11 Punkte gesamt')).toBeInTheDocument();
    expect(screen.getByText('Frage')).toBeInTheDocument();
    expect(screen.getByText('Macht ein Gruppenfoto')).toBeInTheDocument();
  });

  it('shows the voting checkbox only for upload questions', () => {
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[
          { question: makeQuestion({}), isVoting: false },
          { question: uploadQuestion, isVoting: false },
        ]}
        initialAvailable={[]}
        categories={[]}
      />
    );
    expect(screen.getAllByRole('checkbox', { name: 'Abstimmung' })).toHaveLength(
      1
    );
  });

  it('removes an assigned question via the action', async () => {
    mockRemove.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[{ question: makeQuestion({}), isVoting: false }]}
        initialAvailable={[]}
        categories={[]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Frage entfernen' }));
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(5, 1));
    expect(screen.getByText('Keine Fragen zugeordnet')).toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('adds an available question from the dialog', async () => {
    mockAdd.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[]}
        initialAvailable={[makeQuestion({ id: 9, content: 'Neue Frage' })]}
        categories={['Campus']}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: '+ Fragen hinzufügen' })
    );
    expect(screen.getByText('Neue Frage')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Frage hinzufügen' }));
    await waitFor(() => expect(mockAdd).toHaveBeenCalledWith(5, 9));
    expect(screen.getByText('1 Frage · 3 Punkte gesamt')).toBeInTheDocument();
  });

  it('toggles voting via the action', async () => {
    mockSetVoting.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[{ question: uploadQuestion, isVoting: false }]}
        initialAvailable={[]}
        categories={[]}
      />
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Abstimmung' }));
    await waitFor(() => expect(mockSetVoting).toHaveBeenCalledWith(5, 2, true));
  });

  it('shows the action error and keeps state on failure', async () => {
    mockRemove.mockResolvedValue({ success: false, error: 'Kaputt' });
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[{ question: makeQuestion({}), isVoting: false }]}
        initialAvailable={[]}
        categories={[]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Frage entfernen' }));
    await waitFor(() => expect(screen.getByText('Kaputt')).toBeInTheDocument());
    expect(screen.getByText('Frage')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rot verifizieren** — `npx vitest run components/rallyes/RallyeQuestionsManager.test.tsx` → FAIL.

- [ ] **Step 3: Implementierung** — `components/rallyes/RallyeQuestionsManager.tsx`:

```tsx
'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CircleMinus, CirclePlus, Pencil } from 'lucide-react';
import Link from 'next/link';
import {
  addQuestionToRallye,
  removeQuestionFromRallye,
  setQuestionVoting,
} from '@/actions/assign_questions_to_rallye';
import SearchFilters from '@/components/questions/SearchFilters';
import { questionTypes } from '@/helpers/questionTypes';
import type { Question } from '@/helpers/questions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type AssignedQuestion = { question: Question; isVoting: boolean };

type Filters = {
  question?: string;
  answer?: string;
  type?: string;
  category?: string;
};

interface RallyeQuestionsManagerProps {
  rallyeId: number;
  initialAssigned: AssignedQuestion[];
  initialAvailable: Question[];
  categories: string[];
}

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

export default function RallyeQuestionsManager({
  rallyeId,
  initialAssigned,
  initialAvailable,
  categories,
}: RallyeQuestionsManagerProps) {
  const router = useRouter();
  const [assigned, setAssigned] = useState<AssignedQuestion[]>(initialAssigned);
  const [available, setAvailable] = useState<Question[]>(initialAvailable);
  const [filters, setFilters] = useState<Filters>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPoints = assigned.reduce(
    (sum, entry) => sum + (entry.question.points ?? 0),
    0
  );

  const filteredAvailable = useMemo(
    () => available.filter((question) => matchesFilters(question, filters)),
    [available, filters]
  );

  const handleAdd = (question: Question) => {
    setError(null);
    startTransition(async () => {
      const result = await addQuestionToRallye(rallyeId, question.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAssigned((prev) =>
        [...prev, { question, isVoting: false }].sort((a, b) =>
          (a.question.content ?? '').localeCompare(
            b.question.content ?? '',
            'de',
            { sensitivity: 'base' }
          )
        )
      );
      setAvailable((prev) => prev.filter((q) => q.id !== question.id));
      router.refresh();
    });
  };

  const handleRemove = (entry: AssignedQuestion) => {
    setError(null);
    startTransition(async () => {
      const result = await removeQuestionFromRallye(
        rallyeId,
        entry.question.id
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAssigned((prev) =>
        prev.filter((e) => e.question.id !== entry.question.id)
      );
      setAvailable((prev) =>
        [...prev, entry.question].sort((a, b) =>
          (a.content ?? '').localeCompare(b.content ?? '', 'de', {
            sensitivity: 'base',
          })
        )
      );
      router.refresh();
    });
  };

  const handleVotingToggle = (entry: AssignedQuestion, checked: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await setQuestionVoting(
        rallyeId,
        entry.question.id,
        checked
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAssigned((prev) =>
        prev.map((e) =>
          e.question.id === entry.question.id ? { ...e, isVoting: checked } : e
        )
      );
      router.refresh();
    });
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {assigned.length === 0
            ? 'Keine Fragen zugeordnet'
            : `${assigned.length} ${assigned.length === 1 ? 'Frage' : 'Fragen'} · ${totalPoints} Punkte gesamt`}
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="dhbwStyle" size="sm" className="cursor-pointer">
              + Fragen hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Fragen aus dem Katalog hinzufügen</DialogTitle>
            </DialogHeader>
            <SearchFilters
              onFilterChange={setFilters}
              categories={categories}
              showAssignedToggle={false}
              compact
            />
            {filteredAvailable.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine passenden Fragen gefunden.
              </p>
            ) : (
              <Table>
                <TableBody>
                  {filteredAvailable.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="max-w-md">
                        <span className="line-clamp-2">{question.content}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {getTypeLabel(question.type)}
                          {question.points ? ` · ${question.points} P` : ''}
                        </span>
                      </TableCell>
                      <TableCell className="w-12 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Frage hinzufügen"
                          className="cursor-pointer text-primary"
                          disabled={isPending}
                          onClick={() => handleAdd(question)}
                        >
                          <CirclePlus className="h-5 w-5" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div
          className="rounded-md border border-red-500/60 bg-red-50/60 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {assigned.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Frage</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="text-right">Punkte</TableHead>
              <TableHead>Abstimmung</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assigned.map((entry) => (
              <TableRow key={entry.question.id}>
                <TableCell className="max-w-xl">
                  <span className="line-clamp-2">{entry.question.content}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getTypeLabel(entry.question.type)}
                </TableCell>
                <TableCell className="text-right">
                  {entry.question.points ?? '—'}
                </TableCell>
                <TableCell>
                  {entry.question.type === 'upload' ? (
                    <Checkbox
                      aria-label="Abstimmung"
                      checked={entry.isVoting}
                      disabled={isPending}
                      onCheckedChange={(checked) =>
                        handleVotingToggle(entry, checked === true)
                      }
                    />
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      —
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      aria-label="Frage bearbeiten"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Link href={`/questions/${entry.question.id}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Frage entfernen"
                      className="cursor-pointer text-destructive"
                      disabled={isPending}
                      onClick={() => handleRemove(entry)}
                    >
                      <CircleMinus className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
```

Hinweis: Vor der Umsetzung `helpers/questions.ts` lesen und den `Question`-Typ exakt übernehmen (Feldnamen `content`, `type`, `points`, `category`, `answers[{id, correct, text}]` — bei Abweichung Tests und Code anpassen). Falls `SearchFilters` als `.tsx` ohne `'use client'` nicht in der Client-Komponente nutzbar ist: prüfen, wie `Assignment.tsx` sie einbindet (dort funktioniert es bereits im Client-Kontext).

- [ ] **Step 4: Grün verifizieren + alle Checks.** **Step 5: Commit (nach Freigabe)**

```bash
git add components/rallyes/RallyeQuestionsManager.tsx components/rallyes/RallyeQuestionsManager.test.tsx
git commit -m "Add RallyeQuestionsManager with instant-persist assignment"
```

---

### Task 3: Fragen-Tab lädt Daten und rendert den Manager

**Files:**
- Modify: `app/(protected)/rallyes/[id]/(tabs)/page.tsx` (Read-only-Tabelle + „Fragen zuordnen"-Link ersetzen)

**Interfaces:**
- Consumes: `RallyeQuestionsManager` (Task 2), `Question` aus `@/helpers/questions`.

- [ ] **Step 1: Seite umbauen** — kompletter neuer Inhalt von `app/(protected)/rallyes/[id]/(tabs)/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import createClient from '@/lib/supabase';
import RallyeQuestionsManager, {
  type AssignedQuestion,
} from '@/components/rallyes/RallyeQuestionsManager';
import type { Question } from '@/helpers/questions';

interface PageProps {
  params: Promise<{ id: string }>;
}

type AssignmentRow = { question_id: number; is_voting: boolean | null };

export default async function RallyeQuestionsTab(props: PageProps) {
  const params = await props.params;
  const idStr = params.id;
  if (!/^\d+$/.test(idStr)) {
    notFound();
  }
  const rallyeId = Number(idStr);

  const supabase = await createClient();
  const { data: rallye } = await supabase
    .from('rallye')
    .select('id')
    .eq('id', rallyeId)
    .maybeSingle();
  if (!rallye) {
    notFound();
  }

  const [assignmentsRes, questionsRes] = await Promise.all([
    supabase
      .from('join_rallye_questions')
      .select('question_id, is_voting')
      .eq('rallye_id', rallyeId),
    supabase
      .from('questions')
      .select(
        'id, content, type, points, hint, category, bucket_path, answers(id, correct, text)'
      ),
  ]);

  const assignments = (assignmentsRes.data ?? []) as AssignmentRow[];
  const questions = (questionsRes.data ?? []) as Question[];

  const votingByQuestionId = new Map(
    assignments.map((row) => [row.question_id, row.is_voting === true])
  );

  const byName = (a: Question, b: Question) =>
    (a.content ?? '').localeCompare(b.content ?? '', 'de', {
      sensitivity: 'base',
    });

  const assigned: AssignedQuestion[] = questions
    .filter((question) => votingByQuestionId.has(question.id))
    .sort(byName)
    .map((question) => ({
      question,
      isVoting: votingByQuestionId.get(question.id) === true,
    }));
  const available = questions
    .filter((question) => !votingByQuestionId.has(question.id))
    .sort(byName);

  const categories = Array.from(
    new Set(
      questions
        .map((question) => question.category)
        .filter((category): category is string => Boolean(category))
    )
  ).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

  return (
    <RallyeQuestionsManager
      rallyeId={rallyeId}
      initialAssigned={assigned}
      initialAvailable={available}
      categories={categories}
    />
  );
}
```

Wichtig: Der `key`-loser Manager behält seinen lokalen State über `router.refresh()` hinweg — das ist gewollt (Props ändern sich, lokaler State bleibt konsistent, weil beide dieselben Mutationen widerspiegeln). Kein `useEffect`-Sync einbauen.

- [ ] **Step 2: Alle Checks** → grün. **Step 3: Smoke-Test** — `/rallyes/8` (Kennenlerntag, 2 Fragen): zugeordnete Fragen mit Punktesumme, „+ Fragen hinzufügen" öffnet Dialog mit Filtern. **Step 4: Commit (nach Freigabe)**

```bash
git add "app/(protected)/rallyes/[id]/(tabs)/page.tsx"
git commit -m "Wire questions tab to RallyeQuestionsManager"
```

---

### Task 4: Alte Zuordnungsseite entfernen, Links umbiegen, Redirect

**Files:**
- Delete: `app/(protected)/rallyes/[id]/questions/Assignment.tsx`, `Assignment.test.tsx`, `page.test.tsx` (via `git rm`)
- Modify: `app/(protected)/rallyes/[id]/questions/page.tsx` → wird reiner Redirect
- Modify: `components/RallyeCard.tsx:138` („Fragen zuordnen"-Link → `/rallyes/${rallye.id}`)
- Modify: `components/rallyes/ExplorationRow.tsx:40` (Link → `/rallyes/${rallyeId}`)
- Modify: `components/rallyes/ProgramRallyeDialog.tsx:115` (Link nach Erstellen → `/rallyes/${createdRallyeId}`)
- Modify: `app/(protected)/rallyes/page.test.tsx` (Mock-Link + Assertion `'/rallyes/1/questions'` → `'/rallyes/1'`)
- Modify: `actions/assign_questions_to_rallye.ts:195` (`revalidatePath('/rallyes/${id}/questions')` → `revalidatePath('/rallyes/${id}', 'layout')`)
- Nicht anfassen: `components/RallyeDialog.tsx` (ungenutztes Legacy, wird in Block 5 gelöscht; der Redirect fängt den Link ab), `components/questions/id/QuestionPage.tsx` (Block 6).

- [ ] **Step 1: Redirect-Seite** — kompletter neuer Inhalt von `app/(protected)/rallyes/[id]/questions/page.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

// The assignment UI moved into the rallye detail page (questions tab).
// Keep the old URL working for bookmarks and legacy links.
export default async function LegacyAssignmentRedirect(props: PageProps) {
  const params = await props.params;
  if (!/^\d+$/.test(params.id)) {
    notFound();
  }
  redirect(`/rallyes/${params.id}`);
}
```

- [ ] **Step 2: Alt-Dateien löschen**

```bash
git rm "app/(protected)/rallyes/[id]/questions/Assignment.tsx" "app/(protected)/rallyes/[id]/questions/Assignment.test.tsx" "app/(protected)/rallyes/[id]/questions/page.test.tsx"
```

- [ ] **Step 3: Links umbiegen** — in den drei Komponenten die `href`s ändern (Label „Fragen zuordnen" darf bleiben, Ziel ist jetzt der Fragen-Tab). In `app/(protected)/rallyes/page.test.tsx` den Mock-Link und die Assertion auf `'/rallyes/1'` anpassen. In `actions/assign_questions_to_rallye.ts` den `revalidatePath`-Aufruf im Voll-Sync anpassen.

- [ ] **Step 4: Verwaiste Verwendungen prüfen**

```bash
grep -rn "Assignment" app components --include="*.tsx" | grep -v node_modules
grep -rn "/questions\`" app components --include="*.tsx" | grep -v "questions/\${" | grep -v node_modules
```

Erwartung: keine Treffer auf die gelöschten Dateien; `getQuestionRallyeMap` und `getRallyeMaxPoints` bleiben (werden vom Fragenkatalog bzw. Ergebnisse-Tab genutzt).

- [ ] **Step 5: Alle Checks** → grün. **Step 6: Commit (nach Freigabe)**

```bash
git add -A app components actions
git commit -m "Replace assignment page with questions tab, redirect old URL"
```

---

### Task 5: End-to-End-Verifikation + Build

- [ ] Dev-Server des Nutzers (Port 3000) nutzen, per agent-browser:
  1. `/rallyes/8` (Kennenlerntag): zugeordnete Fragen sichtbar; eine Frage über „+ Fragen hinzufügen" (mit Typ-Filter) hinzufügen → erscheint sofort in der Liste, Punktesumme steigt; Seite neu laden → persistent.
  2. Dieselbe Frage wieder entfernen → verschwindet, Punktesumme sinkt; Reload → persistent (Ausgangszustand wiederhergestellt).
  3. Abstimmungs-Checkbox einer Upload-Frage an- und wieder abschalten; prüfen, dass der Phasen-Button-Kontext im Header konsistent bleibt (Voting-Zähler via `router.refresh()`).
  4. Alte URL `/rallyes/8/questions` aufrufen → Redirect auf `/rallyes/8`.
  5. `/rallyes`: „Fragen zuordnen"-Link der Karte führt zum Fragen-Tab.
  6. Echte Daten am Ende unverändert (nur temporäre Zuordnung, wieder entfernt).
- [ ] `npm run build` → erfolgreich, Route `/rallyes/[id]/questions` erscheint weiterhin (als Redirect).

---

## Nach Block 3

Block 4 (Startseite: Phasen-Gruppierung, Bereichs-Fokus) kann auf die dann schlankere `RallyeCard` aufsetzen. Der „Fragen zuordnen"-Schnellzugriff auf der Karte kann dort ganz entfallen, weil die Detailseite der einzige Einstieg wird.
