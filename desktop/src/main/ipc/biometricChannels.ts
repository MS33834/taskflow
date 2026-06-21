import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { isBiometricAvailable } from '../services/biometricService';
import {
  isBiometricEnabled,
  unlockWithBiometric,
  enableBiometric,
  disableBiometric,
} from '../services/authService';

export function registerBiometricChannels(): void {
  ipcMain.handle(IPC_CHANNELS.BIOMETRIC.AVAILABLE, () => isBiometricAvailable());
  ipcMain.handle(IPC_CHANNELS.BIOMETRIC.ENABLED, () => isBiometricEnabled());
  ipcMain.handle(IPC_CHANNELS.BIOMETRIC.UNLOCK, () => unlockWithBiometric());
  ipcMain.handle(IPC_CHANNELS.BIOMETRIC.ENABLE, (_, password: string) => enableBiometric(password));
  ipcMain.handle(IPC_CHANNELS.BIOMETRIC.DISABLE, () => {
    disableBiometric();
  });
}
