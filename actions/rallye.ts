'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { Rallye, RallyeStatus } from '@/lib/types';

type FormState = { errors?: { message?: string } } | undefined;

export async function createRallye(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const data = { name: formData.get('name') as string };

  const { error } = await supabase.from('rallye').insert({
    name: data.name,
    status: 'inactive' as RallyeStatus,
    end_time: new Date(),
    studiengang: 'Kein Studiengang',
    password: '',
  });

  if (error) {
    console.log(error);
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gespeichert' } };
}

export async function updateRallye(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const data = {
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    status: formData.get('status') as RallyeStatus,
    end_time: new Date(formData.get('end_time') as string),
    studiengang: formData.get('studiengang') as string,
    password: formData.get('password') as string,
  };
  
  const { error } = await supabase
    .from('rallye')
    .update({
      name: data.name,
      status: data.status,
      end_time: data.end_time,
      studiengang: data.studiengang,
      password: data.password,
    })
    .eq('id', data.id);

  if (error) {
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gespeichert' } };
}

export async function getRallyes(): Promise<Rallye[]> {
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
