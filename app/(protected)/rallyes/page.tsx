import Link from 'next/link';
import createClient from '@/lib/supabase';
import RallyeCard from '@/components/RallyeCard';
import ExplorationRow from '@/components/rallyes/ExplorationRow';
import { Button } from '@/components/ui/button';
import { getUserContext } from '@/lib/user-context';
import { getLocalUser } from '@/lib/db/local-user';
import { plannedEndToMinutes } from '@/lib/planned-end';
import {
  RALLYE_PHASE_GROUPS,
  getRallyePhaseGroup,
  type RallyePhaseGroup,
} from '@/lib/types';
import type { Rallye } from '@/lib/types';

type RallyeRow = Rallye & { department_id: number | null };

type DepartmentRow = {
  id: number;
  name: string;
  location_id: number;
};

type LocationRow = {
  id: number;
  name: string;
  default_rallye_id: number | null;
};

const PHASE_SYMBOLS: Record<RallyePhaseGroup, string> = {
  live: '●',
  preparation: '○',
  done: '✓',
};

// Live and draft rallyes: nearest end first; finished: latest end first.
// Rallyes without a planned end sort to the very bottom of their group.
const sortForGroup = (group: RallyePhaseGroup, rallyes: RallyeRow[]) =>
  [...rallyes].sort((a, b) => {
    const aTime = plannedEndToMinutes(a.rallye_end);
    const bTime = plannedEndToMinutes(b.rallye_end);
    if (aTime === null || bTime === null) {
      if (aTime === bTime) return 0;
      return aTime === null ? 1 : -1;
    }
    const diff = aTime - bTime;
    return group === 'done' ? -diff : diff;
  });

async function getUserDepartmentId(): Promise<number | null> {
  try {
    const { uuid } = await getUserContext();
    return getLocalUser(uuid)?.department_id ?? null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const supabase = await createClient();
  const userDepartmentId = await getUserDepartmentId();

  const { data: rallyes } = await supabase
    .from('rallyes')
    .select(
      'id, name, status, rallye_end, rallye_code, created_at, department_id'
    )
    .order('name');
  const typedRallyes = (rallyes || []) as RallyeRow[];

  const { data: locations } = await supabase
    .from('location')
    .select('id, name, default_rallye_id');
  const typedLocations = (locations || []) as LocationRow[];

  const { data: departmentRows } = await supabase
    .from('department')
    .select('id, name, location_id')
    .order('name');
  const typedDepartmentRows = (departmentRows || []) as DepartmentRow[];
  const departmentById = new Map(
    typedDepartmentRows.map((department) => [department.id, department])
  );

  const questionCounts = new Map<number, number>();
  if (typedRallyes.length > 0) {
    const { data: joins } = await supabase
      .from('join_rallye_questions')
      .select('rallye_id, question_id')
      .in(
        'rallye_id',
        typedRallyes.map((r) => r.id)
      );
    joins?.forEach((row) => {
      questionCounts.set(
        row.rallye_id,
        (questionCounts.get(row.rallye_id) ?? 0) + 1
      );
    });
  }

  const explorationRallyeIds = new Set(
    typedLocations
      .map((location) => location.default_rallye_id)
      .filter((id): id is number => id !== null)
  );

  const explorationRallyes = typedRallyes.filter((rallye) =>
    explorationRallyeIds.has(rallye.id)
  );
  const teamRallyes = typedRallyes.filter(
    (rallye) => !explorationRallyeIds.has(rallye.id)
  );

  const myRallyes =
    userDepartmentId === null
      ? teamRallyes
      : teamRallyes.filter(
          (rallye) => rallye.department_id === userDepartmentId
        );
  const otherRallyes =
    userDepartmentId === null
      ? []
      : teamRallyes.filter(
          (rallye) => rallye.department_id !== userDepartmentId
        );

  const myGroups = RALLYE_PHASE_GROUPS.map((group) => ({
    ...group,
    rallyes: sortForGroup(
      group.id,
      myRallyes.filter(
        (rallye) => getRallyePhaseGroup(rallye.status) === group.id
      )
    ),
  })).filter((group) => group.rallyes.length > 0);

  const othersByDepartment = new Map<string, RallyeRow[]>();
  for (const rallye of otherRallyes) {
    const name = rallye.department_id
      ? (departmentById.get(rallye.department_id)?.name ?? 'Ohne Bereich')
      : 'Ohne Bereich';
    othersByDepartment.set(name, [
      ...(othersByDepartment.get(name) ?? []),
      rallye,
    ]);
  }
  const sortedOtherGroups = Array.from(othersByDepartment.entries()).sort(
    ([a], [b]) => a.localeCompare(b, 'de', { sensitivity: 'base' })
  );

  const contextLabel = (rallye: RallyeRow) =>
    rallye.department_id
      ? `Bereich: ${departmentById.get(rallye.department_id)?.name ?? 'Unbekannt'}`
      : undefined;

  const userDepartmentName = userDepartmentId
    ? (departmentById.get(userDepartmentId)?.name ?? null)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-350 flex-col gap-6 px-4 py-6">
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Rallyes
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            {userDepartmentName ? 'Meine Rallyes' : 'Rallyes verwalten'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {userDepartmentName
              ? `Bereich: ${userDepartmentName}`
              : 'Alle Rallyes, gruppiert nach Phase.'}
          </p>
        </div>
        <Button asChild variant="dhbwStyle" className="w-full sm:w-auto">
          <Link href="/rallyes/new">+ Neue Rallye</Link>
        </Button>
      </section>

      {myGroups.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Noch keine Rallyes. Die erste über „+ Neue Rallye“ anlegen.
        </section>
      ) : (
        myGroups.map((group) => (
          <section
            key={group.id}
            className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4"
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {`${PHASE_SYMBOLS[group.id]} ${group.label}`}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {group.rallyes.map((rallye) => (
                <RallyeCard
                  key={rallye.id}
                  rallye={rallye}
                  questionCount={questionCounts.get(rallye.id) ?? 0}
                  contextLabel={
                    userDepartmentId === null ? contextLabel(rallye) : undefined
                  }
                />
              ))}
            </div>
          </section>
        ))
      )}

      {sortedOtherGroups.length > 0 && (
        <details className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
            Andere Bereiche ({otherRallyes.length})
          </summary>
          <div className="mt-4 space-y-4">
            {sortedOtherGroups.map(([groupLabel, groupRallyes]) => (
              <div key={groupLabel} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {groupLabel}
                </h3>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {groupRallyes.map((rallye) => (
                    <RallyeCard
                      key={rallye.id}
                      rallye={rallye}
                      questionCount={questionCounts.get(rallye.id) ?? 0}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {explorationRallyes.length > 0 && (
        <details className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
            Campus-Touren (Erkundungsmodus)
          </summary>
          <div className="mt-4 space-y-2">
            {explorationRallyes.map((rallye) => (
              <ExplorationRow
                key={rallye.id}
                rallyeId={rallye.id}
                name={rallye.name}
                questionCount={questionCounts.get(rallye.id)}
              />
            ))}
          </div>
        </details>
      )}
    </main>
  );
}
