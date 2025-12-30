import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccessDeniedPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-destructive/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <section className="relative w-full max-w-xl rounded-3xl border border-destructive/20 bg-card/90 p-8 text-left shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.12)]">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-destructive/10 p-2 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Zugriff
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Kein Zugriff
            </h1>
            <p className="text-sm text-muted-foreground">
              Nur Mitarbeitende der DHBW Lörrach dürfen diese Anwendung nutzen.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/">Zurück zur Startseite</Link>
          </Button>
          <span className="text-xs text-muted-foreground">
            Falls Sie Zugriff benötigen, wenden Sie sich an das Admin-Team.
          </span>
        </div>
      </section>
    </main>
  );
}
