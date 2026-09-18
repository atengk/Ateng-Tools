Status: ready-for-agent

# Issue 05: Integration and Internationalization

## Overview
Integrate all 4 tools into Ateng-Tools navigation and register full English and Simplified Chinese localization strings.

## Tasks
1. Register all 4 tools into `src/tools/index.ts` under the `Development` category.
2. Add comprehensive English translation strings to `locales/en.yml` under `tools.snowflake-id-analyzer.*`, `tools.curl-converter.*`, `tools.json-to-entity.*`, and `tools.sql-ddl-to-entity.*`.
3. Add matching Simplified Chinese translation strings to `locales/zh.yml`.
4. Run full test suite (`pnpm test:unit`) and build verification (`pnpm build`).
