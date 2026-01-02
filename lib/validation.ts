import { z } from 'zod';
import { questionTypes } from '@/helpers/questionTypes';

export const rallyeStatusValues = [
  'preparing',
  'running',
  'post_processing',
  'ended',
  'inactive',
] as const;

export const rallyeStatusSchema = z.enum(rallyeStatusValues);

const questionTypeIds = questionTypes.map((type) => type.id) as [
  string,
  ...string[],
];

export const questionTypeSchema = z.enum(questionTypeIds);
export const idSchema = z.coerce.number().int().positive();
export const idArraySchema = z.array(idSchema);

const pointsSchema = z.preprocess((value) => {
  if (typeof value === 'number' && Number.isNaN(value)) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    const numeric = Number(trimmed);
    return Number.isNaN(numeric) ? value : numeric;
  }
  return value;
}, z.number().min(0, 'Punkte müssen größer oder gleich 0 sein').finite().optional());

export const rallyeCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich'),
});

export const rallyeUpdateSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, 'Name ist erforderlich'),
  status: rallyeStatusSchema,
  studiengang: z.string().trim().min(1, 'Studiengang ist erforderlich'),
  password: z.string().optional().default(''),
  end_time: z.string().optional(),
});

const answerSchema = z.object({
  correct: z.boolean(),
  text: z.string().optional(),
});

const validateAnswers = (
  data: {
    type: string;
    answers: { correct: boolean; text?: string }[];
  },
  ctx: z.RefinementCtx
) => {
  const normalizedAnswers = data.answers
    .map((answer) => (answer.text ?? '').trim())
    .filter((text) => text.length > 0);

  if (data.type === 'multiple_choice') {
    if (normalizedAnswers.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answers'],
        message: 'Mindestens zwei Antworten müssen eingegeben werden',
      });
      return;
    }
    const normalizedUnique = new Set(
      normalizedAnswers.map((text) => text.toLowerCase())
    );
    if (normalizedUnique.size !== normalizedAnswers.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answers'],
        message: 'Antworten müssen unterschiedlich sein',
      });
    }
  } else if (data.type !== 'upload' && normalizedAnswers.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['answers'],
      message: 'Mindestens eine Antwort muss eingegeben werden',
    });
  }
};

export const questionBaseSchema = z.object({
  content: z.string().trim().min(1, 'Bitte geben Sie eine Frage ein'),
  type: questionTypeSchema,
  points: pointsSchema,
  hint: z.string().optional(),
  category: z.string().optional(),
  bucket_path: z.string().optional(),
  answers: z.array(answerSchema).default([]),
  rallyeIds: idArraySchema.optional(),
});

export const questionCreateSchema = questionBaseSchema.superRefine(
  validateAnswers
);

export const questionUpdateSchema = questionBaseSchema
  .extend({
    answers: z.array(
      z.object({
        id: idSchema.optional(),
        correct: z.boolean(),
        text: z.string().optional(),
      })
    ),
  })
  .superRefine(validateAnswers);

export const formatZodError = (
  error: z.ZodError
): Record<string, string> => {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : 'form';
    if (!issues[key]) {
      issues[key] = issue.message;
    }
  }
  return issues;
};
