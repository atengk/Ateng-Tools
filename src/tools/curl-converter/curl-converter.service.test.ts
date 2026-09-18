import { describe, expect, it } from 'vitest';
import {
  generateAxiosCode,
  generateFetchCode,
  generateJavaHttpClientCode,
  parseCurlCommand,
} from './curl-converter.service';

describe('cURL Converter Service', () => {
  it('1. should parse basic GET command with query parameters', () => {
    const curl = `curl "https://api.example.com/users?page=1&size=20" -H "Accept: application/json"`;
    const parsed = parseCurlCommand(curl);

    expect(parsed.method).toBe('GET');
    expect(parsed.baseUrl).toBe('https://api.example.com/users');
    expect(parsed.queryParams).toEqual([
      { key: 'page', value: '1' },
      { key: 'size', value: '20' },
    ]);
    expect(parsed.headers['accept']).toBe('application/json');
    expect(parsed.body).toBeNull();
  });

  it('2. should parse multiline POST command with JSON payload and auth header', () => {
    const curl = `curl 'https://api.example.com/v1/orders' \\
      -X POST \\
      -H 'Content-Type: application/json' \\
      -H 'Authorization: Bearer token123456' \\
      --data-raw '{"productId": 1001, "quantity": 2}'`;

    const parsed = parseCurlCommand(curl);

    expect(parsed.method).toBe('POST');
    expect(parsed.url).toBe('https://api.example.com/v1/orders');
    expect(parsed.headers['content-type']).toBe('application/json');
    expect(parsed.auth.type).toBe('bearer');
    expect(parsed.auth.token).toBe('token123456');
    expect(parsed.bodyType).toBe('json');
    expect(JSON.parse(parsed.body!)).toEqual({ productId: 1001, quantity: 2 });
  });

  it('3. should support Basic Auth with -u option', () => {
    const curl = `curl -u "admin:secret888" https://api.example.com/admin/status`;
    const parsed = parseCurlCommand(curl);

    expect(parsed.auth.type).toBe('basic');
    expect(parsed.auth.username).toBe('admin');
    expect(parsed.auth.password).toBe('secret888');
  });

  it('4. should generate clean Axios request code', () => {
    const curl = `curl -X POST "https://api.example.com/items" -H "Content-Type: application/json" -d '{"name":"test"}'`;
    const parsed = parseCurlCommand(curl);
    const code = generateAxiosCode(parsed);

    expect(code).toContain("import axios from 'axios';");
    expect(code).toContain("method: 'POST'");
    expect(code).toContain("'https://api.example.com/items'");
    expect(code).toContain("'Content-Type': 'application/json'");
  });

  it('5. should generate native Fetch code', () => {
    const curl = `curl "https://api.example.com/items" -H "X-Custom: header123"`;
    const parsed = parseCurlCommand(curl);
    const code = generateFetchCode(parsed);

    expect(code).toContain("const url = 'https://api.example.com/items';");
    expect(code).toContain('fetch(url, options)');
    expect(code).toContain("method: 'GET'");
    expect(code).toContain("'X-Custom': 'header123'");
  });

  it('6. should generate standard Java 11/21 HttpClient code', () => {
    const curl = `curl -X POST "https://api.example.com/login" -H "Content-Type: application/json" -d '{"user":"admin"}'`;
    const parsed = parseCurlCommand(curl);
    const code = generateJavaHttpClientCode(parsed);

    expect(code).toContain('import java.net.http.HttpClient;');
    expect(code).toContain('import java.net.http.HttpRequest;');
    expect(code).toContain('HttpRequest.newBuilder()');
    expect(code).toContain('URI.create("https://api.example.com/login")');
    expect(code).toContain('HttpRequest.BodyPublishers.ofString(');
  });
});
