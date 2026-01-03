import { Check, X } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import type { Question } from '@/helpers/questions';

interface QuestionDetailsRowsProps {
  question: Question;
  rallyeNames?: string[];
  isExpanded: boolean;
  leadingCellsCount: number;
  colSpan: number;
}

const QuestionDetailsRows = ({
  question,
  rallyeNames = [],
  isExpanded,
  leadingCellsCount,
  colSpan,
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

  const leadingCells = Array.from({ length: leadingCellsCount }, (_, index) => (
    <TableCell key={`leading-${index}`} />
  ));

  return (
    <>
      {hasHint && (
        <TableRow className="bg-muted/40 text-muted-foreground border-0">
          {leadingCells}
          <TableCell colSpan={colSpan} className="py-1.5">
            <div className="pl-5 border-l border-border/40 text-xs">
              <span className="font-medium text-muted-foreground/80">
                Hinweis:
              </span>{' '}
              {question.hint}
            </div>
          </TableCell>
        </TableRow>
      )}
      {hasRallyes && (
        <TableRow className="bg-muted/40 text-muted-foreground border-0">
          {leadingCells}
          <TableCell
            colSpan={colSpan}
            title={`${rallyeLabel}: ${rallyeNames.join(', ')}`}
            className="py-1.5"
          >
            <div className="pl-5 border-l border-border/40 text-xs">
              <span className="font-medium text-muted-foreground/80">
                {rallyeLabel}:
              </span>{' '}
              {rallyeNames.join(', ')}
            </div>
          </TableCell>
        </TableRow>
      )}
      {hasAnswers && (
        <TableRow className="bg-muted/40 text-muted-foreground border-0">
          {leadingCells}
          <TableCell colSpan={colSpan} className="py-1">
            <div className="pl-5 border-l border-border/40 text-xs flex items-center gap-2">
              <span className="font-medium text-muted-foreground/80 whitespace-nowrap">
                {answersLabel}:
              </span>
              <div className="min-w-0 flex-1 truncate" title={answersTitle}>
                {answers.map((answer, index) => (
                  <span
                    key={answer.id ?? `${question.id}-${index}`}
                    className="inline-flex items-center gap-1"
                  >
                    {answer.correct ? (
                      <Check className="h-3 w-3 text-success/70" />
                    ) : (
                      <X className="h-3 w-3 text-destructive/70" />
                    )}
                    <span>{answer.text?.trim() || '-'}</span>
                    {index < answers.length - 1 && (
                      <span className="mx-1 text-muted-foreground/60">|</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export default QuestionDetailsRows;
