/**
 * HTTP 客户端数据契约与模型定义
 *
 * @author Ateng
 * @since 2026-10-02
 */

/**
 * 支持的 HTTP 请求方法枚举
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 通用键值对模型
 */
export interface KeyValuePair {
  key: string;
  value: string;
  enabled?: boolean;
}

/**
 * 发起 HTTP 请求的参数配置
 */
export interface HttpRequestOptions {
  /** 请求方法 */
  method: HttpMethod;
  /** 完整目标 URL */
  url: string;
  /** 超时毫秒数 (默认 30000) */
  timeoutMs?: number;
  /** 请求头字典 */
  headers?: Record<string, string>;
  /** 请求体 */
  body?: string | FormData | null;
  /** 外部传入的 AbortSignal 句柄 */
  signal?: AbortSignal;
}

/**
 * 响应快照模型
 */
export interface HttpResponseSnapshot {
  /** HTTP 状态码 */
  status: number;
  /** HTTP 状态文本 */
  statusText: string;
  /** 是否成功 (200-299) */
  ok: boolean;
  /** 请求耗时 (毫秒) */
  durationMs: number;
  /** 响应体大小 (字节) */
  sizeBytes: number;
  /** 响应头字典 */
  headers: Record<string, string>;
  /** 响应头列表 (用于列表展示) */
  headersList: KeyValuePair[];
  /** 响应体原始文本 */
  body: string;
  /** 响应体是否为有效 JSON */
  isJson: boolean;
  /** 格式化后的 JSON 字符串 (若为 JSON) */
  formattedJson?: string;
  /** 响应时间戳 */
  timestamp: number;
}

/**
 * HTTP 状态码分类
 */
export type StatusCategory = 'success' | 'redirect' | 'client-error' | 'server-error' | 'unknown';

/**
 * 支持的鉴权认证类型
 */
export type AuthType = 'none' | 'bearer' | 'basic';

/**
 * 鉴权配置模型
 */
export interface AuthConfig {
  type: AuthType;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
}

/**
 * 支持的请求体类型
 */
export type RequestBodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';

/**
 * 表单字段类型
 */
export type FormDataFieldType = 'text' | 'file';

/**
 * FormData 字段条目
 */
export interface FormDataItem {
  key: string;
  type: FormDataFieldType;
  value: string;
  file?: File | null;
  enabled?: boolean;
}

/**
 * 请求体综合配置模型
 */
export interface RequestBodyConfig {
  type: RequestBodyType;
  rawText?: string;
  formData?: FormDataItem[];
  urlEncoded?: KeyValuePair[];
}

/**
 * 实际发送要素记录 (用于 Request Sent 回显)
 */
export interface SentRequestRecord {
  method: HttpMethod;
  fullUrl: string;
  headers: Record<string, string>;
  headersList: KeyValuePair[];
  bodyType: RequestBodyType;
  bodySummary: string;
  timestamp: number;
}

/**
 * 智能 CORS 与网络异常诊断分析结果
 */
export interface CorsDiagnosticResult {
  /** 是否疑似 CORS 跨域同源策略拦截 */
  isLikelyCors: boolean;
  /** 诊断标题 */
  title: string;
  /** 诊断原因解释 */
  message: string;
  /** 建议排查方案列表 */
  suggestions: string[];
}

/**
 * 历史记录请求要素快照 (序列化安全，排除了不可持久化的 File 实例)
 */
export interface RequestSpecSnapshot {
  method: HttpMethod;
  url: string;
  queryParams?: KeyValuePair[];
  headers?: KeyValuePair[];
  auth?: AuthConfig;
  bodyConfig?: {
    type: RequestBodyType;
    rawText?: string;
    formData?: Array<{ key: string; type: FormDataFieldType; value: string; enabled?: boolean }>;
    urlEncoded?: KeyValuePair[];
  };
}

/**
 * 历史记录响应元数据 (严禁存储完整 Response Body，坚守 LocalStorage 5MB 配额防御底线)
 */
export interface HistoryResponseMeta {
  status: number;
  statusText: string;
  ok: boolean;
  durationMs: number;
  sizeBytes: number;
}

/**
 * 本地持久化存储的单条请求历史模型
 */
export interface HistoryRecord {
  id: string;
  timestamp: number;
  request: RequestSpecSnapshot;
  response?: HistoryResponseMeta;
}
