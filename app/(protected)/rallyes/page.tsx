import createClient from '@/lib/supabase';
import Rallye from '@/components/Rallye';
import EventRallyeDialog from '@/components/rallyes/EventRallyeDialog';
import ExplorationRow from '@/components/rallyes/ExplorationRow';
import ProgramRallyeDialog from '@/components/rallyes/ProgramRallyeDialog';
import {
  classifyRallyesByType,
  getEventDepartmentIds,
  getEventDepartmentIdByOrganization,
  getRallyeUiTypeLabel,
  type RallyeUiClassification,
  type RallyeUiType,
} from '@/lib/rallye-ui-type';
import type { DepartmentOption } from '@/lib/types';

type RallyeRow = {
  id: number;
  name: string;
  status: 'preparing' | 'inactive' | 'running' | 'voting' | 'ranking' | 'ended';
  end_time: string;
  password: string;
  created_at: string;
};

type DepartmentRow = {
  id: number;
  name: string;
  organization_id: number;
};

type OrganizationRow = {
  id: number;
  name: string;
  default_rallye_id: number | null;
};

const rallyeSections: {
  type: RallyeUiType;
  title: string;
  description: string;
}[] = [
  {
    type: 'exploration',
    title: 'Erkundungsmodus',
    description: 'Campus-Touren pro Organisation',
  },
  {
    type: 'event',
    title: 'Events',
    description: 'Rallyes für Veranstaltungen',
  },
  {
    type: 'program',
    title: 'Studiengänge',
    description: 'Reguläre Rallyes für Abteilungen',
  },
  {
    type: 'other',
    title: 'Weitere Rallyes',
    description: 'Nicht eindeutig zuordenbare Rallyes',
  },
];

const getContextLabel = (classification?: RallyeUiClassification): string | undefined => {
  if (!classification) return undefined;
  switch (classification.type) {
    case 'exploration':
    case 'event':
      if (classification.organizationNames.length === 0) return undefined;
      return `Organisation: ${classification.organizationNames.join(', ')}`;
    case 'program':
      if (classification.departmentNames.length === 0) return undefined;
      return `Abteilung: ${classification.departmentNames.join(', ')}`;
    default:
      if (classification.departmentNames.length > 0) {
        return `Abteilungen: ${classification.departmentNames.join(', ')}`;
      }
      if (classification.organizationNames.length > 0) {
        return `Organisationen: ${classification.organizationNames.join(', ')}`;
      }
      return undefined;
  }
};

const getProgramGroupLabel = (classification?: RallyeUiClassification): string => {
  if (!classification || classification.departmentNames.length === 0) {
    return 'Ohne Studiengang';
  }

  if (classification.departmentNames.length === 1) {
    return classification.departmentNames[0];
  }

  return classification.departmentNames.join(' / ');
};

export default async function Home() {
  const supabase = await createClient();
  const { data: rallyes } = await supabase
    .from('rallye')
    .select('id, name, status, end_time, password, created_at')
    .order('name');
  const typedRallyes = (rallyes || []) as RallyeRow[];
  // supabase can't sort ignoring case, so we do it manually
  if (typedRallyes.length > 0) {
    typedRallyes.sort((a, b) =>
      a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
    );
  }

  // Load organization and department data for UI type classification
  const { data: organizations } = await supabase
    .from('organization')
    .select('id, name, default_rallye_id');
  const typedOrganizations = ((organizations || []) as OrganizationRow[]).sort(
    (a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
  );

  const { data: departmentRows } = await supabase
    .from('department')
    .select('id, name, organization_id')
    .order('name');
  const typedDepartmentRows = (departmentRows || []) as DepartmentRow[];
  const departmentOptions = typedDepartmentRows.map(({ id, name }) => ({
    id,
    name,
  }));

  const eventDepartmentIdByOrganizationMap = getEventDepartmentIdByOrganization(
    typedOrganizations,
    typedDepartmentRows
  );
  const eventDepartmentIds = getEventDepartmentIds(
    typedOrganizations,
    typedDepartmentRows
  );
  const eventDepartmentIdByOrganizationId = Object.fromEntries(
    Array.from(eventDepartmentIdByOrganizationMap.entries()).map(([orgId, deptId]) => [
      String(orgId),
      deptId,
    ])
  );
  const eventOrganizationOptions = typedOrganizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    hasEventDepartment: eventDepartmentIdByOrganizationMap.has(organization.id),
  }));
  const programDepartmentOptions: DepartmentOption[] = departmentOptions.filter(
    (department) => !eventDepartmentIds.has(department.id)
  );

  // Fetch question counts for all rallyes in a single query
  const questionCounts = new Map<number, number>();
  const uploadQuestionCounts = new Map<number, number>();
  const departmentAssignmentsMap = new Map<number, number[]>();
  const classificationAssignments: { department_id: number; rallye_id: number }[] = [];
  let departmentAssignmentsLoaded = true;
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

    // Load all department assignments in a single query and group by rallye.
    typedRallyes.forEach((r) => {
      departmentAssignmentsMap.set(r.id, []);
    });
    const { data: deptAssignmentRows, error: deptAssignmentError } = await supabase
      .from('join_department_rallye')
      .select('department_id, rallye_id')
      .in('rallye_id', rallyeIds);

    if (deptAssignmentError) {
      departmentAssignmentsLoaded = false;
      console.error('Error loading department assignments:', deptAssignmentError);
    } else {
      for (const row of deptAssignmentRows || []) {
        const rallyeId = (row as { rallye_id: number }).rallye_id;
        const departmentId = (row as { department_id: number }).department_id;
        classificationAssignments.push({ rallye_id: rallyeId, department_id: departmentId });
        const existing = departmentAssignmentsMap.get(rallyeId);
        if (existing) {
          existing.push(departmentId);
        } else {
          departmentAssignmentsMap.set(rallyeId, [departmentId]);
        }
      }
    }
  }

  const rallyeTypeById = classifyRallyesByType({
    rallyeIds: typedRallyes.map((rallye) => rallye.id),
    organizations: (organizations || []) as OrganizationRow[],
    departments: typedDepartmentRows,
    assignments: classificationAssignments,
  });

  const rallyesByType = new Map<RallyeUiType, RallyeRow[]>(
    rallyeSections.map(({ type }) => [type, [] as RallyeRow[]])
  );
  const rallyeDisplayMeta = new Map<
    number,
    { typeLabel?: string; contextLabel?: string; rallyeUiType: RallyeUiType }
  >();
  for (const rallye of typedRallyes) {
    const classification = rallyeTypeById.get(rallye.id);
    const type = classification?.type ?? 'other';
    const section = rallyesByType.get(type);
    if (section) {
      section.push(rallye);
    }

    rallyeDisplayMeta.set(rallye.id, {
      typeLabel: classification
        ? getRallyeUiTypeLabel(classification.type)
        : undefined,
      contextLabel: getContextLabel(classification),
      rallyeUiType: type,
    });
  }

  const programGroups = new Map<string, RallyeRow[]>();
  for (const rallye of rallyesByType.get('program') || []) {
    const groupLabel = getProgramGroupLabel(rallyeTypeById.get(rallye.id));
    const group = programGroups.get(groupLabel);
    if (group) {
      group.push(rallye);
    } else {
      programGroups.set(groupLabel, [rallye]);
    }
  }

  const sortedProgramGroups = Array.from(programGroups.entries()).sort(([a], [b]) =>
    a.localeCompare(b, 'de', { sensitivity: 'base' })
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
        rallyeUiType={meta?.rallyeUiType}
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
          <p className="text-xs text-muted-foreground">
            Typen werden vorübergehend aus bestehenden Zuordnungen abgeleitet.
          </p>
        </div>
      </section>
      {rallyeSections.map((section) => {
        const sectionRallyes = rallyesByType.get(section.type) ?? [];
        return (
          <section
            key={section.type}
            className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              {section.type === 'event' ? (
                <EventRallyeDialog
                  buttonStyle="w-full sm:w-auto cursor-pointer"
                  organizations={eventOrganizationOptions}
                  eventDepartmentIdByOrganizationId={eventDepartmentIdByOrganizationId}
                />
              ) : section.type === 'program' ? (
                <ProgramRallyeDialog
                  buttonStyle="w-full sm:w-auto cursor-pointer"
                  departments={programDepartmentOptions}
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
                      organizationLabel={meta?.contextLabel}
                      questionCount={questionCounts.get(rallye.id)}
                    />
                  );
                })}
              </div>
            ) : section.type === 'program' ? (
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
