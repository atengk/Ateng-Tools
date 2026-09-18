# 04 — SQL DDL to Entity Converter

**What to build:** A MySQL DDL to Java Entity and TypeScript Interface converter. Users paste `CREATE TABLE` DDL statements to generate Java Entity classes aligned with MyBatis-Plus and Lombok (`@TableName`, `@TableId(type = IdType.ASSIGN_ID)`, `@TableLogic`, `LocalDateTime`, and Javadoc comments from SQL `COMMENT`), plus matching TypeScript interfaces.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] Robust MySQL DDL lexical parser extracting table name, table comment, columns, data types, constraints, and primary key.
- [x] Mappings aligned with engineering standards: `BIGINT` -> `Long`, `DATETIME`/`TIMESTAMP` -> `LocalDateTime`, `DECIMAL` -> `BigDecimal`, `TINYINT` -> `Integer`.
- [x] Annotation logic: `@TableName("table_name")`, `@TableId(type = IdType.ASSIGN_ID)` on primary key, `@TableLogic` on `deleted` column.
- [x] Extraction of column `COMMENT` into Javadoc comments (`/** ... */`) above properties.
- [x] TypeScript interface emission matching the table structure.
- [x] UI with split-pane layout, Load Sample button, and copy buttons.
- [x] Unit tests in `sql-ddl-to-entity.service.test.ts` pass and cover backticks, data types, comments, primary keys, and table annotations.
- [x] Tool registration and route `/sql-ddl-to-entity`.
