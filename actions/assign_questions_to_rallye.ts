'use server';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { revalidatePath } from 'next/cache';

export async function assignQuestionsToRallye(
  rallyeId: number,
  questionIds: number[]
) {
  const supabase = await createClient();
  await requireProfile();

  try {
    const { data: existingAssignments } = await supabase
      .from('join_rallye_questions')
      .select('question_id')
      .eq('rallye_id', rallyeId);

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
  } catch (error) {
    console.error('Error in assignQuestionsToRallye:', error);
    // todo return error message
  }
}

export async function getRallyeQuestions(rallyeId: number) {
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
