import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';
import FileDocumentOutlineIcon from '~icons/mdi/file-document-outline';

export const tool = defineTool({
  name: translate('tools.pdf-text-extractor.title'),
  path: '/pdf-text-extractor',
  description: translate('tools.pdf-text-extractor.description'),
  keywords: ['pdf', 'text', 'extractor', 'metadata', '文本', '提取', '元数据', '信息', '复制'],
  component: () => import('./pdf-text-extractor.vue'),
  icon: FileDocumentOutlineIcon,
  createdAt: new Date('2026-09-30'),
});
