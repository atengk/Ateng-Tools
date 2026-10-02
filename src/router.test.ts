// @vitest-environment jsdom
/**
 * 全局路由与加载守卫单元测试
 * 验证 scrollBehavior 智能复位规则与 beforeEach/afterEach/onError 对 window.$loadingBar 的联动
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import router from './router';

describe('Global Router', () => {
  beforeEach(() => {
    window.$loadingBar = {
      start: vi.fn(),
      finish: vi.fn(),
      error: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scrollBehavior', () => {
    const scrollBehavior = router.options.scrollBehavior!;

    it('restores savedPosition when provided', () => {
      const savedPosition = { left: 0, top: 250 };
      const result = scrollBehavior({} as any, {} as any, savedPosition);
      expect(result).toEqual(savedPosition);
    });

    it('returns target anchor element when hash exists', () => {
      const to = { hash: '#section-usage' } as any;
      const result = scrollBehavior(to, {} as any, null);
      expect(result).toEqual({ el: '#section-usage', behavior: 'smooth' });
    });

    it('returns top 0 smooth by default for new navigation', () => {
      const result = scrollBehavior({} as any, {} as any, null);
      expect(result).toEqual({ top: 0, behavior: 'smooth' });
    });
  });

  describe('navigation guards loadingBar integration', () => {
    it('triggers loadingBar.start and loadingBar.finish during route navigation', async () => {
      await router.push('/');
      expect(window.$loadingBar?.start).toHaveBeenCalled();
      expect(window.$loadingBar?.finish).toHaveBeenCalled();
    });
  });
});
