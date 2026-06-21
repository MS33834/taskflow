import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import dgram from 'dgram';
import {
  UdpBroadcastDiscoveryService,
  DiscoveredPeer,
} from '../../../main/services/sync/lanDiscovery';

describe('lanDiscovery', () => {
  const accountToken = 'test-account-token';
  let serviceA: UdpBroadcastDiscoveryService;
  let serviceB: UdpBroadcastDiscoveryService;

  beforeEach(() => {
    serviceA = new UdpBroadcastDiscoveryService({
      deviceId: 'device-a',
      deviceName: 'Alice',
      accountToken,
      listenPort: 0,
    });
    serviceB = new UdpBroadcastDiscoveryService({
      deviceId: 'device-b',
      deviceName: 'Bob',
      accountToken,
      listenPort: 0,
    });
  });

  afterEach(() => {
    serviceA.stop();
    serviceB.stop();
  });

  it('discovers a peer with a matching account token', async () => {
    const discovered: DiscoveredPeer[] = [];
    serviceB.on('discovered', (peer) => discovered.push(peer));

    await serviceA.start();
    await serviceB.start();

    const aPort = (serviceA as any).socket.address().port;
    const bPort = (serviceB as any).socket.address().port;
    const aHash = (serviceA as any).accountHash;
    const packet = Buffer.from(
      JSON.stringify({
        type: 'taskflow-lan',
        deviceId: 'device-a',
        name: 'Alice',
        accountHash: aHash,
        port: aPort,
      }),
      'utf8'
    );

    const sender = dgram.createSocket('udp4');
    await new Promise<void>((resolve) =>
      sender.send(packet, bPort, '127.0.0.1', () => resolve())
    );

    await new Promise((resolve) => setTimeout(resolve, 200));
    sender.close();

    expect(discovered).toHaveLength(1);
    expect(discovered[0].deviceId).toBe('device-a');
    expect(discovered[0].name).toBe('Alice');
  });

  it('ignores peers with a different account token', async () => {
    const discovered: DiscoveredPeer[] = [];
    serviceB.on('discovered', (peer) => discovered.push(peer));

    await serviceA.start();
    await serviceB.start();

    const bPort = (serviceB as any).socket.address().port;
    const packet = Buffer.from(
      JSON.stringify({
        type: 'taskflow-lan',
        deviceId: 'device-a',
        name: 'Alice',
        accountHash: 'wrong-hash',
        port: 12345,
      }),
      'utf8'
    );

    const sender = dgram.createSocket('udp4');
    await new Promise<void>((resolve) =>
      sender.send(packet, bPort, '127.0.0.1', () => resolve())
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    sender.close();

    expect(discovered).toHaveLength(0);
  });
});
