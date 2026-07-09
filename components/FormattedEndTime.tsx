// Format the planned end deterministically in the rallye's fixed timezone so
// the server and the client produce the same string. That avoids the timezone
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
  timeZone: 'Europe/Berlin',
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
