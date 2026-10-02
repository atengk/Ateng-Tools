/**
 * 中国居民身份证透视器元数据导出
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { Id } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.chinese-id-card-inspector.title'),
  path: '/chinese-id-card-inspector',
  description: translate('tools.chinese-id-card-inspector.description'),
  keywords: [
    'id',
    'idcard',
    'citizen',
    'chinese',
    'shenfenzheng',
    'inspector',
    'validator',
    'checksum',
    'mod11-2',
    'desensitize',
    'mask',
    'mock',
    'gender',
    'zodiac',
  ],
  component: () => import('./chinese-id-card-inspector.vue'),
  icon: Id,
  createdAt: new Date('2026-10-02'),
});
