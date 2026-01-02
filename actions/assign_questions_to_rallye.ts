'use server';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { revalidatePath } from 'next/cache';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { formatZodError, idArraySchema, idSchema } from '@/lib/validation';

export async function assignQuestionsToRallye(
  rallyeId: number,
  questionIds: number[]
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const rallyeIdResult = idSchema.safeParse(rallyeId);
  if (!rallyeIdResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(rallyeIdResult.error));
  }
  const questionIdsResult = idArraySchema.safeParse(questionIds);
  if (!questionIdsResult.success) {
    return fail('Ungültige Fragen', formatZodError(questionIdsResult.error));
  }
  const supabase = await createClient();
  const normalizedQuestionIds = Array.from(new Set(questionIdsResult.data));

  const { data: existingRallye, error: rallyeError } = await supabase
    .from('rallye')
    .select('id')
    .eq('id', rallyeIdResult.data)
    .maybeSingle();

  if (rallyeError) {
    console.error('Error checking rallye:', rallyeError);
    return fail('Rallye konnte nicht aktualisiert werden');
  }

  if (!existingRallye) {
    return fail('Rallye nicht gefunden');
  }

  if (normalizedQuestionIds.length > 0) {
    const { data: questionRows, error: questionError } = await supabase
      .from('questions')
      .select('id')
      .in('id', normalizedQuestionIds);

    if (questionError) {
      console.error('Error checking questions:', questionError);
      return fail('Fragen konnten nicht geladen werden');
    }

    const existingQuestionIds = new Set(
      (questionRows || [])
        .map((row) => row.id)
        .filter((id): id is number => typeof id === 'number')
    );
    const missing = normalizedQuestionIds.filter(
      (id) => !existingQuestionIds.has(id)
    );
    if (missing.length > 0) {
      return fail('Fragen nicht gefunden');
    }
  }

  const { data: existingAssignments, error: existingError } = await supabase
    .from('join_rallye_questions')
    .select('question_id')
    .eq('rallye_id', rallyeIdResult.data);

  if (existingError) {
    console.error('Error fetching rallye assignments:', existingError);
    return fail('Rallye konnte nicht aktualisiert werden');
  }

  const existingQuestionIds =
    existingAssignments?.map((a) => a.question_id) || [];

  const questionsToAdd = normalizedQuestionIds.filter(
    (id) => !existingQuestionIds.includes(id)
  );
  const questionsToRemove = existingQuestionIds.filter(
    (id) => !normalizedQuestionIds.includes(id)
  );

  // Remove unselected
  if (questionsToRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('join_rallye_questions')
      .delete()
      .eq('rallye_id', rallyeIdResult.data)
      .in('question_id', questionsToRemove);

    if (deleteError) {
      console.error('Error removing questions from rallye:', deleteError);
      return fail('Rallye konnte nicht aktualisiert werden');
    }
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

    if (insertError) {
      console.error('Error adding questions to rallye:', insertError);
      return fail('Rallye konnte nicht aktualisiert werden');
    }
  }

  // Invalidate cached pages that depend on these assignments
  revalidatePath('/rallyes');
  revalidatePath(`/rallyes/${rallyeIdResult.data}/questions`);
  return ok({ message: 'Fragen erfolgreich zugeordnet' });
}

export async function getRallyeQuestions(
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
    return fail('Rallye konnte nicht geladen werden');
  }

  if (!existingRallye) {
    return fail('Rallye nicht gefunden');
  }

  const { data, error } = await supabase
    .from('join_rallye_questions')
    .select('question_id')
    .eq('rallye_id', rallyeIdResult.data);

  if (error) {
    console.error('Error fetching rallye questions:', error);
    return fail('Fragen konnten nicht geladen werden');
  }

  return ok(data.map((row) => row.question_id));
}

export async function assignRallyesToQuestion(
  questionId: number,
  rallyeIds: number[]
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const questionIdResult = idSchema.safeParse(questionId);
  if (!questionIdResult.success) {
    return fail('Ungültige Frage-ID', formatZodError(questionIdResult.error));
  }
  const rallyeIdsResult = idArraySchema.safeParse(rallyeIds);
  if (!rallyeIdsResult.success) {
    return fail('Ungültige Rallyes', formatZodError(rallyeIdsResult.error));
  }
  const supabase = await createClient();
  const normalizedRallyeIds = Array.from(new Set(rallyeIdsResult.data));

  const { data: existingQuestion, error: questionError } = await supabase
    .from('questions')
    .select('id')
    .eq('id', questionIdResult.data)
    .maybeSingle();

  if (questionError) {
    console.error('Error checking question:', questionError);
    return fail('Frage konnte nicht aktualisiert werden');
  }

  if (!existingQuestion) {
    return fail('Frage nicht gefunden');
  }

  if (normalizedRallyeIds.length > 0) {
    const { data: rallyeRows, error: rallyeError } = await supabase
      .from('rallye')
      .select('id')
      .in('id', normalizedRallyeIds);

    if (rallyeError) {
      console.error('Error checking rallyes:', rallyeError);
      return fail('Rallyes konnten nicht geladen werden');
    }

    const existingRallyeIds = new Set(
      (rallyeRows || [])
        .map((row) => row.id)
        .filter((id): id is number => typeof id === 'number')
    );
    const missing = normalizedRallyeIds.filter(
      (id) => !existingRallyeIds.has(id)
    );
    if (missing.length > 0) {
      return fail('Rallye nicht gefunden');
    }
  }

  const { data: existingAssignments, error: existingError } = await supabase
    .from('join_rallye_questions')
    .select('rallye_id')
    .eq('question_id', questionIdResult.data);

  if (existingError) {
    console.error('Error fetching question assignments:', existingError);
    return fail('Frage konnte nicht aktualisiert werden');
  }

  const existingRallyeIds =
    existingAssignments?.map((a) => a.rallye_id) || [];

  const rallyesToAdd = normalizedRallyeIds.filter(
    (id) => !existingRallyeIds.includes(id)
  );
  const rallyesToRemove = existingRallyeIds.filter(
    (id) => !normalizedRallyeIds.includes(id)
  );

  if (rallyesToRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('join_rallye_questions')
      .delete()
      .eq('question_id', questionIdResult.data)
      .in('rallye_id', rallyesToRemove);

    if (deleteError) {
      console.error('Error removing rallyes from question:', deleteError);
      return fail('Frage konnte nicht aktualisiert werden');
    }
  }

  if (rallyesToAdd.length > 0) {
    const newAssignments = rallyesToAdd.map((rallyeId) => ({
      rallye_id: rallyeId,
      question_id: questionId,
    }));

    const { error: insertError } = await supabase
      .from('join_rallye_questions')
      .insert(newAssignments);

    if (insertError) {
      console.error('Error adding rallyes to question:', insertError);
      return fail('Frage konnte nicht aktualisiert werden');
    }
  }

  revalidatePath('/rallyes');
  revalidatePath('/questions');
  const revalidateRallyes = new Set([...rallyesToAdd, ...rallyesToRemove]);
  revalidateRallyes.forEach((rallyeId) => {
    revalidatePath(`/rallyes/${rallyeId}/questions`);
  });
  return ok({ message: 'Rallyes erfolgreich zugeordnet' });
}

export async function getQuestionRallyes(
  questionId: number
): Promise<ActionResult<number[]>> {
  await requireProfile();
  const questionIdResult = idSchema.safeParse(questionId);
  if (!questionIdResult.success) {
    return fail('Ungültige Frage-ID', formatZodError(questionIdResult.error));
  }
  const supabase = await createClient();

  const { data: existingQuestion, error: questionError } = await supabase
    .from('questions')
    .select('id')
    .eq('id', questionIdResult.data)
    .maybeSingle();

  if (questionError) {
    console.error('Error checking question:', questionError);
    return fail('Frage konnte nicht geladen werden');
  }

  if (!existingQuestion) {
    return fail('Frage nicht gefunden');
  }

  const { data, error } = await supabase
    .from('join_rallye_questions')
    .select('rallye_id')
    .eq('question_id', questionIdResult.data);

  if (error) {
    console.error('Error fetching question rallyes:', error);
    return fail('Rallyes konnten nicht geladen werden');
  }

  return ok(data.map((row) => row.rallye_id));
}

export async function getQuestionRallyeMap(
  questionIds: number[]
): Promise<ActionResult<Record<number, string[]>>> {
  await requireProfile();
  const questionIdsResult = idArraySchema.safeParse(questionIds);
  if (!questionIdsResult.success) {
    return fail('Ungültige Fragen', formatZodError(questionIdsResult.error));
  }
  if (questionIdsResult.data.length === 0) {
    return ok({});
  }

  const supabase = await createClient();
  const normalizedQuestionIds = Array.from(new Set(questionIdsResult.data));
  const { data: questionRows, error: questionError } = await supabase
    .from('questions')
    .select('id')
    .in('id', normalizedQuestionIds);

  if (questionError) {
    console.error('Error checking questions:', questionError);
    return fail('Rallyes konnten nicht geladen werden');
  }

  const existingQuestionIds = new Set(
    (questionRows || [])
      .map((row) => row.id)
      .filter((id): id is number => typeof id === 'number')
  );
  const missing = normalizedQuestionIds.filter(
    (id) => !existingQuestionIds.has(id)
  );
  if (missing.length > 0) {
    return fail('Fragen nicht gefunden');
  }

  const { data: joins, error: joinError } = await supabase
    .from('join_rallye_questions')
    .select('question_id, rallye_id')
    .in('question_id', normalizedQuestionIds);

  if (joinError) {
    console.error('Error fetching question rallye links:', joinError);
    return fail('Rallyes konnten nicht geladen werden');
  }

  const rallyeIds = Array.from(
    new Set(
      (joins || [])
        .map((row) => row.rallye_id)
        .filter((id): id is number => typeof id === 'number')
    )
  );

  if (rallyeIds.length === 0) {
    return ok({});
  }

  const { data: rallyes, error: rallyeError } = await supabase
    .from('rallye')
    .select('id, name')
    .in('id', rallyeIds);

  if (rallyeError) {
    console.error('Error fetching rallye names:', rallyeError);
    return fail('Rallyes konnten nicht geladen werden');
  }

  const rallyeNameById = new Map<number, string>();
  (rallyes || []).forEach((rallye) => {
    rallyeNameById.set(rallye.id, rallye.name);
  });

  const map = new Map<number, string[]>();
  (joins || []).forEach((row) => {
    const rallyeName = rallyeNameById.get(row.rallye_id);
    if (!rallyeName) return;
    const existing = map.get(row.question_id) ?? [];
    existing.push(rallyeName);
    map.set(row.question_id, existing);
  });

  const result: Record<number, string[]> = {};
  map.forEach((names, questionId) => {
    result[questionId] = names.sort((a, b) =>
      a.localeCompare(b, 'de', { sensitivity: 'base' })
    );
  });
  return ok(result);
}
