import net from 'net';
import WebSocket from 'ws';
import { SyncSession } from './syncSession';
import { FrameParser, encodeFrame, FrameMode } from './syncMessages';

interface TcpSyncTransportOptions {
  session: SyncSession;
  role: 'initiator' | 'responder';
  host?: string;
  port?: number;
  socket?: net.Socket;
}

export class TcpSyncTransport {
  private session: SyncSession;
  private role: 'initiator' | 'responder';
  private socket: net.Socket | null = null;
  private parser = new FrameParser();

  constructor(opts: TcpSyncTransportOptions) {
    this.session = opts.session;
    this.role = opts.role;

    if (opts.socket) {
      this.socket = opts.socket;
      this.attach();
    } else if (opts.host !== undefined && opts.port !== undefined) {
      this.socket = net.createConnection({ host: opts.host, port: opts.port }, () =>
        this.onConnected()
      );
      this.attach();
    } else {
      throw new Error('TcpSyncTransport requires a socket or host+port');
    }
  }

  private attach(): void {
    if (!this.socket) return;
    this.parser.on('frame', (frame) => this.session.feedRawFrame(frame.mode, frame.payload));
    this.socket.on('data', (chunk) => this.parser.feed(chunk));
    this.socket.on('close', () => this.session.close());
    this.socket.on('error', (err) => this.session.emit('error', err));
    this.session.on('sendFrame', (mode, payload) => this.writeFrame(mode, payload));
  }

  private onConnected(): void {
    if (this.role === 'initiator') {
      this.session.begin();
    }
  }

  private writeFrame(mode: FrameMode, payload: Buffer): void {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(encodeFrame(mode, payload));
    }
  }

  destroy(): void {
    this.socket?.destroy();
  }
}

interface WsSyncTransportOptions {
  session: SyncSession;
  role: 'initiator' | 'responder';
  url?: string;
  ws?: WebSocket;
}

export class WsSyncTransport {
  private session: SyncSession;
  private role: 'initiator' | 'responder';
  private ws: WebSocket | null = null;
  private parser = new FrameParser();

  constructor(opts: WsSyncTransportOptions) {
    this.session = opts.session;
    this.role = opts.role;

    if (opts.ws) {
      this.ws = opts.ws;
      this.attach();
    } else if (opts.url) {
      this.ws = new WebSocket(opts.url);
      this.ws.on('open', () => this.onOpen());
      this.attach();
    } else {
      throw new Error('WsSyncTransport requires a ws instance or url');
    }
  }

  private attach(): void {
    if (!this.ws) return;
    this.ws.on('message', (data) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      this.parser.feed(buf);
    });
    this.parser.on('frame', (frame) => this.session.feedRawFrame(frame.mode, frame.payload));
    this.ws.on('close', () => this.session.close());
    this.ws.on('error', (err) => this.session.emit('error', err));
    this.session.on('sendFrame', (mode, payload) => this.sendFrame(mode, payload));
  }

  private onOpen(): void {
    if (this.role === 'initiator') {
      this.session.begin();
    }
  }

  private sendFrame(mode: FrameMode, payload: Buffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(encodeFrame(mode, payload));
    }
  }

  destroy(): void {
    this.ws?.terminate();
  }
}
