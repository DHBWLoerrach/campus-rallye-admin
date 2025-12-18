import { createClient as supabaseClient } from '@supabase/supabase-js';
import { getSupabaseJwt } from './user-context';

function getSupabaseUrl(): string {
  return (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    (() => {
      throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
    })()
  );
}

export default async function createClient() {
  const jwt = await getSupabaseJwt();

  const supabaseUrl = getSupabaseUrl();
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error('Missing SUPABASE_ANON_KEY');

  return supabaseClient(
    supabaseUrl,
    anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    }
  );
}
