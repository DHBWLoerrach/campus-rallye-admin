'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRallyeWithQuestions } from '@/actions/rallye';
import SearchFilters from '@/components/questions/SearchFilters';
import { questionTypes } from '@/helpers/questionTypes';
import type { Question } from '@/helpers/questions';
import type { DepartmentOption } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Filters = {
  question?: string;
  answer?: string;
  type?: string;
  category?: string;
};

interface RallyeCreateWizardProps {
  departmentOptions: DepartmentOption[];
  defaultDepartmentId: number | null;
  questions: Question[];
  categories: string[];
}

const STEPS = ['Name & Bereich', 'Fragen wählen', 'Passwort'];

const getTypeLabel = (type: string | null | undefined): string =>
  questionTypes.find((t) => t.id === type)?.name ?? '—';

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

export default function RallyeCreateWizard({
  departmentOptions,
  defaultDepartmentId,
  questions,
  categories,
}: RallyeCreateWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState<string>(
    defaultDepartmentId ? String(defaultDepartmentId) : ''
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<Filters>({});
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredQuestions = useMemo(
    () => questions.filter((question) => matchesFilters(question, filters)),
    [questions, filters]
  );

  const canLeaveStep1 = name.trim().length > 0 && departmentId.length > 0;

  const toggleQuestion = (questionId: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(questionId);
      else next.delete(questionId);
      return next;
    });
  };

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await createRallyeWithQuestions({
        name: name.trim(),
        departmentId: Number(departmentId),
        endTime: null,
        password,
        questionIds: Array.from(selectedIds),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        router.push(`/rallyes/${result.data.rallyeId}`);
      }
    });
  };

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-1">
            {index > 0 && (
              <span aria-hidden="true" className="text-muted-foreground/60">
                →
              </span>
            )}
            <span
              aria-current={index === step ? 'step' : undefined}
              className={
                index === step
                  ? 'rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary'
                  : 'text-muted-foreground'
              }
            >
              {`${index + 1}. ${label}`}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="flex max-w-xl flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="wizard-name">Name</Label>
            <Input
              id="wizard-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Studieninfotag 2027"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wizard-department">Bereich</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger id="wizard-department" className="max-w-sm">
                <SelectValue placeholder="Bereich auswählen" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((department) => (
                  <SelectItem key={department.id} value={String(department.id)}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {selectedIds.size === 0
              ? 'Fragen aus dem Katalog wählen — dieser Schritt kann übersprungen werden.'
              : `${selectedIds.size} ${selectedIds.size === 1 ? 'Frage' : 'Fragen'} ausgewählt.`}
          </p>
          <SearchFilters
            onFilterChange={setFilters}
            categories={categories}
            showAssignedToggle={false}
            compact
          />
          <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-muted/30 p-3">
            {filteredQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine passenden Fragen gefunden.
              </p>
            ) : (
              filteredQuestions.map((question) => (
                <div key={question.id} className="flex items-start gap-2">
                  <Checkbox
                    id={`wizard-question-${question.id}`}
                    checked={selectedIds.has(question.id)}
                    onCheckedChange={(checked) =>
                      toggleQuestion(question.id, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`wizard-question-${question.id}`}
                    className="text-sm font-normal"
                  >
                    {question.content}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {getTypeLabel(question.type)}
                      {question.points ? ` · ${question.points} P` : ''}
                    </span>
                  </Label>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex max-w-xl flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="wizard-password">Passwort (optional)</Label>
            <Input
              id="wizard-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-border/60 pt-4">
        <Button
          variant="outline"
          className="cursor-pointer"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Zurück
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            variant="dhbwStyle"
            className="cursor-pointer"
            disabled={step === 0 && !canLeaveStep1}
            onClick={() => setStep((s) => s + 1)}
          >
            Weiter
          </Button>
        ) : (
          <Button
            variant="dhbwStyle"
            className="cursor-pointer"
            disabled={isPending}
            onClick={handleCreate}
          >
            {isPending ? 'Wird erstellt…' : 'Rallye erstellen'}
          </Button>
        )}
      </div>
    </section>
  );
}
