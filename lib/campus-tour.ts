export type CampusTourLocationReference = {
  default_rallye_id: number | null;
};

export const getCampusTourRallyeIds = (
  locations: readonly CampusTourLocationReference[]
): Set<number> =>
  new Set(
    locations
      .map((location) => location.default_rallye_id)
      .filter((id): id is number => typeof id === 'number')
  );

export const isCampusTourRallye = (
  rallyeId: number,
  locations: readonly CampusTourLocationReference[]
): boolean => getCampusTourRallyeIds(locations).has(rallyeId);
