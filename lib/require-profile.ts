import createClient from './supabase';
import { getUserContext } from './user-context';
import { insertLocalUser } from './db/insert-local-user';

type Profile = {
  user_id: string;
  admin?: boolean | null;
  created_at?: string | null;
};

const cachedProfiles = new Map<string, Profile>();

export async function requireProfile(createProfile = false): Promise<Profile> {
  const { uuid, email, roles } = await getUserContext();

  if (!roles.includes('staff')) {
    throw new Error('Zugriff verweigert');
  }

  const cached = cachedProfiles.get(uuid);
  if (cached) return cached;

  const supabase = await createClient();

  const { data: profileData, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', uuid)
    .maybeSingle(); // maybeSingle() returns at most one row and null if none found

  if (error) {
    console.error('Error fetching profile:', error);
    throw new Error('Profil konnte nicht geladen werden');
  }

  const profile = profileData as Profile | null;
  if (profile) {
    cachedProfiles.set(uuid, profile);
    return profile;
  }

  if (!createProfile) {
    throw new Error('Profil nicht vorhanden – Zugriff verweigert');
  }

  // Kein Profil vorhanden – Profil automatisch anlegen
  const { data: newProfileData, error: insertError } = await supabase
    .from('profiles')
    .insert({ user_id: uuid })
    .select()
    .single();

  if (insertError || !newProfileData) {
    console.error('Error creating profile:', insertError);
    throw new Error('Profil konnte nicht automatisch erstellt werden');
  }

  const newProfile = newProfileData as Profile;
  insertLocalUser(uuid, email);
  cachedProfiles.set(uuid, newProfile);
  return newProfile;
}
