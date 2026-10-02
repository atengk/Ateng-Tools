/**
 * 证件照制作工坊 (ID Photo Maker) 元数据声明与路由导出
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { IdBadge } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.id-photo-maker.title', '证件照制作工坊'),
  path: '/id-photo-maker',
  description: translate(
    'tools.id-photo-maker.description',
    '纯客户端离线安全证件照制作工坊，支持国标与考试规格、合规构图网格、双轨抠图换底、冲印相纸拼版及目标文件大小精确压缩。',
  ),
  keywords: [
    'id-photo',
    'passport-photo',
    'photo-maker',
    'id-card',
    'portrait',
    'matting',
    'print-layout',
    'compress',
    '证件照',
    '一寸照',
    '二寸照',
    '护照照',
    '换底色',
    '冲印排版',
    '照片压缩',
  ],
  component: () => import('./id-photo-maker.vue'),
  icon: IdBadge,
  createdAt: new Date('2026-10-02'),
});
