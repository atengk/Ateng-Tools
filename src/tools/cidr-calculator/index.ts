import { ArrowsJoin } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.cidr-calculator.title'),
  path: '/cidr-calculator',
  description: translate('tools.cidr-calculator.description'),
  keywords: ['cidr', 'supernetting', 'subnet', 'aggregate', 'network', 'route', 'summarization', 'overlap', 'ip'],
  component: () => import('./cidr-calculator.vue'),
  icon: ArrowsJoin,
  createdAt: new Date('2026-10-01'),
});
