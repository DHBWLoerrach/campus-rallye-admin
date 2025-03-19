'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type FormState = { errors?: { message?: string } } | undefined;

export async function login(formState: FormState, formData: FormData) {
  const supabase = createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { errors: { message: 'Ungültige Zugangsdaten' } };
  }

  revalidatePath('/', 'layout'); // is this necessary?
  redirect('/'); // TODO: redirect to current page
}

export async function signInWithEmail(state: FormState, formData: FormData) {
  const supabase = createClient();

  const email = formData.get('email') as string;

  const { error } = await supabase.auth.signInWithOtp({
    email: email as string,
    options: { shouldCreateUser: false },
  });

  if (error) {
    return { errors: { message: 'Ungültige E-Mail-Adresse' } };
  }
}
