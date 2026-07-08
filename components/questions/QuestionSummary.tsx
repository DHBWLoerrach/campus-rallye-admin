import { Image as ImageIcon, Lightbulb } from 'lucide-react';
import type { Question } from '@/helpers/questions';

interface QuestionSummaryProps {
  question: Question;
}

const QuestionSummary = ({ question }: QuestionSummaryProps) => {
  const hasImage = Boolean(question.bucket_path);
  const hasHint = Boolean(question.hint?.trim());
  const showMeta = hasImage || hasHint;

  return (
    <div className="flex flex-col gap-1">
      <span className="truncate">{question.content}</span>
      {showMeta && (
        <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground">
          {hasImage && (
            <span className="inline-flex items-center" title="Bild vorhanden">
              <ImageIcon className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">Bild vorhanden</span>
            </span>
          )}
          {hasHint && (
            <span
              className="inline-flex items-center"
              title="Hinweis vorhanden"
            >
              <Lightbulb className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">Hinweis vorhanden</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionSummary;
