import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const testUserDataDir = path.join(os.tmpdir(), 'taskflow-test-userdata');

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return testUserDataDir;
      if (name === 'documents') return os.tmpdir();
      return os.tmpdir();
    }),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => false),
    encryptString: vi.fn((value: string) => Buffer.from(value)),
    decryptString: vi.fn((buffer: Buffer) => buffer.toString()),
  },
}));

import { closeDatabase, runMigrations, getDatabase, getDbPath } from '../../main/services/dbService';
import { createBackup, restoreBackup } from '../../main/services/backupService';
import { setupPassword, unlock } from '../../main/services/authService';
import { createTask } from '../../main/repositories/taskRepository';
import { createVaultItem } from '../../main/repositories/vaultRepository';
import { clearVerifier } from '../../main/services/authStorage';

const TEST_PASSWORD = 'correct-horse-battery-staple';
const OTHER_PASSWORD = 'wrong-password';

function resetTestDb(): void {
  const dbPath = getDbPath();
  try {
    fs.unlinkSync(dbPath);
  } catch {
    // ignore if file does not exist
  }
  try {
    fs.rmSync(testUserDataDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
  clearVerifier();
}

describe('backupService', () => {
  beforeEach(() => {
    resetTestDb();
    setupPassword(TEST_PASSWORD);
    unlock(TEST_PASSWORD);
    runMigrations();
  });

  afterEach(() => {
    closeDatabase();
    resetTestDb();
  });

  it('should create an encrypted backup containing tasks and vault items', () => {
    createTask({
      title: 'Backup test task',
      priority: 'high',
      status: 'todo',
      tagIds: [],
    });

    createVaultItem({
      type: 'secureNote',
      title: 'Backup test note',
      fields: [{ id: 'f1', name: '内容', value: 'secret', isSensitive: true }],
      isHidden: false,
    });

    const backup = createBackup();
    expect(backup.length).toBeGreaterThan(0);

    // Encrypted backup should not contain readable JSON.
    expect(backup.toString('utf8').includes('Backup test task')).toBe(false);
  });

  it('should restore data from a backup and overwrite existing data', () => {
    createTask({
      title: 'Original task',
      priority: 'medium',
      status: 'todo',
      tagIds: [],
    });

    const backup = createBackup();

    // Add a new task after backup.
    createTask({
      title: 'New task after backup',
      priority: 'low',
      status: 'todo',
      tagIds: [],
    });

    const result = restoreBackup(backup);
    expect(result.success).toBe(true);

    const tasks = getDatabase().prepare('SELECT * FROM tasks').all();
    expect(tasks).toHaveLength(1);
    expect((tasks[0] as Record<string, unknown>).title).toBe('Original task');
  });

  it('should reject a backup encrypted with a different password', () => {
    createTask({
      title: 'Task to backup',
      priority: 'medium',
      status: 'todo',
      tagIds: [],
    });

    const backup = createBackup();

    // Simulate different device/password by unlocking with a different password.
    closeDatabase();
    const dbPath = getDbPath();
    try {
      fs.unlinkSync(dbPath);
    } catch {
      // ignore
    }
    clearVerifier();
    setupPassword(OTHER_PASSWORD);
    unlock(OTHER_PASSWORD);
    runMigrations();

    const result = restoreBackup(backup);
    expect(result.success).toBe(false);
    expect(result.message).toContain('无法解密');
  });

  it('should reject an invalid backup file', () => {
    const invalidBackup = Buffer.from('not a valid backup');
    const result = restoreBackup(invalidBackup);
    expect(result.success).toBe(false);
  });
});
