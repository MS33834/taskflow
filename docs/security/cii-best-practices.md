# OpenSSF CII Best Practices 合规说明

TaskFlow 正在积极满足 [OpenSSF Best Practices Badge](https://www.bestpractices.dev/) 的要求。本文件记录当前已满足的关键实践，并指引维护者完成在线申请。

## 已满足的 Passing 级关键实践

| 实践领域 | 当前状态 | 说明 |
|---------|---------|------|
| 公开源码仓库 | ✅ | GitHub 与 GitCode 双仓库公开可读 |
| 版本控制 | ✅ | 使用 Git，所有变更可追溯 |
| FLOSS 许可证 | ✅ | 仓库根目录包含 LICENSE 文件 |
| 基本文档 | ✅ | README、SECURITY.md、API 文档 |
| 安全报告机制 | ✅ | SECURITY.md 提供漏洞报告方式 |
| 依赖扫描 | ✅ | Dependabot、Dependency Review、CodeQL |
| SAST | ✅ | CodeQL 工作流持续扫描 |
| 静态分析与测试 | ✅ | pytest 单元/集成测试 + hypothesis fuzz 测试 |
| CI/CD 最小权限 | ✅ | workflow 使用最小 permissions |
| Pin 依赖 Action | ✅ | 所有 GitHub Actions 使用 commit SHA pin |
| 输入校验 | ✅ | 后端路径、URL、分类均经过校验 |
| 加密存储 | ✅ | 桌面端 AES-256-GCM + SQLCipher |

## 待完成事项

1. **在线申请 Badge**
   - 访问 https://www.bestpractices.dev/
   - 使用 GitHub 账号登录
   - 点击 "Add New Project"，填入仓库 URL `https://github.com/MS33834/taskflow`
   - 完成表单后获取项目 ID
   - 将 README 中的 `%PROJECT_ID%` 替换为真实 ID

2. **启用分支保护审核（已配置）**
   - main 分支已禁止 force push
   - 已要求至少 1 个 PR review
   - 后续所有变更通过 Pull Request 合并

3. **发布首个 Release**
   - 在 GitHub 创建 v0.1.0 release 以提升 Packaging/Signed-Releases 得分

## 参考链接

- [OpenSSF Best Practices Criteria](https://www.bestpractices.dev/en/criteria)
- [TaskFlow Security Audit Report](./audit-report-2026-06-20.md)
