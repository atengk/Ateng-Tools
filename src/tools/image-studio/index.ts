/**
 * Image Studio (图片处理工作台) 工具声明与路由导出
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { Photo } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.image-studio.title', '图片处理工作台'),
  path: '/image-studio',
  description: translate(
    'tools.image-studio.description',
    '全能纯客户端图片处理工作台，支持格式转换、自由/等比缩放、画质压缩、SVG 光栅化与剪贴板一键粘贴。',
  ),
  keywords: [
    'image',
    'photo',
    'studio',
    'resize',
    'compress',
    'convert',
    'webp',
    'png',
    'jpg',
    'svg',
    '图片处理',
    '图片缩放',
    '图片压缩',
    '格式转换',
    '工作台',
  ],
  component: () => import('./image-studio.vue'),
  icon: Photo,
  createdAt: new Date('2026-09-30'),
});
