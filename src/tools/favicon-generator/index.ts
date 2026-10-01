/**
 * Favicon 网站图标生成器工具定义
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { AppWindow } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.favicon-generator.title'),
  path: '/favicon-generator',
  description: translate('tools.favicon-generator.description'),
  keywords: ['favicon', 'ico', 'icon', 'apple-touch-icon', 'manifest', 'pwa', '网站图标', '图标生成器'],
  component: () => import('./favicon-generator.vue'),
  icon: AppWindow,
});
