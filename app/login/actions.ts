'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    // TODO: show error in form (e.g. wrong auth details)
  }

  revalidatePath('/', 'layout'); // is this necessary?
  redirect('/'); // TODO: redirect to current page
}

export async function signInWithEmail(formData: FormData) {
  const supabase = createClient();

  const email = formData.get('email') as string;

  const { error } = await supabase.auth.signInWithOtp({
    email: email as string,
    options: { shouldCreateUser: false },
  });

  if (error) {
    console.error(error);
  }
}
