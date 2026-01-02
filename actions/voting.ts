'use server';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { revalidatePath } from 'next/cache';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { formatZodError, idArraySchema, idSchema } from '@/lib/validation';

export async function updateVotingBatch(
  rallyeId: number,
  addQuestions: number[],
  removeQuestions: number[]
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const rallyeIdResult = idSchema.safeParse(rallyeId);
  if (!rallyeIdResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(rallyeIdResult.error));
  }
  const addResult = idArraySchema.safeParse(addQuestions);
  if (!addResult.success) {
    return fail('Ungültige Fragen', formatZodError(addResult.error));
  }
  const removeResult = idArraySchema.safeParse(removeQuestions);
  if (!removeResult.success) {
    return fail('Ungültige Fragen', formatZodError(removeResult.error));
  }
  const supabase = await createClient();
  const uniqueAdd = Array.from(new Set(addResult.data));
  const uniqueRemove = Array.from(new Set(removeResult.data));
  const allQuestions = Array.from(new Set([...uniqueAdd, ...uniqueRemove]));

  const { data: existingRallye, error: rallyeError } = await supabase
    .from('rallye')
    .select('id')
    .eq('id', rallyeIdResult.data)
    .maybeSingle();

  if (rallyeError) {
    console.error('Error checking rallye:', rallyeError);
    return fail('Abstimmung konnte nicht aktualisiert werden');
  }

  if (!existingRallye) {
    return fail('Rallye nicht gefunden');
  }

  if (allQuestions.length > 0) {
    const { data: questionRows, error: questionError } = await supabase
      .from('questions')
      .select('id')
      .in('id', allQuestions);

    if (questionError) {
      console.error('Error checking questions:', questionError);
      return fail('Abstimmung konnte nicht aktualisiert werden');
    }

    const existingQuestionIds = new Set(
      (questionRows || [])
        .map((row) => row.id)
        .filter((id): id is number => typeof id === 'number')
    );
    const missing = allQuestions.filter((id) => !existingQuestionIds.has(id));
    if (missing.length > 0) {
      return fail('Fragen nicht gefunden');
    }
  }

  // Remove votes
  if (uniqueRemove.length > 0) {
    const { error: removeError } = await supabase
      .from('voting')
      .delete()
      .match({ rallye_id: rallyeIdResult.data })
      .in('question_id', uniqueRemove);

    if (removeError) {
      console.error('Error removing votes:', removeError);
      return fail('Abstimmung konnte nicht aktualisiert werden');
    }
  }

  // Add new votes
  if (uniqueAdd.length > 0) {
    const votesToAdd = uniqueAdd.map((questionId) => ({
      rallye_id: rallyeIdResult.data,
      question_id: questionId,
    }));

    const { error: addError } = await supabase
      .from('voting')
      .insert(votesToAdd);

    if (addError) {
      console.error('Error adding votes:', addError);
      return fail('Abstimmung konnte nicht aktualisiert werden');
    }
  }

  // Revalidate assignment page to reflect updated voting flags
  revalidatePath(`/rallyes/${rallyeIdResult.data}/questions`);
  return ok({ message: 'Abstimmung aktualisiert' });
}

export async function getVotingQuestions(
  rallyeId: number
): Promise<ActionResult<number[]>> {
  await requireProfile();
  const rallyeIdResult = idSchema.safeParse(rallyeId);
  if (!rallyeIdResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(rallyeIdResult.error));
  }
  const supabase = await createClient();

  const { data: existingRallye, error: rallyeError } = await supabase
    .from('rallye')
    .select('id')
    .eq('id', rallyeIdResult.data)
    .maybeSingle();

  if (rallyeError) {
    console.error('Error checking rallye:', rallyeError);
    return fail('Abstimmung konnte nicht geladen werden');
  }

  if (!existingRallye) {
    return fail('Rallye nicht gefunden');
  }

  const { data, error } = await supabase
    .from('voting')
    .select('question_id')
    .eq('rallye_id', rallyeIdResult.data);

  if (error) {
    console.error('Error fetching voting questions:', error);
    return fail('Abstimmung konnte nicht geladen werden');
  }
  return ok(data.map((item) => item.question_id));
}
