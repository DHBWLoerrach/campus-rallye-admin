# Redesign Block 4: Startseite mit Phasen-Gruppierung und Bereichs-Fokus — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Rallye-Übersicht gruppiert nach Phase (● Läuft gerade / ○ In Vorbereitung / ✓ Abgeschlossen), zeigt den eigenen Bereich zuerst und klappt „Andere Bereiche" und „Campus-Touren" ein; die Karten werden zu schlanken Links auf die Detailseite.

**Architecture:** Ein neuer Helper `getRallyePhaseGroup` in `lib/types.ts` mappt die sechs Status auf drei Gruppen (Spec Abschnitt 2: live = running/voting/results, preparation = draft/ready, done = ended). Der Bereichs-Fokus nutzt `getUserContext()` (UUID) + `getLocalUser()` (SQLite, `department_id` aus Block 1) — kein neues Rechtemodell, nur Sortierung/Sichtbarkeit. `RallyeCard` wird zur Server-Komponente ohne Client-Fallback-Fetch und ohne Icon-Link-Sammlung: die ganze Karte ist ein Link auf `/rallyes/[id]`. Eingeklappte Sektionen als natives `<details>`/`<summary>` (server-renderbar, kein JS nötig).

**Tech Stack:** Next.js 16 App Router (Server Components), better-sqlite3 (`lib/db/local-user.ts`), Vitest + RTL.

## Global Constraints

- Nach jedem Task: `npm run lint`, `npm run check:format`, `npx tsc --noEmit`, `npm test` — alle grün, sonst kein Commit (AGENTS.md Hard Rule).
- Commits nur nach Nutzer-Freigabe (Block-weises OK).
- Code-Kommentare Englisch, UI-Texte Deutsch, Prettier-Stil, Pfad-Aliasse `@/…`.
- Nutzer ohne Bereichszuordnung sehen alle Rallyes gleichrangig in den Phasen-Gruppen (Spec Abschnitt 2).
- „Duplizieren" auf abgeschlossenen Karten und der geführte Erstell-Flow kommen erst in Block 5 — hier bleibt `ProgramRallyeDialog` der Erstell-Einstieg (wandert in den Seiten-Header als „+ Neue Rallye"-Position).

---

### Task 1: Phasen-Gruppen-Helper in `lib/types.ts`

**Files:**
- Modify: `lib/types.ts` (nach `getNextRallyeTransition` einfügen)
- Modify: `lib/types.test.ts` (neuer describe-Block)

**Interfaces:**
- Produces:
  ```ts
  type RallyePhaseGroup = 'live' | 'preparation' | 'done';
  const RALLYE_PHASE_GROUPS: { id: RallyePhaseGroup; label: string }[]; // Reihenfolge: live, preparation, done
  getRallyePhaseGroup(status: RallyeStatus): RallyePhaseGroup;
  ```

- [ ] **Step 1: Failing Tests** in `lib/types.test.ts` (Import um `getRallyePhaseGroup`, `RALLYE_PHASE_GROUPS` erweitern):

```ts
describe('getRallyePhaseGroup', () => {
  it.each([
    ['running', 'live'],
    ['voting', 'live'],
    ['results', 'live'],
    ['draft', 'preparation'],
    ['ready', 'preparation'],
    ['ended', 'done'],
  ] as const)('maps %s to %s', (status, group) => {
    expect(getRallyePhaseGroup(status)).toBe(group);
  });

  it('orders groups live, preparation, done with German labels', () => {
    expect(RALLYE_PHASE_GROUPS.map((g) => g.id)).toEqual([
      'live',
      'preparation',
      'done',
    ]);
    expect(RALLYE_PHASE_GROUPS.map((g) => g.label)).toEqual([
      'Läuft gerade',
      'In Vorbereitung',
      'Abgeschlossen',
    ]);
  });
});
```

- [ ] **Step 2: Rot verifizieren** — `npx vitest run lib/types.test.ts` → FAIL.

- [ ] **Step 3: Implementierung** in `lib/types.ts`:

```ts
// Home-page grouping: three user-facing phase buckets (spec section 2).
export type RallyePhaseGroup = 'live' | 'preparation' | 'done';

export const RALLYE_PHASE_GROUPS: {
  id: RallyePhaseGroup;
  label: string;
}[] = [
  { id: 'live', label: 'Läuft gerade' },
  { id: 'preparation', label: 'In Vorbereitung' },
  { id: 'done', label: 'Abgeschlossen' },
];

export const getRallyePhaseGroup = (
  status: RallyeStatus
): RallyePhaseGroup => {
  switch (status) {
    case 'ended':
      return 'done';
    case 'draft':
    case 'ready':
      return 'preparation';
    default:
      return 'live';
  }
};
```

- [ ] **Step 4: Alle Checks** → grün. **Step 5: Commit (nach Freigabe)**

```bash
git add lib/types.ts lib/types.test.ts
git commit -m "Add rallye phase group helper for home page grouping"
```

---

### Task 2: `RallyeCard` verschlanken (Server-Komponente, Karte = Link)

**Files:**
- Modify: `components/RallyeCard.tsx` (kompletter Ersatz, siehe unten)
- Modify: `components/RallyeCard.test.tsx` (kompletter Ersatz)

**Interfaces:**
- Produces: `RallyeCard({ rallye: Rallye; questionCount: number; contextLabel?: string })` — Server-Komponente; gesamte Karte ist ein `Link` auf `/rallyes/${rallye.id}`. Entfallen: `onEdit`-Reste, `uploadQuestionCount`, `typeLabel`, Icon-Links (Fragen zuordnen / Upload-Fotos / Endstand), Stift-Button, Client-Fallback-Fetch (`useEffect`/`getRallyeQuestions`).
- Consumes: `getRallyeStatusLabel`, `isRallyeActive` aus `@/lib/types`; `FormattedEndTime`.

- [ ] **Step 1: Test-Datei ersetzen** — kompletter neuer Inhalt von `components/RallyeCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RallyeCard from './RallyeCard';

const baseRallye = {
  id: 12,
  name: 'Studieninfotag',
  status: 'running' as const,
  end_time: '2026-05-16T13:15:00.000Z',
  password: '',
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('RallyeCard', () => {
  it('links the whole card to the detail page', () => {
    render(<RallyeCard rallye={baseRallye} questionCount={3} />);
    expect(
      screen.getByRole('link', { name: /Studieninfotag/ })
    ).toHaveAttribute('href', '/rallyes/12');
  });

  it('shows phase label, question count and context label', () => {
    render(
      <RallyeCard
        rallye={baseRallye}
        questionCount={3}
        contextLabel="Bereich: HoKo/Marketing"
      />
    );
    expect(screen.getByText('Läuft')).toBeInTheDocument();
    expect(screen.getByText('3 Fragen')).toBeInTheDocument();
    expect(screen.getByText('Bereich: HoKo/Marketing')).toBeInTheDocument();
  });

  it('shows a hint when no questions are assigned', () => {
    render(<RallyeCard rallye={baseRallye} questionCount={0} />);
    expect(screen.getByText('Keine Fragen')).toBeInTheDocument();
  });

  it('renders no action links inside the card', () => {
    render(<RallyeCard rallye={baseRallye} questionCount={3} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(
      screen.queryByRole('link', { name: 'Fragen zuordnen' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Einstellungen' })
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rot verifizieren** — `npx vitest run components/RallyeCard.test.tsx` → FAIL.

- [ ] **Step 3: Komponente ersetzen** — kompletter neuer Inhalt von `components/RallyeCard.tsx`:

```tsx
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FormattedEndTime from '@/components/FormattedEndTime';
import { Rallye, getRallyeStatusLabel, isRallyeActive } from '@/lib/types';

interface RallyeCardProps {
  rallye: Rallye;
  questionCount: number;
  contextLabel?: string;
}

export default function RallyeCard({
  rallye,
  questionCount,
  contextLabel,
}: RallyeCardProps) {
  const statusLabel = getRallyeStatusLabel(rallye.status);
  const isActive = isRallyeActive(rallye.status);
  const questionLabel =
    questionCount === 0
      ? 'Keine Fragen'
      : `${questionCount} ${questionCount === 1 ? 'Frage' : 'Fragen'}`;

  return (
    <Link
      href={`/rallyes/${rallye.id}`}
      className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
      aria-label={`Rallye ${rallye.name} öffnen`}
    >
      <Card className="relative h-full w-full overflow-hidden border-border/60 bg-card/90 transition-all group-hover:-translate-y-0.5 group-hover:shadow-[0_2px_0_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.12)]">
        <div
          className="absolute inset-x-0 top-0 h-1 bg-primary/80"
          aria-hidden="true"
        />
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-semibold leading-tight">
              {rallye.name}
            </CardTitle>
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {statusLabel}
            </Badge>
          </div>
          {contextLabel && (
            <p className="text-xs text-muted-foreground">{contextLabel}</p>
          )}
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm">
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Ende
            </span>
            <span className="font-medium text-foreground">
              <FormattedEndTime value={rallye.end_time} />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{questionLabel}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
```

Hinweis: `FormattedEndTime` prüfen — falls sie `'use client'` ist, ist das Rendern innerhalb einer Server-Komponente trotzdem korrekt (Client-Insel).

- [ ] **Step 4: Grün + alle Checks** — Achtung: `app/(protected)/rallyes/page.tsx` übergibt noch `uploadQuestionCount`/`typeLabel` → tsc-Fehler ist hier erwartet und wird in Task 3 behoben. Für diesen Task deshalb: Props-Übergabe in `page.tsx` minimal anpassen (die zwei Props entfernen), damit alles grün ist. `page.test.tsx`-Mock ggf. mit anpassen (nur Props, Struktur bleibt bis Task 3).

- [ ] **Step 5: Commit (nach Freigabe)**

```bash
git add components/RallyeCard.tsx components/RallyeCard.test.tsx "app/(protected)/rallyes/page.tsx" "app/(protected)/rallyes/page.test.tsx"
git commit -m "Slim RallyeCard to a server-rendered link card"
```

---

### Task 3: Startseite umbauen (Phasen-Gruppen, Bereichs-Fokus, eingeklappte Sektionen)

**Files:**
- Modify: `app/(protected)/rallyes/page.tsx` (kompletter Ersatz)
- Modify: `app/(protected)/rallyes/page.test.tsx` (kompletter Ersatz)
- Modify: `components/rallyes/ExplorationRow.tsx` (Linktext „Fragen zuordnen" → „Öffnen", aria-label anpassen)

**Interfaces:**
- Consumes: `getRallyePhaseGroup`/`RALLYE_PHASE_GROUPS` (Task 1), `RallyeCard` (Task 2), `getUserContext` aus `@/lib/user-context`, `getLocalUser` aus `@/lib/db/local-user`, `ExplorationRow`, `ProgramRallyeDialog`.

- [ ] **Step 1: Test-Datei ersetzen** — kompletter neuer Inhalt von `app/(protected)/rallyes/page.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './page';

const { mockCreateClient, mockGetUserContext, mockGetLocalUser } = vi.hoisted(
  () => ({
    mockCreateClient: vi.fn(),
    mockGetUserContext: vi.fn(),
    mockGetLocalUser: vi.fn(),
  })
);

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('@/lib/user-context', () => ({
  getUserContext: mockGetUserContext,
}));

vi.mock('@/lib/db/local-user', () => ({
  getLocalUser: mockGetLocalUser,
}));

vi.mock('@/components/rallyes/ProgramRallyeDialog', () => ({
  __esModule: true,
  default: () => <button type="button">Rallye erstellen</button>,
}));

vi.mock('@/components/RallyeCard', () => ({
  __esModule: true,
  default: ({
    rallye,
    contextLabel,
  }: {
    rallye: { id: number; name: string };
    contextLabel?: string;
  }) => (
    <article data-testid="rallye-card">
      <a href={`/rallyes/${rallye.id}`}>{rallye.name}</a>
      {contextLabel && <p>{contextLabel}</p>}
    </article>
  ),
}));

type SupabaseFixture = {
  rallyes: Array<Record<string, unknown>>;
  locations: Array<Record<string, unknown>>;
  departments: Array<Record<string, unknown>>;
  questionAssignments: Array<Record<string, unknown>>;
};

const makeRallye = (
  id: number,
  name: string,
  status: string,
  departmentId: number | null
) => ({
  id,
  name,
  status,
  end_time: '2026-01-01T00:00:00.000Z',
  password: '',
  created_at: '2026-01-01T00:00:00.000Z',
  department_id: departmentId,
});

function buildDefaultFixture(): SupabaseFixture {
  return {
    rallyes: [
      makeRallye(1, 'Campus Tour A', 'ready', 101),
      makeRallye(2, 'Marketing läuft', 'running', 100),
      makeRallye(3, 'Marketing Entwurf', 'draft', 100),
      makeRallye(4, 'Marketing fertig', 'ended', 100),
      makeRallye(5, 'Informatik 1', 'running', 101),
    ],
    locations: [{ id: 10, name: 'Loc A', default_rallye_id: 1 }],
    departments: [
      { id: 100, name: 'HoKo/Marketing', location_id: 10 },
      { id: 101, name: 'Informatik', location_id: 10 },
    ],
    questionAssignments: [
      { rallye_id: 2, question_id: 1 },
      { rallye_id: 5, question_id: 2 },
    ],
  };
}

function createSupabaseMock(fixtureOverrides?: Partial<SupabaseFixture>) {
  const fixture = { ...buildDefaultFixture(), ...fixtureOverrides };
  const byTable: Record<string, { select: (columns: string) => unknown }> = {
    rallye: {
      select: () => ({
        order: async () => ({ data: fixture.rallyes, error: null }),
      }),
    },
    location: {
      select: async () => ({ data: fixture.locations, error: null }),
    },
    department: {
      select: () => ({
        order: async () => ({ data: fixture.departments, error: null }),
      }),
    },
    join_rallye_questions: {
      select: () => ({
        in: async () => ({ data: fixture.questionAssignments, error: null }),
      }),
    },
  };
  return {
    from: (table: string) => byTable[table] as unknown as Record<string, unknown>,
  };
}

describe('/rallyes page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockResolvedValue(createSupabaseMock());
    mockGetUserContext.mockResolvedValue({
      uuid: 'user-1',
      email: 'a@b.de',
      roles: ['staff'],
    });
    mockGetLocalUser.mockReturnValue({
      user_id: 'user-1',
      email: 'a@b.de',
      registered_at: '2026-01-01',
      admin: false,
      department_id: 100,
    });
  });

  it('groups own department rallyes by phase', async () => {
    render(await Home());

    const live = screen
      .getByRole('heading', { name: '● Läuft gerade' })
      .closest('section') as HTMLElement;
    const preparation = screen
      .getByRole('heading', { name: '○ In Vorbereitung' })
      .closest('section') as HTMLElement;
    const done = screen
      .getByRole('heading', { name: '✓ Abgeschlossen' })
      .closest('section') as HTMLElement;

    expect(within(live).getByText('Marketing läuft')).toBeInTheDocument();
    expect(
      within(preparation).getByText('Marketing Entwurf')
    ).toBeInTheDocument();
    expect(within(done).getByText('Marketing fertig')).toBeInTheDocument();
  });

  it('shows the own department name in the header', async () => {
    render(await Home());
    expect(screen.getByText(/HoKo\/Marketing/)).toBeInTheDocument();
  });

  it('collapses other departments and campus tours', async () => {
    render(await Home());

    const others = screen
      .getByText(/Andere Bereiche/)
      .closest('details') as HTMLElement;
    expect(others).not.toHaveAttribute('open');
    expect(within(others).getByText('Informatik 1')).toBeInTheDocument();

    const tours = screen
      .getByText(/Campus-Touren/)
      .closest('details') as HTMLElement;
    expect(within(tours).getByText('Campus Tour A')).toBeInTheDocument();
  });

  it('shows all rallyes in phase groups when the user has no department', async () => {
    mockGetLocalUser.mockReturnValue({
      user_id: 'user-1',
      email: 'a@b.de',
      registered_at: '2026-01-01',
      admin: false,
      department_id: null,
    });

    render(await Home());

    const live = screen
      .getByRole('heading', { name: '● Läuft gerade' })
      .closest('section') as HTMLElement;
    expect(within(live).getByText('Marketing läuft')).toBeInTheDocument();
    expect(within(live).getByText('Informatik 1')).toBeInTheDocument();
    expect(screen.queryByText(/Andere Bereiche/)).not.toBeInTheDocument();
  });

  it('renders the create button in the page header', async () => {
    render(await Home());
    expect(
      screen.getByRole('button', { name: 'Rallye erstellen' })
    ).toBeInTheDocument();
  });

  it('hides empty phase groups', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rallyes: [makeRallye(2, 'Marketing läuft', 'running', 100)],
        questionAssignments: [],
      })
    );

    render(await Home());

    expect(
      screen.getByRole('heading', { name: '● Läuft gerade' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '✓ Abgeschlossen' })
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rot verifizieren** — `npx vitest run "app/(protected)/rallyes/page.test.tsx"` → FAIL.

- [ ] **Step 3: Seite ersetzen** — kompletter neuer Inhalt von `app/(protected)/rallyes/page.tsx`:

```tsx
import createClient from '@/lib/supabase';
import RallyeCard from '@/components/RallyeCard';
import ExplorationRow from '@/components/rallyes/ExplorationRow';
import ProgramRallyeDialog from '@/components/rallyes/ProgramRallyeDialog';
import { getUserContext } from '@/lib/user-context';
import { getLocalUser } from '@/lib/db/local-user';
import {
  RALLYE_PHASE_GROUPS,
  getRallyePhaseGroup,
  type RallyePhaseGroup,
} from '@/lib/types';
import type { DepartmentOption, Rallye } from '@/lib/types';

type RallyeRow = Rallye & { department_id: number | null };

type DepartmentRow = {
  id: number;
  name: string;
  location_id: number;
};

type LocationRow = {
  id: number;
  name: string;
  default_rallye_id: number | null;
};

const PHASE_SYMBOLS: Record<RallyePhaseGroup, string> = {
  live: '●',
  preparation: '○',
  done: '✓',
};

// Live and draft rallyes: nearest end first; finished: latest end first.
const sortForGroup = (group: RallyePhaseGroup, rallyes: RallyeRow[]) =>
  [...rallyes].sort((a, b) => {
    const diff =
      new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
    return group === 'done' ? -diff : diff;
  });

async function getUserDepartmentId(): Promise<number | null> {
  try {
    const { uuid } = await getUserContext();
    return getLocalUser(uuid)?.department_id ?? null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const supabase = await createClient();
  const userDepartmentId = await getUserDepartmentId();

  const { data: rallyes } = await supabase
    .from('rallye')
    .select('id, name, status, end_time, password, created_at, department_id')
    .order('name');
  const typedRallyes = (rallyes || []) as RallyeRow[];

  const { data: locations } = await supabase
    .from('location')
    .select('id, name, default_rallye_id');
  const typedLocations = (locations || []) as LocationRow[];

  const { data: departmentRows } = await supabase
    .from('department')
    .select('id, name, location_id')
    .order('name');
  const typedDepartmentRows = (departmentRows || []) as DepartmentRow[];
  const departmentOptions: DepartmentOption[] = typedDepartmentRows.map(
    ({ id, name }) => ({ id, name })
  );
  const departmentById = new Map(
    typedDepartmentRows.map((department) => [department.id, department])
  );

  const questionCounts = new Map<number, number>();
  if (typedRallyes.length > 0) {
    const { data: joins } = await supabase
      .from('join_rallye_questions')
      .select('rallye_id, question_id')
      .in(
        'rallye_id',
        typedRallyes.map((r) => r.id)
      );
    joins?.forEach((row) => {
      questionCounts.set(
        row.rallye_id,
        (questionCounts.get(row.rallye_id) ?? 0) + 1
      );
    });
  }

  const explorationRallyeIds = new Set(
    typedLocations
      .map((location) => location.default_rallye_id)
      .filter((id): id is number => id !== null)
  );

  const explorationRallyes = typedRallyes.filter((rallye) =>
    explorationRallyeIds.has(rallye.id)
  );
  const teamRallyes = typedRallyes.filter(
    (rallye) => !explorationRallyeIds.has(rallye.id)
  );

  const myRallyes =
    userDepartmentId === null
      ? teamRallyes
      : teamRallyes.filter(
          (rallye) => rallye.department_id === userDepartmentId
        );
  const otherRallyes =
    userDepartmentId === null
      ? []
      : teamRallyes.filter(
          (rallye) => rallye.department_id !== userDepartmentId
        );

  const myGroups = RALLYE_PHASE_GROUPS.map((group) => ({
    ...group,
    rallyes: sortForGroup(
      group.id,
      myRallyes.filter(
        (rallye) => getRallyePhaseGroup(rallye.status) === group.id
      )
    ),
  })).filter((group) => group.rallyes.length > 0);

  const othersByDepartment = new Map<string, RallyeRow[]>();
  for (const rallye of otherRallyes) {
    const name = rallye.department_id
      ? (departmentById.get(rallye.department_id)?.name ?? 'Ohne Bereich')
      : 'Ohne Bereich';
    othersByDepartment.set(name, [
      ...(othersByDepartment.get(name) ?? []),
      rallye,
    ]);
  }
  const sortedOtherGroups = Array.from(othersByDepartment.entries()).sort(
    ([a], [b]) => a.localeCompare(b, 'de', { sensitivity: 'base' })
  );

  const contextLabel = (rallye: RallyeRow) =>
    rallye.department_id
      ? `Bereich: ${departmentById.get(rallye.department_id)?.name ?? 'Unbekannt'}`
      : undefined;

  const userDepartmentName = userDepartmentId
    ? (departmentById.get(userDepartmentId)?.name ?? null)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-350 flex-col gap-6 px-4 py-6">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Rallyes
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            {userDepartmentName ? 'Meine Rallyes' : 'Rallyes verwalten'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {userDepartmentName
              ? `Bereich: ${userDepartmentName}`
              : 'Alle Rallyes, gruppiert nach Phase.'}
          </p>
        </div>
        <ProgramRallyeDialog
          buttonStyle="w-full sm:w-auto cursor-pointer"
          departments={departmentOptions}
        />
      </section>

      {myGroups.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Noch keine Rallyes. Erstelle die erste über „Rallye erstellen".
        </section>
      ) : (
        myGroups.map((group) => (
          <section
            key={group.id}
            className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4"
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {`${PHASE_SYMBOLS[group.id]} ${group.label}`}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {group.rallyes.map((rallye) => (
                <RallyeCard
                  key={rallye.id}
                  rallye={rallye}
                  questionCount={questionCounts.get(rallye.id) ?? 0}
                  contextLabel={
                    userDepartmentId === null ? contextLabel(rallye) : undefined
                  }
                />
              ))}
            </div>
          </section>
        ))
      )}

      {sortedOtherGroups.length > 0 && (
        <details className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
            Andere Bereiche ({otherRallyes.length})
          </summary>
          <div className="mt-4 space-y-4">
            {sortedOtherGroups.map(([groupLabel, groupRallyes]) => (
              <div key={groupLabel} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {groupLabel}
                </h3>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {groupRallyes.map((rallye) => (
                    <RallyeCard
                      key={rallye.id}
                      rallye={rallye}
                      questionCount={questionCounts.get(rallye.id) ?? 0}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {explorationRallyes.length > 0 && (
        <details className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
            Campus-Touren (Erkundungsmodus)
          </summary>
          <div className="mt-4 space-y-2">
            {explorationRallyes.map((rallye) => (
              <ExplorationRow
                key={rallye.id}
                rallyeId={rallye.id}
                name={rallye.name}
                questionCount={questionCounts.get(rallye.id)}
              />
            ))}
          </div>
        </details>
      )}
    </main>
  );
}
```

- [ ] **Step 4: `ExplorationRow`-Linktext anpassen** — in `components/rallyes/ExplorationRow.tsx` den Link-Inhalt und das `aria-label` von „Fragen zuordnen" auf „Öffnen" ändern (Ziel ist seit Block 3 die Detailseite, nicht mehr die Zuordnung).

- [ ] **Step 5: Grün verifizieren + alle Checks.** Danach Smoke-Test am Dev-Server: `/rallyes` zeigt Phasen-Gruppen; mit zugeordnetem Bereich (unter `/users` setzen) erscheinen „Meine Rallyes" + eingeklappte „Andere Bereiche".

- [ ] **Step 6: Commit (nach Freigabe)**

```bash
git add "app/(protected)/rallyes/page.tsx" "app/(protected)/rallyes/page.test.tsx" components/rallyes/ExplorationRow.tsx
git commit -m "Group home page by phase with own-department focus"
```

---

### Task 4: End-to-End-Verifikation + Build

- [ ] Dev-Server des Nutzers (Port 3000), per agent-browser:
  1. `/users`: Mock-Admin `dev@example.test` einem Bereich zuordnen (z. B. SZI).
  2. `/rallyes`: Header zeigt „Meine Rallyes · Bereich: …"; SZI-Rallyes in Phasen-Gruppen (● Läuft gerade zuerst); „Andere Bereiche (N)" und „Campus-Touren" eingeklappt, per Klick aufklappbar; Karten-Klick öffnet die Detailseite.
  3. Bereichszuordnung wieder auf „Kein Bereich" → alle Rallyes gleichrangig in Phasen-Gruppen, keine „Andere Bereiche"-Sektion.
  4. Zustand am Ende wiederherstellen (Zuordnung wie vorgefunden).
- [ ] `npm run build` → erfolgreich.

---

## Nach Block 4

Block 5 (geführter Erstell-Flow + Duplizieren) ergänzt den „Duplizieren"-Button auf ✓-Karten und ersetzt `ProgramRallyeDialog`/`RallyeDialog`.
