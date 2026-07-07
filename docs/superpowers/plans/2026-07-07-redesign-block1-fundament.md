# Redesign Block 1: Fundament (Phasenmodell + Nutzer→Bereich) — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phasenmodell-Helper für den Rallye-Lebenszyklus und die lokale Nutzer→Bereich-Zuordnung (SQLite) inkl. Konsistenzlogik und Admin-Pflege-UI.

**Architecture:** Reine Erweiterung bestehender Schichten: Helper in `lib/types.ts`, SQLite-Zugriff in `lib/db/local-user.ts`, Server-Actions nach dem Muster von `actions/department.ts`, UI nach dem Muster von `DepartmentsClient`. Keine Supabase-Schema-Änderung; FK-Semantik SQLite↔Supabase wird in der Anwendungslogik nachgebildet (Spec: `docs/superpowers/specs/2026-07-07-admin-redesign-design.md`, Abschnitt 7).

**Tech Stack:** Next.js 16 (App Router, Server Actions), better-sqlite3, Supabase-JS, Vitest + React Testing Library (jsdom), shadcn/ui, Tailwind v4.

## Global Constraints

- Nach jedem Task: `npm run lint`, `npm run check:format`, `npx tsc --noEmit`, `npm test` — alle müssen grün sein, sonst kein Commit (AGENTS.md Hard Rule).
- **Vor jedem Commit auf das „OK" des Nutzers warten** (AGENTS.md).
- Code-Kommentare auf Englisch; UI-Texte auf Deutsch.
- Formatierung: Prettier (2 Spaces, Single Quotes, Semikolons); Pfad-Aliasse `@/lib`, `@/components`, `@/actions` verwenden.
- Keine `.env*.local`- oder `*.db`-Dateien committen.

---

### Task 1: Phasen-Labels aktualisieren

Die sechs DB-Status bekommen nutzerverständliche Phasen-Namen (Spec Abschnitt 4). `getRallyeStatusLabel` wird von zwei Komponenten benutzt (`components/RallyeCard.tsx`, `components/RallyeForm.tsx`) — beide übernehmen die neuen Labels automatisch.

**Files:**
- Create: `lib/types.test.ts`
- Modify: `lib/types.ts:30-47` (`getRallyeStatusLabel`)

**Interfaces:**
- Produces: `getRallyeStatusLabel(status: RallyeStatus): string` mit neuen Labels: preparing→`'Entwurf'`, inactive→`'Bereit'`, running→`'Läuft'`, voting→`'Abstimmung'`, ranking→`'Ranking'`, ended→`'Abgeschlossen'`.

- [ ] **Step 1: Failing Test schreiben** — neue Datei `lib/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getRallyeStatusLabel, RALLYE_STATUSES } from './types';

describe('getRallyeStatusLabel', () => {
  it.each([
    ['preparing', 'Entwurf'],
    ['inactive', 'Bereit'],
    ['running', 'Läuft'],
    ['voting', 'Abstimmung'],
    ['ranking', 'Ranking'],
    ['ended', 'Abgeschlossen'],
  ] as const)('maps %s to %s', (status, label) => {
    expect(getRallyeStatusLabel(status)).toBe(label);
  });

  it('covers every status in RALLYE_STATUSES', () => {
    for (const status of RALLYE_STATUSES) {
      expect(getRallyeStatusLabel(status)).not.toBe('Unbekannt');
    }
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag verifizieren**

Run: `npx vitest run lib/types.test.ts`
Expected: FAIL — `'Vorbereitung'` statt `'Entwurf'` etc.

- [ ] **Step 3: Labels in `lib/types.ts` ändern** — im `switch` von `getRallyeStatusLabel`:

```ts
export const getRallyeStatusLabel = (status: RallyeStatus): string => {
  switch (status) {
    case 'preparing':
      return 'Entwurf';
    case 'inactive':
      return 'Bereit';
    case 'running':
      return 'Läuft';
    case 'voting':
      return 'Abstimmung';
    case 'ranking':
      return 'Ranking';
    case 'ended':
      return 'Abgeschlossen';
    default:
      return 'Unbekannt';
  }
};
```

- [ ] **Step 4: Alle Checks**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alles grün (kein bestehender Test asserted die alten Label-Strings — verifiziert per grep).

- [ ] **Step 5: Nutzer-OK einholen, dann Commit**

```bash
git add lib/types.ts lib/types.test.ts
git commit -m "Rename rallye status labels to user-facing phase names"
```

---

### Task 2: Phasen-Übergangs-Helper `getNextRallyeTransition`

Kapselt „welche Aktion kommt als Nächstes" für den späteren Phasen-Button (Block 2). Sonderfall: von `running` geht es nur nach `voting`, wenn die Rallye Abstimmungs-Fragen hat, sonst direkt nach `ranking`.

**Files:**
- Modify: `lib/types.ts` (neuer Typ + Funktion, unter `isRallyeActive`)
- Modify: `lib/types.test.ts` (neue describe-Block)

**Interfaces:**
- Produces:
  ```ts
  interface RallyeTransition {
    target: RallyeStatus;
    actionLabel: string;
    confirmText: string;
  }
  getNextRallyeTransition(
    status: RallyeStatus,
    hasVotingQuestions: boolean
  ): RallyeTransition | null; // null bei 'ended'
  ```

- [ ] **Step 1: Failing Tests ergänzen** in `lib/types.test.ts`:

```ts
import {
  getNextRallyeTransition,
  getRallyeStatusLabel,
  RALLYE_STATUSES,
} from './types';

describe('getNextRallyeTransition', () => {
  it('advances preparing to inactive', () => {
    const t = getNextRallyeTransition('preparing', false);
    expect(t?.target).toBe('inactive');
    expect(t?.actionLabel).toBe('Vorbereitung abschließen');
  });

  it('advances inactive to running', () => {
    const t = getNextRallyeTransition('inactive', false);
    expect(t?.target).toBe('running');
    expect(t?.actionLabel).toBe('Rallye starten');
  });

  it('advances running to voting when voting questions exist', () => {
    const t = getNextRallyeTransition('running', true);
    expect(t?.target).toBe('voting');
    expect(t?.actionLabel).toBe('Abstimmung starten');
  });

  it('skips voting when no voting questions exist', () => {
    const t = getNextRallyeTransition('running', false);
    expect(t?.target).toBe('ranking');
    expect(t?.actionLabel).toBe('Ranking zeigen');
  });

  it('advances voting to ranking', () => {
    expect(getNextRallyeTransition('voting', true)?.target).toBe('ranking');
  });

  it('advances ranking to ended', () => {
    const t = getNextRallyeTransition('ranking', false);
    expect(t?.target).toBe('ended');
    expect(t?.actionLabel).toBe('Rallye beenden');
  });

  it('returns null for ended (final state)', () => {
    expect(getNextRallyeTransition('ended', false)).toBeNull();
  });

  it('provides a non-empty confirmText for every transition', () => {
    for (const status of RALLYE_STATUSES) {
      const t = getNextRallyeTransition(status, true);
      if (t) expect(t.confirmText.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag verifizieren**

Run: `npx vitest run lib/types.test.ts`
Expected: FAIL — `getNextRallyeTransition` existiert nicht.

- [ ] **Step 3: Implementierung in `lib/types.ts`** (nach `isRallyeActive` einfügen):

```ts
// Guided phase transitions for the rallye lifecycle. The next action is
// derived from the current status; 'ended' is final (see ADR-0002).
export interface RallyeTransition {
  target: RallyeStatus;
  actionLabel: string;
  confirmText: string;
}

export const getNextRallyeTransition = (
  status: RallyeStatus,
  hasVotingQuestions: boolean
): RallyeTransition | null => {
  switch (status) {
    case 'preparing':
      return {
        target: 'inactive',
        actionLabel: 'Vorbereitung abschließen',
        confirmText:
          'Die Rallye ist danach bereit zum Start. Teams können noch nicht beitreten.',
      };
    case 'inactive':
      return {
        target: 'running',
        actionLabel: 'Rallye starten',
        confirmText:
          'Teams können ab jetzt beitreten und die Fragen beantworten.',
      };
    case 'running':
      return hasVotingQuestions
        ? {
            target: 'voting',
            actionLabel: 'Abstimmung starten',
            confirmText:
              'Teams können nicht mehr antworten und stimmen über die eingereichten Fotos ab.',
          }
        : {
            target: 'ranking',
            actionLabel: 'Ranking zeigen',
            confirmText:
              'Teams können nicht mehr antworten. Das Ergebnis-Ranking wird sichtbar.',
          };
    case 'voting':
      return {
        target: 'ranking',
        actionLabel: 'Ranking zeigen',
        confirmText:
          'Die Abstimmung wird beendet und das Ergebnis-Ranking sichtbar.',
      };
    case 'ranking':
      return {
        target: 'ended',
        actionLabel: 'Rallye beenden',
        confirmText:
          'Die Rallye wird endgültig abgeschlossen und kann nicht wieder geöffnet werden.',
      };
    case 'ended':
      return null;
  }
};
```

- [ ] **Step 4: Alle Checks**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alles grün.

- [ ] **Step 5: Nutzer-OK einholen, dann Commit**

```bash
git add lib/types.ts lib/types.test.ts
git commit -m "Add getNextRallyeTransition helper for guided phase changes"
```

---

### Task 3: SQLite-Spalte `local_users.department_id` + Zugriffsfunktionen

**Files:**
- Modify: `lib/db/local-user.ts` (Typ, Row-Mapping, SELECTs; drei neue Funktionen)
- Modify: `lib/db/local-user.test.ts` (CREATE TABLE + neue Tests)
- Modify: `README.md:145-151` (CREATE TABLE-Snippet + ALTER TABLE-Hinweis für bestehende DBs)

**Interfaces:**
- Produces:
  ```ts
  type LocalUser = {
    user_id: string;
    email: string | null;
    registered_at: string;
    admin: boolean;
    department_id: number | null; // Supabase department id, no real FK
  };
  listLocalUsers(): LocalUser[]; // sorted by email
  setLocalUserDepartment(uuid: string, departmentId: number | null): boolean; // false if user missing
  clearDepartmentAssignments(departmentId: number): number; // returns affected row count
  ```
- Consumes: `getDb()` aus `lib/db/sqlite.ts`.

- [ ] **Step 1: Test-Schema erweitern + failing Tests** in `lib/db/local-user.test.ts`. Im `beforeEach` das CREATE TABLE ersetzen durch:

```ts
db.exec(`
  CREATE TABLE local_users (
    user_id TEXT PRIMARY KEY,
    email TEXT,
    registered_at TEXT,
    admin INTEGER NOT NULL DEFAULT 0,
    department_id INTEGER
  );
`);
```

Import erweitern und neue Tests anhängen (bestehende Tests unangetastet lassen; der Race-Test in Zeile 69-75 erwartet dann zusätzlich `department_id: null` im Objektvergleich — dort ergänzen):

```ts
import {
  clearDepartmentAssignments,
  getLocalUser,
  listLocalUsers,
  setLocalUserDepartment,
  upsertLocalUser,
} from './local-user';

describe('department assignment', () => {
  it('defaults department_id to null on insert', () => {
    const user = upsertLocalUser('uuid-1', 'a@b.de');
    expect(user.department_id).toBeNull();
    expect(getLocalUser('uuid-1')?.department_id).toBeNull();
  });

  it('sets and clears the department of a user', () => {
    upsertLocalUser('uuid-1', 'a@b.de');
    expect(setLocalUserDepartment('uuid-1', 7)).toBe(true);
    expect(getLocalUser('uuid-1')?.department_id).toBe(7);
    expect(setLocalUserDepartment('uuid-1', null)).toBe(true);
    expect(getLocalUser('uuid-1')?.department_id).toBeNull();
  });

  it('returns false when setting department of unknown user', () => {
    expect(setLocalUserDepartment('missing', 7)).toBe(false);
  });

  it('lists all users sorted by email', () => {
    upsertLocalUser('uuid-b', 'b@b.de');
    upsertLocalUser('uuid-a', 'a@b.de');
    const users = listLocalUsers();
    expect(users.map((u) => u.email)).toEqual(['a@b.de', 'b@b.de']);
  });

  it('clears all assignments of a department and reports count', () => {
    upsertLocalUser('uuid-1', 'a@b.de');
    upsertLocalUser('uuid-2', 'b@b.de');
    upsertLocalUser('uuid-3', 'c@b.de');
    setLocalUserDepartment('uuid-1', 7);
    setLocalUserDepartment('uuid-2', 7);
    setLocalUserDepartment('uuid-3', 8);
    expect(clearDepartmentAssignments(7)).toBe(2);
    expect(getLocalUser('uuid-1')?.department_id).toBeNull();
    expect(getLocalUser('uuid-3')?.department_id).toBe(8);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag verifizieren**

Run: `npx vitest run lib/db/local-user.test.ts`
Expected: FAIL — neue Exporte existieren nicht; `department_id` fehlt im Typ.

- [ ] **Step 3: `lib/db/local-user.ts` erweitern** — vollständiger neuer Inhalt der geänderten Teile:

```ts
export type LocalUser = {
  user_id: string;
  email: string | null;
  registered_at: string;
  admin: boolean;
  department_id: number | null;
};

type Row = {
  user_id: string;
  email: string | null;
  registered_at: string;
  admin: number;
  department_id: number | null;
};

function rowToUser(row: Row): LocalUser {
  return {
    user_id: row.user_id,
    email: row.email,
    registered_at: row.registered_at,
    admin: row.admin === 1,
    department_id: row.department_id,
  };
}
```

Beide SELECTs (`getLocalUser` und der Fallback in `upsertLocalUser` via `getLocalUser`) auf `SELECT user_id, email, registered_at, admin, department_id FROM local_users …` umstellen. Das Rückgabeobjekt des frischen Inserts in `upsertLocalUser` bekommt `department_id: null`. Neue Funktionen ans Dateiende:

```ts
export function listLocalUsers(): LocalUser[] {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT user_id, email, registered_at, admin, department_id FROM local_users ORDER BY email'
    )
    .all() as Row[];
  return rows.map(rowToUser);
}

export function setLocalUserDepartment(
  uuid: string,
  departmentId: number | null
): boolean {
  const db = getDb();
  const result = db
    .prepare('UPDATE local_users SET department_id = ? WHERE user_id = ?')
    .run(departmentId, uuid);
  return result.changes > 0;
}

export function clearDepartmentAssignments(departmentId: number): number {
  const db = getDb();
  const result = db
    .prepare(
      'UPDATE local_users SET department_id = NULL WHERE department_id = ?'
    )
    .run(departmentId);
  return result.changes;
}
```

- [ ] **Step 4: README aktualisieren** — im CREATE TABLE-Snippet (README.md ~Zeile 145) die Spalte `department_id INTEGER` ergänzen und direkt darunter einen Hinweis für bestehende Installationen:

```
CREATE TABLE IF NOT EXISTS local_users (
    user_id TEXT PRIMARY KEY,
    email TEXT,
    registered_at TEXT,
    admin INTEGER NOT NULL DEFAULT 0,
    department_id INTEGER
);
```

```
Bei einer bestehenden Datenbank stattdessen einmalig ausführen:

ALTER TABLE local_users ADD COLUMN department_id INTEGER;
```

- [ ] **Step 5: Alle Checks**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alles grün.

- [ ] **Step 6: Lokale Dev-DB migrieren (nur mit Nutzer-OK!)** — `SQLITE_DB_PATH` aus der lokalen Env ermitteln und `ALTER TABLE local_users ADD COLUMN department_id INTEGER;` in der sqlite3-Shell ausführen. Nicht committen (DB ist gitignored).

- [ ] **Step 7: Nutzer-OK einholen, dann Commit**

```bash
git add lib/db/local-user.ts lib/db/local-user.test.ts README.md
git commit -m "Add department_id to local_users with accessor functions"
```

---

### Task 4: Server-Actions für die Nutzer-Bereichs-Zuordnung

Schreib-Validierung gegen Supabase (Konsistenz-Mechanismus 1 der Spec).

**Files:**
- Create: `actions/local-users.ts`
- Create: `actions/local-users.test.ts`

**Interfaces:**
- Consumes: `listLocalUsers`, `setLocalUserDepartment` (Task 3); `requireAdmin` aus `@/lib/require-profile`; `createClient` aus `@/lib/supabase`; `ok`/`fail` aus `@/lib/action-result`.
- Produces:
  ```ts
  getLocalUsers(): Promise<ActionResult<LocalUser[]>>;
  assignUserDepartment(
    userId: string,
    departmentId: number | null
  ): Promise<ActionResult<{ message: string }>>;
  ```

- [ ] **Step 1: Failing Tests schreiben** — `actions/local-users.test.ts` (Mock-Muster wie `actions/department.test.ts`):

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequireAdmin,
  mockCreateClient,
  mockRevalidatePath,
  mockListLocalUsers,
  mockSetLocalUserDepartment,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockCreateClient: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockListLocalUsers: vi.fn(),
  mockSetLocalUserDepartment: vi.fn(),
}));

vi.mock('@/lib/require-profile', () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock('@/lib/db/local-user', () => ({
  listLocalUsers: mockListLocalUsers,
  setLocalUserDepartment: mockSetLocalUserDepartment,
}));

// Supabase mock: department lookup via .from().select().eq().maybeSingle()
const makeSupabase = (department: { id: number } | null, error: unknown = null) => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: department, error }),
      }),
    }),
  }),
});

describe('getLocalUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('requires admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Denied'));
    const { getLocalUsers } = await import('./local-users');
    await expect(getLocalUsers()).rejects.toThrow('Denied');
    expect(mockListLocalUsers).not.toHaveBeenCalled();
  });

  it('returns users from the local database', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const users = [
      {
        user_id: 'u1',
        email: 'a@b.de',
        registered_at: '2026-01-01',
        admin: false,
        department_id: null,
      },
    ];
    mockListLocalUsers.mockReturnValue(users);
    const { getLocalUsers } = await import('./local-users');
    const result = await getLocalUsers();
    expect(result).toEqual({ success: true, data: users });
  });
});

describe('assignUserDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('rejects an empty user id', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const { assignUserDepartment } = await import('./local-users');
    const result = await assignUserDepartment('', 1);
    expect(result.success).toBe(false);
    expect(mockSetLocalUserDepartment).not.toHaveBeenCalled();
  });

  it('validates the department against Supabase before writing', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    const { assignUserDepartment } = await import('./local-users');
    const result = await assignUserDepartment('u1', 99);
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Bereich nicht gefunden');
    expect(mockSetLocalUserDepartment).not.toHaveBeenCalled();
  });

  it('assigns an existing department and revalidates', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 7 }));
    mockSetLocalUserDepartment.mockReturnValue(true);
    const { assignUserDepartment } = await import('./local-users');
    const result = await assignUserDepartment('u1', 7);
    expect(result.success).toBe(true);
    expect(mockSetLocalUserDepartment).toHaveBeenCalledWith('u1', 7);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/users');
  });

  it('clears an assignment without querying Supabase', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    mockSetLocalUserDepartment.mockReturnValue(true);
    const { assignUserDepartment } = await import('./local-users');
    const result = await assignUserDepartment('u1', null);
    expect(result.success).toBe(true);
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockSetLocalUserDepartment).toHaveBeenCalledWith('u1', null);
  });

  it('fails when the user does not exist locally', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    mockSetLocalUserDepartment.mockReturnValue(false);
    const { assignUserDepartment } = await import('./local-users');
    const result = await assignUserDepartment('missing', null);
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Nutzer nicht gefunden');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag verifizieren**

Run: `npx vitest run actions/local-users.test.ts`
Expected: FAIL — Modul `./local-users` existiert nicht.

- [ ] **Step 3: `actions/local-users.ts` implementieren**:

```ts
'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireAdmin } from '@/lib/require-profile';
import {
  listLocalUsers,
  setLocalUserDepartment,
  type LocalUser,
} from '@/lib/db/local-user';
import { fail, ok, type ActionResult } from '@/lib/action-result';

export async function getLocalUsers(): Promise<ActionResult<LocalUser[]>> {
  await requireAdmin();
  return ok(listLocalUsers());
}

export async function assignUserDepartment(
  userId: string,
  departmentId: number | null
): Promise<ActionResult<{ message: string }>> {
  await requireAdmin();

  if (!userId) {
    return fail('Ungültige Nutzer-ID');
  }

  // Consistency mechanism: validate the Supabase department id before
  // persisting it in the local SQLite database (no cross-system FK).
  if (departmentId !== null) {
    const supabase = await createClient();
    const { data: department, error } = await supabase
      .from('department')
      .select('id')
      .eq('id', departmentId)
      .maybeSingle();

    if (error) {
      console.error('Error validating department:', error);
      return fail('Es ist ein Fehler aufgetreten');
    }

    if (!department) {
      return fail('Bereich nicht gefunden');
    }
  }

  const updated = setLocalUserDepartment(userId, departmentId);
  if (!updated) {
    return fail('Nutzer nicht gefunden');
  }

  revalidatePath('/users');
  return ok({ message: 'Bereich erfolgreich zugeordnet' });
}
```

- [ ] **Step 4: Alle Checks**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alles grün.

- [ ] **Step 5: Nutzer-OK einholen, dann Commit**

```bash
git add actions/local-users.ts actions/local-users.test.ts
git commit -m "Add server actions for user department assignment"
```

---

### Task 5: App-seitige Kaskade beim Bereichs-Löschen + Warnhinweis

`deleteDepartment` bekommt `ON DELETE SET NULL`-Semantik für `local_users` (Konsistenz-Mechanismus 2 der Spec); der Lösch-Dialog zeigt vorher an, wie viele Nutzer betroffen sind.

**Files:**
- Modify: `actions/department.ts:264-303` (`deleteDepartment`)
- Modify: `actions/department.test.ts` (Mock + Kaskade-Test)
- Modify: `app/(protected)/departments/page.tsx` (User-Counts laden, Prop durchreichen)
- Modify: `components/DepartmentsClient.tsx`, `components/Department.tsx`, `components/DepartmentForm.tsx` (Prop `assignedUserCount` durchreichen + Dialog-Text)

**Interfaces:**
- Consumes: `clearDepartmentAssignments`, `listLocalUsers` (Task 3).
- Produces: `DepartmentForm` erhält neues Prop `assignedUserCount: number` (via `Department` und `DepartmentsClient` mit `userCountByDepartment: Map<number, number>`).

- [ ] **Step 1: Failing Test in `actions/department.test.ts`** — oben bei den `vi.hoisted`-Mocks `mockClearDepartmentAssignments: vi.fn()` ergänzen und mocken:

```ts
vi.mock('@/lib/db/local-user', () => ({
  clearDepartmentAssignments: mockClearDepartmentAssignments,
}));
```

Neuer Test im bestehenden `deleteDepartment`-describe (Supabase-Mock analog zu den vorhandenen Delete-Tests der Datei aufsetzen — existierende Helper der Datei wiederverwenden):

```ts
it('clears local user assignments after deleting the department', async () => {
  mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
  mockClearDepartmentAssignments.mockReturnValue(2);
  // Arrange the same successful-delete Supabase mock used by the existing
  // 'deletes a department' test in this file.
  const { deleteDepartment } = await import('./department');
  const result = await deleteDepartment('7');
  expect(result.success).toBe(true);
  expect(mockClearDepartmentAssignments).toHaveBeenCalledWith(7);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag verifizieren**

Run: `npx vitest run actions/department.test.ts`
Expected: FAIL — `clearDepartmentAssignments` wird nicht aufgerufen.

- [ ] **Step 3: `deleteDepartment` erweitern** — Import ergänzen (`import { clearDepartmentAssignments } from '@/lib/db/local-user';`) und nach dem erfolgreichen Supabase-Delete (vor `revalidatePath('/departments')`):

```ts
// Application-level ON DELETE SET NULL: local_users reference Supabase
// departments without a real FK, so clear stale assignments here.
const clearedUsers = clearDepartmentAssignments(idResult.data);
if (clearedUsers > 0) {
  console.log(
    `Cleared department assignment for ${clearedUsers} local user(s)`
  );
}
revalidatePath('/users');
```

- [ ] **Step 4: User-Counts in `app/(protected)/departments/page.tsx` laden** — nach dem Laden der Departments:

```ts
import { listLocalUsers } from '@/lib/db/local-user';

// Count local users per department for the delete-warning in the UI.
const userCountByDepartment = new Map<number, number>();
for (const user of listLocalUsers()) {
  if (user.department_id !== null) {
    userCountByDepartment.set(
      user.department_id,
      (userCountByDepartment.get(user.department_id) || 0) + 1
    );
  }
}
```

`<DepartmentsClient … userCountByDepartment={userCountByDepartment} />` übergeben. In `DepartmentsClient.tsx` das Prop im Props-Typ ergänzen und pro Department `assignedUserCount={userCountByDepartment.get(department.id) || 0}` an `Department` durchreichen; `Department.tsx` reicht es 1:1 an `DepartmentForm` weiter.

- [ ] **Step 5: Warnhinweis im Lösch-Dialog** — in `components/DepartmentForm.tsx`, `DialogDescription` des Lösch-Dialogs ergänzen:

```tsx
<DialogDescription>
  Möchten Sie den Bereich &quot;{department.name}&quot; wirklich löschen?
  Diese Aktion kann nicht rückgängig gemacht werden.
  {assignedUserCount > 0 && (
    <>
      {' '}
      {assignedUserCount === 1
        ? 'Ein Nutzer verliert dabei seine Bereichszuordnung.'
        : `${assignedUserCount} Nutzer verlieren dabei ihre Bereichszuordnung.`}
    </>
  )}
</DialogDescription>
```

- [ ] **Step 6: Alle Checks**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alles grün.

- [ ] **Step 7: Nutzer-OK einholen, dann Commit**

```bash
git add actions/department.ts actions/department.test.ts "app/(protected)/departments/page.tsx" components/DepartmentsClient.tsx components/Department.tsx components/DepartmentForm.tsx
git commit -m "Clear local user assignments when a department is deleted"
```

---

### Task 6: Admin-Seite „Nutzer" (`/users`) + Nav-Eintrag

Pflege-UI für die Nutzer→Bereich-Zuordnung. Verwaiste `department_id`-Werte (Konsistenz-Mechanismus 3) werden als Hinweis angezeigt und wie „kein Bereich" behandelt. Der Nav-Eintrag ist vorläufig ein eigener Punkt „Nutzer" (admin-only); die Bündelung unter „Verwaltung" folgt in Block 7.

**Files:**
- Create: `app/(protected)/users/page.tsx`
- Create: `components/UsersClient.tsx`
- Create: `components/UsersClient.test.tsx`
- Modify: `components/Navigation.tsx:9-24` (Route + adminOnlyRoutes)

**Interfaces:**
- Consumes: `listLocalUsers` (Task 3), `assignUserDepartment` (Task 4), `requireAdmin`, `createClient`, shadcn `Select`/`Table`/`Card`/`Badge`.
- Produces: `UsersClient({ users: LocalUser[]; departmentOptions: DepartmentOption[] })`.

- [ ] **Step 1: Failing Component-Test** — `components/UsersClient.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UsersClient from './UsersClient';

vi.mock('@/actions/local-users', () => ({
  assignUserDepartment: vi.fn(),
}));

const departmentOptions = [
  { id: 7, name: 'HoKo/Marketing' },
  { id: 8, name: 'SZI' },
];

describe('UsersClient', () => {
  it('renders one row per user with email', () => {
    render(
      <UsersClient
        users={[
          {
            user_id: 'u1',
            email: 'a@b.de',
            registered_at: '2026-01-01T00:00:00.000Z',
            admin: false,
            department_id: 7,
          },
          {
            user_id: 'u2',
            email: 'b@b.de',
            registered_at: '2026-01-02T00:00:00.000Z',
            admin: true,
            department_id: null,
          },
        ]}
        departmentOptions={departmentOptions}
      />
    );
    expect(screen.getByText('a@b.de')).toBeInTheDocument();
    expect(screen.getByText('b@b.de')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows a hint when the assigned department no longer exists', () => {
    render(
      <UsersClient
        users={[
          {
            user_id: 'u1',
            email: 'a@b.de',
            registered_at: '2026-01-01T00:00:00.000Z',
            admin: false,
            department_id: 999,
          },
        ]}
        departmentOptions={departmentOptions}
      />
    );
    expect(
      screen.getByText('Bisheriger Bereich wurde gelöscht')
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag verifizieren**

Run: `npx vitest run components/UsersClient.test.tsx`
Expected: FAIL — `UsersClient` existiert nicht.

- [ ] **Step 3: `components/UsersClient.tsx` implementieren**:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { assignUserDepartment } from '@/actions/local-users';
import type { LocalUser } from '@/lib/db/local-user';
import type { DepartmentOption } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const NO_DEPARTMENT = 'none';

type UsersClientProps = {
  users: LocalUser[];
  departmentOptions: DepartmentOption[];
};

export default function UsersClient({
  users,
  departmentOptions,
}: UsersClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (userId: string, value: string) => {
    setError(null);
    startTransition(async () => {
      const result = await assignUserDepartment(
        userId,
        value === NO_DEPARTMENT ? null : Number(value)
      );
      if (!result.success) {
        setError(result.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutzer</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div
            className="mb-4 rounded-md border border-red-500/60 bg-red-50/60 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-Mail</TableHead>
              <TableHead>Registriert</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Bereich</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isOrphaned =
                user.department_id !== null &&
                !departmentOptions.some((d) => d.id === user.department_id);
              return (
                <TableRow key={user.user_id}>
                  <TableCell>{user.email ?? '—'}</TableCell>
                  <TableCell>
                    {new Date(user.registered_at).toLocaleDateString('de-DE')}
                  </TableCell>
                  <TableCell>
                    {user.admin && <Badge variant="outline">Admin</Badge>}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={
                        isOrphaned || user.department_id === null
                          ? NO_DEPARTMENT
                          : user.department_id.toString()
                      }
                      onValueChange={(value) =>
                        handleChange(user.user_id, value)
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_DEPARTMENT}>
                          Kein Bereich
                        </SelectItem>
                        {departmentOptions.map((department) => (
                          <SelectItem
                            key={department.id}
                            value={department.id.toString()}
                          >
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isOrphaned && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Bisheriger Bereich wurde gelöscht
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

Hinweis: `import type { LocalUser }` ist zur Compile-Zeit erased — kein better-sqlite3 im Client-Bundle. Markup-Feinheiten (Header-Karte, Abstände) an `components/DepartmentsClient.tsx` angleichen.

- [ ] **Step 4: Test laufen lassen, Erfolg verifizieren**

Run: `npx vitest run components/UsersClient.test.tsx`
Expected: PASS.

- [ ] **Step 5: Seite `app/(protected)/users/page.tsx` anlegen**:

```tsx
import { redirect } from 'next/navigation';
import createClient from '@/lib/supabase';
import { requireAdmin } from '@/lib/require-profile';
import { listLocalUsers } from '@/lib/db/local-user';
import UsersClient from '@/components/UsersClient';

export default async function UsersPage() {
  try {
    await requireAdmin();
  } catch {
    redirect('/rallyes');
  }

  const supabase = await createClient();
  const { data: departmentOptions } = await supabase
    .from('department')
    .select('id, name')
    .order('name');

  const users = listLocalUsers();

  return (
    <UsersClient users={users} departmentOptions={departmentOptions || []} />
  );
}
```

- [ ] **Step 6: Nav-Eintrag** — in `components/Navigation.tsx` bei `allRoutes` ergänzen und in `adminOnlyRoutes` aufnehmen:

```ts
{
  href: '/users',
  label: 'Nutzer',
},
```

```ts
const adminOnlyRoutes = new Set(['/departments', '/users']);
```

- [ ] **Step 7: Alle Checks**

Run: `npm run lint && npm run check:format && npx tsc --noEmit && npm test`
Expected: alles grün.

- [ ] **Step 8: End-to-End-Verifikation** — Dev-Server starten (`npm run dev`, `DEV_AUTH_BYPASS=true`; Voraussetzung: Dev-DB aus Task 3 Step 6 migriert, Mock-User hat `admin=1`): `/users` öffnen, einem Nutzer einen Bereich zuordnen, Seite neu laden (Zuordnung persistent), Bereich auf „Kein Bereich" zurücksetzen. Danach unter `/departments` einen zugeordneten Bereich löschen und prüfen, dass der Warnhinweis erscheint und die Zuordnung unter `/users` entfernt wurde.

- [ ] **Step 9: Nutzer-OK einholen, dann Commit**

```bash
git add "app/(protected)/users/page.tsx" components/UsersClient.tsx components/UsersClient.test.tsx components/Navigation.tsx
git commit -m "Add admin users page for department assignment"
```

---

## Nach Block 1

Blöcke 2–7 der Spec (Rallye-Detailseite, Fragen-Tab, Startseite, Erstellen/Duplizieren, Fragenkatalog, Verwaltung) bekommen jeweils einen eigenen Plan, sobald der vorherige Block gemerged ist. `getNextRallyeTransition` (Task 2) und die Bereichs-Zuordnung (Tasks 3–6) sind die Grundlage für Block 2 (Phasen-Button) und Block 4 (Bereichs-Fokus der Startseite).
