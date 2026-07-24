export const getPointValueValidationError = (
  pointValue: number | undefined
) => {
  if (pointValue === undefined) return undefined;
  if (!Number.isSafeInteger(pointValue)) {
    return 'Punktwert muss eine ganze Zahl sein';
  }
  if (pointValue < 0) {
    return 'Punktwert muss größer oder gleich 0 sein';
  }
  return undefined;
};
