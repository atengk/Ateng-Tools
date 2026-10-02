/**
 * HTTP 客户端工具注册入口
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { Send } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.http-client.title'),
  path: '/http-client',
  description: translate('tools.http-client.description'),
  keywords: [
    'http',
    'client',
    'postman',
    'api',
    'rest',
    'request',
    'fetch',
    'debug',
    'curl',
  ],
  component: () => import('./http-client.vue'),
  icon: Send,
});
