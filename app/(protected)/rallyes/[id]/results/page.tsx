import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CircleCheck, Timer } from 'lucide-react';
import { getRallyeResults } from '@/actions/rallye-results';
import { Button } from '@/components/ui/button';
import createClient from '@/lib/supabase';

interface PageProps {
  params: Promise<{ id: string }>;
}

type RallyeRow = { id: number; name: string };

function formatDuration(ms?: number | null) {
  if (ms == null) return '-';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');

  if (h > 0) {
    return `${h}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const idStr = params.id;
  if (!/^\d+$/.test(idStr)) {
    notFound();
  }
  const rallyeId = Number(idStr);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rallye')
    .select('id,name')
    .eq('id', rallyeId)
    .maybeSingle();
  if (error || !data) {
    notFound();
  }
  const rallye = data as RallyeRow;

  const results = await getRallyeResults(rallyeId);

  return (
    <main className="mx-auto flex w-full max-w-450 flex-col gap-4 px-4 py-4">
      <section className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="cursor-pointer"
          >
            <Link href="/rallyes">← Zurück zu Rallyes</Link>
          </Button>
        </div>
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Rallye
          </p>
          <h1 className="text-xl font-semibold text-foreground">Endstand</h1>
          <p className="text-sm text-muted-foreground">
            Rallye „{rallye.name}“
          </p>
        </div>
      </section>

      {!results.success && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {results.error}
        </div>
      )}

      {results.success && results.data?.length === 0 ? (
        <section className="rounded-2xl border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
          Keine Teams vorhanden.
        </section>
      ) : results.success ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {(results.data ?? []).map((row) => {
            const medal =
              row.rank === 1
                ? '1 🥇'
                : row.rank === 2
                ? '2 🥈'
                : row.rank === 3
                ? '3 🥉'
                : '';
            return (
              <article
                key={row.teamId}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-[0_2px_0_rgba(0,0,0,0.04),0_10px_24px_rgba(0,0,0,0.12)]"
              >
                <div className="relative aspect-3/2 w-full bg-muted/40">
                  {row.photoUrl ? (
                    <Image
                      src={row.photoUrl}
                      alt={`Teamfoto von ${row.teamName}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, (max-width: 1536px) 33vw, 20vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      Kein Foto vorhanden
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-background/90 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-foreground shadow-sm">
                    <span className="text-sm font-semibold text-foreground">
                      {medal || row.rank}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-4">
                  <div className="space-y-1">
                    <h2 className="text-base font-semibold text-foreground">
                      {row.teamName}
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="flex items-center justify-start gap-2 text-xl font-semibold text-foreground">
                        <CircleCheck className="h-5 w-5" /> {row.points}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="flex items-center justify-end gap-2 text-lg font-semibold text-muted-foreground">
                        <Timer className="h-5 w-5" />
                        {formatDuration(row.durationMs)}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}
