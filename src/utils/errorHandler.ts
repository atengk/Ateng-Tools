/**
 * 全局未捕获异常防御拦截器 (Defensive Error Interception)
 * 统一捕获 Vue 运行时未受控错误，提供友好的中文轻提示与控制台诊断日志，
 * 阻断局部异常导致的白屏崩溃，同时坚守纯客户端离线隐私安全（严禁外部上报）。
 *
 * @author Ateng
 * @since 2026-10-01
 */
import type { App } from 'vue';

export function setupErrorHandler(app: App) {
  app.config.errorHandler = (err: unknown, instance, info: string) => {
    console.error('[Global Defensive Guard]:', err, info);

    if (window.$message) {
      window.$message.error('工具运行发生未预期异常，已为您隔离保护上下文', {
        keepAliveOnHover: true,
      });
    }

    if (window.$loadingBar) {
      window.$loadingBar.error();
    }
  };
}
