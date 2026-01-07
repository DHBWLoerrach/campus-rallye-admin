import { Check, X } from 'lucide-react';
import type { Question } from '@/helpers/questions';
import { cn } from '@/lib/utils';

interface QuestionDetailsRowsProps {
  question: Question;
  rallyeNames?: string[];
  isExpanded: boolean;
  className?: string;
  action?: React.ReactNode;
}

const QuestionDetailsRows = ({
  question,
  rallyeNames = [],
  isExpanded,
  className,
  action,
}: QuestionDetailsRowsProps) => {
  if (!isExpanded) return null;

  const hasHint = Boolean(question.hint?.trim());
  const hasRallyes = rallyeNames.length > 0;
  const answers = question.answers ?? [];
  const hasAnswers = answers.length > 0;
  const answersLabel = answers.length === 1 ? 'Antwort' : 'Antworten';
  const answersTitle = answers
    .map((answer) => {
      const label = answer.correct ? 'Richtig' : 'Falsch';
      const text = answer.text?.trim() || '-';
      return `${label}: ${text}`;
    })
    .join(' | ');
  const rallyeLabel = rallyeNames.length === 1 ? 'Rallye' : 'Rallyes';

  if (!hasHint && !hasRallyes && !hasAnswers && !action) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-2 text-sm text-muted-foreground relative pr-24 min-h-[28px]", className)}>
      {action && (
        <div className="absolute right-0 top-0">
          {action}
        </div>
      )}
      {hasHint && (
        <div className="flex flex-col gap-1">
          <div className="pl-3 border-l-2 border-primary/20 text-xs">
            <span className="font-medium text-foreground/80">
              Hinweis:
            </span>{' '}
            {question.hint}
          </div>
        </div>
      )}
      {hasRallyes && (
        <div className="flex flex-col gap-1" title={`${rallyeLabel}: ${rallyeNames.join(', ')}`}>
          <div className="pl-3 border-l-2 border-blue-500/20 text-xs">
            <span className="font-medium text-foreground/80">
              {rallyeLabel}:
            </span>{' '}
            {rallyeNames.join(', ')}
          </div>
        </div>
      )}
      {hasAnswers && (
        <div className="flex flex-col gap-1">
          <div className="pl-3 border-l-2 border-emerald-500/20 text-xs flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground/80 whitespace-nowrap">
              {answersLabel}:
            </span>
            <div className="flex flex-wrap gap-x-3 gap-y-1" title={answersTitle}>
              {answers.map((answer, index) => (
                <span
                  key={answer.id ?? `${question.id}-${index}`}
                  className="inline-flex items-center gap-1"
                >
                  {answer.correct ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-destructive/60" />
                  )}
                  <span className={cn(answer.correct && "font-medium text-emerald-700")}>
                    {answer.text?.trim() || '-'}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionDetailsRows;
