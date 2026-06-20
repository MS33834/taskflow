# Security Policy

## Supported Versions

The following versions of TaskFlow are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in TaskFlow, please report it responsibly.

- **Do not** open a public issue for security vulnerabilities.
- Email the maintainer at [security-taskflow@example.com](mailto:security-taskflow@example.com) with details.
  <!-- 注意：security-taskflow@example.com 仅为示例邮箱，正式项目上线前请替换为真实可用的安全团队邮箱。 -->
- Include steps to reproduce, affected versions, and any suggested fixes.

We aim to respond within 7 days and release a patch within 30 days for confirmed vulnerabilities.

## Security Practices

TaskFlow follows these security practices:

- Local-first architecture with optional end-to-end encrypted synchronization.
- SQLite database encrypted at rest using SQLCipher.
- Sensitive settings protected by user-defined lock methods.
- Automated secret scanning via gitleaks in CI.
- Dependency review and OSSF Scorecard monitoring enabled.

## Disclosure Policy

Once a fix is released, we will publish a security advisory and credit the reporter unless they prefer to remain anonymous.
