import { systemPreferences } from 'electron';

export function isBiometricAvailable(): boolean {
  if (process.platform === 'darwin') {
    return (
      typeof systemPreferences.canPromptTouchID === 'function' &&
      systemPreferences.canPromptTouchID()
    );
  }

  // Windows Hello 与 Linux 指纹/面部识别暂不支持，后续可扩展。
  return false;
}

export async function promptBiometric(reason: string): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return false;
  }

  if (
    typeof systemPreferences.canPromptTouchID !== 'function' ||
    !systemPreferences.canPromptTouchID()
  ) {
    return false;
  }

  try {
    await systemPreferences.promptTouchID(reason);
    return true;
  } catch {
    return false;
  }
}
