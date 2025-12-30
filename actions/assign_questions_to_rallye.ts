'use server';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { revalidatePath } from 'next/cache';

export async function assignQuestionsToRallye(
  rallyeId: number,
  questionIds: number[]
) {
  await requireProfile();
  const supabase = await createClient();

  const { data: existingAssignments, error: existingError } = await supabase
    .from('join_rallye_questions')
    .select('question_id')
    .eq('rallye_id', rallyeId);

  if (existingError) throw existingError;

  const existingQuestionIds =
    existingAssignments?.map((a) => a.question_id) || [];

  const questionsToAdd = questionIds.filter(
    (id) => !existingQuestionIds.includes(id)
  );
  const questionsToRemove = existingQuestionIds.filter(
    (id) => !questionIds.includes(id)
  );

  // Remove unselected
  if (questionsToRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('join_rallye_questions')
      .delete()
      .eq('rallye_id', rallyeId)
      .in('question_id', questionsToRemove);

    if (deleteError) throw deleteError; // todo return error message
  }

  // Add new
  if (questionsToAdd.length > 0) {
    const newAssignments = questionsToAdd.map((questionId) => ({
      rallye_id: rallyeId,
      question_id: questionId,
    }));

    const { error: insertError } = await supabase
      .from('join_rallye_questions')
      .insert(newAssignments);

    if (insertError) throw insertError; // todo return error message
  }

  // Invalidate cached pages that depend on these assignments
  revalidatePath('/rallyes');
  revalidatePath(`/rallyes/${rallyeId}/questions`);
  return true;
}

export async function getRallyeQuestions(rallyeId: number) {
  await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('join_rallye_questions')
    .select('question_id')
    .eq('rallye_id', rallyeId);

  if (error) {
    console.error('Error fetching rallye questions:', error);
    // todo return error message
    return [];
  }

  return data.map((row) => row.question_id);
}

export async function assignRallyesToQuestion(
  questionId: number,
  rallyeIds: number[]
) {
  await requireProfile();
  const supabase = await createClient();

  const { data: existingAssignments, error: existingError } = await supabase
    .from('join_rallye_questions')
    .select('rallye_id')
    .eq('question_id', questionId);

  if (existingError) throw existingError;

  const existingRallyeIds =
    existingAssignments?.map((a) => a.rallye_id) || [];
  const uniqueRallyeIds = Array.from(new Set(rallyeIds));

  const rallyesToAdd = uniqueRallyeIds.filter(
    (id) => !existingRallyeIds.includes(id)
  );
  const rallyesToRemove = existingRallyeIds.filter(
    (id) => !uniqueRallyeIds.includes(id)
  );

  if (rallyesToRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('join_rallye_questions')
      .delete()
      .eq('question_id', questionId)
      .in('rallye_id', rallyesToRemove);

    if (deleteError) throw deleteError;
  }

  if (rallyesToAdd.length > 0) {
    const newAssignments = rallyesToAdd.map((rallyeId) => ({
      rallye_id: rallyeId,
      question_id: questionId,
    }));

    const { error: insertError } = await supabase
      .from('join_rallye_questions')
      .insert(newAssignments);

    if (insertError) throw insertError;
  }

  revalidatePath('/rallyes');
  revalidatePath('/questions');
  const revalidateRallyes = new Set([...rallyesToAdd, ...rallyesToRemove]);
  revalidateRallyes.forEach((rallyeId) => {
    revalidatePath(`/rallyes/${rallyeId}/questions`);
  });
  return true;
}

export async function getQuestionRallyes(questionId: number) {
  await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('join_rallye_questions')
    .select('rallye_id')
    .eq('question_id', questionId);

  if (error) {
    console.error('Error fetching question rallyes:', error);
    return [];
  }

  return data.map((row) => row.rallye_id);
}
