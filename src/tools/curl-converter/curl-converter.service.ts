import type {
  CurlAuthInfo,
  KeyValuePair,
  ParsedCurlRequest,
} from './curl-converter.models';

/**
 * 将命令行字符串按 Bash 语法规则切分为 Token 数组
 * 兼容单引号、双引号、转义字符以及跨行换行符
 * @param command 原始命令行字符串
 * @returns 参数 Token 列表
 */
export function tokenizeBash(command: string): string[] {
  // 1. 预处理：替换反斜杠换行和 Windows 命令行续行符
  const cleaned = command
    .replace(/\\\r?\n/g, ' ')
    .replace(/\^\r?\n/g, ' ')
    .trim();

  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escapeNext = false;

  // 2. 逐字符状态机分词
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      escapeNext = true;
      continue;
    }

    if (char === '\'' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * 解析 cURL 命令行字符串为结构化请求对象
 * @param curlCommand cURL 命令
 * @returns ParsedCurlRequest
 */
export function parseCurlCommand(curlCommand: string): ParsedCurlRequest {
  const tokens = tokenizeBash(curlCommand);

  let method = '';
  let url = '';
  const headers: Record<string, string> = {};
  const headersList: KeyValuePair[] = [];
  const bodyChunks: string[] = [];
  let basicAuthStr: string | null = null;

  // 1. 遍历 Token 并根据标志位提取各个组件
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // 跳过开头的 'curl'
    if (i === 0 && token.toLowerCase() === 'curl') {
      continue;
    }

    // -X / --request
    if (token === '-X' || token === '--request') {
      if (i + 1 < tokens.length) {
        method = tokens[++i].toUpperCase();
      }
      continue;
    }

    // -H / --header
    if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerLine = tokens[++i];
        const separatorIndex = headerLine.indexOf(':');
        if (separatorIndex > 0) {
          const key = headerLine.slice(0, separatorIndex).trim();
          const value = headerLine.slice(separatorIndex + 1).trim();
          headers[key.toLowerCase()] = value;
          headersList.push({ key, value });
        }
      }
      continue;
    }

    // -d / --data / --data-raw / --data-binary / --data-urlencode
    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-urlencode'
    ) {
      if (i + 1 < tokens.length) {
        bodyChunks.push(tokens[++i]);
      }
      continue;
    }

    // -u / --user
    if (token === '-u' || token === '--user') {
      if (i + 1 < tokens.length) {
        basicAuthStr = tokens[++i];
      }
      continue;
    }

    // -A / --user-agent
    if (token === '-A' || token === '--user-agent') {
      if (i + 1 < tokens.length) {
        const ua = tokens[++i];
        headers['user-agent'] = ua;
        headersList.push({ key: 'User-Agent', value: ua });
      }
      continue;
    }

    // --url
    if (token === '--url') {
      if (i + 1 < tokens.length) {
        url = tokens[++i];
      }
      continue;
    }

    // 默认位置参数即为 URL
    if (!token.startsWith('-') && !url) {
      url = token;
    }
  }

  // 2. 默认方法推断：若无显式方法且有 body 数据，默认 POST，否则 GET
  const combinedBody = bodyChunks.length > 0 ? bodyChunks.join('&') : null;
  if (!method) {
    method = combinedBody !== null ? 'POST' : 'GET';
  }

  // 3. 解析 URL 与 Query 参数
  let baseUrl = url;
  const queryParams: KeyValuePair[] = [];
  if (url) {
    try {
      // 保证协议完整以便利用 URL API 解析
      const fullUrl = url.includes('://') ? url : `http://${url}`;
      const urlObj = new URL(fullUrl);
      baseUrl = `${urlObj.origin}${urlObj.pathname}`;
      urlObj.searchParams.forEach((value, key) => {
        queryParams.push({ key, value });
      });
    } catch {
      // 容错降级
      baseUrl = url.split('?')[0];
    }
  }

  // 4. 解析认证信息
  const auth: CurlAuthInfo = { type: 'none' };
  if (basicAuthStr) {
    const [u, ...p] = basicAuthStr.split(':');
    auth.type = 'basic';
    auth.username = u;
    auth.password = p.join(':');
  } else if (headers['authorization']) {
    const authVal = headers['authorization'];
    if (authVal.toLowerCase().startsWith('bearer ')) {
      auth.type = 'bearer';
      auth.token = authVal.slice(7).trim();
    } else if (authVal.toLowerCase().startsWith('basic ')) {
      auth.type = 'basic';
    }
  }

  // 5. 推断 Body 格式
  let bodyType: 'json' | 'form' | 'raw' | 'none' = 'none';
  if (combinedBody !== null) {
    try {
      JSON.parse(combinedBody);
      bodyType = 'json';
    } catch {
      if (combinedBody.includes('=') && !combinedBody.includes('\n')) {
        bodyType = 'form';
      } else {
        bodyType = 'raw';
      }
    }
  }

  return {
    method,
    url: url || 'https://api.example.com',
    baseUrl: baseUrl || 'https://api.example.com',
    queryParams,
    headers,
    headersList,
    body: combinedBody,
    bodyType,
    auth,
  };
}

/**
 * 生成 JavaScript Axios 代码
 */
export function generateAxiosCode(req: ParsedCurlRequest): string {
  const lines: string[] = ["import axios from 'axios';", ''];

  lines.push('const options = {');
  lines.push(`  method: '${req.method}',`);
  lines.push(`  url: '${req.url}',`);

  // Headers
  if (req.headersList.length > 0 || req.auth.type === 'basic') {
    lines.push('  headers: {');
    for (const { key, value } of req.headersList) {
      lines.push(`    '${key}': '${value}',`);
    }
    lines.push('  },');
  }

  // Basic Auth (Axios 原生支持 auth 对象)
  if (req.auth.type === 'basic' && req.auth.username) {
    lines.push('  auth: {');
    lines.push(`    username: '${req.auth.username}',`);
    lines.push(`    password: '${req.auth.password || ''}',`);
    lines.push('  },');
  }

  // Data Body
  if (req.body) {
    if (req.bodyType === 'json') {
      try {
        const formattedJson = JSON.stringify(JSON.parse(req.body), null, 4);
        lines.push(`  data: ${formattedJson},`);
      } catch {
        lines.push(`  data: '${req.body}',`);
      }
    } else {
      lines.push(`  data: '${req.body}',`);
    }
  }

  lines.push('};');
  lines.push('');
  lines.push('try {');
  lines.push('  const response = await axios.request(options);');
  lines.push('  console.log(response.data);');
  lines.push('} catch (error) {');
  lines.push('  console.error(error);');
  lines.push('}');

  return lines.join('\n');
}

/**
 * 生成原生 Fetch 代码
 */
export function generateFetchCode(req: ParsedCurlRequest): string {
  const lines: string[] = [];

  lines.push(`const url = '${req.url}';`);
  lines.push('const options = {');
  lines.push(`  method: '${req.method}',`);

  // Headers (包含 Basic Auth 编码)
  const headerPairs = [...req.headersList];
  if (req.auth.type === 'basic' && req.auth.username && !headerPairs.some(h => h.key.toLowerCase() === 'authorization')) {
    const basicToken = typeof btoa !== 'undefined'
      ? btoa(`${req.auth.username}:${req.auth.password || ''}`)
      : Buffer.from(`${req.auth.username}:${req.auth.password || ''}`).toString('base64');
    headerPairs.push({ key: 'Authorization', value: `Basic ${basicToken}` });
  }

  if (headerPairs.length > 0) {
    lines.push('  headers: {');
    for (const { key, value } of headerPairs) {
      lines.push(`    '${key}': '${value}',`);
    }
    lines.push('  },');
  }

  // Body
  if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
    if (req.bodyType === 'json') {
      try {
        const formattedJson = JSON.stringify(JSON.parse(req.body), null, 4);
        lines.push(`  body: JSON.stringify(${formattedJson}),`);
      } catch {
        lines.push(`  body: '${req.body}',`);
      }
    } else {
      lines.push(`  body: '${req.body}',`);
    }
  }

  lines.push('};');
  lines.push('');
  lines.push('try {');
  lines.push('  const response = await fetch(url, options);');
  lines.push('  if (!response.ok) {');
  lines.push('    throw new Error(`HTTP error! status: ${response.status}`);');
  lines.push('  }');
  lines.push('  const data = await response.json();');
  lines.push('  console.log(data);');
  lines.push('} catch (error) {');
  lines.push('  console.error(error);');
  lines.push('}');

  return lines.join('\n');
}

/**
 * 生成 Java 11/21 HttpClient 代码
 */
export function generateJavaHttpClientCode(req: ParsedCurlRequest): string {
  const lines: string[] = [
    'import java.io.IOException;',
    'import java.net.URI;',
    'import java.net.http.HttpClient;',
    'import java.net.http.HttpRequest;',
    'import java.net.http.HttpResponse;',
    'import java.time.Duration;',
    'import java.util.Base64;',
    '',
    'public class ApiClient {',
    '    public static void main(String[] args) throws IOException, InterruptedException {',
    '        HttpClient client = HttpClient.newBuilder()',
    '                .connectTimeout(Duration.ofSeconds(10))',
    '                .build();',
    '',
    '        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()',
    `                .uri(URI.create("${req.url}"))`,
    '                .timeout(Duration.ofSeconds(10));',
  ];

  // Headers (包含 Basic Auth)
  const headerPairs = [...req.headersList];
  if (req.auth.type === 'basic' && req.auth.username && !headerPairs.some(h => h.key.toLowerCase() === 'authorization')) {
    const basicStr = `${req.auth.username}:${req.auth.password || ''}`;
    lines.push(`        String authHeader = "Basic " + Base64.getEncoder().encodeToString("${basicStr}".getBytes());`);
    lines.push('        requestBuilder.header("Authorization", authHeader);');
  }

  for (const { key, value } of headerPairs) {
    const escapedVal = value.replace(/"/g, '\\"');
    lines.push(`        requestBuilder.header("${key}", "${escapedVal}");`);
  }

  // Method & Body
  if (req.method === 'GET') {
    lines.push('        requestBuilder.GET();');
  } else if (req.body) {
    const escapedBody = req.body.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    lines.push(`        requestBuilder.method("${req.method}", HttpRequest.BodyPublishers.ofString("${escapedBody}"));`);
  } else {
    lines.push(`        requestBuilder.method("${req.method}", HttpRequest.BodyPublishers.noBody());`);
  }

  lines.push('');
  lines.push('        HttpRequest request = requestBuilder.build();');
  lines.push('        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());');
  lines.push('        System.out.println("Status Code: " + response.statusCode());');
  lines.push('        System.out.println("Response Body: " + response.body());');
  lines.push('    }');
  lines.push('}');

  return lines.join('\n');
}
