'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  CircleMinus,
  CirclePlus,
  Info,
  Pencil,
  Plus,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Question } from '@/helpers/questions';
import { getQuestions } from '@/actions/question';
import { questionTypes } from '@/helpers/questionTypes';
import {
  assignQuestionsToRallye,
  getQuestionRallyeMap,
  getVotingQuestions,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  rallyeId: number;
  rallyeName?: string;
  initialQuestions?: Question[];
  initialSelectedQuestions?: number[];
  initialVotingQuestionIds?: number[];
  initialCategories?: string[];
  initialRallyeMap?: Record<number, string[]>;
  maxPoints?: number;
}

export default function Assignment({
  rallyeId,
  rallyeName,
  initialQuestions,
  initialSelectedQuestions,
  initialVotingQuestionIds,
  initialCategories,
  initialRallyeMap,
  maxPoints = 0,
}: Props) {
  const router = useRouter();

  // "Assigned" Questions (Right Column) - The Source of Truth for the assignment.
  // Initialize from server data when all selected IDs are present in initialQuestions;
  // otherwise start empty and let the effect lazy-load via loadExistingAssignments.
  const [assignedQuestions, setAssignedQuestions] = useState<Question[]>(() => {
    if (!initialQuestions || !initialSelectedQuestions) return [];
    const assigned = initialQuestions.filter((q) =>
      initialSelectedQuestions.includes(q.id)
    );
    return assigned.length === initialSelectedQuestions.length ? assigned : [];
  });

  // "Available" Questions (Left Column) - Fetched from server based on filters
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>(
    initialQuestions || []
  );

  const [rallyeMap, setRallyeMap] = useState<Record<number, string[]>>(
    initialRallyeMap || {}
  );
  const [votingQuestionIds, setVotingQuestionIds] = useState<Set<number>>(
    () => new Set(initialVotingQuestionIds || [])
  );

  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  // Animation state for flash effects
  const [recentlyAdded, setRecentlyAdded] = useState<Set<number>>(new Set());
  const [recentlyRemoved, setRecentlyRemoved] = useState<Set<number>>(
    new Set()
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Track last saved state to detect unsaved changes (list of IDs).
  const [savedAssignedIds, setSavedAssignedIds] = useState<number[]>(
    initialSelectedQuestions || []
  );
  const [savedVotingQuestionIds, setSavedVotingQuestionIds] = useState<
    number[]
  >(initialVotingQuestionIds || []);

  const questionTypeLabels = questionTypes.reduce(
    (acc, type) => {
      acc[type.id] = type.name;
      return acc;
    },
    {} as Record<string, string>
  );

  const toggleRow = (questionId: number) => {
    setExpandedRows((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId]
    );
  };

  const refreshRallyeMap = async (nextQuestions: Question[]) => {
    // Only fetch for IDs we don't know yet? Or just refresh batch.
    const questionIds = nextQuestions.map((question) => question.id);
    if (questionIds.length === 0) return;

    // Optimization: filter out already known IDs if we want, but for now simple batch
    const nextRallyeMapResult = await getQuestionRallyeMap(questionIds);
    if (!nextRallyeMapResult.success) {
      console.error(nextRallyeMapResult.error);
      return;
    }
    setRallyeMap((prev) => ({ ...prev, ...(nextRallyeMapResult.data ?? {}) }));
  };

  const loadExistingAssignments = async (targetRallyeId: number) => {
    setIsLoadingAssignments(true);
    try {
      // Fetch specifically the questions assigned to this rallye
      const [assignedResult, votingResult] = await Promise.all([
        getQuestions({
          rallyeId: String(targetRallyeId),
        }),
        getVotingQuestions(targetRallyeId),
      ]);
      if (!assignedResult.success) {
        console.error(assignedResult.error);
        setAssignedQuestions([]);
        setSavedAssignedIds([]);
        setVotingQuestionIds(new Set());
        setSavedVotingQuestionIds([]);
      } else {
        const questions = assignedResult.data ?? [];
        const nextVotingQuestionIds = votingResult.success
          ? (votingResult.data ?? [])
          : [];
        if (!votingResult.success) {
          console.error(votingResult.error);
        }
        setAssignedQuestions(questions);
        setSavedAssignedIds(questions.map((q) => q.id));
        setVotingQuestionIds(new Set(nextVotingQuestionIds));
        setSavedVotingQuestionIds(nextVotingQuestionIds);

        // Ensure we have rallye map for these
        refreshRallyeMap(questions);
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
        setAvailableQuestions([]);
        return;
      }
      const fetchedQuestions = fetchedQuestionsResult.data ?? [];
      setAvailableQuestions(fetchedQuestions);
      await refreshRallyeMap(fetchedQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  useEffect(() => {
    // Initial server data may be incomplete (e.g. filtered list excluded some
    // selected IDs). In that case fetch the assigned questions specifically.
    const allPresent =
      initialQuestions &&
      initialSelectedQuestions &&
      initialSelectedQuestions.every((id) =>
        initialQuestions.some((q) => q.id === id)
      );

    if (!allPresent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadExistingAssignments(rallyeId);
    }

    if (!initialQuestions) {
      fetchQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rallyeId]);

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
      // If "assigned" filter is checked, we might just filter client side?
      // But the "assigned" filter in SearchFilters is usually "Show only assigned".
      // In this split view, "assigned" filter might be confusing.
      // We should probably ignore it or apply it to the LEFT column (e.g. show only available questions that are assigned to *some* rallye? Unlikely use case).
      // Let's assume standard filters apply to the LEFT column.

      const filteredQuestionsResult = await getQuestions(filters);
      if (!filteredQuestionsResult.success) {
        setAvailableQuestions([]);
        return;
      }
      const filteredQuestions = filteredQuestionsResult.data ?? [];
      setAvailableQuestions(filteredQuestions);
      await refreshRallyeMap(filteredQuestions);
    } catch (error) {
      console.error('Error filtering questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Move from Left to Right
  const assignQuestion = (question: Question) => {
    if (assignedQuestions.some((q) => q.id === question.id)) return;
    setAssignedQuestions((prev) => [...prev, question]);

    // Trigger green flash animation
    setRecentlyAdded((prev) => new Set(prev).add(question.id));
    setTimeout(() => {
      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        next.delete(question.id);
        return next;
      });
    }, 600);
  };

  // Move from Right to Left (Remove)
  const unassignQuestion = (questionId: number) => {
    // Trigger red flash animation first
    setRecentlyRemoved((prev) => new Set(prev).add(questionId));
    setTimeout(() => {
      setAssignedQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setVotingQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      setRecentlyRemoved((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });

      // Trigger green flash in the available (left) table
      setRecentlyAdded((prev) => new Set(prev).add(questionId));
      setTimeout(() => {
        setRecentlyAdded((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
      }, 600);
    }, 400);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const currentIds = assignedQuestions.map((q) => q.id);
      const uploadQuestionIds = new Set(
        assignedQuestions
          .filter((question) => question.type === 'upload')
          .map((question) => question.id)
      );
      const currentVotingQuestionIds = Array.from(votingQuestionIds).filter(
        (questionId) =>
          currentIds.includes(questionId) && uploadQuestionIds.has(questionId)
      );
      const assignResult = await assignQuestionsToRallye(
        rallyeId,
        currentIds,
        currentVotingQuestionIds
      );
      if (!assignResult.success) {
        throw new Error(assignResult.error);
      }
      setSavedAssignedIds(currentIds);
      setSavedVotingQuestionIds(currentVotingQuestionIds);
    } catch (error) {
      console.error('Error saving questions:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const arraysEqualAsSets = (a: number[], b: number[]) => {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    for (const x of b) if (!setA.has(x)) return false;
    return true;
  };

  const hasUnsavedChanges =
    !arraysEqualAsSets(
      assignedQuestions.map((q) => q.id),
      savedAssignedIds
    ) ||
    !arraysEqualAsSets(Array.from(votingQuestionIds), savedVotingQuestionIds);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Derived list for Left Column: Available MINUS Assigned
  // This ensures a question doesn't appear on both sides
  const displayedAvailableQuestions = availableQuestions.filter(
    (availQ) =>
      !assignedQuestions.some((assignedQ) => assignedQ.id === availQ.id)
  );

  const handleVotingToggle = (questionId: number, checked: boolean) => {
    setVotingQuestionIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(questionId);
      } else {
        next.delete(questionId);
      }
      return next;
    });
  };

  const QuestionRow = ({
    question,
    action,
    votingCell,
    columnCount = 3,
  }: {
    question: Question;
    action: React.ReactNode;
    votingCell?: React.ReactNode;
    columnCount?: number;
  }) => {
    const rallyeNames = rallyeMap[question.id] ?? [];
    const isExpanded = expandedRows.includes(question.id);
    const isAdded = recentlyAdded.has(question.id);
    const isRemoved = recentlyRemoved.has(question.id);

    return (
      <Fragment>
        <TableRow
          className={`group ${isAdded ? 'animate-flash-green' : ''} ${
            isRemoved ? 'animate-flash-red' : ''
          }`}
        >
          <TableCell className="w-7.5 p-2">
            <button
              onClick={() => toggleRow(question.id)}
              className="p-1 hover:bg-muted rounded text-muted-foreground"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          </TableCell>
          <TableCell className="p-2">
            <div className="flex flex-col gap-1">
              <div className="font-medium text-sm line-clamp-2">
                {question.content}
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1 py-0 h-5 font-normal"
                >
                  {questionTypeLabels[question.type]}
                </Badge>
                {question.category && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1 py-0 h-5 font-normal text-muted-foreground"
                  >
                    {question.category}
                  </Badge>
                )}
              </div>
            </div>
          </TableCell>
          {votingCell !== undefined && (
            <TableCell className="w-28 p-2 text-center">{votingCell}</TableCell>
          )}
          <TableCell className="w-10 p-2 text-right">{action}</TableCell>
        </TableRow>
        {isExpanded && (
          <TableRow className="bg-muted/30">
            <TableCell colSpan={columnCount} className="p-0">
              <div className="p-4 border-b">
                <QuestionDetailsRows
                  question={question}
                  rallyeNames={rallyeNames}
                  isExpanded={true}
                  action={
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2"
                    >
                      <Link
                        href={`/questions/${
                          question.id
                        }?returnTo=${encodeURIComponent(
                          `/rallyes/${rallyeId}/questions`
                        )}`}
                      >
                        <Pencil className="h-3 w-3" />
                        Frage bearbeiten
                      </Link>
                    </Button>
                  }
                />
              </div>
            </TableCell>
          </TableRow>
        )}
      </Fragment>
    );
  };

  return (
    <TooltipProvider>
      <div className="mx-auto flex w-full max-w-400 flex-col gap-6 px-4 py-6">
        {/* Header Section */}
        <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={isSubmitting}
                className="cursor-pointer"
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
                ← Zurück
              </Button>
              {hasUnsavedChanges && (
                <Badge variant="destructive" className="animate-pulse">
                  Ungespeicherte Änderungen
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!hasUnsavedChanges}
                onClick={() => {
                  setShowDiscardConfirm(true);
                }}
              >
                Änderungen verwerfen
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !hasUnsavedChanges}
                variant="dhbwStyle"
              >
                {isSubmitting ? 'Speichert...' : 'Änderungen speichern'}
              </Button>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Fragen-Zuordnung: {rallyeName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {assignedQuestions.length} Fragen zugeordnet{' · '}
            <span className="font-medium text-primary">
              {maxPoints} Punkte gesamt
            </span>
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start h-auto lg:h-[calc(100vh-250px)]">
          {/* Left Column: Available */}
          <Card className="flex flex-col h-125 lg:h-full overflow-hidden border-border/60 shadow-sm bg-card/80">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>
                  Verfügbare Fragen ({displayedAvailableQuestions.length})
                </span>
                <Link
                  href={`/questions/new?returnTo=${encodeURIComponent(
                    `/rallyes/${rallyeId}/questions`
                  )}&rallyeId=${rallyeId}`}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" /> Neu
                  </Button>
                </Link>
              </CardTitle>
              <div className="mt-2">
                <SearchFilters
                  onFilterChange={handleFilterChange}
                  categories={initialCategories ?? []}
                  compact={true}
                  showAssignedToggle={false}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 relative">
              <div className="absolute inset-0 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-7.5"></TableHead>
                      <TableHead>Verfügbare Frage</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingQuestions ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center h-24 text-muted-foreground"
                        >
                          Lade Fragen...
                        </TableCell>
                      </TableRow>
                    ) : displayedAvailableQuestions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center h-24 text-muted-foreground"
                        >
                          Keine Fragen gefunden
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedAvailableQuestions.map((q) => (
                        <QuestionRow
                          key={q.id}
                          question={q}
                          action={
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-primary hover:bg-primary/10"
                                  onClick={() => assignQuestion(q)}
                                  aria-label={`add-question-${q.id}`}
                                >
                                  <CirclePlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Zur Rallye hinzufügen</p>
                              </TooltipContent>
                            </Tooltip>
                          }
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Assigned */}
          <Card className="flex flex-col h-125 lg:h-full overflow-hidden border-border/60 shadow-sm bg-card/80 ring-1 ring-border/50">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Zugewiesen ({assignedQuestions.length})</span>
                {/* Placeholder for future sorting buttons */}
              </CardTitle>
              <div className="flex items-center text-xs text-muted-foreground">
                <Info className="h-3 w-3 mr-1" />
                Reihenfolge: ohne Effekt. Anzeige in der App zufällig;
                Upload-Fragen immer zuletzt.
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 relative">
              <div className="absolute inset-0 overflow-y-auto bg-muted/10">
                <Table>
                  <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-7.5"></TableHead>
                      <TableHead>Zugeordnete Frage</TableHead>
                      <TableHead className="w-28 text-center">
                        Abstimmung
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingAssignments ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center h-24 text-muted-foreground"
                        >
                          Lade Zuordnungen...
                        </TableCell>
                      </TableRow>
                    ) : assignedQuestions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center h-24 text-muted-foreground"
                        >
                          Noch keine Fragen zugeordnet
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedQuestions.map((q) => (
                        <QuestionRow
                          key={q.id}
                          question={q}
                          columnCount={4}
                          votingCell={
                            q.type === 'upload' ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex h-8 items-center justify-center">
                                    <Checkbox
                                      checked={votingQuestionIds.has(q.id)}
                                      disabled={isSubmitting}
                                      onCheckedChange={(checked) =>
                                        handleVotingToggle(
                                          q.id,
                                          checked === true
                                        )
                                      }
                                      aria-label={`voting-question-${q.id}`}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Für Abstimmung nutzen</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )
                          }
                          action={
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => unassignQuestion(q.id)}
                                  aria-label={`remove-question-${q.id}`}
                                >
                                  <CircleMinus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Aus Rallye entfernen</p>
                              </TooltipContent>
                            </Tooltip>
                          }
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Änderungen verwerfen?</DialogTitle>
              <DialogDescription>
                Möchten Sie alle ungespeicherten Änderungen wirklich verwerfen?
                Dieser Vorgang kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDiscardConfirm(false)}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  loadExistingAssignments(rallyeId);
                  setShowDiscardConfirm(false);
                }}
              >
                Verwerfen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
    </TooltipProvider>
  );
}
