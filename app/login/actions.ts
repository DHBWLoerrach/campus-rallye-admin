'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { KEYCLOAK_CONFIG } from '@/lib/keycloak-config';
import { FormState } from '@/lib/types';

export async function login(
  formState: FormState,
  formData: FormData
) {
  const supabase = await createClient();

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

export async function signInWithEmail(
  state: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();

  const email = formData.get('email') as string;

  const { error } = await supabase.auth.signInWithOtp({
    email: email as string,
    options: { shouldCreateUser: false },
  });

  if (error) {
    return { errors: { message: 'Ungültige E-Mail-Adresse' } };
  }
  
  return null;
}

// export async function signInWithKeycloak() {
//   const params = new URLSearchParams({
//     client_id: KEYCLOAK_CONFIG.clientId,
//     redirect_uri: KEYCLOAK_CONFIG.redirectUri,
//     response_type: KEYCLOAK_CONFIG.responseType
//   });
//   redirect(`${KEYCLOAK_CONFIG.authUrl}?${params.toString()}`);
// }

export async function signInWithKeycloak() {
  console.log('### new signin Function ###');
  const { data, error } = await handleSupabase();
  console.log('finished signin Function with data: ', data, ' and error: ', error);

  revalidatePath('/', 'layout'); // is this necessary?
  redirect('/'); // TODO error handling
}

async function handleSupabase() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'keycloak',
    options: {
      redirectTo: KEYCLOAK_CONFIG.redirectUri,
      scopes: 'openid',
      queryParams: {
        client_id: KEYCLOAK_CONFIG.clientId,
        redirect_uri: KEYCLOAK_CONFIG.redirectUri,
        response_type: KEYCLOAK_CONFIG.responseType,
      },
    }
  });

  return { data, error };
}

export async function exchangeCodeForToken(code: string) {
  if (!code) {
    throw new Error('No code provided');
  }
  if (KEYCLOAK_CONFIG.clientSecret === '') {
    throw new Error('No client secret provided');
  }
  console.log('Code in actions as: ', code);
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CONFIG.clientId,
    client_secret: KEYCLOAK_CONFIG.clientSecret,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: KEYCLOAK_CONFIG.redirectUri,
  });

  console.log('Exchanging code for token:', params.toString());

  const response = await fetch(KEYCLOAK_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token with response: ' + response.statusText + ' ' + response.status);
  }

  return response.json();
}
