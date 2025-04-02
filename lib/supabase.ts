import { createClient as supabaseClient } from '@supabase/supabase-js';
import { getSupabaseJwt } from './user-context';

export default async function createClient() {
  const jwt = await getSupabaseJwt();

  return supabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    }
  );
}
