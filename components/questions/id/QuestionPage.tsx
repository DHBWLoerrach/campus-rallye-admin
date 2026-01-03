'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  const pathname = usePathname();
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const hasGuardRef = useRef(false);
  const allowNextPopRef = useRef(false);
  const currentUrl = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
  const currentUrlRef = useRef(currentUrl);
  const unsavedChangesMessage =
    'Ungespeicherte Änderungen gehen verloren. Möchten Sie die Seite wirklich verlassen?';

  useEffect(() => {
    currentUrlRef.current = currentUrl;
  }, [currentUrl]);

  const handleDirtyChange = (nextDirty: boolean) => {
    isDirtyRef.current = nextDirty;
    setIsDirty(nextDirty);
  };

  useEffect(() => {
    if (!isDirty || hasGuardRef.current) return;
    window.history.pushState({ guard: true }, '', currentUrlRef.current);
    hasGuardRef.current = true;
  }, [isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const handlePopState = () => {
      if (allowNextPopRef.current) {
        allowNextPopRef.current = false;
        return;
      }

      if (!isDirtyRef.current) {
        if (hasGuardRef.current) {
          allowNextPopRef.current = true;
          window.history.back();
        }
        return;
      }

      const confirmLeave = window.confirm(unsavedChangesMessage);
      if (confirmLeave) {
        allowNextPopRef.current = true;
        window.history.back();
        return;
      }

      window.history.pushState({ guard: true }, '', currentUrlRef.current);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [unsavedChangesMessage]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!isDirtyRef.current || event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!anchor || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (anchor.target && anchor.target !== '_self') return;

      const targetUrl = new URL(anchor.href, window.location.href);
      if (targetUrl.href === window.location.href) return;

      const confirmLeave = window.confirm(unsavedChangesMessage);
      if (!confirmLeave) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [unsavedChangesMessage]);

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
    if (isDirtyRef.current && !window.confirm(unsavedChangesMessage)) {
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
      {hasReturnTarget && (
        <div className="mb-2">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            {returnLabel}
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
          onDirtyChange={handleDirtyChange}
        />
      </section>
    </div>
  );
};

export default QuestionPage;
