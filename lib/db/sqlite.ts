import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.SQLITE_DB_PATH;

if (!dbPath) {
  throw new Error('Umgebungsvariable SQLITE_DB_PATH ist nicht gesetzt');
}

const resolvedPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.resolve(process.cwd(), dbPath);

export const db = new Database(resolvedPath);
