/**
 * 文件校验与哈希比对器工具定义
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { FileCheck } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.file-checksum.title'),
  path: '/file-checksum',
  description: translate('tools.file-checksum.description'),
  keywords: ['checksum', 'hash', 'md5', 'sha1', 'sha256', 'sha512', 'file', 'verify', '文件校验', '哈希比对'],
  component: () => import('./file-checksum.vue'),
  icon: FileCheck,
});
