import createClient from './supabase';
import { getUserContext } from './user-context';

let cachedProfile: any = null;

export async function requireProfile(createProfile = false) {
  if (cachedProfile) return cachedProfile;

  const { sub } = getUserContext();
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', sub)
    .maybeSingle(); // maybeSingle() returns at most one row and null if none found

  if (profile) {
    cachedProfile = profile;
    return profile;
  }

  if (error) {
    throw new Error('Profil nicht vorhanden – Zugriff verweigert');
  }

  if (!profile && createProfile) {
    // Kein Profil vorhanden – Profil automatisch anlegen
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({ user_id: sub })
      .select()
      .single();

    if (insertError || !newProfile) {
      throw new Error('Profil konnte nicht automatisch erstellt werden');
    }

    cachedProfile = newProfile;
    return newProfile;
  }
}
