'use server';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { revalidatePath } from 'next/cache';

export async function updateVotingBatch(
  rallyeId: number,
  addQuestions: number[],
  removeQuestions: number[]
) {
  await requireProfile();
  const supabase = await createClient();

  // Remove votes
  if (removeQuestions.length > 0) {
    const { error: removeError } = await supabase
      .from('voting')
      .delete()
      .match({ rallye_id: rallyeId })
      .in('question_id', removeQuestions);

    if (removeError) throw removeError; // todo return error message
  }

  // Add new votes
  if (addQuestions.length > 0) {
    const votesToAdd = addQuestions.map((questionId) => ({
      rallye_id: rallyeId,
      question_id: questionId,
    }));

    const { error: addError } = await supabase
      .from('voting')
      .insert(votesToAdd);

    if (addError) throw addError; // todo return error message
  }

  // Revalidate assignment page to reflect updated voting flags
  revalidatePath(`/rallyes/${rallyeId}/questions`);
}

export async function getVotingQuestions(rallyeId: number): Promise<number[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('voting')
    .select('question_id')
    .eq('rallye_id', rallyeId);

  if (error) throw error;
  return data.map((item) => item.question_id); // todo return error message
}
