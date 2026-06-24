# CII Best Practices

TaskFlow is working toward the [OpenSSF Best Practices](https://www.bestpractices.dev/) badge.

## Current Status

| Criterion | Status |
|-----------|--------|
| **Public repo** | ✅ GitHub + GitCode |
| **FLOSS license** | ✅ MIT |
| **Documentation** | ✅ README, ARCHITECTURE, inline API docs |
| **Working build** | ✅ CI builds pass on all PRs |
| **Vulnerability reporting** | ✅ SECURITY.md with responsible disclosure |
| **Static analysis** | ✅ CodeQL + ESLint + ruff in CI |
| **Dynamic analysis (fuzz)** | ✅ Hypothesis-based fuzz tests in CI |
| **Dependency review** | ✅ Dependabot + dependency-review workflow |
| **Secret scanning** | ✅ gitleaks in CI |
| **Branch protection** | ✅ main requires PR + 1 approval + status checks |
| **Pinned dependencies** | ✅ Actions pinned by SHA, pip --require-hashes |
| **Hardened CI** | ✅ step-security/harden-runner on all jobs |
| **Security policy** | ✅ SECURITY.md + Scorecard monitoring |

## How to help

- Review PRs promptly to maintain the Code-Review score.
- Ensure all new code goes through PRs (no direct pushes to main).
- Keep dependencies updated via Dependabot.
