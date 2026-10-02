/**
 * 随机决策转盘元数据导出
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { Rotate } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.decision-wheel.title'),
  path: '/decision-wheel',
  description: translate('tools.decision-wheel.description'),
  keywords: [
    'wheel',
    'decision',
    'random',
    'spin',
    'picker',
    'lottery',
    'food',
    'chouqian',
    'zhuanpan',
    'suiji',
    'juece',
  ],
  component: () => import('./decision-wheel.vue'),
  icon: Rotate,
  createdAt: new Date('2026-10-02'),
});
