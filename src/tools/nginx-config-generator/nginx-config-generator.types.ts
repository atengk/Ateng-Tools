/**
 * Nginx 配置可视化生成器类型契约
 *
 * @author Ateng
 * @since 2026-10-01
 */

/** 反向代理 location 路由规则配置 */
export interface NginxProxyRoute {
  id: string;
  path: string; // 如 /api/
  targetUrl: string; // 如 http://127.0.0.1:8080/
  websocket: boolean;
  cors: boolean;
  stripPrefix: boolean;
}

/** Nginx 服务器块核心配置参数 */
export interface NginxConfigOptions {
  // 基础服务器配置
  serverName: string;
  listenPort: number;
  rootPath: string;
  indexFiles: string;

  // SPA 路由配置
  enableSpa: boolean;
  spaFallback: string; // 默认 /index.html

  // SSL/HTTPS 配置
  enableSsl: boolean;
  sslPort: number;
  sslCertPath: string;
  sslKeyPath: string;
  sslRedirectHttp: boolean;
  enableHttp2: boolean;

  // 跨域 CORS 全局/默认配置
  enableCors: boolean;
  corsOrigin: string; // * 或自定义
  corsMethods: string;
  corsHeaders: string;
  corsAllowCredentials: boolean;

  // 性能与静态资源优化
  enableGzip: boolean;
  gzipMinLength: number;
  gzipTypes: string;
  enableStaticCache: boolean;
  cacheExpires: string; // 如 30d

  // 安全与请求限制
  clientMaxBodySize: string; // 如 50m
  hideNginxVersion: boolean;

  // 多反向代理路由列表
  proxyRoutes: NginxProxyRoute[];
}
