'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import {
  getNextRallyeTransition,
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

type FormState = ActionResult<{ message: string; rallyeId?: number }> | null;

export async function updateRallye(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const parsed = rallyeUpdateSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    status: formData.get('status'),
    password: formData.get('password') ?? '',
    end_time: formData.get('end_time'),
  });

  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }

  // An empty time field clears the planned end (sets it to null) rather than
  // leaving the stored value untouched.
  const endTimeRaw = parsed.data.end_time?.trim() ?? '';
  let endTime: Date | null = null;
  if (endTimeRaw) {
    const parsedDate = new Date(endTimeRaw);
    if (Number.isNaN(parsedDate.getTime())) {
      return fail('Ungültiges Datum');
    }
    endTime = parsedDate;
  }

  const data = parsed.data;

  const { data: existingRallye, error: existingError } = await supabase
    .from('rallye')
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

  const updatePayload: {
    name: string;
    status: RallyeStatus;
    password: string;
    end_time: Date | null;
    department_id?: number;
  } = {
    name: data.name,
    status: data.status,
    password: data.password,
    end_time: endTime,
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
    .from('rallye')
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
    .from('rallye')
    .select('id, name, status, end_time, password, created_at')
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

  const { data, error } = await supabase.from('rallye').select('id, name');

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
    .from('rallye')
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

  const { error } = await supabase
    .from('rallye')
    .delete()
    .eq('id', idResult.data);

  if (error) {
    console.error('Error deleting rallye:', error);
    return fail('Fehler beim Löschen der Rallye');
  }

  revalidatePath('/');
  return ok({ message: 'Rallye erfolgreich gelöscht' });
}

export async function advanceRallyeStatus(
  rallyeId: number,
  target: RallyeStatus,
  endTime?: string
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();

  const idResult = idSchema.safeParse(rallyeId);
  if (!idResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(idResult.error));
  }

  // An optional planned end can be set alongside the transition, typically the
  // "geplant bis" time chosen when the rallye is started.
  let parsedEndTime: Date | undefined;
  if (endTime !== undefined && endTime !== '') {
    const parsed = new Date(endTime);
    if (Number.isNaN(parsed.getTime())) {
      return fail('Ungültiges Datum');
    }
    parsedEndTime = parsed;
  }

  const supabase = await createClient();

  const { data: rallye, error: rallyeError } = await supabase
    .from('rallye')
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

  const { count: votingCount, error: votingError } = await supabase
    .from('join_rallye_questions')
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

  const updatePayload: { status: RallyeStatus; end_time?: Date } = {
    status: target,
  };
  if (parsedEndTime !== undefined) {
    updatePayload.end_time = parsedEndTime;
  }

  const { error } = await supabase
    .from('rallye')
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
    .from('rallye')
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

  const { data: joins, error: joinsError } = await supabase
    .from('join_rallye_questions')
    .select('question_id, is_voting')
    .eq('rallye_id', idResult.data);
  if (joinsError) {
    console.error('Error loading question assignments:', joinsError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  // The copy starts as a fresh draft: preparing, no planned end, no password.
  const { data: created, error: insertError } = await supabase
    .from('rallye')
    .insert({
      name: `${source.name} (Kopie)`,
      status: 'preparing' as RallyeStatus,
      end_time: null,
      password: '',
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
      .from('join_rallye_questions')
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
  password: string;
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
  let endTime: Date | null = null;
  if (input.endTime !== null) {
    const parsed = new Date(input.endTime);
    if (Number.isNaN(parsed.getTime())) {
      return fail('Ungültiges Datum');
    }
    endTime = parsed;
  }

  const supabase = await createClient();

  const { data: department, error: departmentError } = await supabase
    .from('department')
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

  const { data: created, error: insertError } = await supabase
    .from('rallye')
    .insert({
      name: nameResult.data.name,
      status: 'preparing' as RallyeStatus,
      end_time: endTime,
      password: input.password,
      department_id: departmentIdResult.data,
    })
    .select('id')
    .single();
  if (insertError || !created) {
    console.error('Error creating rallye:', insertError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  const uniqueQuestionIds = Array.from(new Set(questionIdsResult.data));
  if (uniqueQuestionIds.length > 0) {
    const { error: joinError } = await supabase
      .from('join_rallye_questions')
      .insert(
        uniqueQuestionIds.map((questionId) => ({
          rallye_id: created.id,
          question_id: questionId,
          is_voting: false,
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
