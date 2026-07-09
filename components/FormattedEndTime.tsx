import { PLANNED_END_TIME_ZONE } from '@/lib/planned-end';

// Format the planned end deterministically in the same fixed timezone the input
// and conversion use (PLANNED_END_TIME_ZONE), so display and editing agree and
// the server and client produce the same string. The latter avoids the timezone
// hydration mismatch this component used to guard against, without the previous
// side effect of rendering an empty state on the server (and on the first
// client paint) even when an end time exists.
const END_TIME_FORMAT = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: PLANNED_END_TIME_ZONE,
});

export default function FormattedEndTime({ value }: { value: string | null }) {
  if (!value) {
    return <span>Kein Ende geplant</span>;
  }

  const parts = END_TIME_FORMAT.formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const text = `${get('weekday')} ${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')} Uhr`;

  return <span>{text}</span>;
}
