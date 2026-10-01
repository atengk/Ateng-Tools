/**
 * HAR 网络抓包日志离线分析器类型契约
 *
 * @author Ateng
 * @since 2026-10-01
 */

export interface HarHeader {
  name: string;
  value: string;
  comment?: string;
}

export interface HarCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
}

export interface HarPostData {
  mimeType: string;
  text?: string;
  params?: Array<{ name: string; value?: string; fileName?: string; contentType?: string }>;
}

export interface HarContent {
  size: number;
  compression?: number;
  mimeType: string;
  text?: string;
  encoding?: string;
}

export interface HarTimings {
  blocked?: number;
  dns?: number;
  connect?: number;
  send?: number;
  wait: number; // TTFB
  receive: number; // Content Download
  ssl?: number;
  comment?: string;
}

export interface HarRequest {
  method: string;
  url: string;
  httpVersion?: string;
  cookies?: HarCookie[];
  headers: HarHeader[];
  queryString?: Array<{ name: string; value: string }>;
  postData?: HarPostData;
  headersSize?: number;
  bodySize?: number;
}

export interface HarResponse {
  status: number;
  statusText: string;
  httpVersion?: string;
  cookies?: HarCookie[];
  headers: HarHeader[];
  content: HarContent;
  redirectURL?: string;
  headersSize?: number;
  bodySize?: number;
  _transferSize?: number;
}

export interface HarEntry {
  pageref?: string;
  startedDateTime: string;
  time: number;
  request: HarRequest;
  response: HarResponse;
  cache?: Record<string, unknown>;
  timings: HarTimings;
  serverIPAddress?: string;
  connection?: string;
  comment?: string;
}

export interface HarPage {
  startedDateTime: string;
  id: string;
  title: string;
  pageTimings?: {
    onContentLoad?: number;
    onLoad?: number;
  };
}

export interface HarLogRoot {
  log: {
    version: string;
    creator?: { name: string; version: string };
    browser?: { name: string; version: string };
    pages?: HarPage[];
    entries: HarEntry[];
  };
}

/** 资源类型归类 */
export type HarResourceType = 'fetch' | 'js' | 'css' | 'img' | 'media' | 'font' | 'doc' | 'other';

/** 甘特图单阶段耗时切片 */
export interface TimingSegment {
  name: string;
  color: string;
  durationMs: number;
  leftPercent: number;
  widthPercent: number;
}

/** 规范化解析后的单条请求视图模型 */
export interface ParsedHarEntry {
  id: string;
  startedDateTime: string;
  startTimestamp: number;
  time: number;
  method: string;
  url: string;
  urlPath: string;
  domain: string;
  status: number;
  statusText: string;
  mimeType: string;
  resourceType: HarResourceType;
  transferSize: number;
  resourceSize: number;
  offsetPercent: number;
  widthPercent: number;
  timings: HarTimings;
  timingSegments: TimingSegment[];
  request: HarRequest;
  response: HarResponse;
}

/** 全局 HAR 聚合统计模型 */
export interface HarSummary {
  totalRequests: number;
  totalTransferredBytes: number;
  totalResourceBytes: number;
  totalDurationMs: number;
  startTime: number;
  endTime: number;
  statusCounts: {
    success: number; // 2xx
    redirect: number; // 3xx
    clientError: number; // 4xx
    serverError: number; // 5xx
    other: number;
  };
  resourceTypeCounts: Record<HarResourceType, number>;
}

/** HAR 列表过滤配置项 */
export interface HarFilterOptions {
  keyword?: string;
  resourceType?: HarResourceType | 'all';
  statusGroup?: 'all' | '2xx' | '3xx' | '4xx' | '5xx';
  method?: string;
}
