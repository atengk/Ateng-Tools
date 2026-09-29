import { defineStore } from 'pinia';
import _ from 'lodash';
import type { PaletteOption } from './command-palette.types';
import { useToolStore } from '@/tools/tools.store';
import { useFuzzySearch } from '@/composable/fuzzySearch';
import { useStyleStore } from '@/stores/style.store';

import SunIcon from '~icons/mdi/white-balance-sunny';
import GithubIcon from '~icons/mdi/github';
import BugIcon from '~icons/mdi/bug-outline';
import DiceIcon from '~icons/mdi/dice-5';
import InfoIcon from '~icons/mdi/information-outline';

export const useCommandPaletteStore = defineStore('command-palette', () => {
  const toolStore = useToolStore();
  const styleStore = useStyleStore();
  const router = useRouter();
  const searchPrompt = ref('');

  const toolsOptions = toolStore.tools.map(tool => ({
    ...tool,
    to: tool.path,
    toolCategory: tool.category,
    category: '工具',
  }));

  const searchOptions: PaletteOption[] = [
    ...toolsOptions,
    {
      name: '随机打开小工具 (Random tool)',
      description: '从工具库中随机挑选并打开一个小工具',
      action: () => {
        const { path } = _.sample(toolStore.tools)!;
        router.push(path);
      },
      icon: DiceIcon,
      category: '操作',
      keywords: ['random', 'tool', 'pick', 'choose', 'select', '随机', '手气不错', '随便选', '工具'],
      closeOnSelect: true,
    },
    {
      name: '切换明暗颜色模式 (Toggle dark mode)',
      description: '在浅色与深色主题外观之间切换',
      action: () => styleStore.toggleDark(),
      icon: SunIcon,
      category: '操作',
      keywords: ['dark', 'theme', 'toggle', 'mode', 'light', 'system', '暗黑', '深色', '浅色', '主题', '夜间', '日间', '模式'],
    },
    {
      name: 'GitHub 开源仓库 (Github repository)',
      href: 'https://github.com/atengk/Ateng-Tools',
      category: '外部链接',
      description: '前往 GitHub 查看 Ateng-Tools 源码与点亮 Star',
      keywords: ['github', 'repo', 'repository', 'source', 'code', '源码', '仓库', '开源', '主页'],
      icon: GithubIcon,
    },
    {
      name: '提交反馈与建议 (Report an issue)',
      description: '向 Ateng-Tools 提交 Issue、功能建议或缺陷反馈',
      href: 'https://github.com/atengk/Ateng-Tools/issues/new/choose',
      category: '外部链接',
      keywords: ['report', 'issue', 'bug', 'problem', 'error', '反馈', '报错', '建议', '问题', '提问'],
      icon: BugIcon,
    },
    {
      name: '关于 Ateng-Tools (About)',
      description: '了解 Ateng-Tools 的架构理念与开源致谢',
      to: '/about',
      category: '页面',
      keywords: ['about', 'learn', 'more', 'info', 'information', '关于', '介绍', '说明', '致谢'],
      icon: InfoIcon,
    },
  ];

  const { searchResult } = useFuzzySearch({
    search: searchPrompt,
    data: searchOptions,
    options: {
      keys: [{ name: 'name', weight: 2 }, 'description', 'keywords', 'category'],
      threshold: 0.3,
    },
  });

  const filteredSearchResult = computed(() =>
    _.chain(searchResult.value).groupBy('category').mapValues(categoryOptions => _.take(categoryOptions, 5)).value());

  return {
    filteredSearchResult,
    searchPrompt,
  };
});
