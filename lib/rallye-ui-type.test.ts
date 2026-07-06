import { describe, expect, it } from 'vitest';
import {
  classifyRallyesByType,
  getEventDepartmentIds,
  getRallyeUiTypeLabel,
  getEventDepartmentIdByLocation,
  isEventDepartmentForLocation,
  type RallyeUiDepartment,
  type RallyeUiDepartmentAssignment,
  type RallyeUiLocation,
} from './rallye-ui-type';

const locations: RallyeUiLocation[] = [
  { id: 1, name: 'DHBW Lörrach', default_rallye_id: 1 },
  { id: 2, name: 'Campus Mannheim', default_rallye_id: null },
];

const departments: RallyeUiDepartment[] = [
  { id: 10, name: 'DHBW Lörrach', organization_id: 1 },
  { id: 11, name: 'Informatik', organization_id: 1 },
  { id: 20, name: ' Campus Mannheim ', organization_id: 2 },
  { id: 21, name: 'BWL', organization_id: 2 },
];

const assignments: RallyeUiDepartmentAssignment[] = [
  { rallye_id: 1, department_id: 11 },
  { rallye_id: 2, department_id: 10 },
  { rallye_id: 2, department_id: 20 },
  { rallye_id: 3, department_id: 11 },
  { rallye_id: 5, department_id: 10 },
  { rallye_id: 5, department_id: 11 },
];

describe('classifyRallyesByType', () => {
  it('classifies default rallye ids as exploration mode', () => {
    const result = classifyRallyesByType({
      rallyeIds: [1],
      locations,
      departments,
      assignments,
    });

    expect(result.get(1)).toEqual({
      type: 'exploration',
      locationNames: ['DHBW Lörrach'],
      departmentNames: [],
    });
  });

  it('classifies rallyes with only event departments as event', () => {
    const result = classifyRallyesByType({
      rallyeIds: [2],
      locations,
      departments,
      assignments,
    });

    expect(result.get(2)?.type).toBe('event');
    expect(result.get(2)?.locationNames).toEqual([
      'Campus Mannheim',
      'DHBW Lörrach',
    ]);
  });

  it('classifies rallyes with only non-event departments as program', () => {
    const result = classifyRallyesByType({
      rallyeIds: [3],
      locations,
      departments,
      assignments,
    });

    expect(result.get(3)).toEqual({
      type: 'program',
      locationNames: ['DHBW Lörrach'],
      departmentNames: ['Informatik'],
    });
  });

  it('classifies rallyes without assignments as other', () => {
    const result = classifyRallyesByType({
      rallyeIds: [4],
      locations,
      departments,
      assignments,
    });

    expect(result.get(4)).toEqual({
      type: 'other',
      locationNames: [],
      departmentNames: [],
    });
  });

  it('classifies mixed event/program assignments as other', () => {
    const result = classifyRallyesByType({
      rallyeIds: [5],
      locations,
      departments,
      assignments,
    });

    expect(result.get(5)?.type).toBe('other');
  });
});

describe('getRallyeUiTypeLabel', () => {
  it('returns user-facing labels for each ui type', () => {
    expect(getRallyeUiTypeLabel('exploration')).toBe('Erkundungsmodus');
    expect(getRallyeUiTypeLabel('event')).toBe('Event');
    expect(getRallyeUiTypeLabel('program')).toBe('Studiengang');
    expect(getRallyeUiTypeLabel('other')).toBe('Weitere');
  });
});

describe('isEventDepartmentForLocation', () => {
  it('matches names with trimming and case-insensitive comparison', () => {
    expect(isEventDepartmentForLocation(' DHBW LÖRRACH ', 'dhbw lörrach')).toBe(
      true
    );
    expect(isEventDepartmentForLocation('Informatik', 'DHBW Lörrach')).toBe(
      false
    );
  });
});

describe('getEventDepartmentIdByLocation', () => {
  it('returns one deterministic event department per location', () => {
    const eventDepartmentMap = getEventDepartmentIdByLocation(locations, [
      ...departments,
      { id: 5, name: 'DHBW Lörrach', organization_id: 1 },
      { id: 6, name: 'dhbw lörrach', organization_id: 1 },
    ]);

    expect(eventDepartmentMap.get(1)).toBe(5);
    expect(eventDepartmentMap.get(2)).toBe(20);
  });
});

describe('getEventDepartmentIds', () => {
  it('returns all departments that match the event naming convention', () => {
    const ids = getEventDepartmentIds(locations, [
      ...departments,
      { id: 5, name: 'DHBW Lörrach', organization_id: 1 },
      { id: 6, name: 'Informatik', organization_id: 1 },
    ]);

    expect(Array.from(ids).sort((a, b) => a - b)).toEqual([5, 10, 20]);
  });
});
