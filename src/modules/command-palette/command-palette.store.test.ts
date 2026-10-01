/**
 * 命令面板状态与选项单元测试
 * 验证选项列表解析、Tabler 矢量图标配置及关键字模糊搜索功能
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCommandPaletteStore } from './command-palette.store';

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<Record<string, any>>('vue-i18n');
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, fallback?: string) => fallback ?? key,
    }),
  };
});

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<Record<string, any>>('vue-router');
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
    }),
  };
});

describe('Command Palette Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('provides action and external link options with defined icons', () => {
    const store = useCommandPaletteStore();
    store.searchPrompt = '';

    const results = store.filteredSearchResult;
    expect(results).toBeDefined();

    // Check random tool option
    store.searchPrompt = '随机';
    const actionResults = store.filteredSearchResult;
    const allOptions = Object.values(actionResults).flat();
    const randomOption = allOptions.find(opt => opt.name.includes('随机'));
    expect(randomOption).toBeDefined();
    expect(randomOption?.icon).toBeDefined();

    // Check theme toggle option
    store.searchPrompt = '明暗';
    const themeOption = Object.values(store.filteredSearchResult).flat().find(opt => opt.name.includes('明暗'));
    expect(themeOption).toBeDefined();
    expect(themeOption?.icon).toBeDefined();

    // Check GitHub option
    store.searchPrompt = 'GitHub';
    const githubOption = Object.values(store.filteredSearchResult).flat().find(opt => opt.name.includes('GitHub'));
    expect(githubOption).toBeDefined();
    expect(githubOption?.icon).toBeDefined();
  });
});
