import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Minus, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { questionTypes } from '@/helpers/questionTypes';
import { Question, QuestionFormData } from '@/helpers/questions';
import { cn } from '@/lib/utils';
import QuestionImage from './QuestionImage';
import QuestionQRCode from './QuestionQRCode';
import { questionTypeIcons } from '@/components/questions/question-type-icons';

interface QuestionFormProps {
  initialData?: Partial<Question> | null;
  onSubmit: (data: QuestionFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  categories: string[];
  isSubmitting?: boolean;
}

interface FormErrors {
  content?: string;
  type?: string;
  category?: string;
  point_value?: string;
  bucket_path?: string;
  solutionOptions?: string;
}

const buildInitialFormData = (
  initialData: Partial<Question> | null | undefined
): QuestionFormData => ({
  content: initialData?.content ?? '',
  type: initialData?.type ?? '',
  point_value: initialData?.point_value ?? undefined,
  hint: initialData?.hint ?? undefined,
  category: initialData?.category ?? undefined,
  bucket_path: initialData?.bucket_path ?? undefined,
  solutionOptions: initialData?.solutionOptions?.length
    ? initialData.solutionOptions
    : [{ id: 0, correct: true, text: '' }],
});

const normalizeFormData = (data: QuestionFormData) => ({
  content: data.content ?? '',
  type: data.type ?? '',
  point_value: data.point_value ?? null,
  hint: data.hint ?? '',
  category: data.category ?? '',
  bucket_path: data.bucket_path ?? '',
  solutionOptions: (data.solutionOptions ?? []).map((answer) => ({
    id: answer.id ?? 0,
    correct: Boolean(answer.correct),
    text: answer.text ?? '',
  })),
});

const QuestionForm: React.FC<QuestionFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  onDelete,
  onDirtyChange,
  categories,
  isSubmitting = false,
}) => {
  const initialSerializedRef = useRef<string | null>(null);
  const dirtyStateRef = useRef(false);
  const [formData, setFormData] = useState<QuestionFormData>(() =>
    buildInitialFormData(initialData)
  );

  const [isNewCategory, setIsNewCategory] = useState(false);
  const [optionalDetailsOpen, setOptionalDetailsOpen] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const nextSerialized = JSON.stringify(normalizeFormData(formData));
    if (initialSerializedRef.current === null) {
      initialSerializedRef.current = nextSerialized;
      return;
    }
    const nextDirty = nextSerialized !== initialSerializedRef.current;
    if (nextDirty !== dirtyStateRef.current) {
      dirtyStateRef.current = nextDirty;
      onDirtyChange?.(nextDirty);
    }
  }, [formData, onDirtyChange]);

  const handleFormChange = <K extends keyof QuestionFormData>(
    field: K,
    value: QuestionFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'new') {
      setIsNewCategory(true);
      setFormData((prev) => ({ ...prev, category: '' }));
    } else if (value === 'none') {
      // neue Bedingung für neutralen Zustand
      setIsNewCategory(false);
      setFormData((prev) => ({ ...prev, category: undefined }));
    } else {
      setIsNewCategory(false);
      setFormData((prev) => ({ ...prev, category: value }));
    }
  };

  const handleAnswerChange = (
    index: number,
    field: 'text' | 'correct',
    value: string | boolean
  ) => {
    setFormData((prev) => {
      const solutionOptions = [...(prev.solutionOptions || [])];
      const current = solutionOptions[index] ?? {
        id: 0,
        correct: false,
        text: '',
      };

      if (field === 'text') {
        if (typeof value !== 'string') return prev;
        solutionOptions[index] = { ...current, text: value };
      } else {
        if (typeof value !== 'boolean') return prev;
        solutionOptions[index] = { ...current, correct: value };
      }

      // Wenn eine Antwort als korrekt markiert wird, setze alle anderen auf inkorrekt
      if (prev.type === 'multiple_choice' && field === 'correct' && value) {
        for (let i = 0; i < solutionOptions.length; i++) {
          if (i !== index && solutionOptions[i]?.correct) {
            solutionOptions[i] = { ...solutionOptions[i], correct: false };
          }
        }
      }

      return { ...prev, solutionOptions };
    });
  };

  // Helper-Funktion, um den Index der korrekten Antwort zu finden
  const getCorrectAnswerIndex = () => {
    return (
      formData.solutionOptions?.findIndex((answer) => answer.correct) ?? -1
    );
  };

  // Helper-Funktion, um die korrekte Antwort via Index zu setzen
  const handleCorrectAnswerSelect = (selectedIndexStr: string) => {
    const selectedIndex = parseInt(selectedIndexStr, 10);
    if (isNaN(selectedIndex)) return;

    const newAnswers =
      formData.solutionOptions?.map((answer, index) => ({
        ...answer,
        correct: index === selectedIndex,
      })) || [];

    setFormData((prev) => ({
      ...prev,
      solutionOptions: newAnswers,
    }));
  };

  const addAnswer = () => {
    setFormData((prev) => ({
      ...prev,
      solutionOptions: [
        ...(prev.solutionOptions || []),
        { id: 0, correct: false, text: '' },
      ],
    }));
  };

  const ensureCorrectAnswer = (
    solutionOptions: QuestionFormData['solutionOptions'],
    fallbackIndex: number
  ) => {
    if (!solutionOptions || solutionOptions.length === 0) {
      return [{ id: 0, correct: true, text: '' }];
    }

    if (solutionOptions.some((answer) => answer.correct)) {
      return solutionOptions;
    }

    const safeIndex = Math.min(fallbackIndex, solutionOptions.length - 1);
    return solutionOptions.map((answer, index) => ({
      ...answer,
      correct: index === safeIndex,
    }));
  };

  const removeAnswer = (index: number) => {
    setFormData((prev) => {
      const currentAnswers = prev.solutionOptions ?? [];
      if (currentAnswers.length <= 1) {
        return {
          ...prev,
          solutionOptions: [{ id: 0, correct: true, text: '' }],
        };
      }

      const updatedAnswers = currentAnswers.filter((_, i) => i !== index);
      return {
        ...prev,
        solutionOptions: ensureCorrectAnswer(
          updatedAnswers,
          Math.min(index, updatedAnswers.length - 1)
        ),
      };
    });
  };

  const getFormErrors = (data: QuestionFormData): FormErrors => {
    const newErrors: FormErrors = {};

    if (!data.content.trim()) {
      newErrors.content = 'Bitte eine Frage eingeben';
    }

    if (!data.type) {
      newErrors.type = 'Bitte einen Fragetyp wählen';
    }

    if (!data.category?.trim() && isNewCategory) {
      newErrors.category =
        'Bitte eine Kategorie wählen oder eine neue eingeben';
    }

    if ((data.point_value ?? 0) < 0) {
      newErrors.point_value = 'Punkte müssen größer oder gleich 0 sein';
    }

    if (data.type === 'picture' && !data.bucket_path?.trim()) {
      newErrors.bucket_path = 'Bitte ein Bild hochladen';
    }

    const validAnswers =
      data.solutionOptions?.filter((a) => a.text?.trim()) ?? [];
    if (data.type === 'multiple_choice') {
      if (validAnswers.length < 2) {
        newErrors.solutionOptions =
          'Mindestens zwei Antworten müssen eingegeben werden';
      } else {
        const normalizedAnswers = validAnswers.map(
          (answer) => answer.text?.trim().toLowerCase() ?? ''
        );
        if (new Set(normalizedAnswers).size !== normalizedAnswers.length) {
          newErrors.solutionOptions = 'Antworten müssen unterschiedlich sein';
        }
      }
    } else if (data.type !== 'upload' && validAnswers.length === 0) {
      newErrors.solutionOptions =
        'Mindestens eine Antwort muss eingegeben werden';
    }
    return newErrors;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    // Remove empty solutionOptions
    const cleanedData = {
      ...formData,
      solutionOptions: formData.solutionOptions
        ?.filter((answer) => answer.text?.trim())
        .map((answer) => ({
          ...answer,
          id: answer.id && answer.id > 0 ? answer.id : undefined,
        })),
    };

    const nextErrors = getFormErrors(cleanedData);
    setErrors(nextErrors);
    if (nextErrors.category || nextErrors.point_value) {
      setOptionalDetailsOpen(true);
    }
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    onSubmit(cleanedData);
  };

  const hasType = Boolean(formData.type);
  const isMultipleChoice = formData.type === 'multiple_choice';
  const isUpload = formData.type === 'upload';
  const isPicture = formData.type === 'picture';
  const isQRCode = formData.type === 'qr_code';
  const showAnswers = hasType && !isUpload;
  const filledOptionalDetailsCount = [
    formData.point_value !== undefined,
    Boolean(formData.hint?.trim()),
    Boolean(formData.category?.trim()),
  ].filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset disabled={isSubmitting} className="space-y-6 border-0 p-0 m-0">
        <section
          aria-labelledby="question-type-heading"
          className="space-y-5 rounded-xl border border-border/60 bg-muted/30 p-4 sm:p-6"
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <h2
                id="question-type-heading"
                className="text-base font-semibold text-foreground"
              >
                Aufgabenart
              </h2>
              <p id="question-type-label" className="text-sm font-medium">
                Was sollen die Teams tun?*
              </p>
              <p className="text-sm text-muted-foreground">
                Die Auswahl bestimmt, wie Teams diese Aufgabe lösen.
              </p>
            </div>
            <RadioGroup
              value={formData.type}
              onValueChange={(value) => handleFormChange('type', value)}
              disabled={initialData?.id !== undefined}
              aria-labelledby="question-type-label"
              aria-invalid={Boolean(errors.type)}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {questionTypes.map((type) => {
                const Icon = questionTypeIcons[type.icon];
                const selected = formData.type === type.id;
                const optionId = `question-type-${type.id}`;

                return (
                  <Label
                    key={type.id}
                    htmlFor={optionId}
                    aria-disabled={initialData?.id !== undefined}
                    className={cn(
                      'flex min-h-40 cursor-pointer flex-col gap-3 rounded-xl border bg-background/80 p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-background',
                      selected &&
                        'border-primary bg-primary/5 ring-2 ring-primary/15',
                      errors.type && 'border-destructive/60',
                      initialData?.id !== undefined &&
                        'cursor-not-allowed opacity-65 hover:border-border'
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          'flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground',
                          selected && 'bg-primary/10 text-primary'
                        )}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <RadioGroupItem value={type.id} id={optionId} />
                    </span>
                    <span className="space-y-1">
                      <span className="block font-semibold text-foreground">
                        {type.action}
                      </span>
                      <span className="block text-sm font-normal leading-5 text-muted-foreground">
                        {type.description}
                      </span>
                    </span>
                    <span className="mt-auto block text-xs font-normal leading-4 text-muted-foreground/90">
                      {type.example}
                    </span>
                  </Label>
                );
              })}
            </RadioGroup>
            {errors.type && (
              <span className="text-sm text-destructive">{errors.type}</span>
            )}
            {initialData?.id !== undefined && (
              <p className="text-xs text-muted-foreground">
                Die Aufgabenart kann nach dem Erstellen nicht geändert werden.
              </p>
            )}
          </div>
        </section>

        <section
          aria-labelledby="question-content-heading"
          className="space-y-4 rounded-xl border border-border/60 bg-card/80 p-4 sm:p-6"
        >
          <div className="space-y-1">
            <h2
              id="question-content-heading"
              className="text-base font-semibold text-foreground"
            >
              Aufgabe formulieren
            </h2>
            <p className="text-sm text-muted-foreground">
              Dieser Text wird den Teams in der Rallye angezeigt.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="question">Frage*</Label>
            <Input
              id="question"
              value={formData.content}
              onChange={(e) => handleFormChange('content', e.target.value)}
              placeholder="Frage eingeben"
              className={
                errors.content
                  ? 'border-destructive focus-visible:ring-destructive/40'
                  : ''
              }
            />
            {errors.content && (
              <span className="text-sm text-destructive">{errors.content}</span>
            )}
          </div>
          {isPicture && (
            <div className="space-y-2">
              <QuestionImage
                bucketPath={formData.bucket_path}
                onImageChange={(newPath) => {
                  handleFormChange('bucket_path', newPath);
                  setErrors((current) => ({
                    ...current,
                    bucket_path: undefined,
                  }));
                }}
              />
              {errors.bucket_path && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.bucket_path}
                </p>
              )}
            </div>
          )}
        </section>

        {showAnswers && (
          <section
            aria-labelledby="question-solution-heading"
            className="space-y-4 rounded-xl border border-border/60 bg-card/80 p-4 sm:p-6"
          >
            <div className="space-y-1">
              <h2
                id="question-solution-heading"
                className="text-base font-semibold text-foreground"
              >
                Lösung festlegen
              </h2>
              <p className="text-sm text-muted-foreground">
                {isMultipleChoice
                  ? 'Antwortmöglichkeiten eingeben und die richtige Antwort markieren.'
                  : 'Die Lösung eingeben, die Teams erreichen oder finden sollen.'}
              </p>
            </div>
            <Label>{isMultipleChoice ? 'Antworten*' : 'Antwort*'}</Label>
            {isMultipleChoice ? (
              <RadioGroup
                value={getCorrectAnswerIndex().toString()}
                onValueChange={handleCorrectAnswerSelect}
                aria-label="Richtige Antwort"
                className="space-y-3"
              >
                {formData.solutionOptions?.map((answer, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-2"
                  >
                    <RadioGroupItem
                      value={index.toString()}
                      id={`answer-${index}`}
                    />
                    <Label htmlFor={`answer-${index}`} className="flex-1">
                      <Input
                        type="text"
                        value={answer.text ?? ''}
                        onChange={(e) =>
                          handleAnswerChange(index, 'text', e.target.value)
                        }
                        placeholder="Antwort eingeben"
                        className={
                          errors.solutionOptions
                            ? 'border-destructive focus-visible:ring-destructive/40'
                            : ''
                        }
                      />
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeAnswer(index)}
                      aria-label="Antwort entfernen"
                      className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              formData.solutionOptions?.map((answer, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    value={answer.text ?? ''}
                    onChange={(e) =>
                      handleAnswerChange(index, 'text', e.target.value)
                    }
                    placeholder="Antwort eingeben"
                    className={
                      errors.solutionOptions
                        ? 'border-destructive focus-visible:ring-destructive/40'
                        : ''
                    }
                  />
                </div>
              ))
            )}

            {isMultipleChoice && (
              <Button type="button" variant="secondary" onClick={addAnswer}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Antwort hinzufügen
              </Button>
            )}
            {errors.solutionOptions && (
              <span className="text-sm text-destructive">
                {errors.solutionOptions}
              </span>
            )}
            {isQRCode && (
              <div className="mt-4">
                <QuestionQRCode
                  answerText={formData.solutionOptions?.[0]?.text ?? ''}
                  questionContent={formData.content}
                  questionId={initialData?.id}
                  previewSize={200}
                  downloadSize={400}
                />
              </div>
            )}
          </section>
        )}

        {hasType && (
          <details
            open={optionalDetailsOpen}
            onToggle={(event) =>
              setOptionalDetailsOpen(event.currentTarget.open)
            }
            className="group overflow-hidden rounded-xl border border-border/60 bg-muted/30"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 marker:content-none sm:p-6 [&::-webkit-details-marker]:hidden">
              <span className="space-y-1">
                <span className="block text-base font-semibold text-foreground">
                  Weitere Angaben
                </span>
                <span className="block text-sm font-normal text-muted-foreground">
                  Punkte, Hinweis und Kategorie
                </span>
              </span>
              <span className="flex items-center gap-3">
                {filledOptionalDetailsCount > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {filledOptionalDetailsCount}{' '}
                    {filledOptionalDetailsCount === 1
                      ? 'Angabe ausgefüllt'
                      : 'Angaben ausgefüllt'}
                  </span>
                )}
                <ChevronDown
                  className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </span>
            </summary>
            <div className="grid gap-4 border-t border-border/60 bg-card/50 p-4 sm:p-6 md:grid-cols-2">
              <div className="max-w-28 space-y-2">
                <Label htmlFor="point_value">Punkte</Label>
                <Input
                  type="number"
                  id="point_value"
                  value={formData.point_value ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFormChange(
                      'point_value',
                      value === '' ? undefined : Number(value)
                    );
                  }}
                  placeholder="0"
                  min={0}
                  className={`w-full ${
                    errors.point_value
                      ? 'border-destructive focus-visible:ring-destructive/40'
                      : ''
                  }`}
                />
                {errors.point_value && (
                  <span className="text-sm text-destructive">
                    {errors.point_value}
                  </span>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="hint">Hinweis</Label>
                <Input
                  id="hint"
                  value={formData.hint ?? ''}
                  onChange={(e) => handleFormChange('hint', e.target.value)}
                  placeholder="Hinweis eingeben (optional)"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="category">Kategorie</Label>
                <Select
                  value={isNewCategory ? 'new' : formData.category || ''}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger
                    className={
                      errors.category
                        ? 'border-destructive focus:ring-destructive/40'
                        : ''
                    }
                  >
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Bitte auswählen</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">+ Neue Kategorie</SelectItem>
                  </SelectContent>
                </Select>
                {isNewCategory && (
                  <Input
                    type="text"
                    value={formData.category ?? ''}
                    placeholder="Neue Kategorie eingeben"
                    onChange={(e) =>
                      handleFormChange('category', e.target.value)
                    }
                  />
                )}
                {errors.category && (
                  <span className="text-sm text-destructive">
                    {errors.category}
                  </span>
                )}
              </div>
            </div>
          </details>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          {onDelete && (
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                if (window.confirm('Diese Frage wirklich löschen?')) {
                  onDelete();
                }
              }}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="ml-auto"
          >
            Abbrechen
          </Button>
          <Button type="submit" variant="dhbwStyle">
            Speichern
          </Button>
        </div>
      </fieldset>
    </form>
  );
};

export default QuestionForm;
