# TaskFlow 2.0 Sync Phase 1 / Phase 2 规格符合性评审报告

> 评审日期：2026-06-21  
> 评审人：规格与文档评审代理  
> 仓库：`/workspace/taskflow-github`，commit `300b2d8`，分支 `main`  
> 范围：Phase 1 核心同步库 + Phase 2 局域网同步实现  

## 1. 符合性总览

| 维度 | 结论 | 说明 |
|---|---|---|
| Phase 1 核心库实现 | **基本符合** | 数据模型、SMK 生命周期、记录加密、设备身份、冲突解决均已实现。 |
| Phase 2 局域网同步 | **功能完成但存在偏差** | UDP 广播发现替代了设计稿中的 mDNS；握手、传输加密、同步协议消息均已实现。 |
| 代码质量检查 | **typecheck / lint 通过** | `npm run typecheck`、`npm run lint` 均返回 0。 |
| 测试 | **同步测试全部通过** | 所有 sync 相关单元/集成测试通过；全量测试有 3 个失败在 `backupService` 集成测试，与本次 sync 工作无关。 |
| 文档/规格 | **存在明显缺口** | Phase 2 计划文件缺失；设计规格与实现有多处不一致，缺少同步子系统 README/内联说明。 |

总体结论：**有条件通过（PASS with deviations）**。实现功能完整且测试覆盖良好，但在进入 Phase 3（中继服务器）之前，必须先补齐规格文档、统一发现层语义，并处理下文列出的阻塞项。

---

## 2. 与规格/计划的偏差

### 2.1 局域网发现层：实现为 UDP 广播，而非设计规格中的 mDNS

- **设计规格**（`2026-06-21-taskflow-2.0-sync-design.md` §6.1/§6.2）要求：LAN 中通过 **mDNS** 发现同账号设备。
- **实现**：`desktop/src/main/services/sync/lanDiscovery.ts` 使用 `dgram` 发送/监听 UDP 广播包（`255.255.255.255`），通过 `accountToken` 的 SHA256 前 16 字节过滤同账号设备。
- **影响与风险**：
  - 中等。UDP 广播在部分路由器/VLAN/子网隔离环境下不可靠；mDNS 是更标准的局域网服务发现方式，且跨平台生态更成熟。
  - 当前实现没有服务生命周期管理、冲突退避或 TTL，后续直接对接 Phase 3 中继时可能需要重写。
- **建议**：在 Phase 3 之前明确决策：要么更新规格为“UDP 广播发现（MVP）+ 未来可替换为 mDNS”，要么在 Phase 2 收尾时切换到 mDNS/Bonjour 库（如 `bonjour-service`）。

### 2.2 会话密钥派生：实现比规格更复杂，且规格未定义

- **设计规格** §5.2 要求：`HKDF-SHA256(sharedSecret, salt, 'taskflow-sync-v1')` 派生会话密钥。
- **实现**：`syncCrypto.ts` 提供 `deriveSessionKeys(sharedSecret, salt, role)`，生成**两套非对称密钥**：
  - `sendKey = HKDF(..., "taskflow-sync-v1|initiator->responder")`
  - `receiveKey = HKDF(..., "taskflow-sync-v1|responder->initiator")`
- 盐值在 `syncSession.ts` 中由 `sha256(sorted(deviceIds) + sorted(nonces))` 生成。
- **影响与风险**：
  - 低-中等。该设计提升了安全性（防止角色反转攻击、保证发送/接收密钥分离），但**超出当前规格描述**。
  - 若后续实现其他客户端（如移动端、中继服务器）必须复现同样的派生逻辑，否则互操作性失败。
- **建议**：更新规格 §5.2，精确记录 `deriveSessionKeys`、`salt` 构造方式、info 字符串模板。

### 2.3 设备指纹算法：实现从 PEM 中提取原始公钥字节再哈希

- **设计规格** §4.3：设备 ID 是“设备公钥指纹”，但未定义具体算法。
- **Phase 1 计划**：`getDeviceFingerprint(publicKeyPem)` 实现为 `sha256(publicKeyPem).slice(0, 16)`。
- **实现**：`syncIdentity.ts` 第 72-75 行将 PEM 解码为 DER，截取最后 32 字节（原始 Ed25519 公钥）再做 SHA256。
- **影响与风险**：
  - 低。该实现更稳定（不受 PEM 空白/换行变化影响），但与计划原文不一致；如移动端或配对码流程按旧计划实现，会导致 deviceId 不匹配。
- **建议**：在规格中明确定义设备指纹算法，并同步更新 Phase 1 计划中的伪代码。

### 2.4 `insertSyncRecord` 内嵌冲突解决逻辑

- **Phase 1 计划**：`syncStorage.ts` 的 `insertSyncRecord` 是纯 UPSERT。
- **实现**：`syncStorage.ts` 第 49-79 行在插入前先调用 `resolveConflict`，仅当远端更新时才写入；返回 `ConflictResult`。
- **影响与风险**：
  - 低-中等。功能正确，但**职责边界模糊**——`SyncEngine` 在 `handleBatch` 中再次调用 `resolveConflict`，形成“双重决策”。
  - `insertSyncRecord` 对全新记录返回 `'remote'`，语义上令人困惑。
- **建议**：明确 `syncStorage` 是“原生存储操作”还是“带策略的写入”；`SyncEngine` 应是冲突决策的唯一入口。

### 2.5 清单哈希从 `id` 改为 `sha256(encrypted_payload)`

- **Phase 1 计划**：`getSyncRecordManifest` 返回 `hash: row.id`。
- **实现**：`syncStorage.ts` 第 101 行返回 `hash: sha256(row.encrypted_payload)`。
- **影响与风险**：
  - 低。该实现更准确，可检测相同 `id` 下 payload 变化；但 `SyncEngine.handleManifest` 在比较时仍用 `updatedAt` 优先，再检查 `hash`，逻辑合理。
- **建议**：在规格 §6.1 的 `MANIFEST` 消息类型中说明 `hash` 字段计算方法。

### 2.6 传输帧协议未在规格中定义

- **实现**：`syncMessages.ts` 定义了 5 字节长度前缀帧：`[mode: uint8][length: uint32BE][payload]`，`mode=0` 为握手明文，`mode=1` 为加密消息。
- **规格**：设计稿未提及帧协议，仅列出消息类型。
- **影响与风险**：
  - 中等。中继服务器（Phase 3）或其他客户端实现时需要复现该协议，目前只能读源码。
- **建议**：在设计规格中新增“传输帧格式”章节。

### 2.7 Phase 2 计划文件缺失

- **预期文件**：`docs/superpowers/plans/2026-06-21-taskflow-2.0-sync-phase2-lan.md`。
- **实际情况**：该文件不存在；Phase 2 实现只能与设计规格直接对比。
- **影响与风险**：
  - 高。缺少任务拆分、验收标准、文件结构说明，导致无法评估 Phase 2 是否按计划完成，也不利于后续维护/审计。
- **建议**：立即补齐 Phase 2 实施计划，并记录实际实现与最初设想的差异。

---

## 3. 按规格缺失或不完整的功能

### 3.1 新设备加入与配对码流程

- **设计规格** §3.4 要求：新设备通过 8 位配对码/二维码完成 ECDH 握手并获取 SMK。
- **现状**：实现中没有配对码生成、认领、超时（5 分钟）或二维码逻辑。`SyncSession` 要求调用方通过 `getTrustedPublicKey` 预先注入受信任设备公钥。
- **阻塞级别**：高。该流程是设计规格的安全基石，必须在 Phase 3 之前补全或在规格中明确推迟到 Phase 4。

### 3.2 设备授权/移除

- **设计规格** §11：设备可在设置中「移除设备」，移除后无法参与同步。
- **现状**：`syncStorage.ts` 提供 `upsertSyncDevice`/`listSyncDevices`，但没有 `removeSyncDevice` 或吊销逻辑。
- **阻塞级别**：中。Phase 3 之前至少应暴露移除 API 并更新 `getTrustedPublicKey` 的信任源。

### 3.3 中继服务器 fallback

- **设计规格** §7：无法直连时通过自托管 Node.js 中继转发加密包。
- **现状**：`syncTransports.ts` 提供 `WsSyncTransport`，但没有任何中继服务器实现、注册/认领 API、配对码接口或 TTL 清理。
- **阻塞级别**：高。属于 Phase 3 范围，但 Phase 3 开始前规格需细化。

### 3.4 UI/设置集成

- **设计规格** §8：设置页同步模块、开关、配对码、中继地址、同步状态展示。
- **现状**：无任何 UI 代码或 IPC 通道。
- **阻塞级别**：中。可按计划推迟到 Phase 4，但需在规格中确认。

### 3.5 离线优先的同步调度器

- **设计规格** §2/§6.2：写操作先落本地 SQLite，后台同步线程择机推送/拉取。
- **现状**：核心库和会话层已就绪，但没有调度器/后台轮询/网络变化监听组件。
- **阻塞级别**：中。可在 Phase 4 与 UI 一起集成，但需在设计中预留接口。

### 3.6 错误处理与超时

-  handshake 状态机没有超时、没有最大重试、没有清理异常连接的机制。
-  `SyncEngine` 在 `ERROR` 消息上仅转发错误事件，没有针对具体错误码的行为定义。
- **阻塞级别**：中。进入 Phase 3 前需补充状态机超时与错误处理规格。

### 3.7 附件/文件同步

- **设计规格** §12 待决策：同步范围是否包含附件/文件？
- **现状**：未实现，且记录加密的 payload 为 JSON，未考虑大对象分片。
- **阻塞级别**：低。明确 MVP 不包含即可。

---

## 4. 文档更新需求

### 4.1 必须更新

| 文档 | 更新内容 |
|---|---|
| `docs/superpowers/specs/2026-06-21-taskflow-2.0-sync-design.md` | 1. 将 mDNS 发现改为 UDP 广播（或改实现）。<br>2. 精确记录会话密钥派生算法、salt 构造、info 字符串。<br>3. 定义设备指纹算法（原始公钥字节 + SHA256 + 截断）。<br>4. 新增“传输帧格式”章节。<br>5. 补充 `MANIFEST` 中 `hash` 字段计算方法。 |
| `docs/superpowers/plans/2026-06-21-taskflow-2.0-sync-phase2-lan.md` | **创建该文件**，包含任务拆分、文件结构、验收标准，并记录实际实现偏差（UDP 广播、role-based 密钥派生等）。 |
| `desktop/src/main/services/sync/README.md`（或同级说明） | 创建子系统 README，说明模块职责、信任模型、握手流程、如何运行测试。 |

### 4.2 建议补充

- **内联注释**：
  - `syncSession.ts` 中 `buildSignedData` 的字段顺序与用途。
  - `lanDiscovery.ts` 中 `accountHash` 仅用于同账号过滤，不是认证。
  - `syncEngine.ts` 中 `checkComplete` 的完成条件。
- **测试文档**：说明同步测试依赖 `vi.mock('electron')` 的临时文件与 mock 行为。
- **开发者上手文档**：如何生成设备身份、如何构造 `SyncSession`、如何配置信任表。

---

## 5. 进入 Phase 3 前更新规格的建议

1. **明确发现层抽象**：定义 `DiscoveryService` 接口，当前 `UdpBroadcastDiscoveryService` 作为默认实现；规格说明未来可替换为 mDNS，避免 Phase 3 中继发现时耦合。
2. **统一冲突解决入口**：将冲突决策保留在 `SyncEngine`，`syncStorage.insertSyncRecord` 退化为纯 UPSERT/幂等写入。
3. **定义握手超时与错误码**：为 `SyncSession` 增加 `HANDSHAKE_TIMEOUT_MS`、`MAX_OFFER_AGE` 等常量，并在 `ErrorMessage` 中约定错误码表。
4. **细化配对与安全引导流程**：
   - 配对码生成、展示、认领、过期。
   - 现有设备如何授权新设备（手动确认 / 自动信任）。
   - SMK 在新设备上的首次安全传输方式（当前 `SyncSession` 握手后可衍生会话密钥，但缺少显式 SMK 传输消息类型）。
5. **细化中继协议**：`register-device`、`claim-pairing-code`、`WS /sync?deviceId=...` 的消息格式、认证方式、TTL、清理策略。
6. **定义设备吊销机制**：移除设备时如何通知对端、如何清理会话密钥、如何处理离线设备的后续同步。
7. **明确 MVP 设备数量上限**：§12 待决策“是否支持多台设备同时在线同步”需在 Phase 3 前确认。

---

## 6. 进入 Phase 3 前必须处理的动作项

| # | 动作 | 优先级 | 负责建议 |
|---|---|---|---|
| 1 | 创建 `docs/superpowers/plans/2026-06-21-taskflow-2.0-sync-phase2-lan.md`，记录 Phase 2 实际范围与偏差。 | **高** | 产品经理/技术负责人 |
| 2 | 更新设计规格，统一发现层（mDNS vs UDP 广播）与会话密钥派生描述。 | **高** | 架构师 |
| 3 | 实现或推迟配对码/新设备加入流程，并在规格中明确。 | **高** | 安全/同步负责人 |
| 4 | 补充 `removeSyncDevice` 与设备吊销接口。 | **中** | 同步开发 |
| 5 | 为 `SyncSession` 增加握手超时、状态清理与错误码处理。 | **中** | 同步开发 |
| 6 | 创建 `desktop/src/main/services/sync/README.md` 或内联架构说明。 | **中** | 文档负责人 |
| 7 | 确认 `insertSyncRecord` 的职责边界，避免与 `SyncEngine` 双重冲突决策。 | **中** | 代码审查 |
| 8 | 调查并修复 `backupService.test.ts` 的 3 个失败（非 sync 阻塞，但影响 CI）。 | **中** | 相关模块负责人 |

---

## 7. 代码检查与测试结果

在 `/workspace/taskflow-github/desktop` 执行：

```bash
npm run typecheck   # 退出码 0，通过
npm run lint        # 退出码 0，通过
npm run test        # 退出码 1，sync 测试全通过，backupService 集成测试 3 个失败
```

### 7.1 同步相关测试详情（全部通过）

| 测试文件 | 用例数 | 结果 |
|---|---|---|
| `src/tests/unit/sync/syncCrypto.test.ts` | 15 | 通过 |
| `src/tests/unit/sync/syncIdentity.test.ts` | 10 | 通过 |
| `src/tests/unit/sync/syncStorage.test.ts` | 13 | 通过 |
| `src/tests/unit/sync/conflictResolver.test.ts` | 4 | 通过 |
| `src/tests/unit/sync/syncMessages.test.ts` | 4 | 通过 |
| `src/tests/unit/sync/syncSession.test.ts` | 2 | 通过 |
| `src/tests/unit/sync/syncTransports.test.ts` | 1 | 通过 |
| `src/tests/unit/sync/syncEngine.test.ts` | 2 | 通过 |
| `src/tests/unit/sync/lanDiscovery.test.ts` | 2 | 通过 |
| `src/tests/integration/sync/lanSync.integration.test.ts` | 1 | 通过 |

### 7.2 非同步失败项

- `src/tests/integration/backupService.test.ts` 有 3 个失败，与本次 sync 实现无关，但需在合并/发布前修复以保持 CI 绿色。

---

## 8. 关键阻塞项摘要

1. **Phase 2 计划文件缺失**，导致 Phase 2 完成度无法与计划核对。
2. **局域网发现实现为 UDP 广播，与设计规格中的 mDNS 不符**，需规格或实现二选一。
3. **新设备配对码/授权流程完全未实现**，这是设计规格 §3.4 的核心安全需求。
4. **设备移除/吊销机制缺失**，违反设计规格 §11。
5. **会话密钥派生与帧协议未写入规格**，将影响 Phase 3 中继服务器及其他客户端的互操作。

以上阻塞项解决后，方可进入 Phase 3（中继服务器）的详细设计与实现。
