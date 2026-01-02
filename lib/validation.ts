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

export const rallyeCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich'),
});

export const rallyeUpdateSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, 'Name ist erforderlich'),
  status: rallyeStatusSchema,
  studiengang: z.string().trim().min(1, 'Studiengang ist erforderlich'),
  password: z.string().optional().default(''),
  end_time: z.string().optional(),
});

export const questionBaseSchema = z.object({
  content: z.string().trim().min(1, 'Bitte geben Sie eine Frage ein'),
  type: questionTypeSchema,
  points: z.number().min(0).finite().optional(),
  hint: z.string().optional(),
  category: z.string().optional(),
  bucket_path: z.string().optional(),
  answers: z.array(z.object({ correct: z.boolean(), text: z.string().optional() })),
  rallyeIds: z.array(z.number().int().positive()).optional(),
});

export const questionUpdateSchema = questionBaseSchema.extend({
  answers: z.array(
    z.object({
      id: z.number().int().positive().optional(),
      correct: z.boolean(),
      text: z.string().optional(),
    })
  ),
});

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
