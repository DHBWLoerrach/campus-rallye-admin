export type RallyeUiType = 'exploration' | 'event' | 'program' | 'other';

export interface RallyeUiLocation {
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
  locationNames: string[];
  departmentNames: string[];
}

interface ClassifyRallyesParams {
  rallyeIds: number[];
  locations: RallyeUiLocation[];
  departments: RallyeUiDepartment[];
  assignments: RallyeUiDepartmentAssignment[];
}

export const normalizeComparisonName = (value: string): string =>
  value.trim().toLocaleLowerCase('de-DE');

export const isEventDepartmentForLocation = (
  departmentName: string,
  locationName: string
): boolean =>
  normalizeComparisonName(departmentName) ===
  normalizeComparisonName(locationName);

export function getEventDepartmentIds(
  locations: RallyeUiLocation[],
  departments: RallyeUiDepartment[]
): Set<number> {
  const locationNameById = new Map(
    locations.map((location) => [location.id, location.name])
  );
  const eventDepartmentIds = new Set<number>();

  for (const department of departments) {
    const locationName = locationNameById.get(department.organization_id);
    if (!locationName) continue;

    if (isEventDepartmentForLocation(department.name, locationName)) {
      eventDepartmentIds.add(department.id);
    }
  }

  return eventDepartmentIds;
}

export function getEventDepartmentIdByLocation(
  locations: RallyeUiLocation[],
  departments: RallyeUiDepartment[]
): Map<number, number> {
  const result = new Map<number, number>();

  for (const location of locations) {
    const matchingDepartmentIds = departments
      .filter(
        (department) =>
          department.organization_id === location.id &&
          isEventDepartmentForLocation(department.name, location.name)
      )
      .map((department) => department.id)
      .sort((a, b) => a - b);

    if (matchingDepartmentIds.length > 0) {
      result.set(location.id, matchingDepartmentIds[0]);
    }
  }

  return result;
}

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
  locations,
  departments,
  assignments,
}: ClassifyRallyesParams): Map<number, RallyeUiClassification> {
  const defaultLocationNamesByRallyeId = new Map<number, string[]>();
  const locationById = new Map(
    locations.map((location) => [location.id, location])
  );
  const departmentById = new Map(
    departments.map((department) => [department.id, department])
  );
  const departmentIdsByRallyeId = new Map<number, number[]>();

  for (const location of locations) {
    if (!location.default_rallye_id) continue;
    const existing =
      defaultLocationNamesByRallyeId.get(location.default_rallye_id) ?? [];
    existing.push(location.name);
    defaultLocationNamesByRallyeId.set(location.default_rallye_id, existing);
  }

  for (const assignment of assignments) {
    const existing = departmentIdsByRallyeId.get(assignment.rallye_id) ?? [];
    existing.push(assignment.department_id);
    departmentIdsByRallyeId.set(assignment.rallye_id, existing);
  }

  const result = new Map<number, RallyeUiClassification>();

  for (const rallyeId of rallyeIds) {
    const explorationLocationNames =
      defaultLocationNamesByRallyeId.get(rallyeId) ?? [];
    if (explorationLocationNames.length > 0) {
      result.set(rallyeId, {
        type: 'exploration',
        locationNames: uniqueSorted(explorationLocationNames),
        departmentNames: [],
      });
      continue;
    }

    const departmentIds = departmentIdsByRallyeId.get(rallyeId) ?? [];
    if (departmentIds.length === 0) {
      result.set(rallyeId, {
        type: 'other',
        locationNames: [],
        departmentNames: [],
      });
      continue;
    }

    let hasUnknown = false;
    let hasEventDepartment = false;
    let hasProgramDepartment = false;
    const locationNames: string[] = [];
    const departmentNames: string[] = [];

    for (const departmentId of departmentIds) {
      const department = departmentById.get(departmentId);
      if (!department) {
        hasUnknown = true;
        continue;
      }

      departmentNames.push(department.name);

      const location = locationById.get(department.organization_id);
      if (!location) {
        hasUnknown = true;
        continue;
      }

      locationNames.push(location.name);

      if (isEventDepartmentForLocation(department.name, location.name)) {
        hasEventDepartment = true;
      } else {
        hasProgramDepartment = true;
      }
    }

    const normalizedLocationNames = uniqueSorted(locationNames);
    const normalizedDepartmentNames = uniqueSorted(departmentNames);

    if (hasUnknown || (hasEventDepartment && hasProgramDepartment)) {
      result.set(rallyeId, {
        type: 'other',
        locationNames: normalizedLocationNames,
        departmentNames: normalizedDepartmentNames,
      });
      continue;
    }

    if (hasEventDepartment) {
      result.set(rallyeId, {
        type: 'event',
        locationNames: normalizedLocationNames,
        departmentNames: normalizedDepartmentNames,
      });
      continue;
    }

    result.set(rallyeId, {
      type: 'program',
      locationNames: normalizedLocationNames,
      departmentNames: normalizedDepartmentNames,
    });
  }

  return result;
}
