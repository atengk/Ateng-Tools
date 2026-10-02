/**
 * 规范化 Git 提交生成器元数据导出
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { GitCommit } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.conventional-commits-generator.title'),
  path: '/conventional-commits-generator',
  description: translate('tools.conventional-commits-generator.description'),
  keywords: [
    'git',
    'commit',
    'conventional',
    'commits',
    'generator',
    'feat',
    'fix',
    'changelog',
    'breaking',
    'scope',
    'angular',
  ],
  component: () => import('./conventional-commits-generator.vue'),
  icon: GitCommit,
  createdAt: new Date('2026-10-02'),
});
