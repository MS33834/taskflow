export function buildAuthMessage(
  deviceId: string,
  timestamp: number,
  purpose: string
): Buffer {
  return Buffer.from(`${deviceId}:${timestamp}:${purpose}`, 'utf8');
}
