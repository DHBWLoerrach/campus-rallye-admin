import createClient from './supabase';
import { getUserContext } from './user-context';

let cachedProfile: any = null;

export async function requireProfile() {
  if (cachedProfile) return cachedProfile;

  const { sub } = getUserContext();
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', sub)
    .single();

  if (error || !profile) {
    throw new Error('Profil nicht vorhanden – Zugriff verweigert');
  }

  cachedProfile = profile;
  return profile;
}
