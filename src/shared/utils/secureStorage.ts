import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 安全存储封装。
 *
 * 优先使用 expo-secure-store（iOS Keychain / Android Keystore）保存敏感 token；
 * 在未安装/不支持 secure store 的环境（如旧版本 Expo 或 Web）回退到 AsyncStorage。
 *
 * 注意：当前实现为渐进式升级保留 AsyncStorage 回退。生产环境应在构建配置中
 * 引入 expo-secure-store 并移除回退，以符合 OWASP 对移动端敏感数据的存储建议。
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

async function getSecureStore(): Promise<SecureStoreModule | null> {
  if (secureStoreTried) {
    return secureStore;
  }
  secureStoreTried = true;

  try {
    // 动态导入，避免在未安装 expo-secure-store 时编译/打包失败
    const mod = (await import('expo-secure-store')) as SecureStoreModule;
    if (mod && typeof mod.getItemAsync === 'function') {
      secureStore = mod;
    }
  } catch {
    // expo-secure-store 未安装或不可用，保持 secureStore 为 null，使用 AsyncStorage 回退
  }

  return secureStore;
}

async function getItem(key: string): Promise<string | null> {
  const store = await getSecureStore();
  if (store) {
    return store.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  const store = await getSecureStore();
  if (store) {
    return store.setItemAsync(key, value);
  }
  return AsyncStorage.setItem(key, value);
}

async function removeItem(key: string): Promise<void> {
  const store = await getSecureStore();
  if (store) {
    return store.deleteItemAsync(key);
  }
  return AsyncStorage.removeItem(key);
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
