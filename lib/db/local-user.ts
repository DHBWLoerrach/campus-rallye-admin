import { getDb } from './sqlite';
import { getUserRef } from '../user-ref';

export type LocalUser = {
  user_id: string;
  email: string | null;
  registered_at: string;
  admin: boolean;
  approved: boolean;
  department_id: number | null;
};

type Row = {
  user_id: string;
  email: string | null;
  registered_at: string;
  admin: number;
  approved: number;
  department_id: number | null;
};

function rowToUser(row: Row): LocalUser {
  return {
    user_id: row.user_id,
    email: row.email,
    registered_at: row.registered_at,
    admin: row.admin === 1,
    approved: row.approved === 1,
    department_id: row.department_id,
  };
}

export function getLocalUser(uuid: string): LocalUser | null {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT user_id, email, registered_at, admin, approved, department_id FROM local_users WHERE user_id = ?'
    )
    .get(uuid) as Row | undefined;
  return row ? rowToUser(row) : null;
}

export function upsertLocalUser(uuid: string, email: string | null): LocalUser {
  const db = getDb();
  const registeredAt = new Date().toISOString();
  // New users stay pending until an admin approves them; set explicitly so
  // this does not depend on the column default of an existing database.
  const result = db
    .prepare(
      'INSERT OR IGNORE INTO local_users (user_id, email, registered_at, approved) VALUES (?, ?, ?, 0)'
    )
    .run(uuid, email, registeredAt);

  if (result.changes > 0) {
    const userRef = getUserRef(uuid);
    console.log('New local user registered', {
      ...(userRef ? { userRef } : {}),
    });

    return {
      user_id: uuid,
      email,
      registered_at: registeredAt,
      admin: false,
      approved: false,
      department_id: null,
    };
  }

  const existing = getLocalUser(uuid);
  if (!existing) {
    throw new Error(
      'Lokaler Benutzer konnte nicht geladen oder erstellt werden'
    );
  }
  return existing;
}

export function listLocalUsers(): LocalUser[] {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT user_id, email, registered_at, admin, approved, department_id FROM local_users ORDER BY email'
    )
    .all() as Row[];
  return rows.map(rowToUser);
}

export function setLocalUserDepartment(
  uuid: string,
  departmentId: number | null
): boolean {
  const db = getDb();
  const result = db
    .prepare('UPDATE local_users SET department_id = ? WHERE user_id = ?')
    .run(departmentId, uuid);
  return result.changes > 0;
}

export function clearDepartmentAssignments(departmentId: number): number {
  const db = getDb();
  const result = db
    .prepare(
      'UPDATE local_users SET department_id = NULL WHERE department_id = ?'
    )
    .run(departmentId);
  return result.changes;
}
