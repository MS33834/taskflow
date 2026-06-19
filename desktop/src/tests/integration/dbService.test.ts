import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase, closeDatabase, runMigrations, getDatabase } from '../../main/services/dbService';

describe('dbService', () => {
  beforeEach(() => {
    openDatabase(Buffer.alloc(32, 0x01));
    runMigrations();
  });

  afterEach(() => {
    closeDatabase();
  });

  it('should create tables', () => {
    const tables = getDatabase()
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();
    expect(tables.map((t: any) => t.name)).toContain('tasks');
    expect(tables.map((t: any) => t.name)).toContain('vault_items');
  });
});
