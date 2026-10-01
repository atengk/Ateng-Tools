/**
 * HAR 网络抓包日志离线分析纯函数服务
 *
 * @author Ateng
 * @since 2026-10-01
 */
import type {
  HarEntry,
  HarFilterOptions,
  HarLogRoot,
  HarPage,
  HarResourceType,
  HarSummary,
  ParsedHarEntry,
  TimingSegment,
} from './har-analyzer.types';

/**
 * 依据 MIME 类型与 URL 路径判断资源分类
 *
 * @param mimeType 响应 MIME 类型 (如 application/json)
 * @param url 请求目标 URL
 * @returns 资源分类枚举
 */
export function classifyResourceType(mimeType: string, url: string): HarResourceType {
  const mime = (mimeType || '').toLowerCase();
  const lowerUrl = (url || '').toLowerCase().split('?')[0];

  if (
    mime.includes('json')
    || mime.includes('xml')
    || mime.includes('grpc')
    || mime.includes('protobuf')
    || mime.includes('octet-stream')
    || lowerUrl.includes('/api/')
  ) {
    return 'fetch';
  }
  if (mime.includes('javascript') || mime.includes('ecmascript') || lowerUrl.endsWith('.js') || lowerUrl.endsWith('.mjs')) {
    return 'js';
  }
  if (mime.includes('text/css') || lowerUrl.endsWith('.css')) {
    return 'css';
  }
  if (
    mime.startsWith('image/')
    || lowerUrl.endsWith('.png')
    || lowerUrl.endsWith('.jpg')
    || lowerUrl.endsWith('.jpeg')
    || lowerUrl.endsWith('.svg')
    || lowerUrl.endsWith('.webp')
    || lowerUrl.endsWith('.gif')
    || lowerUrl.endsWith('.ico')
  ) {
    return 'img';
  }
  if (mime.startsWith('video/') || mime.startsWith('audio/') || lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mp3')) {
    return 'media';
  }
  if (
    mime.includes('font')
    || lowerUrl.endsWith('.woff')
    || lowerUrl.endsWith('.woff2')
    || lowerUrl.endsWith('.ttf')
    || lowerUrl.endsWith('.otf')
  ) {
    return 'font';
  }
  if (mime.includes('text/html') || lowerUrl.endsWith('.html') || lowerUrl.endsWith('.htm')) {
    return 'doc';
  }
  return 'other';
}

/**
 * 格式化字节尺寸为可读字符串 (B / KB / MB / GB)
 *
 * @param bytes 字节数
 * @returns 格式化后的带单位文本
 */
export function formatBytes(bytes: number): string {
  if (bytes < 0 || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * 格式化耗时毫秒数 (ms / s)
 *
 * @param ms 毫秒数
 * @returns 格式化后的带单位耗时
 */
export function formatDurationMs(ms: number): string {
  if (ms < 0 || isNaN(ms)) return '0 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(1);
  return `${mins} m ${secs} s`;
}

/**
 * 计算单条请求内部各阶段的时序切片
 *
 * @param entry HAR 原始请求条目
 * @returns 时序切片列表
 */
export function buildTimingSegments(entry: HarEntry): TimingSegment[] {
  const t = entry.timings;
  const total = Math.max(entry.time, 1);
  const segments: TimingSegment[] = [];

  const rawSegments = [
    { name: 'Blocked (排队阻塞)', val: t.blocked, color: '#94a3b8' },
    { name: 'DNS (域名解析)', val: t.dns, color: '#0ea5e9' },
    { name: 'Connect (TCP连接)', val: t.connect, color: '#f59e0b' },
    { name: 'SSL (握手加密)', val: t.ssl, color: '#8b5cf6' },
    { name: 'Send (发送请求)', val: t.send, color: '#06b6d4' },
    { name: 'Waiting (TTFB首包)', val: t.wait, color: '#10b981' },
    { name: 'Receive (内容下载)', val: t.receive, color: '#3b82f6' },
  ];

  let cumulativeMs = 0;
  for (const s of rawSegments) {
    const dur = typeof s.val === 'number' && s.val > 0 ? s.val : 0;
    if (dur > 0) {
      const leftPercent = Math.min((cumulativeMs / total) * 100, 100);
      const widthPercent = Math.min((dur / total) * 100, 100 - leftPercent);
      segments.push({
        name: s.name,
        color: s.color,
        durationMs: dur,
        leftPercent,
        widthPercent,
      });
      cumulativeMs += dur;
    }
  }

  // 若无具体 breakdown 阶段，以统一条目兜底
  if (segments.length === 0) {
    segments.push({
      name: 'Total Request',
      color: '#3b82f6',
      durationMs: total,
      leftPercent: 0,
      widthPercent: 100,
    });
  }

  return segments;
}

/**
 * 解析 HAR JSON 字符串为结构化视图数据与汇总统计
 *
 * @param jsonString 包含 HAR 格式的完整 JSON 字符串
 * @returns 解析结果对象
 */
export function parseHarJson(jsonString: string): {
  entries: ParsedHarEntry[];
  summary: HarSummary;
  pages: HarPage[];
} {
  const root: HarLogRoot = JSON.parse(jsonString);
  if (!root || !root.log || !Array.isArray(root.log.entries)) {
    throw new Error('非法的 HAR 文件格式：根节点缺失 log.entries 数组');
  }

  const rawEntries = root.log.entries;
  const pages = root.log.pages || [];

  if (rawEntries.length === 0) {
    return {
      entries: [],
      pages,
      summary: {
        totalRequests: 0,
        totalTransferredBytes: 0,
        totalResourceBytes: 0,
        totalDurationMs: 0,
        startTime: 0,
        endTime: 0,
        statusCounts: { success: 0, redirect: 0, clientError: 0, serverError: 0, other: 0 },
        resourceTypeCounts: { fetch: 0, js: 0, css: 0, img: 0, media: 0, font: 0, doc: 0, other: 0 },
      },
    };
  }

  // 1. 预提取并按启动时间排序
  const tempEntries = rawEntries.map((e, index) => {
    const startTimestamp = new Date(e.startedDateTime).getTime() || 0;
    const duration = Math.max(e.time || 0, 0);
    return {
      entry: e,
      id: `req-${index}-${startTimestamp}`,
      startTimestamp,
      duration,
      endTimestamp: startTimestamp + duration,
    };
  }).sort((a, b) => a.startTimestamp - b.startTimestamp);

  // 2. 确定全局起止时间跨度
  const minStart = tempEntries[0].startTimestamp;
  let maxEnd = tempEntries[0].endTimestamp;
  for (const t of tempEntries) {
    if (t.endTimestamp > maxEnd) maxEnd = t.endTimestamp;
  }
  const totalTimelineSpanMs = Math.max(maxEnd - minStart, 1);

  // 3. 构建详细解析条目与全局指标汇聚
  let totalTransferredBytes = 0;
  let totalResourceBytes = 0;
  const statusCounts = { success: 0, redirect: 0, clientError: 0, serverError: 0, other: 0 };
  const resourceTypeCounts: Record<HarResourceType, number> = {
    fetch: 0,
    js: 0,
    css: 0,
    img: 0,
    media: 0,
    font: 0,
    doc: 0,
    other: 0,
  };

  const parsedEntries: ParsedHarEntry[] = tempEntries.map(({ entry, id, startTimestamp, duration }) => {
    const req = entry.request || { method: 'GET', url: '', headers: [] };
    const res = entry.response || { status: 0, statusText: '', headers: [], content: { size: 0, mimeType: '' } };

    // 计算 URL 相对路径与域名
    let domain = '';
    let urlPath = req.url;
    try {
      const u = new URL(req.url);
      domain = u.host;
      urlPath = u.pathname + u.search;
    } catch {
      // 容忍非完整 URL
      const slash = req.url.indexOf('/', 8);
      if (slash !== -1) {
        domain = req.url.slice(0, slash);
        urlPath = req.url.slice(slash);
      }
    }

    const mimeType = res.content?.mimeType || '';
    const resourceType = classifyResourceType(mimeType, req.url);
    resourceTypeCounts[resourceType] = (resourceTypeCounts[resourceType] || 0) + 1;

    // 传输体积与资源尺寸
    const resourceSize = Math.max(res.content?.size || res.bodySize || 0, 0);
    const transferSize = Math.max(
      res._transferSize !== undefined
        ? res._transferSize
        : (res.bodySize !== undefined && res.bodySize >= 0 ? res.bodySize : resourceSize),
      0,
    );

    totalTransferredBytes += transferSize;
    totalResourceBytes += resourceSize;

    // 状态分类统计
    const status = res.status;
    if (status >= 200 && status < 300) {
      statusCounts.success++;
    } else if (status >= 300 && status < 400) {
      statusCounts.redirect++;
    } else if (status >= 400 && status < 500) {
      statusCounts.clientError++;
    } else if (status >= 500 && status < 600) {
      statusCounts.serverError++;
    } else {
      statusCounts.other++;
    }

    // 甘特图时间轴偏移与宽度占比
    const offsetMs = Math.max(startTimestamp - minStart, 0);
    const offsetPercent = Math.min((offsetMs / totalTimelineSpanMs) * 100, 100);
    const widthPercent = Math.max(Math.min((duration / totalTimelineSpanMs) * 100, 100 - offsetPercent), 0.5);

    const timingSegments = buildTimingSegments(entry);

    return {
      id,
      startedDateTime: entry.startedDateTime,
      startTimestamp,
      time: duration,
      method: (req.method || 'GET').toUpperCase(),
      url: req.url,
      urlPath,
      domain,
      status,
      statusText: res.statusText || '',
      mimeType,
      resourceType,
      transferSize,
      resourceSize,
      offsetPercent,
      widthPercent,
      timings: entry.timings,
      timingSegments,
      request: req,
      response: res,
    };
  });

  return {
    entries: parsedEntries,
    pages,
    summary: {
      totalRequests: parsedEntries.length,
      totalTransferredBytes,
      totalResourceBytes,
      totalDurationMs: totalTimelineSpanMs,
      startTime: minStart,
      endTime: maxEnd,
      statusCounts,
      resourceTypeCounts,
    },
  };
}

/**
 * 依据多维条件过滤请求列表
 *
 * @param entries 已解析的请求列表
 * @param filter 过滤条件
 * @returns 过滤后的请求列表
 */
export function filterHarEntries(
  entries: ParsedHarEntry[],
  filter: HarFilterOptions,
): ParsedHarEntry[] {
  return entries.filter((e) => {
    // 关键字搜索 (URL、域名、方法、状态码)
    if (filter.keyword) {
      const q = filter.keyword.toLowerCase().trim();
      const matchUrl = e.url.toLowerCase().includes(q);
      const matchDomain = e.domain.toLowerCase().includes(q);
      const matchStatus = String(e.status).includes(q);
      const matchMethod = e.method.toLowerCase().includes(q);
      if (!matchUrl && !matchDomain && !matchStatus && !matchMethod) {
        return false;
      }
    }

    // 资源类型过滤
    if (filter.resourceType && filter.resourceType !== 'all') {
      if (e.resourceType !== filter.resourceType) return false;
    }

    // 状态分组过滤
    if (filter.statusGroup && filter.statusGroup !== 'all') {
      const s = e.status;
      if (filter.statusGroup === '2xx' && (s < 200 || s >= 300)) return false;
      if (filter.statusGroup === '3xx' && (s < 300 || s >= 400)) return false;
      if (filter.statusGroup === '4xx' && (s < 400 || s >= 500)) return false;
      if (filter.statusGroup === '5xx' && (s < 500 || s >= 600)) return false;
    }

    // 方法过滤
    if (filter.method && filter.method !== 'ALL') {
      if (e.method !== filter.method) return false;
    }

    return true;
  });
}
