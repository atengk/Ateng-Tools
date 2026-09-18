import { Code } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.json-to-entity.title'),
  path: '/json-to-entity',
  description: translate('tools.json-to-entity.description'),
  keywords: [
    'json',
    'entity',
    'dto',
    'pojo',
    'java',
    'typescript',
    'interface',
    'class',
    'lombok',
    'jackson',
    'model',
    'converter',
    'generator',
  ],
  component: () => import('./json-to-entity.vue'),
  icon: Code,
});
