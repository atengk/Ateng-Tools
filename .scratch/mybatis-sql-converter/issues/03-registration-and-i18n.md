# 03 — 工具注册、路由接入与双语国际化 (Tool Registration, Routing, and Bilingual i18n Localization)

**构建内容 (What to build):**
将 `mybatis-sql-converter` 工具注册至 Ateng-Tools 的 `Development` 分类下，挂载路由 `/mybatis-sql-converter`，配置对应领域图标，并在 `locales/en.yml` 与 `locales/zh.yml` 中补齐完整的双语国际化翻译条目。确保项目测试与打包构建完全通过。

**前置依赖 (Blocked by):** 02 — UI 组件与 SQL 美化排版集成

**状态 (Status):** 已解决 (resolved)

- [x] 导出包含名称、路由 `/mybatis-sql-converter`、图标和关键词的 Tool 定义
- [x] 在 `src/tools/index.ts` 中注册至 `Development` 分类
- [x] 在 `locales/en.yml` 与 `locales/zh.yml` 中添加双语翻译键值（标题、描述、控制项、占位符）
- [x] 验证 `pnpm test:unit` 测试全部通过且 `pnpm build` 打包无误
