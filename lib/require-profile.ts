import { isAuthorizedUser } from './auth';
import { getUserContext } from './user-context';
import { getLocalUser, upsertLocalUser, type LocalUser } from './db/local-user';

type Profile = {
  user_id: string;
  admin?: boolean | null;
  created_at?: string | null;
};

function toProfile(user: LocalUser): Profile {
  return {
    user_id: user.user_id,
    admin: user.admin,
    created_at: user.registered_at,
  };
}

export async function requireProfile(createProfile = false): Promise<Profile> {
  const { uuid, email, roles } = await getUserContext();

  if (!isAuthorizedUser(roles, email)) {
    console.warn('Access denied', {
      uuid,
      email,
      roles,
    });
    throw new Error('Zugriff verweigert');
  }

  const existing = getLocalUser(uuid);
  if (existing) {
    return toProfile(existing);
  }

  if (!createProfile) {
    throw new Error('Profil nicht vorhanden – Zugriff verweigert');
  }

  const created = upsertLocalUser(uuid, email);
  return toProfile(created);
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();

  if (profile.admin !== true) {
    throw new Error('Admin-Berechtigung erforderlich');
  }

  return profile;
}
