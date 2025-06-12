import { getDb } from './sqlite';

export function insertLocalUser(uuid: string, email: string | null) {
  const db = getDb();
  const exists = db
    .prepare('SELECT 1 FROM local_users WHERE user_id = ?')
    .get(uuid);

  if (exists) return;

  const registeredAt = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO local_users (user_id, email, registered_at)
    VALUES (?, ?, ?)
  `
  ).run(uuid, email, registeredAt);

  console.log('✔️ Neuer lokaler Benutzer registriert:', uuid, email);
}
