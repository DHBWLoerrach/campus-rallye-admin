'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getQuestionRallyeMap } from '@/actions/assign_questions_to_rallye';
import { getQuestions } from '@/actions/question';
import { Button, buttonVariants } from '@/components/ui/button';
import QuestionsTable from './QuestionsTable';
import type { Question } from '@/helpers/questions';
import SearchFilters from './SearchFilters';
import type { RallyeOption } from '@/lib/types';
import type { QuestionCatalogFilters } from '@/lib/question-filters';

interface Props {
  initialQuestions: Question[] | null;
  categories: string[];
  rallyes: RallyeOption[];
  initialRallyeMap: Record<number, string[]> | null;
}

type CatalogState =
  | { status: 'loading' | 'error' }
  | {
      status: 'success';
      questions: Question[];
      rallyeMap: Record<number, string[]> | null;
    };

export default function QuestionManagement({
  initialQuestions,
  categories,
  rallyes,
  initialRallyeMap,
}: Props) {
  const [catalog, setCatalog] = useState<CatalogState>(() =>
    initialQuestions === null
      ? { status: 'error' }
      : {
          status: 'success',
          questions: initialQuestions,
          rallyeMap: initialRallyeMap,
        }
  );
  const [filters, setFilters] = useState<QuestionCatalogFilters>({});
  const [filterResetKey, setFilterResetKey] = useState(0);
  const requestId = useRef(0);
  const hasActiveFilters = Boolean(
    filters.search?.trim() ||
    [filters.type, filters.category, filters.rallyeId].some(
      (value) => value && value !== 'all'
    )
  );

  const handleFilterChange = async (filters: QuestionCatalogFilters) => {
    const currentRequestId = ++requestId.current;
    setFilters(filters);
    setCatalog({ status: 'loading' });

    // Only the latest search may publish results, including errors and usage.
    let questions: Question[];
    try {
      const result = await getQuestions(filters);
      if (currentRequestId !== requestId.current) return;
      if (!result.success) {
        setCatalog({ status: 'error' });
        return;
      }
      questions = result.data ?? [];
    } catch {
      if (currentRequestId === requestId.current) {
        setCatalog({ status: 'error' });
      }
      return;
    }

    if (questions.length === 0) {
      setCatalog({ status: 'success', questions, rallyeMap: {} });
      return;
    }

    let rallyeMap: Record<number, string[]> | null = null;
    try {
      const result = await getQuestionRallyeMap(
        questions.map((question) => question.id)
      );
      if (result.success) rallyeMap = result.data ?? {};
    } catch {
      // A failed usage request must not imply that questions are unused.
    }
    if (currentRequestId === requestId.current) {
      setCatalog({ status: 'success', questions, rallyeMap });
    }
  };

  const resetFilters = () => {
    setFilterResetKey((key) => key + 1);
    void handleFilterChange({});
  };

  const errorMessage =
    catalog.status === 'error'
      ? 'Fragen konnten nicht geladen werden.'
      : catalog.status === 'success' && catalog.rallyeMap === null
        ? 'Rallye-Verwendungen konnten nicht geladen werden.'
        : null;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Fragen
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Fragenkatalog
          </h1>
          <p className="text-sm text-muted-foreground">
            Suchen, filtern und bearbeiten.
          </p>
        </div>
        <Link
          href="/questions/new"
          className={buttonVariants({
            variant: 'dhbwStyle',
            className: 'w-full sm:w-auto',
          })}
        >
          <Plus className="w-4 h-4" />
          Erstellen
        </Link>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <SearchFilters
          key={filterResetKey}
          onFilterChange={handleFilterChange}
          categories={categories}
          rallyes={rallyes}
        />
        <div role="status" aria-live="polite" className="empty:sr-only">
          {catalog.status === 'loading' && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Fragen werden geladen …
            </p>
          )}
          {catalog.status === 'success' && catalog.questions.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
              <p>
                {hasActiveFilters
                  ? 'Keine Fragen für diese Filter gefunden.'
                  : 'Noch keine Fragen vorhanden.'}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={resetFilters}>
                  Filter zurücksetzen
                </Button>
              ) : (
                <p>Lege über „Erstellen“ die erste Frage an.</p>
              )}
            </div>
          )}
        </div>
        {errorMessage && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
            <Button
              variant="outline"
              onClick={() => handleFilterChange(filters)}
            >
              Erneut versuchen
            </Button>
          </div>
        )}
        {catalog.status === 'success' && catalog.questions.length > 0 && (
          <QuestionsTable
            questions={catalog.questions}
            rallyeMap={catalog.rallyeMap}
          />
        )}
      </section>
    </div>
  );
}
