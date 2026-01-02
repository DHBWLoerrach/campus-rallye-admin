'use server';
import { z } from 'zod';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { formatZodError, idSchema, questionTypeSchema } from '@/lib/validation';

type QuestionRow = {
  id: number;
  answer?: string | null;
};

type ParentQuestion = {
  id: number;
  question_type: string | null;
};

const answerTextSchema = z.string().trim().min(1, 'Antwort ist erforderlich');
const questionItemSchema = z.union([
  z.object({ id: idSchema, answer: answerTextSchema }),
  answerTextSchema.transform((answer) => ({ answer })),
]);
const questionsSchema = z.array(questionItemSchema);

export async function getChildren(
  id: number
): Promise<ActionResult<QuestionRow[]>> {
  await requireProfile();
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) {
    return fail('Ungültige Frage-ID', formatZodError(idResult.error));
  }
  const supabase = await createClient();
  const { data: parentRow, error: parentError } = await supabase
    .from('question')
    .select('id')
    .eq('id', idResult.data)
    .maybeSingle();

  if (parentError) {
    console.error('Error checking parent question:', parentError);
    return fail('Antworten konnten nicht geladen werden');
  }

  if (!parentRow) {
    return fail('Frage nicht gefunden');
  }

  const { data: questions, error } = await supabase
    .from('question')
    .select('*')
    .eq('parent_id', idResult.data);
  if (error) {
    console.error('Error fetching child questions:', error);
    return fail('Antworten konnten nicht geladen werden');
  }
  if (!questions) {
    return ok([]);
  }
  return ok(questions as QuestionRow[]);
}

export async function saveQuestions(
  questions: unknown[],
  parent: ParentQuestion
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const parentIdResult = idSchema.safeParse(parent.id);
  if (!parentIdResult.success) {
    return fail('Ungültige Frage-ID', formatZodError(parentIdResult.error));
  }
  const parentTypeResult = questionTypeSchema.safeParse(parent.question_type);
  if (!parentTypeResult.success) {
    return fail('Ungültiger Fragetyp', formatZodError(parentTypeResult.error));
  }
  if (parentTypeResult.data !== 'multiple_choice') {
    return fail('Ungültiger Fragetyp');
  }
  const questionsResult = questionsSchema.safeParse(questions);
  if (!questionsResult.success) {
    return fail('Ungültige Antworten', formatZodError(questionsResult.error));
  }
  const supabase = await createClient();
  const currentQuestionsResult = await getChildren(parentIdResult.data);
  if (!currentQuestionsResult.success) {
    return fail(currentQuestionsResult.error, currentQuestionsResult.issues);
  }
  const current_questions = currentQuestionsResult.data ?? [];
  const normalizedQuestions = questionsResult.data;

  for (const item of current_questions) {
    if (
      !normalizedQuestions.some(
        (question) => 'id' in question && question.id === item.id
      )
    ) {
      // delete
      const { error } = await supabase
        .from('question')
        .delete()
        .eq('id', item.id);
      if (error) {
        console.error('Error deleting question:', error);
        return fail('Antworten konnten nicht aktualisiert werden');
      }
    }
  }

  // Fragen aktualisieren oder erstellen
  for (const item of normalizedQuestions) {
    if ('id' in item) {
      if (current_questions.some((question) => question.id === item.id)) {
        // update
        const { error } = await supabase
          .from('question')
          .update({
            answer: item.answer,
          })
          .eq('id', item.id);
        if (error) {
          console.error('Error updating question:', error);
          return fail('Antworten konnten nicht aktualisiert werden');
        }
      } else {
        return fail('Antwort nicht gefunden');
      }
    } else if (typeof item.answer === 'string') {
      const { error } = await supabase.from('question').insert({
        // created_at: new Date().toISOString(),
        question_type: parentTypeResult.data,
        // category: parent.category,
        question: null,

        answer: item.answer,
        points: null,
        parent_id: parentIdResult.data,
        uri: null,
        // video: parent.video,
        // hint: parent.hint,
      });
      if (error) {
        console.error('Error creating question from string:', error);
        return fail('Antworten konnten nicht aktualisiert werden');
      }
    } else {
      return fail('Ungültige Antwortdaten');
    }
  }
  return ok({ message: 'Antworten aktualisiert' });
}
