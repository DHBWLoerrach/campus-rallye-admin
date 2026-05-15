import { getDb } from './sqlite';

export type LocalUser = {
  user_id: string;
  email: string | null;
  registered_at: string;
  admin: boolean;
};

type Row = {
  user_id: string;
  email: string | null;
  registered_at: string;
  admin: number;
};

function rowToUser(row: Row): LocalUser {
  return {
    user_id: row.user_id,
    email: row.email,
    registered_at: row.registered_at,
    admin: row.admin === 1,
  };
}

export function getLocalUser(uuid: string): LocalUser | null {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT user_id, email, registered_at, admin FROM local_users WHERE user_id = ?'
    )
    .get(uuid) as Row | undefined;
  return row ? rowToUser(row) : null;
}

export function upsertLocalUser(uuid: string, email: string | null): LocalUser {
  const existing = getLocalUser(uuid);
  if (existing) return existing;

  const db = getDb();
  const registeredAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO local_users (user_id, email, registered_at) VALUES (?, ?, ?)'
  ).run(uuid, email, registeredAt);

  console.log('✔️ Neuer lokaler Benutzer registriert:', uuid, email);

  return {
    user_id: uuid,
    email,
    registered_at: registeredAt,
    admin: false,
  };
}
