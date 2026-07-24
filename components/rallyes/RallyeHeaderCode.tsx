import { type RallyeStatus } from '@/lib/types';

interface RallyeHeaderCodeProps {
  status: RallyeStatus;
  rallyeCode: string;
}

// The rallye code is shown in the header only while it matters operationally:
// once the rallye is ready or running, teams need it to join, so the organizer
// should have it at hand. An empty code is a gentle prompt (see issue 03).
export default function RallyeHeaderCode({
  status,
  rallyeCode,
}: RallyeHeaderCodeProps) {
  if (status !== 'ready' && status !== 'running') {
    return null;
  }
  const code = rallyeCode.trim();
  return (
    <p className="text-sm text-muted-foreground">
      Rallye-Code:{' '}
      {code ? (
        <span className="font-mono font-semibold text-foreground">{code}</span>
      ) : (
        <span className="italic">Noch kein Rallye-Code</span>
      )}
    </p>
  );
}
