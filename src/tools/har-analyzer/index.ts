import { World } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.har-analyzer.title'),
  path: '/har-analyzer',
  description: translate('tools.har-analyzer.description'),
  keywords: ['har', 'network', 'http', 'devtools', 'log', 'analyzer', 'waterfall', 'gantt', 'traffic', 'chrome', 'request'],
  component: () => import('./har-analyzer.vue'),
  icon: World,
  createdAt: new Date('2026-10-01'),
});
