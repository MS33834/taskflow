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
