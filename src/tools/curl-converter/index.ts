import { Terminal2 } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.curl-converter.title'),
  path: '/curl-converter',
  description: translate('tools.curl-converter.description'),
  keywords: [
    'curl',
    'http',
    'converter',
    'axios',
    'fetch',
    'java',
    'httpclient',
    'request',
    'api',
    'bash',
    'inspector',
  ],
  component: () => import('./curl-converter.vue'),
  icon: Terminal2,
});
