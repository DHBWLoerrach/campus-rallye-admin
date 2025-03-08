'use server'

import { createClient } from "@/lib/supabase/server"

export async function updateVotingBatch(
  rallyeId: number, 
  addQuestions: number[], 
  removeQuestions: number[]
) {
  const supabase = createClient();

  // Remove votes
  if (removeQuestions.length > 0) {
      const { error: removeError } = await supabase
          .from('voting')
          .delete()
          .match({ rallye_id: rallyeId })
          .in('question_id', removeQuestions);

      if (removeError) throw removeError;
  }

  // Add new votes
  if (addQuestions.length > 0) {
      const votesToAdd = addQuestions.map(questionId => ({
          rallye_id: rallyeId,
          question_id: questionId
      }));

      const { error: addError } = await supabase
          .from('voting')
          .insert(votesToAdd);

      if (addError) throw addError;
  }
}

export async function getVotingQuestions(rallyeId: number): Promise<number[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('voting')
    .select('question_id')
    .eq('rallye_id', rallyeId)
  
  if (error) throw error
  return data.map(item => item.question_id)
}