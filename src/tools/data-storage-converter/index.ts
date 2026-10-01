/**
 * 数据存储与网络速率换算器元数据声明
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { DeviceFloppy } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.data-storage-converter.title'),
  path: '/data-storage-converter',
  description: translate('tools.data-storage-converter.description'),
  keywords: [
    'data',
    'storage',
    'bandwidth',
    'converter',
    'bytes',
    'kb',
    'mb',
    'gb',
    'tb',
    'kib',
    'mib',
    'gib',
    'mbps',
    'download',
    'speed',
    'transfer',
    'time',
  ],
  component: () => import('./data-storage-converter.vue'),
  icon: DeviceFloppy,
  createdAt: new Date('2026-10-01'),
});
