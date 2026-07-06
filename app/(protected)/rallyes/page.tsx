import createClient from '@/lib/supabase';
import Rallye from '@/components/Rallye';
import ExplorationRow from '@/components/rallyes/ExplorationRow';
import ProgramRallyeDialog from '@/components/rallyes/ProgramRallyeDialog';
import type { DepartmentOption } from '@/lib/types';

type RallyeRow = {
  id: number;
  name: string;
  status: 'preparing' | 'inactive' | 'running' | 'voting' | 'ranking' | 'ended';
  end_time: string;
  password: string;
  created_at: string;
  department_id: number | null;
};

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

const rallyeSections: {
  type: 'exploration' | 'department';
  title: string;
  description: string;
}[] = [
  {
    type: 'exploration',
    title: 'Erkundungsmodus',
    description: 'Campus-Touren',
  },
  {
    type: 'department',
    title: 'Rallyes',
    description: 'Team-Rallyes mit genau einem Bereich',
  },
];

const uniqueSorted = (values: string[]): string[] =>
  Array.from(new Set(values)).sort((a, b) =>
    a.localeCompare(b, 'de', { sensitivity: 'base' })
  );

const getDepartmentGroupLabel = (departmentNames: string[]): string => {
  if (departmentNames.length === 0) {
    return 'Ohne Bereich';
  }

  if (departmentNames.length === 1) {
    return departmentNames[0];
  }

  return 'Mehrere Bereiche';
};

export default async function Home() {
  const supabase = await createClient();
  const { data: rallyes } = await supabase
    .from('rallye')
    .select('id, name, status, end_time, password, created_at, department_id')
    .order('name');
  const typedRallyes = (rallyes || []) as RallyeRow[];
  // supabase can't sort ignoring case, so we do it manually
  if (typedRallyes.length > 0) {
    typedRallyes.sort((a, b) =>
      a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
    );
  }

  // Load location and department data for UI type classification
  const { data: locations } = await supabase
    .from('location')
    .select('id, name, default_rallye_id');
  const typedLocations = ((locations || []) as LocationRow[]).sort((a, b) =>
    a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
  );

  const { data: departmentRows } = await supabase
    .from('department')
    .select('id, name, location_id')
    .order('name');
  const typedDepartmentRows = (departmentRows || []) as DepartmentRow[];
  const departmentOptions = typedDepartmentRows.map(({ id, name }) => ({
    id,
    name,
  }));
  const createDialogDepartmentOptions: DepartmentOption[] = departmentOptions;

  // Fetch question counts for all rallyes in a single query
  const questionCounts = new Map<number, number>();
  const uploadQuestionCounts = new Map<number, number>();
  const departmentAssignmentsMap = new Map<number, number[]>();
  const departmentAssignmentsLoaded = true;
  if (typedRallyes.length > 0) {
    const rallyeIds = typedRallyes.map((r) => r.id);
    const { data: joins } = await supabase
      .from('join_rallye_questions')
      .select('rallye_id, question_id')
      .in('rallye_id', rallyeIds);
    joins?.forEach((row) => {
      const current = questionCounts.get(row.rallye_id) ?? 0;
      questionCounts.set(row.rallye_id, current + 1);
    });
    const { data: uploadJoins } = await supabase
      .from('join_rallye_questions')
      .select('rallye_id, questions!inner(type)')
      .in('rallye_id', rallyeIds)
      .eq('questions.type', 'upload');
    uploadJoins?.forEach((row) => {
      const current = uploadQuestionCounts.get(row.rallye_id) ?? 0;
      uploadQuestionCounts.set(row.rallye_id, current + 1);
    });
    typedRallyes.forEach((rallye) => {
      departmentAssignmentsMap.set(
        rallye.id,
        rallye.department_id ? [rallye.department_id] : []
      );
    });
  }

  const explorationRallyeIds = new Set(
    typedLocations
      .map((location) => location.default_rallye_id)
      .filter((id): id is number => id !== null)
  );

  const departmentById = new Map(
    typedDepartmentRows.map((department) => [department.id, department])
  );
  const rallyesBySection = new Map<'exploration' | 'department', RallyeRow[]>(
    rallyeSections.map(({ type }) => [type, [] as RallyeRow[]])
  );
  const rallyeDisplayMeta = new Map<
    number,
    { typeLabel?: string; contextLabel?: string; departmentNames: string[] }
  >();
  for (const rallye of typedRallyes) {
    const sectionType = explorationRallyeIds.has(rallye.id)
      ? 'exploration'
      : 'department';
    const section = rallyesBySection.get(sectionType);
    if (section) {
      section.push(rallye);
    }

    const assignedDepartmentIds = departmentAssignmentsMap.get(rallye.id) ?? [];
    const assignedDepartmentNames = uniqueSorted(
      assignedDepartmentIds
        .map((id) => departmentById.get(id)?.name)
        .filter((name): name is string => Boolean(name))
    );

    const contextLabel =
      assignedDepartmentNames.length === 1
        ? `Bereich: ${assignedDepartmentNames[0]}`
        : assignedDepartmentNames.length > 1
          ? `Bereiche: ${assignedDepartmentNames.join(', ')}`
          : undefined;

    rallyeDisplayMeta.set(rallye.id, {
      typeLabel: sectionType === 'department' ? 'Bereichs-Rallye' : undefined,
      contextLabel,
      departmentNames: assignedDepartmentNames,
    });
  }

  const programGroups = new Map<string, RallyeRow[]>();
  for (const rallye of rallyesBySection.get('department') || []) {
    const groupLabel = getDepartmentGroupLabel(
      rallyeDisplayMeta.get(rallye.id)?.departmentNames ?? []
    );
    const group = programGroups.get(groupLabel);
    if (group) {
      group.push(rallye);
    } else {
      programGroups.set(groupLabel, [rallye]);
    }
  }

  const sortedProgramGroups = Array.from(programGroups.entries()).sort(
    ([a], [b]) => a.localeCompare(b, 'de', { sensitivity: 'base' })
  );

  const renderRallyeCard = (rallye: RallyeRow) => {
    const meta = rallyeDisplayMeta.get(rallye.id);
    return (
      <Rallye
        key={rallye.id}
        rallye={rallye}
        questionCount={questionCounts.get(rallye.id) ?? 0}
        uploadQuestionCount={uploadQuestionCounts.get(rallye.id) ?? 0}
        departmentOptions={departmentOptions}
        assignedDepartmentIds={departmentAssignmentsMap.get(rallye.id) ?? []}
        departmentAssignmentsLoaded={departmentAssignmentsLoaded}
        typeLabel={meta?.typeLabel}
        contextLabel={meta?.contextLabel}
      />
    );
  };

  return (
    <main className="mx-auto flex w-full max-w-350 flex-col gap-6 px-4 py-6">
      <section className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Rallyes
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Rallyes verwalten
          </h1>
          <p className="text-sm text-muted-foreground">
            Erstellen, bearbeiten und Fragen zuordnen.
          </p>
        </div>
      </section>
      {rallyeSections.map((section) => {
        const sectionRallyes = rallyesBySection.get(section.type) ?? [];
        return (
          <section
            key={section.type}
            className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {section.title}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {section.description}
                </p>
              </div>
              {section.type === 'department' ? (
                <ProgramRallyeDialog
                  buttonStyle="w-full sm:w-auto cursor-pointer"
                  departments={createDialogDepartmentOptions}
                />
              ) : null}
            </div>

            {sectionRallyes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
                Keine Rallyes in diesem Bereich.
              </p>
            ) : section.type === 'exploration' ? (
              <div className="space-y-2">
                {sectionRallyes.map((rallye) => {
                  const meta = rallyeDisplayMeta.get(rallye.id);
                  return (
                    <ExplorationRow
                      key={rallye.id}
                      rallyeId={rallye.id}
                      name={rallye.name}
                      locationLabel={meta?.contextLabel}
                      questionCount={questionCounts.get(rallye.id)}
                    />
                  );
                })}
              </div>
            ) : section.type === 'department' ? (
              <div className="space-y-4">
                {sortedProgramGroups.map(([groupLabel, rallyes]) => (
                  <div key={groupLabel} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {groupLabel}
                    </h3>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {rallyes.map((rallye) => renderRallyeCard(rallye))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {sectionRallyes.map((rallye) => renderRallyeCard(rallye))}
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
