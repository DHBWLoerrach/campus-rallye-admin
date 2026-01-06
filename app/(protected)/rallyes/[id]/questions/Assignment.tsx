'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Pencil } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Question } from '@/helpers/questions';
import { getQuestions } from '@/actions/question';
import { questionTypes } from '@/helpers/questionTypes';
import {
  assignQuestionsToRallye,
  getQuestionRallyeMap,
  getRallyeQuestions,
} from '@/actions/assign_questions_to_rallye';
import SearchFilters from '@/components/questions/SearchFilters';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import QuestionDetailsRows from '@/components/questions/QuestionDetailsRows';
import QuestionSummary from '@/components/questions/QuestionSummary';

interface Props {
  rallyeId: number;
  rallyeName?: string;
  initialQuestions?: Question[];
  initialSelectedQuestions?: number[];
  initialCategories?: string[];
  initialRallyeMap?: Record<number, string[]>;
}

export default function Assignment({
  rallyeId,
  rallyeName,
  initialQuestions,
  initialSelectedQuestions,
  initialCategories,
  initialRallyeMap,
}: Props) {
  const router = useRouter();
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>(
    initialSelectedQuestions || []
  );
  const [questions, setQuestions] = useState<Question[]>(
    initialQuestions || []
  );
  const [rallyeMap, setRallyeMap] = useState<Record<number, string[]>>(
    initialRallyeMap || {}
  );
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Track last saved state to detect unsaved changes.
  const savedSelectedQuestionsRef = useRef<number[]>(
    initialSelectedQuestions || []
  );

  const questionTypeLabels = questionTypes.reduce((acc, type) => {
    acc[type.id] = type.name;
    return acc;
  }, {} as Record<string, string>);

  useEffect(() => {
    if (!initialSelectedQuestions) {
      loadExistingAssignments(rallyeId);
    }
    if (!initialQuestions) {
      fetchQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rallyeId]);

  const toggleRow = (questionId: number) => {
    setExpandedRows((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId]
    );
  };

  const loadExistingAssignments = async (targetRallyeId: number) => {
    setIsLoadingAssignments(true);
    try {
      const existingQuestionsResult = await getRallyeQuestions(targetRallyeId);
      if (!existingQuestionsResult.success) {
        console.error(existingQuestionsResult.error);
        setSelectedQuestions([]);
        savedSelectedQuestionsRef.current = [];
      } else {
        const questionIds = existingQuestionsResult.data ?? [];
        setSelectedQuestions(questionIds);
        savedSelectedQuestionsRef.current = questionIds;
      }
    } catch (error) {
      console.error('Error loading existing assignments:', error);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const refreshRallyeMap = async (nextQuestions: Question[]) => {
    const questionIds = nextQuestions.map((question) => question.id);
    const nextRallyeMapResult = await getQuestionRallyeMap(questionIds);
    if (!nextRallyeMapResult.success) {
      console.error(nextRallyeMapResult.error);
      setRallyeMap({});
      return;
    }
    setRallyeMap(nextRallyeMapResult.data ?? {});
  };

  const fetchQuestions = async () => {
    setIsLoadingQuestions(true);
    try {
      const fetchedQuestionsResult = await getQuestions({});
      if (!fetchedQuestionsResult.success) {
        console.error(fetchedQuestionsResult.error);
        setQuestions([]);
        setRallyeMap({});
        return;
      }
      const fetchedQuestions = fetchedQuestionsResult.data ?? [];
      setQuestions(fetchedQuestions);
      await refreshRallyeMap(fetchedQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleFilterChange = async (filters: {
    question?: string;
    answer?: string;
    type?: string;
    category?: string;
    rallyeId?: string;
    assigned?: boolean;
  }) => {
    setIsLoadingQuestions(true);
    try {
      const filteredQuestionsResult = await getQuestions(filters);
      if (!filteredQuestionsResult.success) {
        console.error(filteredQuestionsResult.error);
        setQuestions([]);
        setRallyeMap({});
        return;
      }
      const filteredQuestions = filteredQuestionsResult.data ?? [];
      const finalQuestions =
        filters.assigned === true
          ? filteredQuestions.filter((q) => selectedQuestions.includes(q.id))
          : filteredQuestions;
      setQuestions(finalQuestions);
      await refreshRallyeMap(finalQuestions);
    } catch (error) {
      console.error('Error filtering questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const assignResult = await assignQuestionsToRallye(
        rallyeId,
        selectedQuestions
      );
      if (!assignResult.success) {
        throw new Error(assignResult.error);
      }
    } catch (error) {
      console.error('Error saving questions:', error);
    } finally {
      setIsSubmitting(false);
      await loadExistingAssignments(rallyeId);
    }
  };

  const arraysEqualAsSets = (a: number[], b: number[]) => {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    for (const x of b) if (!setA.has(x)) return false;
    return true;
  };

  const hasUnsavedChanges = !arraysEqualAsSets(
    selectedQuestions,
    savedSelectedQuestionsRef.current
  );

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const isLoading = isLoadingAssignments || isLoadingQuestions;

  return (
    <div className="mx-auto flex w-full max-w-350 flex-col gap-6 px-4 py-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                if (isSubmitting) return;
                if (!hasUnsavedChanges) {
                  router.push('/rallyes');
                  return;
                }
                setPendingHref('/rallyes');
                setShowLeaveConfirm(true);
              }}
            >
              ← Zurück zu Rallyes
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <span>Aktuell zugeordnet</span>
              <span className="text-foreground">
                {selectedQuestions.length}
              </span>
            </div>
          </div>
          <Button asChild variant="dhbwStyle" size="sm">
            <Link
              href={`/questions/new?returnTo=${encodeURIComponent(
                `/rallyes/${rallyeId}/questions`
              )}&rallyeId=${rallyeId}`}
            >
              Neue Frage
            </Link>
          </Button>
        </div>
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Rallye
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Fragen zuordnen
          </h1>
          <p className="text-sm text-muted-foreground">
            {rallyeName
              ? `Rallye „${rallyeName}“`
              : 'Fragen einer Rallye zuordnen'}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <SearchFilters
          onFilterChange={handleFilterChange}
          categories={initialCategories ?? []}
        />
        {isLoading && (
          <p className="text-xs text-muted-foreground">Lade Daten...</p>
        )}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90">
          <div className="max-h-[60vh] overflow-y-auto">
            <Table className="text-sm [&_th]:h-9 [&_th]:px-3 [&_td]:px-3 [&_td]:py-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Auswahl</TableHead>
                  <TableHead>Frage</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="w-12 text-center">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.length === 0 ? (
                  isLoadingQuestions ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        Lade Fragen...
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        Keine Fragen verfügbar
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  questions.map((question) => {
                    const rallyeNames = rallyeMap[question.id] ?? [];

                    return (
                      <Fragment key={question.id}>
                        <TableRow>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedQuestions.includes(
                                  question.id
                                )}
                                onCheckedChange={(checked) => {
                                  const isChecked = checked === true;
                                  setSelectedQuestions((prev) =>
                                    isChecked
                                      ? prev.includes(question.id)
                                        ? prev
                                        : [...prev, question.id]
                                      : prev.filter((id) => id !== question.id)
                                  );
                                }}
                              />
                              <ChevronDown
                                className={`h-4 w-4 cursor-pointer text-muted-foreground transition-transform hover:text-foreground ${
                                  expandedRows.includes(question.id)
                                    ? 'rotate-180'
                                    : ''
                                }`}
                                onClick={() => toggleRow(question.id)}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <QuestionSummary
                              question={question}
                              rallyeNames={rallyeNames}
                            />
                          </TableCell>
                          <TableCell>
                            {questionTypeLabels[question.type]}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                              <Link
                                href={`/questions/${
                                  question.id
                                }?returnTo=${encodeURIComponent(
                                  `/rallyes/${rallyeId}/questions`
                                )}`}
                              >
                                <Pencil
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                                <span className="sr-only">Bearbeiten</span>
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                        <QuestionDetailsRows
                          question={question}
                          rallyeNames={rallyeNames}
                          isExpanded={expandedRows.includes(question.id)}
                          leadingCellsCount={1}
                          colSpan={3}
                        />
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              loadExistingAssignments(rallyeId);
            }}
          >
            Zurücksetzen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant="dhbwStyle"
          >
            Speichern
          </Button>
        </div>
      </section>

      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ungespeicherte Änderungen</DialogTitle>
            <DialogDescription>
              Es gibt ungespeicherte Änderungen. Möchten Sie speichern,
              verwerfen oder abbrechen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                setShowLeaveConfirm(false);
                router.push(pendingHref || '/rallyes');
              }}
            >
              Verwerfen
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowLeaveConfirm(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="dhbwStyle"
              disabled={isSubmitting}
              onClick={async () => {
                await handleSubmit();
                setShowLeaveConfirm(false);
                router.push(pendingHref || '/rallyes');
              }}
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
