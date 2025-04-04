import createClient from './supabase';
import { getUserContext } from './user-context';
import { insertLocalUser } from './db/insert-local-user';

const cachedProfiles = new Map<string, any>();

export async function requireProfile(createProfile = false) {
  const { sub, email } = getUserContext();

  if (cachedProfiles.has(sub)) return cachedProfiles.get(sub);

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', sub)
    .maybeSingle(); // maybeSingle() returns at most one row and null if none found

  if (profile) {
    cachedProfiles.set(sub, profile);
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

    await insertLocalUser(sub, email);
    cachedProfiles.set(sub, newProfile);
    return newProfile;
  }
}
