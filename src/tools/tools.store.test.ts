/**
 * 针对工具核心状态管理与分类筛选逻辑的单元测试
 *
 * @author Ateng
 * @since 2026-09-29
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useToolStore } from './tools.store';

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<Record<string, any>>('vue-i18n');
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, fallback?: string) => fallback ?? key,
    }),
  };
});

vi.mock('./index', () => ({
  toolsWithCategory: [
    {
      name: 'MyBatis SQL Converter',
      path: '/mybatis-sql-converter',
      description: 'Restore SQL from logs',
      category: 'development',
      icon: {},
      isNew: true,
    },
    {
      name: 'JSON to Entity',
      path: '/json-to-entity',
      description: 'Convert JSON to POJO',
      category: 'development',
      icon: {},
      isNew: false,
    },
    {
      name: 'Color Converter',
      path: '/color-converter',
      description: 'Convert colors',
      category: 'converter',
      icon: {},
      isNew: false,
    },
    {
      name: 'PDF Signature Checker',
      path: '/pdf-signature-checker',
      description: 'Verify signatures',
      category: 'pdf',
      icon: {},
      isNew: false,
    },
  ],
}));

describe('tools.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('能够正常载入全量工具与领域分类，包含新增的 PDF 分类', () => {
    const store = useToolStore();
    expect(store.tools.length).toBe(4);
    expect(store.toolsByCategory.length).toBe(3);
    expect(store.newTools.length).toBe(1);
    expect(store.tools.some(t => t.path === '/pdf-signature-checker' && t.category === 'pdf')).toBe(true);
  });

  it('支持将工具加入与移出收藏，且状态同步', () => {
    const store = useToolStore();
    const targetTool = store.tools[0];

    expect(store.isToolFavorite({ tool: targetTool })).toBe(false);

    store.addToolToFavorites({ tool: targetTool });
    expect(store.isToolFavorite({ tool: targetTool })).toBe(true);
    expect(store.favoriteTools.some(t => t.name === targetTool.name)).toBe(true);

    store.removeToolFromFavorites({ tool: targetTool });
    expect(store.isToolFavorite({ tool: targetTool })).toBe(false);
    expect(store.favoriteTools.some(t => t.name === targetTool.name)).toBe(false);
  });

  it('支持重排更新常用收藏顺序', () => {
    const store = useToolStore();
    const toolA = store.tools[0];
    const toolB = store.tools[1];

    store.addToolToFavorites({ tool: toolA });
    store.addToolToFavorites({ tool: toolB });

    // 调整顺序为 [toolB, toolA]
    store.updateFavoriteTools([toolB, toolA]);
    expect(store.favoriteTools[0].path).toBe(toolB.path);
    expect(store.favoriteTools[1].path).toBe(toolA.path);
  });
});
