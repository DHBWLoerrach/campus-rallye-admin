'use server';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import type {
  GeocachingConfig,
  GeocachingFormConfig,
  Question,
  SolutionOption,
} from '@/helpers/questions';
import {
  QUESTION_TYPE_IDS,
  type QuestionTypeId,
} from '@/helpers/questionTypes';
import { assignRallyesToQuestion } from '@/actions/assign_questions_to_rallye';
import { deleteImage } from '@/actions/upload';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import {
  formatZodError,
  idSchema,
  questionCreateSchema,
  questionUpdateSchema,
} from '@/lib/validation';
import type { QuestionCatalogFilters } from '@/lib/question-filters';

const QUESTION_SELECT =
  'id, content, type, point_value, hint, category, bucket_path, solutionOptions:solution_options(id, correct, text), geocaching:geocaching_questions(target_latitude, target_longitude, proximity_radius, input_type)';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isQuestionTypeId = (value: unknown): value is QuestionTypeId =>
  typeof value === 'string' &&
  QUESTION_TYPE_IDS.some((questionType) => questionType === value);

const normalizeGeocachingConfig = (value: unknown): GeocachingConfig | null => {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!isRecord(candidate)) {
    return null;
  }

  const { target_latitude, target_longitude, proximity_radius, input_type } =
    candidate;
  if (
    typeof target_latitude !== 'number' ||
    !Number.isFinite(target_latitude) ||
    typeof target_longitude !== 'number' ||
    !Number.isFinite(target_longitude) ||
    typeof proximity_radius !== 'number' ||
    !Number.isInteger(proximity_radius) ||
    proximity_radius <= 0 ||
    (input_type !== 'text' && input_type !== 'qr')
  ) {
    return null;
  }

  return {
    target_latitude,
    target_longitude,
    proximity_radius,
    input_type,
  };
};

const normalizeSolutionOptions = (value: unknown): SolutionOption[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.correct !== 'boolean') {
      return [];
    }

    const solution: SolutionOption = { correct: candidate.correct };
    if (typeof candidate.id === 'number') {
      solution.id = candidate.id;
    }
    if (typeof candidate.text === 'string') {
      solution.text = candidate.text;
    }
    return [solution];
  });
};

const normalizeQuestion = (value: unknown): Question | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    typeof value.content !== 'string' ||
    !isQuestionTypeId(value.type)
  ) {
    return null;
  }

  const question: Question = {
    id: value.id,
    content: value.content,
    type: value.type,
    solutionOptions: normalizeSolutionOptions(value.solutionOptions),
    geocaching: normalizeGeocachingConfig(value.geocaching),
  };

  if (typeof value.point_value === 'number') {
    question.point_value = value.point_value;
  }
  if (typeof value.hint === 'string') {
    question.hint = value.hint;
  }
  if (typeof value.category === 'string') {
    question.category = value.category;
  }
  if (typeof value.bucket_path === 'string') {
    question.bucket_path = value.bucket_path;
  }

  return question;
};

interface QuestionActionInput {
  content: string;
  type: QuestionTypeId | '';
  point_value?: number;
  hint?: string;
  category?: string;
  bucket_path?: string;
  solutionOptions: { id?: number; correct: boolean; text?: string }[];
  geocaching?: GeocachingFormConfig;
  rallyeIds?: number[];
}

export async function getCategories(): Promise<ActionResult<string[]>> {
  await requireProfile();
  const supabase = await createClient();

  const { data: categories, error: categoriesError } = await supabase
    .from('questions')
    .select('category');

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
    return fail('Kategorien konnten nicht geladen werden');
  }

  if (!categories || categories.length === 0) {
    return ok([]);
  }

  const normalizedCategories = categories
    .map((item) =>
      typeof item.category === 'string' ? item.category.trim() : ''
    )
    .filter((category) => category.length > 0);

  return ok([...new Set(normalizedCategories)]);
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
    .select(QUESTION_SELECT)
    .eq('id', idResult.data)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching question by id:', error);
    return fail('Frage konnte nicht geladen werden');
  }

  const question = normalizeQuestion(data);
  if (!question) {
    console.error('Invalid question returned by database:', data);
    return fail('Frage konnte nicht geladen werden');
  }

  return ok(question);
}

export async function getQuestions(
  filters: QuestionCatalogFilters
): Promise<ActionResult<Question[]>> {
  await requireProfile();
  const supabase = await createClient();

  const searchTerm = filters.search?.trim();
  let searchQuestionIds: number[] | undefined;
  if (searchTerm) {
    const [questionMatches, answerMatches] = await Promise.all([
      supabase
        .from('questions')
        .select('id')
        .ilike('content', `%${searchTerm}%`),
      supabase
        .from('solution_options')
        .select('question_id')
        .ilike('text', `%${searchTerm}%`),
    ]);

    if (questionMatches.error || answerMatches.error) {
      console.error(
        'Error searching questions:',
        questionMatches.error ?? answerMatches.error
      );
      return fail('Fragen konnten nicht durchsucht werden');
    }

    searchQuestionIds = Array.from(
      new Set([
        ...(questionMatches.data ?? []).map((row) => row.id),
        ...(answerMatches.data ?? []).map((row) => row.question_id),
      ])
    ).filter((id): id is number => typeof id === 'number');

    if (searchQuestionIds.length === 0) {
      return ok([]);
    }
  }

  // Build base query with nested solution options to avoid N+1
  let query = supabase.from('questions').select(QUESTION_SELECT);

  if (searchQuestionIds) {
    query = query.in('id', searchQuestionIds);
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
        .from('rallye_questions')
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

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching questions:', error);
    return fail('Fragen konnten nicht geladen werden');
  }

  const questions = (data || []).flatMap((row): Question[] => {
    const question = normalizeQuestion(row);
    if (!question) {
      console.error('Invalid question returned by database:', row);
      return [];
    }
    return [question];
  });

  return ok(questions);
}

export async function createQuestion(
  data: QuestionActionInput
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const parsed = questionCreateSchema.safeParse(data);
  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }
  let rollbackCreatedQuestion: (() => Promise<void>) | undefined;
  try {
    const supabase = await createClient();
    const answers = parsed.data.solutionOptions.filter(
      (answer) => (answer.text ?? '').trim().length > 0
    );

    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .insert([
        {
          content: parsed.data.content,
          type: parsed.data.type,
          point_value: parsed.data.point_value,
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
    rollbackCreatedQuestion = async () => {
      try {
        const { error: rollbackError } = await supabase
          .from('questions')
          .delete()
          .eq('id', questionId);
        if (rollbackError) {
          console.error('Error rolling back question:', rollbackError);
        }
      } catch (rollbackError) {
        console.error('Error rolling back question:', rollbackError);
      }
    };

    type SolutionOptionInsert = {
      correct: boolean;
      text?: string;
      question_id: number;
      id?: number;
    };
    const answersData: SolutionOptionInsert[] = answers.map((answer) => ({
      ...answer,
      question_id: questionId,
    }));

    // Remove the id attribute from solution options (auto-incremented in Supabase).
    answersData.forEach((answer) => {
      if ('id' in answer) {
        delete answer.id;
      }
    });

    if (answersData.length > 0) {
      const { error: answersError } = await supabase
        .from('solution_options')
        .insert(answersData);

      if (answersError) {
        console.error('Error adding solution options:', answersError);
        await rollbackCreatedQuestion();
        return fail('Antworten konnten nicht gespeichert werden');
      }
    }

    if (parsed.data.type === 'geocaching') {
      const { error: geocachingError } = await supabase
        .from('geocaching_questions')
        .insert({
          question_id: questionId,
          ...parsed.data.geocaching,
        });

      if (geocachingError) {
        console.error('Error adding geocaching data:', geocachingError);
        await rollbackCreatedQuestion();
        return fail('Geocaching-Daten konnten nicht gespeichert werden');
      }
    }

    if (parsed.data.rallyeIds && parsed.data.rallyeIds.length > 0) {
      const assignResult = await assignRallyesToQuestion(
        questionId,
        parsed.data.rallyeIds
      );
      if (!assignResult.success) {
        await rollbackCreatedQuestion();
        return fail(assignResult.error, assignResult.issues);
      }
    }

    console.log('Question and solution options added successfully');
    return ok({ message: 'Frage erfolgreich gespeichert' });
  } catch (err) {
    await rollbackCreatedQuestion?.();
    console.error('Error processing request:', err);
    return fail('Frage konnte nicht gespeichert werden');
  }
}

export async function updateQuestion(
  id: number,
  data: QuestionActionInput
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
    const answers = parsed.data.solutionOptions.filter(
      (answer) => (answer.text ?? '').trim().length > 0
    );

    const { data: existingQuestion, error: existingError } = await supabase
      .from('questions')
      .select('id, type, bucket_path')
      .eq('id', idResult.data)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking question:', existingError);
      return fail('Frage konnte nicht gespeichert werden');
    }

    if (!existingQuestion) {
      return fail('Frage nicht gefunden');
    }

    if (
      !isQuestionTypeId(existingQuestion.type) ||
      existingQuestion.type !== parsed.data.type
    ) {
      return fail('Die Aufgabenart kann nicht geändert werden');
    }

    const { error: questionError } = await supabase
      .from('questions')
      // category muss mit null gespeichert werden, um sicherzustellen,
      // dass die Kategorie gelöscht wird, wenn sie leer ist
      .update({
        content: parsed.data.content,
        type: parsed.data.type,
        point_value: parsed.data.point_value ?? null,
        hint: parsed.data.hint,
        category: parsed.data.category || null,
        bucket_path: parsed.data.bucket_path || null,
      })
      .eq('id', idResult.data);

    if (questionError) {
      console.error('Error updating question:', questionError);
      return fail('Frage konnte nicht gespeichert werden');
    }

    // Fetch existing solution options
    const { data: existingAnswers, error: fetchError } = await supabase
      .from('solution_options')
      .select('id')
      .eq('question_id', idResult.data);

    if (fetchError) {
      console.error('Error fetching existing solution options:', fetchError);
      return fail('Antworten konnten nicht geladen werden');
    }

    const existingAnswerIds = existingAnswers.map((answer) => answer.id);
    const newAnswerIds = answers
      .map((answer) => answer.id)
      .filter((id) => id !== undefined);

    // Delete solution options that are not in the new list
    const answersToDelete = existingAnswerIds.filter(
      (id) => !newAnswerIds.includes(id)
    );
    if (answersToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('solution_options')
        .delete()
        .in('id', answersToDelete);

      if (deleteError) {
        console.error('Error deleting solution options:', deleteError);
        return fail('Antworten konnten nicht aktualisiert werden');
      }
    }

    // Update or insert solution options
    for (const answer of answers) {
      if (answer.id) {
        // Update existing answer
        const { error: answerError } = await supabase
          .from('solution_options')
          .update({ correct: answer.correct, text: answer.text })
          .eq('id', answer.id)
          .eq('question_id', idResult.data);

        if (answerError) {
          console.error(
            `Error updating solution option ${answer.id}:`,
            answerError
          );
          return fail('Antworten konnten nicht aktualisiert werden');
        }
      } else {
        // Insert new answer
        const { error: answerError } = await supabase
          .from('solution_options')
          .insert({
            correct: answer.correct,
            text: answer.text,
            question_id: idResult.data,
          });

        if (answerError) {
          console.error('Error adding new solution option:', answerError);
          return fail('Antworten konnten nicht aktualisiert werden');
        }
      }
    }

    if (parsed.data.type === 'geocaching') {
      const { error: geocachingError } = await supabase
        .from('geocaching_questions')
        .upsert(
          {
            question_id: idResult.data,
            ...parsed.data.geocaching,
          },
          { onConflict: 'question_id' }
        );

      if (geocachingError) {
        console.error('Error updating geocaching data:', geocachingError);
        return fail('Geocaching-Daten konnten nicht gespeichert werden');
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

    const previousBucketPath =
      typeof existingQuestion.bucket_path === 'string'
        ? existingQuestion.bucket_path.trim()
        : '';
    const updatedBucketPath = parsed.data.bucket_path?.trim() ?? '';
    if (
      previousBucketPath &&
      updatedBucketPath &&
      previousBucketPath !== updatedBucketPath
    ) {
      try {
        const deleteResult = await deleteImage(previousBucketPath);
        if (!deleteResult.success) {
          console.error(
            'Error deleting previous question image:',
            deleteResult.error
          );
        }
      } catch (error) {
        console.error('Error deleting previous question image:', error);
      }
    }

    console.log('Question and solution options updated successfully');
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
      .select('id, bucket_path')
      .eq('id', idResult.data)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking question:', existingError);
      return fail('Frage konnte nicht gelöscht werden');
    }

    if (!existingQuestion) {
      return fail('Frage nicht gefunden');
    }

    const bucketPath =
      typeof existingQuestion.bucket_path === 'string'
        ? existingQuestion.bucket_path.trim()
        : '';

    // Delete solution options first.
    const { error: answersError } = await supabase
      .from('solution_options')
      .delete()
      .eq('question_id', idResult.data);

    if (answersError) {
      console.error('Error deleting solution options:', answersError);
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

    if (bucketPath) {
      try {
        const deleteResult = await deleteImage(bucketPath);
        if (!deleteResult.success) {
          console.error('Error deleting question image:', deleteResult.error);
        }
      } catch (error) {
        console.error('Error deleting question image:', error);
      }
    }

    console.log('Question and solution options deleted successfully');
    return ok({ message: 'Frage erfolgreich gelöscht' });
  } catch (err) {
    console.error('Error processing request:', err);
    return fail('Frage konnte nicht gelöscht werden');
  }
}
