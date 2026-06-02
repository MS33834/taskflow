# GitHub Actions 自动构建 Android 应用

## 🚀 快速开始

本项目已配置 GitHub Actions 工作流，可以自动化构建 Android 应用！

## 📋 工作流概览

项目包含两个主要的工作流任务：

### 1. **Local Build Test**（本地构建测试）
- ✅ 自动运行 TypeScript 类型检查
- ✅ 验证项目结构
- ✅ 安装依赖并测试
- **不需要** Expo 账号

### 2. **Build Android APK**（完整 APK 构建）
- ⚙️ 使用 EAS 构建
- 📱 生成可安装的 APK 文件
- **需要**配置 Expo Token

## 🔧 设置步骤

### 第一步：将代码推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit: Todo App"
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

### 第二步：配置 GitHub Secrets（可选，用于完整构建）

如果需要自动构建真实的 APK 文件：

1. 前往 [Expo 网站](https://expo.dev/)注册账号
2. 登录后，访问 [https://expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)
3. 创建一个新的访问令牌（Access Token）
4. 复制这个令牌
5. 前往你的 GitHub 仓库 -> **Settings** -> **Secrets and variables** -> **Actions**
6. 点击 **New repository secret**
7. Name: `EXPO_TOKEN`
8. Value: 粘贴你刚才复制的 Expo 访问令牌
9. 点击 **Add secret**

### 第三步：触发构建

#### 方式一：推送代码自动触发
```bash
git add .
git commit -m "Update code"
git push
```

#### 方式二：手动触发（推荐用于测试）
1. 前往你的 GitHub 仓库
2. 点击 **Actions** 标签
3. 选择 **Build Android App** 工作流
4. 点击 **Run workflow** 按钮
5. 选择分支，点击 **Run workflow**

## 📁 工作流文件说明

- [`.github/workflows/build-android.yml`](file:///workspace/.github/workflows/build-android.yml) - GitHub Actions 配置文件

### 工作流触发条件

- **自动触发**: 推送代码到 main 或 master 分支，或创建 Pull Request
- **手动触发**: 在 GitHub Actions 页面手动运行

## 📊 查看构建结果

### 在 GitHub 上查看

1. 进入你的 GitHub 仓库
2. 点击 **Actions** 标签
3. 选择最近的工作流运行记录
4. 点击进入查看详情
5. 下载 **Artifacts**（构建产物）

### 本地测试

你也可以在本地运行项目验证：

```bash
# 类型检查
npx tsc --noEmit

# 项目验证
node test-build.js

# 启动开发服务器
npm start
```

## 🎯 功能特性

### 当前工作流已实现

- ✅ 自动代码检出
- ✅ Node.js 环境配置
- ✅ npm 依赖安装（带缓存）
- ✅ TypeScript 类型验证
- ✅ 项目结构验证
- ✅ 构建报告生成
- ✅ 产物上传（Artifacts）

### 高级功能（需要 EXPO_TOKEN）

- 📱 真实 Android APK 构建
- 🚀 EAS Build 集成
- 📦 自动构建产物管理

## 🔍 构建产物

成功构建后，你可以在 GitHub Actions 页面下载：

- **build-report.txt** - 构建验证报告
- **build-artifacts** - 完整的项目文件（可选）
- **APK 文件**（需要配置 EXPO_TOKEN）

## 📝 常见问题

### Q: 为什么需要 Expo Token？
A: 真正的 APK 构建需要使用 Expo 的 EAS Build 服务，这需要认证。项目验证任务不需要 Token，可以立即运行。

### Q: 构建需要多长时间？
A: 
- 项目验证：约 2-3 分钟
- 完整 APK 构建：约 10-20 分钟（首次构建可能更长）

### Q: 构建失败了怎么办？
A:
1. 查看 GitHub Actions 日志
2. 检查是否有 TypeScript 错误
3. 确认所有依赖正确安装
4. 查看 `test-build.js` 的输出

### Q: 如何自定义构建配置？
A: 编辑 [`.github/workflows/build-android.yml`](file:///workspace/.github/workflows/build-android.yml) 文件，可以调整：
- Node.js 版本
- 触发条件
- 构建步骤
- 产物保留时间

## 🛠️ 本地开发命令

在推送到 GitHub 前，建议先本地测试：

```bash
# 安装依赖
npm install

# 类型检查
npx tsc --noEmit

# 项目验证
node test-build.js

# 启动开发服务器
npm start
```

## 📱 下一步

1. ✅ 将代码推送到 GitHub
2. ⚙️ （可选）配置 EXPO_TOKEN
3. 🚀 触发 GitHub Actions 构建
4. 📦 下载构建产物

## 📚 相关文档

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Expo EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [README.md](file:///workspace/README.md) - 项目主文档
- [BUILD.md](file:///workspace/BUILD.md) - 详细构建指南

---
**祝你构建顺利！** 🎉
