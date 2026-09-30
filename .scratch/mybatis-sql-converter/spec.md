Status: ready-for-agent

# 技术规格书：MyBatis SQL 日志还原转换器 (MyBatis SQL Log Converter)

## 问题陈述 (Problem Statement)

在基于 MyBatis 或 MyBatis-Plus 进行 Java 后端日常开发和排错调试时，运行时数据库查询日志通常将 SQL 模板与绑定参数分散打印在不同行（例如：`==>  Preparing: SELECT ... ?` 后跟随 `==> Parameters: 1(Long), 'foo'(String)`）。当排查慢查询、异常报错或数据不一致问题时，开发者频繁需要将这些 SQL 复制到数据库客户端（Navicat、DBeaver、DataGrip、MySQL CLI）中手动执行排查。手动将数十个 `?` 占位符逐个替换为对应类型的参数值、拼接单引号、转义内部特殊字符，以及从带有时间戳和线程名的冗余控制台日志中剥离 SQL，既繁琐又极易出错，显著拖慢研发排障效率。

## 解决方案 (Solution)

在 Ateng-Tools 中打造一款纯客户端小工具 —— **MyBatis SQL 日志还原转换器 (MyBatis SQL Log Converter)**。开发者可直接将原始多行控制台日志粘贴至输入框，工具将自动嗅探识别 Preparing Statement 模板行与 Parameters 参数行，按类型安全转义并注入参数值，将 `?` 占位符还原为完整、可独立执行的 SQL 语句。工具支持单次日志粘贴包含多条 SQL 的批量解析，依托项目既有的 `sql-formatter` 库提供多方言美化排版，并支持单条及全量一键复制。

## 用户故事 (User Stories)

1. 作为 Java 开发者，我希望能直接粘贴包含 `==>  Preparing:` 和 `==> Parameters:` 的原始控制台日志，以便自动提取出可执行的 SQL，无需手动清理杂质文本。
2. 作为 Java 开发者，我希望工具能自动忽略日志周围的时间戳、日志级别（`[DEBUG]`）、线程名和包路径，这样我无需在粘贴前手工清洗日志行。
3. 作为后端工程师，我希望字符串类型参数能够自动包裹单引号，并且内部的单引号能够自动转义，以确保生成的 SQL 语法合法且不报错。
4. 作为后端工程师，我希望数值类型（`Integer`、`Long`、`BigDecimal`、`Double`、`Float`、`Short`、`Byte`）保持无引号，以便数据库优化器能够正确使用数值索引。
5. 作为开发者，我希望 `null` 参数（如 `null(Null)` 或 `null`）能转换为不带引号的 SQL `NULL`，以便空值条件和插入操作能准确求值。
6. 作为开发者，我希望日期时间参数（如 `Timestamp`、`Date`、`Time`、`LocalDate`、`LocalDateTime`）自动包裹单引号，以便各数据库引擎能正常解析时间格式。
7. 作为开发者，我希望能自由配置布尔值参数（`Boolean`）输出为数字（`1` / `0`）或关键字（`TRUE` / `FALSE`），以契合目标数据库规范（如 MySQL tinyint 与 PostgreSQL boolean）。
8. 作为开发者，我希望无参数查询（不含 `?` 占位符且无参数行的 SQL）能被自动识别并原样输出为可执行 SQL，确保无参查询不被丢弃。
9. 作为开发者，我希望包含逗号、括号或 JSON 内容（如 `{"key":"val,1"}(String)`）的复杂字符串参数能被精准解析而不发生字段割裂，保证复杂数据结构还原无误。
10. 作为开发者，我希望能粘贴包含按序执行的多条不同 SQL 语句的连续日志块，一次性按顺序还原所有 SQL。
11. 作为开发者，我希望提供自动 SQL 美化排版开关与方言选择（如 MySQL、PostgreSQL、Oracle），以便长篇复杂查询清晰易读。
12. 作为开发者，当 Preparing 占位符数量与 Parameters 参数个数不一致时，我希望能看到明确的告警徽标提示，以便察觉日志截断问题，同时仍能查看部分还原的结果。
13. 作为开发者，我希望提供“加载示例”按钮，以便一键直观体验和了解工具功能。
14. 作为开发者，我希望提供“复制全部”按钮以及每条还原 SQL 独立的复制按钮，以便将整批事务或单个查询快速粘贴到数据库客户端。
15. 作为非英语用户，我希望工具界面、标签与提示信息全面支持中文与英文国际化本地化，以便在舒适的语言环境下使用。

## 实现决策 (Implementation Decisions)

- **架构定位与路由**:
  作为纯客户端组件在 Ateng-Tools 的 `Development` 分类下实现，挂载路由为 `/mybatis-sql-converter`。
- **解析算法策略**:
  - 扫描机制：按行处理多行输入文本，嗅探 `Preparing:` 关键字标记 Preparing Statement 的起始并捕获 SQL 模板。
  - 参数关联：对每个 Preparing Statement，向后检索归属于该语句的 `Parameters:` 行，直至遇到下一个 Preparing Statement 或文本结束；若无 Parameters 行则判定为无参 SQL。
  - 分词机制：采用括号/引号平衡状态机分词器，仅在非嵌套状态下的逗号处切分参数行，提取各个 `value(Type)` 或 `value` Token。
- **类型转换与引号规则**:
  - 空值：`null`, `(Null)`, `null(...)` -> `NULL`。
  - 数值：`(Integer)`, `(Long)`, `(BigDecimal)`, `(Double)`, `(Float)`, `(Short)`, `(Byte)`, `(Number)` -> 不加引号的字符串。
  - 布尔值：`(Boolean)` -> 根据用户配置输出为 `1`/`0` 或 `TRUE`/`FALSE`。
  - 字符串：`(String)`, `(Char)`, `(Character)` -> 包裹单引号 `'...'`，内部单引号转义为 `\'` 或 `''`。
  - 日期时间：`(Date)`, `(Time)`, `(Timestamp)`, `(LocalDate)`, `(LocalDateTime)` -> 包裹单引号 `'...'`。
  - 兜底推断：无明确类型标识时，若纯数字则不加引号，其余一律作为单引号字符串处理。
- **美化排版集成**:
  利用项目既有的 `sql-formatter` 库对还原后的 SQL 执行格式化，支持项目内现有的标准数据库方言。
- **布局与交互**:
  - 左右响应式双栏布局（小屏幕自动纵向堆叠）。
  - 左侧面板：多行文本输入区，附带“加载示例”、“清空”与“粘贴”快捷操作。
  - 右侧面板：顶部控制栏包含美化开关、方言选择器、布尔格式选择，下方展示还原 SQL 卡片列表及“复制全部”、单条复制按钮。
  - 占位符与参数数量不匹配时，展示醒目 Warning 告警胶囊。
- **国际化本地化**:
  在 `locales/en.yml` 与 `locales/zh.yml` 中的 `tools.mybatis-sql-converter.*` 节点下补全中英文字段。

## 测试决策 (Testing Decisions)

- **核心切缝**:
  严格聚焦于纯解析与还原服务函数 (`parseAndRestoreMyBatisLogs`)，仅验证外部可观测行为，不测试内部正则表达式细节。
- **测试矩阵**:
  - 基础单条包含复合类型（Integer、String、Date、null）的语句还原；
  - 单个混合杂乱日志段中包含多条 SQL 的批量解析；
  - 无参 SQL 语句（0 个 `?` 占位符）；
  - 参数内部包含逗号、括号和引号的复杂字符串（如 JSON 字符串）；
  - 占位符与参数数量不匹配的边界用例（验证部分填充与告警标记）；
  - 布尔值输出格式切换（`1/0` 与 `TRUE/FALSE`）；
  - `sql-formatter` 方言格式化测试。
- **既有范式**:
  沿用 `src/tools/` 现有单元测试规范（如 `xml-formatter.service.test.ts`、`token-generator.service.test.ts`），通过 `pnpm test:unit` 执行。

## 范围外排除 (Out of Scope)

- 逆向转换（将可执行 SQL 逆向转回 MyBatis XML `<select>` 或 `?` 预编译语句）。
- 远程数据库直连执行或连接池管理（工具严格定位为纯前端离线日志转换器）。
- 将查询历史持久化至远程服务器（仅存留于本地浏览器内存）。

## 补充说明 (Further Notes)

- 本工具完全不需要引入任何外部 npm 运行时依赖，`sql-formatter` 已是代码库成熟依赖。
