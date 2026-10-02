/**
 * HTTP 客户端业务服务层纯函数
 *
 * @author Ateng
 * @since 2026-10-02
 */

import type {
  AuthConfig,
  CorsDiagnosticResult,
  HistoryRecord,
  HistoryResponseMeta,
  HttpMethod,
  HttpRequestOptions,
  HttpResponseSnapshot,
  KeyValuePair,
  RequestBodyConfig,
  RequestBodyType,
  RequestSpecSnapshot,
  StatusCategory,
} from './http-client.types';
import { parseCurlCommand } from '../curl-converter/curl-converter.service';

/**
 * 常用标准 HTTP 请求头候选列表 (用于自动补全)
 */
export const COMMON_HTTP_HEADERS: string[] = [
  'Accept',
  'Accept-Charset',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Disposition',
  'Content-Encoding',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'Date',
  'ETag',
  'Host',
  'If-Match',
  'If-Modified-Since',
  'If-None-Match',
  'Origin',
  'Pragma',
  'Range',
  'Referer',
  'Sec-Fetch-Dest',
  'Sec-Fetch-Mode',
  'Sec-Fetch-Site',
  'Server',
  'Set-Cookie',
  'User-Agent',
  'X-Forwarded-For',
  'X-Forwarded-Proto',
  'X-Real-IP',
  'X-Requested-With',
];

/**
 * 安全的 URI Component 解码
 */
function safeDecode(str: string): string {
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch {
    return str;
  }
}

/**
 * 将 Query 查询参数字符串解析为键值对列表
 *
 * @param queryString 原始查询字符串 (可带或不带开头的 '?')
 * @returns 参数键值对列表
 */
export function parseQueryString(queryString: string): KeyValuePair[] {
  if (!queryString) {
    return [];
  }

  const cleaned = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  if (!cleaned.trim()) {
    return [];
  }

  const pairs = cleaned.split('&');
  const result: KeyValuePair[] = [];

  for (const pair of pairs) {
    if (!pair) continue;
    const equalIdx = pair.indexOf('=');
    if (equalIdx === -1) {
      result.push({
        key: safeDecode(pair),
        value: '',
        enabled: true,
      });
    } else {
      const rawKey = pair.slice(0, equalIdx);
      const rawVal = pair.slice(equalIdx + 1);
      result.push({
        key: safeDecode(rawKey),
        value: safeDecode(rawVal),
        enabled: true,
      });
    }
  }

  return result;
}

/**
 * 将键值对列表编译为 Query 查询参数字符串
 *
 * @param params 参数键值对列表
 * @returns 编译后的查询字符串 (不带 '?')
 */
export function buildQueryString(params: KeyValuePair[]): string {
  return params
    .filter(p => p.enabled !== false && p.key.trim() !== '')
    .map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`)
    .join('&');
}

/**
 * 将完整 URL 分离为基础地址、Query 参数列表以及 Hash 片段
 *
 * @param fullUrl 完整请求 URL
 * @returns 拆分结果
 */
export function splitUrlAndQuery(fullUrl: string): {
  baseUrl: string;
  queryParams: KeyValuePair[];
  hash: string;
} {
  if (!fullUrl) {
    return { baseUrl: '', queryParams: [], hash: '' };
  }

  let hash = '';
  let urlWithoutHash = fullUrl;
  const hashIdx = fullUrl.indexOf('#');
  if (hashIdx !== -1) {
    hash = fullUrl.slice(hashIdx);
    urlWithoutHash = fullUrl.slice(0, hashIdx);
  }

  const queryIdx = urlWithoutHash.indexOf('?');
  if (queryIdx === -1) {
    return { baseUrl: urlWithoutHash, queryParams: [], hash };
  }

  const baseUrl = urlWithoutHash.slice(0, queryIdx);
  const queryStr = urlWithoutHash.slice(queryIdx + 1);

  return {
    baseUrl,
    queryParams: parseQueryString(queryStr),
    hash,
  };
}

/**
 * 将基础地址与 Query 参数列表合并为完整 URL
 *
 * @param baseUrl 基础地址 (若内部已含 query 会被自动剥离以参数表为准)
 * @param params 参数键值对列表
 * @param hash 可选的 hash 片段
 * @returns 合并后的完整 URL
 */
export function mergeUrlAndQuery(baseUrl: string, params: KeyValuePair[], hash: string = ''): string {
  const cleanBase = splitUrlAndQuery(baseUrl).baseUrl;
  const queryString = buildQueryString(params);

  if (!queryString) {
    return `${cleanBase}${hash}`;
  }
  return `${cleanBase}?${queryString}${hash}`;
}

/**
 * 安全的 UTF-8 字符串 Base64 编码
 *
 * @param str 原始字符串
 * @returns Base64 编码字符串
 */
export function encodeBase64(str: string): string {
  if (typeof btoa !== 'undefined') {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch {
      return btoa(str);
    }
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  return '';
}

/**
 * 编译整合全部请求头 (合并自定义 Headers 与 Auth 认证凭据)
 *
 * @param headers 自定义请求头列表
 * @param auth 鉴权配置
 * @returns 最终发送的请求头字典
 */
export function compileRequestHeaders(
  headers: KeyValuePair[] = [],
  auth?: AuthConfig,
): Record<string, string> {
  const record: Record<string, string> = {};

  // 1. 载入所有已启用的自定义请求头
  for (const item of headers) {
    if (item.enabled !== false && item.key.trim()) {
      record[item.key.trim()] = item.value;
    }
  }

  // 2. 检查是否已有明确自定义的 Authorization 头 (大小写不敏感)
  const hasCustomAuth = Object.keys(record).some(k => k.toLowerCase() === 'authorization');

  // 3. 若无手动 Authorization 且配置了 Auth，自动计算注入
  if (!hasCustomAuth && auth) {
    if (auth.type === 'bearer' && auth.bearerToken?.trim()) {
      record['Authorization'] = `Bearer ${auth.bearerToken.trim()}`;
    } else if (auth.type === 'basic' && (auth.basicUsername || auth.basicPassword)) {
      const credentials = `${auth.basicUsername || ''}:${auth.basicPassword || ''}`;
      record['Authorization'] = `Basic ${encodeBase64(credentials)}`;
    }
  }

  return record;
}

/**
 * 校验 JSON 文本合法性
 *
 * @param rawJson JSON 原始字符串
 * @returns 校验结果与错误信息
 */
export function validateJson(rawJson: string): { valid: boolean; error?: string } {
  const trimmed = rawJson.trim();
  if (!trimmed) {
    return { valid: true };
  }
  try {
    JSON.parse(trimmed);
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Invalid JSON syntax' };
  }
}

/**
 * 根据请求体配置与基础 Headers 构建最终的 Body 载荷与 Headers
 *
 * @param bodyConfig 请求体配置
 * @param baseHeaders 基础 Headers 字典
 * @returns 编译后的 body、最终 headers 以及用于展示/回显的摘要文本
 */
export function buildRequestBodyAndHeaders(
  bodyConfig: RequestBodyConfig,
  baseHeaders: Record<string, string> = {},
): {
  body: string | FormData | null;
  headers: Record<string, string>;
  summaryText: string;
} {
  const headers = { ...baseHeaders };
  const findHeaderKey = (name: string) =>
    Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());

  switch (bodyConfig.type) {
    case 'none':
      return { body: null, headers, summaryText: '' };

    case 'json': {
      const raw = bodyConfig.rawText || '';
      if (!findHeaderKey('content-type') && raw.trim()) {
        headers['Content-Type'] = 'application/json';
      }
      return { body: raw, headers, summaryText: raw };
    }

    case 'form-data': {
      const formData = new FormData();
      const summaryList: string[] = [];
      const items = bodyConfig.formData || [];

      for (const item of items) {
        if (item.enabled !== false && item.key.trim()) {
          const k = item.key.trim();
          if (item.type === 'file' && item.file) {
            formData.append(k, item.file, item.file.name);
            summaryList.push(`[File] ${k}=${item.file.name} (${formatBytes(item.file.size)})`);
          } else {
            formData.append(k, item.value || '');
            summaryList.push(`[Text] ${k}=${item.value || ''}`);
          }
        }
      }

      // 注意：使用 FormData 时，浏览器原生 fetch 必须自动生成带 boundary 的 Content-Type，手动指定的 multipart/form-data 需移除
      const ctKey = findHeaderKey('content-type');
      if (ctKey && headers[ctKey].toLowerCase().includes('multipart/form-data')) {
        delete headers[ctKey];
      }

      return {
        body: formData,
        headers,
        summaryText: summaryList.length > 0 ? summaryList.join('\n') : '(Empty FormData)',
      };
    }

    case 'x-www-form-urlencoded': {
      const items = bodyConfig.urlEncoded || [];
      const encoded = buildQueryString(items);
      if (!findHeaderKey('content-type') && encoded) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
      return { body: encoded, headers, summaryText: encoded };
    }

    case 'raw': {
      const raw = bodyConfig.rawText || '';
      return { body: raw, headers, summaryText: raw };
    }

    default:
      return { body: null, headers, summaryText: '' };
  }
}

/**
 * 支持的请求方法常量列表
 */
export const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
];

/**
 * 对 HTTP 状态码进行分类归属
 *
 * @param status 状态码
 * @returns 状态分类
 */
export function classifyStatus(status: number): StatusCategory {
  if (status >= 200 && status < 300) {
    return 'success';
  }
  if (status >= 300 && status < 400) {
    return 'redirect';
  }
  if (status >= 400 && status < 500) {
    return 'client-error';
  }
  if (status >= 500 && status < 600) {
    return 'server-error';
  }
  return 'unknown';
}

/**
 * 获取对应状态分类的 UI 标签样式类型
 *
 * @param category 状态分类
 * @returns Naive UI Tag 类型
 */
export function getStatusTagType(category: StatusCategory): 'success' | 'info' | 'warning' | 'error' | 'default' {
  switch (category) {
    case 'success':
      return 'success';
    case 'redirect':
      return 'info';
    case 'client-error':
      return 'warning';
    case 'server-error':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * 格式化字节尺寸为易读单位 (B, KB, MB)
 *
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 从原生 Fetch Response Headers 中提取结构化字典与列表
 *
 * @param headers Fetch Headers 实例
 * @returns 字典与列表
 */
export function extractHeaders(headers: Headers): { record: Record<string, string>; list: KeyValuePair[] } {
  const record: Record<string, string> = {};
  const list: KeyValuePair[] = [];

  headers.forEach((value, key) => {
    record[key] = value;
    list.push({ key, value });
  });

  list.sort((a, b) => a.key.localeCompare(b.key));
  return { record, list };
}

/**
 * 尝试解析并格式化 JSON 字符串
 *
 * @param rawText 原始文本
 * @returns 格式化结果与有效性标志
 */
export function tryFormatJson(rawText: string): { isJson: boolean; formatted?: string } {
  const trimmed = rawText.trim();
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return { isJson: false };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return {
      isJson: true,
      formatted: JSON.stringify(parsed, null, 2),
    };
  } catch {
    return { isJson: false };
  }
}

/**
 * 执行纯客户端 HTTP 请求
 *
 * @param options 请求参数选项
 * @param fetchImpl 可选注入的 fetch 函数 (用于单元测试或降级)
 * @returns 响应快照
 */
export async function executeHttpRequest(
  options: HttpRequestOptions,
  fetchImpl: typeof fetch = (input, init) => window.fetch(input, init),
): Promise<HttpResponseSnapshot> {
  const {
    method,
    url,
    timeoutMs = 30000,
    headers = {},
    body = null,
    signal,
  } = options;

  if (!url || !url.trim()) {
    throw new Error('URL cannot be empty');
  }

  // 1. 组装 AbortController 与超时控制
  const timeoutController = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;

  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      timeoutController.abort(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  }

  // 如果调用方也传入了 signal，进行联动监听
  const onExternalAbort = () => {
    timeoutController.abort(signal?.reason);
  };
  if (signal) {
    if (signal.aborted) {
      timeoutController.abort(signal.reason);
    } else {
      signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const startTime = performance.now();

  try {
    // 2. 调度执行 Fetch
    const fetchInit: RequestInit = {
      method,
      headers,
      signal: timeoutController.signal,
    };

    if (body !== null && method !== 'GET' && method !== 'HEAD') {
      fetchInit.body = body;
    }

    const response = await fetchImpl(url, fetchInit);
    const durationMs = Math.max(1, Math.round(performance.now() - startTime));

    // 3. 提取响应体与计算体积
    const responseText = await response.text();
    const encodedLength = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(responseText).length
      : responseText.length;

    const contentLengthHeader = response.headers.get('content-length');
    const sizeBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) || encodedLength : encodedLength;

    const { record: respHeaders, list: respHeadersList } = extractHeaders(response.headers);
    const { isJson, formatted: formattedJson } = tryFormatJson(responseText);

    return {
      status: response.status,
      statusText: response.statusText || (response.status === 200 ? 'OK' : ''),
      ok: response.ok,
      durationMs,
      sizeBytes,
      headers: respHeaders,
      headersList: respHeadersList,
      body: responseText,
      isJson,
      formattedJson,
      timestamp: Date.now(),
    };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
    if (signal) {
      signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * 智能诊断分析 Fetch 异常根因 (CORS Diagnostic Guard)
 *
 * @param error 捕获到的异常对象
 * @param targetUrl 请求的目标 URL
 * @param isOnline 客户端当前在线状态
 * @returns 诊断结论与排查建议
 */
export function diagnoseFetchError(
  error: any,
  targetUrl: string,
  isOnline: boolean = true,
): CorsDiagnosticResult {
  const errMsg = String(error?.message || error || '');
  const errName = String(error?.name || '');

  // 1. 离线状态诊断
  if (!isOnline) {
    return {
      isLikelyCors: false,
      title: '网络连接已断开',
      message: '当前浏览器处于离线状态，无法发送网络请求。',
      suggestions: ['请检查本地网络连接是否正常、网线或 WiFi 是否已连通。'],
    };
  }

  // 2. 主动取消
  if (errName === 'AbortError' || errMsg.includes('aborted')) {
    return {
      isLikelyCors: false,
      title: '请求已取消',
      message: '请求已被用户主动取消。',
      suggestions: [],
    };
  }

  // 3. 超时中断
  if (errMsg.includes('timed out')) {
    return {
      isLikelyCors: false,
      title: '请求超时',
      message: errMsg,
      suggestions: [
        '请检查目标接口服务端处理性能，或在请求栏中调大超时时间（默认 30s）。',
        '确认目标服务网络链路是否存在高延迟或丢包。',
      ],
    };
  }

  // 4. 浏览器 Fetch 网络异常嗅探 (通常表现为 TypeError: Failed to fetch 或 NetworkError)
  const isNetworkOrFetchError =
    errName === 'TypeError' ||
    errMsg.toLowerCase().includes('failed to fetch') ||
    errMsg.toLowerCase().includes('networkerror') ||
    errMsg.toLowerCase().includes('network request failed');

  if (isNetworkOrFetchError) {
    return {
      isLikelyCors: true,
      title: '跨域资源共享 (CORS) 拦截或服务不可达',
      message:
        '浏览器安全沙箱基于同源策略 (CORS) 拦截了响应访问，或目标服务未启动/地址无法连接。',
      suggestions: [
        '检查目标服务端是否配置了 Access-Control-Allow-Origin 响应标头。',
        '若发送了非简单请求 (如 POST/PUT/JSON 或携带自定义 Headers)，确保服务端正确放行了 OPTIONS 预检请求。',
        '确认目标服务正在本地或服务器运行 (如 http://localhost:8080)，且端口可正常接收连接。',
        '一键降级方案：点击下方“复制为 cURL 命令”，在不受同源策略限制的本地终端 (Terminal) 中直接运行验证。',
      ],
    };
  }

  // 5. 其他常规异常
  return {
    isLikelyCors: false,
    title: '请求失败',
    message: errMsg || '未知网络错误',
    suggestions: ['请检查请求方法、URL 与请求参数格式是否正确。'],
  };
}

/**
 * 将当前请求要素导出为标准可执行的 cURL 命令行
 *
 * @param request 请求要素对象
 * @returns 格式化后的 cURL 命令字符串
 */
export function exportToCurlCommand(request: {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string | FormData | null;
  bodyType?: RequestBodyType;
}): string {
  const escapedUrl = (request.url || '').replace(/'/g, "'\\''");
  const lines: string[] = [`curl '${escapedUrl}'`];

  // Method
  if (request.method !== 'GET') {
    lines.push(`-X ${request.method}`);
  }

  // Headers
  const headers = request.headers || {};
  for (const [key, value] of Object.entries(headers)) {
    if (!key.trim()) continue;
    const escapedHeader = `${key}: ${value}`.replace(/'/g, "'\\''");
    lines.push(`-H '${escapedHeader}'`);
  }

  // Body
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
    if (typeof request.body === 'string' && request.body.trim()) {
      const escapedBody = request.body.replace(/'/g, "'\\''");
      lines.push(`--data-raw '${escapedBody}'`);
    }
  }

  return lines.join(' \\\n  ');
}

/**
 * 从标准 cURL 命令行逆向解析还原请求要素
 *
 * @param curlCommand 原始 cURL 命令行
 * @returns 还原的表单配置
 */
export function importFromCurlCommand(curlCommand: string): {
  method: HttpMethod;
  url: string;
  queryParams: KeyValuePair[];
  headers: KeyValuePair[];
  auth: AuthConfig;
  bodyConfig: RequestBodyConfig;
} {
  const parsed = parseCurlCommand(curlCommand);

  // Method
  let method: HttpMethod = 'GET';
  const upperMethod = (parsed.method || 'GET').toUpperCase();
  if (HTTP_METHODS.includes(upperMethod as HttpMethod)) {
    method = upperMethod as HttpMethod;
  }

  // Headers
  const headers: KeyValuePair[] = [];
  for (const [key, value] of Object.entries(parsed.headers || {})) {
    headers.push({ key, value, enabled: true });
  }

  // Auth
  const auth: AuthConfig = { type: 'none' };
  if (parsed.auth?.type === 'bearer' && parsed.auth.token) {
    auth.type = 'bearer';
    auth.bearerToken = parsed.auth.token;
  } else if (parsed.auth?.type === 'basic') {
    auth.type = 'basic';
    auth.basicUsername = parsed.auth.username || '';
    auth.basicPassword = parsed.auth.password || '';
  }

  // Body
  const bodyConfig: RequestBodyConfig = {
    type: 'none',
    rawText: '',
    formData: [],
    urlEncoded: [],
  };

  if (parsed.body) {
    if (parsed.bodyType === 'json') {
      bodyConfig.type = 'json';
      bodyConfig.rawText = parsed.body;
    } else if (parsed.bodyType === 'form') {
      bodyConfig.type = 'x-www-form-urlencoded';
      bodyConfig.urlEncoded = parseQueryString(parsed.body);
    } else {
      bodyConfig.type = 'raw';
      bodyConfig.rawText = parsed.body;
    }
  }

  const queryParams: KeyValuePair[] = (parsed.queryParams || []).map(p => ({
    key: p.key,
    value: p.value,
    enabled: true,
  }));

  return {
    method,
    url: parsed.url,
    queryParams,
    headers,
    auth,
    bodyConfig,
  };
}

/**
 * 序列化提取当前请求契约要素快照 (安全过滤不可序列化的 File 引用)
 *
 * @param method 请求方法
 * @param url 请求 URL
 * @param queryParams 查询参数列表
 * @param customHeaders 自定义请求头
 * @param authConfig 鉴权配置
 * @param bodyConfig 请求体配置
 * @returns 序列化安全的请求契约快照
 */
export function serializeRequestSpec(
  method: HttpMethod,
  url: string,
  queryParams: KeyValuePair[],
  customHeaders: KeyValuePair[],
  authConfig: AuthConfig,
  bodyConfig: RequestBodyConfig,
): RequestSpecSnapshot {
  return {
    method,
    url: url || '',
    queryParams: queryParams.map(p => ({
      key: p.key,
      value: p.value,
      enabled: p.enabled ?? true,
    })),
    headers: customHeaders.map(h => ({
      key: h.key,
      value: h.value,
      enabled: h.enabled ?? true,
    })),
    auth: {
      type: authConfig.type,
      bearerToken: authConfig.bearerToken || '',
      basicUsername: authConfig.basicUsername || '',
      basicPassword: authConfig.basicPassword || '',
    },
    bodyConfig: {
      type: bodyConfig.type,
      rawText: bodyConfig.rawText || '',
      formData: (bodyConfig.formData || []).map(item => ({
        key: item.key,
        type: item.type,
        value: item.value || (item.file ? item.file.name : ''),
        enabled: item.enabled ?? true,
      })),
      urlEncoded: (bodyConfig.urlEncoded || []).map(item => ({
        key: item.key,
        value: item.value,
        enabled: item.enabled ?? true,
      })),
    },
  };
}

/**
 * 创建一条历史记录对象 (带独立唯一 ID 与时间戳)
 *
 * @param options 请求快照与可选的响应元数据摘要
 * @returns 完整的历史记录对象
 */
export function createHistoryRecord(options: {
  request: RequestSpecSnapshot;
  response?: HistoryResponseMeta;
  timestamp?: number;
}): HistoryRecord {
  const ts = options.timestamp ?? Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return {
    id: `req_${ts}_${randomSuffix}`,
    timestamp: ts,
    request: options.request,
    response: options.response,
  };
}

/**
 * 向历史列表中添加一条新记录 (FIFO 环形队列淘汰，严格限制上限防御 LocalStorage 配额)
 *
 * @param history 现有历史记录列表
 * @param newRecord 新的历史记录
 * @param maxLimit 最大存储条数 (默认 20)
 * @returns 更新后的历史记录列表
 */
export function addHistoryRecord(
  history: HistoryRecord[],
  newRecord: HistoryRecord,
  maxLimit: number = 20,
): HistoryRecord[] {
  const filtered = (history || []).filter(h => h.id !== newRecord.id);
  const updated = [newRecord, ...filtered];
  return updated.slice(0, Math.max(1, maxLimit));
}

/**
 * 依据关键字过滤历史记录
 *
 * @param history 历史记录列表
 * @param query 过滤搜索词 (模糊匹配 URL 或 Method)
 * @returns 过滤后的列表
 */
export function filterHistoryRecords(history: HistoryRecord[], query: string): HistoryRecord[] {
  if (!query || !query.trim()) {
    return history;
  }
  const normalized = query.trim().toLowerCase();
  return history.filter(
    item =>
      item.request.url.toLowerCase().includes(normalized) ||
      item.request.method.toLowerCase().includes(normalized),
  );
}


