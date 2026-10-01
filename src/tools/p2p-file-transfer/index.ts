/**
 * P2P 局域网快传工具元数据声明与路由导出
 *
 * @author Ateng
 * @since 2026-10-01
 */

import { Devices } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.p2p-file-transfer.title'),
  path: '/p2p-file-transfer',
  description: translate('tools.p2p-file-transfer.description'),
  keywords: [
    'p2p',
    'webrtc',
    'transfer',
    'file',
    'share',
    'mobile',
    'airdrop',
    'qr',
    '局域网',
    '快传',
    '文件传输',
    '隔空投送',
    '跨设备',
  ],
  component: () => import('./p2p-file-transfer.vue'),
  icon: Devices,
  createdAt: new Date('2026-10-01'),
});
