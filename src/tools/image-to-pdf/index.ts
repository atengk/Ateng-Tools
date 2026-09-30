import { Photo } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.image-to-pdf.title'),
  path: '/image-to-pdf',
  description: translate('tools.image-to-pdf.description'),
  keywords: ['image', 'picture', 'pdf', 'convert', 'merge', 'photo', '图片', '照片', '转换', '合成', '相册'],
  component: () => import('./image-to-pdf.vue'),
  icon: Photo,
  createdAt: new Date('2026-09-30'),
});
