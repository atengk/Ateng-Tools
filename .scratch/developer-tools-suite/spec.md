Status: ready-for-agent

# 技术规格书：开发者高频工具套件 (雪花 ID 分析器、cURL 转换器、JSON 转实体、SQL DDL 转实体)

## 问题陈述 (Problem Statement)

在现代全栈与后端软件研发中，工程师每天都面临着大量重复且需要频繁切换上下文的数据转换工作：
1. **雪花 ID 解析与生成**：由分布式雪花算法生成的 ID 是一串 64 位不透明的长整型数字（例如 `1702983748293849088`）。当排查数据库异常、数据排序不一致或并发问题时，开发者若不编写额外脚本，无法直观了解该记录在何时生成、由哪台机器节点颁发以及其对应的自增序号。
2. **cURL 命令转代码与请求透视**：在调试 API 或从 Chrome 控制台、Postman 及服务器日志复现网络请求时，开发者通常复制出 `curl` 命令行。然而，要将该请求嵌入到自动化脚本、前端客户端（Axios、Fetch）或后端调用（Java HttpClient）中，需要耗费大量精力手工提取 Header、Query 参数、Auth Token 和请求体。
3. **JSON 转实体类与类型契约**：在对接第三方接口或定义前后端 DTO 时，工程师获取到 JSON 数据后必须手工编写 Java POJO/DTO 类（带 Lombok 和 Jackson 注解）或 TypeScript 接口。逐个属性定义类型、转换蛇形命名为驼峰命名、梳理嵌套类极为繁琐且易漏。
4. **SQL DDL 转 Java 实体与 TS 接口**：根据数据库建表脚本（`CREATE TABLE`）开发新需求时，开发者必须手动编写对应的 MyBatis-Plus ORM 实体类以及前端 Vue 组件使用的 TypeScript 接口，频繁添加 `@TableName`、`@TableId`、`@TableLogic` 注解，映射数据类型，并拷贝列注释。

目前市面上的在线工具往往充斥着广告，且存在将敏感的内网接口、鉴权 Token、数据库表结构和生产 ID 泄露至第三方外部服务器的巨大安全隐患。

## 解决方案 (Solution)

在 Ateng-Tools 的 `Development`（开发）分类下，打造由 4 款高频纯客户端工具组成的开发者套件，严格遵循 ADR 0001 离线安全规范：
1. **雪花 ID 分析器 (Snowflake ID Analyzer)**：支持 64 位二进制位段可视化拆解、时间戳/数据中心/工作节点/序列号解析、自定义 Epoch 时间零点、标准 Twitter 5+5+12 与 10+12 结构切换、单 ID 卡片透视以及多行批量分析表格。
2. **cURL 转换器 (cURL Converter)**：词法拆解 cURL 命令行并自动生成简洁规范的 JavaScript Axios、现代原生 Fetch 以及 Java 11+/21 HttpClient 代码，同时提供 Query 参数、Headers、Body 与 Auth 的结构化表格透视。
3. **JSON 转实体生成器 (JSON to Entity Converter)**：深度递归推断任意 JSON 结构并输出带 Lombok、Jackson `@JsonProperty`、静态内部类和驼峰转换的 Java DTO 类，以及同步输出 TypeScript 接口定义。
4. **SQL DDL 转实体生成器 (SQL DDL to Entity Converter)**：纯前端解析 MySQL 8.x `CREATE TABLE` 语句，自动映射生成标准 MyBatis-Plus 实体类（包含 `@TableName`、`@TableId(type = IdType.ASSIGN_ID)`、`@TableLogic`、`LocalDateTime` 与字段 Javadoc 注释）及配套 TypeScript 接口。

所有工具 **100% 在用户本地浏览器沙箱中执行**，零外部网络请求，保障数据绝对机密性。

## 用户故事 (User Stories)

### 雪花 ID 分析器 (Snowflake ID Analyzer)
1. 作为后端开发者，我希望能粘贴 64 位雪花 ID，以便立即查看其精准生成的年月日时分秒（毫秒级）及相对时间。
2. 作为分布式系统工程师，我希望能查看分段着色的 64 位二进制位谱（符号位、时间戳位、数据中心位、机器位、序列位），以便验证位对齐与算法正确性。
3. 作为开发者，我希望能自由切换 Twitter 标准 5+5+12 结构与 10+12 结构，以便适配不同公司定制的雪花实现规范。
4. 作为开发者，我希望支持配置自定义 Epoch 时间基准戳（毫秒或 ISO 格式），以便正确还原特定历史基准生成的 ID。
5. 作为排障工程师，我希望能一次性粘贴多行雪花 ID 进行批量分析，以便在可排序表格中直观比对每条记录的生成时间、机器编号与序列。
6. 作为测试工程师，我希望能有一个反向生成面板，指定时间、数据中心与节点来生成 Mock ID 测试夹具。
7. 作为开发者，当输入非法或非数字 ID 时能看到明确的错误提示，防止脏数据导致计算异常。

### cURL 转换器 (cURL Converter)
8. 作为前端开发者，我希望粘贴从 Chrome 开发者工具复制的 `curl` 命令后，能立即获得干净的 JavaScript Axios 代码片段并直接粘贴到 API 文件中。
9. 作为开发者，我希望能转换为现代原生 JavaScript `fetch` 代码，以便在轻量脚本或无第三方库环境下使用。
10. 作为 Java 开发者，我希望能转换为 `java.net.http.HttpClient` (JDK 11+/21) 代码，以便在后端单测或服务中复现接口调用。
11. 作为排查问题的开发者，我希望提供“请求透视”标签页，将 Method、URL、Query 参数表、Header 表和 Body 结构化展现，快速核对 Token 与参数。
12. 作为开发者，我希望解析器能健壮支持带续行反斜杠（`\`）或脱字符（`^`）的多行命令，原始终端命令粘贴即用。
13. 作为开发者，我希望解析器支持 `-H` 请求头与 `-d`/`--data`/`--data-raw` 载荷格式，并自动格式化 JSON 请求体。
14. 作为开发者，我希望提供“加载示例”按钮，以便快速体验复杂 cURL 命令的解析转换。
15. 作为开发者，我希望每段生成的代码都配备一键复制按钮，快速粘贴至 IDE。

### JSON 转实体生成器 (JSON to Entity Converter)
16. 作为 Java 后端开发者，我希望粘贴外部接口返回的 JSON 报文后，能自动生成带有 `@Data`、`@Builder`、`@NoArgsConstructor`、`@AllArgsConstructor` Lombok 注解的 Java 类。
17. 作为后端开发者，我希望 JSON 的下划线键名自动转换为 Java 驼峰命名，并附带 `@JsonProperty("original_key")` 注解，确保反序列化正常。
18. 作为后端开发者，我希望嵌套的 JSON 对象能转换为静态内部类（`public static class`），使复杂模型整洁包含在单个文件中。
19. 作为后端开发者，我希望 ISO-8601 日期字符串被智能推断为 `LocalDateTime`，长整数 ID 推断为 `Long`，而非泛化的 String 或 Integer。
20. 作为前端开发者，我希望切换目标语言为 TypeScript，以便生成对应的 TypeScript `interface` 定义并带可选字段标注。
21. 作为开发者，我希望能自由配置根类名和包名，使生成的代码无缝契合工程结构。

### SQL DDL 转实体生成器 (SQL DDL to Entity Converter)
22. 作为 Java 后端开发者，我希望粘贴 MySQL `CREATE TABLE` DDL 语句后，能生成带有 `@TableName("table_name")` 的完整 MyBatis-Plus 实体类。
23. 作为后端开发者，我希望主键列（如 `id BIGINT`）被自动识别并标注 `@TableId(type = IdType.ASSIGN_ID)`，以便自动适配雪花 ID 分配策略。
24. 作为后端开发者，我希望名为 `deleted` 的逻辑删除字段自动标注 `@TableLogic`，由 MyBatis-Plus 原生接管软删除。
25. 作为后端开发者，我希望 SQL 列的 `COMMENT` 注释能被自动提取为字段上方的 Javadoc `/** ... */` 文档注释，使实体类注释清晰完备。
26. 作为后端开发者，我希望 MySQL 数据类型（`BIGINT`、`INT`、`TINYINT`、`VARCHAR`、`TEXT`、`DATETIME`、`DECIMAL`）能够确定性映射为 Java 类型（`Long`、`Integer`、`Integer`、`String`、`String`、`LocalDateTime`、`BigDecimal`）。
27. 作为全栈工程师，我希望提供配套的 TypeScript 接口预览选项卡，以便前端表单组件复用同一模型。
28. 作为国际化用户，我希望四款工具的界面、标签、占位符与提示均全面支持中英文本地化。

## 实现决策 (Implementation Decisions)

- **架构定位与分类**:
  四款工具均置于 `src/tools/` 下对应目录，统一注册在 `src/tools/index.ts` 的 `Development` 分类下：
  - `src/tools/snowflake-id-analyzer/` (`/snowflake-id-analyzer`)
  - `src/tools/curl-converter/` (`/curl-converter`)
  - `src/tools/json-to-entity/` (`/json-to-entity`)
  - `src/tools/sql-ddl-to-entity/` (`/sql-ddl-to-entity`)
- **零服务端离线架构 (遵循 ADR 0001)**:
  所有词法解析与代码生成算法均在浏览器内存中运行，零网络请求。
- **纯函数服务层**:
  每个工具清晰拆分为：
  - `*.models.ts`：类型定义与配置接口。
  - `*.service.ts`：纯算法业务逻辑（BigInt 位运算、词法分词器、AST 遍历）。
  - `*.service.test.ts`：覆盖边缘用例的 Vitest 单元测试。
  - `*.vue`：基于 Naive UI 的响应式分栏界面与代码高亮器。
- **类型推断与规范约定**:
  - 雪花 ID：统一使用原生 JavaScript `BigInt` 处理，彻底防止 64 位整型精度丢失。
  - JSON 转 Java：采用标准 Spring Boot 3 与 Lombok 注解规范，无需外部笨重代码生成器。
  - SQL DDL 解析器：自研轻量级状态机解析表名、字段名、数据类型、长度、主键及注释。

## 测试决策 (Testing Decisions)

- **核心切缝**:
  四款工具的唯一核心测试切缝统一为 **服务层 (`*.service.ts`)**。
  针对 Service 函数进行测试能够覆盖最高层级的业务逻辑，同时保持测试 100% 确定性、无头化且高速运行。
- **测试矩阵与覆盖**:
  1. `snowflake-id-analyzer.service.test.ts`：
     - 测试 Twitter 标准雪花 ID 分解（时间戳、数据中心、节点、序号）；
     - 测试 10+12 节点结构；
     - 测试自定义 Epoch 偏移量推算；
     - 测试批量多行 ID 解析；
     - 测试逆向组装回 64 位 ID；
     - 测试非法输入、负数和越界防御。
  2. `curl-converter.service.test.ts`：
     - 测试基础带 Query 参数的 GET 请求；
     - 测试带 JSON Body 与自定义 Header 的 POST 请求（`-H`、`--data`）；
     - 测试反斜杠续行的多行 Shell 语法；
     - 测试 Basic Auth 与 Bearer Token 解析；
     - 测试生成 Axios、Fetch 与 Java HttpClient 代码的准确性。
  3. `json-to-entity.service.test.ts`：
     - 测试基础标量类型（字符串、数值、布尔值、空值）；
     - 测试 ISO 日期时间推断为 `LocalDateTime`；
     - 测试整型与浮点型推断区分；
     - 测试嵌套对象生成静态内部类；
     - 测试对象数组合并 Schema；
     - 测试下划线转驼峰与 `@JsonProperty`；
     - 测试 TypeScript interface 生成。
  4. `sql-ddl-to-entity.service.test.ts`：
     - 测试标准 MySQL `CREATE TABLE` 反引号与注释解析；
     - 测试主键提取与 `@TableId(type = IdType.ASSIGN_ID)`；
     - 测试逻辑删除列 `deleted` 与 `@TableLogic`；
     - 测试类型映射规则（`BIGINT` -> `Long`、`DATETIME` -> `LocalDateTime`、`DECIMAL` -> `BigDecimal`）；
     - 测试表注释与列注释提取为 Javadoc；
     - 测试配套 TypeScript interface 输出。
- **既有范式**:
  沿用 `src/tools/` 现有单元测试体系，通过 `pnpm test:unit` 自动化运行。

## 范围外排除 (Out of Scope)

- 直连数据库或动态反向工程（仅支持静态 DDL 文本解析）。
- 远程执行 cURL 请求或网络代理转发（仅限代码生成与结构透视）。
- 生成完整的 Maven/Gradle 多模块工程脚手架（专注于单文件实体类/DTO 与内部类）。
- 解析非 MySQL 方言（如 Oracle、SQL Server 特有存储过程语法）。

## 补充说明 (Further Notes)

- 四款工具在 `locales/en.yml` 与 `locales/zh.yml` 中均已包含完整的中英文本地化翻译。
- 依赖项完全复用 `package.json` 中既有的库（`change-case`、`date-fns`、`naive-ui`、`@vicons/tabler` 等），零新增 npm 包。
