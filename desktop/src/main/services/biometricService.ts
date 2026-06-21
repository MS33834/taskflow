import { systemPreferences } from 'electron';

/**
 * Minimal type shape of the NodeRT wrapper for
 * Windows.Security.Credentials.UI (Windows Hello).
 *
 * The module is loaded dynamically so that builds on macOS/Linux do not
 * depend on the native Windows binary being present.
 */
type WindowsBiometricModule = {
  UserConsentVerifier: {
    checkAvailabilityAsync: (
      callback: (err: Error | null, result: number) => void
    ) => void;
    requestVerificationAsync: (
      message: string,
      callback: (err: Error | null, result: number) => void
    ) => void;
  };
  UserConsentVerifierAvailability: { available: number; [key: string]: number };
  UserConsentVerificationResult: { verified: number; [key: string]: number };
};

async function loadWindowsBiometricModule(): Promise<WindowsBiometricModule | null> {
  if (process.platform !== 'win32') return null;

  try {
    const module = await import('@nodert-win10-rs4/windows.security.credentials.ui');
    return module as unknown as WindowsBiometricModule;
  } catch {
    // Module not installed or failed to load on this Windows machine.
    return null;
  }
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (process.platform === 'darwin') {
    return (
      typeof systemPreferences.canPromptTouchID === 'function' &&
      systemPreferences.canPromptTouchID()
    );
  }

  if (process.platform === 'win32') {
    const module = await loadWindowsBiometricModule();
    if (!module) return false;

    const { UserConsentVerifier, UserConsentVerifierAvailability } = module;

    return new Promise((resolve) => {
      try {
        UserConsentVerifier.checkAvailabilityAsync((err, result) => {
          if (err) return resolve(false);
          resolve(result === UserConsentVerifierAvailability.available);
        });
      } catch {
        resolve(false);
      }
    });
  }

  // Linux and other platforms are not supported yet.
  return false;
}

export async function promptBiometric(reason: string): Promise<boolean> {
  if (process.platform === 'darwin') {
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

  if (process.platform === 'win32') {
    const module = await loadWindowsBiometricModule();
    if (!module) return false;

    const { UserConsentVerifier, UserConsentVerificationResult } = module;

    return new Promise((resolve) => {
      try {
        UserConsentVerifier.requestVerificationAsync(reason, (err, result) => {
          if (err) return resolve(false);
          resolve(result === UserConsentVerificationResult.verified);
        });
      } catch {
        resolve(false);
      }
    });
  }

  return false;
}
