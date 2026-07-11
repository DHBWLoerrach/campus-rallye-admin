export const parsePositiveSafeInteger = (
  value: string | null | undefined
): number | undefined => {
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }

  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : undefined;
};
