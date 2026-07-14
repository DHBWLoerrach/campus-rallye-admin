import { z } from 'zod';
import {
  QUESTION_TYPE_IDS,
  type QuestionTypeId,
} from '@/helpers/questionTypes';
import { RALLYE_STATUSES } from '@/lib/types';

export const rallyeStatusValues = RALLYE_STATUSES;
export const rallyeStatusSchema = z.enum(RALLYE_STATUSES);

export const questionTypeSchema = z.enum(QUESTION_TYPE_IDS);
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

export const geocachingConfigSchema = z.object({
  target_latitude: z
    .number({ error: 'Bitte einen gültigen Breitengrad eingeben' })
    .finite('Der Breitengrad muss eine endliche Zahl sein')
    .min(-90, 'Der Breitengrad muss mindestens -90 sein')
    .max(90, 'Der Breitengrad darf höchstens 90 sein'),
  target_longitude: z
    .number({ error: 'Bitte einen gültigen Längengrad eingeben' })
    .finite('Der Längengrad muss eine endliche Zahl sein')
    .min(-180, 'Der Längengrad muss mindestens -180 sein')
    .max(180, 'Der Längengrad darf höchstens 180 sein'),
  proximity_radius: z
    .number({ error: 'Bitte einen gültigen Näherungsradius eingeben' })
    .finite('Der Näherungsradius muss eine endliche Zahl sein')
    .int('Der Näherungsradius muss eine ganze Zahl sein')
    .positive('Der Näherungsradius muss größer als 0 sein')
    .default(10),
  input_type: z
    .enum(['text', 'qr'], {
      error: 'Bitte Text oder QR-Code als Eingabeart wählen',
    })
    .default('text'),
});

interface QuestionValidationData {
  type: QuestionTypeId;
  bucket_path?: string | null;
  solutionOptions: { correct: boolean; text?: string }[];
}

const validateQuestionDetails = (
  data: QuestionValidationData,
  ctx: z.RefinementCtx
) => {
  if (data.type === 'picture' && !data.bucket_path?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['bucket_path'],
      message: 'Bitte ein Bild hochladen',
    });
  }

  const nonEmptyAnswers = data.solutionOptions.filter(
    (answer) => (answer.text ?? '').trim().length > 0
  );
  const normalizedAnswers = nonEmptyAnswers.map((answer) =>
    (answer.text ?? '').trim()
  );

  if (data.type === 'geocaching') {
    if (nonEmptyAnswers.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['solutionOptions'],
        message: 'Genau eine Lösung muss eingegeben werden',
      });
      return;
    }

    if (!nonEmptyAnswers[0].correct) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['solutionOptions'],
        message: 'Die Lösung muss als richtig markiert sein',
      });
    }
    return;
  }

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

const nonGeocachingTypeSchema = z.enum([
  'multiple_choice',
  'knowledge',
  'picture',
  'qr_code',
  'upload',
]);

const createQuestionCommonShape = {
  content: z.string().trim().min(1, 'Bitte eine Frage eingeben'),
  point_value: pointValueSchema,
  hint: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  bucket_path: z.string().optional().nullable(),
  solutionOptions: z.array(solutionOptionSchema).default([]),
  rallyeIds: idArraySchema.optional(),
};

const updateSolutionOptionSchema = solutionOptionSchema.extend({
  id: idSchema.optional(),
});

const updateQuestionCommonShape = {
  ...createQuestionCommonShape,
  solutionOptions: z.array(updateSolutionOptionSchema),
};

export const questionCreateSchema = z
  .discriminatedUnion('type', [
    z.object({
      ...createQuestionCommonShape,
      type: z.literal('geocaching'),
      geocaching: geocachingConfigSchema,
    }),
    z.object({
      ...createQuestionCommonShape,
      type: nonGeocachingTypeSchema,
      geocaching: z.never().optional(),
    }),
  ])
  .superRefine(validateQuestionDetails);

export const questionUpdateSchema = z
  .discriminatedUnion('type', [
    z.object({
      ...updateQuestionCommonShape,
      type: z.literal('geocaching'),
      geocaching: geocachingConfigSchema,
    }),
    z.object({
      ...updateQuestionCommonShape,
      type: nonGeocachingTypeSchema,
      geocaching: z.never().optional(),
    }),
  ])
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
