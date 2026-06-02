# ❓ TaskFlow 常见问题 (FAQ)

本文档收集了使用 TaskFlow 时常见的问题及解答。

---

## 📱 开发与运行

### Q: 项目运行不起来怎么办？
**A:**
1. 确保已安装依赖：`npm install`
2. 删除缓存并重新启动：
   ```bash
   rm -rf node_modules
   npm install
   npm start -- --clear
   ```
3. 检查 Node.js 版本（需要 v18+）

### Q: Web 版本在哪里访问？
**A:** 运行 `npm run web` 后，浏览器会自动打开，通常是 http://localhost:19006

### Q: TypeScript 报错如何解决？
**A:**
1. 确保 `tsconfig.json` 配置正确
2. 运行类型检查：`npx tsc --noEmit`
3. 安装缺失的类型依赖

---

## 🚀 构建与部署

### Q: 如何构建 APK？
**A:** 有三种方式：
1. **EAS Build（推荐）**：查看 [BUILD_APK.md](BUILD_APK.md)
2. **本地构建**：查看 [APK_BUILD_GUIDE.md](APK_BUILD_GUIDE.md)
3. **GitHub Actions**：查看 [GITHUB_BUILD.md](GITHUB_BUILD.md)

### Q: 构建 APK 需要什么环境？
**A:**
- JDK 17+
- Node.js 18+
- (可选) Android Studio

### Q: 为什么 GitHub Actions 构建失败？
**A:** 请检查：
1. 代码是否有 TypeScript 错误
2. 依赖是否正确安装
3. 查看 Actions 日志中的具体错误

---

## 🎨 主题与界面

### Q: 如何切换深色主题？
**A:** 进入「设置」页面 → 点击「主题」进行切换。

### Q: 可以自定义主题颜色吗？
**A:** 目前使用预设主题，未来会支持自定义颜色配置。

### Q: 界面布局在小屏幕上有问题怎么办？
**A:** 应用使用响应式设计，支持各种屏幕尺寸。如有问题，请在 GitHub 上提 issue。

---

## 💾 数据管理

### Q: 数据存储在哪里？
**A:** 所有数据存储在设备本地（AsyncStorage）。

### Q: 如何备份数据？
**A:** 进入「设置」→「数据与存储」→ 点击「导出数据」。

### Q: 数据会丢失吗？
**A:** 应用会自动保存所有更改。如果卸载应用，数据会被清除，建议定期导出备份。

### Q: 如何导入数据？
**A:** 进入「设置」→「数据与存储」→ 点击「导入数据」。

### Q: 如何重置所有数据？
**A:** 进入「设置」→「数据与存储」→ 点击「重置所有数据」（会删除所有数据，请谨慎操作）。

---

## 📋 功能使用

### Q: 如何添加子任务？
**A:** 打开任务详情 → 找到「子任务」部分 → 点击「添加子任务」。

### Q: 如何给任务打标签？
**A:** 打开任务详情 → 找到「标签」部分 → 选择或创建标签。

### Q: 滑动手势如何使用？
**A:** 在首页任务列表中：
- **右滑** → 标记任务完成
- **左滑** → 删除任务

### Q: 如何切换任务视图？
**A:** 目前可通过「视图」页面查看不同视图（看板、甘特图等）。

---

## 🛠️ 技术问题

### Q: 使用了哪些库？
**A:** 主要技术栈：
- React Native + Expo
- TypeScript
- Zustand (状态管理)
- React Navigation (导航)
- Material Icons (图标)

### Q: 项目架构是怎样的？
**A:** 查看 [ARCHITECTURE.md](ARCHITECTURE.md) 了解详细架构设计。

### Q: 如何贡献代码？
**A:** 查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解贡献指南。

---

## 📞 更多帮助

如果以上 FAQ 不能解决您的问题：
1. 查看 [README.md](README.md) - 主文档
2. 查看 [QUICK_START.md](QUICK_START.md) - 快速开始
3. 查看 [ARCHITECTURE.md](ARCHITECTURE.md) - 架构文档
4. 在 GitHub 仓库提交 Issue

---

**还在开发中！** 欢迎提出更多问题！
