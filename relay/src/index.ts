#!/usr/bin/env node
import { createRelayServer } from './server';

const port = parseInt(process.env.PORT ?? '8787', 10);
const publicWsUrl = process.env.PUBLIC_WS_URL;
const host = process.env.HOST;

const relay = createRelayServer({ port, publicWsUrl, host });

relay.start().then(() => {
  console.log(`TaskFlow relay listening on ${host ?? '0.0.0.0'}:${port}`);
  console.log(`WebSocket path: ${publicWsUrl ?? `ws://${host ?? '0.0.0.0'}:${port}/sync`}`);
});

function shutdown() {
  relay.stop().then(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
