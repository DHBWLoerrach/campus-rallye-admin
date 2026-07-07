'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CircleMinus, CirclePlus, Pencil } from 'lucide-react';
import {
  addQuestionToRallye,
  removeQuestionFromRallye,
  setQuestionVoting,
} from '@/actions/assign_questions_to_rallye';
import SearchFilters from '@/components/questions/SearchFilters';
import { questionTypes } from '@/helpers/questionTypes';
import type { Question } from '@/helpers/questions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type AssignedQuestion = { question: Question; isVoting: boolean };

type Filters = {
  question?: string;
  answer?: string;
  type?: string;
  category?: string;
};

interface RallyeQuestionsManagerProps {
  rallyeId: number;
  initialAssigned: AssignedQuestion[];
  initialAvailable: Question[];
  categories: string[];
}

const getTypeLabel = (type: string | null | undefined): string =>
  questionTypes.find((t) => t.id === type)?.name ?? '—';

const byContent = (a: Question, b: Question) =>
  (a.content ?? '').localeCompare(b.content ?? '', 'de', {
    sensitivity: 'base',
  });

const matchesFilters = (question: Question, filters: Filters): boolean => {
  if (
    filters.question &&
    !question.content?.toLowerCase().includes(filters.question.toLowerCase())
  ) {
    return false;
  }
  if (
    filters.answer &&
    !(question.answers ?? []).some((answer) =>
      answer.text?.toLowerCase().includes(filters.answer!.toLowerCase())
    )
  ) {
    return false;
  }
  if (
    filters.type &&
    filters.type !== 'all' &&
    question.type !== filters.type
  ) {
    return false;
  }
  if (
    filters.category &&
    filters.category !== 'all' &&
    question.category !== filters.category
  ) {
    return false;
  }
  return true;
};

export default function RallyeQuestionsManager({
  rallyeId,
  initialAssigned,
  initialAvailable,
  categories,
}: RallyeQuestionsManagerProps) {
  const router = useRouter();
  const [assigned, setAssigned] = useState<AssignedQuestion[]>(initialAssigned);
  const [available, setAvailable] = useState<Question[]>(initialAvailable);
  const [filters, setFilters] = useState<Filters>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPoints = assigned.reduce(
    (sum, entry) => sum + (entry.question.points ?? 0),
    0
  );

  const filteredAvailable = useMemo(
    () => available.filter((question) => matchesFilters(question, filters)),
    [available, filters]
  );

  const handleAdd = (question: Question) => {
    setError(null);
    startTransition(async () => {
      const result = await addQuestionToRallye(rallyeId, question.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAssigned((prev) =>
        [...prev, { question, isVoting: false }].sort((a, b) =>
          byContent(a.question, b.question)
        )
      );
      setAvailable((prev) => prev.filter((q) => q.id !== question.id));
      router.refresh();
    });
  };

  const handleRemove = (entry: AssignedQuestion) => {
    setError(null);
    startTransition(async () => {
      const result = await removeQuestionFromRallye(
        rallyeId,
        entry.question.id
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAssigned((prev) =>
        prev.filter((e) => e.question.id !== entry.question.id)
      );
      setAvailable((prev) => [...prev, entry.question].sort(byContent));
      router.refresh();
    });
  };

  const handleVotingToggle = (entry: AssignedQuestion, checked: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await setQuestionVoting(
        rallyeId,
        entry.question.id,
        checked
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAssigned((prev) =>
        prev.map((e) =>
          e.question.id === entry.question.id ? { ...e, isVoting: checked } : e
        )
      );
      router.refresh();
    });
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {assigned.length === 0
            ? 'Keine Fragen zugeordnet'
            : `${assigned.length} ${assigned.length === 1 ? 'Frage' : 'Fragen'} · ${totalPoints} Punkte gesamt`}
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="dhbwStyle" size="sm" className="cursor-pointer">
              + Fragen hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Fragen aus dem Katalog hinzufügen</DialogTitle>
            </DialogHeader>
            <SearchFilters
              onFilterChange={setFilters}
              categories={categories}
              showAssignedToggle={false}
              compact
            />
            {filteredAvailable.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine passenden Fragen gefunden.
              </p>
            ) : (
              <Table>
                <TableBody>
                  {filteredAvailable.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="max-w-md">
                        <span className="line-clamp-2">{question.content}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {getTypeLabel(question.type)}
                          {question.points ? ` · ${question.points} P` : ''}
                        </span>
                      </TableCell>
                      <TableCell className="w-12 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Frage hinzufügen"
                          className="cursor-pointer text-primary"
                          disabled={isPending}
                          onClick={() => handleAdd(question)}
                        >
                          <CirclePlus className="h-5 w-5" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div
          className="rounded-md border border-red-500/60 bg-red-50/60 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {assigned.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Frage</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="text-right">Punkte</TableHead>
              <TableHead>Abstimmung</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assigned.map((entry) => (
              <TableRow key={entry.question.id}>
                <TableCell className="max-w-xl">
                  <span className="line-clamp-2">{entry.question.content}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getTypeLabel(entry.question.type)}
                </TableCell>
                <TableCell className="text-right">
                  {entry.question.points ?? '—'}
                </TableCell>
                <TableCell>
                  {entry.question.type === 'upload' ? (
                    <Checkbox
                      aria-label="Abstimmung"
                      checked={entry.isVoting}
                      disabled={isPending}
                      onCheckedChange={(checked) =>
                        handleVotingToggle(entry, checked === true)
                      }
                    />
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      —
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      aria-label="Frage bearbeiten"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Link href={`/questions/${entry.question.id}`}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Frage entfernen"
                      className="cursor-pointer text-destructive"
                      disabled={isPending}
                      onClick={() => handleRemove(entry)}
                    >
                      <CircleMinus className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
