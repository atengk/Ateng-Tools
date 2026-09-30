# 03 — JSON 转实体生成器 (JSON to Entity Converter)

**构建内容 (What to build):**
实现纯客户端 JSON 转强类型模型生成工具。用户粘贴任意 JSON 数据，自动生成包含 Lombok `@Data`、`@Builder`、Jackson `@JsonProperty`、静态内部类与驼峰字段命名的 Java DTO/POJO 类，以及匹配的 TypeScript `interface` 接口定义。提供可配置项以自定义根类名、包名以及注解开关。

**前置依赖 (Blocked by):** 无 —— 可立即启动

**状态 (Status):** 已解决 (resolved)

- [x] 递归类型推断，支持标量类型、对象与数组。
- [x] 智能类型启发式推断：ISO-8601 日期字符串推断为 `LocalDateTime`，大整数推断为 `Long`，浮点数推断为 `Double`/`BigDecimal`。
- [x] 下划线命名（snake_case）自动转驼峰命名（camelCase），同时保留 `@JsonProperty("original_key")`。
- [x] 嵌套子对象自动生成为规整的静态内部类（`static class`）或独立类。
- [x] 输出带可选属性与嵌套子接口的 TypeScript interface 定义。
- [x] 分栏代码编辑器 UI，包含格式化控制项与一键复制按钮。
- [x] `json-to-entity.service.test.ts` 中的单元测试全部通过，覆盖嵌套对象、数组、日期推断、null 与命名转换。
- [x] 完成工具注册与路由 `/json-to-entity` 接入。
