/**
 * 分类本地化与多语言标题处理 Composable
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { useI18n } from 'vue-i18n';
import type { ToolCategoryKey } from '@/tools/tools.types';

export function useCategory() {
  const { t, te } = useI18n();

  /**
   * 获取工具分类的本地化显示标题
   *
   * @param categoryName 原始分类名称（英文、大写、枚举 Key 或别名）
   * @returns 深度本地化的中文/英文展示文本
   */
  function getCategoryTitle(categoryName?: ToolCategoryKey | string): string {
    if (!categoryName) {
      return '';
    }

    const trimmed = categoryName.trim();
    if (trimmed.toLowerCase() === 'all') {
      return t('home.filter.all', '全部工具');
    }

    // 匹配如 'favorite-tools'、'crypto'、'development'、'images and videos'
    const key = trimmed.toLowerCase();
    const i18nKey = `tools.categories.${key}`;

    if (te(i18nKey)) {
      return t(i18nKey);
    }

    return trimmed;
  }

  return {
    getCategoryTitle,
  };
}
