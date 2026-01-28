'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { Rallye, RallyeOption, RallyeStatus } from '@/lib/types';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { formatZodError, rallyeCreateSchema, rallyeUpdateSchema } from '@/lib/validation';

type FormState = ActionResult<{ message: string; rallyeId?: number }> | null;

export async function createRallye(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const parsed = rallyeCreateSchema.safeParse({
    name: formData.get('name'),
  });

  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }

  const data = { name: parsed.data.name };

  const { data: createdRallye, error } = await supabase
    .from('rallye')
    .insert({
      name: data.name,
      status: 'inactive' as RallyeStatus,
      end_time: new Date(),
      password: '',
    })
    .select('id')
    .single();

  if (error || !createdRallye) {
    console.error('Error creating rallye:', error);
    return fail('Es ist ein Fehler aufgetreten');
  }

  revalidatePath('/');
  return ok({
    message: 'Rallye erfolgreich gespeichert',
    rallyeId: createdRallye.id,
  });
}

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

  const endTimeRaw = parsed.data.end_time?.trim() ?? '';
  let endTime: Date | undefined;
  if (endTimeRaw) {
    const parsed = new Date(endTimeRaw);
    if (Number.isNaN(parsed.getTime())) {
      return fail('Ungültiges Datum');
    }
    endTime = parsed;
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
    end_time?: Date;
  } = {
    name: data.name,
    status: data.status,
    password: data.password,
  };

  if (endTime) {
    updatePayload.end_time = endTime;
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

export async function getRallyeOptions(): Promise<ActionResult<RallyeOption[]>> {
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
