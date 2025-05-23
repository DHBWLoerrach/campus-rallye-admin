'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';

type FormState = { errors?: { message?: string } } | undefined;

export async function createRallye(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const data = { name: formData.get('name') as string };

  const { error } = await supabase.from('rallye').insert({
    name: data.name,
    is_active: false,
    status: 'preparing',
    end_time: new Date(),
    studiengang: 'Kein Studiengang',
  });

  if (error) {
    console.log(error);
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gespeichert' } };
}

export async function updateRallye(state: FormState, formData: FormData) {
  const supabase = await createClient();

  const data = {
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    is_active: formData.get('active') === 'on', // checkbox value needs to be converted to boolean (might be 'on' or null)
    status: formData.get('status') as string,
    end_time: new Date(formData.get('end_time') as string),
    studiengang: formData.get('studiengang') as string,
  };
  const { error } = await supabase
    .from('rallye')
    .update({
      name: data.name,
      is_active: data.is_active,
      status: data.status,
      end_time: data.end_time,
      studiengang: data.studiengang,
    })
    .eq('id', data.id);

  if (error) {
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gespeichert' } };
}

export async function getRallyes() {
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
