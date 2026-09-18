import { Binary } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.snowflake-id-analyzer.title'),
  path: '/snowflake-id-analyzer',
  description: translate('tools.snowflake-id-analyzer.description'),
  keywords: [
    'snowflake',
    'id',
    'twitter',
    'leaf',
    'uid',
    'distributed',
    '64bit',
    'analyzer',
    'generator',
    'timestamp',
    'worker',
    'datacenter',
  ],
  component: () => import('./snowflake-id-analyzer.vue'),
  icon: Binary,
});
