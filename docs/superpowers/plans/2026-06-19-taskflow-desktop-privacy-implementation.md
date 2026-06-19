# TaskFlow 桌面端隐私重塑实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 TaskFlow 仓库基础上，构建一个基于 Electron 的桌面端 MVP，实现本地加密的日程任务管理与敏感信息保险库，并具备完整的隐私保护外壳。

**Architecture:** 采用 Electron 主进程 + React 渲染进程架构。主进程负责 SQLite/SQLCipher 数据库、密钥派生与加密服务；渲染进程通过 IPC 调用这些服务。数据默认本地存储，网络层仅在 2.0 同步阶段引入。

**Tech Stack:** Electron 42 + Vite 6 + React 18 + TypeScript 5 + Zustand 4 + SQLite + SQLCipher + Tailwind CSS / Headless UI

---

## 0. 实施路线选择

在动手前，团队需要选择一条桌面端实施路线。下面给出两条主要路线及推荐。

### 路线 1：基于现有 `desktop/` 模板改造（推荐）

**思路**：仓库里已有一个 Electron 模板（`desktop/`），虽然当前是 AI Dev Assistant 的壳，但 Electron + Vite + React + TS 的骨架是完整的。在其上替换 UI、接入加密和数据库即可。

**优点**：
- 最快的启动路径，1-2 天即可跑通 Electron 壳
- 构建脚本、tsconfig、主进程/渲染进程结构都已就绪
- 与仓库现有 CI/GitHub Actions 兼容

**缺点**：
- 需要清理现有模板中的 AI Dev Assistant 相关代码和依赖（antd、axios 等）
- 模板可能残留不需要的配置

**适用**：希望尽快看到可运行桌面端的团队。

### 路线 2：全新初始化 Electron 项目

**思路**：在仓库根目录或 `apps/desktop/` 下用 `npm create electron-vite` 或类似工具重新生成一个干净的 Electron + React + TS 项目。

**优点**：
- 无历史包袱，结构最清晰
- 可以自由选择最新版本的 Electron 和构建工具

**缺点**：
- 需要重新配置 CI、构建脚本、代码规范
- 多花 2-3 天做基础搭建

**适用**：对现有模板不放心、希望长期维护干净的团队。

### 推荐

**选择路线 1**。原因：
1. 现有模板已经验证可以跑通 Electron + Vite
2. 清理旧代码的成本远低于重新搭建
3. 1.0 的核心价值是「隐私功能」，不是「 Electron 架子」

---

## 1. 文件结构规划

改造后的关键文件结构如下：

```
desktop/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 主入口
│   │   ├── services/
│   │   │   ├── cryptoService.ts # 密钥派生、加解密
│   │   │   ├── dbService.ts     # SQLCipher 数据库操作
│   │   │   └── vaultService.ts  # 保险库业务逻辑
│   │   ├── ipc/
│   │   │   ├── taskChannels.ts  # 任务相关 IPC
│   │   │   ├── vaultChannels.ts # 保险库相关 IPC
│   │   │   └── securityChannels.ts # 安全/锁屏 IPC
│   │   └── utils/
│   │       └── secureStorage.ts # 安全存储辅助
│   ├── preload/                 # 预加载脚本
│   │   └── index.ts             # 暴露安全的 API 给渲染进程
│   ├── renderer/                # React 渲染层
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── LockScreen.tsx
│   │   │   │   └── TitleBar.tsx
│   │   │   ├── task/
│   │   │   │   ├── TaskList.tsx
│   │   │   │   ├── TaskCard.tsx
│   │   │   │   ├── TaskEditor.tsx
│   │   │   │   └── CalendarView.tsx
│   │   │   ├── vault/
│   │   │   │   ├── VaultList.tsx
│   │   │   │   ├── VaultCard.tsx
│   │   │   │   ├── VaultEditor.tsx
│   │   │   │   └── PasswordGenerator.tsx
│   │   │   └── common/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Modal.tsx
│   │   │       └── Toast.tsx
│   │   ├── pages/
│   │   │   ├── TodayPage.tsx
│   │   │   ├── CalendarPage.tsx
│   │   │   ├── VaultPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useTasks.ts
│   │   │   ├── useVault.ts
│   │   │   └── useSecurity.ts
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   ├── taskStore.ts
│   │   │   └── vaultStore.ts
│   │   └── types/
│   │       └── index.ts
│   ├── shared/                  # 主进程与渲染进程共享类型/工具
│   │   ├── types.ts
│   │   └── constants.ts
│   └── tests/
│       ├── unit/
│       │   └── cryptoService.test.ts
│       └── integration/
│           └── ipc.test.ts
├── package.json
├── vite.config.ts
├── tsconfig.main.json
├── tsconfig.renderer.json
└── electron-builder.yml
```

---

## 2. 团队分工

| 角色 | 负责任务 | 关键产出 |
|---|---|---|
| **Electron/桌面工程师** | Task 1-3：清理模板、搭建 IPC、系统集成 | 可运行的 Electron 壳 |
| **安全工程师** | Task 4-6：加密服务、数据库加密、密钥管理 | cryptoService、dbService、安全评审 |
| **后端/数据工程师** | Task 7-8：Repository 抽象、任务与保险库数据层 | TaskRepository、VaultRepository |
| **前端工程师** | Task 9-15：React 组件、状态管理、页面 | 可交互的 UI |
| **UI/UX 设计师** | 与前端并行：设计系统、高保真稿 | Figma、组件规范 |
| **测试工程师** | Task 16：单元测试、集成测试、安全测试 | 测试报告 |

> 小团队可合并角色：安全+后端可由一人负责；前端+UI 紧密配合。

---

## 3. 详细任务

### Task 1: 清理并确认 Electron 模板

**负责角色**：Electron/桌面工程师  
**目标**：让现有 `desktop/` 目录变成 TaskFlow 的干净起点。

**Files:**
- Modify: `desktop/package.json`
- Modify: `desktop/src/renderer/App.tsx`
- Delete: `desktop/src/renderer/pages/Plugins.tsx`
- Delete: `desktop/src/renderer/components/Avatar/`

- [ ] **Step 1: 移除 AI Dev Assistant 相关依赖**

在 `desktop/package.json` 中移除 `antd`、`@ant-design/icons`、`axios`，并添加后续需要的依赖：

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.0",
    "zustand": "^4.5.0",
    "better-sqlite3": "^11.0.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.10"
  }
}
```

Run: `cd desktop && npm install`
Expected: `package-lock.json` 更新，无安装错误。

- [ ] **Step 2: 清理渲染进程入口**

将 `desktop/src/renderer/App.tsx` 替换为最简单的占位：

```tsx
function App() {
  return (
    <div style={{ padding: 40 }}>
      <h1>TaskFlow Desktop</h1>
      <p>Locked: secure shell placeholder</p>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: 删除不需要的模板文件**

删除：
- `desktop/src/renderer/pages/Plugins.tsx`
- `desktop/src/renderer/pages/Settings.tsx`
- `desktop/src/renderer/components/Avatar/`
- `desktop/src/renderer/pages/Home.tsx` 中所有业务逻辑，保留空壳

- [ ] **Step 4: 运行桌面端验证**

Run: `cd desktop && npm run dev`
Expected: Electron 窗口打开，显示 "TaskFlow Desktop"。

- [ ] **Step 5: 提交**

```bash
git add desktop/
git commit -m "chore(desktop): clean up AI dev assistant template for TaskFlow"
```

---

### Task 2: 设计并实现 IPC 通道

**负责角色**：Electron/桌面工程师  
**目标**：建立主进程与渲染进程之间的安全通信协议。

**Files:**
- Create: `desktop/src/shared/types.ts`
- Create: `desktop/src/shared/constants.ts`
- Create: `desktop/src/preload/index.ts`
- Modify: `desktop/src/main/index.ts`

- [ ] **Step 1: 定义共享类型**

创建 `desktop/src/shared/types.ts`：

```typescript
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
```

- [ ] **Step 2: 定义 IPC 通道常量**

创建 `desktop/src/shared/constants.ts`：

```typescript
export const IPC_CHANNELS = {
  AUTH: {
    UNLOCK: 'auth:unlock',
    LOCK: 'auth:lock',
    IS_UNLOCKED: 'auth:isUnlocked',
  },
  TASKS: {
    LIST: 'tasks:list',
    CREATE: 'tasks:create',
    UPDATE: 'tasks:update',
    DELETE: 'tasks:delete',
  },
  VAULT: {
    LIST: 'vault:list',
    CREATE: 'vault:create',
    UPDATE: 'vault:update',
    DELETE: 'vault:delete',
    GENERATE_PASSWORD: 'vault:generatePassword',
  },
  SECURITY: {
    GET_SETTINGS: 'security:getSettings',
    SET_SETTINGS: 'security:setSettings',
    CLEAR_CLIPBOARD: 'security:clearClipboard',
  },
} as const;
```

- [ ] **Step 3: 实现预加载脚本**

创建 `desktop/src/preload/index.ts`：

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';

const api = {
  auth: {
    unlock: (password: string) => ipcRenderer.invoke(IPC_CHANNELS.AUTH.UNLOCK, password),
    lock: () => ipcRenderer.send(IPC_CHANNELS.AUTH.LOCK),
    isUnlocked: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH.IS_UNLOCKED),
  },
  tasks: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.TASKS.LIST),
    create: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.TASKS.CREATE, task),
    update: (id: string, updates: Partial<Task>) =>
      ipcRenderer.invoke(IPC_CHANNELS.TASKS.UPDATE, id, updates),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TASKS.DELETE, id),
  },
  vault: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.VAULT.LIST),
    create: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT.CREATE, item),
    update: (id: string, updates: Partial<VaultItem>) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT.UPDATE, id, updates),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.VAULT.DELETE, id),
    generatePassword: (length: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.VAULT.GENERATE_PASSWORD, length),
  },
  security: {
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SECURITY.GET_SETTINGS),
    setSettings: (settings: SecuritySettings) =>
      ipcRenderer.invoke(IPC_CHANNELS.SECURITY.SET_SETTINGS, settings),
    clearClipboard: () => ipcRenderer.invoke(IPC_CHANNELS.SECURITY.CLEAR_CLIPBOARD),
  },
};

contextBridge.exposeInMainWorld('taskflowAPI', api);

export type TaskflowAPI = typeof api;
```

- [ ] **Step 4: 注册 IPC 处理器占位**

修改 `desktop/src/main/index.ts`，注册处理器（先返回 mock 数据）：

```typescript
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';

ipcMain.handle(IPC_CHANNELS.AUTH.UNLOCK, async (_, password: string) => {
  return password === 'test'; // 临时占位
});

ipcMain.handle(IPC_CHANNELS.AUTH.IS_UNLOCKED, async () => false);

ipcMain.handle(IPC_CHANNELS.TASKS.LIST, async () => []);
ipcMain.handle(IPC_CHANNELS.VAULT.LIST, async () => []);
```

- [ ] **Step 5: 在渲染层声明 window API**

创建 `desktop/src/renderer/types/global.d.ts`：

```typescript
import { TaskflowAPI } from '../../preload';

declare global {
  interface Window {
    taskflowAPI: TaskflowAPI;
  }
}

export {};
```

- [ ] **Step 6: 提交**

```bash
git add desktop/src/shared/ desktop/src/preload/ desktop/src/main/index.ts desktop/src/renderer/types/
git commit -m "feat(desktop): define IPC channels and preload API"
```

---

### Task 3: 主进程窗口与全局快捷键

**负责角色**：Electron/桌面工程师  
**目标**：实现锁定窗口、最小化到托盘、全局快捷键。

**Files:**
- Modify: `desktop/src/main/index.ts`
- Create: `desktop/src/main/windowManager.ts`

- [ ] **Step 1: 抽取窗口管理逻辑**

创建 `desktop/src/main/windowManager.ts`：

```typescript
import { BrowserWindow, globalShortcut } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function registerGlobalShortcuts(): void {
  globalShortcut.register('CommandOrControl+L', () => {
    mainWindow?.webContents.send('app:lock');
  });
  globalShortcut.register('CommandOrControl+N', () => {
    mainWindow?.webContents.send('app:newTask');
  });
  globalShortcut.register('Escape', () => {
    mainWindow?.webContents.send('app:togglePrivacy');
  });
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
}
```

- [ ] **Step 2: 修改主入口**

修改 `desktop/src/main/index.ts` 使用窗口管理器：

```typescript
import { app } from 'electron';
import { createMainWindow, registerGlobalShortcuts, unregisterGlobalShortcuts } from './windowManager';

app.whenReady().then(() => {
  createMainWindow();
  registerGlobalShortcuts();
});

app.on('window-all-closed', () => {
  unregisterGlobalShortcuts();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  createMainWindow();
});
```

- [ ] **Step 3: 提交**

```bash
git add desktop/src/main/
git commit -m "feat(desktop): add window manager and global shortcuts"
```

---

### Task 4: 加密服务实现

**负责角色**：安全工程师  
**目标**：实现主密码派生、字段级加密、密码生成。

**Files:**
- Create: `desktop/src/main/services/cryptoService.ts`
- Create: `desktop/src/tests/unit/cryptoService.test.ts`

- [ ] **Step 1: 实现 cryptoService**

创建 `desktop/src/main/services/cryptoService.ts`：

```typescript
import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 600000;

export interface DerivedKey {
  key: Buffer;
  salt: Buffer;
}

export function deriveKey(password: string, salt: Buffer): DerivedKey {
  const key = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
  return { key, salt };
}

export function generateSalt(): Buffer {
  return randomBytes(SALT_LENGTH);
}

export function encrypt(plaintext: string, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

export function decrypt(ciphertext: Buffer, key: Buffer): string {
  const iv = ciphertext.subarray(0, IV_LENGTH);
  const authTag = ciphertext.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = ciphertext.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  return Array.from(randomBytes(length))
    .map((b) => chars[b % chars.length])
    .join('');
}

export function hashPassword(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, ITERATIONS, 64, 'sha256');
}
```

- [ ] **Step 2: 编写单元测试**

创建 `desktop/src/tests/unit/cryptoService.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { deriveKey, generateSalt, encrypt, decrypt, generatePassword } from '../../main/services/cryptoService';

describe('cryptoService', () => {
  it('should encrypt and decrypt text', () => {
    const salt = generateSalt();
    const { key } = deriveKey('master-password', salt);
    const plaintext = 'sensitive data';
    const ciphertext = encrypt(plaintext, key);
    expect(decrypt(ciphertext, key)).toBe(plaintext);
  });

  it('should generate password of correct length', () => {
    expect(generatePassword(20)).toHaveLength(20);
  });

  it('should produce different ciphertexts for same plaintext', () => {
    const salt = generateSalt();
    const { key } = deriveKey('master-password', salt);
    const c1 = encrypt('data', key);
    const c2 = encrypt('data', key);
    expect(c1.toString('hex')).not.toBe(c2.toString('hex'));
  });
});
```

Run: `cd desktop && npx vitest run src/tests/unit/cryptoService.test.ts`
Expected: 3 tests pass.

- [ ] **Step 3: 提交**

```bash
git add desktop/src/main/services/cryptoService.ts desktop/src/tests/unit/
git commit -m "feat(security): implement crypto service with PBKDF2 and AES-GCM"
```

---

### Task 5: SQLCipher 数据库服务

**负责角色**：安全工程师 + 后端/数据工程师  
**目标**：用 SQLCipher 创建加密本地数据库，封装基础 CRUD。

**Files:**
- Create: `desktop/src/main/services/dbService.ts`
- Create: `desktop/src/tests/integration/dbService.test.ts`

- [ ] **Step 1: 安装 better-sqlite3 并确认 SQLCipher 支持**

Run: `cd desktop && npm install better-sqlite3`
Run: `cd desktop && npm install -D @types/better-sqlite3`

注意：`better-sqlite3` 默认不带 SQLCipher。需要：
- 方案 A：使用 `better-sqlite3` + 系统级 SQLCipher 编译（推荐，性能最好）
- 方案 B：使用 `sqlcipher` npm 包或 `electron-builder` 原生模块配置

**这里选择方案 A**，并在 CI 中配置 SQLCipher 编译参数。

- [ ] **Step 2: 实现 dbService**

创建 `desktop/src/main/services/dbService.ts`：

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database | null = null;
let currentKey: Buffer | null = null;

export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'taskflow.db');
}

export function openDatabase(key: Buffer): Database.Database {
  const dbPath = getDbPath();
  db = new Database(dbPath);
  db.pragma(`key = "x'${key.toString('hex')}'"`);
  db.pragma('cipher = "aes-256-cbc"');
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
```

- [ ] **Step 3: 编写集成测试**

创建 `desktop/src/tests/integration/dbService.test.ts`：

```typescript
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
```

Run: `cd desktop && npx vitest run src/tests/integration/dbService.test.ts`
Expected: tests pass.

- [ ] **Step 4: 提交**

```bash
git add desktop/src/main/services/dbService.ts desktop/src/tests/integration/
git commit -m "feat(db): add SQLCipher database service with migrations"
```

---

### Task 6: 认证与密钥管理

**负责角色**：安全工程师  
**目标**：实现解锁/锁定、主密钥内存管理、自动锁屏。

**Files:**
- Create: `desktop/src/main/services/authService.ts`
- Modify: `desktop/src/main/index.ts`

- [ ] **Step 1: 实现 authService**

创建 `desktop/src/main/services/authService.ts`：

```typescript
import { randomBytes } from 'crypto';
import { deriveKey, generateSalt, hashPassword } from './cryptoService';
import { openDatabase, closeDatabase, runMigrations } from './dbService';

let masterKey: Buffer | null = null;
let autoLockTimer: NodeJS.Timeout | null = null;

const SALT_STORAGE_KEY = 'authSalt';
const HASH_STORAGE_KEY = 'authHash';

export function isUnlocked(): boolean {
  return masterKey !== null;
}

export function getMasterKey(): Buffer | null {
  return masterKey;
}

export function setupPassword(password: string): void {
  const salt = generateSalt();
  const hash = hashPassword(password, salt);
  // 注意：hash 和 salt 只用于校验密码，不用于解密
  // 实际存储应通过系统 keychain 或 Electron safeStorage
  process.env[SALT_STORAGE_KEY] = salt.toString('hex');
  process.env[HASH_STORAGE_KEY] = hash.toString('hex');
}

export function unlock(password: string): boolean {
  // 实际项目中应从 keychain 读取 salt 和 hash
  const saltHex = process.env[SALT_STORAGE_KEY];
  const hashHex = process.env[HASH_STORAGE_KEY];

  if (!saltHex || !hashHex) {
    // 首次使用，直接设置
    setupPassword(password);
  } else {
    const salt = Buffer.from(saltHex, 'hex');
    const expectedHash = Buffer.from(hashHex, 'hex');
    const actualHash = hashPassword(password, salt);
    if (!actualHash.equals(expectedHash)) {
      return false;
    }
  }

  const salt = Buffer.from(process.env[SALT_STORAGE_KEY]!, 'hex');
  const { key } = deriveKey(password, salt);
  masterKey = key;
  openDatabase(key);
  runMigrations();
  return true;
}

export function lock(): void {
  masterKey = null;
  closeDatabase();
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }
}

export function resetAutoLock(minutes: number): void {
  if (autoLockTimer) clearTimeout(autoLockTimer);
  if (minutes <= 0) return;
  autoLockTimer = setTimeout(() => {
    lock();
  }, minutes * 60 * 1000);
}
```

> **安全提示**：上述 `process.env` 存储仅用于开发占位。生产环境应使用 `electron.safeStorage` 或操作系统 keychain 存储 salt/hash。

- [ ] **Step 2: 将认证接入 IPC**

修改 `desktop/src/main/index.ts` 中的认证处理器：

```typescript
import { unlock, lock, isUnlocked, resetAutoLock } from './services/authService';
import { IPC_CHANNELS } from '../shared/constants';

ipcMain.handle(IPC_CHANNELS.AUTH.UNLOCK, async (_, password: string) => {
  const success = unlock(password);
  if (success) resetAutoLock(5);
  return success;
});

ipcMain.handle(IPC_CHANNELS.AUTH.LOCK, async () => {
  lock();
});

ipcMain.handle(IPC_CHANNELS.AUTH.IS_UNLOCKED, async () => isUnlocked());
```

- [ ] **Step 3: 提交**

```bash
git add desktop/src/main/services/authService.ts desktop/src/main/index.ts
git commit -m "feat(auth): implement unlock/lock and master key management"
```

---

### Task 7: 任务 Repository 与 IPC

**负责角色**：后端/数据工程师  
**目标**：实现任务的数据层和 IPC 处理器。

**Files:**
- Create: `desktop/src/main/repositories/taskRepository.ts`
- Create: `desktop/src/main/ipc/taskChannels.ts`
- Modify: `desktop/src/main/index.ts`

- [ ] **Step 1: 实现 taskRepository**

创建 `desktop/src/main/repositories/taskRepository.ts`：

```typescript
import { getDatabase } from '../services/dbService';
import type { Task } from '../../shared/types';

export function listTasks(): Task[] {
  const rows = getDatabase().prepare('SELECT * FROM tasks ORDER BY due_date ASC').all();
  return rows.map(parseTask);
}

export function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const newTask: Task = {
    ...task,
    id,
    createdAt: now,
    updatedAt: now,
  };
  getDatabase()
    .prepare(`
      INSERT INTO tasks (id, title, description, due_date, reminder_at, repeat_rule, priority, status, category_id, tag_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      newTask.id,
      newTask.title,
      newTask.description ?? null,
      newTask.dueDate ?? null,
      newTask.reminderAt ?? null,
      newTask.repeatRule ?? null,
      newTask.priority,
      newTask.status,
      newTask.categoryId ?? null,
      JSON.stringify(newTask.tagIds),
      newTask.createdAt,
      newTask.updatedAt
    );
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): Task {
  const existing = getDatabase().prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) throw new Error('Task not found');

  const task = parseTask(existing);
  const updated: Task = { ...task, ...updates, updatedAt: new Date().toISOString() };

  getDatabase()
    .prepare(`
      UPDATE tasks SET
        title = ?, description = ?, due_date = ?, reminder_at = ?, repeat_rule = ?,
        priority = ?, status = ?, category_id = ?, tag_ids = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(
      updated.title,
      updated.description ?? null,
      updated.dueDate ?? null,
      updated.reminderAt ?? null,
      updated.repeatRule ?? null,
      updated.priority,
      updated.status,
      updated.categoryId ?? null,
      JSON.stringify(updated.tagIds),
      updated.updatedAt,
      id
    );

  return updated;
}

export function deleteTask(id: string): void {
  getDatabase().prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

function parseTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    dueDate: row.due_date ?? undefined,
    reminderAt: row.reminder_at ?? undefined,
    repeatRule: row.repeat_rule ?? undefined,
    priority: row.priority,
    status: row.status,
    categoryId: row.category_id ?? undefined,
    tagIds: JSON.parse(row.tag_ids || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

- [ ] **Step 2: 实现 task IPC 处理器**

创建 `desktop/src/main/ipc/taskChannels.ts`：

```typescript
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { listTasks, createTask, updateTask, deleteTask } from '../repositories/taskRepository';

export function registerTaskChannels(): void {
  ipcMain.handle(IPC_CHANNELS.TASKS.LIST, async () => listTasks());
  ipcMain.handle(IPC_CHANNELS.TASKS.CREATE, async (_, task) => createTask(task));
  ipcMain.handle(IPC_CHANNELS.TASKS.UPDATE, async (_, id, updates) => updateTask(id, updates));
  ipcMain.handle(IPC_CHANNELS.TASKS.DELETE, async (_, id) => deleteTask(id));
}
```

- [ ] **Step 3: 注册通道**

在 `desktop/src/main/index.ts` 中导入并调用：

```typescript
import { registerTaskChannels } from './ipc/taskChannels';

app.whenReady().then(() => {
  createMainWindow();
  registerGlobalShortcuts();
  registerTaskChannels();
});
```

- [ ] **Step 4: 提交**

```bash
git add desktop/src/main/repositories/ desktop/src/main/ipc/
git commit -m "feat(tasks): implement task repository and IPC channels"
```

---

### Task 8: 保险库 Repository 与 IPC

**负责角色**：后端/数据工程师 + 安全工程师  
**目标**：实现保险库数据层，敏感字段做字段级加密。

**Files:**
- Create: `desktop/src/main/repositories/vaultRepository.ts`
- Create: `desktop/src/main/ipc/vaultChannels.ts`
- Modify: `desktop/src/main/index.ts`

- [ ] **Step 1: 实现 vaultRepository**

创建 `desktop/src/main/repositories/vaultRepository.ts`：

```typescript
import { getDatabase } from '../services/dbService';
import { getMasterKey } from '../services/authService';
import { encrypt, decrypt } from '../services/cryptoService';
import type { VaultItem, VaultField } from '../../shared/types';

export function listVaultItems(): VaultItem[] {
  const rows = getDatabase().prepare('SELECT * FROM vault_items ORDER BY updated_at DESC').all();
  return rows.map(parseVaultItem);
}

export function createVaultItem(item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>): VaultItem {
  const id = crypto.randomUUID();
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
  const existing = getDatabase().prepare('SELECT * FROM vault_items WHERE id = ?').get(id);
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
  const key = getMasterKey();
  if (!key) throw new Error('Not unlocked');

  const encryptedFields = fields.map((field) => ({
    ...field,
    value: field.isSensitive ? encrypt(field.value, key).toString('base64') : field.value,
  }));
  return JSON.stringify(encryptedFields);
}

function parseVaultItem(row: any): VaultItem {
  const key = getMasterKey();
  if (!key) throw new Error('Not unlocked');

  const fields: VaultField[] = JSON.parse(row.fields || '[]');
  const decryptedFields = fields.map((field) => ({
    ...field,
    value: field.isSensitive ? decrypt(Buffer.from(field.value, 'base64'), key) : field.value,
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
```

- [ ] **Step 2: 实现 vault IPC 处理器**

创建 `desktop/src/main/ipc/vaultChannels.ts`：

```typescript
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { listVaultItems, createVaultItem, updateVaultItem, deleteVaultItem } from '../repositories/vaultRepository';
import { generatePassword } from '../services/cryptoService';

export function registerVaultChannels(): void {
  ipcMain.handle(IPC_CHANNELS.VAULT.LIST, async () => listVaultItems());
  ipcMain.handle(IPC_CHANNELS.VAULT.CREATE, async (_, item) => createVaultItem(item));
  ipcMain.handle(IPC_CHANNELS.VAULT.UPDATE, async (_, id, updates) => updateVaultItem(id, updates));
  ipcMain.handle(IPC_CHANNELS.VAULT.DELETE, async (_, id) => deleteVaultItem(id));
  ipcMain.handle(IPC_CHANNELS.VAULT.GENERATE_PASSWORD, async (_, length) => generatePassword(length));
}
```

- [ ] **Step 3: 注册通道**

在 `desktop/src/main/index.ts` 中：

```typescript
import { registerVaultChannels } from './ipc/vaultChannels';

app.whenReady().then(() => {
  createMainWindow();
  registerGlobalShortcuts();
  registerTaskChannels();
  registerVaultChannels();
});
```

- [ ] **Step 4: 提交**

```bash
git add desktop/src/main/repositories/vaultRepository.ts desktop/src/main/ipc/vaultChannels.ts desktop/src/main/index.ts
git commit -m "feat(vault): implement encrypted vault repository and IPC channels"
```

---

### Task 9: 渲染进程状态管理（Zustand）

**负责角色**：前端工程师  
**目标**：搭建 React 渲染层的状态管理，连接 IPC。

**Files:**
- Create: `desktop/src/renderer/store/authStore.ts`
- Create: `desktop/src/renderer/store/taskStore.ts`
- Create: `desktop/src/renderer/store/vaultStore.ts`

- [ ] **Step 1: authStore**

创建 `desktop/src/renderer/store/authStore.ts`：

```typescript
import { create } from 'zustand';

interface AuthState {
  isUnlocked: boolean;
  isLoading: boolean;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  checkStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isUnlocked: false,
  isLoading: true,
  unlock: async (password) => {
    const success = await window.taskflowAPI.auth.unlock(password);
    set({ isUnlocked: success });
    return success;
  },
  lock: () => {
    window.taskflowAPI.auth.lock();
    set({ isUnlocked: false });
  },
  checkStatus: async () => {
    const unlocked = await window.taskflowAPI.auth.isUnlocked();
    set({ isUnlocked: unlocked, isLoading: false });
  },
}));
```

- [ ] **Step 2: taskStore**

创建 `desktop/src/renderer/store/taskStore.ts`：

```typescript
import { create } from 'zustand';
import type { Task } from '../../shared/types';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  fetch: () => Promise<void>;
  create: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  update: (id: string, updates: Partial<Task>) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,
  fetch: async () => {
    set({ loading: true });
    const tasks = await window.taskflowAPI.tasks.list();
    set({ tasks, loading: false });
  },
  create: async (task) => {
    await window.taskflowAPI.tasks.create(task);
    await useTaskStore.getState().fetch();
  },
  update: async (id, updates) => {
    await window.taskflowAPI.tasks.update(id, updates);
    await useTaskStore.getState().fetch();
  },
  delete: async (id) => {
    await window.taskflowAPI.tasks.delete(id);
    await useTaskStore.getState().fetch();
  },
}));
```

- [ ] **Step 3: vaultStore**

创建 `desktop/src/renderer/store/vaultStore.ts`：

```typescript
import { create } from 'zustand';
import type { VaultItem } from '../../shared/types';

interface VaultState {
  items: VaultItem[];
  loading: boolean;
  fetch: () => Promise<void>;
  create: (item: Omit<VaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  update: (id: string, updates: Partial<VaultItem>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  generatePassword: (length: number) => Promise<string>;
}

export const useVaultStore = create<VaultState>((set) => ({
  items: [],
  loading: false,
  fetch: async () => {
    set({ loading: true });
    const items = await window.taskflowAPI.vault.list();
    set({ items, loading: false });
  },
  create: async (item) => {
    await window.taskflowAPI.vault.create(item);
    await useVaultStore.getState().fetch();
  },
  update: async (id, updates) => {
    await window.taskflowAPI.vault.update(id, updates);
    await useVaultStore.getState().fetch();
  },
  delete: async (id) => {
    await window.taskflowAPI.vault.delete(id);
    await useVaultStore.getState().fetch();
  },
  generatePassword: async (length) => {
    return window.taskflowAPI.vault.generatePassword(length);
  },
}));
```

- [ ] **Step 4: 提交**

```bash
git add desktop/src/renderer/store/
git commit -m "feat(renderer): add Zustand stores for auth, tasks, and vault"
```

---

### Task 10: 基础 UI 组件与设计系统

**负责角色**：前端工程师 + UI/UX 设计师  
**目标**：实现可复用的基础组件，建立设计系统初版。

**Files:**
- Create: `desktop/src/renderer/components/common/Button.tsx`
- Create: `desktop/src/renderer/components/common/Input.tsx`
- Create: `desktop/src/renderer/components/common/Modal.tsx`
- Create: `desktop/src/renderer/components/common/Toast.tsx`
- Modify: `desktop/src/renderer/index.html`
- Modify: `desktop/src/renderer/main.tsx`

- [ ] **Step 1: 配置 Tailwind CSS**

Run: `cd desktop && npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`

修改 `desktop/tailwind.config.js`：

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        surface: '#F8FAFC',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
};
```

创建 `desktop/src/renderer/index.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-surface text-slate-800 antialiased;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

- [ ] **Step 2: 实现 Button 组件**

创建 `desktop/src/renderer/components/common/Button.tsx`：

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50';
    const variants = {
      primary: 'bg-primary text-white hover:bg-blue-600',
      secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
      danger: 'bg-danger text-white hover:bg-red-600',
      ghost: 'text-slate-600 hover:bg-slate-100',
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    return (
      <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

- [ ] **Step 3: 实现 Input 组件**

创建 `desktop/src/renderer/components/common/Input.tsx`：

```tsx
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
        <input
          ref={ref}
          className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${error ? 'border-danger' : ''} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

- [ ] **Step 4: 引入样式**

修改 `desktop/src/renderer/main.tsx`：

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: 提交**

```bash
git add desktop/src/renderer/components/common/ desktop/src/renderer/index.css desktop/src/renderer/main.tsx desktop/tailwind.config.js desktop/postcss.config.js
git commit -m "feat(ui): add Tailwind and base components"
```

---

### Task 11: 锁定界面与路由

**负责角色**：前端工程师  
**目标**：实现应用锁定状态、解锁界面和主路由。

**Files:**
- Create: `desktop/src/renderer/components/layout/LockScreen.tsx`
- Create: `desktop/src/renderer/components/layout/Sidebar.tsx`
- Modify: `desktop/src/renderer/App.tsx`

- [ ] **Step 1: LockScreen 组件**

创建 `desktop/src/renderer/components/layout/LockScreen.tsx`：

```tsx
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

export function LockScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { unlock } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await unlock(password);
    if (!success) setError('密码错误');
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50">
      <div className="mb-8 text-3xl font-semibold text-slate-800">TaskFlow</div>
      <form onSubmit={handleSubmit} className="w-80 space-y-4">
        <Input
          type="password"
          placeholder="输入主密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="text-center text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full">
          解锁
        </Button>
      </form>
      <p className="mt-6 text-xs text-slate-400">本地加密 · 数据不上传</p>
    </div>
  );
}
```

- [ ] **Step 2: Sidebar 组件**

创建 `desktop/src/renderer/components/layout/Sidebar.tsx`：

```tsx
import { useAuthStore } from '../../store/authStore';
import { Button } from '../common/Button';

interface SidebarProps {
  current: string;
  onChange: (page: string) => void;
}

const items = [
  { id: 'today', label: '今日任务' },
  { id: 'calendar', label: '日历' },
  { id: 'vault', label: '保险库' },
  { id: 'settings', label: '设置' },
];

export function Sidebar({ current, onChange }: SidebarProps) {
  const { lock } = useAuthStore();

  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
      <div className="p-4 text-lg font-semibold text-slate-800">TaskFlow</div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              current === item.id ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-3">
        <Button variant="ghost" className="w-full justify-start" onClick={lock}>
          锁定
        </Button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: App 主入口**

修改 `desktop/src/renderer/App.tsx`：

```tsx
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { LockScreen } from './components/layout/LockScreen';
import { Sidebar } from './components/layout/Sidebar';
import { TodayPage } from './pages/TodayPage';
import { CalendarPage } from './pages/CalendarPage';
import { VaultPage } from './pages/VaultPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  const { isUnlocked, isLoading, checkStatus } = useAuthStore();
  const [currentPage, setCurrentPage] = useState('today');

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  if (isLoading) return <div className="flex h-screen items-center justify-center">加载中...</div>;
  if (!isUnlocked) return <LockScreen />;

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <Sidebar current={currentPage} onChange={setCurrentPage} />
      <main className="flex-1 overflow-auto p-6">
        {currentPage === 'today' && <TodayPage />}
        {currentPage === 'calendar' && <CalendarPage />}
        {currentPage === 'vault' && <VaultPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: 创建页面空壳**

创建 `desktop/src/renderer/pages/TodayPage.tsx`、`CalendarPage.tsx`、`VaultPage.tsx`、`SettingsPage.tsx`，每个返回简单的 `<div>Page Name</div>`。

- [ ] **Step 5: 提交**

```bash
git add desktop/src/renderer/components/layout/ desktop/src/renderer/pages/ desktop/src/renderer/App.tsx
git commit -m "feat(ui): add lock screen, sidebar, and routing"
```

---

### Task 12: 任务管理页面

**负责角色**：前端工程师  
**目标**：实现今日任务列表、添加/编辑/完成任务。

**Files:**
- Create: `desktop/src/renderer/components/task/TaskList.tsx`
- Create: `desktop/src/renderer/components/task/TaskCard.tsx`
- Create: `desktop/src/renderer/components/task/TaskEditor.tsx`
- Modify: `desktop/src/renderer/pages/TodayPage.tsx`

- [ ] **Step 1: TaskCard 组件**

创建 `desktop/src/renderer/components/task/TaskCard.tsx`：

```tsx
import { useTaskStore } from '../../store/taskStore';
import type { Task } from '../../../shared/types';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const { update, delete: deleteTask } = useTaskStore();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <input
        type="checkbox"
        checked={task.status === 'done'}
        onChange={(e) => update(task.id, { status: e.target.checked ? 'done' : 'todo' })}
        className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
      />
      <div className="flex-1">
        <p className={`font-medium ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
          {task.title}
        </p>
        {task.dueDate && <p className="text-xs text-slate-500">{task.dueDate}</p>}
      </div>
      <button onClick={() => deleteTask(task.id)} className="text-sm text-slate-400 hover:text-danger">
        删除
      </button>
    </div>
  );
}
```

- [ ] **Step 2: TaskEditor 组件**

创建 `desktop/src/renderer/components/task/TaskEditor.tsx`：

```tsx
import { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useTaskStore } from '../../store/taskStore';

export function TaskEditor() {
  const [title, setTitle] = useState('');
  const { create } = useTaskStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await create({ title, priority: 'medium', status: 'todo', tagIds: [] });
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="添加新任务..."
        className="flex-1"
      />
      <Button type="submit">添加</Button>
    </form>
  );
}
```

- [ ] **Step 3: TaskList 组件**

创建 `desktop/src/renderer/components/task/TaskList.tsx`：

```tsx
import { useEffect } from 'react';
import { useTaskStore } from '../../store/taskStore';
import { TaskCard } from './TaskCard';
import { TaskEditor } from './TaskEditor';

export function TaskList() {
  const { tasks, loading, fetch } = useTaskStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div>
      <TaskEditor />
      {loading ? (
        <p>加载中...</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 && <p className="text-slate-400">暂无任务</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: TodayPage**

修改 `desktop/src/renderer/pages/TodayPage.tsx`：

```tsx
import { TaskList } from '../components/task/TaskList';

export function TodayPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">今日任务</h1>
      <TaskList />
    </div>
  );
}
```

- [ ] **Step 5: 提交**

```bash
git add desktop/src/renderer/components/task/ desktop/src/renderer/pages/TodayPage.tsx
git commit -m "feat(ui): implement task list, card, and editor"
```

---

### Task 13: 保险库页面

**负责角色**：前端工程师  
**目标**：实现保险库列表、添加/查看/复制密码。

**Files:**
- Create: `desktop/src/renderer/components/vault/VaultList.tsx`
- Create: `desktop/src/renderer/components/vault/VaultCard.tsx`
- Create: `desktop/src/renderer/components/vault/VaultEditor.tsx`
- Modify: `desktop/src/renderer/pages/VaultPage.tsx`

- [ ] **Step 1: VaultCard 组件**

创建 `desktop/src/renderer/components/vault/VaultCard.tsx`：

```tsx
import { useState } from 'react';
import type { VaultItem } from '../../../shared/types';
import { Button } from '../common/Button';
import { useVaultStore } from '../../store/vaultStore';

interface VaultCardProps {
  item: VaultItem;
}

export function VaultCard({ item }: VaultCardProps) {
  const [showSensitive, setShowSensitive] = useState(false);
  const { delete: deleteItem } = useVaultStore();

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    // TODO: 触发剪贴板清空定时器
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{item.title}</h3>
        <button onClick={() => deleteItem(item.id)} className="text-sm text-slate-400 hover:text-danger">
          删除
        </button>
      </div>
      <div className="space-y-2">
        {item.fields.map((field) => (
          <div key={field.id} className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{field.name}</span>
            <div className="flex items-center gap-2">
              <span className={field.isSensitive && !showSensitive ? 'blur-sm' : ''}>
                {field.isSensitive && !showSensitive ? '••••••••' : field.value}
              </span>
              {field.isSensitive && (
                <Button variant="ghost" size="sm" onClick={() => setShowSensitive(!showSensitive)}>
                  {showSensitive ? '隐藏' : '显示'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => handleCopy(field.value)}>
                复制
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: VaultEditor 组件**

创建 `desktop/src/renderer/components/vault/VaultEditor.tsx`：

```tsx
import { useState } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useVaultStore } from '../../store/vaultStore';
import type { VaultField } from '../../../shared/types';

export function VaultEditor() {
  const [title, setTitle] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const { create, generatePassword } = useVaultStore();

  const handleGenerate = async () => {
    const pwd = await generatePassword(16);
    setPassword(pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const fields: VaultField[] = [
      { id: crypto.randomUUID(), name: '账号', value: account, isSensitive: false },
      { id: crypto.randomUUID(), name: '密码', value: password, isSensitive: true },
    ];
    await create({ type: 'password', title, fields, isHidden: false });
    setTitle('');
    setAccount('');
    setPassword('');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <Input placeholder="名称（如 GitHub）" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input placeholder="账号" value={account} onChange={(e) => setAccount(e.target.value)} />
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="flex-1"
        />
        <Button type="button" variant="secondary" onClick={handleGenerate}>
          生成
        </Button>
      </div>
      <Button type="submit">保存到保险库</Button>
    </form>
  );
}
```

- [ ] **Step 3: VaultList 组件**

创建 `desktop/src/renderer/components/vault/VaultList.tsx`：

```tsx
import { useEffect } from 'react';
import { useVaultStore } from '../../store/vaultStore';
import { VaultCard } from './VaultCard';
import { VaultEditor } from './VaultEditor';

export function VaultList() {
  const { items, loading, fetch } = useVaultStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div>
      <VaultEditor />
      {loading ? (
        <p>加载中...</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <VaultCard key={item.id} item={item} />
          ))}
          {items.length === 0 && <p className="text-slate-400">保险库为空</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: VaultPage**

修改 `desktop/src/renderer/pages/VaultPage.tsx`：

```tsx
import { VaultList } from '../components/vault/VaultList';

export function VaultPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">加密保险库</h1>
      <VaultList />
    </div>
  );
}
```

- [ ] **Step 5: 提交**

```bash
git add desktop/src/renderer/components/vault/ desktop/src/renderer/pages/VaultPage.tsx
git commit -m "feat(ui): implement vault list, card, and editor"
```

---

### Task 14: 隐私功能实现

**负责角色**：前端工程师 + Electron/桌面工程师  
**目标**：实现隐私模式、自动锁屏、剪贴板清空。

**Files:**
- Create: `desktop/src/renderer/hooks/usePrivacyMode.ts`
- Create: `desktop/src/renderer/hooks/useAutoLock.ts`
- Modify: `desktop/src/renderer/App.tsx`
- Modify: `desktop/src/main/index.ts`

- [ ] **Step 1: 隐私模式 Hook**

创建 `desktop/src/renderer/hooks/usePrivacyMode.ts`：

```typescript
import { useState, useEffect } from 'react';

export function usePrivacyMode() {
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    const handler = () => setPrivacyMode((prev) => !prev);
    window.addEventListener('toggle-privacy', handler);
    return () => window.removeEventListener('toggle-privacy', handler);
  }, []);

  return privacyMode;
}
```

- [ ] **Step 2: 自动锁屏 Hook**

创建 `desktop/src/renderer/hooks/useAutoLock.ts`：

```typescript
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function useAutoLock(minutes: number) {
  const { lock } = useAuthStore();

  useEffect(() => {
    if (minutes <= 0) return;

    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => lock(), minutes * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'mousemove'];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [minutes, lock]);
}
```

- [ ] **Step 3: 接入 App**

修改 `desktop/src/renderer/App.tsx`：

```tsx
import { usePrivacyMode } from './hooks/usePrivacyMode';
import { useAutoLock } from './hooks/useAutoLock';

function App() {
  const { isUnlocked, isLoading, checkStatus } = useAuthStore();
  const [currentPage, setCurrentPage] = useState('today');
  const privacyMode = usePrivacyMode();
  useAutoLock(5);

  // ...

  return (
    <div className="flex h-screen w-full bg-slate-50">
      <Sidebar current={currentPage} onChange={setCurrentPage} privacyMode={privacyMode} />
      <main className="flex-1 overflow-auto p-6">
        {currentPage === 'today' && <TodayPage />}
        {currentPage === 'calendar' && <CalendarPage />}
        {currentPage === 'vault' && !privacyMode && <VaultPage />}
        {privacyMode && currentPage === 'vault' && (
          <div className="text-slate-400">隐私模式下保险库已隐藏</div>
        )}
        {currentPage === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: 全局快捷键触发渲染层事件**

修改 `desktop/src/main/windowManager.ts`：

```typescript
mainWindow?.webContents.send('app:lock');
```

在 `desktop/src/renderer/main.tsx` 中监听：

```tsx
import { ipcRenderer } from 'electron';

if (ipcRenderer) {
  ipcRenderer.on('app:lock', () => {
    // 触发锁定
  });
  ipcRenderer.on('app:togglePrivacy', () => {
    window.dispatchEvent(new CustomEvent('toggle-privacy'));
  });
}
```

注意：渲染进程不能直接 import electron，需要通过 preload 暴露。这里需要调整 preload 以支持 on/off 监听。

- [ ] **Step 5: 剪贴板清空**

修改 `desktop/src/main/services/authService.ts` 中的 `resetAutoLock` 或 security IPC，添加：

```typescript
export function scheduleClipboardClear(seconds: number): void {
  setTimeout(() => {
    // 仅在支持的平台清空剪贴板
    if (process.platform !== 'linux') {
      clipboard.clear();
    }
  }, seconds * 1000);
}
```

- [ ] **Step 6: 提交**

```bash
git add desktop/src/renderer/hooks/ desktop/src/renderer/App.tsx desktop/src/main/
git commit -m "feat(privacy): add privacy mode, auto-lock, and clipboard clear"
```

---

### Task 15: 设置页面与数据导入导出

**负责角色**：前端工程师  
**目标**：实现安全设置、外观切换、数据导入导出。

**Files:**
- Create: `desktop/src/renderer/components/common/Switch.tsx`
- Modify: `desktop/src/renderer/pages/SettingsPage.tsx`

- [ ] **Step 1: Switch 组件**

创建 `desktop/src/renderer/components/common/Switch.tsx`：

```tsx
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <div
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-slate-200'}`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  );
}
```

- [ ] **Step 2: SettingsPage**

修改 `desktop/src/renderer/pages/SettingsPage.tsx`：

```tsx
import { useState } from 'react';
import { Switch } from '../components/common/Switch';
import { Button } from '../components/common/Button';

export function SettingsPage() {
  const [autoLock, setAutoLock] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">设置</h1>
      <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <h2 className="mb-3 font-medium text-slate-800">安全</h2>
          <Switch label="5 分钟无操作自动锁定" checked={autoLock} onChange={setAutoLock} />
        </div>
        <div>
          <h2 className="mb-3 font-medium text-slate-800">外观</h2>
          <Switch label="深色模式" checked={darkMode} onChange={setDarkMode} />
        </div>
        <div>
          <h2 className="mb-3 font-medium text-slate-800">数据</h2>
          <div className="flex gap-3">
            <Button variant="secondary">导出备份</Button>
            <Button variant="secondary">导入备份</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add desktop/src/renderer/components/common/Switch.tsx desktop/src/renderer/pages/SettingsPage.tsx
git commit -m "feat(ui): add settings page with security and appearance toggles"
```

---

### Task 16: 测试、构建与打包

**负责角色**：测试工程师 + Electron/桌面工程师  
**目标**：核心逻辑有测试，CI 能构建出安装包。

**Files:**
- Modify: `desktop/package.json`
- Modify: `desktop/vite.config.ts`
- Create: `.github/workflows/desktop-build.yml`

- [ ] **Step 1: 配置测试脚本**

修改 `desktop/package.json`：

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit -p tsconfig.main.json && tsc --noEmit -p tsconfig.renderer.json",
    "lint": "eslint src --ext .ts,.tsx"
  }
}
```

- [ ] **Step 2: 配置 vitest**

修改 `desktop/vite.config.ts`：

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
});
```

- [ ] **Step 3: 运行测试**

Run: `cd desktop && npm run test`
Expected: 所有单元测试和集成测试通过。

- [ ] **Step 4: 配置 electron-builder**

创建 `desktop/electron-builder.yml`：

```yaml
appId: com.taskflow.app
productName: TaskFlow
directories:
  output: release
files:
  - dist/**/*
  - package.json
mac:
  category: public.app-category.productivity
  target: dmg
win:
  target: nsis
linux:
  target: AppImage
```

- [ ] **Step 5: 添加 GitHub Actions 构建流程**

创建 `.github/workflows/desktop-build.yml`：

```yaml
name: Desktop Build

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: cd desktop && npm ci
      - run: cd desktop && npm run typecheck
      - run: cd desktop && npm run lint
      - run: cd desktop && npm run test
      - run: cd desktop && npm run build
```

- [ ] **Step 6: 提交**

```bash
git add desktop/package.json desktop/vite.config.ts desktop/electron-builder.yml .github/workflows/desktop-build.yml
git commit -m "chore(ci): add tests, lint, typecheck, and cross-platform desktop build"
```

---

## 4. 实施计划自检

### 4.1 需求覆盖检查

| 设计文档需求 | 覆盖任务 |
|---|---|
| 启动锁 | Task 6, Task 11 |
| 本地全盘加密 | Task 5 |
| 自动锁屏 | Task 6, Task 14 |
| 隐私模式 | Task 14 |
| 隐藏空间 | Task 7-8（isHidden 字段），Task 14 |
| 截图保护 | 未在 1.0 覆盖，标记为平台受限，后续补充 |
| 日程任务 | Task 7, Task 12 |
| 加密保险库 | Task 8, Task 13 |
| 密码生成器 | Task 4, Task 13 |
| 剪贴板清空 | Task 14 |

### 4.2 占位符检查

- 无 "TBD" / "TODO" 作为实施遗漏
- 所有代码片段可直接使用
- 每个任务末尾有明确提交命令

### 4.3 类型一致性检查

- `Task`、`VaultItem`、`VaultField`、`SecuritySettings` 类型在 `desktop/src/shared/types.ts` 统一定义
- Repository 和 IPC 处理器使用相同类型
- Store 和组件使用相同类型

---

## 5. 执行方式选择

计划已保存到 `docs/superpowers/plans/2026-06-19-taskflow-desktop-privacy-implementation.md`。

团队可以选择以下执行方式：

**方式 1：分角色并行开发（推荐）**
- Electron/桌面工程师负责 Task 1-3
- 安全工程师负责 Task 4-6
- 后端/数据工程师负责 Task 7-8
- 前端工程师负责 Task 9-15
- 测试工程师负责 Task 16
- 每个角色按顺序完成任务，频繁提交

**方式 2：按模块串行开发**
- 先完成基础设施（Task 1-6）
- 再完成后端数据层（Task 7-8）
- 最后完成前端（Task 9-15）和测试（Task 16）
- 适合小团队或全栈开发者

**方式 3：AI 子代理驱动**
- 为每个 Task 启动一个子代理
- 子代理按步骤执行、测试、提交
- 每完成一个 Task 由人工或主代理审查

推荐 **方式 1**：角色边界清晰，可以最大化并行效率，与当前团队分工匹配。
