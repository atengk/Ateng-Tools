/**
 * 万能物理单位换算器元数据导出
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { Ruler } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.unit-converter.title'),
  path: '/unit-converter',
  description: translate('tools.unit-converter.description'),
  keywords: [
    'unit',
    'converter',
    'dimension',
    'length',
    'weight',
    'mass',
    'area',
    'volume',
    'speed',
    'velocity',
    'pressure',
    'power',
    'energy',
    'metric',
    'imperial',
    'chinese',
    'huansuan',
    'danwei',
  ],
  component: () => import('./unit-converter.vue'),
  icon: Ruler,
  createdAt: new Date('2026-10-02'),
});
