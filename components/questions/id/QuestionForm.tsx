import React, { useState } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { RallyeOption } from '@/lib/types';
import QuestionImage from './QuestionImage';

interface QuestionFormProps {
  initialData?: Partial<Question> | null;
  onSubmit: (data: QuestionFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  categories: string[];
  rallyes: RallyeOption[];
  initialRallyeIds?: number[];
}

interface FormErrors {
  content?: string;
  type?: string;
  category?: string;
  points?: string;
  answers?: string;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  onDelete,
  categories,
  rallyes,
  initialRallyeIds = [],
}) => {
  const [formData, setFormData] = useState<QuestionFormData>({
    content: initialData?.content || '',
    type: initialData?.type || '',
    points: initialData?.points || 0,
    hint: initialData?.hint,
    category: initialData?.category,
    bucket_path: initialData?.bucket_path,
    answers: initialData?.answers || [{ id: 0, correct: true, text: '' }],
    rallyeIds: initialRallyeIds,
  });

  const [isNewCategory, setIsNewCategory] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [rallyeFilter, setRallyeFilter] = useState('');

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

  const handleRallyeToggle = (rallyeId: number, isChecked: boolean) => {
    setFormData((prev) => {
      const nextIds = new Set(prev.rallyeIds ?? []);
      if (isChecked) {
        nextIds.add(rallyeId);
      } else {
        nextIds.delete(rallyeId);
      }
      return { ...prev, rallyeIds: Array.from(nextIds) };
    });
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

  const normalizedRallyeFilter = rallyeFilter.trim().toLowerCase();
  const visibleRallyes = normalizedRallyeFilter
    ? rallyes.filter((rallye) =>
        rallye.name.toLowerCase().includes(normalizedRallyeFilter)
      )
    : rallyes;

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
      newErrors.content = 'Bitte geben Sie eine Frage ein';
    }

    if (!data.type) {
      newErrors.type = 'Bitte wählen Sie einen Fragetyp';
    }

    if (!data.category?.trim() && isNewCategory) {
      newErrors.category =
        'Bitte wählen Sie eine Kategorie oder geben Sie eine neue ein';
    }

    if ((data.points ?? 0) < 0) {
      newErrors.points = 'Punkte müssen größer oder gleich 0 sein';
    }

    const validAnswers = data.answers?.filter((a) => a.text?.trim()) ?? [];
    if (data.type === 'multiple_choice') {
      if (validAnswers.length < 2) {
        newErrors.answers = 'Mindestens zwei Antworten müssen eingegeben werden';
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

    // Remove empty answers
    const cleanedData = {
      ...formData,
      answers: formData.answers?.filter((answer) => answer.text?.trim()),
    };

    if (!validateForm(cleanedData)) {
      return;
    }
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 sm:p-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="question">Frage*</Label>
            <Input
              id="question"
              value={formData.content}
              onChange={(e) => handleFormChange('content', e.target.value)}
              placeholder="Geben Sie die Frage ein"
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
                <SelectValue placeholder="Wählen Sie einen Fragetyp" />
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
          <div className="space-y-2">
            <Label htmlFor="points">Punkte</Label>
            <Input
              type="number"
              id="points"
              value={formData.points}
              onChange={(e) =>
                handleFormChange('points', Number(e.target.value))
              }
              placeholder="Punkte eingeben"
              className={
                errors.points
                  ? 'border-destructive focus-visible:ring-destructive/40'
                  : ''
              }
            />
            {errors.points && (
              <span className="text-sm text-destructive">{errors.points}</span>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="hint">Hinweis</Label>
            <Input
              id="hint"
              value={formData.hint ?? ''}
              onChange={(e) => handleFormChange('hint', e.target.value)}
              placeholder="Geben Sie einen Hinweis ein"
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
                <SelectValue placeholder="Wählen Sie eine Kategorie" />
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
          {formData.type === 'picture' && (
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

        <div className="space-y-2">
          <Label>Rallyes zuordnen</Label>
          <Input
            value={rallyeFilter}
            onChange={(e) => setRallyeFilter(e.target.value)}
            placeholder="Rallye suchen"
            className="max-w-xs"
          />
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3 max-h-56 overflow-y-auto space-y-2">
            {rallyes.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Keine Rallyes vorhanden
              </div>
            ) : visibleRallyes.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Keine Rallyes gefunden
              </div>
            ) : (
              visibleRallyes.map((rallye) => (
                <div key={rallye.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`rallye-${rallye.id}`}
                    checked={formData.rallyeIds?.includes(rallye.id) ?? false}
                    onCheckedChange={(checked) =>
                      handleRallyeToggle(rallye.id, checked === true)
                    }
                  />
                  <Label htmlFor={`rallye-${rallye.id}`} className="text-sm">
                    {rallye.name}
                  </Label>
                </div>
              ))
            )}
          </div>
        </div>

        {formData.type !== 'upload' && (
          <div className="space-y-4 rounded-xl border border-border/60 bg-card/80 p-4 sm:p-6">
            <Label>
              {formData.type === 'multiple_choice' ? 'Antworten*' : 'Antwort*'}
            </Label>
            {formData.type === 'multiple_choice' ? (
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
                        placeholder="Füge eine Antwort hinzu"
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
                    placeholder="Füge eine Antwort hinzu"
                    className={
                      errors.answers
                        ? 'border-destructive focus-visible:ring-destructive/40'
                        : ''
                    }
                  />
                </div>
              ))
            )}

            {formData.type === 'multiple_choice' && (
              <Button type="button" variant="secondary" onClick={addAnswer}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Antwort hinzufügen
              </Button>
            )}
            {errors.answers && (
              <span className="text-sm text-destructive">{errors.answers}</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" variant="dhbwStyle">
            Speichern
          </Button>
          {onDelete && (
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'Sind Sie sicher, dass Sie diese Frage löschen möchten?'
                  )
                ) {
                  onDelete();
                }
              }}
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export default QuestionForm;
