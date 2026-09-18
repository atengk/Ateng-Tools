# 03 — Tool Registration, Routing, and Bilingual i18n Localization

**What to build:**
Register the `mybatis-sql-converter` tool into the Ateng-Tools catalog under the `Development` category, define its route at `/mybatis-sql-converter`, select an appropriate icon, and add complete bilingual translations to both `locales/en.yml` and `locales/zh.yml`. Ensure the application builds and tests pass cleanly.

**Blocked by:** 02 — UI Component and Prettify Integration

**Status:** resolved

- [x] Export tool definition with name, route path `/mybatis-sql-converter`, icon, and keywords
- [x] Register tool in `src/tools/index.ts` under the `Development` category
- [x] Add bilingual translation entries in `locales/en.yml` and `locales/zh.yml` (title, description, input/output labels, controls, placeholders)
- [x] Verify `pnpm test:unit` passes and `pnpm build` completes without errors
