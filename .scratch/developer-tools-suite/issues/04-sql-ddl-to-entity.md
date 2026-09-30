# 04 — SQL DDL 转实体生成器 (SQL DDL to Entity Converter)

**构建内容 (What to build):**
实现 MySQL 建表 DDL 转 Java 实体类与 TypeScript 接口工具。用户粘贴 `CREATE TABLE` DDL 语句，自动生成符合 MyBatis-Plus 与 Lombok 规范的 Java 实体类（包含 `@TableName`、`@TableId(type = IdType.ASSIGN_ID)`、`@TableLogic`、`LocalDateTime` 以及从 SQL `COMMENT` 提取的 Javadoc 注释），以及对应的 TypeScript 接口。

**前置依赖 (Blocked by):** 无 —— 可立即启动

**状态 (Status):** 已解决 (resolved)

- [x] 健壮的 MySQL DDL 词法解析器，提取表名、表注释、列字段、数据类型、约束与主键。
- [x] 契合工程规范的类型映射：`BIGINT` -> `Long`、`DATETIME`/`TIMESTAMP` -> `LocalDateTime`、`DECIMAL` -> `BigDecimal`、`TINYINT` -> `Integer`。
- [x] 完整注解逻辑：`@TableName("table_name")`、主键 `@TableId(type = IdType.ASSIGN_ID)`、`deleted` 字段 `@TableLogic`。
- [x] 提取列 `COMMENT` 为字段上方的 Javadoc 注释（`/** ... */`）。
- [x] 输出与表结构对应的 TypeScript interface 接口代码。
- [x] 分栏布局 UI，包含“加载示例”按钮与一键复制代码按钮。
- [x] `sql-ddl-to-entity.service.test.ts` 中的单元测试全部通过，覆盖反引号、类型映射、注释提取、主键识别与表级注解。
- [x] 完成工具注册与路由 `/sql-ddl-to-entity` 接入。
