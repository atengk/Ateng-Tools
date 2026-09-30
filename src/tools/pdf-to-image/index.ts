import { Photo } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.pdf-to-image.title'),
  path: '/pdf-to-image',
  description: translate('tools.pdf-to-image.description'),
  keywords: ['pdf', 'image', 'picture', 'png', 'jpeg', 'webp', 'zip', 'extract', '图片', '导出', '光栅化', '归档'],
  component: () => import('./pdf-to-image.vue'),
  icon: Photo,
  createdAt: new Date('2026-09-30'),
});
