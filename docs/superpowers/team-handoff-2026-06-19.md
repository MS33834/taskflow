# TaskFlow 桌面端隐私重塑 — 团队交接文档

> 本文档用于将项目从初始实施阶段交接给持续开发团队。

---

## 1. 项目当前状态

**已完成**：1.0 MVP（桌面端）
- 基于 Electron + Vite + React + TypeScript 的桌面应用
- 本地 SQLite 数据库（当前为普通 better-sqlite3，未启用 SQLCipher）
- 任务管理：增删改查、完成状态、优先级
- 加密保险库：密码条目、字段级 AES-GCM 加密、密码生成器
- 隐私外壳：启动锁、自动锁屏、隐私模式、剪贴板自动清空、全局快捷键
- 工程能力：typecheck、lint、单元/集成测试、GitHub Actions CI、electron-builder 打包

**最新代码**：`main` 分支（GitCode 与 GitHub 已同步一致）

---

## 2. 建议新增角色

| 角色 | 负责范围 | 关键产出 |
|---|---|---|
| **E2E/手动测试工程师** | 按测试清单做端到端验证、回归测试 | 测试报告、bug 清单、复现步骤 |
| **DevOps/CI 工程师** | 完善 CI/CD、安装包签名、自动发布 | 可下载的安装包、发布流水线 |
| **安全审计员** | 审查加密方案、密钥管理、SQLCipher 落地 | 安全评审报告、风险清单 |
| **产品经理** | 验收 1.0、排定 2.0 优先级、管理需求变更 | PRD、用户故事、验收标准 |
| **技术文档工程师** | 开发者文档、用户隐私白皮书、API 说明 | 文档站点或 Markdown 文档 |
| **UI/UX 设计师（加强）** | 高保真设计稿、动效、深色模式完整设计 | Figma、设计系统、组件规范 |

小团队可合并角色，但建议至少有：开发 + 测试 + 安全审计。

---

## 3. 推荐开发流程

### 3.1 分支策略
- `main`：始终可构建、可测试的稳定分支
- `feature/<名称>`：新功能开发
- `fix/<名称>`：bug 修复
- 合并前必须跑通：`npm run typecheck && npm run lint && npm run test && npm run build`

### 3.2 提交规范
使用 Conventional Commits：
- `feat:` 新功能
- `fix:` 修复
- `chore:` 工程/依赖
- `docs:` 文档
- `test:` 测试
- `refactor:` 重构

### 3.3 同步规范
**每次完成一个功能或修复后，必须同时推送到两个仓库：**

```bash
# 假设当前在 feature 分支，已合并到本地 main
git checkout main
git merge feature/xxx

# 推送到 GitCode
git push origin main

# 推送到 GitHub
git push github main
```

**仓库地址**：
- GitCode：`https://gitcode.com/badhope/taskflow.git`
- GitHub：`https://github.com/MS33834/taskflow.git`

> 注意：团队成员需自行配置各自 Git 凭证，不要将仓库 Token 写入代码或聊天记录。

---

## 4. 测试清单（专业测试团队用）

### 4.1 基础功能
- [ ] 首次启动：输入密码后进入主界面
- [ ] 二次启动：用相同密码解锁，数据未丢失
- [ ] 添加任务：标题、截止日期、优先级、分类
- [ ] 完成任务：勾选后状态变为已完成
- [ ] 删除任务：任务从列表移除
- [ ] 添加保险库条目：名称、账号、密码
- [ ] 生成密码：长度正确、字符随机
- [ ] 复制密码：剪贴板 30 秒后自动清空
- [ ] 显示/隐藏密码：敏感字段可切换显示

### 4.2 隐私与安全
- [ ] 锁定：点击侧边栏「锁定」后回到锁屏
- [ ] 自动锁定：闲置 5 分钟后自动锁屏
- [ ] 隐私模式：按 `Esc` 隐藏保险库入口
- [ ] 全局快捷键：`Cmd/Ctrl+L` 锁定、`Cmd/Ctrl+N` 新建任务、`Esc` 隐私模式
- [ ] 数据库文件安全：复制 `taskflow.db` 到另一环境，确认无法直接读出密码

### 4.3 跨平台与打包
- [ ] Windows：`npm run package` 生成 `.exe` 安装包
- [ ] macOS：`npm run package` 生成 `.dmg` 安装包
- [ ] Linux：`npm run package` 生成 `.AppImage`
- [ ] CI 通过：GitHub Actions 全部绿灯

### 4.4 已知限制（暂不阻塞，但需记录）
- [ ] SQLCipher 文件级加密未启用
- [ ] 生物识别（Touch ID / Windows Hello）未实现
- [ ] 截图保护未实现
- [ ] 设置页导入/导出未接实现
- [ ] 深色模式未完整实现
- [ ] 日历视图只有空壳

---

## 5. 下一步建议优先级

### P0（必须做，才能称为完整 1.0）
1. **启用 SQLCipher 文件级加密**：编译带 SQLCipher 的 better-sqlite3，确保数据库文件被拷贝后无法读取
2. **修复已知 bug**：根据测试清单产出修复

### P1（强烈建议）
3. **生物识别解锁**：接入 Touch ID / Windows Hello
4. **数据导入/导出**：设置页功能补全
5. **深色模式完整实现**：持久化用户选择

### P2（2.0 规划）
6. 端到端加密同步
7. Web 端与移动端适配
8. 笔记/日记模块
9. 目标/习惯模块

---

## 6. 关键文件索引

- 设计文档：`docs/superpowers/specs/2026-06-19-taskflow-desktop-privacy-redesign-design.md`
- 实施计划：`docs/superpowers/plans/2026-06-19-taskflow-desktop-privacy-implementation.md`
- 桌面端代码：`desktop/`
- 主进程入口：`desktop/src/main/index.ts`
- 渲染入口：`desktop/src/renderer/main.tsx`
- 加密服务：`desktop/src/main/services/cryptoService.ts`
- 认证服务：`desktop/src/main/services/authService.ts`
- 数据库服务：`desktop/src/main/services/dbService.ts`
- 保险库 Repository：`desktop/src/main/repositories/vaultRepository.ts`

---

## 7. 联系方式与规范

- 重大问题先开 issue 或记录在文档中
- 安全相关改动必须经过安全审计员 review
- 每次合并到 `main` 后必须双仓库推送
