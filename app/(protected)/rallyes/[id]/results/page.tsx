import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRallyeResults } from '@/actions/rallye-results';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import createClient from '@/lib/supabase';

interface PageProps {
  params: Promise<{ id: string }>;
}

type RallyeRow = { id: number; name: string };

const formatDuration = (durationMs: number | null): string => {
  if (durationMs === null) return 'k.A.';
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');
  if (hours > 0) {
    const paddedMinutes = String(minutes).padStart(2, '0');
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
};

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
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/rallyes">Zurück zur Übersicht</Link>
          </Button>
        </div>
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Rallye
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Endstand</h1>
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
        <section className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Platz</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="w-24 text-right">Punkte</TableHead>
                <TableHead className="w-28 text-right">Zeit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(results.data ?? []).map((row) => (
                <TableRow key={row.teamId}>
                  <TableCell className="text-center font-semibold">
                    {row.rank}
                  </TableCell>
                  <TableCell className="font-medium">{row.teamName}</TableCell>
                  <TableCell className="text-right">{row.points}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDuration(row.durationMs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}
    </main>
  );
}
