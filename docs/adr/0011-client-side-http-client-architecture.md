# 0011. 纯客户端轻量级 HTTP 接口调试客户端架构决策 (HTTP Client)

## 状态
已接受 (Accepted)

## 背景与上下文
在现代 Web 与微服务研发中，API 接口联调、数据验证和前后端协作是开发者的核心高频诉求。虽然市场上存在 Postman、Apifox 等重量级 API 管理套件，但其日趋臃肿庞杂（强制云端同步、繁琐的团队工作区、启动缓慢），且往往将用户请求与敏感凭据上传至云端服务器，存在安全审计与数据泄露隐患。

开发者在日常调试时，往往仅需要一个“即开即用、无账号绑定、极简轻量、零数据离开本地”的单接口调试工具。在 Ateng-Tools 纯客户端离线安全架构（依据 [ADR-0001](0001-client-side-dev-tools-architecture.md)）基线下，无法运行任何后端代理服务，且浏览器受制于同源策略（CORS）。因此，需要构建一套既符合全站零后端离线隐私底线，又能提供流畅请求调试体验的纯客户端 HTTP 客户端。

## 架构决策

经过深度问辩与领域建模（Grilling Session），确立以下核心架构与设计决策：

### 1. 命名与全站八大领域分类归属
- **统一规范命名**：模块目录与路由标识统一命名为 `http-client`，多语言中文名称为 **HTTP 客户端**，英文名称为 **HTTP Client**。在领域术语表（`CONTEXT.md`）中确立 `HTTP Client`，明确避免使用商业商标及泛化词汇（如 Postman Clone、API Tester、Request Builder）。
- **分类落位 `dev` (开发运维)**：依据 [ADR-0006](0006-canonical-tool-taxonomy-and-category-consolidation.md)，HTTP 接口调试核心服务于后端与微服务接口联调、代码生成与实时测试，与同分类下的 `curl-converter`（cURL 转换器）、`websocket-and-sse-client`（WebSocket/SSE 流式客户端）及 `mock-data-generator`（Mock 数据生成）具备高度的心智契合与协同链路，统一归入 `dev` 分类。

### 2. 零后端与浏览器 CORS 边界防御策略 (CORS Diagnostic Guard)
- **100% 纯客户端直连**：坚守零后端红线，全部网络请求通过浏览器原生 `window.fetch` 直接发起，绝不架设或接入任何远端代理服务器，确保用户的内网地址、Token、业务载荷零泄漏。
- **智能 CORS 诊断机制**：当目标接口未配置 `Access-Control-Allow-Origin` 响应头导致请求失败时，客户端捕获 `TypeError: Failed to fetch` 异常，精准激活 `CORS Diagnostic Guard`：
  1. 向开发者清晰展示跨域拦截根因（CORS 预检 OPTIONS 拦截或同源策略限制）；
  2. 提供明确的排查方案（如服务端放行 CORS、浏览器临时启动跨域参数等）；
  3. **一键 cURL 降级闭环**：提供“复制为 cURL 命令”，便于开发者在无跨域限制的本地终端（Terminal）或脚本中直接复现。

### 3. 请求生命周期与执行控制 (Execution Lifecycle)
- **主动取消支持**：单次请求均绑定独立的 `AbortController` 信号句柄。
- **双态交互控制**：请求处于 In-flight 状态时，操作栏“发送请求”按钮动态转换为“取消请求”（附带 Loading 旋转动画），点击即刻触发 `controller.abort()` 释放连接。
- **超时保护机制**：支持可配置的超时时间限制（默认 30 秒，支持 5s / 10s / 30s / 60s），超时自动中断连接并给予超时反馈，防止弱网或无响应接口造成界面长期挂起。

### 4. 双向响应式请求契约模型 (Bi-directional Request Spec)
- **URL 与 Query 双向响应式同步**：URL 输入框与 Query 参数键值对表格建立响应式双向数据流。在 URL 框直接输入 `?key=val` 自动拆解进表格，在表格中增删改参数实时组装回写至 URL，杜绝数据割裂。
- **多类型载荷编辑器**：
  1. `none`：无请求体；
  2. `json`：内置 JSON 语法高亮、一键格式化与语法校验，输入时智能提示或自动补齐 `Content-Type: application/json` 请求头；
  3. `form-data`：支持文本键值与本地文件选取（`<input type="file">` 自动封装为 `FormData`）；
  4. `x-www-form-urlencoded`：表单键值对自动编码；
  5. `raw`：纯文本、XML、HTML 等自定义文本。
- **便捷 Auth 快速鉴权**：支持 `Bearer Token` 与 `Basic Auth` 模式，自动计算 Base64 凭据并同步至 `Authorization` 请求头。

### 5. 响应快照与抗溢出呈现 (Response Snapshot & Layout Resilience)
- **三维响应状态条**：呈现语义化着色的状态码徽章（2xx 成功绿、3xx 重定向蓝、4xx 客户端错误橙、5xx 服务端错误红）、高精度耗时统计（毫秒）与响应体传输尺寸。
- **抗溢出 Tab 容器**：
  1. **响应体 (Body)**：针对 JSON 响应提供格式化高亮，在 `<n-code>` 容器上严格启用 `word-wrap` 自适应断词折行，外层包裹 `overflow-x-auto` 滚动容器，彻底防范超长文本穿透卡片右侧边界；
  2. **响应头 (Headers)**：键值对只读表格，支持过滤与单项/全量复制；
  3. **已发送详情 (Request Sent)**：完整呈现实际打到服务端的请求要素，便于追溯。

### 6. 轻量历史记录与 LocalStorage 配额防御 (History Storage Safety)
- **FIFO 环形缓冲**：基于 `localStorage` 维护最近 20 条请求历史记录队列。
- **响应体截断隔离**：历史条目中仅完整持久化 `RequestSpec`（请求要素）以及响应的元数据摘要（状态码、耗时、数据大小、时间戳），**坚决不将全量 Response Body 写入 LocalStorage**，彻底杜绝数兆响应数据打爆浏览器 5MB 配额上限的隐患。
- **秒级重放**：点击历史条目可毫秒级将历史请求参数还原至编辑器，一键再次发送。

### 7. 与 cURL 转换器的高内聚生态联动 (cURL Synergy)
- 深度复用 `curl-converter` 模块经过充分测试的 Bash 词法分词器与 cURL 解析引擎。
- 支持在 HTTP 客户端中一键粘贴任意标准 cURL 命令直接解析填充全部请求要素（Method、URL、Headers、Auth、Body）。
- 支持一键导出当前编辑的所有请求为标准 cURL 语法，并提供“在 cURL 转换器中打开”快捷入口，无缝生成 Axios、Fetch、OkHttp 等多语言客户端代码。

## 后果与影响

- **正面影响**：
  - 彻底离线、无账号、零数据上云，为开发者提供最高安全等级的日常调试工具；
  - 极简轻量，秒级启动与极低内存开销，没有重型套件的臃肿包袱；
  - 完备的 CORS 引导与 cURL 双向互通，形成闭环无缝的接口开发调试链路；
  - 数据模型与存储策略高度防御，彻底免疫本地存储配额溢出。
- **代价与权衡**：
  - 纯客户端架构下，受限于浏览器安全沙箱，无法直接请求未配置 CORS 的非白名单跨域接口，必须通过 cURL 降级到终端运行；
  - 浏览器原生 `fetch` 出于安全规范禁止由脚本直接篡改受限请求头（如 `Host`、`Origin`、`Referer`、`Cookie` 等），受限头将由浏览器自动接管或通过 cURL 导出执行。
