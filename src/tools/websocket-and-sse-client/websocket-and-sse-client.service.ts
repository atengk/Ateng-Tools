/**
 * WebSocket 与 SSE 流式调试助手核心业务服务
 *
 * @author Ateng
 * @since 2026-09-28
 */

import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import markdownit from 'markdown-it';
import type {
  ClientPersistentState,
  ConnectionProtocol,
  ConnectionState,
  MessageDirection,
  MessageFrame,
  PayloadPresetItem,
  QueryParamItem,
  SSEParsedEvent,
  SSERequestConfig,
  StreamAggregateResult,
  StreamTurnItem,
  WebSocketAdvancedOptions,
} from './websocket-and-sse-client.models';

/**
 * 格式化时间戳为 HH:mm:ss.SSS 格式
 *
 * @param timestamp 毫秒时间戳
 * @returns 格式化后的时间字符串
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const millis = String(date.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${millis}`;
}

/**
 * 计算 UTF-8 字符串的字节大小
 *
 * @param text 待测文本
 * @returns 字节数
 */
export function calculateByteSize(text: string): number {
  if (!text) {
    return 0;
  }
  return new TextEncoder().encode(text).length;
}

/**
 * 格式化字节大小为易读形式 (B, KB, MB)
 *
 * @param bytes 字节数
 * @returns 格式化尺寸字符串
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 创建单条不可变消息帧
 *
 * @param options 创建参数
 * @returns 构建完成的消息帧对象
 */
export function createMessageFrame(options: {
  direction: MessageDirection
  raw: string
  protocol?: ConnectionProtocol
  summary?: string
  customId?: string
}): MessageFrame {
  const now = Date.now();
  const raw = options.raw;
  let isJson = false;
  let parsedJson: unknown;

  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      parsedJson = JSON.parse(trimmed);
      isJson = true;
    }
    catch {
      isJson = false;
    }
  }

  return {
    id: options.customId || `frame_${now}_${Math.random().toString(36).substring(2, 9)}`,
    direction: options.direction,
    protocol: options.protocol || 'ws',
    timestamp: now,
    formattedTime: formatTimestamp(now),
    raw,
    isJson,
    parsedJson,
    byteSize: calculateByteSize(raw),
    summary: options.summary,
  };
}

/**
 * 校验 WebSocket 连接地址合法性
 *
 * @param url 待校验的 WebSocket 地址
 * @returns 校验结果与错误描述
 */
export function validateWebSocketUrl(url: string): { valid: boolean; error?: string } {
  if (!url || !url.trim()) {
    return { valid: false, error: '连接地址不能为空' };
  }
  const trimmed = url.trim();
  if (!trimmed.startsWith('ws://') && !trimmed.startsWith('wss://')) {
    return { valid: false, error: 'WebSocket 地址必须以 ws:// 或 wss:// 开头' };
  }
  try {
    const parsed = new URL(trimmed);
    if (!parsed.host) {
      return { valid: false, error: '无效的主机地址' };
    }
    return { valid: true };
  }
  catch {
    return { valid: false, error: 'URL 格式无效' };
  }
}

/**
 * 解析 WebSocket URL 中已有的 Query 参数列表与纯净基础地址
 *
 * @param fullUrl 包含或不包含参数的完整地址
 * @returns 基础地址与解析出的参数项列表
 */
export function parseWebSocketUrlQueryParams(fullUrl: string): {
  baseUrl: string
  queryParams: QueryParamItem[]
} {
  if (!fullUrl || !fullUrl.trim()) {
    return { baseUrl: '', queryParams: [] };
  }

  try {
    const parsed = new URL(fullUrl.trim());
    const queryParams: QueryParamItem[] = [];

    parsed.searchParams.forEach((value, key) => {
      queryParams.push({
        key,
        value,
        enabled: true,
      });
    });

    // 剔除查询参数与 Hash 后的基础 URL（精准保留原始路径输入风格）
    const questionIndex = fullUrl.indexOf('?');
    const hashIndex = fullUrl.indexOf('#');
    const cutIndex = questionIndex !== -1 && hashIndex !== -1
      ? Math.min(questionIndex, hashIndex)
      : questionIndex !== -1
        ? questionIndex
        : hashIndex;

    const baseUrl = cutIndex !== -1 ? fullUrl.substring(0, cutIndex).trim() : fullUrl.trim();
    return {
      baseUrl,
      queryParams,
    };
  }
  catch {
    // 无法正常解析为 URL 时，做基于字符串的降级拆分
    const questionIndex = fullUrl.indexOf('?');
    if (questionIndex === -1) {
      return { baseUrl: fullUrl.trim(), queryParams: [] };
    }
    const baseUrl = fullUrl.substring(0, questionIndex).trim();
    const queryStr = fullUrl.substring(questionIndex + 1).trim();
    const queryParams: QueryParamItem[] = [];

    queryStr.split('&').forEach((pair) => {
      if (!pair) {
        return;
      }
      const [k, v] = pair.split('=');
      queryParams.push({
        key: decodeURIComponent(k || ''),
        value: decodeURIComponent(v || ''),
        enabled: true,
      });
    });

    return { baseUrl, queryParams };
  }
}

/**
 * 将基础 URL 与配置好的 Query 参数表安全编译合成最终连接 URL
 *
 * @param baseUrl 基础连接地址
 * @param queryParams Query 参数项集合
 * @returns 编译后的完整 WebSocket 连接 URL
 */
export function compileWebSocketUrl(baseUrl: string, queryParams: QueryParamItem[]): string {
  if (!baseUrl || !baseUrl.trim()) {
    return '';
  }

  // 先剥离基础地址中原有的 search 部分，避免参数重复拼接
  const { baseUrl: cleanBaseUrl } = parseWebSocketUrlQueryParams(baseUrl);
  const effectiveBase = cleanBaseUrl || baseUrl.trim();

  const enabledParams = (queryParams || []).filter(
    item => item.enabled && item.key && item.key.trim().length > 0,
  );

  if (enabledParams.length === 0) {
    return effectiveBase;
  }

  const queryStrings = enabledParams.map(
    item => `${encodeURIComponent(item.key.trim())}=${encodeURIComponent(item.value || '')}`,
  );

  const delimiter = effectiveBase.includes('?') ? '&' : '?';
  return `${effectiveBase}${delimiter}${queryStrings.join('&')}`;
}

/**
 * 计算断线重连的指数退避延迟时间
 *
 * @param retryCount 当前重试计数 (从 0 开始)
 * @param baseDelayMs 基础重试延迟 (毫秒，默认 1000ms)
 * @param maxDelayMs 最大重试延迟上限 (毫秒，默认 30000ms)
 * @returns 计算后的延迟时间 (毫秒)
 */
export function calculateBackoffDelay(
  retryCount: number,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 30000,
): number {
  const delay = baseDelayMs * 1.5 ** Math.max(0, retryCount);
  return Math.min(Math.round(delay), maxDelayMs);
}

/**
 * 心跳保活定时调度器 (Heartbeat Pinger)
 *
 * @author Ateng
 * @since 2026-09-28
 */
export class HeartbeatScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private active = false;

  /**
   * 启动心跳定时器
   *
   * @param intervalSeconds 触发间隔 (秒)
   * @param onTick 每次心跳触发时的回调函数
   */
  public start(intervalSeconds: number, onTick: () => void) {
    this.stop();
    if (intervalSeconds <= 0) {
      return;
    }
    this.active = true;
    this.timer = setInterval(() => {
      if (this.active) {
        onTick();
      }
    }, intervalSeconds * 1000);
  }

  /**
   * 停止心跳定时器
   */
  public stop() {
    this.active = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 检查心跳是否处于激活状态
   *
   * @returns 是否激活
   */
  public isActive(): boolean {
    return this.active;
  }
}

/**
 * WebSocket 会话管理器回调接口
 */
export interface WebSocketSessionCallbacks {
  /** 状态变更回调 */
  onStateChange: (state: ConnectionState) => void
  /** 消息帧产生回调 */
  onFrame: (frame: MessageFrame) => void
}

/**
 * WebSocket 纯客户端会话管理封装（增强版：支持 Query 表、子协议、首包鉴权与心跳保活）
 *
 * @author Ateng
 * @since 2026-09-28
 */
export class WebSocketSession {
  private socket: WebSocket | null = null;
  private state: ConnectionState = 'DISCONNECTED';
  private callbacks: WebSocketSessionCallbacks;

  // 高级配置与调度器
  private currentUrl = '';
  private currentOptions?: WebSocketAdvancedOptions;
  private isManualDisconnect = false;
  private retryCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatScheduler = new HeartbeatScheduler();

  constructor(callbacks: WebSocketSessionCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 获取当前连接状态
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * 更新并分发连接状态
   */
  private setState(newState: ConnectionState) {
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  /**
   * 发起 WebSocket 连接（支持高级鉴权与保活配置）
   *
   * @param url WebSocket 目标地址
   * @param options 高级连接配置 (Query 参数、子协议、首包鉴权、心跳)
   */
  public connect(url: string, options?: WebSocketAdvancedOptions) {
    this.currentUrl = url;
    this.currentOptions = options;

    // 清理既有定时器
    this.clearReconnectTimer();
    this.heartbeatScheduler.stop();

    // 编译完整连接地址
    const fullUrl
      = options?.queryParams && options.queryParams.length > 0
        ? compileWebSocketUrl(url, options.queryParams)
        : url.trim();

    const validation = validateWebSocketUrl(fullUrl);
    if (!validation.valid) {
      this.setState('ERROR');
      this.callbacks.onFrame(
        createMessageFrame({
          direction: 'system',
          raw: validation.error || '连接校验失败',
          protocol: 'ws',
          summary: '连接参数错误',
        }),
      );
      return;
    }

    if (this.socket) {
      this.disconnect(false);
    }

    this.isManualDisconnect = false;
    this.setState('CONNECTING');
    this.callbacks.onFrame(
      createMessageFrame({
        direction: 'system',
        raw: `正在尝试连接至 ${fullUrl}...`,
        protocol: 'ws',
        summary: '发起连接',
      }),
    );

    try {
      // 提取合法的子协议
      const protocols = (options?.protocols || [])
        .map(p => p.trim())
        .filter(p => p.length > 0);

      this.socket
        = protocols.length > 0 ? new WebSocket(fullUrl, protocols) : new WebSocket(fullUrl);

      this.socket.onopen = () => {
        this.setState('CONNECTED');
        this.retryCount = 0; // 重置重试计数器

        this.callbacks.onFrame(
          createMessageFrame({
            direction: 'system',
            raw: `已成功连接至 ${fullUrl}${protocols.length > 0 ? ` (子协议: ${protocols.join(', ')})` : ''}`,
            protocol: 'ws',
            summary: '连接成功',
          }),
        );

        // 1. 首包自动鉴权 (First-Packet Auth)
        if (options?.firstPacketAuth?.enabled && options.firstPacketAuth.payload?.trim()) {
          this.callbacks.onFrame(
            createMessageFrame({
              direction: 'system',
              raw: '连接已建立，立即自动发出首包鉴权报文 (First-Packet Auth)',
              protocol: 'ws',
              summary: '首包鉴权触发',
            }),
          );
          this.send(options.firstPacketAuth.payload);
        }

        // 2. 启动心跳保活器 (Heartbeat Pinger)
        if (options?.heartbeat?.enabled && options.heartbeat.intervalSeconds > 0) {
          const payload = options.heartbeat.payload || 'ping';
          this.heartbeatScheduler.start(options.heartbeat.intervalSeconds, () => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
              this.send(payload);
            }
          });
        }
      };

      this.socket.onmessage = (event: MessageEvent) => {
        const rawData = typeof event.data === 'string' ? event.data : String(event.data);
        this.callbacks.onFrame(
          createMessageFrame({
            direction: 'receive',
            raw: rawData,
            protocol: 'ws',
          }),
        );
      };

      this.socket.onerror = () => {
        this.setState('ERROR');
        this.callbacks.onFrame(
          createMessageFrame({
            direction: 'system',
            raw: 'WebSocket 连接出现异常或握手失败。排查建议：检查网络连接、跨域策略或目标服务端是否在线；若使用公共测试地址可尝试 Postman 回显源 (wss://ws.postman-echo.com/raw) 或本地 WebSocket 服务。',
            protocol: 'ws',
            summary: '连接异常',
          }),
        );
      };

      this.socket.onclose = (event: CloseEvent) => {
        this.heartbeatScheduler.stop();
        this.setState('DISCONNECTED');
        const reasonMsg = event.reason ? ` 原因: ${event.reason}` : '';
        this.callbacks.onFrame(
          createMessageFrame({
            direction: 'system',
            raw: `连接已断开 (代码: ${event.code}${reasonMsg})。若建连瞬间即断开，通常为远程服务端握手拒绝、Query/子协议参数不被支持或网络防火墙阻断。`,
            protocol: 'ws',
            summary: '连接断开',
          }),
        );
        this.socket = null;

        // 断线自动重连判定 (Auto-reconnect)
        if (!this.isManualDisconnect && options?.autoReconnect?.enabled) {
          const maxRetries = options.autoReconnect.maxRetries || 5;
          if (this.retryCount < maxRetries) {
            const delay = calculateBackoffDelay(
              this.retryCount,
              options.autoReconnect.baseDelayMs || 1000,
            );
            this.retryCount++;
            this.callbacks.onFrame(
              createMessageFrame({
                direction: 'system',
                raw: `连接异常断开，将在 ${(delay / 1000).toFixed(1)} 秒后尝试第 ${this.retryCount}/${maxRetries} 次自动重连...`,
                protocol: 'ws',
                summary: '准备自动重连',
              }),
            );

            this.reconnectTimer = setTimeout(() => {
              this.connect(this.currentUrl, this.currentOptions);
            }, delay);
          }
          else {
            this.callbacks.onFrame(
              createMessageFrame({
                direction: 'system',
                raw: `已达到最大重连次数 (${maxRetries} 次)，停止自动重连。`,
                protocol: 'ws',
                summary: '重连终止',
              }),
            );
          }
        }
      };
    }
    catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.setState('ERROR');
      this.callbacks.onFrame(
        createMessageFrame({
          direction: 'system',
          raw: `连接启动失败: ${errorMsg}`,
          protocol: 'ws',
          summary: '连接异常',
        }),
      );
      this.socket = null;
    }
  }

  /**
   * 清除重连定时器
   */
  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 发送文本或 JSON 报文
   *
   * @param payload 待发送报文
   * @returns 是否成功发出
   */
  public send(payload: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.callbacks.onFrame(
        createMessageFrame({
          direction: 'system',
          raw: '发送失败：WebSocket 尚未建立连接或已断开',
          protocol: 'ws',
          summary: '发送失败',
        }),
      );
      return false;
    }

    try {
      this.socket.send(payload);
      this.callbacks.onFrame(
        createMessageFrame({
          direction: 'send',
          raw: payload,
          protocol: 'ws',
        }),
      );
      return true;
    }
    catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.callbacks.onFrame(
        createMessageFrame({
          direction: 'system',
          raw: `发送异常: ${errorMsg}`,
          protocol: 'ws',
          summary: '发送异常',
        }),
      );
      return false;
    }
  }

  /**
   * 关闭连接
   *
   * @param manual 是否为主动手动断开 (默认 true，手动断开不触发自动重连)
   */
  public disconnect(manual = true) {
    this.isManualDisconnect = manual;
    this.clearReconnectTimer();
    this.heartbeatScheduler.stop();
    this.retryCount = 0;

    if (this.socket) {
      try {
        this.socket.close();
      }
      catch {
        // 忽略关闭时的异常
      }
      this.socket = null;
    }
    this.setState('DISCONNECTED');
  }
}

/**
 * 校验 SSE 目标 HTTP/HTTPS 地址合法性
 *
 * @param url 待校验的 HTTP/HTTPS 地址
 * @returns 校验结果与错误描述
 */
export function validateHttpUrl(url: string): { valid: boolean; error?: string } {
  if (!url || !url.trim()) {
    return { valid: false, error: '目标地址不能为空' };
  }
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { valid: false, error: 'SSE 目标地址必须以 http:// 或 https:// 开头' };
  }
  try {
    const parsed = new URL(trimmed);
    if (!parsed.host) {
      return { valid: false, error: '无效的主机地址' };
    }
    return { valid: true };
  }
  catch {
    return { valid: false, error: 'URL 格式无效' };
  }
}

/**
 * 解析从 ReadableStream 到达的网络数据分块（纯客户端自研 SSE 解析引擎）
 * 支持处理跨分块断行拼接 (Buffer Stitching)、多事件连续分割、多行 data 组装与注释行过滤
 *
 * @param chunk 刚刚通过网络 reader 读取到的原始文本块
 * @param buffer 上次读取残留的未完结行缓冲区
 * @returns 解析得到的完整事件列表与剩余的未完结行缓冲区
 */
export function parseSSEStreamChunk(
  chunk: string,
  buffer: string,
): { events: SSEParsedEvent[]; remainingBuffer: string } {
  const text = (buffer || '') + (chunk || '');
  if (!text) {
    return { events: [], remainingBuffer: '' };
  }

  // 标准化换行符 (\r\n -> \n, \r -> \n)
  let normalized = text;
  let trailingR = false;
  if (normalized.endsWith('\r')) {
    trailingR = true;
    normalized = normalized.slice(0, -1);
  }
  normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // SSE 规约：一个事件块以连续的两个换行符 (\n\n) 终结
  const parts = normalized.split('\n\n');
  // 最后一个部分如果没有紧随的 \n\n，说明尚未接收完整，留存到下一次分块到达时拼接
  const remaining = parts.pop() || '';
  const remainingBuffer = trailingR ? `${remaining}\r` : remaining;

  const events: SSEParsedEvent[] = [];

  for (const block of parts) {
    if (!block.trim()) {
      continue;
    }

    const lines = block.split('\n');
    let eventName: string | undefined;
    const dataLines: string[] = [];
    let eventId: string | undefined;
    let retry: number | undefined;

    for (const line of lines) {
      // 忽略空行或以冒号开头的注释行 (如心跳 :keepalive)
      if (!line || line.startsWith(':')) {
        continue;
      }

      const colonIdx = line.indexOf(':');
      let field = '';
      let value = '';

      if (colonIdx === -1) {
        field = line.trim();
        value = '';
      }
      else {
        field = line.substring(0, colonIdx);
        value = line.substring(colonIdx + 1);
        // 根据 W3C SSE 规范：若字段值以单个半角空格开头，剔除该前导空格
        if (value.startsWith(' ')) {
          value = value.substring(1);
        }
      }

      switch (field) {
        case 'event':
          eventName = value;
          break;
        case 'data':
          dataLines.push(value);
          break;
        case 'id':
          eventId = value;
          break;
        case 'retry': {
          const r = Number.parseInt(value, 10);
          if (!Number.isNaN(r)) {
            retry = r;
          }
          break;
        }
      }
    }

    // 仅当包含 data 负载或显式声明了 event 名称时生成有效事件
    if (dataLines.length > 0 || eventName !== undefined) {
      events.push({
        event: eventName,
        data: dataLines.join('\n'),
        id: eventId,
        retry,
        rawBlock: block,
      });
    }
  }

  return {
    events,
    remainingBuffer,
  };
}

/**
 * SSE 会话管理器回调接口
 */
export interface SSESessionCallbacks {
  /** 状态变更回调 */
  onStateChange: (state: ConnectionState) => void
  /** 消息帧产生回调 */
  onFrame: (frame: MessageFrame) => void
}

/**
 * 纯客户端自研 SSE 流式引擎会话封装 (SSE Stream Engine)
 * 基于 Fetch API 与 ReadableStream，支持 GET 与 POST 请求、自定义请求头与 JSON 请求体
 *
 * @author Ateng
 * @since 2026-09-28
 */
export class SSESession {
  private abortController: AbortController | null = null;
  private state: ConnectionState = 'DISCONNECTED';
  private callbacks: SSESessionCallbacks;
  private streamBuffer = '';

  constructor(callbacks: SSESessionCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 获取当前连接状态
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * 更新并分发连接状态
   */
  private setState(newState: ConnectionState) {
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  /**
   * 发起 SSE 流式连接监听
   *
   * @param config SSE 连接请求配置
   */
  public async connect(config: SSERequestConfig) {
    const validation = validateHttpUrl(config.url);
    if (!validation.valid) {
      this.setState('ERROR');
      this.callbacks.onFrame(
        createMessageFrame({
          direction: 'system',
          raw: validation.error || 'SSE 地址校验失败',
          protocol: 'sse',
          summary: '连接参数错误',
        }),
      );
      return;
    }

    if (this.abortController) {
      this.disconnect();
    }

    this.abortController = new AbortController();
    this.streamBuffer = '';
    this.setState('CONNECTING');

    this.callbacks.onFrame(
      createMessageFrame({
        direction: 'system',
        raw: `正在通过 HTTP ${config.method} 发起 SSE 请求: ${config.url}`,
        protocol: 'sse',
        summary: '发起请求',
      }),
    );

    // 组织请求头
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
    };

    if (config.method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    (config.headers || []).forEach((h) => {
      if (h.enabled && h.key && h.key.trim()) {
        headers[h.key.trim()] = h.value || '';
      }
    });

    try {
      const response = await fetch(config.url.trim(), {
        method: config.method,
        headers,
        body: config.method === 'POST' && config.body ? config.body : undefined,
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        this.setState('ERROR');
        let errorBody = '';
        try {
          errorBody = await response.text();
        }
        catch {
          // 忽略响应文本读取异常
        }

        let formattedError = errorBody;
        if (errorBody) {
          try {
            const parsed = JSON.parse(errorBody);
            formattedError = JSON.stringify(parsed, null, 2);
          }
          catch {
            // 保持原始文本
          }
        }

        const detailMsg = formattedError ? `\n\n【服务端返回报错详情】\n${formattedError}` : '';
        this.callbacks.onFrame(
          createMessageFrame({
            direction: 'system',
            raw: `SSE 连接失败，HTTP 状态码: ${response.status} ${response.statusText}${detailMsg}`,
            protocol: 'sse',
            summary: `HTTP ${response.status}`,
          }),
        );
        return;
      }

      if (!response.body) {
        this.setState('ERROR');
        this.callbacks.onFrame(
          createMessageFrame({
            direction: 'system',
            raw: '连接响应成功，但 Response Body 为空，无法建立 ReadableStream。',
            protocol: 'sse',
            summary: '响应流为空',
          }),
        );
        return;
      }

      this.setState('CONNECTED');
      this.callbacks.onFrame(
        createMessageFrame({
          direction: 'system',
          raw: `SSE 流式连接已建立 (HTTP ${response.status})，开始实时监听事件流...`,
          protocol: 'sse',
          summary: '连接成功',
        }),
      );

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunkText = decoder.decode(value, { stream: true });
        const { events, remainingBuffer } = parseSSEStreamChunk(chunkText, this.streamBuffer);
        this.streamBuffer = remainingBuffer;

        for (const evt of events) {
          this.callbacks.onFrame(
            createMessageFrame({
              direction: 'receive',
              raw: evt.data,
              protocol: 'sse',
              summary: evt.event ? `Event: ${evt.event}` : undefined,
            }),
          );
        }
      }

      // 事件流正常终止
      this.setState('DISCONNECTED');
      this.callbacks.onFrame(
        createMessageFrame({
          direction: 'system',
          raw: '服务端已关闭 SSE 事件流传输 (Stream Finished)。',
          protocol: 'sse',
          summary: '传输结束',
        }),
      );
    }
    catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // 主动中断
        this.setState('DISCONNECTED');
        this.callbacks.onFrame(
          createMessageFrame({
            direction: 'system',
            raw: 'SSE 流式监听已由客户端主动终止。',
            protocol: 'sse',
            summary: '主动终止',
          }),
        );
        return;
      }

      const errorMsg = err instanceof Error ? err.message : String(err);
      this.setState('ERROR');
      this.callbacks.onFrame(
        createMessageFrame({
          direction: 'system',
          raw: `SSE 连接异常或解析错误: ${errorMsg}`,
          protocol: 'sse',
          summary: '连接异常',
        }),
      );
    }
    finally {
      this.abortController = null;
    }
  }

  /**
   * 中止当前 SSE 流监听
   */
  public disconnect() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.streamBuffer = '';
    this.setState('DISCONNECTED');
  }
}

/**
 * 从单条接收到的数据载荷中智能提取大模型增量流式文本 (Delta Text)
 * 适配 OpenAI / DeepSeek、Claude、Ollama 以及纯文本流
 *
 * @param data 原始接收数据文本
 * @param parsedJson 预先解析出的 JSON 对象 (可选)
 * @returns 提取出的流式文本增量片段
 */
export function extractDeltaContent(data: string, parsedJson?: unknown): string {
  if (!data) {
    return '';
  }

  const trimmed = data.trim();
  if (trimmed === '[DONE]') {
    return '';
  }

  // 1. 若提供了已解析的 JSON 或当前数据是标准 JSON 对象
  let targetObj = parsedJson;
  if (targetObj === undefined) {
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
      || (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        targetObj = JSON.parse(trimmed);
      }
      catch {
        // 非合法 JSON，按纯文本降级处理
      }
    }
  }

  if (targetObj && typeof targetObj === 'object') {
    const record = targetObj as Record<string, unknown>;

    // 格式 A：OpenAI / DeepSeek / 通用 chat.completions 规范
    // { choices: [ { delta: { content: "..." } } ] }
    if (Array.isArray(record.choices) && record.choices.length > 0) {
      const choice = record.choices[0] as Record<string, unknown> | undefined;
      if (choice) {
        if (choice.delta && typeof choice.delta === 'object') {
          const delta = choice.delta as Record<string, unknown>;
          if (typeof delta.content === 'string') {
            return delta.content;
          }
        }
        if (typeof choice.text === 'string') {
          return choice.text;
        }
        if (choice.message && typeof choice.message === 'object') {
          const message = choice.message as Record<string, unknown>;
          if (typeof message.content === 'string') {
            return message.content;
          }
        }
      }
    }

    // 格式 B：Anthropic Claude 规范
    // { delta: { text: "..." } } 或 { content_block: { text: "..." } }
    if (record.delta && typeof record.delta === 'object') {
      const delta = record.delta as Record<string, unknown>;
      if (typeof delta.text === 'string') {
        return delta.text;
      }
    }
    if (record.content_block && typeof record.content_block === 'object') {
      const block = record.content_block as Record<string, unknown>;
      if (typeof block.text === 'string') {
        return block.text;
      }
    }

    // 格式 C：Ollama / 本地模型规范
    // { response: "..." } 或 { message: { content: "..." } }
    if (typeof record.response === 'string') {
      return record.response;
    }
    if (record.message && typeof record.message === 'object') {
      const message = record.message as Record<string, unknown>;
      if (typeof message.content === 'string') {
        return message.content;
      }
    }

    // 格式 D：通用事件流 / 日志流常见文本字段
    if (typeof record.text === 'string') {
      return record.text;
    }
    if (typeof record.data === 'string') {
      return record.data;
    }
    if (typeof record.log === 'string') {
      return record.log;
    }
    if (typeof record.msg === 'string') {
      return record.msg;
    }
    if (typeof record.message === 'string') {
      return record.message;
    }

    // 若为纯结构化控制/状态包 (如 { type: 'ping', code: 200 })，返回空字符串避免污染正文
    return '';
  }

  // 2. 纯文本流分块 (如服务端控制台实时日志、纯字符串流)
  return data;
}

/**
 * 对接收方向的消息帧列表进行流式正文聚合分析 (支持大模型增量与通用文本/事件流)
 *
 * @param frames 消息帧集合
 * @returns 聚合分析产物
 */
export function aggregateStreamFrames(frames: MessageFrame[]): StreamAggregateResult {
  const receiveFrames = (frames || []).filter(f => f.direction === 'receive');

  let text = '';
  let chunkCount = 0;

  for (const frame of receiveFrames) {
    const delta = extractDeltaContent(frame.raw, frame.parsedJson);
    if (delta.length > 0) {
      text += delta;
      chunkCount++;
    }
  }

  let durationMs = 0;
  if (receiveFrames.length >= 2) {
    const firstTime = receiveFrames[0].timestamp;
    const lastTime = receiveFrames[receiveFrames.length - 1].timestamp;
    durationMs = Math.max(0, lastTime - firstTime);
  }

  return {
    text,
    chunkCount,
    charCount: text.length,
    durationMs,
  };
}

/**
 * 内部 Markdown 解析引擎单例实例，配置代码着色与排版规则
 */
const mdParser = markdownit({
  html: false,
  xhtmlOut: false,
  breaks: true,
  langPrefix: 'language-',
  linkify: true,
  typographer: false,
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="language-${lang}">${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`;
      }
      catch {
        // 遇到特殊未知语法时安全降级
      }
    }
    return `<pre class="hljs"><code>${mdParser.utils.escapeHtml(str)}</code></pre>`;
  },
});

/**
 * 将 Markdown 文本安全渲染为带有语法高亮与 XSS 防护的 HTML
 *
 * @param markdown 原始 Markdown 文本
 * @returns 净化后的 HTML 字符串
 */
export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) {
    return '';
  }

  const rawHtml = mdParser.render(markdown);
  // 在具备 DOM/Window 环境下通过 DOMPurify 严密清洗潜在危险标签
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(rawHtml);
  }
  return rawHtml;
}

/**
 * 创建新问答轮次模型
 *
 * @param turnIndex 轮次序号 (从 1 开始)
 * @param promptSummary 请求摘要或提示词
 * @returns 初始化的流式轮次对象
 */
export function createStreamTurn(turnIndex: number, promptSummary?: string): StreamTurnItem {
  return {
    id: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    turnIndex,
    startTime: Date.now(),
    promptSummary: promptSummary?.trim() || undefined,
    text: '',
    chunkCount: 0,
    charCount: 0,
    durationMs: 0,
    isCompleted: false,
  };
}

/**
 * 增量向轮次中追加解析出的流式文本增量
 *
 * @param turn 当前轮次
 * @param deltaText 新增文本增量
 * @returns 更新后的轮次对象
 */
export function appendTurnDelta(turn: StreamTurnItem, deltaText: string): StreamTurnItem {
  if (!deltaText) {
    return turn;
  }
  const newText = turn.text + deltaText;
  const now = Date.now();
  return {
    ...turn,
    text: newText,
    chunkCount: turn.chunkCount + 1,
    charCount: newText.length,
    durationMs: Math.max(0, now - turn.startTime),
  };
}

/**
 * 标记轮次传输完成并结算耗时与状态
 *
 * @param turn 当前轮次
 * @returns 结算完成后的轮次对象
 */
export function finalizeStreamTurn(turn: StreamTurnItem): StreamTurnItem {
  const now = Date.now();
  return {
    ...turn,
    endTime: now,
    durationMs: Math.max(0, now - turn.startTime),
    isCompleted: true,
  };
}

/**
 * 环形缓冲队列裁剪辅助函数
 * 当帧列表超过指定上限时，以先进先出 (FIFO) 策略剔除最早产生的帧
 *
 * @param frames 现有帧列表
 * @param maxSize 最大保留帧数 (<= 0 表示不限制)
 * @returns 裁剪后的新帧列表与被剔除的帧数量
 */
export function trimFramesBuffer(
  frames: MessageFrame[],
  maxSize: number,
): { frames: MessageFrame[]; droppedCount: number } {
  if (maxSize <= 0 || frames.length <= maxSize) {
    return { frames, droppedCount: 0 };
  }

  const droppedCount = frames.length - maxSize;
  const trimmed = frames.slice(droppedCount);
  return { frames: trimmed, droppedCount };
}

/**
 * 环形缓冲队列管理器 (Frame Buffer Manager)
 * 保护高频大吞吐场景下前端内存与 DOM 渲染性能
 *
 * @author Ateng
 * @since 2026-09-29
 */
export class FrameBufferManager {
  private maxSize: number;
  private frames: MessageFrame[] = [];
  private totalDropped = 0;

  constructor(maxSize: number = 200) {
    this.maxSize = maxSize;
  }

  /**
   * 设置最大缓冲帧数上限
   *
   * @param size 最大帧数 (<= 0 表示不限制)
   */
  public setMaxSize(size: number) {
    this.maxSize = size;
    this.trim();
  }

  /**
   * 获取当前最大缓冲帧数上限
   */
  public getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * 压入单条新消息帧并执行 FIFO 淘汰
   *
   * @param frame 新产生的消息帧
   * @returns 淘汰状态与当前被剔除数
   */
  public addFrame(frame: MessageFrame): { dropped: boolean; droppedCount: number } {
    this.frames.push(frame);
    const prevCount = this.totalDropped;
    this.trim();
    const currentDropped = this.totalDropped - prevCount;
    return { dropped: currentDropped > 0, droppedCount: currentDropped };
  }

  /**
   * 获取当前缓冲区中存储的所有消息帧副本
   */
  public getFrames(): MessageFrame[] {
    return [...this.frames];
  }

  /**
   * 清空缓冲区与丢弃计数
   */
  public clear() {
    this.frames = [];
    this.totalDropped = 0;
  }

  /**
   * 获取自创建以来累计丢弃的历史帧总数
   */
  public getTotalDropped(): number {
    return this.totalDropped;
  }

  /**
   * 执行先进先出淘汰
   */
  private trim(): boolean {
    if (this.maxSize > 0 && this.frames.length > this.maxSize) {
      const overflow = this.frames.length - this.maxSize;
      this.frames.splice(0, overflow);
      this.totalDropped += overflow;
      return true;
    }
    return false;
  }
}

/**
 * 将消息帧列表格式化导出为标准 JSON 字符串
 *
 * @param frames 消息帧集合
 * @returns 格式化后的 JSON 字符串
 */
export function exportFramesToJson(frames: MessageFrame[]): string {
  return JSON.stringify(frames || [], null, 2);
}

/**
 * 将消息帧列表格式化导出为易读的纯文本日志
 *
 * @param frames 消息帧集合
 * @returns 格式化后的纯文本日志
 */
export function exportFramesToTxt(frames: MessageFrame[]): string {
  if (!frames || frames.length === 0) {
    return '';
  }

  return frames
    .map((f) => {
      const dir
        = f.direction === 'send' ? 'SEND  ' : f.direction === 'receive' ? 'RECV  ' : 'SYSTEM';
      const proto = f.protocol.toUpperCase().padEnd(3, ' ');
      const summary = f.summary ? ` [${f.summary}]` : '';
      return `[${f.formattedTime}] [${proto}] [${dir}]${summary}\n${f.raw}`;
    })
    .join('\n----------------------------------------\n');
}

/**
 * 纯客户端触发文件安全下载
 *
 * @param content 文件文本内容
 * @param filename 下载的目标文件名
 * @param mimeType MIME 格式类型
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain;charset=utf-8',
) {
  if (typeof document === 'undefined') {
    return;
  }
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  catch {
    // 降级保护：在非标准 DOM 环境或无 ObjectURL 环境中静默失败
  }
}

/**
 * 常用载荷预设库存储 Key
 */
export const STORAGE_KEY_PRESETS = 'ateng_tools_stream_client_presets';

/**
 * 客户端配置状态持久化存储 Key
 */
export const STORAGE_KEY_STATE = 'ateng_tools_stream_client_state';

/**
 * 系统内置推荐载荷预设模板列表
 */
export const DEFAULT_PAYLOAD_PRESETS: PayloadPresetItem[] = [
  {
    id: 'preset_builtin_openai_stream',
    title: 'OpenAI Chat 文本流式补全',
    description: '标准 OpenAI v1 chat/completions 流式对话接口载荷',
    protocol: 'sse',
    createdAt: 1700000000000,
    isBuiltin: true,
    payload: JSON.stringify(
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'user', content: '请用简洁明了的语言介绍一下 WebSocket 与 SSE 的核心异同。' },
        ],
        stream: true,
      },
      null,
      2,
    ),
  },
  {
    id: 'preset_builtin_deepseek_stream',
    title: 'DeepSeek 流式推理对话',
    description: 'DeepSeek deepseek-chat 流式问答载荷',
    protocol: 'sse',
    createdAt: 1700000000000,
    isBuiltin: true,
    payload: JSON.stringify(
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: '请为我简述纯前端 SSE 流式解码与 ReadableStream 的优势。' },
        ],
        stream: true,
      },
      null,
      2,
    ),
  },
  {
    id: 'preset_builtin_ollama_generate',
    title: 'Ollama 本地大模型生成',
    description: '本地 Ollama /api/generate 接口原生流式调用',
    protocol: 'sse',
    createdAt: 1700000000000,
    isBuiltin: true,
    payload: JSON.stringify(
      {
        model: 'llama3',
        prompt: 'Why is the sky blue? Answer in one sentence.',
        stream: true,
      },
      null,
      2,
    ),
  },
  {
    id: 'preset_builtin_ws_ping',
    title: 'WebSocket 心跳探测报文',
    description: '常规 JSON 格式的心跳保活探测帧',
    protocol: 'ws',
    createdAt: 1700000000000,
    isBuiltin: true,
    payload: JSON.stringify(
      {
        type: 'ping',
        source: 'Ateng-Tools',
        timestamp: 1700000000000,
      },
      null,
      2,
    ),
  },
  {
    id: 'preset_builtin_ws_auth',
    title: 'WebSocket 首包鉴权报文 (Token Auth)',
    description: '握手建连后立即主动上送的用户凭证鉴权载荷',
    protocol: 'ws',
    createdAt: 1700000000000,
    isBuiltin: true,
    payload: JSON.stringify(
      {
        action: 'authenticate',
        token: 'YOUR_ACCESS_TOKEN',
        client: 'Ateng-Tools',
      },
      null,
      2,
    ),
  },
];

/**
 * 创建新自定义载荷预设项
 *
 * @param title 预设名称
 * @param payload 报文载荷
 * @param protocol 适用的通信协议
 * @param description 描述或备注
 * @returns 预设项对象
 */
export function createPresetItem(
  title: string,
  payload: string,
  protocol: ConnectionProtocol | 'all' = 'all',
  description?: string,
): PayloadPresetItem {
  const now = Date.now();
  return {
    id: `preset_custom_${now}_${Math.random().toString(36).substring(2, 8)}`,
    title: title.trim() || '未命名预设',
    payload,
    protocol,
    description: description?.trim() || undefined,
    createdAt: now,
    isBuiltin: false,
  };
}

/**
 * 从本地存储中读取载荷预设列表
 * 若本地为空或解析失败，则安全回退返回系统内置预设
 *
 * @param storageKey 存储 Key
 * @returns 预设项列表
 */
export function loadPresetsFromStorage(storageKey: string = STORAGE_KEY_PRESETS): PayloadPresetItem[] {
  if (typeof localStorage === 'undefined') {
    return [...DEFAULT_PAYLOAD_PRESETS];
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [...DEFAULT_PAYLOAD_PRESETS];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [...DEFAULT_PAYLOAD_PRESETS];
  }
  catch {
    return [...DEFAULT_PAYLOAD_PRESETS];
  }
}

/**
 * 将载荷预设列表安全持久化至本地存储
 *
 * @param presets 预设项集合
 * @param storageKey 存储 Key
 * @returns 是否成功写入
 */
export function savePresetsToStorage(
  presets: PayloadPresetItem[],
  storageKey: string = STORAGE_KEY_PRESETS,
): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(presets));
    return true;
  }
  catch {
    return false;
  }
}

/**
 * 常用公共与本地 WebSocket 回显服务测试节点
 */
export const WEBSOCKET_ECHO_ENDPOINTS = [
  {
    label: 'Postman Echo (公网推荐·全双工)',
    value: 'wss://ws.postman-echo.com/raw',
    description: 'Postman 官方维护的公网 WebSocket 回显服务，支持 Query 参数与文本全双工回显',
  },
  {
    label: '本地 Echo 服务 (离线可用·零延迟)',
    value: 'ws://127.0.0.1:8088',
    description: '通过 pnpm run mock:ws 启动的本地极简 WebSocket 回显服务 (RFC 6455)',
  },
  {
    label: 'WebSocket.org (公网备用)',
    value: 'wss://echo.websocket.org',
    description: 'WebSocket 官方公网回显服务，支持全双工通信',
  },
];

/**
 * 获取客户端初始默认配置状态
 *
 * @returns 默认状态对象
 */
export function getDefaultClientState(): ClientPersistentState {
  return {
    activeProtocol: 'ws',
    wsUrl: 'wss://ws.postman-echo.com/raw',
    queryParams: [{ key: 'token', value: 'demo_token_123', enabled: false }],
    subprotocolsInput: '',
    firstPacketAuthEnabled: false,
    firstPacketAuthPayload:
      '{\n  "action": "auth",\n  "token": "YOUR_ACCESS_TOKEN",\n  "client": "Ateng-Tools"\n}',
    heartbeatEnabled: false,
    heartbeatInterval: 30,
    heartbeatPayload: '{"type":"ping"}',
    autoReconnectEnabled: false,
    maxRetries: 5,
    sendPayload:
      '{\n  "action": "greeting",\n  "message": "Hello WebSocket",\n  "timestamp": 1700000000000\n}',
    sseUrl: 'https://api.openai.com/v1/chat/completions',
    sseMethod: 'POST',
    sseHeaders: [
      { key: 'Accept', value: 'text/event-stream', enabled: true },
      { key: 'Authorization', value: 'Bearer YOUR_API_KEY', enabled: false },
    ],
    sseBody: JSON.stringify(
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: '你好，请写一首关于技术与思考的七言绝句。' }],
        stream: true,
      },
      null,
      2,
    ),
    frameBufferSize: 200,
  };
}

/**
 * 从本地存储加载客户端配置状态，具备损坏防御与缺失字段安全回退
 *
 * @param defaultState 兜底默认状态
 * @param storageKey 存储 Key
 * @returns 恢复合并后的配置状态
 */
export function loadClientStateFromStorage(
  defaultState: ClientPersistentState,
  storageKey: string = STORAGE_KEY_STATE,
): ClientPersistentState {
  if (typeof localStorage === 'undefined') {
    return { ...defaultState };
  }

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { ...defaultState };
    }

    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') {
      return { ...defaultState };
    }

    let initialWsUrl = typeof saved.wsUrl === 'string' && saved.wsUrl.trim().length > 0
      ? saved.wsUrl.trim()
      : defaultState.wsUrl;

    // 自动平滑升级已失效的历史公共回显源
    if (initialWsUrl.includes('echo.websocket.events')) {
      initialWsUrl = 'wss://ws.postman-echo.com/raw';
    }

    // 安全逐字段校验与降级合并
    return {
      activeProtocol: saved.activeProtocol === 'sse' ? 'sse' : 'ws',
      wsUrl: initialWsUrl,
      queryParams: Array.isArray(saved.queryParams) ? saved.queryParams : defaultState.queryParams,
      subprotocolsInput:
        typeof saved.subprotocolsInput === 'string'
          ? saved.subprotocolsInput
          : defaultState.subprotocolsInput,
      firstPacketAuthEnabled:
        typeof saved.firstPacketAuthEnabled === 'boolean'
          ? saved.firstPacketAuthEnabled
          : defaultState.firstPacketAuthEnabled,
      firstPacketAuthPayload:
        typeof saved.firstPacketAuthPayload === 'string'
          ? saved.firstPacketAuthPayload
          : defaultState.firstPacketAuthPayload,
      heartbeatEnabled:
        typeof saved.heartbeatEnabled === 'boolean'
          ? saved.heartbeatEnabled
          : defaultState.heartbeatEnabled,
      heartbeatInterval:
        typeof saved.heartbeatInterval === 'number' && saved.heartbeatInterval > 0
          ? saved.heartbeatInterval
          : defaultState.heartbeatInterval,
      heartbeatPayload:
        typeof saved.heartbeatPayload === 'string'
          ? saved.heartbeatPayload
          : defaultState.heartbeatPayload,
      autoReconnectEnabled:
        typeof saved.autoReconnectEnabled === 'boolean'
          ? saved.autoReconnectEnabled
          : defaultState.autoReconnectEnabled,
      maxRetries:
        typeof saved.maxRetries === 'number' && saved.maxRetries >= 0
          ? saved.maxRetries
          : defaultState.maxRetries,
      sendPayload:
        typeof saved.sendPayload === 'string' ? saved.sendPayload : defaultState.sendPayload,
      sseUrl: typeof saved.sseUrl === 'string' ? saved.sseUrl : defaultState.sseUrl,
      sseMethod: saved.sseMethod === 'GET' ? 'GET' : 'POST',
      sseHeaders: Array.isArray(saved.sseHeaders) ? saved.sseHeaders : defaultState.sseHeaders,
      sseBody: typeof saved.sseBody === 'string' ? saved.sseBody : defaultState.sseBody,
      frameBufferSize:
        typeof saved.frameBufferSize === 'number' && saved.frameBufferSize >= 0
          ? saved.frameBufferSize
          : defaultState.frameBufferSize,
    };
  }
  catch {
    return { ...defaultState };
  }
}

/**
 * 将客户端配置状态安全持久化保存至本地存储
 *
 * @param state 当前待持久化的状态
 * @param storageKey 存储 Key
 * @returns 是否成功写入
 */
export function saveClientStateToStorage(
  state: Partial<ClientPersistentState>,
  storageKey: string = STORAGE_KEY_STATE,
): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    return true;
  }
  catch {
    return false;
  }
}
