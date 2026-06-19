import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

let db: Database.Database | null = null;
let currentKey: Buffer | null = null;

export function getDbPath(): string {
  if (process.env.TASKFLOW_DB_PATH) {
    return process.env.TASKFLOW_DB_PATH;
  }
  return path.join(os.tmpdir(), 'taskflow-test.db');
}

export function openDatabase(key: Buffer): Database.Database {
  const dbPath = getDbPath();
  db = new Database(dbPath);
  currentKey = key;

  try {
    db.pragma(`key = "x'${key.toString('hex')}'"`);
    db.pragma('cipher = "aes-256-cbc"');
  } catch {
    // TODO: SQLCipher is not enabled in this better-sqlite3 build.
    // Fallback to regular SQLite for this implementation phase.
    // Production builds should compile better-sqlite3 against SQLCipher.
  }

  return db;
}

export function closeDatabase(): void {
  db?.close();
  db = null;
  currentKey = null;
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not opened');
  return db;
}

export function runMigrations(): void {
  const database = getDatabase();
  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      reminder_at TEXT,
      repeat_rule TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'todo',
      category_id TEXT,
      tag_ids TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vault_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      fields TEXT NOT NULL,
      is_hidden INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      is_hidden INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      lock_method TEXT DEFAULT 'password',
      auto_lock_minutes INTEGER DEFAULT 5,
      clipboard_clear_seconds INTEGER DEFAULT 30,
      screenshot_protection INTEGER DEFAULT 0,
      privacy_mode_enabled INTEGER DEFAULT 0
    );
  `);
}
