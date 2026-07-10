import Link from 'next/link';
import { notFound } from 'next/navigation';
import createClient from '@/lib/supabase';
import RallyePhaseControls from '@/components/rallyes/RallyePhaseControls';
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
    .from('rallyes')
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

  const { count: votingCount } = await supabase
    .from('rallye_questions')
    .select('question_id', { count: 'exact', head: true })
    .eq('rallye_id', rallyeId)
    .eq('is_voting', true);

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
