'use server';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import type { Question } from '@/helpers/questions';
import { assignRallyesToQuestion } from '@/actions/assign_questions_to_rallye';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import {
  formatZodError,
  idSchema,
  questionCreateSchema,
  questionUpdateSchema,
} from '@/lib/validation';

export async function getCategories(): Promise<ActionResult<string[]>> {
  await requireProfile();
  const supabase = await createClient();

  const { data: categories, error: categoriesError } = await supabase
    .from('questions')
    .select('category')
    .not('category', 'is', null);

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
    return fail('Kategorien konnten nicht geladen werden');
  }

  if (!categories || categories.length === 0) {
    return ok([]);
  }

  return ok([...new Set(categories.map((item) => item.category as string))]);
}

export async function getQuestionById(
  id: number
): Promise<ActionResult<Question | null>> {
  await requireProfile();
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) {
    return fail('Ungültige Frage-ID', formatZodError(idResult.error));
  }
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('questions')
    .select(
      'id, content, type, points, hint, category, bucket_path, answers(id, correct, text)'
    )
    .eq('id', idResult.data)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching question by id:', error);
    return fail('Frage konnte nicht geladen werden');
  }

  return ok(data as Question);
}

export async function getQuestions(filters: {
  question?: string;
  answer?: string;
  type?: string;
  category?: string;
  rallyeId?: string;
}): Promise<ActionResult<Question[]>> {
  await requireProfile();
  const supabase = await createClient();

  // Build base query with nested answers to avoid N+1
  let query = supabase
    .from('questions')
    .select(
      'id, content, type, points, hint, category, bucket_path, answers(id, correct, text)'
    );

  if (filters.question && filters.question.trim().length > 0) {
    query = query.ilike('content', `%${filters.question.trim()}%`);
  }

  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  if (filters.rallyeId && filters.rallyeId !== 'all') {
    const rallyeId = Number(filters.rallyeId);
    if (!Number.isNaN(rallyeId)) {
      const { data: rallyeRows, error: rallyeErr } = await supabase
        .from('join_rallye_questions')
        .select('question_id')
        .eq('rallye_id', rallyeId);

      if (rallyeErr) {
        console.error('Error filtering by rallye:', rallyeErr);
        return fail('Fragen konnten nicht geladen werden');
      }

      const ids = Array.from(
        new Set(
          (rallyeRows || [])
            .map((row) => row.question_id)
            .filter((id): id is number => typeof id === 'number')
        )
      );

      if (ids.length === 0) {
        return ok([]);
      }

      query = query.in('id', ids);
    }
  }

  // If filtering by answer text, narrow by question IDs that match
  if (filters.answer && filters.answer.trim().length > 0) {
    const { data: answerRows, error: answerErr } = await supabase
      .from('answers')
      .select('question_id')
      .ilike('text', `%${filters.answer.trim()}%`);

    if (answerErr) {
      console.error('Error filtering by answer text:', answerErr);
      return fail('Fragen konnten nicht geladen werden');
    }

    const ids = Array.from(
      new Set(
        (answerRows || [])
          .map((row) => row.question_id)
          .filter(
            (id): id is number => typeof id === 'number'
          )
      )
    );

    if (ids.length === 0) {
      return ok([]);
    }

    query = query.in('id', ids);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching questions:', error);
    return fail('Fragen konnten nicht geladen werden');
  }

  return ok((data || []) as Question[]);
}

export async function createQuestion(data: {
  content: string;
  type: string;
  points?: number;
  hint?: string;
  category?: string;
  bucket_path?: string;
  answers: { correct: boolean; text?: string }[];
  rallyeIds?: number[];
}): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const parsed = questionCreateSchema.safeParse(data);
  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }
  try {
    const supabase = await createClient();
    const answers = parsed.data.answers.filter(
      (answer) => (answer.text ?? '').trim().length > 0
    );

    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .insert([
        {
          content: parsed.data.content,
          type: parsed.data.type,
          points: parsed.data.points,
          hint: parsed.data.hint,
          category: parsed.data.category,
          bucket_path: parsed.data.bucket_path,
        },
      ])
      .select();

    if (questionError || !questionData || questionData.length === 0) {
      console.error('Error adding question:', questionError);
      return fail('Frage konnte nicht gespeichert werden');
    }

    const questionId = questionData[0].id;

    type AnswerInsert = {
      correct: boolean;
      text?: string;
      question_id: number;
      id?: number;
    };
    const answersData: AnswerInsert[] = answers.map((answer) => ({
      ...answer,
      question_id: questionId,
    }));

    // remove id-attribute from answers (id is auto-incremented in supabase)
    answersData.forEach((answer) => {
      if ('id' in answer) {
        delete answer.id;
      }
    });

    if (answersData.length > 0) {
      const { error: answersError } = await supabase
        .from('answers')
        .insert(answersData);

      if (answersError) {
        console.error('Error adding answers:', answersError);
        return fail('Antworten konnten nicht gespeichert werden');
      }
    }

    if (parsed.data.rallyeIds && parsed.data.rallyeIds.length > 0) {
      const assignResult = await assignRallyesToQuestion(
        questionId,
        parsed.data.rallyeIds
      );
      if (!assignResult.success) {
        return fail(assignResult.error, assignResult.issues);
      }
    }

    console.log('Question and answers added successfully');
    return ok({ message: 'Frage erfolgreich gespeichert' });
  } catch (err) {
    console.error('Error processing request:', err);
    return fail('Frage konnte nicht gespeichert werden');
  }
}

export async function updateQuestion(
  id: number,
  data: {
    content: string;
    type: string;
    points?: number;
    hint?: string;
    category?: string;
    bucket_path?: string;
    answers: { id?: number; correct: boolean; text?: string }[];
    rallyeIds?: number[];
  }
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) {
    return fail('Ungültige Frage-ID', formatZodError(idResult.error));
  }
  const parsed = questionUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }
  try {
    const supabase = await createClient();
    const answers = parsed.data.answers.filter(
      (answer) => (answer.text ?? '').trim().length > 0
    );

    const { data: existingQuestion, error: existingError } = await supabase
      .from('questions')
      .select('id')
      .eq('id', idResult.data)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking question:', existingError);
      return fail('Frage konnte nicht gespeichert werden');
    }

    if (!existingQuestion) {
      return fail('Frage nicht gefunden');
    }

    const { error: questionError } = await supabase
      .from('questions')
      // category muss mit null gespeichert werden, um sicherzustellen,
      // dass die Kategorie gelöscht wird, wenn sie leer ist
      .update({
        content: parsed.data.content,
        type: parsed.data.type,
        points: parsed.data.points,
        hint: parsed.data.hint,
        category: parsed.data.category || null,
        bucket_path: parsed.data.bucket_path || null,
      })
      .eq('id', idResult.data);

    if (questionError) {
      console.error('Error updating question:', questionError);
      return fail('Frage konnte nicht gespeichert werden');
    }

    // Fetch existing answers
    const { data: existingAnswers, error: fetchError } = await supabase
      .from('answers')
      .select('id')
      .eq('question_id', idResult.data);

    if (fetchError) {
      console.error('Error fetching existing answers:', fetchError);
      return fail('Antworten konnten nicht geladen werden');
    }

    const existingAnswerIds = existingAnswers.map((answer) => answer.id);
    const newAnswerIds = answers
      .map((answer) => answer.id)
      .filter((id) => id !== undefined);

    // Delete answers that are not in the new list
    const answersToDelete = existingAnswerIds.filter(
      (id) => !newAnswerIds.includes(id)
    );
    if (answersToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('answers')
        .delete()
        .in('id', answersToDelete);

      if (deleteError) {
        console.error('Error deleting answers:', deleteError);
        return fail('Antworten konnten nicht aktualisiert werden');
      }
    }

    // Update or insert answers
    for (const answer of answers) {
      if (answer.id) {
        // Update existing answer
        const { error: answerError } = await supabase
          .from('answers')
          .update({ correct: answer.correct, text: answer.text })
          .eq('id', answer.id)
          .eq('question_id', idResult.data);

        if (answerError) {
          console.error(`Error updating answer ${answer.id}:`, answerError);
          return fail('Antworten konnten nicht aktualisiert werden');
        }
      } else {
        // Insert new answer
        const { error: answerError } = await supabase.from('answers').insert({
          correct: answer.correct,
          text: answer.text,
          question_id: idResult.data,
        });

        if (answerError) {
          console.error('Error adding new answer:', answerError);
          return fail('Antworten konnten nicht aktualisiert werden');
        }
      }
    }

    if (parsed.data.rallyeIds !== undefined) {
      const assignResult = await assignRallyesToQuestion(
        idResult.data,
        parsed.data.rallyeIds
      );
      if (!assignResult.success) {
        return fail(assignResult.error, assignResult.issues);
      }
    }

    console.log('Question and answers updated successfully');
    return ok({ message: 'Frage erfolgreich gespeichert' });
  } catch (err) {
    console.error('Error processing request:', err);
    return fail('Frage konnte nicht gespeichert werden');
  }
}

export async function deleteQuestion(
  id: number
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const idResult = idSchema.safeParse(id);
  if (!idResult.success) {
    return fail('Ungültige Frage-ID', formatZodError(idResult.error));
  }
  try {
    const supabase = await createClient();

    const { data: existingQuestion, error: existingError } = await supabase
      .from('questions')
      .select('id')
      .eq('id', idResult.data)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking question:', existingError);
      return fail('Frage konnte nicht gelöscht werden');
    }

    if (!existingQuestion) {
      return fail('Frage nicht gefunden');
    }

    // delete answers first
    const { error: answersError } = await supabase
      .from('answers')
      .delete()
      .eq('question_id', idResult.data);

    if (answersError) {
      console.error('Error deleting answers:', answersError);
      return fail('Frage konnte nicht gelöscht werden');
    }

    // delete question
    const { error: questionError } = await supabase
      .from('questions')
      .delete()
      .eq('id', idResult.data);

    if (questionError) {
      console.error('Error deleting question:', questionError);
      return fail('Frage konnte nicht gelöscht werden');
    }

    console.log('Question and answers deleted successfully');
    return ok({ message: 'Frage erfolgreich gelöscht' });
  } catch (err) {
    console.error('Error processing request:', err);
    return fail('Frage konnte nicht gelöscht werden');
  }
}
