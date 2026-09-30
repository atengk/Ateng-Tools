# 01 — 核心解析与还原引擎 (Core Parser and Restoration Engine)

**构建内容 (What to build):**
实现纯客户端 Service 服务函数，接收多行原始控制台日志，过滤杂质前缀（时间戳、日志级别、线程名），精准识别 Preparing Statement 模板与 Parameter Token，执行平衡分词，按数据类型安全转义并注入 `?` 占位符，健全处理无参查询与参数数量不匹配等边界用例。通过完善的 Vitest 单元测试覆盖各类真实 MyBatis 日志场景。

**前置依赖 (Blocked by):** 无 —— 可立即启动。

**状态 (Status):** 已解决 (resolved)

- [x] 从带有元数据前缀的控制台日志中提取一条或多条 Preparing Statement
- [x] 将每条语句与其对应的 Parameters 行正确关联配对
- [x] 正确识别并原样保留无参数查询为合法可执行 SQL
- [x] 仅在非嵌套括号和引号之外按逗号分词（完美支持 JSON 字符串等复杂格式）
- [x] 类型安全转换：String/Date/Timestamp/Time 包裹单引号并转义内部引号；Integer/Long/Double/BigDecimal 不加引号；null 映射为 SQL NULL；Boolean 按用户设置转换
- [x] 占位符数量与参数个数不匹配时友好发出警告且不崩溃
- [x] 完善的 Vitest 单元测试且 100% 通过
