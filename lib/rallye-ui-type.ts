export type RallyeUiType = 'exploration' | 'event' | 'program' | 'other';

export interface RallyeUiOrganization {
  id: number;
  name: string;
  default_rallye_id: number | null;
}

export interface RallyeUiDepartment {
  id: number;
  name: string;
  organization_id: number;
}

export interface RallyeUiDepartmentAssignment {
  department_id: number;
  rallye_id: number;
}

export interface RallyeUiClassification {
  type: RallyeUiType;
  organizationNames: string[];
  departmentNames: string[];
}

interface ClassifyRallyesParams {
  rallyeIds: number[];
  organizations: RallyeUiOrganization[];
  departments: RallyeUiDepartment[];
  assignments: RallyeUiDepartmentAssignment[];
}

const normalizeName = (value: string): string =>
  value.trim().toLocaleLowerCase('de-DE');

const uniqueSorted = (values: string[]): string[] =>
  Array.from(new Set(values)).sort((a, b) =>
    a.localeCompare(b, 'de', { sensitivity: 'base' })
  );

export const getRallyeUiTypeLabel = (type: RallyeUiType): string => {
  switch (type) {
    case 'exploration':
      return 'Erkundungsmodus';
    case 'event':
      return 'Event';
    case 'program':
      return 'Studiengang';
    default:
      return 'Weitere';
  }
};

export function classifyRallyesByType({
  rallyeIds,
  organizations,
  departments,
  assignments,
}: ClassifyRallyesParams): Map<number, RallyeUiClassification> {
  const defaultOrgNamesByRallyeId = new Map<number, string[]>();
  const orgById = new Map(organizations.map((org) => [org.id, org]));
  const departmentById = new Map(departments.map((department) => [department.id, department]));
  const departmentIdsByRallyeId = new Map<number, number[]>();

  for (const org of organizations) {
    if (!org.default_rallye_id) continue;
    const existing = defaultOrgNamesByRallyeId.get(org.default_rallye_id) ?? [];
    existing.push(org.name);
    defaultOrgNamesByRallyeId.set(org.default_rallye_id, existing);
  }

  for (const assignment of assignments) {
    const existing = departmentIdsByRallyeId.get(assignment.rallye_id) ?? [];
    existing.push(assignment.department_id);
    departmentIdsByRallyeId.set(assignment.rallye_id, existing);
  }

  const result = new Map<number, RallyeUiClassification>();

  for (const rallyeId of rallyeIds) {
    const explorationOrgNames = defaultOrgNamesByRallyeId.get(rallyeId) ?? [];
    if (explorationOrgNames.length > 0) {
      result.set(rallyeId, {
        type: 'exploration',
        organizationNames: uniqueSorted(explorationOrgNames),
        departmentNames: [],
      });
      continue;
    }

    const departmentIds = departmentIdsByRallyeId.get(rallyeId) ?? [];
    if (departmentIds.length === 0) {
      result.set(rallyeId, {
        type: 'other',
        organizationNames: [],
        departmentNames: [],
      });
      continue;
    }

    let hasUnknown = false;
    let hasEventDepartment = false;
    let hasProgramDepartment = false;
    const organizationNames: string[] = [];
    const departmentNames: string[] = [];

    for (const departmentId of departmentIds) {
      const department = departmentById.get(departmentId);
      if (!department) {
        hasUnknown = true;
        continue;
      }

      departmentNames.push(department.name);

      const organization = orgById.get(department.organization_id);
      if (!organization) {
        hasUnknown = true;
        continue;
      }

      organizationNames.push(organization.name);

      if (normalizeName(department.name) === normalizeName(organization.name)) {
        hasEventDepartment = true;
      } else {
        hasProgramDepartment = true;
      }
    }

    const normalizedOrganizationNames = uniqueSorted(organizationNames);
    const normalizedDepartmentNames = uniqueSorted(departmentNames);

    if (hasUnknown || (hasEventDepartment && hasProgramDepartment)) {
      result.set(rallyeId, {
        type: 'other',
        organizationNames: normalizedOrganizationNames,
        departmentNames: normalizedDepartmentNames,
      });
      continue;
    }

    if (hasEventDepartment) {
      result.set(rallyeId, {
        type: 'event',
        organizationNames: normalizedOrganizationNames,
        departmentNames: normalizedDepartmentNames,
      });
      continue;
    }

    result.set(rallyeId, {
      type: 'program',
      organizationNames: normalizedOrganizationNames,
      departmentNames: normalizedDepartmentNames,
    });
  }

  return result;
}
