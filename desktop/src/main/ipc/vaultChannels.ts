import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import { listVaultItems, createVaultItem, updateVaultItem, deleteVaultItem } from '../repositories/vaultRepository';
import { generatePassword } from '../services/cryptoService';

export function registerVaultChannels(): void {
  ipcMain.handle(IPC_CHANNELS.VAULT.LIST, async () => listVaultItems());
  ipcMain.handle(IPC_CHANNELS.VAULT.CREATE, async (_, item) => createVaultItem(item));
  ipcMain.handle(IPC_CHANNELS.VAULT.UPDATE, async (_, id, updates) => updateVaultItem(id, updates));
  ipcMain.handle(IPC_CHANNELS.VAULT.DELETE, async (_, id) => deleteVaultItem(id));
  ipcMain.handle(IPC_CHANNELS.VAULT.GENERATE_PASSWORD, async (_, length) => {
    // 限制密码长度在合理范围，防止渲染进程传入极大值导致主进程内存/CPU 拒绝服务
    const safeLength = Math.max(8, Math.min(128, Math.floor(Number(length) || 16)));
    return generatePassword(safeLength);
  });
}
