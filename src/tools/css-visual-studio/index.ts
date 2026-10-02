/**
 * CSS 视觉工坊元数据导出
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { Palette } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.css-visual-studio.title'),
  path: '/css-visual-studio',
  description: translate('tools.css-visual-studio.description'),
  keywords: [
    'css',
    'style',
    'shadow',
    'box-shadow',
    'glassmorphism',
    'blur',
    'border-radius',
    'fluid',
    'clamp',
    'typography',
    'rem',
    'vw',
    'visual',
    'generator',
  ],
  component: () => import('./css-visual-studio.vue'),
  icon: Palette,
  createdAt: new Date('2026-10-02'),
});
