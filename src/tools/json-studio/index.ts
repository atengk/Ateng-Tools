/**
 * JSON Studio 工具声明与路由导出
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { Braces } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.json-studio.title'),
  path: '/json-studio',
  description: translate('tools.json-studio.description'),
  keywords: ['json', 'studio', 'viewer', 'prettify', 'format', 'minify', 'tree', 'jsonpath', 'repair'],
  component: () => import('./json-studio.vue'),
  icon: Braces,
});
