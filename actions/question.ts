'use server';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';

export async function getCategories() {
  await requireProfile();
  const supabase = await createClient();

  let { data: categories, error: categoriesError } = await supabase
    .from('questions')
    .select('category')
    .not('category', 'is', null);

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
    // todo return error message
  }

  if (!categories || categories.length === 0) {
    console.error('No questions found');
    return [];
  }

  return [...new Set(categories.map((item) => item.category))];
}

export async function getQuestionById(id: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('questions')
    .select(
      'id, content, type, enabled, points, hint, category, bucket_path, answers(id, correct, text)'
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching question by id:', error);
    return null as any;
  }

  return data as any;
}

export async function getQuestions(filters: {
  question?: string;
  answer?: string;
  type?: string;
  category?: string;
  enabled?: boolean;
}) {
  const supabase = await createClient();

  // Build base query with nested answers to avoid N+1
  let query = supabase
    .from('questions')
    .select(
      'id, content, type, enabled, points, hint, category, bucket_path, answers(id, correct, text)'
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

  if (typeof filters.enabled === 'boolean') {
    query = query.eq('enabled', filters.enabled);
  }

  // If filtering by answer text, narrow by question IDs that match
  if (filters.answer && filters.answer.trim().length > 0) {
    const { data: answerRows, error: answerErr } = await supabase
      .from('answers')
      .select('question_id')
      .ilike('text', `%${filters.answer.trim()}%`);

    if (answerErr) {
      console.error('Error filtering by answer text:', answerErr);
      return [];
    }

    const ids = Array.from(
      new Set((answerRows || []).map((r: any) => r.question_id as number))
    );

    if (ids.length === 0) {
      return [];
    }

    query = query.in('id', ids);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return (data || []) as any[];
}

export async function createQuestion(data: {
  content: string;
  type: string;
  enabled: boolean;
  points?: number;
  hint?: string;
  category?: string;
  bucket_path?: string;
  answers: { correct: boolean; text?: string }[];
}) {
  try {
    const supabase = await createClient();

    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .insert([
        {
          content: data.content,
          type: data.type,
          enabled: data.enabled,
          points: data.points,
          hint: data.hint,
          category: data.category,
          bucket_path: data.bucket_path,
        },
      ])
      .select();

    if (questionError) {
      console.error('Error adding question:', questionError);
      // todo return error message
      return false;
    }

    const questionId = questionData[0].id;

    const answersData = data.answers.map((answer) => ({
      ...answer,
      question_id: questionId,
    }));

    // remove id-attribute from answers (id is auto-incremented in supabase)
    answersData.forEach((answer: any) => {
      if ('id' in answer) {
        delete answer.id;
      }
    });

    const { error: answersError } = await supabase
      .from('answers')
      .insert(answersData);

    if (answersError) {
      console.error('Error adding answers:', answersError);
      // todo return error message
      return false;
    }

    console.log('Question and answers added successfully');
    // todo return success message
    return true;
  } catch (err) {
    console.error('Error processing request:', err);
    // todo return error message
    return false;
  }
}

export async function updateQuestion(
  id: number,
  data: {
    content: string;
    type: string;
    enabled: boolean;
    points?: number;
    hint?: string;
    category?: string;
    bucket_path?: string;
    answers: { id?: number; correct: boolean; text?: string }[];
  }
) {
  try {
    const supabase = await createClient();

    const { error: questionError } = await supabase
      .from('questions')
      // category muss mit null gespeichert werden, um sicherzustellen,
      // dass die Kategorie gelöscht wird, wenn sie leer ist
      .update({
        content: data.content,
        type: data.type,
        enabled: data.enabled,
        points: data.points,
        hint: data.hint,
        category: data.category || null,
        bucket_path: data.bucket_path || null,
      })
      .eq('id', id);

    if (questionError) {
      console.error('Error updating question:', questionError);
      // todo return error message
      return false;
    }

    // Fetch existing answers
    const { data: existingAnswers, error: fetchError } = await supabase
      .from('answers')
      .select('id')
      .eq('question_id', id);

    if (fetchError) {
      console.error('Error fetching existing answers:', fetchError);
      // todo return error message
      return false;
    }

    const existingAnswerIds = existingAnswers.map((answer) => answer.id);
    const newAnswerIds = data.answers
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
        // todo return error message
        return false;
      }
    }

    // Update or insert answers
    for (let answer of data.answers) {
      if (answer.id) {
        // Update existing answer
        const { error: answerError } = await supabase
          .from('answers')
          .update({ correct: answer.correct, text: answer.text })
          .eq('id', answer.id)
          .eq('question_id', id);

        if (answerError) {
          console.error(`Error updating answer ${answer.id}:`, answerError);
          // todo return error message
          return false;
        }
      } else {
        // Insert new answer
        const { error: answerError } = await supabase.from('answers').insert({
          correct: answer.correct,
          text: answer.text,
          question_id: id,
        });

        if (answerError) {
          console.error('Error adding new answer:', answerError);
          // todo return error message
          return false;
        }
      }
    }

    console.log('Question and answers updated successfully');
    // todo return success message
    return true;
  } catch (err) {
    console.error('Error processing request:', err);
    // todo return error message
    return false;
  }
}

export async function deleteQuestion(id: number) {
  try {
    const supabase = await createClient();
    // delete answers first
    const { error: answersError } = await supabase
      .from('answers')
      .delete()
      .eq('question_id', id);

    if (answersError) {
      console.error('Error deleting answers:', answersError);
      // todo return error message
      return false;
    }

    // delete question
    const { error: questionError } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);

    if (questionError) {
      console.error('Error deleting question:', questionError);
      // todo return error message
      return false;
    }

    console.log('Question and answers deleted successfully');
    // todo return success message
    return true;
  } catch (err) {
    console.error('Error processing request:', err);
    // todo return error message
    return false;
  }
}
