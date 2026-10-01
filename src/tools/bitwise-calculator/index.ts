/**
 * 位运算与字节透视计算器元数据声明
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { Binary } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.bitwise-calculator.title'),
  path: '/bitwise-calculator',
  description: translate('tools.bitwise-calculator.description'),
  keywords: [
    'bitwise',
    'calculator',
    'binary',
    'hex',
    'octal',
    'decimal',
    'and',
    'or',
    'xor',
    'not',
    'shift',
    'byte',
    'bitfield',
    'mask',
  ],
  component: () => import('./bitwise-calculator.vue'),
  icon: Binary,
  createdAt: new Date('2026-10-01'),
});
