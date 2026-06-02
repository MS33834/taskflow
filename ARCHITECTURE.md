# 🏗️ TaskFlow 架构文档

本文档详细描述 TaskFlow 的架构设计与实现细节。

---

## 📦 目录

1. [核心设计](#核心设计)
2. [状态管理](#状态管理)
3. [类型系统](#类型系统)
4. [组件库](#组件库)
5. [主题系统](#主题系统)
6. [导航系统](#导航系统)
7. [数据持久化](#数据持久化)

---

## 核心设计

### 分层架构

TaskFlow 采用标准的 MVVM 架构：
```
┌─────────────────────────┐
│   屏幕层 (Screens)     │  - 页面入口、布局编排
├─────────────────────────┤
│  组件层 (Components)   │  - 可复用 UI 单元
├─────────────────────────┤
│  状态层 (Store)        │  - 业务逻辑与状态管理
├─────────────────────────┤
│  类型层 (Types)        │  - 完整类型定义
└─────────────────────────┘
```

### 文件结构设计理念

```
screens/          -> 每一个页面
src/shared/       -> 共享代码
  ├── components/ -> 通用组件
  ├── store/      -> 全局状态
  └── types/      -> 类型定义
```

---

## 状态管理

### Zustand Store 设计

[`src/shared/store/index.ts`](file:///workspace/src/shared/store/index.ts) 是一个完整的 Zustand 状态管理：

#### 数据域

| 域 | 说明 |
|---|---|
| `tasks` | 任务列表 |
| `categories` | 分类列表 |
| `tags` | 标签列表 |
| `projects` | 项目列表 |
| `notes` | 笔记列表 |
| `goals` | 目标列表 |
| `habits` | 习惯列表 |
| `views` | 自定义视图列表 |
| `templates` | 模板列表 |
| `automations` | 自动化规则列表 |
| `searchHistory` | 搜索历史 |
| `settings` | 用户设置 |
| `theme` | 当前主题 |

#### 主要操作方法

**任务操作**
- `addTask()` - 添加任务
- `updateTask()` - 更新任务
- `deleteTask()` - 删除任务
- `toggleTaskComplete()` - 切换完成/未完成
- `archiveTask()` - 归档任务

**分类操作**
- `addCategory()` - 添加分类
- `updateCategory()` - 更新分类
- `deleteCategory()` - 删除分类

**标签操作**
- `addTag()` - 添加标签
- `updateTag()` - 更新标签
- `deleteTag()` - 删除标签
- `addTagToTask()` - 给任务打标签
- `removeTagFromTask()` - 移除任务标签

**子任务操作**
- `addSubtask()` - 添加子任务
- `updateSubtask()` - 更新子任务
- `deleteSubtask()` - 删除子任务
- `toggleSubtaskComplete()` - 切换子任务状态

**附件/评论操作**
- `addAttachment()` - 添加附件
- `addComment()` - 添加评论

**检查项操作**
- `addChecklistItem()` - 添加检查项
- `toggleChecklistItem()` - 切换检查项
- `deleteChecklistItem()` - 删除检查项

**设置操作**
- `updateSettings()` - 更新设置
- `setTheme()` - 切换主题
- `setSidebarOpen()` - 侧边栏开关
- `setSyncConfig()` - 同步配置

**数据操作**
- `loadData()` - 加载所有数据
- `saveData()` - 保存所有数据
- `resetData()` - 重置所有数据
- `exportData()` - 导出数据
- `importData()` - 导入数据

---

## 类型系统

[`src/shared/types/index.ts`](file:///workspace/src/shared/types/index.ts) 包含超过 1500 行完整的类型定义。

### 核心类型

#### Task
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  content: string;
  dueDate: Date | null;
  priority: Priority;
  status: TaskStatus;
  categoryId: string | null;
  projectId: string | null;
  tags: string[];
  subtasks: Subtask[];
  checklist: ChecklistItem[];
  attachments: Attachment[];
  comments: Comment[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  estimatedTime: number;
  actualTime: number;
  recurrence: RecurrenceRule | null;
}
```

#### Category
```typescript
interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
  taskCount: number;
}
```

#### Theme
```typescript
interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    divider: string;
    card: string;
    overlay: string;
  };
}
```

### 导航类型

```typescript
interface RootStackParamList {
  Main: undefined;
  TaskDetail: { taskId?: string };
  Categories: undefined;
  Tags: undefined;
  Views: undefined;
  Templates: undefined;
  Automation: undefined;
}

interface MainTabParamList {
  HomeTab: undefined;
  CalendarTab: undefined;
  CreateTab: undefined;
  AnalyticsTab: undefined;
  SearchTab: undefined;
}

interface HomeStackParamList {
  Home: undefined;
  TaskDetail: { taskId?: string };
  Projects: undefined;
  Goals: undefined;
  Habits: undefined;
  Notes: undefined;
  Settings: undefined;
}
```

---

## 组件库

### Common Components (通用组件)

[`src/shared/components/common/`](file:///workspace/src/shared/components/common/)

| 组件 | 文件 | 说明 |
|---|---|---|
| Button | Button.tsx | 通用按钮 |
| Card | Card.tsx | 通用卡片容器 |
| Input | Input.tsx | 文本输入组件 |
| Modal | Modal.tsx | 模态弹窗 |
| Select | Select.tsx | 下拉选择器 |
| DatePicker | DatePicker.tsx | 日期选择器 |
| TagInput | TagInput.tsx | 标签输入/选择 |
| TaskCard | TaskCard.tsx | 任务卡片 |
| SwipeableTaskCard | SwipeableTaskCard.tsx | 可滑动任务卡片 |
| Skeleton | Skeleton.tsx | 骨架屏加载态 |

### View Components (视图组件)

[`src/shared/components/views/`](file:///workspace/src/shared/components/views/)

| 组件 | 文件 | 说明 |
|---|---|---|
| KanbanView | KanbanView.tsx | 看板视图 |
| GanttView | GanttView.tsx | 甘特图视图 |
| TimelineView | TimelineView.tsx | 时间线视图 |
| TableView | TableView.tsx | 表格视图 |
| TimeBlockView | TimeBlockView.tsx | 时间块视图 |
| MindMapView | MindMapView.tsx | 思维导图视图 |

---

## 主题系统

### 主题对象

主题系统定义在 [`src/shared/store/index.ts`](file:///workspace/src/shared/store/index.ts)。

#### 默认主题 (`default`)
- 浅色背景
- 蓝色系主色调

#### 深色主题 (`dark`)
- 深色背景
- 高对比度文字
- 护眼模式

### 自定义主题
所有主题颜色均可通过 `updateSettings` 修改。

---

## 导航系统

### 导航结构

```
NavigationContainer
└── MainTabNavigator (Bottom Tab)
    ├── HomeTab
    │   └── HomeStackNavigator
    │       ├── Home (首页)
    │       ├── TaskDetail (任务详情)
    │       ├── Projects (项目)
    │       ├── Goals (目标)
    │       ├── Habits (习惯)
    │       ├── Notes (笔记)
    │       └── Settings (设置)
    ├── CalendarTab (日历)
    ├── CreateTab (创建)
    ├── AnalyticsTab (统计)
    └── SearchTab (搜索)
```

### 底部导航标签

| 标签 | 图标 | 屏幕 |
|---|---|---|
| 任务 | content_paste | Home |
| 日历 | calendar_today | Calendar |
| + | add_circle | Create |
| 统计 | bar_chart | Analytics |
| 搜索 | search | Search |

---

## 数据持久化

### 存储方案

使用 **AsyncStorage** 进行本地持久化。

### 数据结构

```typescript
interface PersistenceState {
  tasks: Task[];
  categories: Category[];
  tags: Tag[];
  projects: Project[];
  notes: Note[];
  goals: Goal[];
  habits: Habit[];
  views: View[];
  templates: Template[];
  automations: Automation[];
  searchHistory: string[];
  settings: Settings;
  theme: string;
}
```

### 数据加载与保存

- `loadData()` - 应用启动时自动调用
- `saveData()` - 每次状态变更后自动调用
- 数据通过 `deepClone()` 复制后保存，确保不可变性

---

## 📱 屏幕设计

### 首页 ([HomeScreen.tsx](file:///workspace/screens/HomeScreen.tsx))

布局：
- 顶部：标题 + 设置按钮 + 搜索框
- 统计区：待完成/已完成/今日任务数
- 快速操作：日历/项目/目标/习惯/笔记
- 分类筛选：横向滚动
- 任务列表：可滑动卡片 (SwipeableTaskCard)

### 任务详情页 ([TaskDetailScreen.tsx](file:///workspace/screens/TaskDetailScreen.tsx))

完整编辑表单：
- 标题
- 描述
- 内容
- 到期日期
- 优先级
- 分类
- 项目
- 标签
- 子任务
- 检查项
- 附件
- 评论

---

## 🎨 设计规范

### 颜色系统

所有颜色集中在主题系统，支持：
- primary - 主色调
- secondary - 次色调
- background - 背景
- surface - 表面色
- text - 主要文字
- textSecondary - 次要文字
- border - 边框
- error/success/warning/info - 状态色

### 图标系统

使用 `@expo/vector-icons/MaterialIcons`，确保：
- 无 emoji 图标
- 平台一致性
- 可访问性

---

## 📚 相关文件

- [App.tsx](file:///workspace/App.tsx) - 导航入口
- [src/shared/store/index.ts](file:///workspace/src/shared/store/index.ts) - 状态管理
- [src/shared/types/index.ts](file:///workspace/src/shared/types/index.ts) - 类型定义
- [screens/](file:///workspace/screens/) - 所有屏幕
