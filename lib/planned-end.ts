// A rallye's planned end is a 24-hour time (hour:minute) pinned to a day. The
// three outcomes must stay distinct: empty means "no planned end", while an
// out-of-range or non-integer entry is invalid and must never be silently
// dropped (which would start/save without the end the user tried to set).
export type PlannedEnd =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'time'; iso: string };

export function parsePlannedEnd(
  hour: string,
  minute: string,
  base?: Date
): PlannedEnd {
  if (hour === '' && minute === '') return { kind: 'none' };
  const h = Number(hour === '' ? '0' : hour);
  const m = Number(minute === '' ? '0' : minute);
  if (
    !Number.isInteger(h) ||
    !Number.isInteger(m) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    return { kind: 'invalid' };
  }
  const end = base ? new Date(base) : new Date();
  end.setHours(h, m, 0, 0);
  return { kind: 'time', iso: end.toISOString() };
}
