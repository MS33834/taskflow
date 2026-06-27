import { randomUUID } from 'crypto';
import { getDatabase } from '../services/dbService';
import { encryptWithMasterKey, decryptWithMasterKey } from '../services/authService';
import type { VaultItem, VaultField } from '../../shared/types';

interface VaultItemRow {
  id: string;
  type: VaultItem['type'];
  title: string;
  fields: string;
  is_hidden: number;
  created_at: string;
  updated_at: string;
}

export function listVaultItems(): VaultItem[] {
  const rows = getDatabase().prepare('SELECT * FROM vault_items ORDER BY updated_at DESC').all() as VaultItemRow[];
  return rows.map(parseVaultItem);
}

export function createVaultItem(item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>): VaultItem {
  const id = randomUUID();
  const now = new Date().toISOString();
  const newItem: VaultItem = {
    ...item,
    id,
    createdAt: now,
    updatedAt: now,
  };

  getDatabase()
    .prepare('INSERT INTO vault_items (id, type, title, fields, is_hidden, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(
      newItem.id,
      newItem.type,
      newItem.title,
      serializeFields(newItem.fields),
      newItem.isHidden ? 1 : 0,
      newItem.createdAt,
      newItem.updatedAt
    );

  return newItem;
}

export function updateVaultItem(id: string, updates: Partial<VaultItem>): VaultItem {
  const existing = getDatabase().prepare('SELECT * FROM vault_items WHERE id = ?').get(id) as VaultItemRow | undefined;
  if (!existing) throw new Error('Vault item not found');

  const item = parseVaultItem(existing);
  const updated: VaultItem = { ...item, ...updates, updatedAt: new Date().toISOString() };

  getDatabase()
    .prepare('UPDATE vault_items SET type = ?, title = ?, fields = ?, is_hidden = ?, updated_at = ? WHERE id = ?')
    .run(
      updated.type,
      updated.title,
      serializeFields(updated.fields),
      updated.isHidden ? 1 : 0,
      updated.updatedAt,
      id
    );

  return updated;
}

export function deleteVaultItem(id: string): void {
  getDatabase().prepare('DELETE FROM vault_items WHERE id = ?').run(id);
}

function serializeFields(fields: VaultField[]): string {
  const encryptedFields = fields.map((field) => ({
    ...field,
    value: field.isSensitive ? encryptWithMasterKey(field.value).toString('base64') : field.value,
  }));
  return JSON.stringify(encryptedFields);
}

function parseVaultItem(row: VaultItemRow): VaultItem {
  // fields 存储为 JSON 文本；损坏时回退为空数组，避免单条坏数据
  // 导致整个密码库列表查询抛异常。
  let fields: VaultField[] = [];
  try {
    fields = JSON.parse(row.fields || '[]');
  } catch {
    fields = [];
  }
  const decryptedFields = fields.map((field) => ({
    ...field,
    value: field.isSensitive ? decryptWithMasterKey(Buffer.from(field.value, 'base64')) : field.value,
  }));

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    fields: decryptedFields,
    isHidden: Boolean(row.is_hidden),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
