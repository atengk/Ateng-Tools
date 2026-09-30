# 02 — cURL 转换器 (cURL Converter)

**构建内容 (What to build):**
实现端到端 cURL 命令解析、透视与代码生成工具。用户粘贴 Bash `curl` 命令（包括带续行反斜杠的多行命令），自动生成整洁的 JavaScript Axios、现代原生 Fetch 以及 Java 11/21 HttpClient 代码片段。除代码生成外，提供可视化请求透视面板，结构化展示 URL 组成、Query 参数表、Header 请求头表、Request Body（带 JSON 自动美化格式化）以及认证凭据详情。

**前置依赖 (Blocked by):** 无 —— 可立即启动

**状态 (Status):** 已解决 (resolved)

- [x] 对 cURL 参数进行健壮的词法分词（`-X`、`-H`、`-d`、`--data-raw`、`-u`、`--url`、多行 `\` 与引号嵌套）。
- [x] 支持生成 JavaScript Axios 代码（`axios.request({...})`）。
- [x] 支持生成 JavaScript 现代原生 `fetch(...)` 代码。
- [x] 支持生成 Java 11/21 标准 `java.net.http.HttpClient` 代码。
- [x] 提供可视化透视标签页，展示解析出的 Method、URL、Query 参数表、Headers 表与 Body 视窗。
- [x] 提供“加载示例”按钮，预置带请求头和 JSON Body 的真实多行 cURL 样例。
- [x] `curl-converter.service.test.ts` 中的单元测试全部通过，覆盖 GET、POST JSON、表单数据、Basic Auth、Bearer Token 与多行命令。
- [x] 基于 Naive UI 实现完整 UI，完成工具注册与路由 `/curl-converter` 接入。
