'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { useRouter } from 'next/navigation';
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
  const [votingQuestions, setVotingQuestions] = useState<number[]>(
    initialVotingQuestions || []
  );
  const [pendingVotingChanges, setPendingVotingChanges] = useState<{
    add: number[];
    remove: number[];
  }>({ add: [], remove: [] });

  // Track last saved state to detect unsaved changes (using refs to avoid effect sync)
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
    // If no initial data provided (edge case), fetch on mount
    if (!initialSelectedQuestions || !initialVotingQuestions) {
      loadExistingAssignments(rallyeId);
    }
    if (!initialQuestions) {
      fetchQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rallyeId]);

  const loadExistingAssignments = async (rallyeId: number) => {
    try {
      const [existingQuestions, existingVotes] = await Promise.all([
        getRallyeQuestions(rallyeId),
        getVotingQuestions(rallyeId),
      ]);
      setSelectedQuestions(existingQuestions);
      setVotingQuestions(existingVotes);
      // Update saved baselines to what exists in DB now
      savedSelectedQuestionsRef.current = existingQuestions;
      savedVotingQuestionsRef.current = existingVotes;
    } catch (error) {
      console.error('Error loading existing assignments:', error);
      // todo return error message
    }
  };

  const fetchQuestions = async () => {
    const questions = await getQuestions({});
    setQuestions(questions);
  };

  const handleFilterChange = async (filters: {
    question?: string;
    answer?: string;
    type?: string;
    category?: string;
    assigned?: boolean;
  }) => {
    const filteredQuestions = await getQuestions(filters);
    const finalQuestions =
      filters.assigned === true
        ? filteredQuestions.filter((q) => selectedQuestions.includes(q.id))
        : filteredQuestions;
    setQuestions(finalQuestions);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await Promise.all([
        assignQuestionsToRallye(rallyeId, selectedQuestions),
        updateVotingBatch(
          rallyeId,
          pendingVotingChanges.add,
          pendingVotingChanges.remove
        ),
      ]);
      // Reset pending changes
      setPendingVotingChanges({ add: [], remove: [] });
      // Baselines will be refreshed by loadExistingAssignments below
      // Show success message
    } catch (error) {
      // Show error message
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

  // Navigation confirm dialog state
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="mb-2">
            <Button
              variant="ghost"
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
          </div>
          <CardTitle>
            {rallyeName
              ? `Fragen der Rallye "${rallyeName}" zuordnen`
              : 'Fragen einer Rallye zuordnen'}
          </CardTitle>
          <CardDescription>
            Aktuell zugeordnet: {selectedQuestions.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="sticky top-0 z-10 bg-card">
              <SearchFilters
                onFilterChange={handleFilterChange}
                categories={initialCategories ?? []}
              />
            </div>
            <div className="border rounded-md h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Auswahl</TableHead>
                    <TableHead>Frage</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="w-20">Punkte</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead className="w-8">Abstimmung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Keine Fragen verfügbar
                      </TableCell>
                    </TableRow>
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
                        <TableCell>
                          {questionTypeLabels[question.type]}
                        </TableCell>
                        <TableCell>{question.points}</TableCell>
                        <TableCell>{question.category}</TableCell>
                        <TableCell>
                          <div className="justify-center flex">
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
                                  ? 'data-[state=checked]:bg-gray-200 data-[state=unchecked]:bg-gray-100 border-dashed border-gray-400'
                                  : ''
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => {
                // reload assignments for current rallye
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
        </CardContent>
      </Card>
      {/* Unsaved changes confirmation dialog */}
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
              variant="secondary"
              onClick={() => {
                // discard changes and navigate
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
              className="bg-red-600 hover:bg-red-700 text-white"
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
