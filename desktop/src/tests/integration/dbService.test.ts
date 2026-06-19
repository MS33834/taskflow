import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase, closeDatabase, runMigrations, getDatabase, getDbPath } from '../../main/services/dbService';
import Database from 'better-sqlite3-multiple-ciphers';
import fs from 'fs';

const TEST_KEY = Buffer.alloc(32, 0x01);
const WRONG_KEY = Buffer.alloc(32, 0x02);

describe('dbService', () => {
  beforeEach(() => {
    // Clean up any leftover test database file.
    const dbPath = getDbPath();
    try {
      fs.unlinkSync(dbPath);
    } catch {
      // ignore if file does not exist
    }
    openDatabase(TEST_KEY);
    runMigrations();
  });

  afterEach(() => {
    closeDatabase();
    const dbPath = getDbPath();
    try {
      fs.unlinkSync(dbPath);
    } catch {
      // ignore
    }
  });

  it('should create tables', () => {
    const tables = getDatabase()
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();
    expect(tables.map((t: any) => t.name)).toContain('tasks');
    expect(tables.map((t: any) => t.name)).toContain('vault_items');
  });

  it('should encrypt the database file so it cannot be opened without the key', () => {
    const dbPath = getDbPath();
    closeDatabase();

    // Attempting to open the encrypted database with no key should fail.
    const unencryptedDb = new Database(dbPath);
    expect(() => {
      unencryptedDb.prepare("SELECT count(*) FROM sqlite_master").get();
    }).toThrow();
    unencryptedDb.close();
  });

  it('should open an existing encrypted database with the correct key', () => {
    closeDatabase();

    openDatabase(TEST_KEY);
    const tables = getDatabase()
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();
    expect(tables.map((t: any) => t.name)).toContain('tasks');
  });

  it('should reject an incorrect key for an encrypted database', () => {
    closeDatabase();

    expect(() => openDatabase(WRONG_KEY)).toThrow('Failed to open encrypted database');
  });
});
