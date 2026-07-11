import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_COOKIE_VALUE,
} from '@/lib/auth-session-cookie';

export default async function LandingPage() {
  const cookieStore = await cookies();
  if (
    cookieStore.get(AUTH_SESSION_COOKIE)?.value === AUTH_SESSION_COOKIE_VALUE
  ) {
    redirect('/rallyes');
  }

  return (
    <main className="relative flex flex-1 items-center justify-center bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <section className="relative w-full max-w-2xl rounded-3xl border border-border/60 bg-card/90 p-8 text-left shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.12)]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Campus Rallye
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-foreground">
            Willkommen zur Campus Rallye
          </h1>
          <p className="text-sm text-muted-foreground">
            Bitte melden Sie sich mit Ihrem DHBW-Account an, um fortzufahren.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/rallyes"
            className={buttonVariants({ variant: 'dhbwStyle', size: 'lg' })}
          >
            Anmelden mit DHBW-Account
          </Link>
          <span className="text-xs text-muted-foreground">
            Zugriff nur für Mitarbeitende der DHBW Lörrach.
          </span>
        </div>
      </section>
    </main>
  );
}
