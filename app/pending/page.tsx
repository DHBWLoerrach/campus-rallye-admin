import { connection } from 'next/server';
import { Clock } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { getAccessRequestEmails } from '@/lib/access-request-emails';
import { getSignOutUrl } from '@/lib/sign-out-url';

export default async function PendingApprovalPage() {
  // Read the contact addresses at request time, not at build time.
  await connection();
  const emails = getAccessRequestEmails();
  const signOutUrl = getSignOutUrl();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <section className="relative w-full max-w-xl rounded-3xl border border-border/60 bg-card/90 p-8 text-left shadow-[0_1px_0_rgba(0,0,0,0.04),0_24px_60px_rgba(0,0,0,0.12)]">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Zugang
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Zugang noch nicht freigeschaltet
            </h1>
            <p className="text-sm text-muted-foreground">
              Ihr Konto wurde angelegt, muss aber noch freigeschaltet werden,
              bevor Sie die Anwendung nutzen können.
            </p>
            {emails.length > 0 ? (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Bitte melden Sie sich dafür per E-Mail bei:</p>
                <ul className="space-y-1">
                  {emails.map((email) => (
                    <li key={email}>
                      <a
                        href={`mailto:${email}`}
                        className="font-medium text-foreground underline underline-offset-4"
                      >
                        {email}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Bitte wenden Sie sich dafür an das Admin-Team.
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* A plain anchor forces a full page load, so the proxy re-checks the
              approval. A <Link> would reuse the client router's cached route,
              which remembers the proxy's earlier redirect back to /pending. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- see above */}
          <a href="/rallyes" className={buttonVariants()}>
            Erneut versuchen
          </a>
          <a
            href={signOutUrl}
            className={buttonVariants({ variant: 'outline' })}
          >
            Abmelden
          </a>
        </div>
      </section>
    </main>
  );
}
