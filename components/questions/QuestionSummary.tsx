import { Image as ImageIcon, Lightbulb } from 'lucide-react';
import type { Question } from '@/helpers/questions';

interface QuestionSummaryProps {
  question: Question;
}

const QuestionSummary = ({ question }: QuestionSummaryProps) => {
  const hasImage = Boolean(question.bucket_path);
  const hasHint = Boolean(question.hint?.trim());
  const category = question.category?.trim();
  const solutionPreview = question.solutionOptions
    ?.find((answer) => answer.correct && answer.text?.trim())
    ?.text?.trim();
  const solutionPreviewLabel =
    question.type === 'qr_code' ||
    (question.type === 'geocaching' && question.geocaching?.input_type === 'qr')
      ? 'QR-Code-Inhalt'
      : 'Lösung';
  const showMeta = hasImage || hasHint || Boolean(category);

  return (
    <div className="flex min-w-60 flex-col gap-1.5">
      <span className="line-clamp-2 font-medium text-foreground">
        {question.content}
      </span>
      {solutionPreview && question.type !== 'upload' && (
        <span className="truncate text-xs text-muted-foreground">
          <span className="font-medium text-foreground/75">
            {solutionPreviewLabel}:
          </span>{' '}
          {solutionPreview}
        </span>
      )}
      {showMeta && (
        <div className="flex flex-wrap items-center gap-1.5 text-[0.7rem] text-muted-foreground">
          {category && (
            <span className="rounded-full bg-muted px-2 py-0.5">
              {category}
            </span>
          )}
          {hasImage && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
              title="Bild vorhanden"
            >
              <ImageIcon className="h-3 w-3" aria-hidden="true" />
              Mit Bild
            </span>
          )}
          {hasHint && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
              title="Hinweis vorhanden"
            >
              <Lightbulb className="h-3 w-3" aria-hidden="true" />
              Mit Hinweis
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionSummary;
