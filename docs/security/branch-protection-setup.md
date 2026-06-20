# 分支保护设置

本文件提供一段可通过 [GitHub CLI (`gh`)](https://cli.github.com/) 执行的分支保护命令，用于将 `main` 分支的 `enforce_admins` 设为 `true`。

> ⚠️ **警告**：执行此命令后，**包括管理员在内的所有人均无法直接 push `main` 分支**。请在当前所有必要变更（包括本合规 PR）合并完成后再运行。

## 前置条件

- 已安装并登录 `gh`：`gh auth status`
- 对目标仓库具有管理员权限

## 命令

```bash
OWNER=MS33834
REPO=taskflow
BRANCH=main

gh api "repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" \
  --method PUT \
  --field enforce_admins=true \
  --field required_pull_request_reviews[dismiss_stale_reviews]=true \
  --field required_pull_request_reviews[require_code_owner_reviews]=false \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]="Lint" \
  --field required_status_checks[contexts][]="Backend Tests & Fuzz" \
  --field required_status_checks[contexts][]="Verify Project Setup" \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

## 验证

```bash
gh api "repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" --jq '.enforce_admins.enabled'
```

返回 `true` 表示管理员也无法绕过分支保护规则。

## 说明

- `required_status_checks[contexts][]=continuous-integration` 要求 CI 上下文名称为 `continuous-integration`。如果仓库实际使用的 status check 名称不同，请替换为对应名称。
- 运行本命令后，后续所有对 `main` 的修改都必须通过 Pull Request 合并。
