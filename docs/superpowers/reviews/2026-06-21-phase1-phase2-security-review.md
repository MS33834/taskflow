# TaskFlow 2.0 Phase 1 / Phase 2 同步模块安全与架构评审

**评审日期**：2026-06-21  
**仓库**：/workspace/taskflow-github  
**分支/commit**：main @ 300b2d8  
**评审范围**：Phase 1 核心同步库 + Phase 2 局域网同步实现（含对应单测与集成测试）  
**评审人**：Claude Code Security/Architecture Review

---

## 1. 总体结论（Summary）

**结论：有条件通过，但存在必须修复的高/中优先级问题。**

Phase 1 / Phase 2 的核心功能已基本实现，所有同步相关的单元测试与 LAN 集成测试均通过。但代码在安全默认值、网络协议加固、设备身份信任链和与 Phase 3 中继服务器的衔接上仍存在明显缺口。若直接进入 Phase 3，中继服务器将面临密钥泄露、DoS、身份冒用和消息解析崩溃等风险。

### 工具检查结果

| 命令 | 结果 | 说明 |
|------|------|------|
| `npm run typecheck` | ✅ 通过 | TypeScript 无编译错误 |
| `npm run lint` | ✅ 通过 | ESLint 无告警 |
| `npm run test` | ⚠️ 部分失败 | 所有 **sync** 单测/集成测试通过；`backupService.integration.test.ts` 有 3 个失败，与本次同步评审无关 |

> 备注：首次运行前需执行 `npm install`，否则 lint 因缺少 `@eslint/js`、test 因缺少 `vitest` 失败。

---

## 2. 安全发现（Security Findings）

### 🔴 Critical

#### SF-CRIT-01：safeStorage 不可用时，SMK 与设备私钥以明文写入磁盘
- **位置**：
  - `desktop/src/main/services/sync/syncCrypto.ts:43-46`（`saveSyncMasterKey` 的 `else` 分支）
  - `desktop/src/main/services/sync/syncIdentity.ts:37-46`（`saveDeviceIdentity` 的 `encrypted: false` 分支）
- **影响**：端到端加密的根基（Sync Master Key）和设备身份私钥在 Linux 等 safeStorage 不可用的环境下会以 JSON/Hex 或 PEM 明文形式写入 `userData`。任何能读取该目录的进程/用户均可解密全部同步数据并冒充设备。
- **建议**：
  1. **Fail-closed**：`safeStorage.isEncryptionAvailable() === false` 时禁止启用同步，并向用户提示“当前系统不支持安全存储”。
  2. 若必须兼容无 keyring 的环境，应要求用户设置一个本地密钥派生密码（PBKDF2/Argon2）来加密 SMK/私钥，而不是直接写明文。
  3. 写入文件时设置 `mode: 0o600`（见 SF-MED-01）。

### 🟠 High

#### SF-HIGH-01：`FrameParser` 未限制帧长度，存在内存耗尽 DoS
- **位置**：`desktop/src/main/services/sync/syncMessages.ts:115-134`
- **影响**：协议头 4 字节长度字段可被设为极大值（最大 4 GiB）。攻击者只需发送几个字节即可让对端持续分配 Buffer，最终导致 OOM。该风险在开放 LAN 或未来连接公共/自托管中继时尤其严重。
- **建议**：增加 `MAX_FRAME_SIZE`（建议 8–16 MiB），在 `length > MAX_FRAME_SIZE` 时立即触发 `error` 并丢弃连接。

#### SF-HIGH-02：设备注册表可被任意覆盖公钥，破坏信任根
- **位置**：`desktop/src/main/services/sync/syncStorage.ts:132-152`（`upsertSyncDevice`）
- **影响**：`ON CONFLICT(device_id) DO UPDATE SET public_key = excluded.public_key` 会无条件覆盖已有设备的公钥。如果后续将 `sync_devices` 作为 `getTrustedPublicKey` 的信任源，恶意本地写入或重放配对即可把已信任设备替换为攻击者公钥，实施中间人攻击。
- **建议**：
  1. 仅在首次配对或显式“重新配对”时更新 `public_key`；正常 `last_seen_at` 更新不应改动公钥。
  2. 增加 `removeSyncDevice(deviceId)`，并在 UI 中实现“移除设备”以支持撤销。

#### SF-HIGH-03：冲突解决在平局时静默丢弃对端记录，可能导致数据丢失
- **位置**：
  - `desktop/src/main/services/sync/conflictResolver.ts:9-15`
  - `desktop/src/main/services/sync/syncEngine.ts:176-192`
- **影响**：当 `updatedAt` 和 `version` 均相等时，`resolveConflict` 返回 `'conflict'`；而 `syncEngine` 把 `'conflict'` 与 `'local'` 同样处理（`apply = false`），对端记录被静默忽略。两个离线设备在相同时间戳生成相同版本时，数据可能不一致且用户无感知。
- **建议**：
  1. 将 `'conflict'` 单独处理：标记为待人工合并或采用确定性 tie-breaker（如 deviceId 字典序、UUID 等），而不是直接丢弃。
  2. 在日志/同步状态中暴露冲突计数，供 UI 提示用户。

#### SF-HIGH-04：纯客户端本地时钟的 last-write-wins 易受时钟偏移影响
- **位置**：`desktop/src/main/services/sync/conflictResolver.ts:10-11`、`syncEngine.ts:130-134`
- **影响**：设备系统时间偏差会决定胜负。攻击者或配置错误可将设备时间调快，从而覆盖其他设备的合法更新。
- **建议**：MVP 后可接受，但应在 Phase 3 前明确写入架构决策：后续引入 HLC（Hybrid Logical Clock）或向量时钟，避免依赖 `Date.now()`。

### 🟡 Medium

#### SF-MED-01：密钥文件未设置严格文件权限
- **位置**：`syncCrypto.ts:42`、`syncIdentity.ts:46`
- **影响**：`fs.writeFileSync` 默认权限依赖 umask，在 Linux/macOS 上常为 `0o644`，其他用户/进程可能读取。
- **建议**：`fs.writeFileSync(targetPath, data, { mode: 0o600 })`。

#### SF-MED-02：消息反序列化缺乏字段级校验
- **位置**：`desktop/src/main/services/sync/syncMessages.ts:83-103`
- **影响**：`isSyncMessage` 仅校验 `type` 字段属于白名单，不检查必填字段类型。攻击者可发送 `{ type: 'HELLO' }`，导致 `syncSession.ts` 在访问 `msg.deviceId`、`msg.publicKey` 时抛出未捕获异常或进入不确定状态。
- **建议**：为每种消息类型增加运行时校验（如 Zod / io-ts 或手写断言），在 `deserializeMessage` 阶段拒绝非法消息。

#### SF-MED-03：`OFFER` / `ANSWER` 的 `encryptedPayload` 字段名与实现不符，且实际未加密
- **位置**：`desktop/src/main/services/sync/syncSession.ts:167-183`、`185-212`
- **影响**：字段名暗示已加密，实际只是 base64 编码的 JSON（含 ECDH 公钥与签名）。虽然握手阶段可用签名保证真实性，但字段名会误导审计和后续开发者，也可能让中继日志/抓包直接暴露 ECDH 公钥（元数据泄露）。
- **建议**：
  1. 重命名为 `payload` 或 `signedPayload`；若保留 `encryptedPayload` 则必须真加密。
  2. 在 Phase 3 配对码流程中，考虑用配对码派生的密钥对 `OFFER/ANSWER` 做额外加密。

#### SF-MED-04：UDP LAN 发现广播明文凭据摘要
- **位置**：`desktop/src/main/services/sync/lanDiscovery.ts:56-69`
- **影响**：`deviceId`、设备名、`accountHash`（SHA256 前 8 字节）以 UDP 明文广播。同一局域网内的其他主机可枚举设备、推断账号。
- **建议**：
  1. LAN 发现仅作为“存在性信标”，敏感元数据最小化。
  2. 未来可考虑对发现包做签名或仅广播经过哈希的账户令牌，不广播设备名。

#### SF-MED-05：签名数据拼接未加长度前缀
- **位置**：`desktop/src/main/services/sync/syncSession.ts:304-318`（`buildSignedData`）
- **影响**：`deviceId + peerDeviceId + nonce + peerNonce + ecdhPublicKeyPem` 直接拼接。当前 `deviceId` 固定 16 字符、`nonce` 为 base64 无换行，因此实际风险低；但若未来放宽格式，可能出现解析歧义。
- **建议**：使用固定长度字段或 `Buffer.from([field1.length, field1, ...])` 等明确编码。

#### SF-MED-06：加密通道缺少重放保护
- **位置**：`desktop/src/main/services/sync/syncCrypto.ts:152-170`、`syncSession.ts:294-301`
- **影响**：每个消息使用独立随机 IV，GCM 可保证机密性和完整性，但无序列号/时间窗口。攻击者可在同一会话内重放旧帧（例如重复 `BATCH`/`ACK`）。
- **建议**：在帧头或消息体内加入单调递增序列号，并在接收端维护滑动窗口拒绝重复。

#### SF-MED-07：`BATCH` / `REQUEST` 未限制记录数量与大小
- **位置**：`desktop/src/main/services/sync/syncEngine.ts:139-142`、`147-161`
- **影响**：对端可请求任意 ID 列表或发送超大 `BATCH`，导致单次同步占用大量内存/CPU。
- **建议**：增加 `MAX_RECORDS_PER_BATCH` / `MAX_REQUEST_IDS` 和总大小限制，分批同步。

### 🟢 Low

#### SF-LOW-01：密钥加载函数静默吞掉所有异常
- **位置**：`syncCrypto.ts:49-64`、`syncIdentity.ts:49-70`
- **影响**：文件损坏、JSON 非法、safeStorage 失败均返回 `null`，调用方难以区分“未创建”和“已损坏”。
- **建议**：区分异常类型并记录日志，至少把解析错误抛给上层。

#### SF-LOW-02：`getDeviceFingerprint` 假设 SPKI 编码长度
- **位置**：`desktop/src/main/services/sync/syncIdentity.ts:72-76`
- **影响**：`spkiDer.subarray(spkiDer.length - 32)` 依赖 Ed25519 SPKI 最后 32 字节即原始公钥。当前 Node 实现如此，但属于脆弱假设。
- **建议**：使用 `createPublicKey(publicKeyPem).export({ type: 'raw', format: 'der' })` 显式导出原始公钥后再哈希。

#### SF-LOW-03：`TcpSyncTransport` / `WsSyncTransport` 错误处理未主动关闭连接
- **位置**：`desktop/src/main/services/sync/syncTransports.ts:41`、`100`
- **影响**：`socket.on('error', ...)` 仅转发错误，未调用 `destroy()/terminate()`，异常套接字可能残留。
- **建议**：在错误回调中关闭/销毁套接字并触发 `session.close()`。

#### SF-LOW-04：`WsSyncTransport` 缺少连接超时与证书配置
- **位置**：`desktop/src/main/services/sync/syncTransports.ts:84-88`
- **影响**：连接挂死无超时；对自托管中继的自签名证书没有显式处理策略。
- **建议**：增加连接超时、指数退避重连，并在设置中暴露“信任自签名证书”选项（默认关闭）。

---

## 3. 影响 Phase 3 中继服务器的架构阻塞点

1. **配对码注册/认领流程完全缺失**  
   规格文档定义了 `POST /register-device`、`POST /claim-pairing-code`、`WS /sync?deviceId=...`，但当前代码没有任何实现。Phase 3 必须从零构建，并确保配对码有 5 分钟 TTL、一次性使用、防暴力枚举。

2. **设备信任源未与 `sync_devices` 表打通**  
   `SyncSession` 通过构造函数注入 `getTrustedPublicKey`；测试使用内存 Map，生产代码尚未从 `syncStorage` 读取已配对设备。Phase 3 必须实现 `getTrustedPublicKey(deviceId) => syncDevices.get(deviceId)?.publicKey`，并处理撤销/更新。

3. **传输层是面向直连的客户端实现，缺少中继路由抽象**  
   `TcpSyncTransport` 与 `WsSyncTransport` 均假设双端直接建立单一长连接。中继服务器需要“连接到中继 → 通过中继转发到目标 deviceId”的能力，当前没有 `RelayTransport` 或 `RelayManager` 抽象。

4. **无消息队列/离线暂存能力**  
   `SyncEngine` 假设对端实时在线并立即响应 `MANIFEST/REQUEST/BATCH/ACK`。中继需要 store-and-forward（TTL 7 天），当前引擎无法处理对端不在线的场景。

5. **帧解析 DoS 必须在中继端也修复**  
   中继会解析/转发帧，若不限制帧长度，一个恶意客户端即可拖垮中继。

6. **无运行时设备撤销与允许列表刷新**  
   `SyncSession` 创建后信任回调固定。Phase 3 需支持在设备被移除后即时断开/拒绝已有会话。

7. **会话与引擎生命周期未明确**  
   目前每次同步新建 `SyncSession` + `SyncEngine`。中继场景下需要长期保持 WebSocket 连接并在网络波动时自动重连、恢复同步状态。

---

## 4. 可直接复用的文件/函数（Safe to Reuse As-Is）

以下组件在修复上述问题后可继续作为 Phase 3 基础，**但建议同步进行硬化**：

- **`syncCrypto.ts`**
  - `generateSyncMasterKey`、`encryptSyncRecord`、`decryptSyncRecord`：AES-256-GCM 加解密逻辑正确，IV 随机且独立。
  - `deriveSessionKey`、`deriveSessionKeys`、`encryptSessionMessage`、`decryptSessionMessage`：HKDF + GCM 派生与传输加密逻辑正确。
  - `generateEcdhKeyPair`、`computeSharedSecret`：X25519 ECDH 实现正确。

- **`syncIdentity.ts`**
  - `generateDeviceIdentity`、`signMessage`、`verifySignature`：Ed25519 签名/验签接口正确。
  - `getDeviceFingerprint`：概念可用，但建议改用 `raw` DER 导出。

- **`syncSession.ts`**
  - 整体 ECDH + Ed25519 握手状态机与绑定 nonce 的签名设计合理，是安全基础。需要增加：字段校验、帧长度限制、序列号、设备撤销动态回调。

- **`syncMessages.ts`**
  - `serializeMessage` / `deserializeMessage`、长度前缀帧 `encodeFrame` / `FrameParser` 设计简洁。需要增加：消息字段校验、最大帧长度。

- **`syncEngine.ts`**
  - manifest/request/batch/ack 同步流程与 `SyncStore` 抽象清晰，可对接不同 transport。需要增加：记录 hash 校验、冲突上报、分批限制、离线队列适配。

- **`conflictResolver.ts`**
  - 纯函数形式的 LWW 逻辑可复用，但需扩展 `'conflict'` 处理策略。

- **`syncStorage.ts`**
  - CRUD 与 SQL 参数化基本正确，无 SQL 注入风险（已通过测试）。需要增加：设备公钥保护、设备删除、记录 hash 持久化/校验。

---

## 5. 进入 Phase 3 前必须修复的行动项

| 优先级 | 行动项 | 负责人建议 | 关联发现 |
|--------|--------|------------|----------|
| P0 | 移除 SMK / 设备私钥的明文回退写入，改为 **fail-closed** | 后端/加密 | SF-CRIT-01 |
| P0 | 为 `FrameParser` 增加 `MAX_FRAME_SIZE` 并在两端强制校验 | 协议/网络 | SF-HIGH-01 |
| P0 | 实现 `sync_devices` 作为信任源，并防止公钥被非授权覆盖 | 身份/存储 | SF-HIGH-02 |
| P1 | 为 `OFFER/ANSWER` 字段名纠错或实现真加密；增加消息字段校验 | 协议 | SF-MED-02、SF-MED-03 |
| P1 | 在 `SyncEngine` 中校验 `BATCH` 记录 hash，并正确上报/处理 `'conflict'` | 同步逻辑 | SF-HIGH-03 |
| P1 | 为密钥文件设置 `0o600` 权限 | 安全加固 | SF-MED-01 |
| P1 | 为加密帧增加序列号/重放窗口 | 协议安全 | SF-MED-06 |
| P2 | 为 `WsSyncTransport` 增加超时、重连、证书策略 | 中继适配 | SF-LOW-04 |
| P2 | 限制 `BATCH` / `REQUEST` 记录数量与总大小 | 资源保护 | SF-MED-07 |
| P2 | 实现 `removeSyncDevice` 与运行时撤销 | 设备管理 | SF-HIGH-02 |
| P2 | 将 `buildSignedData` 改为带长度前缀的明确编码 | 协议加固 | SF-MED-05 |
| P3 | 制定并文档化冲突处理与离线同步策略（HLC/向量时钟） | 架构 | SF-HIGH-04 |

---

## 6. 测试摘要

- **同步相关测试全部通过**：
  - `src/tests/unit/sync/syncCrypto.test.ts`：15 passed
  - `src/tests/unit/sync/syncIdentity.test.ts`：10 passed
  - `src/tests/unit/sync/syncSession.test.ts`：2 passed
  - `src/tests/unit/sync/syncTransports.test.ts`：1 passed
  - `src/tests/unit/sync/syncStorage.test.ts`：13 passed
  - `src/tests/unit/sync/syncEngine.test.ts`：2 passed
  - `src/tests/unit/sync/syncMessages.test.ts`：4 passed
  - `src/tests/unit/sync/conflictResolver.test.ts`：4 passed
  - `src/tests/unit/sync/lanDiscovery.test.ts`：2 passed
  - `src/tests/integration/sync/lanSync.integration.test.ts`：1 passed

- **不相关失败**：`src/tests/integration/backupService.test.ts` 失败 3 个，由 `Authentication verifier not found` 引起，不在本次评审范围内。
