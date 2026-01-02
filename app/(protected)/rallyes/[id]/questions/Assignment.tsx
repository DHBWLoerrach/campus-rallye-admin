'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { updateVotingBatch, getVotingQuestions } from '@/actions/voting';

interface Props {
  rallyeId: number;
  rallyeName?: string;
  initialQuestions?: Question[];
  initialSelectedQuestions?: number[];
  initialVotingQuestions?: number[];
  initialCategories?: string[];
}

export default function Assignment({
  rallyeId,
  rallyeName,
  initialQuestions,
  initialSelectedQuestions,
  initialVotingQuestions,
  initialCategories,
}: Props) {
  const router = useRouter();
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>(
    initialSelectedQuestions || []
  );
  const [questions, setQuestions] = useState<Question[]>(
    initialQuestions || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [votingQuestions, setVotingQuestions] = useState<number[]>(
    initialVotingQuestions || []
  );
  const [pendingVotingChanges, setPendingVotingChanges] = useState<{
    add: number[];
    remove: number[];
  }>({ add: [], remove: [] });

  // Track last saved state to detect unsaved changes.
  const savedSelectedQuestionsRef = useRef<number[]>(
    initialSelectedQuestions || []
  );
  const savedVotingQuestionsRef = useRef<number[]>(
    initialVotingQuestions || []
  );

  const questionTypeLabels = questionTypes.reduce((acc, type) => {
    acc[type.id] = type.name;
    return acc;
  }, {} as Record<string, string>);

  useEffect(() => {
    if (!initialSelectedQuestions || !initialVotingQuestions) {
      loadExistingAssignments(rallyeId);
    }
    if (!initialQuestions) {
      fetchQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rallyeId]);

  const loadExistingAssignments = async (targetRallyeId: number) => {
    setIsLoadingAssignments(true);
    try {
      const [existingQuestionsResult, existingVotesResult] = await Promise.all([
        getRallyeQuestions(targetRallyeId),
        getVotingQuestions(targetRallyeId),
      ]);
      if (!existingQuestionsResult.success) {
        console.error(existingQuestionsResult.error);
        setSelectedQuestions([]);
        savedSelectedQuestionsRef.current = [];
      } else {
        const questionIds = existingQuestionsResult.data ?? [];
        setSelectedQuestions(questionIds);
        savedSelectedQuestionsRef.current = questionIds;
      }
      if (!existingVotesResult.success) {
        console.error(existingVotesResult.error);
        setVotingQuestions([]);
        savedVotingQuestionsRef.current = [];
      } else {
        const voteIds = existingVotesResult.data ?? [];
        setVotingQuestions(voteIds);
        savedVotingQuestionsRef.current = voteIds;
      }
    } catch (error) {
      console.error('Error loading existing assignments:', error);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const fetchQuestions = async () => {
    setIsLoadingQuestions(true);
    try {
      const fetchedQuestionsResult = await getQuestions({});
      if (!fetchedQuestionsResult.success) {
        console.error(fetchedQuestionsResult.error);
        setQuestions([]);
        return;
      }
      setQuestions(fetchedQuestionsResult.data ?? []);
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
        return;
      }
      const filteredQuestions = filteredQuestionsResult.data ?? [];
      const finalQuestions =
        filters.assigned === true
          ? filteredQuestions.filter((q) => selectedQuestions.includes(q.id))
          : filteredQuestions;
      setQuestions(finalQuestions);
    } catch (error) {
      console.error('Error filtering questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const [assignResult, votingResult] = await Promise.all([
        assignQuestionsToRallye(rallyeId, selectedQuestions),
        updateVotingBatch(
          rallyeId,
          pendingVotingChanges.add,
          pendingVotingChanges.remove
        ),
      ]);
      if (!assignResult.success) {
        throw new Error(assignResult.error);
      }
      if (!votingResult.success) {
        throw new Error(votingResult.error);
      }
      setPendingVotingChanges({ add: [], remove: [] });
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

  const hasUnsavedChanges =
    !arraysEqualAsSets(selectedQuestions, savedSelectedQuestionsRef.current) ||
    !arraysEqualAsSets(votingQuestions, savedVotingQuestionsRef.current) ||
    pendingVotingChanges.add.length > 0 ||
    pendingVotingChanges.remove.length > 0;

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const isLoading = isLoadingAssignments || isLoadingQuestions;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6">
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
              <span className="text-foreground">{selectedQuestions.length}</span>
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

      <section className="space-y-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="sticky top-0 z-10 rounded-2xl bg-card/80 p-3 backdrop-blur">
          <SearchFilters
            onFilterChange={handleFilterChange}
            categories={initialCategories ?? []}
          />
        </div>
        {isLoading && (
          <p className="text-xs text-muted-foreground">Lade Daten...</p>
        )}
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90">
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Auswahl</TableHead>
                  <TableHead>Frage</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="w-20">Punkte</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead className="w-8">Abstimmung</TableHead>
                  <TableHead className="w-28">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.length === 0 ? (
                  isLoadingQuestions ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Lade Fragen...
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Keine Fragen verfügbar
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedQuestions.includes(question.id)}
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
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {question.content}
                      </TableCell>
                      <TableCell>{questionTypeLabels[question.type]}</TableCell>
                      <TableCell>{question.points}</TableCell>
                      <TableCell>{question.category}</TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Checkbox
                            disabled={
                              !['upload', 'knowledge'].includes(question.type)
                            }
                            checked={votingQuestions.includes(question.id)}
                            onCheckedChange={(checked) => {
                              const isChecked = checked === true;
                              setVotingQuestions((prev) =>
                                isChecked
                                  ? prev.includes(question.id)
                                    ? prev
                                    : [...prev, question.id]
                                  : prev.filter((id) => id !== question.id)
                              );
                              setPendingVotingChanges((prev) => {
                                const add = new Set(prev.add);
                                const remove = new Set(prev.remove);
                                if (isChecked) {
                                  add.add(question.id);
                                  remove.delete(question.id);
                                } else {
                                  add.delete(question.id);
                                  remove.add(question.id);
                                }
                                return {
                                  add: Array.from(add),
                                  remove: Array.from(remove),
                                };
                              });
                            }}
                            className={
                              !['upload', 'knowledge'].includes(question.type)
                                ? 'border-dashed border-border/70 bg-muted/40 text-muted-foreground data-[state=checked]:bg-muted data-[state=checked]:text-muted-foreground data-[state=unchecked]:bg-muted/60'
                                : ''
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/questions/${
                              question.id
                            }?returnTo=${encodeURIComponent(
                              `/rallyes/${rallyeId}/questions`
                            )}`}
                          >
                            Bearbeiten
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
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
              setPendingVotingChanges({ add: [], remove: [] });
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
