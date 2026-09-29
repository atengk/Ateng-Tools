/**
 * WebSocket 与 SSE 流式调试助手数据模型定义
 *
 * @author Ateng
 * @since 2026-09-28
 */

/**
 * 支持的通信协议类型
 */
export type ConnectionProtocol = 'ws' | 'sse';

/**
 * 连接生命周期状态
 */
export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

/**
 * 消息帧传输方向
 */
export type MessageDirection = 'send' | 'receive' | 'system';

/**
 * 单条不可变消息帧模型 (Message Frame)
 */
export interface MessageFrame {
  /** 唯一标识符 */
  id: string
  /** 传输方向 (send: 客户端发出, receive: 服务端返回, system: 状态变更/日志) */
  direction: MessageDirection
  /** 通信协议 */
  protocol: ConnectionProtocol
  /** 产生时间戳 (毫秒) */
  timestamp: number
  /** 格式化后的时间字符串 (HH:mm:ss.SSS) */
  formattedTime: string
  /** 原始文本内容 */
  raw: string
  /** 是否为合法的 JSON 格式 */
  isJson: boolean
  /** 解析后的 JSON 结构化数据 (若是合法的 JSON) */
  parsedJson?: unknown
  /** 报文字节大小 (字节数) */
  byteSize: number
  /** 摘要或事件标题 (如系统连接事件说明、自定义 SSE 事件名称) */
  summary?: string
}

/**
 * WebSocket 连接配置模型
 */
export interface WebSocketConfig {
  /** WebSocket 服务端地址 (ws:// 或 wss://) */
  url: string
}

/**
 * URL Query 查询参数键值项
 */
export interface QueryParamItem {
  /** 参数名 */
  key: string
  /** 参数值 */
  value: string
  /** 是否启用此参数 */
  enabled: boolean
}

/**
 * 握手成功首包自动鉴权配置 (First-Packet Auth)
 */
export interface FirstPacketAuthConfig {
  /** 是否开启首包自动鉴权 */
  enabled: boolean
  /** 待自动发送的认证报文载荷 */
  payload: string
}

/**
 * 心跳保活定时器配置 (Heartbeat Pinger)
 */
export interface HeartbeatConfig {
  /** 是否开启自动心跳 */
  enabled: boolean
  /** 心跳触发间隔 (秒) */
  intervalSeconds: number
  /** 心跳探测载荷 */
  payload: string
}

/**
 * 指数退避断线自动重连配置 (Auto-reconnect)
 */
export interface AutoReconnectConfig {
  /** 是否开启自动重连 */
  enabled: boolean
  /** 最大重试次数 */
  maxRetries: number
  /** 基础重试间隔延迟 (毫秒) */
  baseDelayMs: number
}

/**
 * WebSocket 高级连接综合配置
 */
export interface WebSocketAdvancedOptions {
  /** Query 查询参数列表 */
  queryParams: QueryParamItem[]
  /** 子协议 (Sec-WebSocket-Protocol) 列表 */
  protocols: string[]
  /** 首包鉴权配置 */
  firstPacketAuth: FirstPacketAuthConfig
  /** 心跳保活配置 */
  heartbeat: HeartbeatConfig
  /** 自动重连配置 */
  autoReconnect: AutoReconnectConfig
}

/**
 * HTTP 请求头键值对模型
 */
export interface HttpHeaderItem {
  /** 请求头名称 (如 Authorization, Content-Type) */
  key: string
  /** 请求头值 */
  value: string
  /** 是否启用此请求头 */
  enabled: boolean
}

/**
 * SSE 支持的 HTTP 请求方法
 */
export type HttpMethod = 'GET' | 'POST';

/**
 * SSE 流式连接请求综合配置 (SSE Stream Engine Config)
 */
export interface SSERequestConfig {
  /** 目标接口 URL (http:// 或 https://) */
  url: string
  /** 请求方法 (GET / POST) */
  method: HttpMethod
  /** 自定义请求头列表 */
  headers: HttpHeaderItem[]
  /** 请求体 (POST 请求时生效，通常为 JSON 格式) */
  body: string
}

/**
 * 解析完成的单个 SSE 协议事件块 (Server-Sent Event Block)
 */
export interface SSEParsedEvent {
  /** 事件类型 (对应 event: 行，默认为 message) */
  event?: string
  /** 数据负载内容 (对应 data: 行，多行自动以 \n 拼接) */
  data: string
  /** 事件唯一 ID (对应 id: 行) */
  id?: string
  /** 建议重试间隔 (毫秒，对应 retry: 行) */
  retry?: number
  /** 完整的原始事件块文本 */
  rawBlock: string
}

/**
 * 大模型流式聚合分析产物模型 (Stream Aggregator Result)
 */
export interface StreamAggregateResult {
  /** 聚合拼接后的完整文本内容 */
  text: string
  /** 聚合的增量片段 (Chunk / Token) 计数 */
  chunkCount: number
  /** 聚合后的字符总长度 */
  charCount: number
  /** 首帧到尾帧耗时统计 (毫秒) */
  durationMs: number
}

/**
 * 环形缓冲队列配置模型 (Frame Buffer Config)
 */
export interface FrameBufferConfig {
  /** 最大保留帧数 (默认 200，超过将自动 FIFO 剔除旧帧) */
  maxSize: number
}

/**
 * 常用载荷预设项模型 (Payload Preset Item)
 */
export interface PayloadPresetItem {
  /** 唯一标识 */
  id: string
  /** 预设名称 */
  title: string
  /** 详细描述或备注 */
  description?: string
  /** 载荷报文内容 (通常为 JSON 或纯文本) */
  payload: string
  /** 适用的通信协议 (ws / sse / all) */
  protocol: ConnectionProtocol | 'all'
  /** 创建时间戳 (毫秒) */
  createdAt: number
  /** 是否为系统内置的推荐模板预设 (内置预设不可删除) */
  isBuiltin?: boolean
}

/**
 * 客户端配置状态自动持久化模型 (Client Persistent State)
 */
export interface ClientPersistentState {
  /** 当前激活协议 */
  activeProtocol: ConnectionProtocol
  /** WebSocket 服务端地址 */
  wsUrl: string
  /** WebSocket Query 查询参数表 */
  queryParams: QueryParamItem[]
  /** WebSocket 子协议输入 */
  subprotocolsInput: string
  /** 是否开启首包自动鉴权 */
  firstPacketAuthEnabled: boolean
  /** 首包自动鉴权载荷 */
  firstPacketAuthPayload: string
  /** 是否开启自动心跳 */
  heartbeatEnabled: boolean
  /** 心跳触发间隔 (秒) */
  heartbeatInterval: number
  /** 心跳探测载荷 */
  heartbeatPayload: string
  /** 是否开启自动重连 */
  autoReconnectEnabled: boolean
  /** 最大重试次数 */
  maxRetries: number
  /** WebSocket 发送消息输入内容 */
  sendPayload: string
  /** SSE 目标接口地址 */
  sseUrl: string
  /** SSE 请求方法 */
  sseMethod: HttpMethod
  /** SSE 自定义请求头表 */
  sseHeaders: HttpHeaderItem[]
  /** SSE POST 请求体内容 */
  sseBody: string
  /** 环形缓冲区上限帧数 */
  frameBufferSize: number
}

/**
 * 大模型流式问答轮次模型 (Stream Turn Item)
 */
export interface StreamTurnItem {
  /** 唯一标识符 */
  id: string
  /** 轮次序号 (从 1 开始递增) */
  turnIndex: number
  /** 触发发起时间戳 (毫秒) */
  startTime: number
  /** 传输完成时间戳 (毫秒) */
  endTime?: number
  /** 请求提示词或描述摘要 */
  promptSummary?: string
  /** 当前轮次聚合文本正文 */
  text: string
  /** 接收到的流式片段 (chunks) 计数 */
  chunkCount: number
  /** 累计字符数 */
  charCount: number
  /** 累计耗时 (毫秒) */
  durationMs: number
  /** 是否已结束传输 */
  isCompleted: boolean
}
