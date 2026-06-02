# 📋 TaskFlow 更新日志 (Changelog)

所有重要变更都会记录在此文件。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased]

---

## v1.1.0 - 2026-06-02

> 🎉 **对外展示就绪** - 本次更新聚焦"门面"工程：图标、预览图、文档、跨平台兼容。

### ✨ 新增

#### 高级交互
- 🤖 **AI 任务建议** ([TaskSuggestions.tsx](src/shared/components/common/TaskSuggestions.tsx)) - 5 种智能建议
  - 时间建议：按完成时段分析
  - 优先级建议：过期/老任务自动标 urgent
  - 分类建议：识别用户最活跃分类
  - 合并建议：检测相似标题任务
  - 子任务建议：长描述任务建议拆分
- 🔊 **白噪声播放** ([WhiteNoisePlayer.tsx](src/shared/components/common/WhiteNoisePlayer.tsx)) - 6 种程序化生成
  - 白噪声 / 粉噪声 / 棕噪声（数学算法）
  - 雨声 / 海浪 / 森林（合成算法）
  - Web Audio API（仅 Web 端，移动端友好提示）
- 💬 **@ 提及** ([MentionInput.tsx](src/shared/components/common/MentionInput.tsx)) - 评论协作
  - `@` 触发 + 实时成员建议浮层
  - 文本高亮 + 自动补全
  - `renderMentionText` 工具函数
- 🖐️ **拖拽排序** ([DraggableList.tsx](src/shared/components/common/DraggableList.tsx)) - PanResponder 实现
  - 长按 250ms 激活
  - 实时计算目标 index
  - spring 动画回弹
  - **跨平台** - 不依赖 reanimated/gesture-handler

#### 资源与文档
- 🎨 **App 图标** - 1024×1024 SVG 渐变图标（蓝→紫）
- 🎨 **启动图** - 1284×1284
- 🎨 **Favicon** - 64×64 SVG（GitHub Social Preview）
- 🎨 **Apple Touch Icon** - 180×180
- 📐 **README 预览图** - 3 张矢量 SVG 示意图
  - `home.svg` - 首页 / 详情 / 专注
  - `views.svg` - 日历 / 统计 / 看板
  - `drag.svg` - 拖拽重排
- 📝 **README.md 大改版**
  - 顶部徽章、亮点表格、预览图、平台状态表
  - 清晰的功能分层（核心 / 高级 / 数据 / UX）
  - 完整 15 屏幕列表

### 🔧 改进

#### Store
- 新增 `reorderTasks(tasks)` 方法 - 持久化拖拽结果到 `order` 字段
- 优化数据结构，order 字段可追溯

#### HomeScreen
- 新增 `swap-vert` 按钮 → 全屏 Modal → DraggableList 重排
- 新增 `<TaskSuggestions />` 横幅
- 智能建议处理：优先级应用 / 分类切换 / 任务合并

#### TaskDetailScreen
- 评论输入框替换为 `<MentionInput />`
- 评论渲染使用 `renderMentionText` 高亮 @ 提及
- 6 个虚拟成员（当前用户 + Alice/Bob/Carol/David/Eve）

#### FocusMode
- 新增 `music-note` / `volume-up` 切换按钮
- 展开后显示 `<WhiteNoisePlayer />`
- 不打断专注会话，可选背景音

#### app.json
- 配置 `icon`、`splash`、`adaptiveIcon`、`favicon`、`bundleIdentifier`
- 升级到 1.1.0

### ✅ 跨平台兼容验证

| 组件 | Web | Android | iOS | 降级方案 |
|---|---|---|---|---|
| DraggableList | ✅ | ✅ | ✅ | - |
| WhiteNoisePlayer | ✅ Web Audio | ⚠️ 提示+震动 | ⚠️ 提示+震动 | Vibration |
| MentionInput | ✅ | ✅ | ✅ | - |
| TaskSuggestions | ✅ | ✅ | ✅ | - |
| PanResponder | ✅ | ✅ | ✅ | - |

### 🧪 质量验证
- ✅ TypeScript 严格模式: **0 errors**
- ✅ Web build: **5.5 MB bundle**
- ✅ Push 到 GitHub: `77e4acf`

---

## v1.0.0 - 2025-06-01

### ✨ 主要功能

#### 核心任务管理
- ✅ 创建、编辑、删除任务
- ✅ 标记任务完成/未完成
- ✅ 任务详情页，支持完整内容编辑
- ✅ 任务分类管理
- ✅ 任务标签管理
- ✅ 子任务管理
- ✅ 检查项（Checklist）管理
- ✅ 附件管理
- ✅ 评论管理

#### 数据管理模块
- ✅ 项目管理
- ✅ 目标管理
- ✅ 习惯追踪
- ✅ 笔记管理
- ✅ 模板管理
- ✅ 自动化规则
- ✅ 自定义视图管理

#### 多视图展示
- ✅ 看板视图 (Kanban)
- ✅ 甘特图视图 (Gantt)
- ✅ 时间线视图 (Timeline)
- ✅ 表格视图 (Table)
- ✅ 时间块视图 (Time Block)
- ✅ 思维导图视图 (Mind Map)

#### 用户体验
- ✅ 首页重构为底部导航栏
- ✅ 滑动手势（左滑删除，右滑完成）
- ✅ 骨架屏加载态
- ✅ 空状态提示
- ✅ Material Icons 替代所有 emoji 图标
- ✅ 完整暗色/浅色主题切换
- ✅ 搜索功能与搜索历史
- ✅ 任务筛选与排序

#### 高级功能（P1 完善）
- ✅ 全局 Toast 通知系统
- ✅ 番茄钟计时器（25/5/15 分钟循环）
- ✅ NLP 快速添加任务
- ✅ Undo 撤销包装器
- ✅ QuickAddTask 快速添加组件
- ✅ EmptyState / LoadingState / ErrorState
- ✅ 全局键盘快捷键
- ✅ 多选批量操作（Things 3 风格）
- ✅ 专注模式（Forest 风格）
- ✅ 任务依赖关系可视化
- ✅ 语音输入（Web Speech API）

#### 设置与数据
- ✅ 完整设置页面
- ✅ 数据导出/导入
- ✅ 数据重置
- ✅ 本地缓存管理
- ✅ 通知开关
- ✅ 侧边栏开关

### 🏗️ 架构优化
- ✅ Zustand 状态管理完全重构（1100+ 行）
- ✅ TypeScript 类型系统完全完善（1500+ 行）
- ✅ 20 个通用组件
- ✅ 6 个视图组件
- ✅ 数据持久化与自动保存

### 📱 完整屏幕列表 (15个)
1. Home - 首页
2. TaskDetail - 任务详情
3. Calendar - 日历
4. Analytics - 统计
5. Goals - 目标
6. Habits - 习惯
7. Notes - 笔记
8. Projects - 项目
9. Categories - 分类
10. Tags - 标签
11. Views - 视图
12. Templates - 模板
13. Automation - 自动化
14. Search - 搜索
15. Settings - 设置

### 📚 文档
- ✅ 更新 README.md
- ✅ 新增 ARCHITECTURE.md（架构文档）
- ✅ 新增 CONTRIBUTING.md（贡献指南）
- ✅ 新增 FAQ.md（常见问题）
- ✅ 更新 QUICK_START.md
- ✅ 更新 GITHUB_BUILD.md
- ✅ 更新 BUILD_APK.md

### 🛠️ 技术栈
- React Native 0.73 + Expo 50
- TypeScript 5.x 严格模式
- Zustand 4 状态管理
- React Navigation v6 底部导航 + 堆栈导航
- Material Icons 6000+ 矢量图标
- Animated + PanResponder 手势系统

---

## 📝 早期版本

### 初始版本
- 基本任务管理
- 分类管理
- 侧边栏布局
