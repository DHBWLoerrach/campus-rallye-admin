'use client';
import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '@/actions/question';
import { Question, QuestionFormData } from '@/helpers/questions';
import type { RallyeOption } from '@/lib/types';
import { Button } from '@/components/ui/button';
import QuestionForm from '@/components/questions/id/QuestionForm';

interface Props {
  id: string;
  initialData: Question | null;
  categories: string[];
  rallyes: RallyeOption[];
  initialRallyeIds: number[];
}

const QuestionPage: React.FC<Props> = ({
  id,
  initialData,
  categories,
  rallyes,
  initialRallyeIds,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = id === 'new';
  const returnToParam = searchParams.get('returnTo') ?? '';
  const returnTo = returnToParam.startsWith('/') ? returnToParam : '/questions';
  const hasReturnTarget = returnToParam.startsWith('/');
  const isRallyeContext = returnToParam.startsWith('/rallyes/');
  const returnLabel = isRallyeContext ? '← Zurück zu Rallye' : '← Zurück';
  const rallyeIdParam = searchParams.get('rallyeId') ?? '';
  const rallyeIdValue = rallyeIdParam ? Number(rallyeIdParam) : Number.NaN;
  const effectiveRallyeIds =
    isNew && !Number.isNaN(rallyeIdValue) ? [rallyeIdValue] : initialRallyeIds;
  const assignedRallyeIds = new Set(effectiveRallyeIds);
  const assignedRallyes = rallyes.filter((rallye) =>
    assignedRallyeIds.has(rallye.id)
  );
  const hasAssignments = effectiveRallyeIds.length > 0;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const unsavedChangesMessage =
    'Ungespeicherte Änderungen gehen verloren. Möchten Sie die Seite wirklich verlassen?';

  useUnsavedChangesGuard(isDirty, unsavedChangesMessage);

  const handleSubmit = async (data: QuestionFormData) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (id !== 'new') {
        const result = await updateQuestion(Number(id), {
          ...data,
          answers: data.answers || [],
        });
        if (!result.success) {
          setSubmitError(result.error);
          return;
        }
      } else {
        const result = await createQuestion({
          ...data,
          answers: data.answers || [],
        });
        if (!result.success) {
          setSubmitError(result.error);
          return;
        }
      }
      router.push(returnTo);
    } catch (error) {
      console.error('Error submitting data:', error);
      setSubmitError('Speichern fehlgeschlagen');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm(unsavedChangesMessage)) {
      return;
    }
    router.push(returnTo);
  };

  const handleDelete = async () => {
    if (id && id !== 'new') {
      const result = await deleteQuestion(Number(id));
      if (!result.success) {
        setSubmitError(result.error);
        return;
      }
      router.push(returnTo);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {hasReturnTarget && (
            <div className="mb-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={isSubmitting}
                onClick={handleCancel}
                className="cursor-pointer"
              >
                {returnLabel}
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Fragen
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            {id === 'new' ? 'Neue Frage erstellen' : 'Frage bearbeiten'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {id === 'new'
              ? 'Frage formulieren, Antworten definieren und optional ein Bild hinterlegen.'
              : 'Inhalt, Antworten und Metadaten aktualisieren.'}
          </p>
        </div>
      </section>

      {hasAssignments && (
        <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm">
          <span className="font-medium">Zugeordnet zu:</span>{' '}
          {assignedRallyes.length > 0 ? (
            <>
              {assignedRallyes.map((rallye, index) => (
                <React.Fragment key={rallye.id}>
                  <Link
                    href={`/rallyes/${rallye.id}/questions`}
                    className="underline underline-offset-2"
                  >
                    {rallye.name}
                  </Link>
                  {index < assignedRallyes.length - 1 ? ', ' : ''}
                </React.Fragment>
              ))}
              {assignedRallyes.length > 1 && (
                <span className="ml-2 text-muted-foreground">
                  Wirkt in allen zugeordneten Rallyes.
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Unbekannte Rallyes</span>
          )}
        </div>
      )}

      {submitError && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <section className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <QuestionForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onDelete={id !== 'new' ? handleDelete : undefined}
          initialData={initialData}
          categories={categories}
          rallyes={rallyes}
          initialRallyeIds={effectiveRallyeIds}
          isSubmitting={isSubmitting}
          onDirtyChange={setIsDirty}
        />
      </section>
    </div>
  );
};

export default QuestionPage;
