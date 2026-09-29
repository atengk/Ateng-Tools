import { Table } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.table-converter.title'),
  path: '/table-converter',
  description: translate('tools.table-converter.description'),
  keywords: [
    'table',
    'sql',
    'insert',
    'excel',
    'tsv',
    'csv',
    'markdown',
    'json',
    'batch',
    'generator',
    'converter',
  ],
  component: () => import('./table-converter.vue'),
  icon: Table,
});
