import { z } from 'zod';
import { questionTypes } from '@/helpers/questionTypes';
import { RALLYE_STATUSES } from '@/lib/types';

export const rallyeStatusValues = RALLYE_STATUSES;
export const rallyeStatusSchema = z.enum(RALLYE_STATUSES);

const questionTypeIds = questionTypes.map((type) => type.id) as [
  string,
  ...string[],
];

export const questionTypeSchema = z.enum(questionTypeIds);
export const idSchema = z.coerce.number().int().positive();
export const idArraySchema = z.array(idSchema);

const pointValueSchema = z.preprocess((value) => {
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
  rallye_code: z.string().optional().default(''),
  rallye_end: z.string().optional(),
});

export const locationCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich'),
  default_rallye_id: idSchema.optional(),
});

export const locationUpdateSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, 'Name ist erforderlich'),
  default_rallye_id: idSchema.optional(),
});

export const departmentCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich'),
  location_id: idSchema,
});

export const departmentUpdateSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, 'Name ist erforderlich'),
  location_id: idSchema,
});

const solutionOptionSchema = z.object({
  correct: z.boolean(),
  text: z.string().optional(),
});

const validateQuestionDetails = (
  data: {
    type: string;
    bucket_path?: string | null;
    solutionOptions: { correct: boolean; text?: string }[];
  },
  ctx: z.RefinementCtx
) => {
  if (data.type === 'picture' && !data.bucket_path?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['bucket_path'],
      message: 'Bitte ein Bild hochladen',
    });
  }

  const normalizedAnswers = data.solutionOptions
    .map((answer) => (answer.text ?? '').trim())
    .filter((text) => text.length > 0);

  if (data.type === 'multiple_choice') {
    if (normalizedAnswers.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['solutionOptions'],
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
        path: ['solutionOptions'],
        message: 'Antworten müssen unterschiedlich sein',
      });
    }
  } else if (data.type !== 'upload' && normalizedAnswers.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['solutionOptions'],
      message: 'Mindestens eine Antwort muss eingegeben werden',
    });
  }
};

export const questionBaseSchema = z.object({
  content: z.string().trim().min(1, 'Bitte geben Sie eine Frage ein'),
  type: questionTypeSchema,
  point_value: pointValueSchema,
  hint: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  bucket_path: z.string().optional().nullable(),
  solutionOptions: z.array(solutionOptionSchema).default([]),
  rallyeIds: idArraySchema.optional(),
});

export const questionCreateSchema = questionBaseSchema.superRefine(
  validateQuestionDetails
);

export const questionUpdateSchema = questionBaseSchema
  .extend({
    solutionOptions: z.array(
      z.object({
        id: idSchema.optional(),
        correct: z.boolean(),
        text: z.string().optional(),
      })
    ),
  })
  .superRefine(validateQuestionDetails);

export const formatZodError = (error: z.ZodError): Record<string, string> => {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : 'form';
    if (!issues[key]) {
      issues[key] = issue.message;
    }
  }
  return issues;
};
