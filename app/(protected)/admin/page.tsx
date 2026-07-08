import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/require-profile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
          <h1 className="text-2xl font-semibold text-foreground">Verwaltung</h1>
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
