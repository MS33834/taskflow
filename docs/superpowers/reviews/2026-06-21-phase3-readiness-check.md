# TaskFlow 2.0 Sync Phase 3 Readiness Check

**评审日期**：2026-06-21  
**仓库**：`/workspace/taskflow-github`（main @ 01e490b）  
**范围**：Phase 1 核心同步库 + Phase 2 局域网同步实现  
**目的**：确认上一轮 P0/P1 阻塞项已修复，并判断 Phase 1/2 是否可进入 Phase 3（自托管中继服务器）。

---

## 1. 总体结论

**READY_WITH_NOTES**

上一轮评审中影响安全的 P0/P1 阻塞项已基本修复；`typecheck`、`lint`、`test`、`build` 全部通过；同步相关单元/集成测试共 **104 项全部通过**。Phase 1/2 的核心逻辑（密钥体系、帧协议、握手、同步引擎、存储）已具备作为 Phase 3 中继服务器基础的条件。

但仍有一些低优先级缺口需在 Phase 3 设计/实现中补齐（见第 3、4 节）。

---

## 2. 已修复阻塞项验证

| 原发现 | 优先级 | 修复位置 | 验证结果 |
|---|---|---|---|
| **SF-CRIT-01**：`safeStorage` 不可用时 SMK / 设备私钥明文回退写入 | P0 | `desktop/src/main/services/sync/syncCrypto.ts:37-39`、`syncIdentity.ts:37-39` | 已改为 **fail-closed**：`isEncryptionAvailable() === false` 时直接抛错，拒绝写入明文；加载时若发现 `encrypted: false` 也抛错。写入文件均带 `{ mode: 0o600 }`。 |
| **SF-HIGH-01**：`FrameParser` 未限制帧长度 | P0 | `desktop/src/main/services/sync/syncMessages.ts:244-266` | 已定义 `MAX_FRAME_SIZE = 8 MiB`，`FrameParser` 在 `length > MAX_FRAME_SIZE` 时 emit `error` 并清空缓冲区。 |
| **SF-MED-02**：消息反序列化缺乏字段级校验 | P1 | `desktop/src/main/services/sync/syncMessages.ts:83-218` | 已为每种消息类型增加类型守卫（`isHelloMessage`、`isBatchMessage` 等），`deserializeMessage` 拒绝缺失字段或类型错误的消息。 |
| **SF-HIGH-02**：设备公钥可被任意覆盖 / 缺少移除接口 | P0 | `desktop/src/main/services/sync/syncStorage.ts:132-183` | 已拆分三个接口：`registerSyncDevice`（用于首次配对/重新配对）、`updateSyncDeviceLastSeen`（只更新 `last_seen_at`）、`removeSyncDevice`。测试验证 `updateSyncDeviceLastSeen` 不会改变 `publicKey`；重新配对时 `registerSyncDevice` 可更新公钥。 |
| **SF-HIGH-03**：冲突平局时静默丢弃对端记录 | P1 | `desktop/src/main/services/sync/conflictResolver.ts:9-14`、`syncEngine.ts:212-222` | `resolveConflict` 不再返回 `'conflict'`，改为在 `updatedAt` 与 `version` 均相等时按 `id` 字典序做确定性 tie-breaker；`SyncEngine` 因此不再出现静默丢弃。 |
| **SF-MED-03**：`OFFER/ANSWER` 字段名 `encryptedPayload` 与实际不符 | P1 | `desktop/src/main/services/sync/syncMessages.ts:10-18`、`syncSession.ts:177-207` | 字段已重命名为 `signedPayload`，与当前“签名但非加密”的实现一致。 |
| **SF-MED-07**：`BATCH` / `REQUEST` 未限制数量 | P2 | `desktop/src/main/services/sync/syncEngine.ts:54-55`、`156-163`、`178-187` | 已定义 `MAX_RECORDS_PER_BATCH = 500`、`MAX_REQUEST_IDS = 500`，超限时 responder 返回 `ERROR: REQUEST_TOO_LARGE`，接收方 emit error。 |
| **SF-MED-01**：密钥文件默认权限过宽 | P1 | `syncCrypto.ts:45`、`syncIdentity.ts:48` | 保存 SMK 与设备身份文件时均使用 `{ mode: 0o600 }`。 |
| **SF-LOW-03 / SF-LOW-04**：传输层错误未关闭连接 / 缺少超时 | P2 | `desktop/src/main/services/sync/syncTransports.ts:6-177` | `TcpSyncTransport` 与 `WsSyncTransport` 的 `destroy()` 均移除所有监听器并销毁/终止套接字；TCP 设置 `socket.setTimeout(10s)`；WS 在连接阶段设置 10s 超时定时器。 |

### 工具链结果

在 `/workspace/taskflow-github/desktop` 执行：

```bash
npm run typecheck   # 通过
npm run lint        # 通过
npm run test        # 16 files, 104 tests passed
npm run build       # 通过（仅渲染构建有 expo tsconfig base 缺失警告，不影响产物）
```

同步相关测试全部通过：

- `syncCrypto.test.ts`：19 passed
- `syncIdentity.test.ts`：15 passed
- `syncMessages.test.ts`：9 passed
- `conflictResolver.test.ts`：5 passed
- `syncEngine.test.ts`：5 passed
- `syncSession.test.ts`：2 passed
- `syncTransports.test.ts`：2 passed
- `syncStorage.test.ts`：15 passed
- `lanDiscovery.test.ts`：2 passed
- `lanSync.integration.test.ts`：1 passed

---

## 3. 不阻塞 Phase 3 的低优先级剩余项

以下问题在 Phase 3 设计/开发中应持续关注，但不影响当前 readiness：

1. **握手无超时与状态清理**
   - `SyncSession.begin()` 后若对端无响应，状态机会一直停留在 `hello_sent` / `offered`；`close()` 未清空 `ecdhKeyPair`、`sendKey`、`receiveKey` 等敏感 Buffer。
2. **缺少重放保护**
   - 传输帧仍无单调递增序列号或滑动窗口，同一会话内可重放旧帧。
3. **运行时设备撤销未贯通**
   - 已有 `removeSyncDevice`，但 `SyncSession` 的 `getTrustedPublicKey` 在创建后固定；移除设备后不会立即断开已有会话。
4. **事件监听器清理未完全覆盖异常路径**
   - `SyncEngine` 在 `close`/`complete` 后未主动 `session.off(...)`；部分单元测试仍依赖固定 `setTimeout` 等待事件（存在 flaky 风险）。
5. **LAN 发现实现与规格偏差**
   - 规格要求 mDNS，当前仍为 UDP 广播；不影响 Phase 3 中继场景，但需在规格中明确或后续替换。
6. **文档/规格缺口**
   - Phase 2 实施计划文件仍缺失。
   - 设计规格未更新：会话密钥派生细节、`deriveSessionKeys` 的 role-based info 字符串、帧格式、`MANIFEST.hash` 计算方式等。

---

## 4. Phase 3 设计建议

1. **配对码流程**
   - 新增 `PairingSession`（可组合现有 `SyncSession` / `generateEcdhKeyPair`）：旧设备生成 8 位配对码（5 分钟 TTL、一次性、防暴力枚举），新设备输入后双方完成 ECDH 握手，旧设备用临时会话密钥加密 SMK 传输给新设备。
   - 配对成功后调用 `registerSyncDevice` 将新设备公钥写入 `sync_devices`。

2. **信任源与中继路由的打通**
   - 生产环境应实现 `getTrustedPublicKey(deviceId) => getSyncDevice(deviceId)?.publicKey`，并提供刷新/撤销回调。
   - 中继服务器 WebSocket 入口按 `deviceId` 路由，只透传 length-prefixed 原始帧，不解析 payload、不持有 SMK。

3. **传输层复用策略**
   - `WsSyncTransport` 当前为单次连接；Phase 3 应在其上封装 `RelaySyncTransport`（或 `RelayClient`），提供：自动重连、指数退避、心跳、连接超时、证书策略（默认不信任自签名证书，可配置开启）。
   - 复用 `SyncSession` + `SyncEngine`：对引擎而言，中继连接与直连无区别。

4. **离线队列与 store-and-forward**
   - `SyncEngine` 假设对端实时在线；中继服务器需要 7 天 TTL 的离线消息队列。Phase 3 需要新增“消息入队/出队”抽象，或在引擎中增加对异步 `BATCH`/`ACK` 的处理。

5. **资源与安全硬化**
   - 中继端同样必须强制校验 `MAX_FRAME_SIZE`，防止单客户端 OOM。
   - 为传输帧增加序列号/滑动窗口，解决重放问题。
   - 设备移除时即时通知对端/中继，断开相关会话并清理密钥。

---

## 5. 结论

Phase 1/2 同步实现已修复上一轮安全与架构阻塞项，代码、类型、lint、测试、构建均处于健康状态，**可作为 Phase 3 自托管中继服务器的基础**。建议在 Phase 3 启动前细化配对码/中继协议规格，并在实现中优先处理信任源刷新、重连退避、离线队列与重放保护。
