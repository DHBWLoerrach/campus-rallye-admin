import { parsePlannedEnd } from '@/lib/planned-end';

export default function FormattedEndTime({ value }: { value: string | null }) {
  if (!value) {
    return <span>Kein Ende geplant</span>;
  }

  const plannedEnd = parsePlannedEnd(value);
  if (plannedEnd.kind !== 'time') {
    return <span>Ungültige Endzeit</span>;
  }

  return <span>{`${plannedEnd.value} Uhr`}</span>;
}
