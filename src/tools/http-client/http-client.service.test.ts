/**
 * HTTP 客户端业务服务层单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { describe, expect, it, vi } from 'vitest';
import {
  addHistoryRecord,
  buildQueryString,
  buildRequestBodyAndHeaders,
  classifyStatus,
  compileRequestHeaders,
  createHistoryRecord,
  diagnoseFetchError,
  encodeBase64,
  executeHttpRequest,
  exportToCurlCommand,
  extractHeaders,
  filterHistoryRecords,
  formatBytes,
  getStatusTagType,
  importFromCurlCommand,
  mergeUrlAndQuery,
  parseQueryString,
  serializeRequestSpec,
  splitUrlAndQuery,
  tryFormatJson,
  validateJson,
} from './http-client.service';
import type { HistoryRecord, KeyValuePair, RequestBodyConfig } from './http-client.types';

describe('HTTP Client Service', () => {
  describe('classifyStatus', () => {
    it('正确识别 2xx 成功状态', () => {
      expect(classifyStatus(200)).toBe('success');
      expect(classifyStatus(201)).toBe('success');
      expect(classifyStatus(204)).toBe('success');
    });

    it('正确识别 3xx 重定向状态', () => {
      expect(classifyStatus(301)).toBe('redirect');
      expect(classifyStatus(302)).toBe('redirect');
      expect(classifyStatus(304)).toBe('redirect');
    });

    it('正确识别 4xx 客户端异常状态', () => {
      expect(classifyStatus(400)).toBe('client-error');
      expect(classifyStatus(401)).toBe('client-error');
      expect(classifyStatus(404)).toBe('client-error');
      expect(classifyStatus(422)).toBe('client-error');
    });

    it('正确识别 5xx 服务端异常状态', () => {
      expect(classifyStatus(500)).toBe('server-error');
      expect(classifyStatus(502)).toBe('server-error');
      expect(classifyStatus(504)).toBe('server-error');
    });

    it('对非标状态码返回 unknown', () => {
      expect(classifyStatus(100)).toBe('unknown');
      expect(classifyStatus(999)).toBe('unknown');
    });
  });

  describe('getStatusTagType', () => {
    it('映射正确的 Naive UI tag 类型', () => {
      expect(getStatusTagType('success')).toBe('success');
      expect(getStatusTagType('redirect')).toBe('info');
      expect(getStatusTagType('client-error')).toBe('warning');
      expect(getStatusTagType('server-error')).toBe('error');
      expect(getStatusTagType('unknown')).toBe('default');
    });
  });

  describe('formatBytes', () => {
    it('正确格式化字节单位', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(-10)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1.00 MB');
      expect(formatBytes(2621440)).toBe('2.50 MB');
    });
  });

  describe('extractHeaders', () => {
    it('正确从 Fetch Headers 中提取字典与已排序列表', () => {
      const headers = new Headers();
      headers.set('content-type', 'application/json');
      headers.set('x-custom-token', 'abc-123');

      const result = extractHeaders(headers);
      expect(result.record['content-type']).toBe('application/json');
      expect(result.record['x-custom-token']).toBe('abc-123');
      expect(result.list).toHaveLength(2);
      expect(result.list[0].key).toBe('content-type');
      expect(result.list[1].key).toBe('x-custom-token');
    });
  });

  describe('tryFormatJson', () => {
    it('对有效 JSON 对象进行美化排版', () => {
      const raw = '{"name":"ateng","id":1}';
      const result = tryFormatJson(raw);
      expect(result.isJson).toBe(true);
      expect(result.formatted).toBe('{\n  "name": "ateng",\n  "id": 1\n}');
    });

    it('对有效 JSON 数组进行美化排版', () => {
      const raw = '[1, 2, 3]';
      const result = tryFormatJson(raw);
      expect(result.isJson).toBe(true);
      expect(result.formatted).toBe('[\n  1,\n  2,\n  3\n]');
    });

    it('对普通纯文本或非法 JSON 判定为非 JSON', () => {
      expect(tryFormatJson('Hello World').isJson).toBe(false);
      expect(tryFormatJson('').isJson).toBe(false);
      expect(tryFormatJson('{ invalid json }').isJson).toBe(false);
    });
  });

  describe('executeHttpRequest', () => {
    it('空 URL 时抛出异常', async () => {
      await expect(executeHttpRequest({ method: 'GET', url: '' })).rejects.toThrow('URL cannot be empty');
      await expect(executeHttpRequest({ method: 'GET', url: '   ' })).rejects.toThrow('URL cannot be empty');
    });

    it('正常发送 GET 请求并正确构造 HttpResponseSnapshot', async () => {
      const mockHeaders = new Headers();
      mockHeaders.set('content-type', 'application/json');
      mockHeaders.set('content-length', '27');

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        ok: true,
        headers: mockHeaders,
        text: vi.fn().mockResolvedValue('{"code":200,"message":"ok"}'),
      } as unknown as Response;

      const mockFetch = vi.fn().mockResolvedValue(mockResponse);

      const snapshot = await executeHttpRequest(
        {
          method: 'GET',
          url: 'https://api.example.com/data',
          timeoutMs: 5000,
        },
        mockFetch,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'GET',
          headers: {},
        }),
      );

      expect(snapshot.status).toBe(200);
      expect(snapshot.statusText).toBe('OK');
      expect(snapshot.ok).toBe(true);
      expect(snapshot.isJson).toBe(true);
      expect(snapshot.formattedJson).toContain('"code": 200');
      expect(snapshot.headers['content-type']).toBe('application/json');
      expect(snapshot.sizeBytes).toBe(27);
      expect(snapshot.durationMs).toBeGreaterThanOrEqual(1);
    });

    it('正常发送带有 Body 的 POST 请求', async () => {
      const mockHeaders = new Headers();
      mockHeaders.set('content-type', 'text/plain');

      const mockResponse = {
        status: 201,
        statusText: 'Created',
        ok: true,
        headers: mockHeaders,
        text: vi.fn().mockResolvedValue('Item created successfully'),
      } as unknown as Response;

      const mockFetch = vi.fn().mockResolvedValue(mockResponse);

      const snapshot = await executeHttpRequest(
        {
          method: 'POST',
          url: 'https://api.example.com/items',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ item: 'box' }),
        },
        mockFetch,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/items',
        expect.objectContaining({
          method: 'POST',
          body: '{"item":"box"}',
          headers: { 'content-type': 'application/json' },
        }),
      );

      expect(snapshot.status).toBe(201);
      expect(snapshot.isJson).toBe(false);
      expect(snapshot.body).toBe('Item created successfully');
    });

    it('支持外部传入的 AbortSignal 进行主动中断', async () => {
      const controller = new AbortController();

      const mockFetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
        return new Promise((_, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(new DOMException('The user aborted a request.', 'AbortError'));
            });
          }
        });
      });

      const requestPromise = executeHttpRequest(
        {
          method: 'GET',
          url: 'https://api.example.com/slow',
          signal: controller.signal,
          timeoutMs: 10000,
        },
        mockFetch,
      );

      // 模拟外部用户点击取消
      controller.abort();

      await expect(requestPromise).rejects.toThrow('The user aborted a request.');
    });

    it('请求超时时自动中断', async () => {
      vi.useFakeTimers();

      const mockFetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
        return new Promise((_, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              reject(new Error('Request timed out after 50ms'));
            });
          }
        });
      });

      const requestPromise = executeHttpRequest(
        {
          method: 'GET',
          url: 'https://api.example.com/timeout',
          timeoutMs: 50,
        },
        mockFetch,
      );

      vi.advanceTimersByTime(60);

      await expect(requestPromise).rejects.toThrow('Request timed out after 50ms');

      vi.useRealTimers();
    });
  });

  describe('parseQueryString & buildQueryString', () => {
    it('正确解析包含各种字符的 Query 字符串', () => {
      const q = '?name=ateng&age=25&city=%E5%8C%97%E4%BA%AC&empty=&novalue';
      const parsed = parseQueryString(q);
      expect(parsed).toHaveLength(5);
      expect(parsed[0]).toEqual({ key: 'name', value: 'ateng', enabled: true });
      expect(parsed[1]).toEqual({ key: 'age', value: '25', enabled: true });
      expect(parsed[2]).toEqual({ key: 'city', value: '北京', enabled: true });
      expect(parsed[3]).toEqual({ key: 'empty', value: '', enabled: true });
      expect(parsed[4]).toEqual({ key: 'novalue', value: '', enabled: true });
    });

    it('对空输入返回空数组', () => {
      expect(parseQueryString('')).toEqual([]);
      expect(parseQueryString('?')).toEqual([]);
      expect(parseQueryString('   ')).toEqual([]);
    });

    it('buildQueryString 正确组装并跳过已禁用的参数', () => {
      const params: KeyValuePair[] = [
        { key: 'page', value: '1', enabled: true },
        { key: 'disabled', value: 'secret', enabled: false },
        { key: 'search', value: 'hello world', enabled: true },
        { key: '', value: 'ignored', enabled: true },
      ];
      const qs = buildQueryString(params);
      expect(qs).toBe('page=1&search=hello%20world');
    });
  });

  describe('splitUrlAndQuery & mergeUrlAndQuery', () => {
    it('正确拆分含 Query 与 Hash 的完整 URL', () => {
      const fullUrl = 'https://api.example.com/v1/users?role=admin&status=active#section-1';
      const result = splitUrlAndQuery(fullUrl);
      expect(result.baseUrl).toBe('https://api.example.com/v1/users');
      expect(result.queryParams).toHaveLength(2);
      expect(result.queryParams[0]).toEqual({ key: 'role', value: 'admin', enabled: true });
      expect(result.hash).toBe('#section-1');
    });

    it('拆分无 Query 的 URL', () => {
      const fullUrl = 'https://api.example.com/v1/health';
      const result = splitUrlAndQuery(fullUrl);
      expect(result.baseUrl).toBe('https://api.example.com/v1/health');
      expect(result.queryParams).toEqual([]);
      expect(result.hash).toBe('');
    });

    it('mergeUrlAndQuery 正确合并参数并保留/恢复 Hash', () => {
      const baseUrl = 'https://api.example.com/v1/users';
      const params: KeyValuePair[] = [
        { key: 'page', value: '2', enabled: true },
        { key: 'limit', value: '50', enabled: true },
      ];
      const merged = mergeUrlAndQuery(baseUrl, params, '#top');
      expect(merged).toBe('https://api.example.com/v1/users?page=2&limit=50#top');
    });

    it('mergeUrlAndQuery 当 baseUrl 自带参数时自动以新参数列表为准', () => {
      const baseUrl = 'https://api.example.com/v1/users?old=true';
      const params: KeyValuePair[] = [
        { key: 'new', value: 'true', enabled: true },
      ];
      const merged = mergeUrlAndQuery(baseUrl, params);
      expect(merged).toBe('https://api.example.com/v1/users?new=true');
    });
  });

  describe('encodeBase64', () => {
    it('正确对 ASCII 与 UTF-8 中文字符串执行 Base64 编码', () => {
      expect(encodeBase64('admin:123456')).toBe('YWRtaW46MTIzNDU2');
      expect(encodeBase64('你好:世界')).toBe('5L2g5aW9OuS4lueVjA==');
    });
  });

  describe('compileRequestHeaders', () => {
    it('正确合并启用的自定义 Header 并忽略已禁用的 Header', () => {
      const headers: KeyValuePair[] = [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'X-Debug', value: 'true', enabled: false },
        { key: 'Accept', value: '*/*', enabled: true },
        { key: '   ', value: 'invalid', enabled: true },
      ];

      const compiled = compileRequestHeaders(headers);
      expect(compiled['Content-Type']).toBe('application/json');
      expect(compiled['Accept']).toBe('*/*');
      expect(compiled['X-Debug']).toBeUndefined();
    });

    it('自动注入 Bearer Token 认证头', () => {
      const headers: KeyValuePair[] = [
        { key: 'Accept', value: 'application/json', enabled: true },
      ];
      const compiled = compileRequestHeaders(headers, {
        type: 'bearer',
        bearerToken: 'my-jwt-token-123',
      });
      expect(compiled['Authorization']).toBe('Bearer my-jwt-token-123');
      expect(compiled['Accept']).toBe('application/json');
    });

    it('自动注入 Basic Auth 认证头', () => {
      const compiled = compileRequestHeaders([], {
        type: 'basic',
        basicUsername: 'ateng',
        basicPassword: 'secretPassword',
      });
      expect(compiled['Authorization']).toBe(`Basic ${encodeBase64('ateng:secretPassword')}`);
    });

    it('如果用户已有自定义 Authorization 头，不会被 Auth 配置静默覆盖', () => {
      const headers: KeyValuePair[] = [
        { key: 'authorization', value: 'CustomToken manual-auth', enabled: true },
      ];
      const compiled = compileRequestHeaders(headers, {
        type: 'bearer',
        bearerToken: 'should-not-override',
      });
      expect(compiled['authorization']).toBe('CustomToken manual-auth');
    });
  });

  describe('validateJson', () => {
    it('空值或纯空白字符判定为合法', () => {
      expect(validateJson('')).toEqual({ valid: true });
      expect(validateJson('   ')).toEqual({ valid: true });
    });

    it('有效 JSON 对象或数组判定为合法', () => {
      expect(validateJson('{"key":"value"}')).toEqual({ valid: true });
      expect(validateJson('[1, 2, 3]')).toEqual({ valid: true });
    });

    it('非法 JSON 语法返回 valid: false 并附带错误提示', () => {
      const res = validateJson('{ bad: json }');
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('buildRequestBodyAndHeaders', () => {
    it('type 为 none 时返回空载荷且不修改 headers', () => {
      const config: RequestBodyConfig = { type: 'none' };
      const res = buildRequestBodyAndHeaders(config, { 'X-Custom': '1' });
      expect(res.body).toBeNull();
      expect(res.headers['X-Custom']).toBe('1');
      expect(res.summaryText).toBe('');
    });

    it('type 为 json 时自动注入 Content-Type: application/json 并返回 rawText', () => {
      const config: RequestBodyConfig = {
        type: 'json',
        rawText: '{"hello":"world"}',
      };
      const res = buildRequestBodyAndHeaders(config);
      expect(res.body).toBe('{"hello":"world"}');
      expect(res.headers['Content-Type']).toBe('application/json');
      expect(res.summaryText).toBe('{"hello":"world"}');
    });

    it('type 为 json 但用户已显式配置 Content-Type 时尊重用户配置', () => {
      const config: RequestBodyConfig = {
        type: 'json',
        rawText: '{"custom":"type"}',
      };
      const res = buildRequestBodyAndHeaders(config, {
        'content-type': 'application/vnd.api+json',
      });
      expect(res.headers['content-type']).toBe('application/vnd.api+json');
    });

    it('type 为 x-www-form-urlencoded 时编码表单并自动注入 Content-Type', () => {
      const config: RequestBodyConfig = {
        type: 'x-www-form-urlencoded',
        urlEncoded: [
          { key: 'username', value: 'ateng admin', enabled: true },
          { key: 'age', value: '18', enabled: true },
          { key: 'disabled', value: 'skip', enabled: false },
        ],
      };
      const res = buildRequestBodyAndHeaders(config);
      expect(res.body).toBe('username=ateng%20admin&age=18');
      expect(res.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(res.summaryText).toBe('username=ateng%20admin&age=18');
    });

    it('type 为 raw 时原样返回文本且不强制追加 Content-Type', () => {
      const config: RequestBodyConfig = {
        type: 'raw',
        rawText: '<xml><status>ok</status></xml>',
      };
      const res = buildRequestBodyAndHeaders(config, { 'Content-Type': 'application/xml' });
      expect(res.body).toBe('<xml><status>ok</status></xml>');
      expect(res.headers['Content-Type']).toBe('application/xml');
    });

    it('type 为 form-data 时正确封装 FormData 并清理手动设置的 multipart/form-data', () => {
      const fakeFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const config: RequestBodyConfig = {
        type: 'form-data',
        formData: [
          { key: 'title', type: 'text', value: 'Report', enabled: true },
          { key: 'file', type: 'file', value: '', file: fakeFile, enabled: true },
          { key: 'ignored', type: 'text', value: 'no', enabled: false },
        ],
      };

      const res = buildRequestBodyAndHeaders(config, {
        'Content-Type': 'multipart/form-data',
        'X-Trace': '12345',
      });

      expect(res.body).toBeInstanceOf(FormData);
      const fd = res.body as FormData;
      expect(fd.get('title')).toBe('Report');
      const retrievedFile = fd.get('file') as File;
      expect(retrievedFile.name).toBe('test.txt');
      expect(retrievedFile.size).toBe(fakeFile.size);
      expect(fd.get('ignored')).toBeNull();

      // 手动指定的 multipart/form-data 应该被删除以允许 fetch 自动生成 boundary
      expect(res.headers['Content-Type']).toBeUndefined();
      expect(res.headers['X-Trace']).toBe('12345');
      expect(res.summaryText).toContain('[Text] title=Report');
      expect(res.summaryText).toContain('[File] file=test.txt');
    });
  });

  describe('diagnoseFetchError', () => {
    it('正确诊断离线状态', () => {
      const diag = diagnoseFetchError(new Error('Network error'), 'https://api.example.com', false);
      expect(diag.isLikelyCors).toBe(false);
      expect(diag.title).toBe('网络连接已断开');
    });

    it('正确诊断主动取消', () => {
      const diag = diagnoseFetchError(new DOMException('aborted', 'AbortError'), 'https://api.example.com');
      expect(diag.isLikelyCors).toBe(false);
      expect(diag.title).toBe('请求已取消');
    });

    it('正确诊断超时异常', () => {
      const diag = diagnoseFetchError(new Error('Request timed out after 30000ms'), 'https://api.example.com');
      expect(diag.isLikelyCors).toBe(false);
      expect(diag.title).toBe('请求超时');
    });

    it('正确识别 TypeError: Failed to fetch 为疑似 CORS / 预检拦截', () => {
      const diag = diagnoseFetchError(new TypeError('Failed to fetch'), 'https://api.example.com');
      expect(diag.isLikelyCors).toBe(true);
      expect(diag.title).toContain('CORS');
      expect(diag.suggestions.length).toBeGreaterThanOrEqual(3);
    });

    it('正确识别通用 NetworkError 为疑似 CORS', () => {
      const diag = diagnoseFetchError(new Error('NetworkError when attempting to fetch resource.'), 'https://api.example.com');
      expect(diag.isLikelyCors).toBe(true);
    });

    it('对未知普通错误返回一般异常', () => {
      const diag = diagnoseFetchError(new Error('Invalid URL format'), 'https://api.example.com');
      expect(diag.isLikelyCors).toBe(false);
      expect(diag.title).toBe('请求失败');
    });
  });

  describe('exportToCurlCommand', () => {
    it('正确将 GET 请求导出为单行/多行 cURL 命令', () => {
      const cmd = exportToCurlCommand({
        method: 'GET',
        url: 'https://api.example.com/users?page=1',
        headers: { Accept: 'application/json' },
      });
      expect(cmd).toContain("curl 'https://api.example.com/users?page=1'");
      expect(cmd).toContain("-H 'Accept: application/json'");
      expect(cmd).not.toContain('-X GET');
    });

    it('正确导出带 JSON 载荷与自定义 POST 方法的 cURL 命令并安全转义单引号', () => {
      const cmd = exportToCurlCommand({
        method: 'POST',
        url: "https://api.example.com/items?name=it's",
        headers: { 'Content-Type': 'application/json' },
        body: '{"message":"it\'s cool"}',
      });
      expect(cmd).toContain("-X POST");
      expect(cmd).toContain("--data-raw '{\"message\":\"it'\\''s cool\"}'");
      expect(cmd).toContain("https://api.example.com/items?name=it'\\''s");
    });
  });

  describe('importFromCurlCommand', () => {
    it('从标准 cURL 导入 POST JSON 请求并还原 Method、URL、Headers、Auth 与 Body', () => {
      const curl = `curl 'https://api.example.com/v1/posts?debug=true' \\
        -X POST \\
        -H 'Content-Type: application/json' \\
        -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.test' \\
        --data-raw '{"title":"hello","count":42}'`;

      const imported = importFromCurlCommand(curl);
      expect(imported.method).toBe('POST');
      expect(imported.url).toBe('https://api.example.com/v1/posts?debug=true');
      expect(imported.queryParams).toEqual([{ key: 'debug', value: 'true', enabled: true }]);
      expect(imported.auth.type).toBe('bearer');
      expect(imported.auth.bearerToken).toBe('eyJhbGciOiJIUzI1NiJ9.test');
      expect(imported.bodyConfig.type).toBe('json');
      expect(imported.bodyConfig.rawText).toBe('{"title":"hello","count":42}');
    });

    it('从 cURL 导入 Basic Auth 与表单载荷', () => {
      const curl = `curl 'https://api.example.com/login' \\
        -u admin:secretPass \\
        --data 'user=ateng&type=vip'`;

      const imported = importFromCurlCommand(curl);
      expect(imported.auth.type).toBe('basic');
      expect(imported.auth.basicUsername).toBe('admin');
      expect(imported.auth.basicPassword).toBe('secretPass');
      expect(imported.bodyConfig.type).toBe('x-www-form-urlencoded');
      expect(imported.bodyConfig.urlEncoded).toHaveLength(2);
      expect(imported.bodyConfig.urlEncoded?.[0]).toEqual({ key: 'user', value: 'ateng', enabled: true });
    });
  });

  describe('History Storage & Serialization Safety', () => {
    it('serializeRequestSpec 正确清洗并序列化请求要素快照且不残留 File 句柄', () => {
      const spec = serializeRequestSpec(
        'POST',
        'https://api.example.com/upload?tag=prod',
        [{ key: 'tag', value: 'prod', enabled: true }],
        [{ key: 'X-Custom', value: 'test', enabled: true }],
        { type: 'bearer', bearerToken: 'token123' },
        {
          type: 'form-data',
          formData: [
            { key: 'name', type: 'text', value: 'test', file: null, enabled: true },
            { key: 'avatar', type: 'file', value: 'avatar.png', file: new File([''], 'avatar.png'), enabled: true },
          ],
        },
      );

      expect(spec.method).toBe('POST');
      expect(spec.url).toBe('https://api.example.com/upload?tag=prod');
      expect(spec.auth?.bearerToken).toBe('token123');
      expect(spec.bodyConfig?.formData).toHaveLength(2);
      // 验证没有保存 File 对象，仅保存文件名字符串
      expect(spec.bodyConfig?.formData?.[1]).toEqual({
        key: 'avatar',
        type: 'file',
        value: 'avatar.png',
        enabled: true,
      });
      // 验证能够成功序列化为标准 JSON (防 LocalStorage 报错)
      expect(() => JSON.stringify(spec)).not.toThrow();
    });

    it('createHistoryRecord 生成包含唯一 ID 与元数据的历史记录', () => {
      const spec = serializeRequestSpec('GET', 'https://api.example.com', [], [], { type: 'none' }, { type: 'none' });
      const record = createHistoryRecord({
        request: spec,
        response: {
          status: 200,
          statusText: 'OK',
          ok: true,
          durationMs: 45,
          sizeBytes: 1024,
        },
        timestamp: 1600000000000,
      });

      expect(record.id).toMatch(/^req_1600000000000_/);
      expect(record.timestamp).toBe(1600000000000);
      expect(record.request.method).toBe('GET');
      expect(record.response?.status).toBe(200);
      expect(record.response?.durationMs).toBe(45);
    });

    it('addHistoryRecord 实行 FIFO 队列淘汰与去重，默认上限 20 条', () => {
      let history: HistoryRecord[] = [];

      for (let i = 1; i <= 25; i++) {
        const spec = serializeRequestSpec('GET', `https://api.example.com/item/${i}`, [], [], { type: 'none' }, { type: 'none' });
        const record = createHistoryRecord({
          request: spec,
          response: { status: 200, statusText: 'OK', ok: true, durationMs: 10, sizeBytes: 100 },
          timestamp: 1000 + i,
        });
        history = addHistoryRecord(history, record, 20);
      }

      // 严格限制在最多 20 条
      expect(history).toHaveLength(20);
      // 最新的在最前面 (FIFO 头部插入)
      expect(history[0].request.url).toBe('https://api.example.com/item/25');
      // 最旧的 1-5 应该已被逐出队列
      expect(history[19].request.url).toBe('https://api.example.com/item/6');
    });

    it('filterHistoryRecords 模糊匹配 URL 与 Method', () => {
      const spec1 = serializeRequestSpec('GET', 'https://api.example.com/users', [], [], { type: 'none' }, { type: 'none' });
      const spec2 = serializeRequestSpec('POST', 'https://api.example.com/orders', [], [], { type: 'none' }, { type: 'none' });
      const spec3 = serializeRequestSpec('DELETE', 'https://test.org/users/1', [], [], { type: 'none' }, { type: 'none' });

      const records = [
        createHistoryRecord({ request: spec1, timestamp: 1 }),
        createHistoryRecord({ request: spec2, timestamp: 2 }),
        createHistoryRecord({ request: spec3, timestamp: 3 }),
      ];

      expect(filterHistoryRecords(records, '')).toHaveLength(3);
      expect(filterHistoryRecords(records, 'users')).toHaveLength(2);
      expect(filterHistoryRecords(records, 'POST')).toHaveLength(1);
      expect(filterHistoryRecords(records, 'post')).toHaveLength(1);
      expect(filterHistoryRecords(records, 'nonexistent')).toHaveLength(0);
    });
  });
});
