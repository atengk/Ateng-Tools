/**
 * 分类本地化 Composable 单元测试
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { describe, expect, it, vi } from 'vitest';
import { useCategory } from './category';

const mockDict: Record<string, string> = {
  'home.filter.all': '全部工具',
  'tools.categories.development': '开发',
  'tools.categories.crypto': '加密',
  'tools.categories.images and videos': '图片和视频',
  'tools.categories.favorite-tools': '我的收藏',
};

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, def?: string) => mockDict[key] ?? def ?? key,
    te: (key: string) => key in mockDict,
  }),
}));

describe('useCategory', () => {
  const { getCategoryTitle } = useCategory();

  it('应该正确将 all 识别为全部工具', () => {
    expect(getCategoryTitle('all')).toBe('全部工具');
    expect(getCategoryTitle('All')).toBe('全部工具');
  });

  it('应该正确转换英文分类名称为本地化中文', () => {
    expect(getCategoryTitle('Development')).toBe('开发');
    expect(getCategoryTitle('Crypto')).toBe('加密');
    expect(getCategoryTitle('Images and videos')).toBe('图片和视频');
  });

  it('应该支持常用收藏标识的转换', () => {
    expect(getCategoryTitle('favorite-tools')).toBe('我的收藏');
  });

  it('未收录的未知分类应安全降级返回原始字符', () => {
    expect(getCategoryTitle('Unknown Category')).toBe('Unknown Category');
  });

  it('空入参应安全返回空字符串', () => {
    expect(getCategoryTitle(undefined)).toBe('');
    expect(getCategoryTitle('')).toBe('');
  });
});
