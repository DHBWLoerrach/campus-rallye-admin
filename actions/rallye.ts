'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import {
  canResetRallye,
  getNextRallyeTransition,
  isRallyeJoinable,
  Rallye,
  RallyeOption,
  RallyeStatus,
} from '@/lib/types';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import {
  formatZodError,
  idArraySchema,
  idSchema,
  rallyeCreateSchema,
  rallyeUpdateSchema,
} from '@/lib/validation';
import { parsePlannedEnd } from '@/lib/planned-end';
import {
  defaultIsVoting,
  MULTIPLE_UPLOAD_QUESTIONS_ERROR,
} from '@/helpers/questionTypes';
import { isCampusTourRallye } from '@/lib/campus-tour';

type FormState = ActionResult<{ message: string; rallyeId?: number }> | null;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const UPLOAD_PHOTOS_BUCKET = 'upload-photos';

// Returns the storage paths of all upload photos submitted by teams of the
// rallye, or null if they could not be loaded.
async function getUploadPhotoPaths(
  supabase: SupabaseClient,
  rallyeId: number
): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('team_answers')
    .select('answer, teams!inner(rallye_id), questions!inner(type)')
    .eq('teams.rallye_id', rallyeId)
    .eq('questions.type', 'upload');

  if (error) {
    console.error('Error fetching upload photos:', error);
    return null;
  }

  return (data ?? [])
    .map((row) => (row.answer ?? '').trim())
    .filter((path) => path.length > 0);
}

// Best effort: the database rows are already gone, so a storage failure only
// leaves orphaned files behind and is logged instead of failing the action.
async function removeUploadPhotos(
  supabase: SupabaseClient,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage
    .from(UPLOAD_PHOTOS_BUCKET)
    .remove(paths);
  if (error) {
    console.error('Error removing upload photos:', { paths, error });
  }
}

export async function updateRallye(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const parsed = rallyeUpdateSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    status: formData.get('status'),
    rallye_code: formData.get('rallye_code') ?? '',
    rallye_end: formData.get('rallye_end'),
  });

  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }

  // An empty time field clears the planned end (sets it to null) rather than
  // leaving the stored value untouched.
  const endTimeRaw = parsed.data.rallye_end?.trim() ?? '';
  const plannedEnd = parsePlannedEnd(endTimeRaw);
  if (plannedEnd.kind === 'invalid') return fail('Ungültige Uhrzeit');
  const endTime = plannedEnd.kind === 'time' ? plannedEnd.value : null;

  const data = parsed.data;

  const { data: existingRallye, error: existingError } = await supabase
    .from('rallyes')
    .select('id')
    .eq('id', data.id)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking rallye:', existingError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingRallye) {
    return fail('Rallye nicht gefunden');
  }

  // Teams can join a ready or running team rallye, so it must not be saved in
  // such a status without a code. Campus tours never have a code (ADR-0003).
  if (isRallyeJoinable(data.status) && data.rallye_code.trim() === '') {
    const { data: campusTourLocations, error: campusTourError } = await supabase
      .from('locations')
      .select('default_rallye_id')
      .eq('default_rallye_id', data.id)
      .limit(1);

    if (campusTourError) {
      console.error('Error checking campus tour:', campusTourError);
      return fail('Es ist ein Fehler aufgetreten');
    }

    if (!isCampusTourRallye(data.id, campusTourLocations ?? [])) {
      return fail('Teams brauchen einen Rallye-Code, um beizutreten');
    }
  }

  const updatePayload: {
    name: string;
    status: RallyeStatus;
    rallye_code: string;
    rallye_end: string | null;
    department_id?: number;
  } = {
    name: data.name,
    status: data.status,
    rallye_code: data.rallye_code,
    rallye_end: endTime,
  };

  // Only sync department assignment when the form explicitly opts in.
  // This prevents accidental assignment changes when options were not loaded client-side.
  const shouldSyncDepartments = formData.get('department_sync') === '1';
  if (shouldSyncDepartments) {
    const selectedDepartmentIds = Array.from(
      new Set(
        formData
          .getAll('department_ids')
          .map(Number)
          .filter((id) => !isNaN(id) && id > 0)
      )
    );

    if (selectedDepartmentIds.length !== 1) {
      return fail('Genau ein Bereich muss zugeordnet werden');
    }

    updatePayload.department_id = selectedDepartmentIds[0];
  }

  const { error } = await supabase
    .from('rallyes')
    .update({
      ...updatePayload,
    })
    .eq('id', data.id);

  if (error) {
    console.error('Error updating rallye:', error);
    return fail('Es ist ein Fehler aufgetreten');
  }

  revalidatePath('/');
  return ok({ message: 'Rallye erfolgreich gespeichert' });
}

export async function getRallyes(): Promise<ActionResult<Rallye[]>> {
  await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('rallyes')
    .select('id, name, status, rallye_end, rallye_code, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching rallyes:', error);
    return fail('Fehler beim Laden der Rallyes');
  }

  return ok(data || []);
}

export async function getRallyeOptions(): Promise<
  ActionResult<RallyeOption[]>
> {
  await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase.from('rallyes').select('id, name');

  if (error) {
    console.error('Error fetching rallye options:', error);
    return fail('Fehler beim Laden der Rallyes');
  }

  const rallyes = (data || []) as RallyeOption[];
  rallyes.sort((a, b) =>
    a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
  );
  return ok(rallyes);
}

export async function getRallyeCampusTourStatus(
  rallyeId: number
): Promise<ActionResult<boolean>> {
  await requireProfile();

  const idResult = idSchema.safeParse(rallyeId);
  if (!idResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(idResult.error));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('locations')
    .select('default_rallye_id')
    .eq('default_rallye_id', idResult.data)
    .limit(1);

  if (error) {
    console.error('Error checking campus tour:', error);
    return fail('Rallye konnte nicht geladen werden');
  }

  return ok(isCampusTourRallye(idResult.data, data ?? []));
}

// Whether the rallye already contains its one allowed upload question
// (ADR-0006).
export async function getRallyeHasUploadQuestion(
  rallyeId: number
): Promise<ActionResult<boolean>> {
  await requireProfile();

  const idResult = idSchema.safeParse(rallyeId);
  if (!idResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(idResult.error));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rallye_questions')
    .select('question_id, questions!inner(type)')
    .eq('rallye_id', idResult.data)
    .eq('questions.type', 'upload')
    .limit(1);

  if (error) {
    console.error('Error checking upload questions:', error);
    return fail('Rallye konnte nicht geladen werden');
  }

  return ok((data ?? []).length > 0);
}

export async function deleteRallye(
  rallyeId: string
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const supabase = await createClient();

  const idResult = rallyeUpdateSchema.shape.id.safeParse(rallyeId);
  if (!idResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(idResult.error));
  }

  const { data: existingRallye, error: existingError } = await supabase
    .from('rallyes')
    .select('id')
    .eq('id', idResult.data)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking rallye:', existingError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingRallye) {
    return fail('Rallye nicht gefunden');
  }

  // Collect photo paths before the cascade removes the team answers that
  // reference them; afterwards they could no longer be found.
  const photoPaths = await getUploadPhotoPaths(supabase, idResult.data);
  if (photoPaths === null) {
    return fail('Fehler beim Löschen der Rallye');
  }

  const { error } = await supabase
    .from('rallyes')
    .delete()
    .eq('id', idResult.data);

  if (error) {
    console.error('Error deleting rallye:', error);
    return fail('Fehler beim Löschen der Rallye');
  }

  await removeUploadPhotos(supabase, photoPaths);

  revalidatePath('/');
  return ok({ message: 'Rallye erfolgreich gelöscht' });
}

export async function advanceRallyeStatus(
  rallyeId: number,
  target: RallyeStatus,
  endTime?: string,
  rallyeCode?: string
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();

  const idResult = idSchema.safeParse(rallyeId);
  if (!idResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(idResult.error));
  }

  // An optional planned end can be set alongside the transition, typically the
  // "geplant bis" time chosen when the rallye is started.
  let parsedEndTime: string | undefined;
  if (endTime !== undefined && endTime !== '') {
    const plannedEnd = parsePlannedEnd(endTime);
    if (plannedEnd.kind !== 'time') return fail('Ungültige Uhrzeit');
    parsedEndTime = plannedEnd.value;
  }

  // A code may be supplied alongside a transition into a joinable status (see
  // below); only a non-empty value overrides the stored code.
  const providedCode = rallyeCode?.trim() ?? '';

  const supabase = await createClient();

  const { data: rallye, error: rallyeError } = await supabase
    .from('rallyes')
    .select('id, status, rallye_code')
    .eq('id', idResult.data)
    .maybeSingle();

  if (rallyeError) {
    console.error('Error loading rallye:', rallyeError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!rallye) {
    return fail('Rallye nicht gefunden');
  }

  const { count: votingCount, error: votingError } = await supabase
    .from('rallye_questions')
    .select('question_id', { count: 'exact', head: true })
    .eq('rallye_id', idResult.data)
    .eq('is_voting', true);

  if (votingError) {
    console.error('Error counting voting questions:', votingError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  // Server-side guard: only the transition derived from the current status
  // is allowed here; free status changes remain in updateRallye (expert mode).
  const expected = getNextRallyeTransition(
    rallye.status as RallyeStatus,
    (votingCount ?? 0) > 0
  );

  if (!expected || expected.target !== target) {
    return fail('Ungültiger Statuswechsel');
  }

  const updatePayload: {
    status: RallyeStatus;
    rallye_end?: string;
    rallye_code?: string;
  } = {
    status: target,
  };
  if (parsedEndTime !== undefined) {
    updatePayload.rallye_end = parsedEndTime;
  }

  // Teams can join a ready or running team rallye, so it needs a code. Use a
  // freshly provided code, otherwise the stored one; refuse the transition if
  // neither exists. Later transitions leave the code untouched.
  if (isRallyeJoinable(target)) {
    const effectiveCode =
      providedCode.length > 0
        ? providedCode
        : (rallye.rallye_code ?? '').trim();
    if (effectiveCode.length === 0) {
      return fail('Teams brauchen einen Rallye-Code, um beizutreten');
    }
    if (providedCode.length > 0) {
      updatePayload.rallye_code = providedCode;
    }
  }

  const { error } = await supabase
    .from('rallyes')
    .update(updatePayload)
    .eq('id', idResult.data);

  if (error) {
    console.error('Error advancing rallye status:', error);
    return fail('Es ist ein Fehler aufgetreten');
  }

  revalidatePath('/rallyes');
  revalidatePath(`/rallyes/${idResult.data}`, 'layout');
  return ok({ message: 'Status erfolgreich geändert' });
}

export type RallyeRunDataSummary = {
  teamCount: number;
  teamAnswerCount: number;
  uploadPhotoCount: number;
};

// Counts the run data a reset would delete, so editors can see what is lost.
export async function getRallyeRunDataSummary(
  rallyeId: number
): Promise<ActionResult<RallyeRunDataSummary>> {
  await requireProfile();

  const idResult = idSchema.safeParse(rallyeId);
  if (!idResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(idResult.error));
  }

  const supabase = await createClient();

  const [teams, teamAnswers, photoPaths] = await Promise.all([
    supabase
      .from('teams')
      .select('id', { count: 'exact', head: true })
      .eq('rallye_id', idResult.data),
    supabase
      .from('team_answers')
      .select('id, teams!inner(rallye_id)', { count: 'exact', head: true })
      .eq('teams.rallye_id', idResult.data),
    getUploadPhotoPaths(supabase, idResult.data),
  ]);

  if (teams.error || teamAnswers.error || photoPaths === null) {
    console.error('Error counting run data:', {
      teamsError: teams.error,
      teamAnswersError: teamAnswers.error,
    });
    return fail('Durchlaufdaten konnten nicht geladen werden');
  }

  return ok({
    teamCount: teams.count ?? 0,
    teamAnswerCount: teamAnswers.count ?? 0,
    uploadPhotoCount: photoPaths.length,
  });
}

export async function resetRallye(
  rallyeId: number
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();

  const idResult = idSchema.safeParse(rallyeId);
  if (!idResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(idResult.error));
  }

  const supabase = await createClient();

  const { data: rallye, error: rallyeError } = await supabase
    .from('rallyes')
    .select('id, status')
    .eq('id', idResult.data)
    .maybeSingle();

  if (rallyeError) {
    console.error('Error loading rallye:', rallyeError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!rallye) {
    return fail('Rallye nicht gefunden');
  }

  if (!canResetRallye(rallye.status as RallyeStatus)) {
    return fail('Eine Rallye im Entwurf kann nicht zurückgesetzt werden');
  }

  const { data: campusTourLocations, error: campusTourError } = await supabase
    .from('locations')
    .select('default_rallye_id')
    .eq('default_rallye_id', idResult.data)
    .limit(1);

  if (campusTourError) {
    console.error('Error checking campus tour:', campusTourError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (isCampusTourRallye(idResult.data, campusTourLocations ?? [])) {
    return fail('Eine Campus-Tour kann nicht zurückgesetzt werden');
  }

  // Collect photo paths before the reset removes the team answers that
  // reference them.
  const photoPaths = await getUploadPhotoPaths(supabase, idResult.data);
  if (photoPaths === null) {
    return fail('Fehler beim Zurücksetzen der Rallye');
  }

  // The database function deletes the run data in one transaction; the
  // admin app has no direct delete rights on teams or voting data.
  const { error } = await supabase.rpc('reset_rallye', {
    rallye_id_param: idResult.data,
  });

  if (error) {
    console.error('Error resetting rallye:', error);
    return fail('Fehler beim Zurücksetzen der Rallye');
  }

  await removeUploadPhotos(supabase, photoPaths);

  revalidatePath('/rallyes');
  revalidatePath(`/rallyes/${idResult.data}`, 'layout');
  return ok({ message: 'Rallye erfolgreich zurückgesetzt' });
}

export async function duplicateRallye(
  rallyeId: number
): Promise<ActionResult<{ rallyeId: number; message: string }>> {
  await requireProfile();

  const idResult = idSchema.safeParse(rallyeId);
  if (!idResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(idResult.error));
  }

  const supabase = await createClient();

  const { data: source, error: sourceError } = await supabase
    .from('rallyes')
    .select('id, name, department_id')
    .eq('id', idResult.data)
    .maybeSingle();
  if (sourceError) {
    console.error('Error loading rallye:', sourceError);
    return fail('Es ist ein Fehler aufgetreten');
  }
  if (!source) {
    return fail('Rallye nicht gefunden');
  }

  // A copy is always a team rallye draft, so a campus tour cannot be its
  // source.
  const { data: campusTourLocations, error: campusTourError } = await supabase
    .from('locations')
    .select('default_rallye_id')
    .eq('default_rallye_id', idResult.data)
    .limit(1);

  if (campusTourError) {
    console.error('Error checking campus tour:', campusTourError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (isCampusTourRallye(idResult.data, campusTourLocations ?? [])) {
    return fail('Eine Campus-Tour kann nicht dupliziert werden');
  }

  const { data: joins, error: joinsError } = await supabase
    .from('rallye_questions')
    .select('question_id, is_voting')
    .eq('rallye_id', idResult.data);
  if (joinsError) {
    console.error('Error loading question assignments:', joinsError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  // The copy starts as a fresh draft with no planned end or rallye code.
  const { data: created, error: insertError } = await supabase
    .from('rallyes')
    .insert({
      name: `${source.name} (Kopie)`,
      status: 'draft' as RallyeStatus,
      rallye_end: null,
      rallye_code: '',
      department_id: source.department_id,
    })
    .select('id')
    .single();
  if (insertError || !created) {
    console.error('Error duplicating rallye:', insertError);
    return fail('Rallye konnte nicht dupliziert werden');
  }

  if ((joins ?? []).length > 0) {
    const { error: joinInsertError } = await supabase
      .from('rallye_questions')
      .insert(
        (joins ?? []).map((row) => ({
          rallye_id: created.id,
          question_id: row.question_id,
          is_voting: row.is_voting === true,
        }))
      );
    if (joinInsertError) {
      console.error('Error copying question assignments:', joinInsertError);
      return fail('Fragen konnten nicht kopiert werden');
    }
  }

  revalidatePath('/rallyes');
  return ok({ rallyeId: created.id, message: 'Rallye dupliziert' });
}

export async function createRallyeWithQuestions(input: {
  name: string;
  departmentId: number;
  endTime: string | null;
  rallyeCode: string;
  questionIds: number[];
}): Promise<ActionResult<{ rallyeId: number; message: string }>> {
  await requireProfile();

  const nameResult = rallyeCreateSchema.safeParse({ name: input.name });
  if (!nameResult.success) {
    return fail('Ungültige Eingaben', formatZodError(nameResult.error));
  }

  const departmentIdResult = idSchema.safeParse(input.departmentId);
  if (!departmentIdResult.success) {
    return fail('Genau ein Bereich muss zugeordnet werden');
  }

  const questionIdsResult = idArraySchema.safeParse(input.questionIds);
  if (!questionIdsResult.success) {
    return fail('Ungültige Fragen', formatZodError(questionIdsResult.error));
  }

  // A fresh draft has no planned end; the time is set later, ideally at start.
  let endTime: string | null = null;
  if (input.endTime !== null) {
    const plannedEnd = parsePlannedEnd(input.endTime);
    if (plannedEnd.kind !== 'time') return fail('Ungültige Uhrzeit');
    endTime = plannedEnd.value;
  }

  const supabase = await createClient();

  const { data: department, error: departmentError } = await supabase
    .from('departments')
    .select('id')
    .eq('id', departmentIdResult.data)
    .maybeSingle();
  if (departmentError) {
    console.error('Error checking department:', departmentError);
    return fail('Es ist ein Fehler aufgetreten');
  }
  if (!department) {
    return fail('Bereich nicht gefunden');
  }

  // Load the types before creating the rallye: they decide the voting flag
  // per question (see defaultIsVoting) and enforce the upload question limit.
  const uniqueQuestionIds = Array.from(new Set(questionIdsResult.data));
  let questionRows: { id: number; type: string }[] = [];
  if (uniqueQuestionIds.length > 0) {
    const { data, error: questionTypeError } = await supabase
      .from('questions')
      .select('id, type')
      .in('id', uniqueQuestionIds);
    if (questionTypeError) {
      console.error('Error loading question types:', questionTypeError);
      return fail('Fragen konnten nicht zugeordnet werden');
    }
    questionRows = data ?? [];
  }
  if (questionRows.filter((row) => row.type === 'upload').length > 1) {
    return fail(MULTIPLE_UPLOAD_QUESTIONS_ERROR);
  }

  const { data: created, error: insertError } = await supabase
    .from('rallyes')
    .insert({
      name: nameResult.data.name,
      status: 'draft' as RallyeStatus,
      rallye_end: endTime,
      rallye_code: input.rallyeCode,
      department_id: departmentIdResult.data,
    })
    .select('id')
    .single();
  if (insertError || !created) {
    console.error('Error creating rallye:', insertError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (uniqueQuestionIds.length > 0) {
    const votingQuestionIds = new Set(
      questionRows
        .filter((row) => defaultIsVoting(row.type))
        .map((row) => row.id)
    );

    const { error: joinError } = await supabase.from('rallye_questions').insert(
      uniqueQuestionIds.map((questionId) => ({
        rallye_id: created.id,
        question_id: questionId,
        is_voting: votingQuestionIds.has(questionId),
      }))
    );
    if (joinError) {
      console.error('Error assigning questions:', joinError);
      return fail('Fragen konnten nicht zugeordnet werden');
    }
  }

  revalidatePath('/rallyes');
  return ok({ rallyeId: created.id, message: 'Rallye erstellt' });
}
