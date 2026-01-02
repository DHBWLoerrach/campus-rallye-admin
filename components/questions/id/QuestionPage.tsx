'use client';
import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const returnLabel = isRallyeContext ? 'Zurück zur Rallye' : 'Zurück';
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

  const handleSubmit = async (data: QuestionFormData) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (id !== 'new') {
        await updateQuestion(Number(id), {
          ...data,
          answers: data.answers || [],
        });
      } else {
        await createQuestion({
          ...data,
          answers: data.answers || [],
        });
      }
      router.push(returnTo);
    } catch (error) {
      console.error('Error submitting data:', error);
      // todo return error message
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(returnTo);
  };

  const handleDelete = async () => {
    if (id && id !== 'new') {
      await deleteQuestion(Number(id));
      router.push(returnTo);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {hasReturnTarget && (
        <div className="mb-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={returnTo}>{returnLabel}</Link>
          </Button>
        </div>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
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
        />
      </section>
    </div>
  );
};

export default QuestionPage;
