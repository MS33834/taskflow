/**
 * 安全存储封装。
 *
 * 强制使用 expo-secure-store（iOS Keychain / Android Keystore）保存敏感 token。
 * 若 secure store 不可用则直接抛出错误，避免回退到未加密的 AsyncStorage，
 * 以符合 OWASP 对移动端敏感数据的存储建议。
 */

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

const TOKEN_KEY = 'taskflow_secure_token';
const USER_KEY = 'taskflow_secure_user';

let secureStore: SecureStoreModule | null = null;
let secureStoreTried = false;

async function getSecureStore(): Promise<SecureStoreModule> {
  if (secureStoreTried) {
    if (!secureStore) {
      throw new Error(
        '安全存储不可用：请确保已安装并配置 expo-secure-store，敏感数据禁止回退到未加密存储。'
      );
    }
    return secureStore;
  }
  secureStoreTried = true;

  try {
    // 动态导入，避免在未安装 expo-secure-store 时编译/打包失败
    const mod = (await import('expo-secure-store')) as SecureStoreModule;
    if (mod && typeof mod.getItemAsync === 'function') {
      secureStore = mod;
      return secureStore;
    }
  } catch {
    // fall through to error
  }

  throw new Error(
    '安全存储不可用：请确保已安装并配置 expo-secure-store，敏感数据禁止回退到未加密存储。'
  );
}

async function getItem(key: string): Promise<string | null> {
  const store = await getSecureStore();
  return store.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  const store = await getSecureStore();
  return store.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  const store = await getSecureStore();
  return store.deleteItemAsync(key);
}

export interface StoredAuth {
  user: unknown;
  token: string;
}

export async function getStoredAuth(): Promise<StoredAuth | null> {
  const token = await getItem(TOKEN_KEY);
  if (!token) return null;

  const userData = await getItem(USER_KEY);
  if (!userData) return null;

  try {
    return { user: JSON.parse(userData), token };
  } catch {
    return null;
  }
}

export async function setStoredAuth(user: unknown, token: string): Promise<void> {
  await Promise.all([
    setItem(USER_KEY, JSON.stringify(user)),
    setItem(TOKEN_KEY, token),
  ]);
}

export async function clearStoredAuth(): Promise<void> {
  await Promise.all([removeItem(USER_KEY), removeItem(TOKEN_KEY)]);
}
