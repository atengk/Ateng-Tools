import { Database } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.mybatis-sql-converter.title'),
  path: '/mybatis-sql-converter',
  description: translate('tools.mybatis-sql-converter.description'),
  keywords: [
    'mybatis',
    'mybatis-plus',
    'sql',
    'log',
    'converter',
    'restore',
    'parameters',
    'preparing',
    'database',
    'spring',
    'java',
  ],
  component: () => import('./mybatis-sql-converter.vue'),
  icon: Database,
});
