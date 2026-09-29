/**
 * WebSocket 与 SSE 流式调试助手工具注册入口
 *
 * @author Ateng
 * @since 2026-09-28
 */

import { PlugConnected } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.websocket-and-sse-client.title'),
  path: '/websocket-and-sse-client',
  description: translate('tools.websocket-and-sse-client.description'),
  keywords: [
    'websocket',
    'ws',
    'wss',
    'sse',
    'server-sent-events',
    'stream',
    'socket',
    'client',
    'realtime',
    'heartbeat',
    'timeline',
  ],
  component: () => import('./websocket-and-sse-client.vue'),
  icon: PlugConnected,
});
