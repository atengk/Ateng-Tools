<!--
 * WebSocket 与 SSE 流式调试助手界面组件
 *
 * @author Ateng
 * @since 2026-09-28
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import {
  DEFAULT_PAYLOAD_PRESETS,
  SSESession,
  WEBSOCKET_ECHO_ENDPOINTS,
  WebSocketSession,
  aggregateStreamFrames,
  appendTurnDelta,
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
  getDefaultClientState,
  loadClientStateFromStorage,
  loadPresetsFromStorage,
  parseWebSocketUrlQueryParams,
  renderMarkdownToHtml,
  saveClientStateToStorage,
  savePresetsToStorage,
  trimFramesBuffer,
  validateHttpUrl,
} from './websocket-and-sse-client.service';
import type {
  ConnectionProtocol,
  ConnectionState,
  HttpHeaderItem,
  HttpMethod,
  MessageDirection,
  MessageFrame,
  PayloadPresetItem,
  QueryParamItem,
  SSERequestConfig,
  StreamTurnItem,
  WebSocketAdvancedOptions,
} from './websocket-and-sse-client.models';

const message = useMessage();

// ==========================================
// 0. 从 LocalStorage 恢复持久化配置状态
// ==========================================
const defaultClientState = getDefaultClientState();
const savedState = loadClientStateFromStorage(defaultClientState);

// 当前激活的协议 Tab (ws: WebSocket, sse: Server-Sent Events)
const activeProtocol = ref<ConnectionProtocol>(savedState.activeProtocol);

// ==========================================
// 1. WebSocket 状态与配置
// ==========================================
const wsUrl = ref<string>(savedState.wsUrl);
const wsConnectionState = ref<ConnectionState>('DISCONNECTED');
const wsIsConnecting = computed(() => wsConnectionState.value === 'CONNECTING');
const wsIsConnected = computed(() => wsConnectionState.value === 'CONNECTED');

// 高级配置面板折叠状态
const showWsAdvancedConfig = ref<boolean>(false);
const wsAdvancedActiveTab = ref<'query' | 'protocols' | 'firstPacket' | 'heartbeat'>('query');

// Query 查询参数表
const queryParams = ref<QueryParamItem[]>(savedState.queryParams);

// 子协议 (Sec-WebSocket-Protocol)
const subprotocolsInput = ref<string>(savedState.subprotocolsInput);

// 首包自动鉴权 (First-Packet Auth)
const firstPacketAuthEnabled = ref<boolean>(savedState.firstPacketAuthEnabled);
const firstPacketAuthPayload = ref<string>(savedState.firstPacketAuthPayload);

// 心跳保活 (Heartbeat Pinger)
const heartbeatEnabled = ref<boolean>(savedState.heartbeatEnabled);
const heartbeatInterval = ref<number>(savedState.heartbeatInterval);
const heartbeatPayload = ref<string>(savedState.heartbeatPayload);

// 自动重连 (Auto Reconnect)
const autoReconnectEnabled = ref<boolean>(savedState.autoReconnectEnabled);
const maxRetries = ref<number>(savedState.maxRetries);

// 消息发送编辑区状态
const sendPayload = ref<string>(savedState.sendPayload);

// ==========================================
// 2. SSE (Server-Sent Events) 状态与配置
// ==========================================
const sseUrl = ref<string>(savedState.sseUrl);
const sseMethod = ref<HttpMethod>(savedState.sseMethod);
const sseConnectionState = ref<ConnectionState>('DISCONNECTED');
const sseIsConnecting = computed(() => sseConnectionState.value === 'CONNECTING');
const sseIsConnected = computed(() => sseConnectionState.value === 'CONNECTED');

// SSE 请求头列表
const sseHeaders = ref<HttpHeaderItem[]>(savedState.sseHeaders);

// SSE POST 请求体
const sseBody = ref<string>(savedState.sseBody);

// ==========================================
// 3. 通用消息帧时间轴列表与过滤
// ==========================================
const frames = ref<MessageFrame[]>([]);
const searchKeyword = ref<string>('');
const directionFilter = ref<'all' | MessageDirection>('all');
const protocolFilter = ref<'all' | ConnectionProtocol>('all');

/**
 * 检查并计算文本载荷的元信息与 JSON 格式
 */
function inspectPayloadMeta(text: string) {
  const trimmed = text.trim();
  let isJson = false;
  let formattedJson: string | null = null;

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      isJson = true;
      formattedJson = JSON.stringify(parsed, null, 2);
    }
    catch {
      isJson = false;
    }
  }

  const byteLength = new TextEncoder().encode(text).length;
  return {
    isJson,
    formattedJson,
    byteSize: byteLength,
    formattedSize: formatByteSize(byteLength),
    length: text.length,
  };
}

// WS 发送载荷实时校验与元信息
const payloadMeta = computed(() => inspectPayloadMeta(sendPayload.value));

// SSE 请求体实时元信息
const sseBodyMeta = computed(() => inspectPayloadMeta(sseBody.value));

// 过滤后的消息帧列表
const filteredFrames = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  const dir = directionFilter.value;
  const proto = protocolFilter.value;

  return frames.value.filter((frame) => {
    // 协议筛选
    if (proto !== 'all' && frame.protocol !== proto) {
      return false;
    }
    // 方向筛选
    if (dir !== 'all' && frame.direction !== dir) {
      return false;
    }
    // 关键字搜索
    if (keyword) {
      const matchRaw = frame.raw.toLowerCase().includes(keyword);
      const matchSummary = frame.summary?.toLowerCase().includes(keyword) || false;
      return matchRaw || matchSummary;
    }
    return true;
  });
});

// 右侧面板视图模式 (timeline: 时间轴帧明细, aggregate: 流式聚合正文)
const rightViewMode = ref<'timeline' | 'aggregate'>('timeline');

// 协议切换为 WS 时自动切回时间轴明细视图
watch(activeProtocol, (proto) => {
  if (proto === 'ws') {
    rightViewMode.value = 'timeline';
  }
});

// 环形缓冲队列上限与丢弃统计
const frameBufferSize = ref<number>(savedState.frameBufferSize);
const frameBufferSizeOptions = [
  { label: '100 帧', value: 100 },
  { label: '200 帧 (默认)', value: 200 },
  { label: '500 帧', value: 500 },
  { label: '1000 帧', value: 1000 },
  { label: '无限制 (全量保留)', value: 0 },
];
const droppedFramesCount = ref<number>(0);

// 智能滚动跟随
const autoScroll = ref<boolean>(true);
const framesViewportRef = ref<HTMLElement | null>(null);
const aggregateViewportRef = ref<HTMLElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    if (rightViewMode.value === 'timeline' && framesViewportRef.value) {
      framesViewportRef.value.scrollTop = framesViewportRef.value.scrollHeight;
    }
    else if (rightViewMode.value === 'aggregate' && aggregateViewportRef.value) {
      aggregateViewportRef.value.scrollTop = aggregateViewportRef.value.scrollHeight;
    }
  });
}

function onTimelineScroll(e: Event) {
  const el = e.target as HTMLElement;
  if (!el) {
    return;
  }
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 30;
  autoScroll.value = atBottom;
}

function handleBufferSizeChange(newSize: number) {
  frameBufferSize.value = newSize;
  if (newSize > 0 && frames.value.length > newSize) {
    const { frames: trimmed, droppedCount } = trimFramesBuffer(frames.value, newSize);
    frames.value = trimmed;
    droppedFramesCount.value += droppedCount;
  }
}

// ==========================================
// 3.1.1 大模型流式聚合轮次 (Stream Turns) 与实时预览盒
// ==========================================
const turns = ref<StreamTurnItem[]>([]);
const activeTurnId = ref<string>('');
const currentStreamingTurnId = ref<string | null>(null);
const isAggBoxCollapsed = ref<boolean>(false);
const aggRenderMode = ref<'markdown' | 'plain'>('markdown');

const activeTurn = computed<StreamTurnItem | null>(() => {
  if (turns.value.length === 0) {
    return null;
  }
  const found = turns.value.find(t => t.id === activeTurnId.value);
  return found || turns.value[turns.value.length - 1] || null;
});

const activeTurnMarkdownHtml = computed(() => {
  return renderMarkdownToHtml(activeTurn.value?.text || '');
});

const activeTurnSpeed = computed(() => {
  const t = activeTurn.value;
  if (t && t.durationMs > 100 && t.chunkCount > 0) {
    return (t.chunkCount / (t.durationMs / 1000)).toFixed(1);
  }
  return null;
});

const turnSelectOptions = computed(() => {
  return turns.value.map(t => ({
    label: `第 ${t.turnIndex} 轮 (${t.charCount} 字符${t.isCompleted ? '·已结算' : '·生成中'})`,
    value: t.id,
  }));
});

function startNewTurn(summary?: string) {
  if (currentStreamingTurnId.value) {
    finishCurrentTurn();
  }
  const turnIdx = turns.value.length + 1;
  const newTurn = createStreamTurn(turnIdx, summary);
  turns.value.push(newTurn);
  activeTurnId.value = newTurn.id;
  currentStreamingTurnId.value = newTurn.id;
  isAggBoxCollapsed.value = false;

  // 在时间轴中插入一条醒目的分割线系统帧
  const dividerFrame = createMessageFrame({
    direction: 'system',
    raw: `==================== 第 ${turnIdx} 轮会话发起 ====================`,
    summary: `第 ${turnIdx} 轮开始`,
    protocol: activeProtocol.value,
  });
  frames.value.push(dividerFrame);
}

function finishCurrentTurn() {
  if (currentStreamingTurnId.value) {
    const idx = turns.value.findIndex(t => t.id === currentStreamingTurnId.value);
    if (idx !== -1) {
      turns.value[idx] = finalizeStreamTurn(turns.value[idx]);
    }
    currentStreamingTurnId.value = null;
  }
}

function handleExportTurnMarkdown() {
  const t = activeTurn.value;
  if (!t || !t.text) {
    message.warning('当前轮次暂无聚合正文可导出');
    return;
  }
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  downloadFile(t.text, `llm-stream-turn-${t.turnIndex}-${dateStr}.md`, 'text/markdown;charset=utf-8');
  message.success(`已导出第 ${t.turnIndex} 轮聚合正文为 Markdown`);
}

function handleNewFrame(frame: MessageFrame) {
  frames.value.push(frame);
  if (frameBufferSize.value > 0 && frames.value.length > frameBufferSize.value) {
    const { frames: trimmed, droppedCount } = trimFramesBuffer(frames.value, frameBufferSize.value);
    frames.value = trimmed;
    droppedFramesCount.value += droppedCount;
  }

  // 仅在 SSE 模式下执行流式文本增量智能注入
  if (activeProtocol.value === 'sse' && frame.direction === 'receive') {
    const delta = extractDeltaContent(frame.raw, frame.parsedJson);
    if (delta) {
      if (!currentStreamingTurnId.value) {
        startNewTurn('自动探测流式响应');
      }
      const idx = turns.value.findIndex(t => t.id === currentStreamingTurnId.value);
      if (idx !== -1) {
        turns.value[idx] = appendTurnDelta(turns.value[idx], delta);
      }
    }
    if (frame.raw.trim() === '[DONE]') {
      finishCurrentTurn();
    }
  }

  if (autoScroll.value) {
    scrollToBottom();
  }
}

// 大模型流式聚合分析
const streamAggregate = computed(() => aggregateStreamFrames(frames.value));
const tokensPerSecond = computed(() => {
  const agg = streamAggregate.value;
  if (agg.durationMs > 100 && agg.chunkCount > 0) {
    return (agg.chunkCount / (agg.durationMs / 1000)).toFixed(1);
  }
  return null;
});

// 数据导出动作
function handleExportJson() {
  if (frames.value.length === 0) {
    message.warning('当前暂无可导出的消息帧');
    return;
  }
  const jsonStr = exportFramesToJson(frames.value);
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  downloadFile(jsonStr, `websocket-sse-frames-${dateStr}.json`, 'application/json;charset=utf-8');
  message.success('已导出完整 JSON 消息帧文件');
}

function handleExportTxt() {
  if (frames.value.length === 0) {
    message.warning('当前暂无可导出的消息帧');
    return;
  }
  const txtStr = exportFramesToTxt(frames.value);
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  downloadFile(txtStr, `websocket-sse-frames-${dateStr}.txt`, 'text/plain;charset=utf-8');
  message.success('已导出排版 TXT 纯文本日志');
}

function handleExportAggregateText() {
  if (!streamAggregate.value.text) {
    message.warning('当前暂无可导出的聚合文本');
    return;
  }
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  downloadFile(streamAggregate.value.text, `stream-aggregate-${dateStr}.txt`, 'text/plain;charset=utf-8');
  message.success('已导出聚合结果文本');
}

// ==========================================
// 3.2 客户端配置变动自动防抖持久化
// ==========================================
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersistState() {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    saveClientStateToStorage({
      activeProtocol: activeProtocol.value,
      wsUrl: wsUrl.value,
      queryParams: queryParams.value,
      subprotocolsInput: subprotocolsInput.value,
      firstPacketAuthEnabled: firstPacketAuthEnabled.value,
      firstPacketAuthPayload: firstPacketAuthPayload.value,
      heartbeatEnabled: heartbeatEnabled.value,
      heartbeatInterval: heartbeatInterval.value,
      heartbeatPayload: heartbeatPayload.value,
      autoReconnectEnabled: autoReconnectEnabled.value,
      maxRetries: maxRetries.value,
      sendPayload: sendPayload.value,
      sseUrl: sseUrl.value,
      sseMethod: sseMethod.value,
      sseHeaders: sseHeaders.value,
      sseBody: sseBody.value,
      frameBufferSize: frameBufferSize.value,
    });
  }, 300);
}

// 深度监听所有配置变动，自动同步保存
watch(
  [
    activeProtocol,
    wsUrl,
    queryParams,
    subprotocolsInput,
    firstPacketAuthEnabled,
    firstPacketAuthPayload,
    heartbeatEnabled,
    heartbeatInterval,
    heartbeatPayload,
    autoReconnectEnabled,
    maxRetries,
    sendPayload,
    sseUrl,
    sseMethod,
    sseHeaders,
    sseBody,
    frameBufferSize,
  ],
  schedulePersistState,
  { deep: true },
);

// ==========================================
// 3.3 常用载荷预设库 (Payload Presets)
// ==========================================
const showPresetsDrawer = ref<boolean>(false);
const presetsList = ref<PayloadPresetItem[]>(loadPresetsFromStorage());
const presetSearchText = ref<string>('');
const presetProtocolFilter = ref<'all' | ConnectionProtocol>('all');

// 新增预设弹窗表单状态
const showAddPresetModal = ref<boolean>(false);
const newPresetTitle = ref<string>('');
const newPresetDesc = ref<string>('');
const newPresetProtocol = ref<ConnectionProtocol | 'all'>('all');
const newPresetPayload = ref<string>('');

const filteredPresets = computed(() => {
  const kw = presetSearchText.value.trim().toLowerCase();
  const proto = presetProtocolFilter.value;

  return presetsList.value.filter((item) => {
    if (proto !== 'all' && item.protocol !== 'all' && item.protocol !== proto) {
      return false;
    }
    if (kw) {
      const matchTitle = item.title.toLowerCase().includes(kw);
      const matchDesc = item.description?.toLowerCase().includes(kw) || false;
      const matchPayload = item.payload.toLowerCase().includes(kw);
      return matchTitle || matchDesc || matchPayload;
    }
    return true;
  });
});

function applyPreset(preset: PayloadPresetItem) {
  if (preset.protocol === 'ws') {
    activeProtocol.value = 'ws';
    sendPayload.value = preset.payload;
    message.success(`已载入预设【${preset.title}】至 WebSocket 发送区`);
  }
  else if (preset.protocol === 'sse') {
    activeProtocol.value = 'sse';
    sseBody.value = preset.payload;
    message.success(`已载入预设【${preset.title}】至 SSE POST 请求体`);
  }
  else {
    if (activeProtocol.value === 'ws') {
      sendPayload.value = preset.payload;
    }
    else {
      sseBody.value = preset.payload;
    }
    message.success(`已载入预设【${preset.title}】至当前编辑区`);
  }
  showPresetsDrawer.value = false;
}

function removePreset(id: string) {
  const idx = presetsList.value.findIndex(p => p.id === id);
  if (idx !== -1) {
    const item = presetsList.value[idx];
    if (item.isBuiltin) {
      message.warning('系统内置推荐预设无法删除');
      return;
    }
    presetsList.value.splice(idx, 1);
    savePresetsToStorage(presetsList.value);
    message.success('已删除自定义预设');
  }
}

function resetPresetsToDefault() {
  presetsList.value = [...DEFAULT_PAYLOAD_PRESETS];
  savePresetsToStorage(presetsList.value);
  message.success('已重置恢复系统内置预设模板');
}

function openAddPresetModal() {
  newPresetTitle.value = '';
  newPresetDesc.value = '';
  newPresetProtocol.value = activeProtocol.value;
  newPresetPayload.value = activeProtocol.value === 'ws' ? sendPayload.value : sseBody.value;
  showAddPresetModal.value = true;
}

function handleSaveNewPreset() {
  if (!newPresetTitle.value.trim()) {
    message.warning('请输入预设名称');
    return;
  }
  if (!newPresetPayload.value.trim()) {
    message.warning('预设载荷报文不能为空');
    return;
  }
  const item = createPresetItem(
    newPresetTitle.value,
    newPresetPayload.value,
    newPresetProtocol.value,
    newPresetDesc.value,
  );
  presetsList.value.unshift(item);
  savePresetsToStorage(presetsList.value);
  showAddPresetModal.value = false;
  message.success(`已成功保存自定义预设【${item.title}】`);
}

// WebSocket 会话管理器单例
const wsSession = new WebSocketSession({
  onStateChange: (state: ConnectionState) => {
    wsConnectionState.value = state;
    if (state === 'DISCONNECTED' || state === 'ERROR') {
      finishCurrentTurn();
    }
  },
  onFrame: (frame: MessageFrame) => {
    handleNewFrame(frame);
  },
});

// SSE 会话管理器单例
const sseSession = new SSESession({
  onStateChange: (state: ConnectionState) => {
    sseConnectionState.value = state;
    if (state === 'DISCONNECTED' || state === 'ERROR') {
      finishCurrentTurn();
    }
  },
  onFrame: (frame: MessageFrame) => {
    handleNewFrame(frame);
  },
});

// ==========================================
// 4. WebSocket 控制动作
// ==========================================
function addQueryParam() {
  queryParams.value.push({ key: '', value: '', enabled: true });
}

function removeQueryParam(index: number) {
  queryParams.value.splice(index, 1);
}

function extractParamsFromUrl() {
  const { baseUrl, queryParams: parsed } = parseWebSocketUrlQueryParams(wsUrl.value);
  if (parsed.length > 0) {
    wsUrl.value = baseUrl;
    queryParams.value = parsed;
    message.success(`已从 URL 提取 ${parsed.length} 个查询参数`);
  }
  else {
    message.info('当前 URL 中未包含查询参数');
  }
}

function mergeParamsIntoUrl() {
  const compiled = compileWebSocketUrl(wsUrl.value, queryParams.value);
  if (compiled) {
    wsUrl.value = compiled;
    message.success('已将参数表合并编码至连接 URL');
  }
}

// 常用公共与本地 WebSocket 回显测试源下拉选项
const wsEndpointDropdownOptions = WEBSOCKET_ECHO_ENDPOINTS.map(item => ({
  label: item.label,
  key: item.value,
}));

function handleSelectWsEndpoint(endpointUrl: string) {
  wsUrl.value = endpointUrl;
  const match = WEBSOCKET_ECHO_ENDPOINTS.find(item => item.value === endpointUrl);
  message.success(`已切换至: ${match?.label || endpointUrl}`);
}

function handleWsConnect() {
  // 智能纠错防御：若检测到历史遗留的失效公网测试源，自动替换为稳定源
  if (wsUrl.value.includes('echo.websocket.events')) {
    message.warning('检测到原公网测试源 echo.websocket.events 已下线，已自动帮您切换为稳定的 Postman 回显源。');
    wsUrl.value = 'wss://ws.postman-echo.com/raw';
  }

  const options: WebSocketAdvancedOptions = {
    queryParams: queryParams.value,
    protocols: subprotocolsInput.value
      ? subprotocolsInput.value.split(',').map(s => s.trim()).filter(Boolean)
      : [],
    firstPacketAuth: {
      enabled: firstPacketAuthEnabled.value,
      payload: firstPacketAuthPayload.value,
    },
    heartbeat: {
      enabled: heartbeatEnabled.value,
      intervalSeconds: heartbeatInterval.value,
      payload: heartbeatPayload.value,
    },
    autoReconnect: {
      enabled: autoReconnectEnabled.value,
      maxRetries: maxRetries.value,
      baseDelayMs: 1000,
    },
  };

  wsSession.connect(wsUrl.value, options);
}

function handleWsDisconnect() {
  finishCurrentTurn();
  wsSession.disconnect();
}

function handleWsSend() {
  if (!wsIsConnected.value) {
    message.warning('请先成功建立 WebSocket 连接后再发送消息');
    return;
  }
  if (!sendPayload.value) {
    message.warning('发送内容不能为空');
    return;
  }
  wsSession.send(sendPayload.value);
}

function handleWsKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    handleWsSend();
  }
}

function formatWsJson() {
  if (payloadMeta.value.isJson && payloadMeta.value.formattedJson) {
    sendPayload.value = payloadMeta.value.formattedJson;
    message.success('已完成 JSON 格式化');
  }
  else {
    message.info('当前内容非标准 JSON 格式，无需格式化');
  }
}

// ==========================================
// 5. SSE 控制动作
// ==========================================
function addSseHeader() {
  sseHeaders.value.push({ key: '', value: '', enabled: true });
}

function removeSseHeader(index: number) {
  sseHeaders.value.splice(index, 1);
}

async function handleSseConnect() {
  const validation = validateHttpUrl(sseUrl.value);
  if (!validation.valid) {
    message.warning(validation.error || '请输入有效的 HTTP/HTTPS 地址');
    return;
  }

  // 友好提示：若检测到仍在使用未替换的占位符 Key，给予明确指引
  const authHeader = sseHeaders.value.find(h => h.enabled && h.key.toLowerCase() === 'authorization');
  if (authHeader && authHeader.value.includes('YOUR_API_KEY')) {
    message.warning('检测到 Authorization 仍包含占位符 YOUR_API_KEY，未填写有效密钥可能会收到 401 鉴权失败响应。', {
      duration: 5000,
    });
  }

  // 发起新流时，若当前已有轮次且已有内容，开启新轮次
  if (turns.value.length > 0 && turns.value[turns.value.length - 1].charCount > 0) {
    startNewTurn('SSE 流式请求');
  }

  const config: SSERequestConfig = {
    url: sseUrl.value,
    method: sseMethod.value,
    headers: sseHeaders.value,
    body: sseBody.value,
  };

  await sseSession.connect(config);
}

function handleSseDisconnect() {
  finishCurrentTurn();
  sseSession.disconnect();
}

function formatSseJson() {
  if (sseBodyMeta.value.isJson && sseBodyMeta.value.formattedJson) {
    sseBody.value = sseBodyMeta.value.formattedJson;
    message.success('已完成 SSE JSON 请求体格式化');
  }
  else {
    message.info('当前请求体非标准 JSON 格式，无需格式化');
  }
}

function loadSampleLLMSSE() {
  activeProtocol.value = 'sse';
  sseUrl.value = 'https://api.openai.com/v1/chat/completions';
  sseMethod.value = 'POST';
  sseHeaders.value = [
    { key: 'Accept', value: 'text/event-stream', enabled: true },
    { key: 'Authorization', value: 'Bearer YOUR_API_KEY', enabled: true },
  ];
  sseBody.value = JSON.stringify(
    {
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: '你好，请写一首关于技术与探索的七言绝句。' },
      ],
      stream: true,
    },
    null,
    2,
  );
  message.success('已载入大模型流式对话 (LLM SSE) 示例配置 (请在请求头填入您的真实 API Key)');
}

function loadSampleEcho() {
  activeProtocol.value = 'ws';
  wsUrl.value = 'wss://ws.postman-echo.com/raw';
  queryParams.value = [
    { key: 'client', value: 'Ateng-Tools', enabled: true },
    { key: 'version', value: '1.0.0', enabled: true },
  ];
  subprotocolsInput.value = '';
  firstPacketAuthEnabled.value = false;
  heartbeatEnabled.value = true;
  heartbeatInterval.value = 15;
  heartbeatPayload.value = '{"type":"ping","source":"ateng"}';
  sendPayload.value = JSON.stringify(
    {
      action: 'greeting',
      message: 'Hello from Ateng-Tools WebSocket Client!',
      timestamp: Date.now(),
    },
    null,
    2,
  );
  message.success('已载入 Postman 公共回显服务与心跳示例配置');
}

async function copyText(content: string) {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(content);
      message.success('已复制到剪贴板');
    }
    catch {
      message.error('复制失败，请手动选择复制');
    }
  }
}

function clearFrames() {
  frames.value = [];
  droppedFramesCount.value = 0;
  message.info('已清空消息帧列表与丢弃计数');
}

onBeforeUnmount(() => {
  wsSession.disconnect();
  sseSession.disconnect();
});
</script>

<template>
  <div class="websocket-and-sse-client" style="flex: 0 0 100%">
    <!-- 顶部协议模式切换与示例栏 -->
    <c-card mb-4>
      <div flex flex-wrap items-center justify-between gap-4>
        <div flex items-center gap-2>
          <n-tabs v-model:value="activeProtocol" type="segment" size="small" style="width: 260px">
            <n-tab name="ws">
              WebSocket 客户端
            </n-tab>
            <n-tab name="sse">
              SSE 调试器
            </n-tab>
          </n-tabs>
        </div>

        <div flex items-center gap-2>
          <c-button size="small" type="primary" @click="showPresetsDrawer = true">
            载荷预设库
          </c-button>
          <c-button size="small" @click="loadSampleEcho">
            载入 WS 示例
          </c-button>
          <c-button size="small" @click="loadSampleLLMSSE">
            载入 LLM SSE 示例
          </c-button>
          <c-button size="small" @click="clearFrames">
            清空列表
          </c-button>
        </div>
      </div>
    </c-card>

    <!-- 模式 A：WebSocket 连接与控制区 -->
    <c-card v-if="activeProtocol === 'ws'" mb-4>
      <div flex flex-col gap-3>
        <!-- 主连接栏 -->
        <div flex flex-wrap items-center gap-3>
          <div min-w-280px flex-1>
            <n-input
              v-model:value="wsUrl"
              placeholder="输入 WebSocket 服务端地址，如 ws://127.0.0.1:8088 或 wss://ws.postman-echo.com/raw"
              :disabled="wsIsConnected || wsIsConnecting"
              font-mono
            >
              <template #prefix>
                <span mr-1 text-12px text-gray-400 font-bold>WS</span>
              </template>
            </n-input>
          </div>

          <!-- 快速回显测试源下拉 -->
          <n-dropdown
            :options="wsEndpointDropdownOptions"
            :disabled="wsIsConnected || wsIsConnecting"
            @select="handleSelectWsEndpoint"
          >
            <c-button size="medium">
              回显测试源 ▾
            </c-button>
          </n-dropdown>

          <c-button
            size="medium"
            :type="showWsAdvancedConfig ? 'primary' : 'default'"
            @click="showWsAdvancedConfig = !showWsAdvancedConfig"
          >
            {{ showWsAdvancedConfig ? '收起配置 ▴' : '高级配置 (Query/鉴权/心跳) ▾' }}
          </c-button>

          <n-tag
            :type="
              wsConnectionState === 'CONNECTED'
                ? 'success'
                : wsConnectionState === 'CONNECTING'
                  ? 'warning'
                  : wsConnectionState === 'ERROR'
                    ? 'error'
                    : 'default'
            "
            round
            size="medium"
          >
            <template #icon>
              <span

                mr-1 inline-block h-2 w-2 rounded-full
                :class="
                  wsConnectionState === 'CONNECTED'
                    ? 'bg-green-500'
                    : wsConnectionState === 'CONNECTING'
                      ? 'bg-yellow-500 animate-pulse'
                      : wsConnectionState === 'ERROR'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                "
              />
            </template>
            {{
              wsConnectionState === 'CONNECTED'
                ? '已连接'
                : wsConnectionState === 'CONNECTING'
                  ? '正在连接...'
                  : wsConnectionState === 'ERROR'
                    ? '连接异常'
                    : '未连接'
            }}
          </n-tag>

          <div flex items-center gap-2>
            <c-button
              v-if="!wsIsConnected"
              type="primary"
              :loading="wsIsConnecting"
              @click="handleWsConnect"
            >
              连接
            </c-button>
            <c-button
              v-else
              type="error"
              @click="handleWsDisconnect"
            >
              断开连接
            </c-button>
          </div>
        </div>

        <!-- WS 高级配置折叠区域 -->
        <div
          v-if="showWsAdvancedConfig"
          class="bg-gray-50/50 dark:bg-gray-900/30"

          flex flex-col gap-3 border border-gray-200 rounded-lg p-4 dark:border-gray-800
        >
          <n-tabs v-model:value="wsAdvancedActiveTab" type="line" animated size="small">
            <n-tab-pane name="query" tab="Query 查询参数">
              <div flex flex-col gap-3 pt-2>
                <div flex items-center justify-between gap-2 text-12px text-gray-500>
                  <span>配置后将自动作为 Query 参数安全编码附加至 WS 地址末尾（如 ?token=xxx）。</span>
                  <div flex items-center gap-2>
                    <c-button size="tiny" @click="extractParamsFromUrl">
                      从 URL 提取
                    </c-button>
                    <c-button size="tiny" @click="mergeParamsIntoUrl">
                      合并到 URL
                    </c-button>
                    <c-button size="tiny" type="primary" @click="addQueryParam">
                      + 添加参数
                    </c-button>
                  </div>
                </div>

                <div v-if="queryParams.length === 0" py-4 text-center text-12px text-gray-400>
                  暂无参数，点击右上角 “+ 添加参数” 按钮配置
                </div>
                <div v-else flex flex-col gap-2>
                  <div v-for="(item, idx) in queryParams" :key="idx" flex items-center gap-2>
                    <n-checkbox v-model:checked="item.enabled" :disabled="wsIsConnected" />
                    <n-input
                      v-model:value="item.key"
                      size="small"
                      placeholder="参数名 (Key)"
                      style="width: 200px"
                      font-mono
                      :disabled="wsIsConnected"
                    />
                    <span text-gray-400>=</span>
                    <n-input
                      v-model:value="item.value"
                      size="small"
                      placeholder="参数值 (Value)"
                      flex-1
                      font-mono
                      :disabled="wsIsConnected"
                    />
                    <c-button size="tiny" text type="error" :disabled="wsIsConnected" @click="removeQueryParam(idx)">
                      删除
                    </c-button>
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <n-tab-pane name="protocols" tab="子协议 (Subprotocols)">
              <div flex flex-col gap-2 pt-2>
                <span text-12px text-gray-500>
                  指定握手阶段的 <code>Sec-WebSocket-Protocol</code>（多个子协议用英文逗号隔开，如 <code>v1.chat, mqtt, graphql-ws</code>）。
                </span>
                <n-input
                  v-model:value="subprotocolsInput"
                  size="small"
                  placeholder="例如: v1.chat, mqtt"
                  font-mono
                  :disabled="wsIsConnected"
                />
              </div>
            </n-tab-pane>

            <n-tab-pane name="firstPacket" tab="首包自动鉴权">
              <div flex flex-col gap-3 pt-2>
                <div flex items-center justify-between gap-2>
                  <div flex items-center gap-2>
                    <n-switch v-model:value="firstPacketAuthEnabled" size="small" :disabled="wsIsConnected" />
                    <span text-13px font-bold>启用握手后首包自动鉴权 (First-Packet Auth)</span>
                  </div>
                  <span text-12px text-gray-400>连接建立瞬间（onopen）毫秒级自动发出该报文</span>
                </div>
                <n-input
                  v-model:value="firstPacketAuthPayload"
                  type="textarea"
                  :rows="4"
                  placeholder="输入首包自动发送的认证报文 (JSON 或 纯文本)..."
                  font-mono
                  :disabled="wsIsConnected || !firstPacketAuthEnabled"
                />
              </div>
            </n-tab-pane>

            <n-tab-pane name="heartbeat" tab="心跳保活与自动重连">
              <div grid grid-cols-1 gap-4 pt-2 md:grid-cols-2>
                <div flex flex-col gap-3 border border-gray-200 rounded p-3 dark:border-gray-800>
                  <div flex items-center gap-2>
                    <n-switch v-model:value="heartbeatEnabled" size="small" />
                    <span text-13px font-bold>心跳保活器 (Heartbeat)</span>
                  </div>
                  <div flex items-center gap-2 text-12px>
                    <span whitespace-nowrap text-gray-500>间隔(秒):</span>
                    <n-input-number v-model:value="heartbeatInterval" size="small" :min="1" :max="3600" style="width: 100px" />
                  </div>
                  <div flex flex-col gap-1 text-12px>
                    <span text-gray-500>探测载荷:</span>
                    <n-input v-model:value="heartbeatPayload" size="small" font-mono placeholder="如 ping 或 {&quot;type&quot;:&quot;ping&quot;}" />
                  </div>
                </div>

                <div flex flex-col gap-3 border border-gray-200 rounded p-3 dark:border-gray-800>
                  <div flex items-center gap-2>
                    <n-switch v-model:value="autoReconnectEnabled" size="small" />
                    <span text-13px font-bold>断线自动重连</span>
                  </div>
                  <div flex items-center gap-2 text-12px>
                    <span whitespace-nowrap text-gray-500>最大重试次数:</span>
                    <n-input-number v-model:value="maxRetries" size="small" :min="1" :max="20" style="width: 100px" />
                  </div>
                  <span text-12px text-gray-400>
                    采用指数退避延迟算法（1.0s, 1.5s, 2.2s...），在意外断线时自动重试。主动断开不触发重连。
                  </span>
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </div>
      </div>
    </c-card>

    <!-- 模式 B：SSE 流式连接与请求配置区 -->
    <c-card v-else mb-4>
      <div flex flex-col gap-3>
        <!-- 主连接栏 -->
        <div flex flex-wrap items-center gap-3>
          <!-- 请求方法选择 -->
          <div style="width: 110px">
            <n-select
              v-model:value="sseMethod"
              :options="[
                { label: 'POST', value: 'POST' },
                { label: 'GET', value: 'GET' },
              ]"
              :disabled="sseIsConnected || sseIsConnecting"
            />
          </div>

          <!-- URL 输入 -->
          <div min-w-280px flex-1>
            <n-input
              v-model:value="sseUrl"
              placeholder="输入 SSE 流式目标地址，如 https://api.openai.com/v1/chat/completions"
              :disabled="sseIsConnected || sseIsConnecting"
              font-mono
            >
              <template #prefix>
                <span mr-1 text-12px text-gray-400 font-bold>SSE</span>
              </template>
            </n-input>
          </div>

          <!-- 状态指示 Tag -->
          <n-tag
            :type="
              sseConnectionState === 'CONNECTED'
                ? 'success'
                : sseConnectionState === 'CONNECTING'
                  ? 'warning'
                  : sseConnectionState === 'ERROR'
                    ? 'error'
                    : 'default'
            "
            round
            size="medium"
          >
            <template #icon>
              <span

                mr-1 inline-block h-2 w-2 rounded-full
                :class="
                  sseConnectionState === 'CONNECTED'
                    ? 'bg-green-500'
                    : sseConnectionState === 'CONNECTING'
                      ? 'bg-yellow-500 animate-pulse'
                      : sseConnectionState === 'ERROR'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                "
              />
            </template>
            {{
              sseConnectionState === 'CONNECTED'
                ? '监听中'
                : sseConnectionState === 'CONNECTING'
                  ? '连接中...'
                  : sseConnectionState === 'ERROR'
                    ? '连接异常'
                    : '未连接'
            }}
          </n-tag>

          <!-- 操作按钮 -->
          <div flex items-center gap-2>
            <c-button
              v-if="!sseIsConnected"
              type="primary"
              :loading="sseIsConnecting"
              @click="handleSseConnect"
            >
              连接并启动流
            </c-button>
            <c-button
              v-else
              type="error"
              @click="handleSseDisconnect"
            >
              中止流传输
            </c-button>
          </div>
        </div>

        <!-- SSE 请求头与请求体配置 -->
        <div class="bg-gray-50/50 dark:bg-gray-900/30" flex flex-col gap-3 border border-gray-200 rounded-lg p-4 dark:border-gray-800>
          <n-tabs type="line" animated size="small">
            <!-- 请求头配置 -->
            <n-tab-pane name="headers" tab="自定义请求头 (Headers)">
              <div flex flex-col gap-3 pt-2>
                <div flex items-center justify-between gap-2 text-12px text-gray-500>
                  <span>基于 Fetch + ReadableStream 引擎，支持在握手时携带 Authorization 等任意 HTTP 请求头。</span>
                  <c-button size="tiny" type="primary" :disabled="sseIsConnected" @click="addSseHeader">
                    + 添加请求头
                  </c-button>
                </div>

                <div v-if="sseHeaders.length === 0" py-4 text-center text-12px text-gray-400>
                  暂无请求头，点击右上角 “+ 添加请求头” 配置
                </div>
                <div v-else flex flex-col gap-2>
                  <div v-for="(h, idx) in sseHeaders" :key="idx" flex items-center gap-2>
                    <n-checkbox v-model:checked="h.enabled" :disabled="sseIsConnected" />
                    <n-input
                      v-model:value="h.key"
                      size="small"
                      placeholder="Header Name (如 Authorization)"
                      style="width: 220px"
                      font-mono
                      :disabled="sseIsConnected"
                    />
                    <span text-gray-400>:</span>
                    <n-input
                      v-model:value="h.value"
                      size="small"
                      placeholder="Header Value (如 Bearer sk-...)"
                      flex-1
                      font-mono
                      :disabled="sseIsConnected"
                    />
                    <c-button size="tiny" text type="error" :disabled="sseIsConnected" @click="removeSseHeader(idx)">
                      删除
                    </c-button>
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <!-- 请求体配置 (POST 时激活) -->
            <n-tab-pane name="body" :tab="sseMethod === 'POST' ? '请求体 (JSON Body)' : '请求体 (仅 POST 模式可用)'" :disabled="sseMethod === 'GET'">
              <div flex flex-col gap-2 pt-2>
                <div flex items-center justify-between gap-2 text-12px text-gray-500>
                  <span>向目标接口发送的 JSON 负载 (Payload)，例如大模型 Prompt 与流式参数。</span>
                  <div flex items-center gap-2>
                    <span>{{ sseBodyMeta.length }} 字符 ({{ sseBodyMeta.formattedSize }})</span>
                    <c-button size="tiny" :disabled="!sseBodyMeta.isJson || sseIsConnected" @click="formatSseJson">
                      美化 JSON
                    </c-button>
                  </div>
                </div>

                <n-input
                  v-model:value="sseBody"
                  type="textarea"
                  :rows="6"
                  placeholder="在此输入 POST 请求体 JSON 内容..."
                  font-mono
                  :disabled="sseIsConnected || sseMethod === 'GET'"
                />
              </div>
            </n-tab-pane>
          </n-tabs>
        </div>
      </div>
    </c-card>

    <!-- 主工作区：左侧发送，右侧时间轴帧列表 -->
    <div grid grid-cols-1 gap-4 lg:grid-cols-2>
      <!-- 左侧：WS 消息发送编辑器 (在 WS 模式下显示) 或 SSE 说明 -->
      <c-card v-if="activeProtocol === 'ws'" title="发送消息 (Send Message)">
        <div flex flex-col gap-3>
          <n-input
            v-model:value="sendPayload"
            type="textarea"
            :rows="14"
            placeholder="在此输入待发送的纯文本或 JSON 报文... (支持 Ctrl+Enter 发送)"
            font-mono
            @keydown="handleWsKeyDown"
          />

          <!-- 底部状态指示与操作栏 -->
          <div flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 dark:border-gray-800>
            <div flex items-center gap-2 text-12px text-gray-500>
              <span>{{ payloadMeta.length }} 字符 ({{ payloadMeta.formattedSize }})</span>
              <n-tag v-if="payloadMeta.isJson" size="tiny" type="success" round>
                JSON
              </n-tag>
              <n-tag v-else size="tiny" type="default" round>
                纯文本
              </n-tag>
            </div>

            <div flex items-center gap-2>
              <c-button size="small" :disabled="!payloadMeta.isJson" @click="formatWsJson">
                美化 JSON
              </c-button>
              <c-button size="small" @click="openAddPresetModal">
                存为预设
              </c-button>
              <c-button size="small" @click="sendPayload = ''">
                清空输入
              </c-button>
              <c-button
                type="primary"
                size="small"
                :disabled="!wsIsConnected"
                @click="handleWsSend"
              >
                发送 (Ctrl+Enter)
              </c-button>
            </div>
          </div>
        </div>
      </c-card>

      <!-- 左侧：SSE 说明卡片 (在 SSE 模式下显示) -->
      <c-card v-else title="SSE 流式特性说明">
        <div flex flex-col gap-3 text-13px text-gray-600 leading-relaxed dark:text-gray-300>
          <p>
            <strong>自研 Fetch ReadableStream 引擎</strong>：突破了浏览器原生 <code>EventSource</code> 的传统局限，全面支持 HTTP GET 与 POST 请求方式。
          </p>
          <div class="border-blue-200 bg-blue-50/50 dark:border-blue-800/40 dark:bg-blue-950/20" flex flex-col gap-2 border rounded p-3>
            <span text-blue-600 font-bold dark:text-blue-400>大模型对话 API 最佳实践：</span>
            <span>1. 目标地址填入 OpenAI / DeepSeek / Ollama 等接口（如 <code>/v1/chat/completions</code>）；</span>
            <span>2. 请求方法选择 <code>POST</code>；</span>
            <span>3. 在请求头中配置 <code>Authorization: Bearer &lt;YOUR_KEY&gt;</code>；</span>
            <span>4. 请求体 JSON 中确保配置 <code>"stream": true</code>；</span>
            <span>5. 点击“连接并启动流”后，右侧时间轴即可实时逐帧呈现接收到的 SSE 事件块。</span>
          </div>
          <div flex flex-wrap items-center gap-2 pt-2>
            <c-button size="small" type="primary" @click="loadSampleLLMSSE">
              载入大模型示例
            </c-button>
            <c-button size="small" @click="showPresetsDrawer = true">
              预设库面板
            </c-button>
            <c-button size="small" @click="openAddPresetModal">
              保存当前请求体为预设
            </c-button>
          </div>
        </div>
      </c-card>

      <!-- 右侧：帧时间轴与流式正文聚合卡片 -->
      <c-card>
        <template #header>
          <div w-full flex flex-wrap items-center justify-between gap-2>
            <!-- 视图模式切换 (仅在 SSE 模式下展示双模切换，在 WS 模式下纯净展示时间轴) -->
            <div flex items-center gap-2>
              <n-tabs
                v-if="activeProtocol === 'sse'"
                v-model:value="rightViewMode"
                type="segment"
                size="small"
                style="width: 260px"
              >
                <n-tab name="timeline">
                  时间轴明细 ({{ frames.length }})
                </n-tab>
                <n-tab name="aggregate">
                  流式聚合正文
                </n-tab>
              </n-tabs>
              <span
                v-else
                text-13px text-gray-700 font-bold dark:text-gray-200
              >
                时间轴明细 ({{ frames.length }} 帧)
              </span>

              <n-tag v-if="droppedFramesCount > 0" size="tiny" type="warning" round>
                已淘汰 {{ droppedFramesCount }} 旧帧
              </n-tag>
            </div>

            <!-- 控制工具条：缓冲上限、滚动跟随、导出 -->
            <div flex items-center gap-2>
              <div flex items-center gap-1 text-12px text-gray-500>
                <span>缓冲:</span>
                <n-select
                  :value="frameBufferSize"
                  size="tiny"
                  style="width: 120px"
                  :options="frameBufferSizeOptions"
                  @update:value="handleBufferSizeChange"
                />
              </div>

              <n-tooltip trigger="hover">
                <template #trigger>
                  <c-button
                    size="tiny"
                    :type="autoScroll ? 'primary' : 'default'"
                    @click="autoScroll = !autoScroll"
                  >
                    {{ autoScroll ? '滚底 ON' : '滚底 OFF' }}
                  </c-button>
                </template>
                新数据到达时自动滑动到底部，手动向上滚动查看历史时自动暂停跟随
              </n-tooltip>

              <n-dropdown
                trigger="click"
                :options="[
                  { label: '导出 JSON 数据帧', key: 'json' },
                  { label: '导出 TXT 纯文本日志', key: 'txt' },
                  ...(activeProtocol === 'sse' ? [{ label: '导出流式聚合正文', key: 'agg' }] : []),
                ]"
                @select="(key: string | number) => {
                  if (key === 'json') handleExportJson();
                  else if (key === 'txt') handleExportTxt();
                  else if (key === 'agg') handleExportAggregateText();
                }"
              >
                <c-button size="tiny">
                  导出 ▾
                </c-button>
              </n-dropdown>
            </div>
          </div>
        </template>

        <div flex flex-col gap-3>
          <!-- 常驻：流式正文聚合实时预览盒 (仅在 SSE 模式下呈现) -->
          <template v-if="activeProtocol === 'sse'">
            <div
              v-if="turns.length === 0"
              class="flex items-center justify-between border border-gray-200 rounded-lg border-dashed bg-gray-50/50 p-2.5 text-12px text-gray-400 dark:border-gray-800 dark:bg-gray-900/20"
            >
              <div flex items-center gap-2>
                <span text-blue-500 font-bold>✦ 流式正文聚合预览</span>
                <span>(接收文本流或增量事件后，将在此实时聚合拼装完整正文，支持 Markdown 排版与多轮归档)</span>
              </div>
            </div>

            <div
              v-else
              class="shadow-xs flex flex-col gap-2.5 border border-blue-200 rounded-lg bg-white p-3 transition-all dark:border-blue-900/50 dark:bg-gray-900/60"
            >
              <!-- 预览盒顶部控制栏 -->
              <div flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 dark:border-gray-800>
                <!-- 左侧：轮次与性能指标 -->
                <div flex flex-wrap items-center gap-2>
                  <span flex items-center gap-1.5 text-12px text-blue-600 font-bold dark:text-blue-400>
                    <span
                      v-if="!activeTurn?.isCompleted && sseIsConnected"
                      class="inline-block h-2 w-2 animate-ping rounded-full bg-green-500"
                    />
                    <span
                      v-else
                      class="inline-block h-2 w-2 rounded-full bg-gray-400"
                    />
                    流式聚合正文:
                  </span>

                  <!-- 多轮次下拉切换 -->
                  <n-select
                    v-if="turns.length > 1"
                    v-model:value="activeTurnId"
                    :options="turnSelectOptions"
                    size="tiny"
                    style="width: 170px"
                  />
                  <n-tag v-else size="tiny" type="info" round>
                    第 {{ activeTurn?.turnIndex || 1 }} 轮
                  </n-tag>

                  <!-- 传输状态 Tag -->
                  <n-tag
                    v-if="!activeTurn?.isCompleted && sseIsConnected"
                    size="tiny"
                    type="success"
                    round
                  >
                    正在生成...
                  </n-tag>
                  <n-tag
                    v-else
                    size="tiny"
                    type="default"
                    round
                  >
                    已完成
                  </n-tag>

                  <!-- 性能统计小胶囊 -->
                  <div v-if="activeTurn" hidden items-center gap-2 text-11px text-gray-500 font-mono sm:flex>
                    <span>{{ activeTurn.charCount }} 字符</span>
                    <span>·</span>
                    <span>{{ activeTurn.chunkCount }} chunks</span>
                    <span>·</span>
                    <span>{{ (activeTurn.durationMs / 1000).toFixed(2) }}s</span>
                    <span v-if="activeTurnSpeed">· {{ activeTurnSpeed }} chunks/s</span>
                  </div>
                </div>

                <!-- 右侧：模式切换、复制、导出、折叠 -->
                <div flex items-center gap-1.5>
                  <n-button-group size="tiny">
                    <c-button
                      :type="aggRenderMode === 'markdown' ? 'primary' : 'default'"
                      size="tiny"
                      @click="aggRenderMode = 'markdown'"
                    >
                      Markdown
                    </c-button>
                    <c-button
                      :type="aggRenderMode === 'plain' ? 'primary' : 'default'"
                      size="tiny"
                      @click="aggRenderMode = 'plain'"
                    >
                      纯文本
                    </c-button>
                  </n-button-group>

                  <c-button
                    size="tiny"
                    :disabled="!activeTurn?.text"
                    @click="copyText(activeTurn?.text || '')"
                  >
                    一键复制
                  </c-button>

                  <c-button
                    size="tiny"
                    :disabled="!activeTurn?.text"
                    @click="handleExportTurnMarkdown"
                  >
                    导出 .md
                  </c-button>

                  <c-button
                    size="tiny"
                    text
                    @click="isAggBoxCollapsed = !isAggBoxCollapsed"
                  >
                    {{ isAggBoxCollapsed ? '展开 ▾' : '收起 ▴' }}
                  </c-button>
                </div>
              </div>

              <!-- 预览盒正文展示区 (展开态) -->
              <div
                v-show="!isAggBoxCollapsed"
                class="agg-content-viewport border border-gray-100 rounded bg-gray-50/70 p-2.5 dark:border-gray-800/80 dark:bg-black/30"
                style="max-height: 260px; overflow-y: auto"
              >
                <div v-if="!activeTurn?.text" py-6 text-center text-12px text-gray-400>
                  等待流式文字输出中...
                </div>
                <div v-else>
                  <!-- Markdown 富文本渲染模式 -->
                  <div
                    v-if="aggRenderMode === 'markdown'"
                    class="markdown-rendered-view text-13px text-gray-800 leading-relaxed dark:text-gray-100"
                    v-html="activeTurnMarkdownHtml"
                  />

                  <!-- 纯文本等宽模式 -->
                  <pre
                    v-else
                    class="m-0 whitespace-pre-wrap break-all text-12px text-gray-800 font-mono dark:text-gray-200"
                  >{{ activeTurn.text }}</pre>

                  <!-- 呼吸跳动光标 -->
                  <span
                    v-if="!activeTurn.isCompleted && sseIsConnected"
                    class="rounded-xs ml-1 inline-block h-3.5 w-2 animate-pulse bg-blue-500 align-middle"
                  />
                </div>
              </div>
            </div>
          </template>

          <!-- 模式 1：时间轴明细视图 (Timeline Mode) -->
          <template v-if="rightViewMode === 'timeline'">
            <!-- 筛选与统计工具条 -->
            <div flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 dark:border-gray-800>
              <div flex items-center gap-2>
                <span text-12px text-gray-500 font-mono>
                  显示 {{ filteredFrames.length }} / 共 {{ frames.length }} 帧
                </span>
              </div>

              <div flex items-center gap-2>
                <n-input
                  v-model:value="searchKeyword"
                  size="small"
                  placeholder="搜索内容/事件..."
                  clearable
                  style="width: 130px"
                />
                <n-select
                  v-model:value="protocolFilter"
                  size="small"
                  style="width: 85px"
                  :options="[
                    { label: '全部', value: 'all' },
                    { label: 'WS', value: 'ws' },
                    { label: 'SSE', value: 'sse' },
                  ]"
                />
                <n-select
                  v-model:value="directionFilter"
                  size="small"
                  style="width: 90px"
                  :options="[
                    { label: '全部', value: 'all' },
                    { label: '发 ⬆', value: 'send' },
                    { label: '收 ⬇', value: 'receive' },
                    { label: '系统 ℹ', value: 'system' },
                  ]"
                />
              </div>
            </div>

            <!-- 帧滚动列表 -->
            <div
              ref="framesViewportRef"
              class="frames-viewport"
              style="max-height: 480px; overflow-y: auto"
              flex
              flex-col
              gap-2
              p-1
              @scroll="onTimelineScroll"
            >
              <div v-if="filteredFrames.length === 0" flex items-center justify-center py-12>
                <n-empty description="暂无消息帧记录，连接后在此实时呈现收发报文" />
              </div>

              <div
                v-for="frame in filteredFrames"
                :key="frame.id"
                class="frame-item"

                border rounded-lg p-3 transition-all
                :class="
                  frame.direction === 'send'
                    ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800/40'
                    : frame.direction === 'receive'
                      ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/40'
                      : 'bg-gray-50/50 border-gray-200 dark:bg-gray-800/30 dark:border-gray-700/40'
                "
              >
                <!-- 帧头部元信息 -->
                <div mb-2 flex items-center justify-between gap-2 text-12px>
                  <div flex items-center gap-2>
                    <!-- 协议标识 -->
                    <n-tag size="tiny" :type="frame.protocol === 'sse' ? 'warning' : 'primary'" round>
                      {{ frame.protocol.toUpperCase() }}
                    </n-tag>

                    <!-- 方向标识 -->
                    <n-tag
                      size="tiny"
                      round
                      :type="
                        frame.direction === 'send'
                          ? 'success'
                          : frame.direction === 'receive'
                            ? 'info'
                            : 'default'
                      "
                    >
                      {{
                        frame.direction === 'send'
                          ? '发送 ⬆'
                          : frame.direction === 'receive'
                            ? '接收 ⬇'
                            : '系统 ℹ'
                      }}
                    </n-tag>

                    <span text-gray-500 font-mono>{{ frame.formattedTime }}</span>
                    <span v-if="frame.summary" text-gray-600 font-bold dark:text-gray-300>
                      {{ frame.summary }}
                    </span>
                  </div>

                  <div flex items-center gap-2>
                    <span text-gray-400 font-mono>{{ formatByteSize(frame.byteSize) }}</span>
                    <c-button size="tiny" text @click="copyText(frame.raw)">
                      复制
                    </c-button>
                  </div>
                </div>

                <!-- 帧内容展示 -->
                <pre

                  dark:bg-black-90 m-0 overflow-x-auto whitespace-pre-wrap break-all border border-gray-100 rounded bg-white p-2 text-13px font-mono dark:border-gray-800
                >{{ frame.isJson ? JSON.stringify(frame.parsedJson, null, 2) : frame.raw }}</pre>
              </div>
            </div>
          </template>

          <!-- 模式 2：流式正文聚合视图 (Stream Aggregator Mode) -->
          <template v-else>
            <!-- 聚合统计指标仪表盘 -->
            <div
              class="border-blue-100 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20"

              flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3
            >
              <div flex flex-wrap items-center gap-4 text-12px>
                <div flex items-center gap-1>
                  <span text-gray-400>累计输出:</span>
                  <span text-blue-600 font-bold font-mono dark:text-blue-400>
                    {{ streamAggregate.charCount }} 字符
                  </span>
                </div>
                <div flex items-center gap-1>
                  <span text-gray-400>片段数量:</span>
                  <span text-gray-700 font-bold font-mono dark:text-gray-200>
                    {{ streamAggregate.chunkCount }} chunks
                  </span>
                </div>
                <div flex items-center gap-1>
                  <span text-gray-400>首尾耗时:</span>
                  <span text-gray-700 font-bold font-mono dark:text-gray-200>
                    {{ (streamAggregate.durationMs / 1000).toFixed(2) }} 秒
                  </span>
                </div>
                <div v-if="tokensPerSecond" flex items-center gap-1>
                  <span text-gray-400>生成速率:</span>
                  <span text-green-600 font-bold font-mono dark:text-green-400>
                    {{ tokensPerSecond }} chunks/s
                  </span>
                </div>
              </div>

              <div flex items-center gap-2>
                <c-button
                  size="tiny"
                  :disabled="!streamAggregate.text"
                  @click="copyText(streamAggregate.text)"
                >
                  一键复制全文
                </c-button>
                <c-button
                  size="tiny"
                  :disabled="!streamAggregate.text"
                  @click="handleExportAggregateText"
                >
                  导出正文
                </c-button>
              </div>
            </div>

            <!-- 聚合文本渲染区 -->
            <div
              ref="aggregateViewportRef"
              class="frames-viewport"
              style="max-height: 440px; overflow-y: auto"

              dark:bg-black-90 border border-gray-100 rounded-lg bg-white p-4 dark:border-gray-800
            >
              <div v-if="!streamAggregate.text" flex flex-col items-center justify-center gap-2 py-16>
                <n-empty description="暂未接收到流式响应内容" />
                <span max-w-360px text-center text-12px text-gray-400>
                  支持自动识别并实时聚合大模型增量流、服务端日志流及通用文本/事件流。
                </span>
              </div>

              <div v-else whitespace-pre-wrap break-all text-14px text-gray-800 leading-relaxed font-mono dark:text-gray-100>
                <span>{{ streamAggregate.text }}</span>
                <!-- 流式输出动态光标 -->
                <span
                  v-if="sseIsConnected"

                  ml-1 inline-block h-4 w-2 animate-pulse bg-blue-500 align-middle
                />
              </div>
            </div>
          </template>
        </div>
      </c-card>
    </div>

    <!-- 常用载荷预设库抽屉 (Presets Drawer) -->
    <n-drawer v-model:show="showPresetsDrawer" :width="460" placement="right">
      <n-drawer-content title="常用载荷预设库 (Payload Presets)" closable>
        <template #header>
          <div w-full flex items-center justify-between pr-4>
            <span text-15px font-bold>常用载荷预设库</span>
            <div flex items-center gap-2>
              <c-button size="tiny" type="primary" @click="openAddPresetModal">
                + 新建预设
              </c-button>
              <c-button size="tiny" @click="resetPresetsToDefault">
                恢复默认模板
              </c-button>
            </div>
          </div>
        </template>

        <div flex flex-col gap-3 py-1>
          <!-- 筛选与搜索 -->
          <div flex items-center gap-2>
            <n-input
              v-model:value="presetSearchText"
              size="small"
              placeholder="搜索预设名称/内容..."
              clearable
              flex-1
            />
            <n-select
              v-model:value="presetProtocolFilter"
              size="small"
              style="width: 105px"
              :options="[
                { label: '全部协议', value: 'all' },
                { label: 'WebSocket', value: 'ws' },
                { label: 'SSE / HTTP', value: 'sse' },
              ]"
            />
          </div>

          <!-- 预设列表 -->
          <div v-if="filteredPresets.length === 0" flex items-center justify-center py-12>
            <n-empty description="未匹配到相关预设项" />
          </div>

          <div v-else flex flex-col gap-3>
            <div
              v-for="item in filteredPresets"
              :key="item.id"
              class="bg-gray-50/50 dark:bg-gray-900/40"

              flex flex-col gap-2 border border-gray-200 rounded-lg p-3 dark:border-gray-800
            >
              <div flex items-center justify-between gap-2>
                <div flex items-center gap-2>
                  <span text-14px font-bold>{{ item.title }}</span>
                  <n-tag size="tiny" :type="item.protocol === 'ws' ? 'primary' : item.protocol === 'sse' ? 'warning' : 'default'" round>
                    {{ item.protocol === 'all' ? '通用' : item.protocol.toUpperCase() }}
                  </n-tag>
                  <n-tag v-if="item.isBuiltin" size="tiny" type="info" round>
                    内置模板
                  </n-tag>
                  <n-tag v-else size="tiny" type="success" round>
                    自定义
                  </n-tag>
                </div>

                <div flex items-center gap-1>
                  <c-button size="tiny" text type="primary" @click="applyPreset(item)">
                    载入
                  </c-button>
                  <c-button size="tiny" text @click="copyText(item.payload)">
                    复制
                  </c-button>
                  <c-button
                    v-if="!item.isBuiltin"
                    size="tiny"
                    text
                    type="error"
                    @click="removePreset(item.id)"
                  >
                    删除
                  </c-button>
                </div>
              </div>

              <div v-if="item.description" text-12px text-gray-500>
                {{ item.description }}
              </div>

              <pre

                dark:bg-black-90 m-0 max-h-24 overflow-x-auto whitespace-pre-wrap break-all border border-gray-100 rounded bg-white p-2 text-12px font-mono dark:border-gray-800
              >{{ item.payload }}</pre>
            </div>
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>

    <!-- 新建预设模态框 (Add Preset Modal) -->
    <n-modal
      v-model:show="showAddPresetModal"
      preset="card"
      title="保存为新预设"
      style="width: 520px"
    >
      <div flex flex-col gap-3>
        <div flex flex-col gap-1>
          <span text-12px text-gray-500>预设名称 <span text-red-500>*</span></span>
          <n-input
            v-model:value="newPresetTitle"
            placeholder="例如: DeepSeek 对话流式请求 / 心跳保活探测"
            size="small"
          />
        </div>

        <div grid grid-cols-2 gap-3>
          <div flex flex-col gap-1>
            <span text-12px text-gray-500>适用协议</span>
            <n-select
              v-model:value="newPresetProtocol"
              size="small"
              :options="[
                { label: '通用 (全部协议)', value: 'all' },
                { label: 'WebSocket (WS)', value: 'ws' },
                { label: 'Server-Sent Events (SSE)', value: 'sse' },
              ]"
            />
          </div>
          <div flex flex-col gap-1>
            <span text-12px text-gray-500>备注描述</span>
            <n-input
              v-model:value="newPresetDesc"
              placeholder="选填，简短说明用途"
              size="small"
            />
          </div>
        </div>

        <div flex flex-col gap-1>
          <span text-12px text-gray-500>预设载荷报文 (Payload) <span text-red-500>*</span></span>
          <n-input
            v-model:value="newPresetPayload"
            type="textarea"
            :rows="8"
            placeholder="输入或确认待保存的 JSON 或文本载荷内容..."
            font-mono
          />
        </div>

        <div flex items-center justify-end gap-2 border-t border-gray-100 pt-2 dark:border-gray-800>
          <c-button size="small" @click="showAddPresetModal = false">
            取消
          </c-button>
          <c-button type="primary" size="small" @click="handleSaveNewPreset">
            保存预设
          </c-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.websocket-and-sse-client {
  width: 100%;
}
.frames-viewport::-webkit-scrollbar,
.agg-content-viewport::-webkit-scrollbar {
  width: 6px;
}
.frames-viewport::-webkit-scrollbar-thumb,
.agg-content-viewport::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.4);
  border-radius: 3px;
}

.markdown-rendered-view :deep(h1),
.markdown-rendered-view :deep(h2),
.markdown-rendered-view :deep(h3),
.markdown-rendered-view :deep(h4) {
  margin-top: 0.8em;
  margin-bottom: 0.4em;
  font-weight: 600;
  line-height: 1.3;
}
.markdown-rendered-view :deep(p) {
  margin-top: 0.4em;
  margin-bottom: 0.4em;
}
.markdown-rendered-view :deep(pre.hljs) {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  margin: 0.6em 0;
}
:root.dark .markdown-rendered-view :deep(pre.hljs) {
  background: #161b22;
  border: 1px solid #30363d;
}
.markdown-rendered-view :deep(code:not(pre code)) {
  background: rgba(175, 184, 193, 0.2);
  border-radius: 4px;
  padding: 0.2em 0.4em;
  font-size: 85%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.markdown-rendered-view :deep(ul),
.markdown-rendered-view :deep(ol) {
  padding-left: 1.4em;
  margin: 0.4em 0;
}
.markdown-rendered-view :deep(blockquote) {
  border-left: 4px solid #d0d7de;
  color: #57606a;
  padding-left: 1em;
  margin: 0.5em 0;
}
:root.dark .markdown-rendered-view :deep(blockquote) {
  border-left-color: #3b434b;
  color: #8b949e;
}
.markdown-rendered-view :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.6em 0;
}
.markdown-rendered-view :deep(th),
.markdown-rendered-view :deep(td) {
  border: 1px solid #d0d7de;
  padding: 6px 10px;
  font-size: 12px;
}
:root.dark .markdown-rendered-view :deep(th),
:root.dark .markdown-rendered-view :deep(td) {
  border-color: #30363d;
}
</style>
