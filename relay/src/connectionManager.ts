import { WebSocket } from 'ws';
import { RelayStore } from './store';

export class ConnectionManager {
  private connections = new Map<string, WebSocket>();

  constructor(private store: RelayStore) {}

  add(ws: WebSocket, deviceId: string, targetDeviceId: string): void {
    const key = `${deviceId}:${targetDeviceId}`;
    const existing = this.connections.get(key);
    if (existing && existing !== ws) {
      try {
        existing.close(1000, 'superseded');
      } catch {}
    }
    this.connections.set(key, ws);
    const queued = this.store.dequeueFrames(deviceId, targetDeviceId);
    for (const frame of queued) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(frame.payload);
      }
    }
  }

  remove(ws: WebSocket): void {
    for (const [key, value] of this.connections) {
      if (value === ws) {
        this.connections.delete(key);
        break;
      }
    }
  }

  forward(senderDeviceId: string, targetDeviceId: string, payload: Buffer): void {
    const key = `${targetDeviceId}:${senderDeviceId}`;
    const ws = this.connections.get(key);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      return;
    }
    this.store.enqueueFrame(targetDeviceId, senderDeviceId, payload);
  }
}
