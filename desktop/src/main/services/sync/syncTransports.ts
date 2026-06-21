import net from 'net';
import WebSocket from 'ws';
import { SyncSession } from './syncSession';
import { FrameParser, encodeFrame, FrameMode, ParsedFrame } from './syncMessages';

const CONNECTION_TIMEOUT_MS = 10_000;

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
  private onFrame = (frame: ParsedFrame) => this.session.feedRawFrame(frame.mode, frame.payload);
  private onData = (chunk: Buffer) => this.parser.feed(chunk);
  private onSocketClose = () => this.session.close();
  private onSocketError = (err: Error) => {
    this.session.emit('error', err);
    this.socket?.destroy();
  };
  private onSocketTimeout = () => {
    const err = new Error('TCP connection timed out');
    this.session.emit('error', err);
    this.socket?.destroy();
  };
  private onSendFrame = (mode: FrameMode, payload: Buffer) => this.writeFrame(mode, payload);

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
    this.parser.on('frame', this.onFrame);
    this.socket.on('data', this.onData);
    this.socket.on('close', this.onSocketClose);
    this.socket.on('error', this.onSocketError);
    this.socket.on('timeout', this.onSocketTimeout);
    this.socket.setTimeout(CONNECTION_TIMEOUT_MS);
    this.session.on('sendFrame', this.onSendFrame);
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
    this.parser.off('frame', this.onFrame);
    this.session.off('sendFrame', this.onSendFrame);
    if (this.socket) {
      this.socket.off('data', this.onData);
      this.socket.off('close', this.onSocketClose);
      this.socket.off('error', this.onSocketError);
      this.socket.off('timeout', this.onSocketTimeout);
      this.socket.destroy();
      this.socket = null;
    }
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
  private connectTimer: NodeJS.Timeout | null = null;
  private onFrame = (frame: ParsedFrame) => this.session.feedRawFrame(frame.mode, frame.payload);
  private onMessage = (data: WebSocket.RawData) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
    this.parser.feed(buf);
  };
  private onWsClose = () => this.session.close();
  private onWsError = (err: Error) => {
    this.session.emit('error', err);
    this.ws?.terminate();
  };
  private onSendFrame = (mode: FrameMode, payload: Buffer) => this.sendFrame(mode, payload);

  constructor(opts: WsSyncTransportOptions) {
    this.session = opts.session;
    this.role = opts.role;

    if (opts.ws) {
      this.ws = opts.ws;
      this.attach();
    } else if (opts.url) {
      this.ws = new WebSocket(opts.url);
      this.connectTimer = setTimeout(() => {
        const err = new Error('WebSocket connection timed out');
        this.session.emit('error', err);
        this.ws?.terminate();
      }, CONNECTION_TIMEOUT_MS);
      this.ws.on('open', () => {
        if (this.connectTimer) {
          clearTimeout(this.connectTimer);
          this.connectTimer = null;
        }
        this.onOpen();
      });
      this.attach();
    } else {
      throw new Error('WsSyncTransport requires a ws instance or url');
    }
  }

  private attach(): void {
    if (!this.ws) return;
    this.ws.on('message', this.onMessage);
    this.parser.on('frame', this.onFrame);
    this.ws.on('close', this.onWsClose);
    this.ws.on('error', this.onWsError);
    this.session.on('sendFrame', this.onSendFrame);
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
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    this.parser.off('frame', this.onFrame);
    this.session.off('sendFrame', this.onSendFrame);
    if (this.ws) {
      this.ws.off('message', this.onMessage);
      this.ws.off('close', this.onWsClose);
      this.ws.off('error', this.onWsError);
      this.ws.terminate();
      this.ws = null;
    }
  }
}
