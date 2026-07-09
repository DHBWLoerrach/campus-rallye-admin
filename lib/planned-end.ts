// A rallye's planned end is a 24-hour time (hour:minute) pinned to a day. The
// three outcomes must stay distinct: empty means "no planned end", while an
// out-of-range or non-integer entry is invalid and must never be silently
// dropped (which would start/save without the end the user tried to set).
export type PlannedEnd =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'time'; iso: string };

// Planned-end times are interpreted in a single fixed organizer timezone so
// that display (see FormattedEndTime) and input/conversion always agree,
// regardless of the admin's browser timezone. The audience is a German
// university, so the wall-clock the organizer means is Europe/Berlin.
export const PLANNED_END_TIME_ZONE = 'Europe/Berlin';

const WALL_CLOCK_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: PLANNED_END_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

// The wall-clock fields of an instant as seen in PLANNED_END_TIME_ZONE.
function wallClockInZone(instant: Date): WallClock {
  const parts = WALL_CLOCK_FORMAT.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour') % 24, // some ICU builds emit '24' for midnight
    minute: read('minute'),
    second: read('second'),
  };
}

// The zone's UTC offset (ms) at a given instant.
function zoneOffsetMs(instant: Date): number {
  const wall = wallClockInZone(instant);
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second
  );
  return asUtc - instant.getTime();
}

// Convert a wall-clock time in PLANNED_END_TIME_ZONE to the matching instant.
function zonedWallTimeToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  // The offset at the guessed instant is correct except during the brief DST
  // gap/overlap; a single correction is accurate enough for a planned end.
  const offset = zoneOffsetMs(new Date(utcGuess));
  return new Date(utcGuess - offset);
}

// The hour and minute of an instant as shown in PLANNED_END_TIME_ZONE. Used to
// seed the editor fields so that what the user edits matches what is displayed.
export function getZonedHourMinute(instant: Date): {
  hour: number;
  minute: number;
} {
  const wall = wallClockInZone(instant);
  return { hour: wall.hour, minute: wall.minute };
}

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
  // Pin the time to the base's calendar day in the fixed zone (today if absent).
  const { year, month, day } = wallClockInZone(base ?? new Date());
  const end = zonedWallTimeToInstant(year, month, day, h, m);
  return { kind: 'time', iso: end.toISOString() };
}
