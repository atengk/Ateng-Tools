Status: ready-for-agent

# 工单 05: 集成与国际化本地化 (Integration and Internationalization)

## 概述 (Overview)
将 4 款工具集成到 Ateng-Tools 导航体系中，并在中英文语言包中注册完整的多语言翻译词条。

## 任务清单 (Tasks)
1. 将 4 款工具全部注册至 `src/tools/index.ts` 的 `Development`（开发）分类下。
2. 在 `locales/en.yml` 中添加完整的英文翻译词条（`tools.snowflake-id-analyzer.*`、`tools.curl-converter.*`、`tools.json-to-entity.*`、`tools.sql-ddl-to-entity.*`）。
3. 在 `locales/zh.yml` 中补齐配套的简体中文本地化词条。
4. 运行完整单元测试集（`pnpm test:unit`）与生产打包校验（`pnpm build`）。
