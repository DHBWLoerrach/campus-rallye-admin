'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { Rallye, RallyeOption, RallyeStatus } from '@/lib/types';

type FormState =
  | {
      errors?: { message?: string };
      success?: { message?: string; rallyeId?: number };
    }
  | undefined;

export async function createRallye(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const data = { name: formData.get('name') as string };

  const { data: createdRallye, error } = await supabase
    .from('rallye')
    .insert({
      name: data.name,
      status: 'inactive' as RallyeStatus,
      end_time: new Date(),
      studiengang: 'Kein Studiengang',
      password: '',
    })
    .select('id')
    .single();

  if (error || !createdRallye) {
    console.log(error);
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/');
  return {
    success: {
      message: 'Rallye erfolgreich gespeichert',
      rallyeId: createdRallye.id,
    },
  };
}

export async function updateRallye(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const endTimeInput = formData.get('end_time');
  const endTimeRaw =
    typeof endTimeInput === 'string' ? endTimeInput.trim() : '';
  let endTime: Date | undefined;
  if (endTimeRaw) {
    const parsed = new Date(endTimeRaw);
    if (Number.isNaN(parsed.getTime())) {
      return { errors: { message: 'Ungültiges Datum' } };
    }
    endTime = parsed;
  }

  const data = {
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    status: formData.get('status') as RallyeStatus,
    studiengang: formData.get('studiengang') as string,
    password: formData.get('password') as string,
  };

  const updatePayload: {
    name: string;
    status: RallyeStatus;
    studiengang: string;
    password: string;
    end_time?: Date;
  } = {
    name: data.name,
    status: data.status,
    studiengang: data.studiengang,
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
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gespeichert' } };
}

export async function getRallyes(): Promise<Rallye[]> {
  await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('rallye')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching rallyes:', error);
    return [];
  }

  return data || [];
}

export async function getRallyeOptions(): Promise<RallyeOption[]> {
  await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase.from('rallye').select('id, name');

  if (error) {
    console.error('Error fetching rallye options:', error);
    return [];
  }

  const rallyes = (data || []) as RallyeOption[];
  rallyes.sort((a, b) =>
    a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
  );
  return rallyes;
}

export async function deleteRallye(rallyeId: string) {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from('rallye').delete().eq('id', rallyeId);

  if (error) {
    console.error('Error deleting rallye:', error);
    return { errors: { message: 'Fehler beim Löschen der Rallye' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gelöscht' } };
}
