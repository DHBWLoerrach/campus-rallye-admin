# Redesign Block 2: Rallye-Detailseite — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Rallye-Detailseite als zentrale Arbeitsfläche: Header mit Phasen-Anzeige und geführtem Übergangs-Button, Tabs für Fragen / Einstellungen / Ergebnisse / Fotos; ersetzt das Inline-Edit in der Karte.

**Architecture:** Next.js Route Group `app/(protected)/rallyes/[id]/(tabs)/` mit gemeinsamem `layout.tsx` (Server Component: lädt Rallye, Bereich, Voting-Zähler; rendert Header + Tab-Navigation). Die bestehenden Seiten `results` und `uploads` ziehen in die Gruppe um (URLs bleiben identisch), `questions` (Zuordnung, 799-Zeilen-`Assignment.tsx`) bleibt bewusst außerhalb — sie wird in Block 3 ersetzt. Statuswechsel laufen über eine neue Server-Action `advanceRallyeStatus`, die serverseitig gegen `getNextRallyeTransition` (Block 1) validiert.

**Tech Stack:** Next.js 16 App Router (params ist ein Promise — bei Unsicherheit `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md` lesen), Supabase-JS, Vitest + RTL, shadcn/ui.

## Global Constraints

- Nach jedem Task: `npm run lint`, `npm run check:format`, `npx tsc --noEmit`, `npm test` — alle grün, sonst kein Commit (AGENTS.md Hard Rule).
- Commits gemäß der mit dem Nutzer vereinbarten Freigabe (Block-weise OK oder pro Task — aktuell gilt das zuletzt erteilte Block-OK nur für Block 1; **vor dem ersten Commit von Block 2 OK einholen**).
- Code-Kommentare Englisch, UI-Texte Deutsch, Prettier-Stil, Pfad-Aliasse `@/…`.
- URLs `/rallyes/[id]/results` und `/rallyes/[id]/uploads` dürfen sich nicht ändern (Route Group ist URL-neutral).

---

### Task 1: Server-Action `advanceRallyeStatus`

Geführter Statuswechsel mit serverseitiger Validierung: Nur der von `getNextRallyeTransition` erlaubte Zielstatus wird akzeptiert (freie Wechsel bleiben über `updateRallye` als Experten-Override möglich).

**Files:**
- Modify: `actions/rallye.ts` (neue Funktion ans Dateiende; Import von `getNextRallyeTransition` ergänzen)
- Modify: `actions/rallye.test.ts` (neuer describe-Block; Mock-Muster der Datei wiederverwenden)

**Interfaces:**
- Consumes: `getNextRallyeTransition(status, hasVotingQuestions)` aus `@/lib/types` (Block 1).
- Produces: `advanceRallyeStatus(rallyeId: number, target: RallyeStatus): Promise<ActionResult<{ message: string }>>`.

- [ ] **Step 1: Failing Tests** — in `actions/rallye.test.ts` (bestehende `vi.hoisted`-Mocks für require-profile/supabase/next-cache wiederverwenden; ggf. Namen an die Datei anpassen — vorher lesen):

```ts
describe('advanceRallyeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // Supabase mock covering: select rallye status, count voting questions, update
  const makeSupabase = (
    status: string | null,
    votingCount: number,
    updateError: unknown = null
  ) => {
    const updateEq = vi.fn().mockResolvedValue({ error: updateError });
    const update = vi.fn(() => ({ eq: updateEq }));
    const from = vi.fn((table: string) => {
      if (table === 'rallye') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: status === null ? null : { id: 5, status },
                error: null,
              }),
            })),
          })),
          update,
        };
      }
      // join_rallye_questions voting count
      const countEq2 = vi
        .fn()
        .mockResolvedValue({ count: votingCount, error: null });
      const countEq1 = vi.fn(() => ({ eq: countEq2 }));
      return { select: vi.fn(() => ({ eq: countEq1 })) };
    });
    return { from, update, updateEq };
  };

  it('advances inactive to running', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase('inactive', 0);
    mockCreateClient.mockResolvedValue(supabase);

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(5, 'running');

    expect(result.success).toBe(true);
    expect(supabase.update).toHaveBeenCalledWith({ status: 'running' });
  });

  it('rejects a target that does not match the guided transition', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase('inactive', 0));

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(5, 'ended');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Ungültiger Statuswechsel');
  });

  it('goes running→voting only when voting questions exist', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase('running', 2));

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(5, 'voting');
    expect(result.success).toBe(true);
  });

  it('goes running→ranking when no voting questions exist', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase('running', 0));

    const { advanceRallyeStatus } = await import('./rallye');
    expect((await advanceRallyeStatus(5, 'voting')).success).toBe(false);
    vi.resetModules();
    mockCreateClient.mockResolvedValue(makeSupabase('running', 0));
    const { advanceRallyeStatus: advance2 } = await import('./rallye');
    expect((await advance2(5, 'ranking')).success).toBe(true);
  });

  it('fails for unknown rallye', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase(null, 0));

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(999, 'running');
    expect(result.success).toBe(false);
  });

  it('rejects an invalid id without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(-1, 'running');
    expect(result.success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rot verifizieren** — `npx vitest run actions/rallye.test.ts` → FAIL (`advanceRallyeStatus` existiert nicht).

- [ ] **Step 3: Implementierung** in `actions/rallye.ts` (Import ergänzen: `getNextRallyeTransition` aus `@/lib/types`; für die ID-Validierung `idSchema` aus `@/lib/validation` verwenden, wie in `actions/assign_questions_to_rallye.ts` — Importnamen dort nachschlagen):

```ts
export async function advanceRallyeStatus(
  rallyeId: number,
  target: RallyeStatus
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();

  const idResult = idSchema.safeParse(rallyeId);
  if (!idResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(idResult.error));
  }

  const supabase = await createClient();

  const { data: rallye, error: rallyeError } = await supabase
    .from('rallye')
    .select('id, status')
    .eq('id', idResult.data)
    .maybeSingle();

  if (rallyeError) {
    console.error('Error loading rallye:', rallyeError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!rallye) {
    return fail('Rallye nicht gefunden');
  }

  const { count: votingCount, error: votingError } = await supabase
    .from('join_rallye_questions')
    .select('question_id', { count: 'exact', head: true })
    .eq('rallye_id', idResult.data)
    .eq('is_voting', true);

  if (votingError) {
    console.error('Error counting voting questions:', votingError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  // Server-side guard: only the transition derived from the current status
  // is allowed here; free status changes remain in updateRallye (expert mode).
  const expected = getNextRallyeTransition(
    rallye.status as RallyeStatus,
    (votingCount ?? 0) > 0
  );

  if (!expected || expected.target !== target) {
    return fail('Ungültiger Statuswechsel');
  }

  const { error } = await supabase
    .from('rallye')
    .update({ status: target })
    .eq('id', idResult.data);

  if (error) {
    console.error('Error advancing rallye status:', error);
    return fail('Es ist ein Fehler aufgetreten');
  }

  revalidatePath('/rallyes');
  revalidatePath(`/rallyes/${idResult.data}`, 'layout');
  return ok({ message: 'Status erfolgreich geändert' });
}
```

- [ ] **Step 4: Alle Checks** — `npm run lint && npm run check:format && npx tsc --noEmit && npm test` → grün.

- [ ] **Step 5: Commit (Freigabe beachten)**

```bash
git add actions/rallye.ts actions/rallye.test.ts
git commit -m "Add advanceRallyeStatus action with guided transition guard"
```

---

### Task 2: Route-Gruppe `(tabs)` mit Layout, Tab-Navigation und Umzug von results/uploads

**Files:**
- Create: `app/(protected)/rallyes/[id]/(tabs)/layout.tsx`
- Create: `components/rallyes/RallyeTabsNav.tsx`
- Create: `components/rallyes/RallyeTabsNav.test.tsx`
- Move: `app/(protected)/rallyes/[id]/results/page.tsx` → `app/(protected)/rallyes/[id]/(tabs)/results/page.tsx` (via `git mv`, dann Header entschlacken)
- Move: `app/(protected)/rallyes/[id]/uploads/page.tsx` → `app/(protected)/rallyes/[id]/(tabs)/uploads/page.tsx` (via `git mv`, dann Header entschlacken)

**Interfaces:**
- Produces: `RallyeTabsNav({ rallyeId }: { rallyeId: number })` — Client-Komponente, markiert den aktiven Tab per `usePathname()`. Tabs: `/rallyes/[id]` „Fragen", `/rallyes/[id]/settings` „Einstellungen", `/rallyes/[id]/results` „Ergebnisse", `/rallyes/[id]/uploads` „Fotos".
- Consumes: `getRallyeStatusLabel`, `RALLYE_STATUSES`, `RallyeStatus` aus `@/lib/types`; `RallyePhaseControls` folgt in Task 3 (im Layout zunächst nur Status-Badge, Platzhalter-Kommentar vermeiden — Task 3 fügt die Controls ein).

- [ ] **Step 1: Failing Test für RallyeTabsNav** — `components/rallyes/RallyeTabsNav.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RallyeTabsNav from './RallyeTabsNav';

const { mockUsePathname } = vi.hoisted(() => ({ mockUsePathname: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: mockUsePathname }));

describe('RallyeTabsNav', () => {
  it('renders all four tabs with correct hrefs', () => {
    mockUsePathname.mockReturnValue('/rallyes/5');
    render(<RallyeTabsNav rallyeId={5} />);
    expect(screen.getByRole('link', { name: 'Fragen' })).toHaveAttribute(
      'href',
      '/rallyes/5'
    );
    expect(screen.getByRole('link', { name: 'Einstellungen' })).toHaveAttribute(
      'href',
      '/rallyes/5/settings'
    );
    expect(screen.getByRole('link', { name: 'Ergebnisse' })).toHaveAttribute(
      'href',
      '/rallyes/5/results'
    );
    expect(screen.getByRole('link', { name: 'Fotos' })).toHaveAttribute(
      'href',
      '/rallyes/5/uploads'
    );
  });

  it('marks the active tab via aria-current', () => {
    mockUsePathname.mockReturnValue('/rallyes/5/results');
    render(<RallyeTabsNav rallyeId={5} />);
    expect(screen.getByRole('link', { name: 'Ergebnisse' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Fragen' })).not.toHaveAttribute(
      'aria-current'
    );
  });
});
```

- [ ] **Step 2: Rot verifizieren** — `npx vitest run components/rallyes/RallyeTabsNav.test.tsx` → FAIL.

- [ ] **Step 3: `components/rallyes/RallyeTabsNav.tsx` implementieren**:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface RallyeTabsNavProps {
  rallyeId: number;
}

export default function RallyeTabsNav({ rallyeId }: RallyeTabsNavProps) {
  const pathname = usePathname();
  const base = `/rallyes/${rallyeId}`;
  const tabs = [
    { href: base, label: 'Fragen', exact: true },
    { href: `${base}/settings`, label: 'Einstellungen', exact: false },
    { href: `${base}/results`, label: 'Ergebnisse', exact: false },
    { href: `${base}/uploads`, label: 'Fotos', exact: false },
  ];

  return (
    <nav
      aria-label="Rallye-Bereiche"
      className="flex flex-wrap gap-1 border-b border-border/60"
    >
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
              isActive
                ? 'border-dhbw text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Layout anlegen** — `app/(protected)/rallyes/[id]/(tabs)/layout.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import createClient from '@/lib/supabase';
import RallyeTabsNav from '@/components/rallyes/RallyeTabsNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RALLYE_STATUSES,
  getRallyeStatusLabel,
  isRallyeActive,
  type RallyeStatus,
} from '@/lib/types';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function RallyeDetailLayout({
  children,
  params,
}: LayoutProps) {
  const { id: idStr } = await params;
  if (!/^\d+$/.test(idStr)) {
    notFound();
  }
  const rallyeId = Number(idStr);

  const supabase = await createClient();
  const { data: rallye, error } = await supabase
    .from('rallye')
    .select('id, name, status, department_id')
    .eq('id', rallyeId)
    .maybeSingle();
  if (error || !rallye) {
    notFound();
  }
  const status = rallye.status as RallyeStatus;

  let departmentName: string | null = null;
  if (rallye.department_id) {
    const { data: department } = await supabase
      .from('department')
      .select('name')
      .eq('id', rallye.department_id)
      .maybeSingle();
    departmentName = department?.name ?? null;
  }

  const currentIndex = RALLYE_STATUSES.indexOf(status);

  return (
    <main className="mx-auto flex w-full max-w-350 flex-col gap-4 px-4 py-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/rallyes">← Zurück zu Rallyes</Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Rallye
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              {rallye.name}
            </h1>
            {departmentName && (
              <p className="text-sm text-muted-foreground">
                Bereich: {departmentName}
              </p>
            )}
          </div>
          <Badge variant={isRallyeActive(status) ? 'default' : 'secondary'}>
            {getRallyeStatusLabel(status)}
          </Badge>
        </div>
        <ol
          aria-label="Phasen der Rallye"
          className="flex flex-wrap items-center gap-1 text-xs"
        >
          {RALLYE_STATUSES.map((phase, index) => (
            <li key={phase} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="text-muted-foreground/60">
                  →
                </span>
              )}
              <span
                aria-current={phase === status ? 'step' : undefined}
                className={
                  index < currentIndex
                    ? 'text-muted-foreground line-through decoration-muted-foreground/40'
                    : phase === status
                      ? 'rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary'
                      : 'text-muted-foreground'
                }
              >
                {getRallyeStatusLabel(phase)}
              </span>
            </li>
          ))}
        </ol>
        <RallyeTabsNav rallyeId={rallyeId} />
      </section>
      {children}
    </main>
  );
}
```

- [ ] **Step 5: results/uploads umziehen und entschlacken**

```bash
mkdir -p "app/(protected)/rallyes/[id]/(tabs)/results" "app/(protected)/rallyes/[id]/(tabs)/uploads"
git mv "app/(protected)/rallyes/[id]/results/page.tsx" "app/(protected)/rallyes/[id]/(tabs)/results/page.tsx"
git mv "app/(protected)/rallyes/[id]/uploads/page.tsx" "app/(protected)/rallyes/[id]/(tabs)/uploads/page.tsx"
```

In beiden Seiten anschließend: das äußere `<main className="mx-auto flex w-full …">` durch ein `<div className="flex flex-col gap-4">` (results) bzw. `gap-6` (uploads) ersetzen und die erste `<section>` mit „← Zurück zu Rallyes"-Button + Rallye-Name-Header **komplett entfernen** (übernimmt jetzt das Layout). Die Rallye-Existenzprüfung (`maybeSingle` + `notFound`) in den Seiten belassen (Layout und Page laufen parallel). In `results/page.tsx` die Zeile mit „Maximale Punktzahl" als schlichte Überschrift über dem Grid erhalten:

```tsx
<p className="text-sm text-muted-foreground">
  Endstand · Maximale Punktzahl: {maxPoints}
</p>
```

Nicht mehr benutzte Imports (`Link`, `Button`) entfernen.

- [ ] **Step 6: Alle Checks** — `npm run lint && npm run check:format && npx tsc --noEmit && npm test` → grün.

- [ ] **Step 7: Smoke-Test** — Dev-Server: `/rallyes/<id>/results` und `/rallyes/<id>/uploads` öffnen: Header mit Name + Phasen-Stepper + Tabs erscheint, alte Inhalte darunter, URLs unverändert. (`/rallyes/<id>` selbst 404t noch — Fragen-Tab kommt in Task 4; das ist hier akzeptiert.)

- [ ] **Step 8: Commit (Freigabe beachten)**

```bash
git add -A "app/(protected)/rallyes/[id]" components/rallyes/RallyeTabsNav.tsx components/rallyes/RallyeTabsNav.test.tsx
git commit -m "Add rallye detail layout with tab navigation, move results/uploads"
```

---

### Task 3: Phasen-Button `RallyePhaseControls`

**Files:**
- Create: `components/rallyes/RallyePhaseControls.tsx`
- Create: `components/rallyes/RallyePhaseControls.test.tsx`
- Modify: `app/(protected)/rallyes/[id]/(tabs)/layout.tsx` (Controls einbinden; Voting-Zähler laden)

**Interfaces:**
- Consumes: `getNextRallyeTransition` aus `@/lib/types`; `advanceRallyeStatus` aus `@/actions/rallye` (Task 1).
- Produces: `RallyePhaseControls({ rallyeId, status, hasVotingQuestions })` — zeigt den primären Übergangs-Button mit Bestätigungsdialog (nutzt `confirmText`); bei `ended` rendert sie nichts.

- [ ] **Step 1: Failing Tests** — `components/rallyes/RallyePhaseControls.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RallyePhaseControls from './RallyePhaseControls';

const { mockAdvance } = vi.hoisted(() => ({ mockAdvance: vi.fn() }));
vi.mock('@/actions/rallye', () => ({ advanceRallyeStatus: mockAdvance }));

describe('RallyePhaseControls', () => {
  it('shows the action for the current phase', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="inactive"
        hasVotingQuestions={false}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Rallye starten' })
    ).toBeInTheDocument();
  });

  it('skips voting when there are no voting questions', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="running"
        hasVotingQuestions={false}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Ranking zeigen' })
    ).toBeInTheDocument();
  });

  it('renders nothing when the rallye has ended', () => {
    const { container } = render(
      <RallyePhaseControls
        rallyeId={5}
        status="ended"
        hasVotingQuestions={false}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('opens a confirmation dialog and calls the action on confirm', async () => {
    const user = userEvent.setup();
    mockAdvance.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="inactive"
        hasVotingQuestions={false}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Rallye starten' }));
    expect(
      screen.getByText('Teams können ab jetzt beitreten und die Fragen beantworten.')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bestätigen' }));
    expect(mockAdvance).toHaveBeenCalledWith(5, 'running');
  });
});
```

Hinweis: Falls `@testing-library/user-event` nicht installiert ist (`ls node_modules/@testing-library`), stattdessen `fireEvent.click` aus `@testing-library/react` verwenden — kein neues Paket ohne Not installieren.

- [ ] **Step 2: Rot verifizieren** — `npx vitest run components/rallyes/RallyePhaseControls.test.tsx` → FAIL.

- [ ] **Step 3: Implementierung** — `components/rallyes/RallyePhaseControls.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { Play } from 'lucide-react';
import { advanceRallyeStatus } from '@/actions/rallye';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getNextRallyeTransition, type RallyeStatus } from '@/lib/types';

interface RallyePhaseControlsProps {
  rallyeId: number;
  status: RallyeStatus;
  hasVotingQuestions: boolean;
}

export default function RallyePhaseControls({
  rallyeId,
  status,
  hasVotingQuestions,
}: RallyePhaseControlsProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const transition = getNextRallyeTransition(status, hasVotingQuestions);
  if (!transition) {
    return null;
  }

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await advanceRallyeStatus(rallyeId, transition.target);
      if (!result.success) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="dhbwStyle" className="cursor-pointer">
            {status === 'inactive' && (
              <Play className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {transition.actionLabel}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{transition.actionLabel}</DialogTitle>
            <DialogDescription>{transition.confirmText}</DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="dhbwStyle"
              className="cursor-pointer"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? 'Wird geändert…' : 'Bestätigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 4: Ins Layout einbinden** — in `(tabs)/layout.tsx` nach dem Department-Load den Voting-Zähler laden und die Controls neben dem Badge rendern:

```tsx
const { count: votingCount } = await supabase
  .from('join_rallye_questions')
  .select('question_id', { count: 'exact', head: true })
  .eq('rallye_id', rallyeId)
  .eq('is_voting', true);
```

```tsx
<div className="flex items-center gap-3">
  <Badge variant={isRallyeActive(status) ? 'default' : 'secondary'}>
    {getRallyeStatusLabel(status)}
  </Badge>
  <RallyePhaseControls
    rallyeId={rallyeId}
    status={status}
    hasVotingQuestions={(votingCount ?? 0) > 0}
  />
</div>
```

- [ ] **Step 5: Alle Checks** → grün. **Step 6: Commit (Freigabe beachten)**

```bash
git add components/rallyes/RallyePhaseControls.tsx components/rallyes/RallyePhaseControls.test.tsx "app/(protected)/rallyes/[id]/(tabs)/layout.tsx"
git commit -m "Add guided phase transition button to rallye detail header"
```

---

### Task 4: Fragen-Tab (Default-Seite der Detailansicht)

Read-only-Übersicht der zugeordneten Fragen mit Punktesumme und Link zur bestehenden Zuordnungsseite. (Block 3 ersetzt die Zuordnungsseite und baut diesen Tab zur vollwertigen Zuordnungs-UI aus.)

**Files:**
- Create: `app/(protected)/rallyes/[id]/(tabs)/page.tsx`

**Interfaces:**
- Consumes: Supabase-Join `join_rallye_questions` → `questions`; `questionTypes` aus `@/helpers/questionTypes` (Label-Mapping, Struktur vor Verwendung nachschlagen).

- [ ] **Step 1: Seite implementieren** — `app/(protected)/rallyes/[id]/(tabs)/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import createClient from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PageProps {
  params: Promise<{ id: string }>;
}

type AssignedQuestionRow = {
  is_voting: boolean | null;
  questions: {
    id: number;
    content: string | null;
    type: string | null;
    points: number | null;
  } | null;
};

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

  const { data } = await supabase
    .from('join_rallye_questions')
    .select('is_voting, questions(id, content, type, points)')
    .eq('rallye_id', rallyeId);
  const rows = (data ?? []) as unknown as AssignedQuestionRow[];
  const assigned = rows
    .filter((row) => row.questions !== null)
    .sort((a, b) =>
      (a.questions?.content ?? '').localeCompare(
        b.questions?.content ?? '',
        'de',
        { sensitivity: 'base' }
      )
    );
  const totalPoints = assigned.reduce(
    (sum, row) => sum + (row.questions?.points ?? 0),
    0
  );

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {assigned.length === 0
            ? 'Keine Fragen zugeordnet'
            : `${assigned.length} ${assigned.length === 1 ? 'Frage' : 'Fragen'} · ${totalPoints} Punkte gesamt`}
        </p>
        <Button asChild variant="dhbwStyle" size="sm">
          <Link href={`/rallyes/${rallyeId}/questions`}>
            Fragen zuordnen
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {assigned.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Frage</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="text-right">Punkte</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assigned.map((row) => (
              <TableRow key={row.questions!.id}>
                <TableCell className="max-w-xl">
                  <span className="line-clamp-2">{row.questions!.content}</span>
                  {row.is_voting && (
                    <Badge variant="outline" className="ml-2">
                      Abstimmung
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.questions!.type ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  {row.questions!.points ?? '—'}
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

Feinschliff beim Umsetzen: für die Typ-Spalte das deutsche Label aus `helpers/questionTypes.ts` verwenden (dort nachsehen, wie das Mapping heißt — z. B. `questionTypes.find((t) => t.value === row.questions.type)?.label`).

- [ ] **Step 2: Alle Checks** → grün. **Step 3: Smoke-Test** — `/rallyes/<id>` zeigt Fragen-Tabelle + Punktesumme; „Fragen zuordnen" führt zur bestehenden Zuordnungsseite. **Step 4: Commit (Freigabe beachten)**

```bash
git add "app/(protected)/rallyes/[id]/(tabs)/page.tsx"
git commit -m "Add questions overview tab to rallye detail page"
```

---

### Task 5: Einstellungen-Tab + Karte verweist auf Detailseite (Inline-Edit entfällt)

**Files:**
- Create: `components/rallyes/RallyeSettingsForm.tsx` (abgeleitet aus `components/RallyeForm.tsx`)
- Create: `app/(protected)/rallyes/[id]/(tabs)/settings/page.tsx`
- Modify: `components/RallyeCard.tsx` (Titel verlinkt auf `/rallyes/[id]`, Pencil-Button wird Link auf `…/settings`, Prop `onEdit` entfällt)
- Modify: `app/(protected)/rallyes/page.tsx` (nutzt `RallyeCard` direkt statt `Rallye`-Wrapper)
- Delete: `components/Rallye.tsx`, `components/RallyeForm.tsx` (vorher `grep -rn "components/Rallye'" bzw. "RallyeForm"` — keine weiteren Konsumenten? `RallyeDialog.tsx` nur im Kommentar erwähnt, das ist ok)

**Interfaces:**
- Produces: `RallyeSettingsForm({ rallye, departmentOptions, assignedDepartmentIds })` — Client-Formular; nutzt bestehende Actions `updateRallye` (FormData, inkl. `department_sync='1'`) und `deleteRallye`; nach Löschen `router.push('/rallyes')`.
- Consumes: `updateRallye`/`deleteRallye` aus `@/actions/rallye`, `DateTimePicker`, `RALLYE_STATUSES`/`getRallyeStatusLabel`.

- [ ] **Step 1: `RallyeSettingsForm` erstellen** — Basis ist `components/RallyeForm.tsx` (Copy + Umbau), mit diesen Änderungen:
  1. Kein `onCancel`-Prop, keine Card-Hülle mit Abbrechen-Button — das Formular liegt in einer eigenen `<section>` (Markup wie Fragen-Tab).
  2. Der Status-RadioGroup-Block (Zeilen 145–165 im Original) wird **entfernt**.
  3. Neuer Abschnitt „Gefahrenzone" unter dem Formular (eigene `<section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">`): links das Lösch-Dialog-Konstrukt aus dem Original (Zeilen 278–315, unverändert, nur `onCancel()` nach Erfolg ersetzen durch `router.push('/rallyes')` mit `useRouter` aus `next/navigation`); rechts ein Status-Override:

```tsx
<div className="grid gap-2">
  <Label htmlFor={`rallye-${rallye.id}-status`}>
    Status manuell setzen (Experten-Modus)
  </Label>
  <p className="text-xs text-muted-foreground">
    Normalerweise über den Phasen-Button oben steuern. Manuelles Setzen kann
    Abstimmungen und Ergebnisse beeinflussen.
  </p>
  <Select
    value={status}
    onValueChange={(value) => setStatus(value as RallyeStatus)}
  >
    <SelectTrigger id={`rallye-${rallye.id}-status`} className="w-56">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {RALLYE_STATUSES.map((statusOption) => (
        <SelectItem key={statusOption} value={statusOption}>
          {getRallyeStatusLabel(statusOption)}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <input type="hidden" name="status" value={status} />
</div>
```

  Wichtig: Das `<input type="hidden" name="status">` muss **innerhalb** des `<form>` liegen (Gefahrenzone dazu ins Formular aufnehmen oder das Hidden-Feld oben im Formular platzieren und den Select per State koppeln — Letzteres ist einfacher: Hidden-Feld direkt neben `id`/`end_time`).
  4. `departmentAssignmentsLoaded`/`allowDepartmentAssignments`-Props entfallen; die Settings-Seite lädt die Optionen immer selbst (`department_sync` fest auf `'1'`).

- [ ] **Step 2: Settings-Seite** — `app/(protected)/rallyes/[id]/(tabs)/settings/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import createClient from '@/lib/supabase';
import RallyeSettingsForm from '@/components/rallyes/RallyeSettingsForm';
import type { DepartmentOption, Rallye } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RallyeSettingsPage(props: PageProps) {
  const params = await props.params;
  const idStr = params.id;
  if (!/^\d+$/.test(idStr)) {
    notFound();
  }
  const rallyeId = Number(idStr);

  const supabase = await createClient();
  const { data: rallye } = await supabase
    .from('rallye')
    .select('id, name, status, end_time, password, created_at, department_id')
    .eq('id', rallyeId)
    .maybeSingle();
  if (!rallye) {
    notFound();
  }

  const { data: departments } = await supabase
    .from('department')
    .select('id, name')
    .order('name');

  return (
    <RallyeSettingsForm
      rallye={rallye as Rallye}
      departmentOptions={(departments ?? []) as DepartmentOption[]}
      assignedDepartmentIds={
        rallye.department_id ? [rallye.department_id as number] : []
      }
    />
  );
}
```

- [ ] **Step 3: Karte umbauen** — in `components/RallyeCard.tsx`: Prop `onEdit` entfernen; `CardTitle`-Inhalt in `<Link href={`/rallyes/${rallye.id}`} className="hover:underline">{rallye.name}</Link>` wrappen; den Pencil-`Button` ersetzen durch:

```tsx
<Button
  asChild
  variant="ghost"
  size="icon"
  aria-label="Einstellungen"
  className="text-muted-foreground hover:text-foreground"
>
  <Link href={`/rallyes/${rallye.id}/settings`}>
    <Pencil className="h-4 w-4" aria-hidden="true" />
  </Link>
</Button>
```

In `app/(protected)/rallyes/page.tsx`: Import `Rallye from '@/components/Rallye'` ersetzen durch `RallyeCard from '@/components/RallyeCard'`; in `renderRallyeCard` die nicht mehr benötigten Props (`departmentOptions`, `assignedDepartmentIds`, `departmentAssignmentsLoaded`) streichen. Danach `components/Rallye.tsx` und `components/RallyeForm.tsx` löschen (`git rm`), nachdem `grep -rn "from '@/components/Rallye'" --include="*.tsx"` und `grep -rn "RallyeForm"` keine weiteren Treffer zeigen.

- [ ] **Step 4: Alle Checks** → grün. **Step 5: Commit (Freigabe beachten)**

```bash
git add -A components "app/(protected)/rallyes"
git commit -m "Move rallye editing to settings tab, card links to detail page"
```

---

### Task 6: End-to-End-Verifikation (gesamter Block)

- [ ] Dev-Server (`DEV_AUTH_BYPASS=true`, laufende Instanz des Nutzers nicht killen — ggf. deren Port nutzen), per agent-browser:
  1. `/rallyes`: Karte einer Test-Rallye → Titel-Klick öffnet `/rallyes/<id>` mit Header, Stepper, Tabs, Fragenliste.
  2. Phasen-Button: Test-Rallye mit Status `preparing` durchschalten: „Vorbereitung abschließen" → „Rallye starten" → (ohne Abstimmungs-Fragen) „Ranking zeigen" → „Rallye beenden"; Stepper/Badge aktualisieren sich nach jedem Bestätigen; bei `ended` verschwindet der Button.
  3. Abstimmungs-Pfad: Rallye mit Upload-Frage + Abstimmungs-Flag → in `running` heißt der Button „Abstimmung starten".
  4. Einstellungen-Tab: Name ändern + speichern; Experten-Status-Select zurück auf `Entwurf` setzen (für Wiederholbarkeit); Lösch-Dialog öffnen und abbrechen.
  5. Ergebnisse/Fotos-Tabs: Inhalte erscheinen unter dem gemeinsamen Header; alte URLs funktionieren.
  6. Nur zu Testzwecken angelegte Rallyes wieder löschen; echte Daten nicht verändern.
- [ ] Abschließend `npm run build` einmal laufen lassen (Route-Group-Umbau kann Build-only-Fehler zeigen).

---

## Nach Block 2

Block 3 ersetzt `Assignment.tsx` durch die Zuordnungs-UI im Fragen-Tab (nutzt das Layout aus Task 2). Der „Fragen zuordnen"-Link aus Task 4 wird dann intern.
