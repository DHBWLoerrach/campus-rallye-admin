import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dbHolder: { current: Database.Database | null } = { current: null };

vi.mock('./sqlite', () => ({
  getDb: () => {
    if (!dbHolder.current) throw new Error('DB not initialized');
    return dbHolder.current;
  },
}));

import { getLocalUser, upsertLocalUser } from './local-user';

describe('local-user', () => {
  beforeEach(() => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE local_users (
        user_id TEXT PRIMARY KEY,
        email TEXT,
        registered_at TEXT,
        admin INTEGER NOT NULL DEFAULT 0
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
});
