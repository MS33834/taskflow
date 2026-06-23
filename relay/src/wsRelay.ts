import { WebSocketServer, WebSocket, RawData } from 'ws';
import { RelayStore, MAX_FRAME_SIZE } from './store';
import { ConnectionManager } from './connectionManager';

const PING_INTERVAL_MS = 30_000;

export function attachWsRelay(
  wss: WebSocketServer,
  store: RelayStore,
  connections: ConnectionManager
): void {
  const alive = new WeakMap<WebSocket, boolean>();

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const targetDeviceId = url.searchParams.get('target');
    const pairingCode = url.searchParams.get('pairingCode');

    if (
      (targetDeviceId !== null &&
        (targetDeviceId.length === 0 || targetDeviceId.length > 128)) ||
      (pairingCode !== null &&
        (pairingCode.length === 0 || pairingCode.length > 32))
    ) {
      console.log(`[relay] WebSocket auth failed: invalid target or pairingCode query parameter`);
      ws.close(4001, 'invalid target or pairingCode');
      return;
    }

    const authHeader = req.headers['authorization'];
    const authMatch = typeof authHeader === 'string' ? /^Bearer\s+(.+)$/i.exec(authHeader) : null;

    if (!authMatch) {
      console.log(`[relay] WebSocket auth failed: missing Authorization header`);
      ws.close(4001, 'missing authorization');
      return;
    }

    if (!targetDeviceId && !pairingCode) {
      console.log(`[relay] WebSocket auth failed: missing target or pairingCode query parameter`);
      ws.close(4001, 'missing target or pairingCode');
      return;
    }

    const token = authMatch[1];
    const deviceId = store.validateToken(token);
    if (!deviceId) {
      console.log(`[relay] WebSocket auth failed: invalid token for target ${targetDeviceId ?? ''}`);
      ws.close(4001, 'invalid token');
      return;
    }

    alive.set(ws, true);
    connections.add(ws, deviceId, targetDeviceId ?? '', pairingCode ?? undefined);

    ws.on('ping', () => {
      ws.pong();
    });

    ws.on('pong', () => {
      alive.set(ws, true);
    });

    ws.on('message', (data: RawData) => {
      const buffer = Buffer.isBuffer(data)
        ? data
        : Array.isArray(data)
          ? Buffer.concat(data)
          : Buffer.from(data);
      if (buffer.length > MAX_FRAME_SIZE) {
        ws.close(1009, 'frame too large');
        return;
      }
      connections.forward(deviceId, targetDeviceId ?? '', buffer, pairingCode ?? undefined);
    });

    ws.on('close', () => {
      connections.remove(ws);
    });

    ws.on('error', () => {
      connections.remove(ws);
      try {
        ws.terminate();
      } catch {
        /* ignore terminate errors on already-closed sockets */
      }
    });
  });

  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      if (alive.get(ws) === false) {
        ws.terminate();
        continue;
      }
      alive.set(ws, false);
      ws.ping();
    }
  }, PING_INTERVAL_MS);

  wss.on('close', () => clearInterval(interval));
}
