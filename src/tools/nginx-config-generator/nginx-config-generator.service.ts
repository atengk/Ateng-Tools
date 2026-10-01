/**
 * Nginx 配置可视化生成器纯函数服务
 *
 * @author Ateng
 * @since 2026-10-01
 */
import type { NginxConfigOptions, NginxProxyRoute } from './nginx-config-generator.types';

/**
 * 默认推荐的 Nginx 基础配置模板参数
 */
export const DEFAULT_NGINX_OPTIONS: NginxConfigOptions = {
  serverName: 'example.com www.example.com',
  listenPort: 80,
  rootPath: '/var/www/html',
  indexFiles: 'index.html index.htm',

  enableSpa: true,
  spaFallback: '/index.html',

  enableSsl: false,
  sslPort: 443,
  sslCertPath: '/etc/nginx/ssl/example.com.crt',
  sslKeyPath: '/etc/nginx/ssl/example.com.key',
  sslRedirectHttp: true,
  enableHttp2: true,

  enableCors: false,
  corsOrigin: '*',
  corsMethods: 'GET, POST, OPTIONS, PUT, DELETE',
  corsHeaders: 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization',
  corsAllowCredentials: true,

  enableGzip: true,
  gzipMinLength: 1024,
  gzipTypes: 'text/plain text/css text/javascript application/javascript application/json application/xml image/svg+xml',
  enableStaticCache: true,
  cacheExpires: '30d',

  clientMaxBodySize: '50m',
  hideNginxVersion: true,

  proxyRoutes: [
    {
      id: 'route-api',
      path: '/api/',
      targetUrl: 'http://127.0.0.1:8080/',
      websocket: false,
      cors: true,
      stripPrefix: false,
    },
  ],
};

/**
 * 构建 CORS 跨域响应头配置片段
 *
 * @param origin 允许的源域
 * @param methods 允许的 HTTP 方法
 * @param headers 允许的请求标头
 * @param allowCredentials 是否允许携带认证凭据
 * @param indent 缩进空格字符串
 * @returns 格式化后的 Nginx CORS 指令字符串
 */
export function buildCorsSnippet(
  origin: string,
  methods: string,
  headers: string,
  allowCredentials: boolean,
  indent = '    ',
): string {
  const lines: string[] = [
    `${indent}# 跨域 CORS 响应头配置`,
    `${indent}add_header 'Access-Control-Allow-Origin' '${origin}' always;`,
    `${indent}add_header 'Access-Control-Allow-Methods' '${methods}' always;`,
    `${indent}add_header 'Access-Control-Allow-Headers' '${headers}' always;`,
    `${indent}add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;`,
  ];

  if (allowCredentials && origin !== '*') {
    lines.push(`${indent}add_header 'Access-Control-Allow-Credentials' 'true' always;`);
  }

  lines.push(
    `${indent}# 拦截并快速响应 OPTIONS 预检请求`,
    `${indent}if ($request_method = 'OPTIONS') {`,
    `${indent}    add_header 'Access-Control-Max-Age' 1728000;`,
    `${indent}    add_header 'Content-Type' 'text/plain; charset=utf-8';`,
    `${indent}    add_header 'Content-Length' 0;`,
    `${indent}    return 204;`,
    `${indent}}`,
  );

  return lines.join('\n');
}

/**
 * 构建单条反向代理 location 块配置
 *
 * @param route 反向代理规则
 * @param globalCors 全局 CORS 是否开启
 * @param options 全局配置
 * @returns location 块文本
 */
export function buildProxyLocation(
  route: NginxProxyRoute,
  options: NginxConfigOptions,
): string {
  const lines: string[] = [
    `    # 反向代理: ${route.path} -> ${route.targetUrl}`,
    `    location ${route.path} {`,
    `        proxy_pass ${route.targetUrl};`,
    '        proxy_set_header Host $host;',
    '        proxy_set_header X-Real-IP $remote_addr;',
    '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
    '        proxy_set_header X-Forwarded-Proto $scheme;',
    '        proxy_connect_timeout 60s;',
    '        proxy_read_timeout 60s;',
    '        proxy_send_timeout 60s;',
  ];

  // WebSocket 支持
  if (route.websocket) {
    lines.push(
      '        # WebSocket 长连接支持',
      '        proxy_http_version 1.1;',
      '        proxy_set_header Upgrade $http_upgrade;',
      '        proxy_set_header Connection "upgrade";',
    );
  }

  // 路由级 CORS 或全局 CORS
  if (route.cors || options.enableCors) {
    lines.push(
      buildCorsSnippet(
        options.corsOrigin,
        options.corsMethods,
        options.corsHeaders,
        options.corsAllowCredentials,
        '        ',
      ),
    );
  }

  lines.push('    }');
  return lines.join('\n');
}

/**
 * 依据参数实体生成完整规范的 Nginx 配置文件内容
 *
 * @param options 用户配置参数
 * @returns 格式化后的 nginx.conf 完整文本
 */
export function generateNginxConfig(options: NginxConfigOptions): string {
  const parts: string[] = [];

  // 1. 若开启 SSL 且启用了 HTTP 强推 HTTPS，生成前置端口 80 301 重定向 server 块
  if (options.enableSsl && options.sslRedirectHttp) {
    parts.push(
      '# ----------------------------------------------------',
      '# HTTP 80 端口强制重定向至 HTTPS 443',
      '# ----------------------------------------------------',
      'server {',
      '    listen 80;',
      '    listen [::]:80;',
      `    server_name ${options.serverName};`,
      '    return 301 https://$host$request_uri;',
      '}',
      '',
    );
  }

  // 2. 主服务 server 块
  parts.push(
    '# ----------------------------------------------------',
    `# 主服务配置: ${options.serverName}`,
    '# ----------------------------------------------------',
    'server {',
  );

  // 监听端口与 SSL / HTTP2
  if (options.enableSsl) {
    const http2Flag = options.enableHttp2 ? ' http2' : '';
    parts.push(
      `    listen ${options.sslPort} ssl${http2Flag};`,
      `    listen [::]:${options.sslPort} ssl${http2Flag};`,
    );
    if (!options.sslRedirectHttp) {
      parts.push(
        `    listen ${options.listenPort};`,
        `    listen [::]:${options.listenPort};`,
      );
    }
  } else {
    parts.push(
      `    listen ${options.listenPort};`,
      `    listen [::]:${options.listenPort};`,
    );
  }

  // 服务域名与静态站点根目录
  parts.push(
    `    server_name ${options.serverName};`,
    `    root ${options.rootPath};`,
    `    index ${options.indexFiles};`,
    `    client_max_body_size ${options.clientMaxBodySize};`,
  );

  // 隐藏版本号
  if (options.hideNginxVersion) {
    parts.push('    server_tokens off;');
  }

  // SSL 证书与安全协议套件
  if (options.enableSsl) {
    parts.push(
      '',
      '    # SSL 证书与安全协议套件',
      `    ssl_certificate ${options.sslCertPath};`,
      `    ssl_certificate_key ${options.sslKeyPath};`,
      '    ssl_protocols TLSv1.2 TLSv1.3;',
      '    ssl_ciphers HIGH:!aNULL:!MD5;',
      '    ssl_prefer_server_ciphers on;',
      '    ssl_session_cache shared:SSL:10m;',
      '    ssl_session_timeout 1d;',
    );
  }

  // Gzip 压缩模块
  if (options.enableGzip) {
    parts.push(
      '',
      '    # Gzip 静态资源压缩传输',
      '    gzip on;',
      '    gzip_vary on;',
      '    gzip_proxied any;',
      '    gzip_comp_level 6;',
      `    gzip_min_length ${options.gzipMinLength};`,
      `    gzip_types ${options.gzipTypes};`,
    );
  }

  // 全局 CORS 跨域配置 (如果开启)
  if (options.enableCors) {
    parts.push(
      '',
      buildCorsSnippet(
        options.corsOrigin,
        options.corsMethods,
        options.corsHeaders,
        options.corsAllowCredentials,
        '    ',
      ),
    );
  }

  // SPA 路由回退或默认 location /
  if (options.enableSpa) {
    parts.push(
      '',
      '    # 单页应用 (SPA) 路由支持 (支持 Vue Router / React History 模式)',
      '    location / {',
      `        try_files $uri $uri/ ${options.spaFallback};`,
      '    }',
    );
  }

  // 静态静态资源浏览器强缓存
  if (options.enableStaticCache) {
    parts.push(
      '',
      '    # 静态资源长期浏览器缓存',
      '    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {',
      `        expires ${options.cacheExpires};`,
      '        add_header Cache-Control "public, no-transform";',
      '        access_log off;',
      '    }',
    );
  }

  // 自定义反向代理规则列表
  if (options.proxyRoutes && options.proxyRoutes.length > 0) {
    parts.push('');
    for (const route of options.proxyRoutes) {
      parts.push(buildProxyLocation(route, options), '');
    }
  }

  // 错误页面处理
  parts.push(
    '    # 错误页面友好兜底',
    '    error_page 500 502 503 504 /50x.html;',
    '    location = /50x.html {',
    '        root /usr/share/nginx/html;',
    '    }',
    '}',
  );

  return parts.join('\n');
}
