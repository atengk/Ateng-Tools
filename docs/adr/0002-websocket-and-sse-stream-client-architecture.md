# 0002. WebSocket 与 SSE 客户端架构与流式解析决策

## 状态
已接受 (Accepted)

## 背景与上下文
在 Ateng-Tools 中引入实时通信与流式接口调试工具（WebSocket & SSE Stream Client），需要支持传统 WebSocket 双向测试与现代 Server-Sent Events (SSE) 流式监听（特别是大语言模型 LLM 流式输出与监控指标流）。
在纯浏览器运行环境下，存在三大核心限制与挑战：
1. 浏览器原生 `EventSource` 仅支持 `GET` 方法，且无法携带自定义 HTTP 请求头（如 `Authorization: Bearer <token>`），无法直接适配大模型 POST 流式 API。
2. 浏览器原生 `WebSocket` 规范禁止在握手阶段传递自定义 HTTP Headers。
3. 持续高频数据推送（如行情与日志流）易导致 DOM 节点膨胀与页面卡顿崩溃。

## 架构决策
1. **采用 Fetch + ReadableStream 自研 SSE 流式解码引擎**：
   摒弃受限的原生 `EventSource`，使用标准 `fetch()` 结合 `ReadableStream` 与 UTF-8 `TextDecoder`，纯客户端自研解析 `event:`、`data:`、`id:`、`retry:` 规范块。以此完整支持 `GET` 与 `POST` 请求、自定义 Headers 认证、JSON 请求体传递。
2. **WebSocket 鉴权双重落地策略**：
   受限于浏览器规范，不伪造不可行的握手 Header，而是提供显式 Query 参数表双向绑定与 Protocols 子协议配置，并支持“握手成功首包自动鉴权 (First-Packet Auth)”机制。
3. **分帧时间轴与大模型流式聚合双重视图**：
   提供离散 Message Frame 帧列表（方向、大小、时间戳）的同时，针对大模型流式返回支持 Stream Aggregator 聚合打字机模式，自动拼接 Markdown/文本渲染。
4. **环形缓冲与内存安全防御**：
   采用固定容量（默认 200 帧，可调）的 FIFO 环形缓冲区 (Frame Buffer) 控制 DOM 规模；提供智能滚动锁定，在用户回溯查看历史记录时自动暂停跳动。

## 后果与影响
- **正面影响**：完美兼顾大模型流式与常规全双工通信调试；100% 遵守纯前端安全与零泄露基线；保障高并发消息下的流畅体验。
- **代价与权衡**：需自主在纯客户端处理网络分片中跨块不完整行缓冲区的拼接（Buffer Stitching），需通过完备单元测试验证边界场景。
