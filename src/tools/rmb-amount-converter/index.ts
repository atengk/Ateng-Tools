/**
 * 人民币大写金额转换器元数据导出
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { CurrencyYen } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.rmb-amount-converter.title'),
  path: '/rmb-amount-converter',
  description: translate('tools.rmb-amount-converter.description'),
  keywords: [
    'rmb',
    'cny',
    'amount',
    'capital',
    'financial',
    'chinese',
    'converter',
    'currency',
    'invoice',
    'receipt',
    'money',
    'daxie',
    'renminbi',
    'jine',
  ],
  component: () => import('./rmb-amount-converter.vue'),
  icon: CurrencyYen,
  createdAt: new Date('2026-10-02'),
});
