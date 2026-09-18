# Ateng-Tools

> 个人开发者在线工具箱，基于 Vue 3 + TypeScript + Vite + Naive UI 构建，部署于 GitHub Pages。

## 常用脚本命令

- `pnpm dev`: 启动本地开发服务器
- `pnpm build`: 执行生产环境打包（Vite 打包至 `dist`）
- `pnpm test:unit`: 运行单元测试（Vitest）
- `pnpm run script:create:tool <tool-name>`: 快速脚手架新建小工具

---

## Agent skills

### Issue tracker

Local markdown files in `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`CONTEXT.md` + `docs/adr/` at the repo root). See `docs/agents/domain.md`.
