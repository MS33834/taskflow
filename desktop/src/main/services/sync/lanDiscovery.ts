import { EventEmitter } from 'events';
import dgram from 'dgram';
import { createHash } from 'crypto';

export interface DiscoveredPeer {
  deviceId: string;
  name: string;
  host: string;
  port: number;
}

export interface UdpDiscoveryOptions {
  deviceId: string;
  deviceName: string;
  accountToken: string;
  listenPort?: number;
  broadcastPort?: number;
  announceIntervalMs?: number;
}

export class UdpBroadcastDiscoveryService extends EventEmitter {
  private deviceId: string;
  private deviceName: string;
  private accountHash: string;
  private listenPort: number;
  private broadcastPort: number;
  private announceIntervalMs: number;
  private socket: dgram.Socket | null = null;
  private announceTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: UdpDiscoveryOptions) {
    super();
    this.deviceId = opts.deviceId;
    this.deviceName = opts.deviceName;
    this.accountHash = createHash('sha256').update(opts.accountToken).digest('hex').slice(0, 16);
    this.listenPort = opts.listenPort ?? 54535;
    this.broadcastPort = opts.broadcastPort ?? 54535;
    this.announceIntervalMs = opts.announceIntervalMs ?? 3000;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = dgram.createSocket('udp4');
      this.socket.on('error', (err) => this.emit('error', err));
      this.socket.on('message', (msg, rinfo) => this.handleMessage(msg, rinfo));
      this.socket.once('error', reject);
      this.socket.bind(this.listenPort, () => {
        this.socket?.setBroadcast(true);
        this.announce();
        this.announceTimer = setInterval(() => this.announce(), this.announceIntervalMs);
        resolve();
      });
    });
  }

  private announce(): void {
    if (!this.socket) return;
    const packet = Buffer.from(
      JSON.stringify({
        type: 'taskflow-lan',
        deviceId: this.deviceId,
        name: this.deviceName,
        accountHash: this.accountHash,
        port: this.listenPort,
      }),
      'utf8'
    );
    this.socket.send(packet, this.broadcastPort, '255.255.255.255');
  }

  private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    try {
      const payload = JSON.parse(msg.toString('utf8'));
      if (payload.type !== 'taskflow-lan') return;
      if (payload.accountHash !== this.accountHash) return;
      if (payload.deviceId === this.deviceId) return;

      this.emit('discovered', {
        deviceId: payload.deviceId,
        name: payload.name,
        host: rinfo.address,
        port: payload.port ?? rinfo.port,
      } as DiscoveredPeer);
    } catch {
      // ignore malformed packets
    }
  }

  stop(): void {
    if (this.announceTimer) {
      clearInterval(this.announceTimer);
      this.announceTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
