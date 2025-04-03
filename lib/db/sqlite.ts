import Database from 'better-sqlite3';
import path from 'path';

let dbInstance: Database | null = null;

export function getDb(): Database {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.SQLITE_DB_PATH;
  if (!dbPath) {
    throw new Error('Umgebungsvariable SQLITE_DB_PATH ist nicht gesetzt');
  }

  const resolvedPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);

  dbInstance = new Database(resolvedPath);
  return dbInstance;
}
