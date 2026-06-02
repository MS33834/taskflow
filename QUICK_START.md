# 🚀 TaskFlow 快速开始 - 跨平台！

**在 Web、Android 或 iOS 上运行！** 🎉

---

## 🌐 方法一：Web 版本（最简单！）⭐️⭐️⭐️⭐️⭐️

直接在浏览器中打开！

### 本地运行
```bash
cd /workspace
npm install
npm run web
```
然后在浏览器中打开 http://localhost:19006！

### 或者 GitHub Pages（即将上线！）
工作流完成后，您的应用将在此处上线：
`https://badhope.github.io/TaskFlow`

---

## 📱 方法二：立即用手机测试（简单！）

### 步骤 1：安装 Expo Go
- **Android**: https://play.google.com/store/apps/details?id=host.exp.exponent
- **iOS**: https://apps.apple.com/app/expo-go/id982107779

### 步骤 2：启动开发服务器
```bash
cd /workspace
npm start
```

### 步骤 3：扫码体验
打开 Expo Go，扫描终端显示的二维码，立即使用！

---

## 💻 方法三：本地构建 APK（推荐！）⭐️⭐️⭐️⭐️

### 前置要求
- Node.js (已安装)
- Java 17+
- 不需要 Android Studio！

### 构建步骤
```bash
# 1. 安装依赖
npm install

# 2. 预生成原生代码
npx expo prebuild --platform android

# 3. 进入 Android 目录
cd android

# 4. 构建 Debug APK
./gradlew assembleDebug  # Windows: gradlew.bat assembleDebug

# 5. APK 位置
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔍 方法四：检查 GitHub Actions 状态

访问：https://github.com/badhope/TaskFlow/actions
- 查看最新的工作流运行
- 下载构建报告
- Web 自动部署到 GitHub Pages！

---

## 📋 当前项目状态

✅ 完整的 Todo 应用代码  
✅ **跨平台！(Web、Android、iOS)**  
✅ GitHub Pages 部署工作流  
✅ GitHub Actions 简单验证已配置  
✅ 项目已上传到 GitHub：https://github.com/badhope/TaskFlow  
✅ TypeScript 类型安全  
✅ 美观的用户界面  

---

## 🎯 推荐流程

### 最简单的方案（强烈推荐！）
1. **先试方法一**：Web 版本！在浏览器中打开！
2. **再试方法二**：用 Expo Go 在手机上测试
3. **满意后方法三**：为 Android 构建 APK
4. **长期使用**：使用 Web 版本或安装 APK！

---

## 💡 平台选项

| 平台 | 运行方式 | 难度 |
|------|----------|------|
| **Web**  | `npm run web` | ⭐️ 最简单！ |
| **Android (Expo Go)** | `npm start` + 扫码 | ⭐️ 简单！ |
| **Android (APK)** | 本地构建 | ⭐️⭐️ 中等 |
| **iOS (Expo Go)** | `npm start` + 扫码 | ⭐️ 简单！ |

---

## 🆘 遇到问题？

### Expo Go 扫描没反应？
- 确保手机和电脑在同一 WiFi
- 检查防火墙设置
- 尝试重新运行 `npm start`

### 本地构建失败？
- 确保 Java 17+ 已安装
- 检查 JAVA_HOME 环境变量
- **优先用 Web 或 Expo Go 测试！**

### Web 版本无法运行？
- 确保依赖已安装：`npm install`
- 尝试再次运行 `npm run web`

---

## 📚 更多帮助

查看这些文件：
- [README.md](./README.md) - 完整项目概述
- [BUILD_APK.md](./BUILD_APK.md) - 详细 APK 构建指南
- [releases/README.md](./releases/README.md) - 发布信息
