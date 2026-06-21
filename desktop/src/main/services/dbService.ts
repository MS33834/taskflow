import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';
import os from 'os';

let db: Database.Database | null = null;

export function getDbPath(): string {
  if (process.env.TASKFLOW_DB_PATH) {
    return process.env.TASKFLOW_DB_PATH;
  }
  return path.join(os.tmpdir(), 'taskflow-test.db');
}

export function openDatabase(key: Buffer, dbPath?: string): Database.Database {
  const resolvedPath = dbPath ?? getDbPath();
  db = new Database(resolvedPath);

  // Enable SQLCipher-compatible encryption using better-sqlite3-multiple-ciphers.
  // The key is provided as a 64-character hex string representing 32 bytes.
  db.pragma("cipher = 'sqlcipher'");
  db.pragma('legacy = 4');
  db.pragma(`key = "x'${key.toString('hex')}'"`);

  // Verify the key is correct by attempting a simple query.
  // If the database is encrypted with a different key, this will throw.
  try {
    db.prepare("SELECT count(*) FROM sqlite_master").get();
  } catch (error) {
    db.close();
    db = null;
    throw new Error('Failed to open encrypted database. Invalid key or corrupted file.');
  }

  return db;
}

export function closeDatabase(): void {
  db?.close();
  db = null;
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

    CREATE TABLE IF NOT EXISTS sync_records (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      encrypted_payload BLOB NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sync_records_table_record ON sync_records(table_name, record_id);
    CREATE INDEX IF NOT EXISTS idx_sync_records_updated_at ON sync_records(updated_at);

    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      local_clock INTEGER NOT NULL DEFAULT 0,
      last_sync_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sync_devices (
      device_id TEXT PRIMARY KEY,
      public_key TEXT NOT NULL,
      name TEXT,
      paired_at INTEGER NOT NULL,
      last_seen_at INTEGER
    );
  `);
}
