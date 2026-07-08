# Redesign Block 7: Verwaltung bündeln + Navigation final — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bereiche, Standorte und Nutzer wandern unter einen gemeinsamen `/admin`-Bereich mit Hub-Seite; die Top-Navigation zeigt für Admins nur noch einen „Verwaltung"-Menüpunkt statt der Einzel-Links, und das bisher unverlinkte `/locations` wird erreichbar.

**Architecture:** Die drei bestehenden Admin-Seiten werden per `git mv` nach `app/(protected)/admin/{departments,locations,users}/` verschoben (URLs `/admin/departments` usw.); eine neue Hub-Seite `app/(protected)/admin/page.tsx` verlinkt sie als Karten. Die Navigation ersetzt die Einträge „Bereiche" und „Nutzer" durch einen einzigen admin-only Eintrag „Verwaltung" → `/admin`; `NavItems` markiert ihn dank `pathname.startsWith('/admin/')` automatisch auf allen Unterseiten aktiv. Alle `revalidatePath`-Aufrufe der betroffenen Server-Actions werden auf die neuen Pfade gezogen. Um keinen kaputten Zwischenzustand zu erzeugen, passiert Verschieben + Hub + Navigation in **einem** Task/Commit.

**Tech Stack:** Next.js 16 App Router (Server Components, Route Groups), Vitest + RTL.

## Global Constraints

- Nach jedem Task: `npm run lint`, `npm run check:format`, `npx tsc --noEmit`, `npm test` — alle grün, sonst kein Commit (AGENTS.md Hard Rule).
- Commits gemäß Block-Freigabe.
- Code-Kommentare Englisch; UI-Texte Deutsch in neutraler Form.
- Admin-Seiten bleiben admin-only (`requireAdmin`, sonst `redirect('/rallyes')`).

---

### Task 1: Admin-Bereich bündeln (Verschieben + Hub + Navigation)

**Files:**
- Move: `app/(protected)/departments/` → `app/(protected)/admin/departments/` (`git mv`)
- Move: `app/(protected)/locations/` → `app/(protected)/admin/locations/` (`git mv`)
- Move: `app/(protected)/users/` → `app/(protected)/admin/users/` (`git mv`)
- Create: `app/(protected)/admin/page.tsx`
- Create: `app/(protected)/admin/page.test.tsx`
- Modify: `components/Navigation.tsx`
- Modify: `actions/department.ts` (revalidatePath-Pfade), `actions/location.ts`, `actions/local-users.ts`
- Modify: `actions/department.test.ts`, `actions/local-users.test.ts` (revalidatePath-Assertions)

**Interfaces:**
- Produces: Hub `AdminPage` (Server Component, `requireAdmin`); Nav-Eintrag `{ href: '/admin', label: 'Verwaltung' }` (admin-only).

- [ ] **Step 1: Verzeichnisse verschieben**

```bash
mkdir -p "app/(protected)/admin"
git mv "app/(protected)/departments" "app/(protected)/admin/departments"
git mv "app/(protected)/locations" "app/(protected)/admin/locations"
git mv "app/(protected)/users" "app/(protected)/admin/users"
```

- [ ] **Step 2: `revalidatePath`-Pfade aktualisieren** — in `actions/department.ts` alle `revalidatePath('/departments')` → `revalidatePath('/admin/departments')`, `revalidatePath('/locations')` → `revalidatePath('/admin/locations')`, `revalidatePath('/users')` → `revalidatePath('/admin/users')`. In `actions/location.ts` alle `revalidatePath('/locations')` → `revalidatePath('/admin/locations')`. In `actions/local-users.ts` `revalidatePath('/users')` → `revalidatePath('/admin/users')`. Verifikation danach:

```bash
grep -rn "revalidatePath('/departments'\|revalidatePath('/locations'\|revalidatePath('/users'" actions
```

Erwartung: keine Treffer mehr (alle tragen jetzt `/admin/`-Präfix).

- [ ] **Step 3: Test-Assertions nachziehen** — in `actions/department.test.ts:511` und `actions/local-users.test.ts:112` jeweils `toHaveBeenCalledWith('/users')` → `toHaveBeenCalledWith('/admin/users')`.

- [ ] **Step 4: Failing Test für die Hub-Seite** — `app/(protected)/admin/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from './page';

const { mockRequireAdmin, mockRedirect } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock('@/lib/require-profile', () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links to the three admin areas for admins', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    render(await AdminPage());

    expect(screen.getByRole('link', { name: /Bereiche/ })).toHaveAttribute(
      'href',
      '/admin/departments'
    );
    expect(screen.getByRole('link', { name: /Standorte/ })).toHaveAttribute(
      'href',
      '/admin/locations'
    );
    expect(screen.getByRole('link', { name: /Nutzer/ })).toHaveAttribute(
      'href',
      '/admin/users'
    );
  });

  it('redirects non-admins to /rallyes', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Denied'));
    await AdminPage();
    expect(mockRedirect).toHaveBeenCalledWith('/rallyes');
  });
});
```

- [ ] **Step 5: Rot verifizieren** — `npx vitest run "app/(protected)/admin/page.test.tsx"` → FAIL (Seite existiert nicht).

- [ ] **Step 6: Hub-Seite implementieren** — `app/(protected)/admin/page.tsx`:

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/require-profile';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const areas = [
  {
    href: '/admin/departments',
    title: 'Bereiche',
    description:
      'Studiengänge, Studienzentren und allgemeine Bereiche verwalten.',
  },
  {
    href: '/admin/locations',
    title: 'Standorte',
    description: 'Campus-Standorte und deren Campus-Touren verwalten.',
  },
  {
    href: '/admin/users',
    title: 'Nutzer',
    description: 'Nutzern einen Bereich zuordnen.',
  },
];

export default async function AdminPage() {
  try {
    await requireAdmin();
  } catch {
    redirect('/rallyes');
  }

  return (
    <main className="mx-auto flex w-full max-w-350 flex-col gap-6 px-4 py-6">
      <section className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Verwaltung
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Verwaltung
          </h1>
          <p className="text-sm text-muted-foreground">
            Bereiche, Standorte und Nutzer an einem Ort.
          </p>
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {areas.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Card className="h-full border-border/60 bg-card/90 transition-all group-hover:-translate-y-0.5 group-hover:shadow-[0_2px_0_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.12)]">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {area.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {area.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Navigation umbauen** — in `components/Navigation.tsx` die `allRoutes`-Einträge `/departments` und `/users` durch einen Eintrag ersetzen:

```ts
const allRoutes: Route[] = [
  {
    href: '/rallyes',
    label: 'Rallyes',
  },
  {
    href: '/questions',
    label: 'Fragenkatalog',
  },
  {
    href: '/admin',
    label: 'Verwaltung',
  },
];

const adminOnlyRoutes = new Set(['/admin']);
```

(`NavItems` markiert `/admin` dank `pathname.startsWith('/admin/')` auch auf den Unterseiten aktiv — keine weitere Änderung nötig.)

- [ ] **Step 8: Alle Checks** → grün. Zusätzlich prüfen, dass keine alten Pfade übrig sind:

```bash
grep -rn "'/departments'\|'/locations'\|'/users'" app components actions --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v node_modules
```

Erwartung: keine Treffer (alle Referenzen tragen `/admin/`-Präfix; Redirects `redirect('/rallyes')` bleiben unberührt).

- [ ] **Step 9: Commit**

```bash
git add -A "app/(protected)/admin" components/Navigation.tsx actions
git commit -m "Bundle admin pages under /admin with a hub and single nav entry"
```

---

### Task 2: Zurück-Links und neutrale Sprache in der Verwaltung

**Files:**
- Modify: `app/(protected)/admin/departments/page.tsx` bzw. `components/DepartmentsClient.tsx` (Zurück-Link + Text)
- Modify: `app/(protected)/admin/locations/page.tsx` (Zurück-Link + Text)
- Modify: `components/UsersClient.tsx` (Zurück-Link)

Ziel: Jede Unterseite bekommt oben einen `← Zurück zur Verwaltung`-Link (`/admin`), und die Sie-Anrede in den Beschreibungstexten wird neutralisiert.

- [ ] **Step 1: Zurück-Link-Baustein** — in allen drei Seiten oben (vor der Überschrift) einfügen. Für `DepartmentsClient.tsx` und `UsersClient.tsx` (beide `'use client'`, rendern das Seiten-Layout) sowie `admin/locations/page.tsx` (Server Component) jeweils:

```tsx
<Button asChild variant="outline" size="sm" className="w-fit">
  <Link href="/admin">← Zurück zur Verwaltung</Link>
</Button>
```

(`Link` aus `next/link` und `Button` aus `@/components/ui/button` importieren, falls noch nicht vorhanden.) In `DepartmentsClient.tsx` und `UsersClient.tsx` den Link als erstes Kind des äußeren `div`/Layout-Wrappers einsetzen; in `admin/locations/page.tsx` analog vor die Kopf-`div`.

- [ ] **Step 2: Neutrale Texte** — folgende exakten Ersetzungen:

| Datei | Alt | Neu |
|---|---|---|
| DepartmentsClient | `Verwalten Sie Ihre Bereiche für ${siteLabel}.` | `Bereiche für ${siteLabel} verwalten.` |
| DepartmentsClient | `Verwalten Sie Ihre Bereiche am Standort ${siteLabel}.` | `Bereiche am Standort ${siteLabel} verwalten.` |
| DepartmentsClient | `Erstellen Sie Ihren ersten Bereich, um zu beginnen.` | `Den ersten Bereich anlegen, um zu beginnen.` |
| admin/locations/page | `Verwalten Sie Ihre Standorte und deren Campus-Touren.` | `Standorte und deren Campus-Touren verwalten.` |
| admin/locations/page | `Erstellen Sie Ihren ersten Standort, um zu beginnen.` | `Den ersten Standort anlegen, um zu beginnen.` |
| admin/locations/page | `Verwalten Sie Ihre Standorte am Standort …` (falls vorhanden) | analog neutralisieren |

(Vor dem Editieren die Dateien lesen und die Strings exakt matchen; ggf. weitere `Verwalten Sie`/`Erstellen Sie`-Treffer im selben Sinne neutralisieren. Betroffene Tests, die alte Strings asserten, mit anpassen — `grep -rn "Verwalten Sie\|Erstellen Sie" app components --include="*.tsx" | grep -v test`.)

- [ ] **Step 3: Alle Checks** → grün. **Step 4: Commit**

```bash
git add "app/(protected)/admin" components
git commit -m "Add back-links and neutral phrasing to admin pages"
```

---

### Task 3: End-to-End-Verifikation + Build

- [ ] Dev-Server, per agent-browser (Mock-User ist Admin):
  1. `/rallyes`: Top-Nav zeigt „Rallyes", „Fragenkatalog", „Verwaltung" — keine Einzel-Links „Bereiche"/„Nutzer" mehr.
  2. „Verwaltung" klicken → `/admin` mit drei Karten (Bereiche, Standorte, Nutzer); „Verwaltung" ist im Nav aktiv markiert.
  3. Jede Karte öffnet die jeweilige Seite (`/admin/departments`, `/admin/locations`, `/admin/users`); „Verwaltung" bleibt im Nav aktiv; „← Zurück zur Verwaltung" führt zurück.
  4. Funktionsprobe: unter `/admin/users` einem Nutzer einen Bereich zuordnen und wieder entfernen (persistiert nach Reload) — bestätigt, dass die verschobene Route samt Server-Action und `revalidatePath` funktioniert.
  5. Alte URL `/departments` direkt aufrufen → 404 (akzeptiert; war admin-only und nur über die Nav erreichbar).
- [ ] `npm run build` → erfolgreich; Routen `/admin`, `/admin/departments`, `/admin/locations`, `/admin/users` im Output.

---

## Nach Block 7

Damit sind alle sieben Blöcke der Spec (`docs/superpowers/specs/2026-07-07-admin-redesign-design.md`) umgesetzt. Sinnvolle Abschlussschritte: Gesamt-Durchsicht per `/code-review`, Screenshots für den PR, und ein zusammenfassender PR gegen `main`.
