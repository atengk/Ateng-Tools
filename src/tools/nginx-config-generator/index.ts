import { Server } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.nginx-config-generator.title'),
  path: '/nginx-config-generator',
  description: translate('tools.nginx-config-generator.description'),
  keywords: ['nginx', 'config', 'reverse-proxy', 'proxy_pass', 'cors', 'ssl', 'spa', 'gzip', 'conf', 'server', 'devops'],
  component: () => import('./nginx-config-generator.vue'),
  icon: Server,
  createdAt: new Date('2026-10-01'),
});
