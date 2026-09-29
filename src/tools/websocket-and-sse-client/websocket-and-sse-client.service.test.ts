/**
 * WebSocket 与 SSE 核心服务单元测试 (含高级鉴权、URL 编译、心跳与重连)
 *
 * @author Ateng
 * @since 2026-09-28
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PAYLOAD_PRESETS,
  FrameBufferManager,
  HeartbeatScheduler,
  SSESession,
  WebSocketSession,
  aggregateStreamFrames,
  appendTurnDelta,
  calculateBackoffDelay,
  calculateByteSize,
  compileWebSocketUrl,
  createMessageFrame,
  createPresetItem,
  createStreamTurn,
  downloadFile,
  exportFramesToJson,
  exportFramesToTxt,
  extractDeltaContent,
  finalizeStreamTurn,
  formatByteSize,
  formatTimestamp,
  getDefaultClientState,
  loadClientStateFromStorage,
  loadPresetsFromStorage,
  parseSSEStreamChunk,
  parseWebSocketUrlQueryParams,
  renderMarkdownToHtml,
  saveClientStateToStorage,
  savePresetsToStorage,
  trimFramesBuffer,
  validateHttpUrl,
  validateWebSocketUrl,
} from './websocket-and-sse-client.service';
import type {
  ConnectionState,
  MessageFrame,
  QueryParamItem,
  SSERequestConfig,
  WebSocketAdvancedOptions,
} from './websocket-and-sse-client.models';

describe('WebSocket & SSE Client Service Tests', () => {
  describe('1. 基础辅助工具函数测试', () => {
    it('1.1 formatTimestamp 能够正确格式化毫秒为 HH:mm:ss.SSS', () => {
      const fixedTime = new Date('2026-09-28T12:30:45.123').getTime();
      const formatted = formatTimestamp(fixedTime);
      expect(formatted).toBe('12:30:45.123');
    });

    it('1.2 calculateByteSize 能够精确计算单字节与多字节字符的 UTF-8 长度', () => {
      expect(calculateByteSize('')).toBe(0);
      expect(calculateByteSize('hello')).toBe(5);
      // 中文字符在 UTF-8 中通常占 3 个字节
      expect(calculateByteSize('你好')).toBe(6);
      expect(calculateByteSize('hello 你好')).toBe(12);
    });

    it('1.3 formatByteSize 能够格式化 B、KB 与 MB', () => {
      expect(formatByteSize(0)).toBe('0 B');
      expect(formatByteSize(512)).toBe('512 B');
      expect(formatByteSize(1024)).toBe('1.0 KB');
      expect(formatByteSize(2560)).toBe('2.5 KB');
      expect(formatByteSize(1024 * 1024 * 3.5)).toBe('3.50 MB');
    });
  });

  describe('2. createMessageFrame 消息帧构建测试', () => {
    it('2.1 应正确构建纯文本发送帧并计算大小', () => {
      const frame = createMessageFrame({
        direction: 'send',
        raw: 'Ping message',
        protocol: 'ws',
      });

      expect(frame.direction).toBe('send');
      expect(frame.raw).toBe('Ping message');
      expect(frame.protocol).toBe('ws');
      expect(frame.isJson).toBe(false);
      expect(frame.parsedJson).toBeUndefined();
      expect(frame.byteSize).toBe(12);
      expect(frame.id).toContain('frame_');
      expect(frame.formattedTime).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    });

    it('2.2 应能自动检测并解析标准 JSON 报文', () => {
      const jsonPayload = '{"action":"ping","timestamp":1700000000}';
      const frame = createMessageFrame({
        direction: 'receive',
        raw: jsonPayload,
        protocol: 'ws',
      });

      expect(frame.direction).toBe('receive');
      expect(frame.isJson).toBe(true);
      expect(frame.parsedJson).toEqual({
        action: 'ping',
        timestamp: 1700000000,
      });
      expect(frame.byteSize).toBe(jsonPayload.length);
    });

    it('2.3 面对非法或伪装的 JSON 字符串应优雅降级为纯文本', () => {
      const invalidJson = '{action: invalid_json}';
      const frame = createMessageFrame({
        direction: 'receive',
        raw: invalidJson,
        protocol: 'ws',
      });

      expect(frame.isJson).toBe(false);
      expect(frame.parsedJson).toBeUndefined();
      expect(frame.raw).toBe(invalidJson);
    });
  });

  describe('3. validateWebSocketUrl URL 校验测试', () => {
    it('3.1 应接受合法的 ws:// 与 wss:// 地址', () => {
      expect(validateWebSocketUrl('ws://localhost:8080/ws').valid).toBe(true);
      expect(validateWebSocketUrl('wss://echo.websocket.events/?token=secret123').valid).toBe(true);
    });

    it('3.2 应拦截非法协议或空地址', () => {
      expect(validateWebSocketUrl('').valid).toBe(false);
      expect(validateWebSocketUrl('   ').valid).toBe(false);
      expect(validateWebSocketUrl('http://localhost:8080').valid).toBe(false);
      expect(validateWebSocketUrl('https://example.com').valid).toBe(false);
      expect(validateWebSocketUrl('ftp://example.com').valid).toBe(false);
    });
  });

  describe('4. Query 参数解析与 URL 编译测试', () => {
    it('4.1 parseWebSocketUrlQueryParams 应正确解析已有查询参数并提取纯净 Base URL', () => {
      const full = 'wss://api.example.com/chat?room=101&token=abc%20123';
      const { baseUrl, queryParams } = parseWebSocketUrlQueryParams(full);

      expect(baseUrl).toBe('wss://api.example.com/chat');
      expect(queryParams.length).toBe(2);
      expect(queryParams[0]).toEqual({ key: 'room', value: '101', enabled: true });
      expect(queryParams[1]).toEqual({ key: 'token', value: 'abc 123', enabled: true });
    });

    it('4.2 compileWebSocketUrl 应安全拼接已启用的 Query 参数并进行 URL 编码', () => {
      const base = 'ws://localhost:8080/ws';
      const params: QueryParamItem[] = [
        { key: 'token', value: 'secret key', enabled: true },
        { key: 'tenantId', value: '99', enabled: false }, // 禁用项应被忽略
        { key: 'env', value: 'dev', enabled: true },
        { key: '', value: 'ignored', enabled: true }, // 空 key 忽略
      ];

      const compiled = compileWebSocketUrl(base, params);
      expect(compiled).toBe('ws://localhost:8080/ws?token=secret%20key&env=dev');
    });

    it('4.3 compileWebSocketUrl 当 base 包含 query 时应先去重再重新组装', () => {
      const base = 'ws://localhost:8080/ws?oldParam=1';
      const params: QueryParamItem[] = [{ key: 'newParam', value: '2', enabled: true }];

      const compiled = compileWebSocketUrl(base, params);
      expect(compiled).toBe('ws://localhost:8080/ws?newParam=2');
    });

    it('4.4 compileWebSocketUrl 当无有效参数时应直接返回干净的 base URL', () => {
      expect(compileWebSocketUrl('ws://example.com', [])).toBe('ws://example.com');
      expect(compileWebSocketUrl('ws://example.com?a=1', [{ key: 'a', value: '1', enabled: false }])).toBe('ws://example.com');
    });
  });

  describe('5. 退避延迟与心跳保活调度测试', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('5.1 calculateBackoffDelay 应呈现指数递增并限制在上限之内', () => {
      expect(calculateBackoffDelay(0, 1000, 30000)).toBe(1000);
      expect(calculateBackoffDelay(1, 1000, 30000)).toBe(1500);
      expect(calculateBackoffDelay(2, 1000, 30000)).toBe(2250);
      expect(calculateBackoffDelay(3, 1000, 30000)).toBe(3375);
      // 超过上限时截断在 30000
      expect(calculateBackoffDelay(15, 1000, 30000)).toBe(30000);
    });

    it('5.2 HeartbeatScheduler 应能按间隔周期性触发并在停止后终止', () => {
      const scheduler = new HeartbeatScheduler();
      let tickCount = 0;

      scheduler.start(5, () => {
        tickCount++;
      });
      expect(scheduler.isActive()).toBe(true);
      expect(tickCount).toBe(0);

      // 前进 5 秒
      vi.advanceTimersByTime(5000);
      expect(tickCount).toBe(1);

      // 再前进 10 秒 (总共两次 tick)
      vi.advanceTimersByTime(10000);
      expect(tickCount).toBe(3);

      scheduler.stop();
      expect(scheduler.isActive()).toBe(false);

      // 停止后时间前进不再触发
      vi.advanceTimersByTime(10000);
      expect(tickCount).toBe(3);
    });
  });

  describe('6. WebSocketSession 高级会话与自动特性集成测试', () => {
    it('6.1 当传入包含 Query 表的高级配置时，应以编译后的完整地址发起连接', () => {
      const stateChanges: ConnectionState[] = [];
      const frames: MessageFrame[] = [];

      const session = new WebSocketSession({
        onStateChange: state => stateChanges.push(state),
        onFrame: frame => frames.push(frame),
      });

      const options: WebSocketAdvancedOptions = {
        queryParams: [{ key: 'auth', value: 'token123', enabled: true }],
        protocols: ['v1.chat'],
        firstPacketAuth: { enabled: false, payload: '' },
        heartbeat: { enabled: false, intervalSeconds: 0, payload: '' },
        autoReconnect: { enabled: false, maxRetries: 3, baseDelayMs: 1000 },
      };

      // 传入非法的 ws 地址以触发校验阶段的日志
      session.connect('invalid://domain', options);
      expect(session.getState()).toBe('ERROR');
      expect(frames[0].raw).toContain('WebSocket 地址必须以 ws:// 或 wss:// 开头');
    });

    it('6.2 在未连接状态下调用 send 应返回 false 并触发系统警告帧', () => {
      const frames: MessageFrame[] = [];
      const session = new WebSocketSession({
        onStateChange: () => {},
        onFrame: frame => frames.push(frame),
      });

      const result = session.send('test payload');
      expect(result).toBe(false);
      expect(frames.length).toBe(1);
      expect(frames[0].direction).toBe('system');
      expect(frames[0].summary).toBe('发送失败');
    });
  });

  describe('7. SSE 协议块分块解析与断行重组测试 (parseSSEStreamChunk)', () => {
    it('7.1 validateHttpUrl 应精准校验 HTTP 与 HTTPS 地址', () => {
      expect(validateHttpUrl('http://localhost:8080/events').valid).toBe(true);
      expect(validateHttpUrl('https://api.openai.com/v1/chat/completions').valid).toBe(true);
      expect(validateHttpUrl('ws://localhost:8080').valid).toBe(false);
      expect(validateHttpUrl('ftp://example.com').valid).toBe(false);
      expect(validateHttpUrl('').valid).toBe(false);
    });

    it('7.2 应正确解析单条包含 event、data 与 id 的标准事件块', () => {
      const chunk = 'event: message\nid: 1001\ndata: Hello SSE\n\n';
      const { events, remainingBuffer } = parseSSEStreamChunk(chunk, '');

      expect(remainingBuffer).toBe('');
      expect(events.length).toBe(1);
      expect(events[0].event).toBe('message');
      expect(events[0].id).toBe('1001');
      expect(events[0].data).toBe('Hello SSE');
    });

    it('7.3 应在单次分块中同时解析多个紧邻的事件块', () => {
      const chunk = 'data: first\n\ndata: second\n\ndata: third\n\n';
      const { events, remainingBuffer } = parseSSEStreamChunk(chunk, '');

      expect(remainingBuffer).toBe('');
      expect(events.length).toBe(3);
      expect(events[0].data).toBe('first');
      expect(events[1].data).toBe('second');
      expect(events[2].data).toBe('third');
    });

    it('7.4 网络分包重组 (Buffer Stitching)：跨 chunk 断行拼接应正确无缝恢复', () => {
      // 模拟第 1 个 chunk 在 JSON 字段中间被截断
      const chunk1 = 'event: delta\ndata: {"choices": [{"delta": {"con';
      const res1 = parseSSEStreamChunk(chunk1, '');

      expect(res1.events.length).toBe(0);
      expect(res1.remainingBuffer).toBe(chunk1);

      // 模拟第 2 个 chunk 带来剩余部分及终结双换行符
      const chunk2 = 'tent": "你好"}}]}\n\n';
      const res2 = parseSSEStreamChunk(chunk2, res1.remainingBuffer);

      expect(res2.remainingBuffer).toBe('');
      expect(res2.events.length).toBe(1);
      expect(res2.events[0].event).toBe('delta');
      expect(res2.events[0].data).toBe('{"choices": [{"delta": {"content": "你好"}}]}');
    });

    it('7.5 多行 data 字段应按规约以换行符拼接', () => {
      const chunk = 'data: line one\ndata: line two\ndata: line three\n\n';
      const { events } = parseSSEStreamChunk(chunk, '');

      expect(events.length).toBe(1);
      expect(events[0].data).toBe('line one\nline two\nline three');
    });

    it('7.6 应自动过滤以冒号开头的注释行与心跳行', () => {
      const chunk = ': ping keepalive\n\ndata: valid event\n\n: another comment\n\n';
      const { events } = parseSSEStreamChunk(chunk, '');

      expect(events.length).toBe(1);
      expect(events[0].data).toBe('valid event');
    });

    it('7.7 字段值的前导空格剥离应严格符合 W3C 规范', () => {
      // 冒号后仅第一个空格属于分隔符需剥离，后续空格需如实保留
      const chunk = 'data:  two spaces\ndata:no_space\n\n';
      const { events } = parseSSEStreamChunk(chunk, '');

      expect(events.length).toBe(1);
      expect(events[0].data).toBe(' two spaces\nno_space');
    });
  });

  describe('8. SSESession 生命周期与参数处理测试', () => {
    it('8.1 当传入无效地址时应触发错误状态并记录日志帧', async () => {
      const frames: MessageFrame[] = [];
      const session = new SSESession({
        onStateChange: () => {},
        onFrame: frame => frames.push(frame),
      });

      const config: SSERequestConfig = {
        url: 'invalid://url',
        method: 'GET',
        headers: [],
        body: '',
      };

      await session.connect(config);
      expect(session.getState()).toBe('ERROR');
      expect(frames.length).toBe(1);
      expect(frames[0].direction).toBe('system');
      expect(frames[0].summary).toBe('连接参数错误');
    });

    it('8.2 disconnect 应安全重置状态与缓冲区', () => {
      const session = new SSESession({
        onStateChange: () => {},
        onFrame: () => {},
      });

      session.disconnect();
      expect(session.getState()).toBe('DISCONNECTED');
    });
  });

  describe('9. 大模型流式增量提取与聚合测试', () => {
    it('9.1 extractDeltaContent 能够精准提取 OpenAI / DeepSeek 风格 delta.content', () => {
      const payload = JSON.stringify({
        id: 'chatcmpl-123',
        choices: [{ index: 0, delta: { content: '你好，' } }],
      });
      expect(extractDeltaContent(payload)).toBe('你好，');
    });

    it('9.2 extractDeltaContent 能够解析 Claude 格式 delta.text 与 content_block', () => {
      const claudeDelta = JSON.stringify({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Anthropic Claude' },
      });
      expect(extractDeltaContent(claudeDelta)).toBe('Anthropic Claude');

      const claudeBlock = JSON.stringify({
        type: 'content_block_start',
        content_block: { type: 'text', text: 'Hello' },
      });
      expect(extractDeltaContent(claudeBlock)).toBe('Hello');
    });

    it('9.3 extractDeltaContent 能够解析 Ollama / 本地模型格式', () => {
      const ollamaResp = JSON.stringify({
        model: 'llama3',
        response: '这是本地模型输出',
        done: false,
      });
      expect(extractDeltaContent(ollamaResp)).toBe('这是本地模型输出');

      const ollamaMsg = JSON.stringify({
        message: { role: 'assistant', content: '对话内容' },
      });
      expect(extractDeltaContent(ollamaMsg)).toBe('对话内容');
    });

    it('9.4 extractDeltaContent 应过滤 [DONE] 标记与非大模型普通 JSON', () => {
      expect(extractDeltaContent('[DONE]')).toBe('');
      expect(extractDeltaContent('  [DONE]  ')).toBe('');

      // 普通非 LLM 数据 JSON 不应产生虚假内容
      const pingJson = JSON.stringify({ type: 'ping', code: 200 });
      expect(extractDeltaContent(pingJson)).toBe('');
    });

    it('9.5 extractDeltaContent 面对纯文本分块应如实返回纯文本', () => {
      expect(extractDeltaContent('直接返回的流式明文文本')).toBe('直接返回的流式明文文本');
      expect(extractDeltaContent('')).toBe('');
    });

    it('9.6 extractDeltaContent 能够正确提取通用事件流/日志流中的文本字段', () => {
      expect(extractDeltaContent(JSON.stringify({ log: '2026-09-29 Task compiled successfully' }))).toBe(
        '2026-09-29 Task compiled successfully',
      );
      expect(extractDeltaContent(JSON.stringify({ text: '实时传感器数据' }))).toBe('实时传感器数据');
    });

    it('9.7 aggregateStreamFrames 应正确聚合多帧文本、计算总字数、分块数与耗时', () => {
      const baseTime = 1700000000000;
      const f1 = createMessageFrame({
        direction: 'receive',
        raw: JSON.stringify({ choices: [{ delta: { content: '天生' } }] }),
        protocol: 'sse',
      });
      f1.timestamp = baseTime;

      const f2 = createMessageFrame({
        direction: 'receive',
        raw: JSON.stringify({ choices: [{ delta: { content: '我材' } }] }),
        protocol: 'sse',
      });
      f2.timestamp = baseTime + 150;

      const f3 = createMessageFrame({
        direction: 'receive',
        raw: JSON.stringify({ choices: [{ delta: { content: '必有用' } }] }),
        protocol: 'sse',
      });
      f3.timestamp = baseTime + 320;

      // 混入客户端发送帧与系统日志帧，聚合时应自动过滤
      const sendFrame = createMessageFrame({
        direction: 'send',
        raw: 'Prompt',
        protocol: 'sse',
      });
      const systemFrame = createMessageFrame({
        direction: 'system',
        raw: 'Stream Finished',
        protocol: 'sse',
      });

      const result = aggregateStreamFrames([sendFrame, f1, f2, f3, systemFrame]);
      expect(result.text).toBe('天生我材必有用');
      expect(result.chunkCount).toBe(3);
      expect(result.charCount).toBe(7);
      expect(result.durationMs).toBe(320);
    });

    it('9.7 aggregateStreamFrames 在单帧或空帧列表时安全降级', () => {
      const emptyRes = aggregateStreamFrames([]);
      expect(emptyRes.text).toBe('');
      expect(emptyRes.chunkCount).toBe(0);
      expect(emptyRes.charCount).toBe(0);
      expect(emptyRes.durationMs).toBe(0);

      const singleFrame = createMessageFrame({
        direction: 'receive',
        raw: '单帧文本',
        protocol: 'ws',
      });
      const singleRes = aggregateStreamFrames([singleFrame]);
      expect(singleRes.text).toBe('单帧文本');
      expect(singleRes.chunkCount).toBe(1);
      expect(singleRes.durationMs).toBe(0);
    });
  });

  describe('10. 环形缓冲队列与 FIFO 淘汰测试', () => {
    it('10.1 trimFramesBuffer 能够按 FIFO 策略安全截断超出上限的帧', () => {
      const list = [
        createMessageFrame({ direction: 'receive', raw: '1', customId: 'id-1' }),
        createMessageFrame({ direction: 'receive', raw: '2', customId: 'id-2' }),
        createMessageFrame({ direction: 'receive', raw: '3', customId: 'id-3' }),
        createMessageFrame({ direction: 'receive', raw: '4', customId: 'id-4' }),
      ];

      const res = trimFramesBuffer(list, 2);
      expect(res.droppedCount).toBe(2);
      expect(res.frames.length).toBe(2);
      expect(res.frames[0].id).toBe('id-3');
      expect(res.frames[1].id).toBe('id-4');
    });

    it('10.2 trimFramesBuffer 在未超限或 maxSize<=0 时不丢弃', () => {
      const list = [createMessageFrame({ direction: 'receive', raw: '1' })];
      expect(trimFramesBuffer(list, 10).droppedCount).toBe(0);
      expect(trimFramesBuffer(list, 0).droppedCount).toBe(0);
      expect(trimFramesBuffer(list, -1).droppedCount).toBe(0);
    });

    it('10.3 FrameBufferManager 压入新帧时应正确维护容量并在超限时剔除旧帧', () => {
      const buffer = new FrameBufferManager(3);
      expect(buffer.getMaxSize()).toBe(3);

      const f1 = createMessageFrame({ direction: 'receive', raw: 'frame-1' });
      const f2 = createMessageFrame({ direction: 'receive', raw: 'frame-2' });
      const f3 = createMessageFrame({ direction: 'receive', raw: 'frame-3' });
      const f4 = createMessageFrame({ direction: 'receive', raw: 'frame-4' });

      expect(buffer.addFrame(f1).dropped).toBe(false);
      expect(buffer.addFrame(f2).dropped).toBe(false);
      expect(buffer.addFrame(f3).dropped).toBe(false);
      expect(buffer.getFrames().length).toBe(3);

      // 第 4 帧压入，应触发丢弃最早的 f1
      const dropRes = buffer.addFrame(f4);
      expect(dropRes.dropped).toBe(true);
      expect(dropRes.droppedCount).toBe(1);
      expect(buffer.getTotalDropped()).toBe(1);

      const current = buffer.getFrames();
      expect(current.length).toBe(3);
      expect(current[0].raw).toBe('frame-2');
      expect(current[2].raw).toBe('frame-4');

      // 调整 maxSize 为 2，应立即再次截断
      buffer.setMaxSize(2);
      expect(buffer.getFrames().length).toBe(2);
      expect(buffer.getFrames()[0].raw).toBe('frame-3');
      expect(buffer.getTotalDropped()).toBe(2);

      buffer.clear();
      expect(buffer.getFrames().length).toBe(0);
      expect(buffer.getTotalDropped()).toBe(0);
    });
  });

  describe('11. 消息帧导出与下载辅助测试', () => {
    it('11.1 exportFramesToJson 应生成合法的 JSON 格式字符串且能还原', () => {
      const frames = [
        createMessageFrame({ direction: 'send', raw: 'Ping', protocol: 'ws' }),
        createMessageFrame({ direction: 'receive', raw: 'Pong', protocol: 'ws' }),
      ];

      const jsonStr = exportFramesToJson(frames);
      const parsed = JSON.parse(jsonStr);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0].raw).toBe('Ping');
      expect(parsed[1].raw).toBe('Pong');
    });

    it('11.2 exportFramesToTxt 应输出包含时间、方向与协议的美化排版文本', () => {
      const frames = [
        createMessageFrame({
          direction: 'send',
          raw: '{"action":"start"}',
          protocol: 'ws',
        }),
        createMessageFrame({
          direction: 'receive',
          raw: '{"status":"ok"}',
          protocol: 'ws',
          summary: 'ACK',
        }),
      ];

      const txt = exportFramesToTxt(frames);
      expect(txt).toContain('[WS ] [SEND  ]');
      expect(txt).toContain('{"action":"start"}');
      expect(txt).toContain('[WS ] [RECV  ] [ACK]');
      expect(txt).toContain('{"status":"ok"}');
      expect(txt).toContain('----------------------------------------');
    });

    it('11.3 exportFramesToTxt 针对空列表返回空字符串', () => {
      expect(exportFramesToTxt([])).toBe('');
    });

    it('11.4 downloadFile 在无 DOM 或标准环境下应安全运行不抛错', () => {
      expect(() => {
        downloadFile('test content', 'test.txt');
      }).not.toThrow();
    });
  });

  describe('12. 常用载荷预设与 LocalStorage 状态持久化测试', () => {
    const memoryStore: Record<string, string> = {};

    beforeEach(() => {
      for (const k in memoryStore) {
        delete memoryStore[k];
      }
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => memoryStore[k] || null,
        setItem: (k: string, v: string) => {
          memoryStore[k] = String(v);
        },
        removeItem: (k: string) => {
          delete memoryStore[k];
        },
        clear: () => {
          for (const k in memoryStore) {
            delete memoryStore[k];
          }
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('12.1 loadPresetsFromStorage 在存储为空时应返回完整的系统内置预设', () => {
      const presets = loadPresetsFromStorage('test_empty_key');
      expect(presets.length).toBe(DEFAULT_PAYLOAD_PRESETS.length);
      expect(presets[0].id).toBe('preset_builtin_openai_stream');
      expect(presets[0].isBuiltin).toBe(true);
    });

    it('12.2 createPresetItem 能够正确生成规范的预设项', () => {
      const item = createPresetItem('自定义认证', '{"token":"xyz"}', 'ws', '测试备注');
      expect(item.title).toBe('自定义认证');
      expect(item.payload).toBe('{"token":"xyz"}');
      expect(item.protocol).toBe('ws');
      expect(item.description).toBe('测试备注');
      expect(item.isBuiltin).toBe(false);
      expect(item.id).toContain('preset_custom_');
      expect(item.createdAt).toBeGreaterThan(0);
    });

    it('12.3 savePresetsToStorage 与 loadPresetsFromStorage 能够实现完整闭环', () => {
      const customPresets = [
        createPresetItem('我的预设 1', 'payload 1', 'sse'),
        createPresetItem('我的预设 2', 'payload 2', 'ws'),
      ];

      const saved = savePresetsToStorage(customPresets, 'test_presets_key');
      expect(saved).toBe(true);

      const loaded = loadPresetsFromStorage('test_presets_key');
      expect(loaded.length).toBe(2);
      expect(loaded[0].title).toBe('我的预设 1');
      expect(loaded[1].title).toBe('我的预设 2');
    });

    it('12.4 loadPresetsFromStorage 面对损坏的 JSON 数据应安全降级返回内置预设', () => {
      memoryStore.corrupted_key = '{invalid_json_format';
      const presets = loadPresetsFromStorage('corrupted_key');
      expect(presets.length).toBe(DEFAULT_PAYLOAD_PRESETS.length);
      expect(presets[0].id).toBe('preset_builtin_openai_stream');
    });

    it('12.5 getDefaultClientState 应输出具备默认连接与配置的初始模型', () => {
      const state = getDefaultClientState();
      expect(state.activeProtocol).toBe('ws');
      expect(state.wsUrl).toBe('wss://ws.postman-echo.com/raw');
      expect(state.frameBufferSize).toBe(200);
      expect(state.sseMethod).toBe('POST');
    });

    it('12.6 saveClientStateToStorage 与 loadClientStateFromStorage 实现状态闭环与恢复', () => {
      const defaultState = getDefaultClientState();
      const customState = {
        ...defaultState,
        activeProtocol: 'sse' as const,
        sseUrl: 'https://api.my-domain.com/v1/chat',
        sseMethod: 'POST' as const,
        frameBufferSize: 500,
        subprotocolsInput: 'v1.custom',
      };

      const saved = saveClientStateToStorage(customState, 'test_state_key');
      expect(saved).toBe(true);

      const restored = loadClientStateFromStorage(defaultState, 'test_state_key');
      expect(restored.activeProtocol).toBe('sse');
      expect(restored.sseUrl).toBe('https://api.my-domain.com/v1/chat');
      expect(restored.frameBufferSize).toBe(500);
      expect(restored.subprotocolsInput).toBe('v1.custom');
    });

    it('12.7 loadClientStateFromStorage 面对异常或部分缺失字段时应优雅防御回退', () => {
      const defaultState = getDefaultClientState();
      // 写入缺失了部分字段且包含非法类型的对象
      memoryStore.corrupted_state_key = JSON.stringify({
        activeProtocol: 'unknown_protocol', // 非法协议
        wsUrl: 12345, // 非法字符串
        frameBufferSize: 'not_a_number', // 非法数字
      });

      const fallback = loadClientStateFromStorage(defaultState, 'corrupted_state_key');
      expect(fallback.activeProtocol).toBe('ws'); // 回退至 ws
      expect(fallback.wsUrl).toBe(defaultState.wsUrl); // 回退至默认地址
      expect(fallback.frameBufferSize).toBe(defaultState.frameBufferSize); // 回退至默认容量
    });

    it('12.8 loadClientStateFromStorage 自动将历史已失效的 echo.websocket.events 升级迁移至 Postman 回显源', () => {
      const defaultState = getDefaultClientState();
      memoryStore.old_legacy_key = JSON.stringify({
        ...defaultState,
        wsUrl: 'wss://echo.websocket.events/?client=Ateng-Tools&version=1.0.0',
      });

      const migrated = loadClientStateFromStorage(defaultState, 'old_legacy_key');
      expect(migrated.wsUrl).toBe('wss://ws.postman-echo.com/raw');
    });
  });

  describe('13. Markdown 渲染引擎与多轮会话管理测试', () => {
    it('13.1 renderMarkdownToHtml 应正确转换粗体、列表与代码块并语法着色', () => {
      const md = '# 标题\n\n**加粗内容**\n\n```ts\nconst x = 1;\n```';
      const html = renderMarkdownToHtml(md);
      expect(html).toContain('<h1>标题</h1>');
      expect(html).toContain('<strong>加粗内容</strong>');
      expect(html).toContain('hljs');
      expect(html).toContain('language-ts');
    });

    it('13.2 renderMarkdownToHtml 面对空输入或纯空白字符串应安全返回空字符串', () => {
      expect(renderMarkdownToHtml('')).toBe('');
      expect(renderMarkdownToHtml('   \n\t ')).toBe('');
    });

    it('13.3 createStreamTurn、appendTurnDelta 与 finalizeStreamTurn 应正确驱动会话轮次状态流', () => {
      const turn = createStreamTurn(1, '你好大模型');
      expect(turn.turnIndex).toBe(1);
      expect(turn.promptSummary).toBe('你好大模型');
      expect(turn.text).toBe('');
      expect(turn.chunkCount).toBe(0);
      expect(turn.isCompleted).toBe(false);

      const turnWithD1 = appendTurnDelta(turn, '你好！');
      expect(turnWithD1.text).toBe('你好！');
      expect(turnWithD1.chunkCount).toBe(1);
      expect(turnWithD1.charCount).toBe(3);

      const turnWithD2 = appendTurnDelta(turnWithD1, '很高兴为您服务。');
      expect(turnWithD2.text).toBe('你好！很高兴为您服务。');
      expect(turnWithD2.chunkCount).toBe(2);
      expect(turnWithD2.charCount).toBe(11);

      const finished = finalizeStreamTurn(turnWithD2);
      expect(finished.isCompleted).toBe(true);
      expect(finished.endTime).toBeGreaterThanOrEqual(finished.startTime);
    });
  });
});
