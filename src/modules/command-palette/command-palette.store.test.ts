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

  it('2. 空输入时展示常用推荐小工具与快捷操作，并生成 flatOptions 扁平列表', () => {
    const store = useCommandPaletteStore();
    store.searchPrompt = '';

    expect(store.flatOptions.length).toBeGreaterThan(0);
    const hasActions = store.flatOptions.some(opt => opt.category === '快捷操作');
    expect(hasActions).toBe(true);
  });

  it('3. 输入拼音首字母 (如 ewm) 能够精准匹配到工具并附带匹配线索', () => {
    const store = useCommandPaletteStore();
    store.searchPrompt = 'ewm';

    const results = store.filteredSearchResult;
    const tools = results['小工具'] ?? [];
    const qrTool = tools.find(t => t.name.includes('二维码') || t.id?.includes('qr'));
    expect(qrTool).toBeDefined();
    expect(qrTool?.matchCueType).toBe('pinyin');
  });
});
