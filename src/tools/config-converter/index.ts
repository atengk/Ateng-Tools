import { Adjustments } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.config-converter.title'),
  path: '/config-converter',
  description: translate('tools.config-converter.description'),
  keywords: [
    'config',
    'spring',
    'yaml',
    'properties',
    'env',
    'environment',
    'json',
    'docker',
    'kubernetes',
    'converter',
    'relaxed-binding',
  ],
  component: () => import('./config-converter.vue'),
  icon: Adjustments,
});
