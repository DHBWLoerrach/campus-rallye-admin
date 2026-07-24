import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Eye,
  LockKeyhole,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  questionTypes,
  type GeocachingInputType,
  type QuestionTypeId,
} from '@/helpers/questionTypes';
import { Question, QuestionFormData } from '@/helpers/questions';
import { cn } from '@/lib/utils';
import QuestionImage from './QuestionImage';
import QuestionPreview from './QuestionPreview';
import QuestionQRCode from './QuestionQRCode';
import { questionTypeIcons } from '@/components/questions/question-type-icons';
import GeocachingLocationField from './GeocachingLocationField';

interface QuestionFormProps {
  initialData?: Partial<Question> | null;
  onSubmit: (data: QuestionFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  categories: string[];
  isSubmitting?: boolean;
  serverErrors?: Record<string, string>;
  onServerErrorClear?: (field: string) => void;
}

interface FormErrors {
  content?: string;
  type?: string;
  category?: string;
  point_value?: string;
  bucket_path?: string;
  solutionOptions?: string;
  'geocaching.target_latitude'?: string;
  'geocaching.target_longitude'?: string;
  'geocaching.proximity_radius'?: string;
  'geocaching.input_type'?: string;
}

const canonicalizeSingleSolutionOption = (
  solutionOptions: QuestionFormData['solutionOptions']
) => {
  const existing = solutionOptions ?? [];
  const selected = existing.find(
    (answer) => answer.correct && answer.text?.trim()
  ) ??
    existing.find((answer) => answer.text?.trim()) ??
    existing[0] ?? { id: 0, text: '' };

  return [{ ...selected, correct: true }];
};

const createEmptyMultipleChoiceSolutionOptions = () => [
  { id: 0, correct: true, text: '' },
  { id: 0, correct: false, text: '' },
];

const ensureMultipleChoiceSolutionOptions = (
  solutionOptions: QuestionFormData['solutionOptions']
) => {
  const existing = solutionOptions ?? [];
  if (existing.length >= 2) return existing;
  if (existing.length === 0) {
    return createEmptyMultipleChoiceSolutionOptions();
  }

  return [...existing, { id: 0, correct: false, text: '' }];
};

const buildInitialFormData = (
  initialData: Partial<Question> | null | undefined
): QuestionFormData => {
  const type = initialData?.type ?? '';
  const isGeocaching = type === 'geocaching';
  const solutionOptions = initialData?.solutionOptions?.length
    ? initialData.solutionOptions
    : [{ id: 0, correct: true, text: '' }];

  return {
    content: initialData?.content ?? '',
    type,
    point_value: initialData?.point_value ?? undefined,
    hint: initialData?.hint ?? undefined,
    category: initialData?.category ?? undefined,
    bucket_path: initialData?.bucket_path ?? undefined,
    solutionOptions: isGeocaching
      ? canonicalizeSingleSolutionOption(solutionOptions)
      : type === 'multiple_choice' && initialData?.id === undefined
        ? ensureMultipleChoiceSolutionOptions(solutionOptions)
        : solutionOptions,
    geocaching: isGeocaching
      ? {
          target_latitude: initialData?.geocaching?.target_latitude,
          target_longitude: initialData?.geocaching?.target_longitude,
          proximity_radius: initialData?.geocaching?.proximity_radius ?? 10,
          input_type: initialData?.geocaching?.input_type ?? 'text',
        }
      : undefined,
  };
};

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
  geocaching: data.geocaching
    ? {
        target_latitude: data.geocaching.target_latitude ?? null,
        target_longitude: data.geocaching.target_longitude ?? null,
        proximity_radius: data.geocaching.proximity_radius ?? null,
        input_type: data.geocaching.input_type,
      }
    : null,
});

const QuestionForm: React.FC<QuestionFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  onDelete,
  onDirtyChange,
  categories,
  isSubmitting = false,
  serverErrors = {},
  onServerErrorClear,
}) => {
  const initialSerializedRef = useRef<string | null>(null);
  const dirtyStateRef = useRef(false);
  const [formData, setFormData] = useState<QuestionFormData>(() =>
    buildInitialFormData(initialData)
  );

  const [isNewCategory, setIsNewCategory] = useState(false);
  const [optionalDetailsOpen, setOptionalDetailsOpen] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const displayedErrors = { ...serverErrors, ...errors } as FormErrors;

  const clearFieldError = (field: keyof FormErrors) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    onServerErrorClear?.(field);
  };

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
    clearFieldError(field as keyof FormErrors);
  };

  const handleTypeChange = (type: QuestionTypeId) => {
    setFormData((current) => ({
      ...current,
      type,
      geocaching:
        type === 'geocaching'
          ? {
              target_latitude: undefined,
              target_longitude: undefined,
              proximity_radius: 10,
              input_type: 'text',
            }
          : undefined,
      solutionOptions:
        type === 'multiple_choice'
          ? createEmptyMultipleChoiceSolutionOptions()
          : canonicalizeSingleSolutionOption(current.solutionOptions),
    }));
    clearFieldError('type');
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
    clearFieldError('solutionOptions');
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

    if (
      data.point_value !== undefined &&
      !Number.isSafeInteger(data.point_value)
    ) {
      newErrors.point_value = 'Punktwert muss eine ganze Zahl sein';
    } else if ((data.point_value ?? 0) < 0) {
      newErrors.point_value = 'Punktwert muss größer oder gleich 0 sein';
    }

    if (data.type === 'picture' && !data.bucket_path?.trim()) {
      newErrors.bucket_path = 'Bitte ein Bild hochladen';
    }

    if (data.type === 'geocaching') {
      const geocaching = data.geocaching;
      if (
        geocaching?.target_latitude === undefined ||
        !Number.isFinite(geocaching.target_latitude) ||
        geocaching.target_latitude < -90 ||
        geocaching.target_latitude > 90
      ) {
        newErrors['geocaching.target_latitude'] =
          'Bitte geben Sie einen gültigen Breitengrad ein';
      }
      if (
        geocaching?.target_longitude === undefined ||
        !Number.isFinite(geocaching.target_longitude) ||
        geocaching.target_longitude < -180 ||
        geocaching.target_longitude > 180
      ) {
        newErrors['geocaching.target_longitude'] =
          'Bitte geben Sie einen gültigen Längengrad ein';
      }
      if (
        geocaching?.proximity_radius === undefined ||
        !Number.isFinite(geocaching.proximity_radius) ||
        !Number.isInteger(geocaching.proximity_radius) ||
        geocaching.proximity_radius <= 0
      ) {
        newErrors['geocaching.proximity_radius'] =
          'Bitte geben Sie einen gültigen Näherungsradius ein';
      }
      if (
        geocaching?.input_type !== 'text' &&
        geocaching?.input_type !== 'qr'
      ) {
        newErrors['geocaching.input_type'] =
          'Bitte wählen Sie Text oder QR-Code als Eingabeart';
      }
    }

    const validAnswers =
      data.solutionOptions?.filter((a) => a.text?.trim()) ?? [];
    if (data.type === 'geocaching') {
      if (validAnswers.length !== 1) {
        newErrors.solutionOptions = 'Genau eine Lösung muss eingegeben werden';
      } else if (!validAnswers[0].correct) {
        newErrors.solutionOptions = 'Die Lösung muss als richtig markiert sein';
      }
    } else if (data.type === 'multiple_choice') {
      if (validAnswers.length < 2) {
        newErrors.solutionOptions =
          'Mindestens zwei Lösungsoptionen müssen eingegeben werden';
      } else {
        const normalizedAnswers = validAnswers.map(
          (answer) => answer.text?.trim().toLowerCase() ?? ''
        );
        if (new Set(normalizedAnswers).size !== normalizedAnswers.length) {
          newErrors.solutionOptions =
            'Lösungsoptionen müssen unterschiedlich sein';
        }
      }
    } else if (data.type !== 'upload' && validAnswers.length === 0) {
      newErrors.solutionOptions =
        'Mindestens eine Lösungsoption muss eingegeben werden';
    }
    return newErrors;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    Object.keys(serverErrors).forEach((field) => onServerErrorClear?.(field));

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
  const isEditing = initialData?.id !== undefined;
  const selectedQuestionType = questionTypes.find(
    (type) => type.id === formData.type
  );
  const SelectedQuestionTypeIcon = selectedQuestionType
    ? questionTypeIcons[selectedQuestionType.icon]
    : null;
  const isMultipleChoice = formData.type === 'multiple_choice';
  const isUpload = formData.type === 'upload';
  const isPicture = formData.type === 'picture';
  const isQRCode = formData.type === 'qr_code';
  const isGeocaching = formData.type === 'geocaching';
  const geocachingInputType = formData.geocaching?.input_type ?? 'text';
  const showAnswers = hasType && !isUpload;
  const filledOptionalDetailsCount = [
    formData.point_value !== undefined,
    Boolean(formData.hint?.trim()),
    Boolean(formData.category?.trim()),
  ].filter(Boolean).length;
  const initialGeocaching = initialData?.geocaching;
  const initialSolution = initialData?.solutionOptions
    ?.find((answer) => answer.correct && answer.text?.trim())
    ?.text?.trim();
  const currentSolution = formData.solutionOptions?.[0]?.text?.trim();
  const inputTypeChanged =
    initialData?.id !== undefined &&
    initialData.type === 'geocaching' &&
    initialGeocaching?.input_type !== geocachingInputType;
  const solutionChangedWithQr =
    initialData?.id !== undefined &&
    initialData.type === 'geocaching' &&
    initialSolution !== currentSolution &&
    (initialGeocaching?.input_type === 'qr' || geocachingInputType === 'qr');
  const hasValidGeocachingSummary =
    isGeocaching &&
    formData.geocaching?.target_latitude !== undefined &&
    formData.geocaching.target_longitude !== undefined &&
    formData.geocaching.proximity_radius !== undefined &&
    Number.isInteger(formData.geocaching.proximity_radius) &&
    formData.geocaching.proximity_radius > 0;
  const categoryOptions = [
    { value: 'none', label: 'Bitte auswählen' },
    ...categories.map((category) => ({
      value: category,
      label: category,
    })),
    { value: 'new', label: '+ Neue Kategorie' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset disabled={isSubmitting} className="space-y-6 border-0 p-0 m-0">
        <section
          aria-labelledby="question-type-heading"
          className="space-y-5 rounded-xl border border-border/60 bg-muted/30 p-4 sm:p-6"
        >
          <div className="space-y-3">
            <h2
              id="question-type-heading"
              className="text-base font-semibold text-foreground"
            >
              Fragetyp
            </h2>
            {isEditing && selectedQuestionType && SelectedQuestionTypeIcon ? (
              <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/80 p-3 sm:flex-row sm:items-center">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <SelectedQuestionTypeIcon
                    className="size-5"
                    aria-hidden="true"
                  />
                </span>
                <span className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-2">
                  <span className="block font-semibold text-foreground">
                    {selectedQuestionType.name}
                  </span>
                  <span
                    className="block min-w-0 truncate text-sm text-muted-foreground"
                    title={selectedQuestionType.description}
                  >
                    {selectedQuestionType.description}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <LockKeyhole className="size-3.5" aria-hidden="true" />
                  Der Fragetyp kann nach dem Erstellen nicht geändert werden.
                </span>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <p id="question-type-label" className="text-sm font-medium">
                    Was sollen die Teilnehmenden tun?*
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Die Auswahl bestimmt, wie Teilnehmende diese Frage lösen.
                  </p>
                </div>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value) => handleTypeChange(value)}
                  aria-labelledby="question-type-label"
                  aria-invalid={Boolean(displayedErrors.type)}
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
                        className={cn(
                          'flex min-h-40 cursor-pointer flex-col gap-3 rounded-xl border bg-background/80 p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-background',
                          selected &&
                            'border-primary bg-primary/5 ring-2 ring-primary/15',
                          displayedErrors.type && 'border-destructive/60'
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
                            {type.name}
                          </span>
                          <span className="block text-sm font-medium text-foreground/80">
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
              </>
            )}
            {displayedErrors.type && (
              <span className="text-sm text-destructive">
                {displayedErrors.type}
              </span>
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
              Frage formulieren
            </h2>
            <p className="text-sm text-muted-foreground">
              Dieser Text wird den Teilnehmenden angezeigt.
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
                displayedErrors.content
                  ? 'border-destructive focus-visible:ring-destructive/40'
                  : ''
              }
            />
            {displayedErrors.content && (
              <span className="text-sm text-destructive">
                {displayedErrors.content}
              </span>
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
              {displayedErrors.bucket_path && (
                <p className="text-sm text-destructive" role="alert">
                  {displayedErrors.bucket_path}
                </p>
              )}
            </div>
          )}
        </section>

        {isGeocaching && formData.geocaching && (
          <section
            aria-labelledby="geocaching-target-heading"
            className="space-y-4 rounded-xl border border-border/60 bg-card/80 p-4 sm:p-6"
          >
            <div className="space-y-1">
              <h2
                id="geocaching-target-heading"
                className="text-base font-semibold text-foreground"
              >
                Zielort festlegen
              </h2>
              <p className="text-sm text-muted-foreground">
                Ziel per Kartenklick oder Marker festlegen und bei Bedarf über
                die exakten Koordinaten anpassen.
              </p>
            </div>
            <GeocachingLocationField
              value={formData.geocaching}
              disabled={isSubmitting}
              errors={{
                target_latitude: displayedErrors['geocaching.target_latitude'],
                target_longitude:
                  displayedErrors['geocaching.target_longitude'],
                proximity_radius:
                  displayedErrors['geocaching.proximity_radius'],
              }}
              onChange={(geocaching) => {
                const previous = formData.geocaching;
                handleFormChange('geocaching', {
                  ...geocaching,
                  input_type: previous?.input_type ?? 'text',
                });
                if (previous?.target_latitude !== geocaching.target_latitude) {
                  clearFieldError('geocaching.target_latitude');
                }
                if (
                  previous?.target_longitude !== geocaching.target_longitude
                ) {
                  clearFieldError('geocaching.target_longitude');
                }
                if (
                  previous?.proximity_radius !== geocaching.proximity_radius
                ) {
                  clearFieldError('geocaching.proximity_radius');
                }
              }}
            />
          </section>
        )}

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
                  ? 'Lösungsoptionen eingeben und die richtige Lösungsoption markieren.'
                  : 'Die erwartete Lösung eingeben.'}
              </p>
            </div>
            {isGeocaching && (
              <div className="flex flex-col gap-2">
                <Label id="geocaching-input-type-label">Eingabeart*</Label>
                <ToggleGroup
                  aria-labelledby="geocaching-input-type-label"
                  variant="outline"
                  spacing={2}
                  value={[geocachingInputType]}
                  onValueChange={(value) => {
                    const next = value[0] as GeocachingInputType | undefined;
                    if (!next || !formData.geocaching) return;
                    handleFormChange('geocaching', {
                      ...formData.geocaching,
                      input_type: next,
                    });
                    clearFieldError('geocaching.input_type');
                  }}
                >
                  <ToggleGroupItem value="text">Text eingeben</ToggleGroupItem>
                  <ToggleGroupItem value="qr">QR-Code scannen</ToggleGroupItem>
                </ToggleGroup>
                {displayedErrors['geocaching.input_type'] && (
                  <p className="text-sm text-destructive">
                    {displayedErrors['geocaching.input_type']}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {geocachingInputType === 'qr'
                    ? 'Ein falscher QR-Code wird abgelehnt und kann erneut gescannt werden.'
                    : 'Groß-/Kleinschreibung sowie Leerzeichen am Anfang und Ende werden bei der Prüfung ignoriert. Eine falsche Team-Antwort beendet die Frage.'}
                </p>
              </div>
            )}
            <Label>
              {isMultipleChoice ? 'Lösungsoptionen*' : 'Lösungsoption*'}
            </Label>
            {isMultipleChoice ? (
              <RadioGroup
                value={getCorrectAnswerIndex().toString()}
                onValueChange={handleCorrectAnswerSelect}
                aria-label="Richtige Lösungsoption"
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
                        placeholder="Lösungsoption eingeben"
                        className={
                          displayedErrors.solutionOptions
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
                      disabled={(formData.solutionOptions?.length ?? 0) <= 1}
                      aria-label="Lösungsoption entfernen"
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
                    placeholder="Lösungsoption eingeben"
                    className={
                      displayedErrors.solutionOptions
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
                Lösungsoption hinzufügen
              </Button>
            )}
            {displayedErrors.solutionOptions && (
              <span className="text-sm text-destructive">
                {displayedErrors.solutionOptions}
              </span>
            )}
            {(isQRCode || (isGeocaching && geocachingInputType === 'qr')) && (
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
            {inputTypeChanged && initialGeocaching?.input_type === 'qr' && (
              <p className="text-sm text-muted-foreground" role="status">
                Zuvor gedruckte QR-Codes lösen diese Frage nach dem Wechsel zur
                Texteingabe nicht mehr.
              </p>
            )}
            {inputTypeChanged && geocachingInputType === 'qr' && (
              <p className="text-sm text-muted-foreground" role="status">
                Erstellen, drucken und platzieren Sie den neuen QR-Code, bevor
                die Frage verwendet wird.
              </p>
            )}
            {solutionChangedWithQr && (
              <p className="text-sm text-muted-foreground" role="status">
                Der QR-Code muss mit der geänderten Lösung neu generiert und
                ausgedruckt werden.
              </p>
            )}
          </section>
        )}

        {hasType && (
          <details className="group overflow-hidden rounded-xl border border-border/60 bg-card/80">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 marker:content-none sm:p-6 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Eye className="size-5" aria-hidden="true" />
                </span>
                <span className="space-y-1">
                  <span className="block text-base font-semibold text-foreground">
                    Team-Ansicht prüfen
                  </span>
                  <span className="block text-sm font-normal text-muted-foreground">
                    So erscheint die Frage den Teams.
                  </span>
                </span>
              </span>
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t border-border/60 bg-muted/20 p-4 sm:p-6">
              <QuestionPreview data={formData} />
            </div>
          </details>
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
                  Punktwert, Hinweis und Kategorie
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
              <div className="space-y-2">
                <Label htmlFor="point_value">Punktwert</Label>
                <Input
                  type="number"
                  id="point_value"
                  aria-describedby="point-value-help"
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
                  step={1}
                  inputMode="numeric"
                  className={`w-full max-w-28 ${
                    displayedErrors.point_value
                      ? 'border-destructive focus-visible:ring-destructive/40'
                      : ''
                  }`}
                />
                {displayedErrors.point_value && (
                  <span className="text-sm text-destructive">
                    {displayedErrors.point_value}
                  </span>
                )}
                <p
                  id="point-value-help"
                  className="text-xs text-muted-foreground"
                >
                  Zählt zum Ergebnis der Team-Rallye. Leer bedeutet: keine
                  Team-Punkte.
                </p>
                {isGeocaching && (
                  <p className="text-xs text-muted-foreground">
                    Der Punktwert wird bei einer richtigen Team-Antwort
                    vergeben. In Campus-Touren wird er lokal gezählt und am Ende
                    angezeigt.
                  </p>
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
                  onValueChange={(value) => handleCategoryChange(value ?? '')}
                  items={categoryOptions}
                >
                  <SelectTrigger
                    className={
                      displayedErrors.category
                        ? 'border-destructive focus:ring-destructive/40'
                        : ''
                    }
                  >
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
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
                {displayedErrors.category && (
                  <span className="text-sm text-destructive">
                    {displayedErrors.category}
                  </span>
                )}
              </div>
            </div>
          </details>
        )}

        {hasValidGeocachingSummary && formData.geocaching && (
          <p className="text-sm text-muted-foreground">
            Ziel bei {formData.geocaching.target_latitude?.toFixed(6)},{' '}
            {formData.geocaching.target_longitude?.toFixed(6)} · freigeschaltet
            innerhalb von {formData.geocaching.proximity_radius} m ·
            Team-Antwort per {geocachingInputType === 'qr' ? 'QR-Code' : 'Text'}
          </p>
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
