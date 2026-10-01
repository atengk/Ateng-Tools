/**
 * 全局未捕获异常防御拦截器单元测试
 * 验证 setupErrorHandler 挂载以及 errorHandler 触发时的提示与日志拦截逻辑
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupErrorHandler } from './errorHandler';

describe('Global Error Handler', () => {
  let fakeApp: any;
  let consoleSpy: any;

  beforeEach(() => {
    fakeApp = {
      config: {},
    };
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.$message = {
      error: vi.fn(),
    } as any;
    window.$loadingBar = {
      error: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('installs errorHandler on Vue app instance', () => {
    setupErrorHandler(fakeApp);
    expect(typeof fakeApp.config.errorHandler).toBe('function');
  });

  it('triggers console.error, window.$message.error and window.$loadingBar.error on unhandled exception', () => {
    setupErrorHandler(fakeApp);
    const testError = new Error('Unexpected render crash');
    fakeApp.config.errorHandler(testError, null, 'render function');

    expect(consoleSpy).toHaveBeenCalledWith('[Global Defensive Guard]:', testError, 'render function');
    expect(window.$message?.error).toHaveBeenCalledWith('工具运行发生未预期异常，已为您隔离保护上下文', {
      keepAliveOnHover: true,
    });
    expect(window.$loadingBar?.error).toHaveBeenCalled();
  });

  it('safely tolerates missing window.$message and window.$loadingBar', () => {
    window.$message = undefined;
    window.$loadingBar = undefined;

    setupErrorHandler(fakeApp);
    expect(() => {
      fakeApp.config.errorHandler(new Error('Crash'), null, 'lifecycle hook');
    }).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
  });
});
