/**
 * Nginx 配置可视化生成器单元测试
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NGINX_OPTIONS,
  buildCorsSnippet,
  buildProxyLocation,
  generateNginxConfig,
} from './nginx-config-generator.service';

describe('nginx-config-generator.service', () => {
  it('正确生成默认配置基础块', () => {
    const conf = generateNginxConfig(DEFAULT_NGINX_OPTIONS);

    expect(conf).toContain('listen 80;');
    expect(conf).toContain('server_name example.com www.example.com;');
    expect(conf).toContain('root /var/www/html;');
    expect(conf).toContain('try_files $uri $uri/ /index.html;');
    expect(conf).toContain('gzip on;');
    expect(conf).toContain('server_tokens off;');
  });

  it('开启 SSL 且强制重定向时生成前置 301 重定向 server 块', () => {
    const conf = generateNginxConfig({
      ...DEFAULT_NGINX_OPTIONS,
      enableSsl: true,
      sslRedirectHttp: true,
      sslPort: 443,
      enableHttp2: true,
    });

    expect(conf).toContain('return 301 https://$host$request_uri;');
    expect(conf).toContain('listen 443 ssl http2;');
    expect(conf).toContain('ssl_certificate /etc/nginx/ssl/example.com.crt;');
    expect(conf).toContain('ssl_protocols TLSv1.2 TLSv1.3;');
  });

  it('生成 CORS 预检与响应头代码片段', () => {
    const cors = buildCorsSnippet('*', 'GET, POST', 'Content-Type', false);

    expect(cors).toContain("add_header 'Access-Control-Allow-Origin' '*' always;");
    expect(cors).toContain("add_header 'Access-Control-Allow-Methods' 'GET, POST' always;");
    expect(cors).toContain("if ($request_method = 'OPTIONS')");
    expect(cors).toContain('return 204;');
  });

  it('支持 WebSocket 代理路由选项', () => {
    const proxy = buildProxyLocation(
      {
        id: 'ws-1',
        path: '/ws/',
        targetUrl: 'http://127.0.0.1:9000/',
        websocket: true,
        cors: false,
        stripPrefix: false,
      },
      DEFAULT_NGINX_OPTIONS,
    );

    expect(proxy).toContain('location /ws/ {');
    expect(proxy).toContain('proxy_pass http://127.0.0.1:9000/;');
    expect(proxy).toContain('proxy_http_version 1.1;');
    expect(proxy).toContain('proxy_set_header Upgrade $http_upgrade;');
    expect(proxy).toContain('proxy_set_header Connection "upgrade";');
  });

  it('支持关闭 Gzip 与静态缓存', () => {
    const conf = generateNginxConfig({
      ...DEFAULT_NGINX_OPTIONS,
      enableGzip: false,
      enableStaticCache: false,
      enableSpa: false,
    });

    expect(conf).not.toContain('gzip on;');
    expect(conf).not.toContain('expires 30d;');
    expect(conf).not.toContain('try_files $uri $uri/ /index.html;');
  });
});
