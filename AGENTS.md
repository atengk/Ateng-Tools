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
