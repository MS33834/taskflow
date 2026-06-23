import http from 'http';
import express, { Express, Request, Response, NextFunction } from 'express';
import { WebSocketServer } from 'ws';
import { RelayStore } from './store';
import { createRoutes } from './routes';
import { ConnectionManager } from './connectionManager';
import { attachWsRelay } from './wsRelay';

export interface RelayServerOptions {
  port: number;
  host?: string;
  publicWsUrl?: string;
}

export interface RelayServer {
  app: Express;
  server: http.Server;
  store: RelayStore;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createRelayServer(opts: RelayServerOptions): RelayServer {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/sync' });
  const store = new RelayStore();
  const connections = new ConnectionManager(store);
  const publicWsUrl = opts.publicWsUrl ?? `ws://localhost:${opts.port}/sync`;
  const host = opts.host ?? '0.0.0.0';

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use(createRoutes(store, publicWsUrl));

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[relay] unhandled error', err);
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
  });

  attachWsRelay(wss, store, connections);

  const cleanupInterval = setInterval(() => store.cleanup(), 60_000);

  const start = (): Promise<void> =>
    new Promise((resolve) => {
      server.listen(opts.port, host, () => {
        console.log(`TaskFlow relay listening on ${host}:${opts.port}`);
        console.log(`WebSocket path: ${publicWsUrl}`);
        resolve();
      });
    });

  const stop = (): Promise<void> =>
    new Promise((resolve) => {
      clearInterval(cleanupInterval);
      wss.clients.forEach((ws) => ws.terminate());
      wss.close(() => {
        server.close(() => resolve());
      });
    });

  return { app, server, store, start, stop };
}
