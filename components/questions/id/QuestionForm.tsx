import React, { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
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
import QuestionImage from './QuestionImage';
import QuestionQRCode from './QuestionQRCode';

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
  answers?: string;
}

const buildInitialFormData = (
  initialData: Partial<Question> | null | undefined
): QuestionFormData => ({
  content: initialData?.content ?? '',
  type: initialData?.type ?? '',
  point_value: initialData?.point_value ?? 0,
  hint: initialData?.hint ?? undefined,
  category: initialData?.category ?? undefined,
  bucket_path: initialData?.bucket_path ?? undefined,
  answers: initialData?.answers?.length
    ? initialData.answers
    : [{ id: 0, correct: true, text: '' }],
});

const normalizeFormData = (data: QuestionFormData) => ({
  content: data.content ?? '',
  type: data.type ?? '',
  point_value: data.point_value ?? 0,
  hint: data.hint ?? '',
  category: data.category ?? '',
  bucket_path: data.bucket_path ?? '',
  answers: (data.answers ?? []).map((answer) => ({
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
      const answers = [...(prev.answers || [])];
      const current = answers[index] ?? { id: 0, correct: false, text: '' };

      if (field === 'text') {
        if (typeof value !== 'string') return prev;
        answers[index] = { ...current, text: value };
      } else {
        if (typeof value !== 'boolean') return prev;
        answers[index] = { ...current, correct: value };
      }

      // Wenn eine Antwort als korrekt markiert wird, setze alle anderen auf inkorrekt
      if (prev.type === 'multiple_choice' && field === 'correct' && value) {
        for (let i = 0; i < answers.length; i++) {
          if (i !== index && answers[i]?.correct) {
            answers[i] = { ...answers[i], correct: false };
          }
        }
      }

      return { ...prev, answers };
    });
  };

  // Helper-Funktion, um den Index der korrekten Antwort zu finden
  const getCorrectAnswerIndex = () => {
    return formData.answers?.findIndex((answer) => answer.correct) ?? -1;
  };

  // Helper-Funktion, um die korrekte Antwort via Index zu setzen
  const handleCorrectAnswerSelect = (selectedIndexStr: string) => {
    const selectedIndex = parseInt(selectedIndexStr, 10);
    if (isNaN(selectedIndex)) return;

    const newAnswers =
      formData.answers?.map((answer, index) => ({
        ...answer,
        correct: index === selectedIndex,
      })) || [];

    setFormData((prev) => ({
      ...prev,
      answers: newAnswers,
    }));
  };

  const addAnswer = () => {
    setFormData((prev) => ({
      ...prev,
      answers: [...(prev.answers || []), { id: 0, correct: false, text: '' }],
    }));
  };

  const ensureCorrectAnswer = (
    answers: QuestionFormData['answers'],
    fallbackIndex: number
  ) => {
    if (!answers || answers.length === 0) {
      return [{ id: 0, correct: true, text: '' }];
    }

    if (answers.some((answer) => answer.correct)) {
      return answers;
    }

    const safeIndex = Math.min(fallbackIndex, answers.length - 1);
    return answers.map((answer, index) => ({
      ...answer,
      correct: index === safeIndex,
    }));
  };

  const removeAnswer = (index: number) => {
    setFormData((prev) => {
      const currentAnswers = prev.answers ?? [];
      if (currentAnswers.length <= 1) {
        return {
          ...prev,
          answers: [{ id: 0, correct: true, text: '' }],
        };
      }

      const updatedAnswers = currentAnswers.filter((_, i) => i !== index);
      return {
        ...prev,
        answers: ensureCorrectAnswer(
          updatedAnswers,
          Math.min(index, updatedAnswers.length - 1)
        ),
      };
    });
  };

  const validateForm = (data: QuestionFormData): boolean => {
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

    const validAnswers = data.answers?.filter((a) => a.text?.trim()) ?? [];
    if (data.type === 'multiple_choice') {
      if (validAnswers.length < 2) {
        newErrors.answers =
          'Mindestens zwei Antworten müssen eingegeben werden';
      } else {
        const normalizedAnswers = validAnswers.map(
          (answer) => answer.text?.trim().toLowerCase() ?? ''
        );
        if (new Set(normalizedAnswers).size !== normalizedAnswers.length) {
          newErrors.answers = 'Antworten müssen unterschiedlich sein';
        }
      }
    } else if (data.type !== 'upload' && validAnswers.length === 0) {
      newErrors.answers = 'Mindestens eine Antwort muss eingegeben werden';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    // Remove empty answers
    const cleanedData = {
      ...formData,
      answers: formData.answers
        ?.filter((answer) => answer.text?.trim())
        .map((answer) => ({
          ...answer,
          id: answer.id && answer.id > 0 ? answer.id : undefined,
        })),
    };

    if (!validateForm(cleanedData)) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset disabled={isSubmitting} className="space-y-6 border-0 p-0 m-0">
        <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 sm:p-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
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
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <div className="space-y-2">
              <Label htmlFor="type">Fragetyp*</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleFormChange('type', value)}
                disabled={initialData?.id !== undefined}
              >
                <SelectTrigger
                  className={
                    errors.type
                      ? 'border-destructive focus:ring-destructive/40'
                      : ''
                  }
                >
                  <SelectValue placeholder="Fragetyp wählen" />
                </SelectTrigger>
                <SelectContent>
                  {questionTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <span className="text-sm text-destructive">{errors.type}</span>
              )}
            </div>
            {hasType && (
              <div className="space-y-2">
                <Label htmlFor="point_value">Punkte</Label>
                <Input
                  type="number"
                  id="point_value"
                  value={formData.point_value}
                  onChange={(e) =>
                    handleFormChange('point_value', Number(e.target.value))
                  }
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
            )}
          </div>
          {!hasType && (
            <p className="text-sm text-muted-foreground md:col-span-2">
              Zuerst einen Fragetyp wählen — danach erscheinen die passenden
              Felder.
            </p>
          )}
        </div>

        {showAnswers && (
          <div className="space-y-4 rounded-xl border border-border/60 bg-card/80 p-4 sm:p-6">
            <Label>{isMultipleChoice ? 'Antworten*' : 'Antwort*'}</Label>
            {isMultipleChoice ? (
              <RadioGroup
                value={getCorrectAnswerIndex().toString()}
                onValueChange={handleCorrectAnswerSelect}
                className="space-y-3"
              >
                {formData.answers?.map((answer, index) => (
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
                          errors.answers
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
              formData.answers?.map((answer, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    value={answer.text ?? ''}
                    onChange={(e) =>
                      handleAnswerChange(index, 'text', e.target.value)
                    }
                    placeholder="Antwort eingeben"
                    className={
                      errors.answers
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
            {errors.answers && (
              <span className="text-sm text-destructive">{errors.answers}</span>
            )}
            {isQRCode && (
              <div className="mt-4">
                <QuestionQRCode
                  answerText={formData.answers?.[0]?.text ?? ''}
                  questionContent={formData.content}
                  questionId={initialData?.id}
                  previewSize={200}
                  downloadSize={400}
                />
              </div>
            )}
          </div>
        )}

        {hasType && (
          <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 sm:p-6 md:grid-cols-2">
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
                  onChange={(e) => handleFormChange('category', e.target.value)}
                />
              )}
              {errors.category && (
                <span className="text-sm text-destructive">
                  {errors.category}
                </span>
              )}
            </div>
            {isPicture && (
              <div className="md:col-span-2">
                <QuestionImage
                  bucketPath={formData.bucket_path}
                  onImageChange={(newPath) =>
                    handleFormChange('bucket_path', newPath)
                  }
                />
              </div>
            )}
          </div>
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
