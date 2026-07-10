import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FormattedEndTime from '@/components/FormattedEndTime';
import { Rallye, getRallyeStatusLabel, isRallyeActive } from '@/lib/types';

interface RallyeCardProps {
  rallye: Rallye;
  questionCount: number;
  contextLabel?: string;
}

export default function RallyeCard({
  rallye,
  questionCount,
  contextLabel,
}: RallyeCardProps) {
  const statusLabel = getRallyeStatusLabel(rallye.status);
  const isActive = isRallyeActive(rallye.status);
  const questionLabel =
    questionCount === 0
      ? 'Keine Fragen'
      : `${questionCount} ${questionCount === 1 ? 'Frage' : 'Fragen'}`;

  return (
    <Link
      href={`/rallyes/${rallye.id}`}
      className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
      aria-label={`Rallye ${rallye.name} öffnen`}
    >
      <Card className="relative h-full w-full overflow-hidden border-border/60 bg-card/90 transition-all group-hover:-translate-y-0.5 group-hover:shadow-[0_2px_0_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.12)]">
        <div
          className="absolute inset-x-0 top-0 h-1 bg-primary/80"
          aria-hidden="true"
        />
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-semibold leading-tight">
              {rallye.name}
            </CardTitle>
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {statusLabel}
            </Badge>
          </div>
          {contextLabel && (
            <p className="text-xs text-muted-foreground">{contextLabel}</p>
          )}
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm">
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Geplant bis
            </span>
            <span className="font-medium text-foreground">
              <FormattedEndTime value={rallye.rallye_end} />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{questionLabel}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
