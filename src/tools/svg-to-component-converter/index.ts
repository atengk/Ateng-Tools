/**
 * SVG 优化与组件转换器元数据导出
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { FileCode } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.svg-to-component-converter.title'),
  path: '/svg-to-component-converter',
  description: translate('tools.svg-to-component-converter.description'),
  keywords: [
    'svg',
    'component',
    'vue',
    'vue3',
    'react',
    'jsx',
    'tsx',
    'icon',
    'optimize',
    'clean',
    'datauri',
    'vector',
    'sanitize',
    'zhuanhuan',
    'zujian',
  ],
  component: () => import('./svg-to-component-converter.vue'),
  icon: FileCode,
  createdAt: new Date('2026-10-02'),
});
