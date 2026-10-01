# Ateng-Tools

> 个人开发者在线工具箱，基于 Vue 3 + TypeScript + Vite + Naive UI 构建，部署于 GitHub Pages。

---

## 1. 核心架构与离线隐私红线 (Core Architecture & Privacy)

- **纯客户端离线安全架构 (Client-Side Offline First)**：
  - 依据 [ADR-0001](docs/adr/0001-client-side-dev-tools-architecture.md)，所有工具的计算、解析、编解码、代码生成与文件转换必须 **100% 在浏览器端内存中完成**。
  - **严禁引入任何未经确认的后端 API 或第三方外网服务**，确保用户的代码、SQL、密钥、Token、文档与图片等数据绝对不离开用户本地，坚守零数据泄漏底线。
- **核心技术栈基线**：
  - **框架与构建**：Vue 3.3（`<script setup lang="ts">`）+ TypeScript 5.2 + Vite 4
  - **UI 与样式**：Naive UI 2.35 + UnoCSS + `@vicons/tabler` 原生矢量图标
  - **状态与工具库**：Pinia 2.0 + VueUse 10 + date-fns + Vitest

---

## 2. 常用脚本命令 (Scripts)

- `pnpm dev`: 启动本地开发服务器（Vite 热更新）
- `pnpm build`: 执行生产环境全量打包（Vite 打包至 `dist`）
- `pnpm test:unit`: 运行单元测试套件（Vitest）
- `pnpm run script:create:tool <tool-name>`: 快速脚手架新建小工具模板

---

## 3. 标准工具五件套分层蓝图 (Standard 5-Layer Tool Blueprint)

每个小工具统一在 `src/tools/<tool-name>/` 目录下构建，必须遵循高内聚、职责严格解耦的五件套规范：

```
src/tools/<tool-name>/
├── index.ts                   # 工具元数据声明与路由导出
├── <tool-name>.vue            # 纯展示与交互视图层（Naive UI）
├── <tool-name>.service.ts     # 纯函数业务逻辑与算法服务层
├── <tool-name>.service.test.ts# Vitest 单元测试覆盖
└── <tool-name>.types.ts       # 核心模型、配置与入参出参类型契约
```

### 分层职责约束：
1. **元数据层 (`index.ts`)**：调用 `defineTool` 声明工具元数据，包括 `name`、`path`、`description`（绑定多语言键）、`keywords`、`icon`（强制使用 `@vicons/tabler` 原生组件）、`createdAt` 与分类归属，并在 `src/tools/index.ts` 中注册到对应分类。
2. **视图展示层 (`<tool-name>.vue`)**：仅负责 UI 渲染、表单交互与用户反馈。操作栏按钮组统一居中排布，严禁在视图层内堆砌复杂的解析算法或直接进行密集计算。
3. **业务服务层 (`<tool-name>.service.ts`)**：承载核心数据转换、词法解析或编解码逻辑。必须设计为**无状态纯函数 (Pure Functions)**，严禁依赖 DOM、BOM 或 Vue 响应式上下文，保证高度可测试性。
4. **单元测试层 (`<tool-name>.service.test.ts`)**：使用 Vitest 对业务服务层进行 100% 逻辑覆盖，全面验证主流程、边界格式（空值、超大值、特殊字符）及异常降级分支。
5. **类型契约层 (`<tool-name>.types.ts`)**：显式声明所有输入选项接口、输出实体模型及状态枚举，杜绝裸 `any`。

---

## 4. 国际化维护准则 (i18n Strategy)

- **仅维护中文与英文双语 (zh / en Only)**：
  - 全站新功能开发与存量维护**仅维护 `locales/zh.yml` 与 `locales/en.yml` 两份核心语言文件**。
  - **严禁花费精力修改或同步其他小语种文件**（如 `de.yml`、`es.yml`、`fr.yml`、`no.yml`、`pt.yml`、`uk.yml`、`vi.yml` 等）。
- **工具词条同步**：
  - 新增小工具时，必须在 `locales/zh.yml` 与 `locales/en.yml` 的 `tools.<tool-name>` 命名空间下同步声明 `title`（标题）与 `description`（简述）。

---

## 5. Agent 技能与协同规范 (Agent Skills)

### 任务跟踪器 (Issue tracker)
基于 GitHub Issues 进行任务、Spec 与需求跟踪（通过 `gh` CLI 交互）。详情参见 `docs/agents/issue-tracker.md`。

### 分类标签 (Triage labels)
包含五种标准分类角色：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。详情参见 `docs/agents/triage-labels.md`。

### 领域文档 (Domain docs)
单上下文架构（根目录 `CONTEXT.md` 统一术语表 + `docs/adr/` 架构决策记录）。探索与实现代码必须严格遵循统一术语表，严禁使用明确标明避免（_Avoid_）的自造词汇。详情参见 `docs/agents/domain.md`。

---

## 6. 开发与交付门禁 (Workflow & Push Gate)

- **严格停留在本地工作区 (Working Tree Review Gate)**：
  - 任务或单工具开发完成后，代码必须严格停留在本地工作区供用户在浏览器中通过 Vite 热更新审阅。
  - **未获得用户明确发出的“开启进入下一个工单”或显式提交指令前，严禁自主执行 `git commit`、严禁 `git push`、严禁关闭 GitHub Issue**。
- **显式授权后原子闭环**：
  - 收到用户确认验收与推进指令后，方可执行精准路径暂存（严禁 `git add .`）、遵循 Conventional Commits 规范原子化提交、推送到 `main` 分支并通过 `gh issue close <number>` 闭环工单。

---

## 7. 前端 UI 与交互技术标准 (UI & Interaction Standards)

- **全域标准矢量图标库**：
  - 统一强制使用 `@vicons/tabler` 原生 SVG 组件，配合 Naive UI `<n-icon :component="Icon" />` 挂载。
  - **严禁直接使用未经预设配置的 CSS 伪类图标（如 `i-mdi-*`）**，避免产生无色占位、样式丢失与排版基线坍塌。
- **按钮排版与基线对齐**：
  - 工具操作栏按钮组必须保持水平居中（`justify-center`）排布。
  - 所有按钮内的图标与文本必须保持像素级垂直居中对齐，维持整洁呼吸感。
- **防重复提示机制 (Toast Hygiene)**：
  - 使用复制能力时统一调用 `useCopy({ createToast: false })` 拦截底层自动弹窗，统一由业务组件层弹出单一语义化中文 Toast，杜绝双重弹窗干扰。
- **全域深度中文本地化**：
  - 页面标题、按钮文字、属性标签、统计单位（如“页”、“字符”、“词”）及操作反馈统一采用规范中文，严禁残留未翻译英文或西文标点括号。
