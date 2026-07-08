import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Star, Timer } from 'lucide-react';
import { getRallyeResults, getRallyeMaxPoints } from '@/actions/rallye-results';
import createClient from '@/lib/supabase';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Playtime is a keepsake ("47 Min. unterwegs"), not a scored metric, so it is
// phrased in words and rounded to minutes rather than shown as a stopwatch.
function formatPlaytime(ms?: number | null) {
  if (ms == null) return null;
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0) {
    return `${h} Std. ${m} Min. unterwegs`;
  }
  return `${m} Min. unterwegs`;
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
  const results = await getRallyeResults(rallyeId);
  const maxPointsResult = await getRallyeMaxPoints(rallyeId);
  const maxPoints = maxPointsResult.success ? (maxPointsResult.data ?? 0) : 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Endstand · Maximale Punktzahl: {maxPoints}
      </p>

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
            const playtime = formatPlaytime(row.durationMs);
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
                <div className="flex flex-col gap-2 p-4">
                  <h2 className="text-base font-semibold text-foreground">
                    {row.teamName}
                  </h2>
                  <p className="flex items-center gap-2 text-xl font-semibold text-foreground">
                    <Star className="h-5 w-5" /> {row.points}
                    {maxPoints > 0 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        ({Math.round((row.points / maxPoints) * 100)}%)
                      </span>
                    )}
                  </p>
                  {playtime && (
                    <p className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                      <Timer className="h-4 w-4" />
                      {playtime}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
