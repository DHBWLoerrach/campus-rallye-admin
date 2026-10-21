import Database from 'better-sqlite3';
import type { Database as SqliteDb } from 'better-sqlite3';
import path from 'path';

let dbInstance: SqliteDb | null = null;

export function getDb(): SqliteDb {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.SQLITE_DB_PATH;
  if (!dbPath) {
    throw new Error('Umgebungsvariable SQLITE_DB_PATH ist nicht gesetzt');
  }

  // The DB file is runtime data, not a build input: keep Turbopack from
  // tracing the whole project into the standalone output.
  const resolvedPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), dbPath);

  dbInstance = new Database(resolvedPath);
  return dbInstance;
}
