/**
 * HAR 网络抓包日志离线分析服务单元测试
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { describe, expect, it } from 'vitest';
import {
  buildTimingSegments,
  classifyResourceType,
  filterHarEntries,
  formatBytes,
  formatDurationMs,
  parseHarJson,
} from './har-analyzer.service';

describe('har-analyzer.service', () => {
  describe('classifyResourceType', () => {
    it('正确按 MIME 与 URL 识别资源类型', () => {
      expect(classifyResourceType('application/json', 'https://api.example.com/v1/users')).toBe('fetch');
      expect(classifyResourceType('application/javascript', 'https://example.com/app.js')).toBe('js');
      expect(classifyResourceType('text/css', 'https://example.com/style.css')).toBe('css');
      expect(classifyResourceType('image/png', 'https://example.com/logo.png')).toBe('img');
      expect(classifyResourceType('font/woff2', 'https://example.com/font.woff2')).toBe('font');
      expect(classifyResourceType('text/html', 'https://example.com/index.html')).toBe('doc');
      expect(classifyResourceType('video/mp4', 'https://example.com/intro.mp4')).toBe('media');
      expect(classifyResourceType('unknown/mime', 'https://example.com/data.bin')).toBe('other');
    });
  });

  describe('formatBytes & formatDurationMs', () => {
    it('正确格式化字节大小', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.50 MB');
    });

    it('正确格式化耗时毫秒数', () => {
      expect(formatDurationMs(0)).toBe('0 ms');
      expect(formatDurationMs(350)).toBe('350 ms');
      expect(formatDurationMs(1500)).toBe('1.50 s');
      expect(formatDurationMs(65000)).toBe('1 m 5.0 s');
    });
  });

  describe('buildTimingSegments', () => {
    it('正确计算甘特图各阶段切片', () => {
      const entry = {
        startedDateTime: '2026-10-01T10:00:00.000Z',
        time: 100,
        request: { method: 'GET', url: 'https://example.com', headers: [] },
        response: { status: 200, statusText: 'OK', headers: [], content: { size: 100, mimeType: '' } },
        timings: {
          blocked: 10,
          dns: 20,
          connect: 20,
          send: 10,
          wait: 30,
          receive: 10,
        },
      };

      const segments = buildTimingSegments(entry);
      expect(segments.length).toBe(6);
      expect(segments[0].name).toContain('Blocked');
      expect(segments[0].leftPercent).toBe(0);
      expect(segments[0].widthPercent).toBe(10);

      const last = segments[segments.length - 1];
      expect(last.name).toContain('Receive');
    });
  });

  describe('parseHarJson', () => {
    it('解析标准完整 HAR 归档数据并计算汇总统计', () => {
      const mockHar = JSON.stringify({
        log: {
          version: '1.2',
          creator: { name: 'DevTools', version: '100' },
          pages: [{ startedDateTime: '2026-10-01T10:00:00.000Z', id: 'page_1', title: 'Example' }],
          entries: [
            {
              startedDateTime: '2026-10-01T10:00:00.000Z',
              time: 150,
              request: {
                method: 'GET',
                url: 'https://example.com/api/user',
                headers: [{ name: 'Accept', value: 'application/json' }],
              },
              response: {
                status: 200,
                statusText: 'OK',
                headers: [{ name: 'Content-Type', value: 'application/json' }],
                content: { size: 1024, mimeType: 'application/json' },
                bodySize: 1024,
              },
              timings: { wait: 100, receive: 50 },
            },
            {
              startedDateTime: '2026-10-01T10:00:00.100Z',
              time: 80,
              request: {
                method: 'POST',
                url: 'https://example.com/static/style.css',
                headers: [],
              },
              response: {
                status: 404,
                statusText: 'Not Found',
                headers: [{ name: 'Content-Type', value: 'text/css' }],
                content: { size: 256, mimeType: 'text/css' },
                bodySize: 256,
              },
              timings: { wait: 50, receive: 30 },
            },
          ],
        },
      });

      const { entries, summary, pages } = parseHarJson(mockHar);

      expect(pages).toHaveLength(1);
      expect(entries).toHaveLength(2);
      expect(summary.totalRequests).toBe(2);
      expect(summary.totalResourceBytes).toBe(1280);
      expect(summary.statusCounts.success).toBe(1);
      expect(summary.statusCounts.clientError).toBe(1);
      expect(summary.resourceTypeCounts.fetch).toBe(1);
      expect(summary.resourceTypeCounts.css).toBe(1);

      // 第一条请求
      const first = entries[0];
      expect(first.method).toBe('GET');
      expect(first.domain).toBe('example.com');
      expect(first.urlPath).toBe('/api/user');
      expect(first.resourceType).toBe('fetch');
    });

    it('对空 entries 稳健返回初始汇总结构', () => {
      const emptyHar = JSON.stringify({
        log: {
          version: '1.2',
          entries: [],
        },
      });

      const { entries, summary } = parseHarJson(emptyHar);
      expect(entries).toHaveLength(0);
      expect(summary.totalRequests).toBe(0);
    });

    it('非法 JSON 抛出解析异常', () => {
      expect(() => parseHarJson('{ invalid')).toThrow();
      expect(() => parseHarJson('{}')).toThrow('非法的 HAR 文件格式');
    });
  });

  describe('filterHarEntries', () => {
    const mockEntries = [
      {
        id: '1',
        method: 'GET',
        url: 'https://api.github.com/users',
        domain: 'api.github.com',
        status: 200,
        resourceType: 'fetch' as const,
      },
      {
        id: '2',
        method: 'POST',
        url: 'https://github.com/login',
        domain: 'github.com',
        status: 302,
        resourceType: 'doc' as const,
      },
      {
        id: '3',
        method: 'GET',
        url: 'https://assets.github.com/style.css',
        domain: 'assets.github.com',
        status: 404,
        resourceType: 'css' as const,
      },
    ] as any[];

    it('根据关键字过滤', () => {
      const filtered = filterHarEntries(mockEntries, { keyword: 'assets' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('3');
    });

    it('根据资源类型过滤', () => {
      const filtered = filterHarEntries(mockEntries, { resourceType: 'fetch' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('根据状态码区间过滤', () => {
      const filtered2xx = filterHarEntries(mockEntries, { statusGroup: '2xx' });
      expect(filtered2xx).toHaveLength(1);
      expect(filtered2xx[0].status).toBe(200);

      const filtered4xx = filterHarEntries(mockEntries, { statusGroup: '4xx' });
      expect(filtered4xx).toHaveLength(1);
      expect(filtered4xx[0].status).toBe(404);
    });
  });
});
