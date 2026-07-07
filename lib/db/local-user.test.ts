import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dbHolder: { current: Database.Database | null } = { current: null };

vi.mock('./sqlite', () => ({
  getDb: () => {
    if (!dbHolder.current) throw new Error('DB not initialized');
    return dbHolder.current;
  },
}));

import {
  clearDepartmentAssignments,
  getLocalUser,
  listLocalUsers,
  setLocalUserDepartment,
  upsertLocalUser,
} from './local-user';

describe('local-user', () => {
  beforeEach(() => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE local_users (
        user_id TEXT PRIMARY KEY,
        email TEXT,
        registered_at TEXT,
        admin INTEGER NOT NULL DEFAULT 0,
        department_id INTEGER
      );
    `);
    dbHolder.current = db;
  });

  afterEach(() => {
    dbHolder.current?.close();
    dbHolder.current = null;
  });

  it('returns null for an unknown user', () => {
    expect(getLocalUser('unknown')).toBeNull();
  });

  it('inserts and reads back a user with admin=false by default', () => {
    const user = upsertLocalUser('uuid-1', 'a@b.de');
    expect(user.user_id).toBe('uuid-1');
    expect(user.email).toBe('a@b.de');
    expect(user.admin).toBe(false);
    expect(getLocalUser('uuid-1')).toEqual(user);
  });

  it('returns existing user on second upsert without overwriting', () => {
    const first = upsertLocalUser('uuid-1', 'a@b.de');
    const second = upsertLocalUser('uuid-1', 'changed@example.de');
    expect(second).toEqual(first);
    expect(getLocalUser('uuid-1')?.email).toBe('a@b.de');
  });

  it('returns the stored user when another insert wins the create race', () => {
    dbHolder.current?.exec(`
      CREATE TRIGGER insert_racing_local_user
      BEFORE INSERT ON local_users
      WHEN NEW.user_id = 'race-uuid'
      BEGIN
        INSERT INTO local_users (user_id, email, registered_at, admin)
        VALUES (
          NEW.user_id,
          'winner@example.de',
          '2026-05-15T00:00:00.000Z',
          1
        );
      END;
    `);

    expect(upsertLocalUser('race-uuid', 'created@example.de')).toEqual({
      user_id: 'race-uuid',
      email: 'winner@example.de',
      registered_at: '2026-05-15T00:00:00.000Z',
      admin: true,
      department_id: null,
    });
  });

  it('reads admin=true when stored as 1', () => {
    dbHolder.current
      ?.prepare(
        'INSERT INTO local_users (user_id, email, registered_at, admin) VALUES (?, ?, ?, 1)'
      )
      .run('admin-uuid', 'admin@x.de', new Date().toISOString());
    expect(getLocalUser('admin-uuid')?.admin).toBe(true);
  });

  it('persists null email', () => {
    const user = upsertLocalUser('uuid-2', null);
    expect(user.email).toBeNull();
    expect(getLocalUser('uuid-2')?.email).toBeNull();
  });

  describe('department assignment', () => {
    it('defaults department_id to null on insert', () => {
      const user = upsertLocalUser('uuid-1', 'a@b.de');
      expect(user.department_id).toBeNull();
      expect(getLocalUser('uuid-1')?.department_id).toBeNull();
    });

    it('sets and clears the department of a user', () => {
      upsertLocalUser('uuid-1', 'a@b.de');
      expect(setLocalUserDepartment('uuid-1', 7)).toBe(true);
      expect(getLocalUser('uuid-1')?.department_id).toBe(7);
      expect(setLocalUserDepartment('uuid-1', null)).toBe(true);
      expect(getLocalUser('uuid-1')?.department_id).toBeNull();
    });

    it('returns false when setting department of unknown user', () => {
      expect(setLocalUserDepartment('missing', 7)).toBe(false);
    });

    it('lists all users sorted by email', () => {
      upsertLocalUser('uuid-b', 'b@b.de');
      upsertLocalUser('uuid-a', 'a@b.de');
      const users = listLocalUsers();
      expect(users.map((u) => u.email)).toEqual(['a@b.de', 'b@b.de']);
    });

    it('clears all assignments of a department and reports count', () => {
      upsertLocalUser('uuid-1', 'a@b.de');
      upsertLocalUser('uuid-2', 'b@b.de');
      upsertLocalUser('uuid-3', 'c@b.de');
      setLocalUserDepartment('uuid-1', 7);
      setLocalUserDepartment('uuid-2', 7);
      setLocalUserDepartment('uuid-3', 8);
      expect(clearDepartmentAssignments(7)).toBe(2);
      expect(getLocalUser('uuid-1')?.department_id).toBeNull();
      expect(getLocalUser('uuid-3')?.department_id).toBe(8);
    });
  });
});
