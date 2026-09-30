import { Files } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.pdf-studio.title'),
  path: '/pdf-studio',
  description: translate('tools.pdf-studio.description'),
  keywords: ['pdf', 'studio', 'page', 'organize', 'reorder', 'rotate', 'delete', 'merge', '工坊', '编排', '页面', '排序', '旋转', '删页'],
  component: () => import('./pdf-studio.vue'),
  icon: Files,
  createdAt: new Date('2026-09-30'),
});
