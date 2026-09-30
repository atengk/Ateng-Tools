# Ateng-Tools

> 个人开发者在线工具箱，基于 Vue 3 + TypeScript + Vite + Naive UI 构建，部署于 GitHub Pages。

## 常用脚本命令

- `pnpm dev`: 启动本地开发服务器
- `pnpm build`: 执行生产环境打包（Vite 打包至 `dist`）
- `pnpm test:unit`: 运行单元测试（Vitest）
- `pnpm run script:create:tool <tool-name>`: 快速脚手架新建小工具

---

## Agent 技能配置 (Agent skills)

### 任务跟踪器 (Issue tracker)

基于 GitHub Issues 进行任务与需求跟踪（通过 `gh` CLI 交互）。详情参见 `docs/agents/issue-tracker.md`。

### 分类标签 (Triage labels)

包含五种标准分类角色：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。详情参见 `docs/agents/triage-labels.md`。

### 领域文档 (Domain docs)

单上下文架构（根目录 `CONTEXT.md` + `docs/adr/`）。详情参见 `docs/agents/domain.md`。

---

## 开发与交付规范 (Development & Delivery Guidelines)

### 1. 工单流程与提交门禁 (Workflow & Push Gate)

- **严格停留在本地工作区**：任务开发完成后，代码必须严格停留在本地 Working Tree 供用户在浏览器中热更新审阅。**未获得用户明确发出的“开启进入下一个工单”或显式提交指令前，严禁自主执行 `git commit`、严禁 `git push`、严禁关闭 GitHub Issue**。
- **免全量构建与免语法检查**：单工具开发完成后无需运行 `pnpm build`，亦无需运行 `pnpm typecheck`（由用户在浏览器界面中直观审核）；只需运行相关功能单元测试（Vitest）验证纯函数逻辑。
- **显式授权后原子闭环**：收到用户确认验收与推进指令后，方可执行精准暂存、原子化 Conventional Commit、推送到 `main` 分支并通过 `gh issue close` 闭环对应工单。

### 2. UI 与图标技术标准 (UI & Icon Standards)

- **全域标准图标库**：统一强制使用 `@vicons/tabler` 原生 SVG 组件，配合 Naive UI `<n-icon :component="Icon" />` 挂载。**严禁直接使用未经预设配置的 CSS 伪类图标（如 `i-mdi-*`）**，避免产生无色占位与排版基线坍塌。
- **按钮排版与基线对齐**：工具操作栏按钮组必须保持水平居中（`justify-center`）排布；所有按钮内的图标与文本必须保持像素级垂直居中对齐。

### 3. 全域深度中文与交互反馈 (Localization & Feedback)

- **全域中文本地化**：页面标题、按钮文字、属性标签、统计单位及提示语统一采用规范中文，严禁残留未翻译英文或西文括号。
- **防重复提示**：使用复制能力时调用 `useCopy({ createToast: false })` 拦截底层自动弹窗，统一由业务层弹出单一语义化中文 Toast，杜绝多重提示。

