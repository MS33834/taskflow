# TaskFlow 2.0 Sync Phase 1 / Phase 2 一致性评审报告

> 评审日期：2026-06-21  
> 仓库：`/workspace/taskflow-github`（main @ 300b2d8）  
> 范围：`desktop/src/main/services/sync/*.ts`、对应单元/集成测试、`desktop/package.json`、主/渲染 tsconfig  
> 评审目的：评估 Phase 1/2 同步实现质量、接口一致性、测试覆盖与 Phase 3 中继服务器接入 readiness。

---

## 1. 总体一致性结论

**核心同步逻辑：基本 PASS，设计实现与架构文档一致。**

Phase 1（核心库）与 Phase 2（局域网同步）在模块划分、密钥体系、消息协议、存储模型上保持了较高的一致性：

- `syncCrypto` / `syncIdentity` / `syncStorage` / `conflictResolver` 四大核心模块职责清晰，接口与类型定义明确。
- `SyncSession` 完整实现了 X25519 ECDH 握手 + Ed25519 签名绑定，派生会话密钥后启用 AES-256-GCM 传输加密。
- `SyncEngine` 实现了 MANIFEST → REQUEST → BATCH → ACK 的同步协议闭环。
- `UdpBroadcastDiscoveryService` 与 `TcpSyncTransport` / `WsSyncTransport` 覆盖局域网发现与两种传输层。

** BUT：当前仓库无法通过 CI 级别的 typecheck / lint / test，属于进入 Phase 3 前的硬性阻塞。** 具体见第 5 节。

---

## 2. 接口 / API 不一致或命名问题

| 问题 | 位置 | 说明 / 风险 |
|------|------|-------------|
| `FrameMode` 依赖类型断言 | `syncSession.ts`、`syncMessages.ts` | `this.emit('sendFrame', 0 as FrameMode, ...)` 与 `parser.feed` 中的 `as FrameMode` 说明 EventEmitter 事件类型未强约束，容易传错字面量。 |
| `SyncStore.listDevices` 定义但未使用 | `syncEngine.ts` | `SyncStore` 接口包含 `listDevices()`，但 `SyncEngine` 与测试内存 store 均未调用，属于冗余接口。 |
| `SyncEngine` 接收 `smk` 但完全未使用 | `syncEngine.ts:57` | `smk` 作为构造参数保存，但引擎只搬运已加密的 `encryptedPayload`。虽然符合「SMK 仅用于本地记录加解密」的设计，但字段悬空，容易误导调用方。 |
| `SyncRecordManifestItem` 与 `ManifestRecordItem` 字段不一致 | `syncStorage.ts` vs `syncMessages.ts` | 存储层 manifest item 含 `recordId`、`version`；网络层 `ManifestRecordItem` 只含 `id/updatedAt/hash`。`syncEngine.sendManifest` 的 map 正确丢弃了多余字段，但两个相似命名容易混淆。 |
| 计划文档与实现存在偏差 | `docs/superpowers/plans/...phase1-core-library.md` | 计划里 `EcdhKeyPair` 使用 `privateKey/publicKey: Buffer`，实现改为 PEM 字符串（`privateKeyPem/publicKeyPem`），且使用 `generateKeyPairSync('x25519')` 替代 `createECDH`。实现更规范，但计划文档未同步更新。 |
| 事件接口未类型化 | 所有 `EventEmitter` 子类 | `SyncSession`、`SyncEngine`、`FrameParser`、`UdpBroadcastDiscoveryService` 均继承裸 `EventEmitter`，调用方无法获得 `on('ready', ...)`、`on('message', ...)` 的类型提示与编译检查。 |

---

## 3. 错误处理、async/await、资源清理缺口

### 3.1 握手与会话层

- **无握手超时**：`SyncSession.begin()` 后若对端无响应，状态会永久停留在 `hello_sent` / `offered`，不会自动关闭或报错。
- **错误后状态未重置**：`feedRawFrame` 捕获异常并 emit `'error'`，但状态机仍停留在出错前的中间状态，后续帧可能导致重复/错误处理。
- **敏感数据未清理**：`SyncSession.close()` 仅设置 `state = 'closed'` 并 emit，未清空 `ecdhKeyPair`、`sendKey`、`receiveKey` 等 Buffer。
- **缺少反重放**：握手签名虽然绑定了 deviceId/nonce，但 nonce 没有过期检查，且未记录「已见过的 nonce」，存在理论重放风险。
- **OFFER/ANSWER payload 结构未校验**：`verifyAndExtractEcdhKey` 直接 `JSON.parse` base64 内容，仅检查两个字段存在性，未校验类型。

### 3.2 传输层

- **监听器未移除**：`TcpSyncTransport.destroy()` / `WsSyncTransport.destroy()` 只销毁 socket/ws，未 `socket.removeListener` / `ws.removeListener`，也未 `session.off('sendFrame', ...)`。高频创建/销毁会导致内存泄漏。
- **无连接超时**：`net.createConnection` 与 `new WebSocket(url)` 均未设置连接超时或 `readyState` 检查，网络异常时测试/生产环境可能挂起。
- **无重连/退避**：Phase 3 中继服务器必须处理 WebSocket 断线重连，当前 `WsSyncTransport` 一次性连接，没有重连抽象。
- **WebSocket message 类型处理不完整**：`ws.on('message')` 只处理 `Buffer` 与 `ArrayBuffer`，未覆盖 `Buffer[]` 情况。
- **UDP 发现错误处理粗放**：`UdpBroadcastDiscoveryService.announce()` 的 `socket.send` 没有回调，错误被静默丢弃；`stop()` 直接 `socket.close()` 不等待 close 事件。

### 3.3 帧解析与消息解析

- **FrameParser 无最大缓冲区限制**：恶意或异常对端可持续发送不完整帧，使 `buffer` 无限增长，造成内存耗尽。
- **deserializeMessage 结构校验太弱**：`isSyncMessage` 仅校验 `type` 字段是否在白名单，未校验各消息类型的必填字段类型（例如 `MANIFEST.records` 是否为数组、`REQUEST.recordIds` 是否为字符串数组）。

### 3.4 同步引擎与存储

- **`conflict` 结果未处理**：`SyncEngine.handleBatch` 中 `resolveConflict` 返回 `'conflict'` 时，代码按 `apply = false` 处理，未记录冲突、未升级版本、未通知调用方，导致同 timestamp + version 但内容不同的记录永久分歧。
- **`insertSyncRecord` 对 `conflict` 同样未处理**：返回 `'conflict'` 但不写入，也不记录待解决冲突。
- **无事务批量写入**：`handleBatch` 逐条 `insertRecord`，单条失败后前序记录已写入，可能导致两边状态不一致。
- **`SyncEngine` 未清理监听器**：关闭/完成后仍监听 `session` 事件，存在泄漏风险。

---

## 4. 测试覆盖缺口与 flaky-test 风险

### 4.1 已通过的单元测试

以下纯逻辑/内存测试全部通过（共 39 个 sync 相关测试通过）：

- `syncCrypto.test.ts`：15 项 ✅
- `syncIdentity.test.ts`：10 项 ✅
- `syncMessages.test.ts`：4 项 ✅
- `conflictResolver.test.ts`：4 项 ✅
- `syncSession.test.ts`：2 项 ✅
- `syncEngine.test.ts`：2 项 ✅
- `syncTransports.test.ts`：1 项 ✅
- `lanDiscovery.test.ts`：2 项 ✅

### 4.2 测试失败根因

- `syncStorage.test.ts`（13 失败）、`lanSync.integration.test.ts`（1 失败）、`dbService.test.ts` / `backupService.test.ts`（非 sync 范围）均因同一环境原因：
  - `better-sqlite3-multiple-ciphers` 本地二进制绑定缺失，当前 Node ABI（v24.15.0 / node-v137）未编译对应 `.node`。
  - 错误：`Could not locate the bindings file ... node-v137-linux-x64/better_sqlite3.node`。
- 这属于**构建/环境阻塞**，而非被测代码逻辑错误。

### 4.3 覆盖缺口

| 缺口 | 说明 |
|------|------|
| 冲突='conflict' 路径 | `syncEngine` 与 `syncStorage` 均未测试真正的 `conflict` 返回值及后续行为。 |
| 重放/篡改帧 | 未测试重复发送同一 handshake 帧、篡改 frame mode / length、超大帧。 |
| 非法消息结构 | 未测试缺少字段、类型错误的消息在 `deserializeMessage` / `handleMessage` 中的行为。 |
| 传输层异常 | 未测试 socket 中途关闭、ws 异常断开、连接超时、双向同时 begin 的竞态。 |
| 资源清理 | 未断言 `destroy()` 后事件监听器数量、状态是否回到 idle。 |
| 多表同步 | `syncEngine` 测试只使用单表 `['tasks']`，未覆盖多表 manifest 合并与部分缺失。 |
| UDP 真实广播 | `lanDiscovery.test.ts` 通过手工构造单播包测试，未验证真正的 `255.255.255.255` 广播与多网卡场景。 |
| 版本号与逻辑时钟 | `localClock` 与 `version` 的递增策略未在集成测试中验证。 |

### 4.4 Flaky-test 风险

- `syncSession.test.ts` 使用 `await new Promise((resolve) => setTimeout(resolve, 50))` 等待消息送达。
- `syncTransports.test.ts` 使用 `setTimeout(resolve, 150)`。
- `lanDiscovery.test.ts` 使用 `setTimeout(resolve, 200)` 与 `100`。
- 这些固定延时在 CI 高负载或 Windows 慢机器上容易抖动，应改为事件监听 + 合理超时（如 `once(session, 'message')`）。

---

## 5. 构建 / 打包 / 类型检查问题

在 `/workspace/taskflow-github/desktop` 执行结果：

| 命令 | 结果 | 关键输出 |
|------|------|----------|
| `npm run typecheck` | ❌ 失败 | `error TS5107: Option 'moduleResolution=node10' is deprecated ...`。`tsconfig.main.json` 使用 `"moduleResolution": "node"`（实际解析为 node10），在当前 TypeScript 版本下已弃用，未来 TypeScript 7 将直接失效。 |
| `npm run lint` | ❌ 失败 | `TypeError: scopeManager.addGlobals is not a function`。全局安装的 ESLint 10.2.0 与本地 `@typescript-eslint/*` v7 插件/解析器不兼容，flat config 与旧插件体系冲突。 |
| `npm run test` | ❌ 部分失败 | 12 个测试文件通过，4 个失败；失败全部源于 `better-sqlite3-multiple-ciphers` 本地绑定缺失（Node ABI v137）。sync 纯逻辑单元测试（39 项）全部通过。 |
| `npm run build` | ✅ 通过 | `build:main` 与 `build:renderer` 均成功，输出到 `dist/`。仅渲染构建报 expo tsconfig base 缺失警告（来自根目录 `tsconfig.json`）。 |

### 关键结论

- **TypeScript 配置需要升级**：`tsconfig.main.json` 应将 `moduleResolution` 改为 `node16` 或 `bundler`，并相应调整 `module`（如 `Node16`）与 import 路径，才能消除 TS5107。
- **ESLint 配置需要修复**：要么降级到 ESLint 8 + 传统 `.eslintrc`，要么升级到 ESLint 9 flat config 并配套 `@typescript-eslint` v8。当前 `eslint.config.js` 在 ESLint 10 下直接崩溃。
- **原生依赖需要重建/预编译**：当前 CI 容器 Node v24.15.0 没有 `better-sqlite3-multiple-ciphers` 的预编译二进制，需执行 `npm run rebuild:native` 或确保 `electron-builder install-app-deps` 在目标 ABI 下运行。

---

## 6. Phase 3 中继服务器如何复用 / 扩展现有模块

### 6.1 复用建议

| 现有模块 | Phase 3 复用方式 |
|----------|------------------|
| `SyncSession` | **直接复用**。中继场景下，两台设备分别作为 initiator/responder 与中继建立 WebSocket，但握手仍发生在设备之间；中继只转发 `sendFrame` 的 length-prefixed 原始帧。 |
| `SyncEngine` | **直接复用**。中继服务器对 `SyncEngine` 透明，`SyncEngine` 仍只处理 `session` 的 `ready`/`message`/`error`/`close` 事件。 |
| `syncMessages` (`FrameParser` / `encodeFrame`) | **复用**。中继可不解包，直接透传字节流；若中继需要按 device 路由或 TTL 清理，可复用 `FrameParser` 仅解析出 header（mode+length）而不解析 payload。 |
| `WsSyncTransport` | **扩展**。当前 `WsSyncTransport` 仅支持单次连接，Phase 3 需要在其之上封装「重连 + 退避 + 心跳」的 `RelaySyncTransport`，内部持有 `WsSyncTransport` 实例并在断线时重建。 |
| `syncCrypto` | **复用**。配对码流程中，新设备与现有设备可通过 `generateEcdhKeyPair` / `computeSharedSecret` / `deriveSessionKeys` 建立临时加密通道，用于安全传输 SMK。 |
| `syncIdentity` | **复用**。`DeviceIdentity` 与 `getTrustedPublicKey` 机制不变；中继注册设备时可把 `deviceId` 作为 WebSocket query 参数，服务器按 deviceId 路由。 |
| `UdpBroadcastDiscoveryService` | **不复用**。中继发现属于广域网/配置发现，应新增基于配置 URL 或 mDNS-SD 的 `RelayDiscoveryService`。 |

### 6.2 推荐架构

```
设备 A          中继服务器 (Node.js + ws)          设备 B
  │                    │                            │
  ├─ WS /sync?deviceId=A ───────────────────────────┤
  │                    │                            │
  ├─ sendFrame(HELLO) ─┼─► 按 deviceId 转发给 B ────┤
  │                    │                            │
  │◄──────── OFFER/ANSWER/MANIFEST/BATCH/ACK ───────┤
  │                    │                            │
```

- 中继只识别 frame header，不解析 payload，不持有 SMK。
- 配对码流程可新增 `PairingSession`（继承或组合 `SyncSession`），在握手成功后由旧设备调用 `encryptSyncRecord(smk, tempKey)` 传输 SMK。
- 建议新增 `RelayClient` 统一封装：发现 → WebSocket 连接 → 重连退避 → 创建 `SyncSession`/`SyncEngine` → 触发同步。

---

## 7. Phase 3 启动前必须修复的事项

按优先级排序：

1. **修复 typecheck（P0）**
   - 升级 `tsconfig.main.json` 的 `moduleResolution` 到 `node16` / `bundler`，同步调整 `module` 与 import 风格，确保 `npm run typecheck` 通过。

2. **修复 lint（P0）**
   - 统一 ESLint 版本与配置体系（建议升级到 ESLint 9 flat config + `@typescript-eslint` v8），或回退到与现有插件兼容的 ESLint 8。

3. **重建原生依赖并稳定测试（P0）**
   - 在当前 CI Node ABI 下运行 `npm run rebuild:native` / `electron-builder install-app-deps`，使 `better-sqlite3-multiple-ciphers` 绑定可用；同步修复 `syncStorage.test.ts` 与 `lanSync.integration.test.ts`。

4. **补全冲突处理逻辑（P1）**
   - 在 `SyncEngine.handleBatch` 与 `insertSyncRecord` 中显式处理 `conflict` 结果：可选项包括 bump version + 合并、记录冲突表、emit `'conflict'` 事件供 UI 处理，避免永久分歧。

5. **增加握手超时与状态机保护（P1）**
   - `SyncSession.begin()` 增加握手超时（如 30s），超时后 `close()` 并 emit `'error'`；错误后重置/锁定状态机，防止后续帧继续处理。

6. **修复资源泄漏（P1）**
   - `TcpSyncTransport` / `WsSyncTransport` 在 `destroy()` 中移除所有 socket/ws/session 监听器；`SyncEngine` 在 `close`/`complete` 后 `session.off(...)`。

7. **增强消息/帧校验（P1）**
   - 为 `isSyncMessage` / `deserializeMessage` 增加字段级校验（可用 zod 或手写守卫）。
   - 为 `FrameParser` 增加最大缓冲区阈值与最大 frame length 限制。

8. **消除 flaky 测试（P2）**
   - 将 `syncSession.test.ts`、`syncTransports.test.ts`、`lanDiscovery.test.ts` 中的固定 `setTimeout` 替换为事件监听 + `vi.waitFor` / `once(eventEmitter, event)`。

9. **补全测试覆盖（P2）**
   - 增加：重放攻击、非法/超大帧、socket 中途断开、多表同步、UDP 真实广播、冲突路径、`SyncEngine` 完成后再启动的幂等性。

10. **同步更新设计/计划文档（P2）**
    - 将 `docs/superpowers/plans/2026-06-21-taskflow-2.0-sync-phase1-core-library.md` 中的 `EcdhKeyPair` 接口示例更新为与代码一致的 PEM 版本。

---

## 附录：原始命令输出摘要

```text
$ npm run typecheck
> tsc --noEmit -p tsconfig.main.json && tsc --noEmit -p tsconfig.renderer.json

tsconfig.main.json(7,25): error TS5107: Option 'moduleResolution=node10' is deprecated ...

$ npm run lint
> eslint src
TypeError: scopeManager.addGlobals is not a function

$ npm run test
Test Files  4 failed | 12 passed (16)
Tests       24 failed | 59 passed (83)
失败原因：Could not locate the bindings file ... better_sqlite3.node

$ npm run build
✓ build:main  (tsc -p tsconfig.main.json)
✓ build:renderer (vite build)
```
