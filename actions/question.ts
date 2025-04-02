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

  let { data: questions, error: questionError } = await supabase
    .from('questions')
    .select()
    .eq('id', id);

  if (questionError) {
    console.error('Error fetching questions:', questionError);
    // todo return error message
    return [];
  }

  if (!questions || questions.length === 0) {
    console.log('No questions found');
    // todo return error message ?
    return [];
  }

  for (let question of questions) {
    let { data: answers, error: answerError } = await supabase
      .from('answers')
      .select()
      .eq('question_id', question.id);

    if (answerError) {
      console.error(
        `Error fetching answers for question ${question.id}:`,
        answerError
      );
      // todo return error message
      question.answers = [];
    } else {
      question.answers = answers;
    }
  }

  return questions[0];
}

export async function getQuestions(filters: {
  question?: string;
  answer?: string;
  type?: string;
  category?: string;
  enabled?: boolean;
}) {
  console.log('getQuestions', filters);
  const supabase = await createClient();

  let { data: questions, error: questionError } = await supabase
    .from('questions')
    .select();

  if (questionError) {
    console.error('Error fetching questions:', questionError);
    // todo return error message
    return [];
  }

  if (!questions || questions.length === 0) {
    console.log('No questions found');
    return [];
  }

  for (let question of questions) {
    let { data: answers, error: answerError } = await supabase
      .from('answers')
      .select()
      .eq('question_id', question.id);

    if (answerError) {
      console.error(
        `Error fetching answers for question ${question.id}:`,
        answerError
      );
      // todo return error message
      question.answers = [];
    } else {
      question.answers = answers;
    }
  }

  if (filters.question) {
    questions = questions.filter((question) =>
      question.content.toLowerCase().includes(filters.question?.toLowerCase())
    );
  }

  if (filters.answer) {
    questions = questions.filter((question) =>
      question.answers.some((answer) =>
        answer.text.toLowerCase().includes(filters.answer?.toLowerCase())
      )
    );
  }

  if (filters.type && filters.type !== 'all') {
    questions = questions.filter((question) => question.type === filters.type);
  }

  if (filters.category && filters.category !== 'all') {
    questions = questions.filter(
      (question) => question.category === filters.category
    );
  }

  if (filters.enabled && filters.category !== 'false') {
    questions = questions.filter(
      (question) => question.enabled === filters.enabled
    );
  }

  return questions;
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
