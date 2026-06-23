import WebSocket from 'ws';
import { SyncSession } from './syncSession';
import { FrameParser, ParsedFrame, encodeFrame, FrameMode } from './syncMessages';

const DEFAULT_RECONNECT_BASE_MS = 1000;
const DEFAULT_RECONNECT_MAX_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 30000;
const HEARTBEAT_TIMEOUT_MS = 60000;

export interface RelayTransportOptions {
  url: string;
  token: string;
  role: 'initiator' | 'responder';
  createSession: () => SyncSession;
  onSession?: (session: SyncSession) => void;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
}

export class RelayTransport {
  private url: string;
  private token: string;
  private role: 'initiator' | 'responder';
  private createSession: () => SyncSession;
  private onSession?: (session: SyncSession) => void;
  private reconnectBaseMs: number;
  private reconnectMaxMs: number;

  private ws: WebSocket | null = null;
  private session: SyncSession | null = null;
  private parser: FrameParser;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private destroyed = false;
  private reconnectDelay: number;

  private onFrame = (frame: ParsedFrame) => {
    this.session?.feedRawFrame(frame.mode, frame.payload);
  };

  private onParserError = (_err: Error) => {
    this.ws?.terminate();
    this.scheduleReconnect();
  };

  private onSendFrame = (mode: FrameMode, payload: Buffer) => {
    this.sendFrame(mode, payload);
  };

  constructor(opts: RelayTransportOptions) {
    this.url = opts.url;
    this.token = opts.token;
    this.role = opts.role;
    this.createSession = opts.createSession;
    this.onSession = opts.onSession;
    this.reconnectBaseMs = opts.reconnectBaseMs ?? DEFAULT_RECONNECT_BASE_MS;
    this.reconnectMaxMs = opts.reconnectMaxMs ?? DEFAULT_RECONNECT_MAX_MS;
    this.reconnectDelay = this.reconnectBaseMs;
    this.parser = new FrameParser();
    this.parser.on('frame', this.onFrame);
    this.parser.on('error', this.onParserError);
    this.connect();
  }

  private connect(): void {
    if (this.destroyed) return;
    try {
      this.ws = new WebSocket(this.url, {
        headers: { Authorization: 'Bearer ' + this.token },
      });
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.on('open', () => this.handleOpen());
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('ping', () => this.ws?.pong());
    this.ws.on('pong', () => this.resetHeartbeatTimeout());
    this.ws.on('error', (error: Error) => {
      console.error('RelayTransport WebSocket error:', error.message);
    });
    this.ws.on('close', () => this.handleClose());
  }

  private handleOpen(): void {
    this.reconnectDelay = this.reconnectBaseMs;
    this.session = this.createSession();
    this.session.on('sendFrame', this.onSendFrame);
    this.session.on('close', () => this.ws?.close());
    this.session.on('error', () => this.ws?.terminate());
    this.onSession?.(this.session);
    this.startHeartbeat();
    if (this.role === 'initiator') {
      this.session.begin();
    }
  }

  private handleMessage(data: WebSocket.RawData): void {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
    this.parser.feed(buf);
  }

  private sendFrame(mode: FrameMode, payload: Buffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(encodeFrame(mode, payload));
    }
  }

  private handleClose(): void {
    this.stopHeartbeat();
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.parser.removeAllListeners();
    this.parser = new FrameParser();
    this.parser.on('frame', this.onFrame);
    this.parser.on('error', this.onParserError);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.destroyed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.reconnectMaxMs);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
        this.resetHeartbeatTimeout();
        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.ws?.terminate();
        }, HEARTBEAT_TIMEOUT_MS);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.resetHeartbeatTimeout();
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.terminate();
      this.ws = null;
    }
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }
}
