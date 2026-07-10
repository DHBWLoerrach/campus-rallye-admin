// A planned end is a local wall-clock time. Empty means no planned end, while
// malformed values must never be silently dropped before they reach the server.
export type PlannedEnd =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'time'; value: string };

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/;

export function parsePlannedEnd(value: string): PlannedEnd {
  if (value === '') return { kind: 'none' };
  if (!TIME_PATTERN.test(value)) return { kind: 'invalid' };

  return { kind: 'time', value: value.slice(0, 5) };
}

export function plannedEndToMinutes(value: string | null): number | null {
  if (value === null) return null;

  const parsed = parsePlannedEnd(value);
  if (parsed.kind !== 'time') return null;

  const [hour, minute] = parsed.value.split(':').map(Number);
  return hour * 60 + minute;
}
