import { systemPreferences } from 'electron';

type WindowsBiometricModule = typeof import('@nodert-win10-rs4/windows.security.credentials.ui');

function isWindowsBiometricModule(value: unknown): value is WindowsBiometricModule {
  if (value === null || typeof value !== 'object') return false;
  const module = value as Record<string, unknown>;
  const verifier = module.UserConsentVerifier;
  if (verifier === null || typeof verifier !== 'object') return false;
  const { checkAvailabilityAsync, requestVerificationAsync } = verifier as Record<string, unknown>;
  return typeof checkAvailabilityAsync === 'function' && typeof requestVerificationAsync === 'function';
}

async function loadWindowsBiometricModule(): Promise<WindowsBiometricModule | null> {
  if (process.platform !== 'win32') return null;

  try {
    const module = await import('@nodert-win10-rs4/windows.security.credentials.ui');
    if (!isWindowsBiometricModule(module)) return null;
    return module;
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
