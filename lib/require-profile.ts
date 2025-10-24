import createClient from './supabase';
import { getUserContext } from './user-context';
import { insertLocalUser } from './db/insert-local-user';

const cachedProfiles = new Map<string, any>();

export async function requireProfile(createProfile = false) {
  const { uuid, email } = await getUserContext();

  if (cachedProfiles.has(uuid)) return cachedProfiles.get(uuid);

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', uuid)
    .maybeSingle(); // maybeSingle() returns at most one row and null if none found

  if (profile) {
    cachedProfiles.set(uuid, profile);
    return profile;
  }

  if (error) {
    throw new Error('Profil nicht vorhanden – Zugriff verweigert');
  }

  if (!profile && createProfile) {
    // Kein Profil vorhanden – Profil automatisch anlegen
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({ user_id: uuid })
      .select()
      .single();

    if (insertError || !newProfile) {
      throw new Error('Profil konnte nicht automatisch erstellt werden');
    }

    await insertLocalUser(uuid, email);
    cachedProfiles.set(uuid, newProfile);
    return newProfile;
  }
}
