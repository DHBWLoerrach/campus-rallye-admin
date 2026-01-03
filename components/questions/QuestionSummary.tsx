import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, Lightbulb } from 'lucide-react';
import type { Question } from '@/helpers/questions';

interface QuestionSummaryProps {
  question: Question;
  rallyeNames?: string[];
}

const QuestionSummary = ({ question, rallyeNames = [] }: QuestionSummaryProps) => {
  const hasPoints =
    typeof question.points === 'number' &&
    Number.isFinite(question.points) &&
    question.points > 0;
  const hasImage = Boolean(question.bucket_path);
  const hasHint = Boolean(question.hint?.trim());
  const hasRallyes = rallyeNames.length > 0;
  const showMeta = hasPoints || hasImage || hasHint || hasRallyes;
  const rallyeLabel = rallyeNames.length === 1 ? 'Rallye' : 'Rallyes';

  return (
    <div className="flex flex-col gap-1">
      <span className="truncate">{question.content}</span>
      {showMeta && (
        <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground">
          {hasPoints && (
            <Badge
              variant="outline"
              className="px-2 py-0.5 text-[0.55rem] font-medium normal-case tracking-normal text-muted-foreground/80 border-border/50"
              title={`Punkte: ${question.points}`}
            >
              {question.points}p
            </Badge>
          )}
          {hasImage && (
            <span className="inline-flex items-center" title="Bild vorhanden">
              <ImageIcon className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">Bild vorhanden</span>
            </span>
          )}
          {hasHint && (
            <span className="inline-flex items-center" title="Hinweis vorhanden">
              <Lightbulb className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">Hinweis vorhanden</span>
            </span>
          )}
          {hasRallyes && (
            <Badge
              variant="secondary"
              className="px-2 py-0.5 text-[0.55rem] font-semibold normal-case tracking-normal"
              title={`Rallyes: ${rallyeNames.join(', ')}`}
            >
              {rallyeNames.length} {rallyeLabel}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionSummary;
