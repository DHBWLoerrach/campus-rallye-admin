import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ExplorationRowProps {
  rallyeId: number;
  name: string;
  organizationLabel?: string;
  questionCount?: number;
}

export default function ExplorationRow({
  rallyeId,
  name,
  organizationLabel,
  questionCount,
}: ExplorationRowProps) {
  const questionCountLabel =
    questionCount === undefined
      ? 'Fragen: …'
      : questionCount === 0
      ? 'Keine Fragen'
      : `${questionCount} ${questionCount === 1 ? 'Frage' : 'Fragen'}`;

  return (
    <div className="rounded-lg border border-border/60 bg-card px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-base font-semibold text-foreground">{name}</p>
          {organizationLabel && (
            <p className="truncate text-xs text-muted-foreground">
              {organizationLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{questionCountLabel}</span>
          <Link
            href={`/rallyes/${rallyeId}/questions`}
            className="group inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            aria-label="Fragen zuordnen"
          >
            Fragen zuordnen
            <ChevronRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
