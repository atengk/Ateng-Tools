import { DatabaseImport } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.sql-ddl-to-entity.title'),
  path: '/sql-ddl-to-entity',
  description: translate('tools.sql-ddl-to-entity.description'),
  keywords: [
    'sql',
    'ddl',
    'create table',
    'entity',
    'mybatis',
    'mybatis-plus',
    'java',
    'typescript',
    'interface',
    'database',
    'generator',
    'converter',
  ],
  component: () => import('./sql-ddl-to-entity.vue'),
  icon: DatabaseImport,
});
