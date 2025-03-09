'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type FormState = { errors?: { message?: string } } | undefined;

export async function createRallye(
  state: FormState,
  formData: FormData
) {
  const supabase = await createClient();

  const data = { name: formData.get('name') as string };

  const { error } = await supabase.from('rallye').insert({
    name: data.name,
    is_active_rallye: false,
    status: 'preparation',
  });

  if (error) {
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gespeichert' } };
}

export async function updateRallye(
  state: FormState,
  formData: FormData
) {
  const supabase = await createClient();

  const data = {
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    is_active_rallye: formData.get('active') === 'on', // checkbox value needs to be converted to boolean (might be 'on' or null)
    status: formData.get('status') as string,
    end_time: new Date(formData.get('end_time') as string),
  };

  const { error } = await supabase
    .from('rallye')
    .update({
      name: data.name,
      is_active_rallye: data.is_active_rallye,
      status: data.status,
      end_time: data.end_time,
    })
    .eq('id', data.id);

  if (error) {
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gespeichert' } };
}
