export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  reminderAt?: string;
  repeatRule?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'done' | 'archived';
  categoryId?: string;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultItem {
  id: string;
  type: 'password' | 'card' | 'secureNote';
  title: string;
  fields: VaultField[];
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VaultField {
  id: string;
  name: string;
  value: string;
  isSensitive: boolean;
}

export interface SecuritySettings {
  lockMethod: 'password' | 'pin' | 'biometric';
  autoLockMinutes: number;
  clipboardClearSeconds: number;
  screenshotProtection: boolean;
  privacyModeEnabled: boolean;
}
