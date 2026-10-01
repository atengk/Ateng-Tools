import { Database } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.mock-data-generator.title'),
  path: '/mock-data-generator',
  description: translate('tools.mock-data-generator.description'),
  keywords: ['mock', 'data', 'fake', 'random', 'faker', 'generator', 'sql', 'json', 'csv', 'table', 'database', 'developer'],
  component: () => import('./mock-data-generator.vue'),
  icon: Database,
  createdAt: new Date('2026-10-01'),
});
