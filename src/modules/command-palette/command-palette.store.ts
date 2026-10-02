/**
 * 全局命令面板状态与拼音检索服务
 *
 * @author Ateng
 * @since 2026-10-02
 */
import { defineStore } from 'pinia';
import _ from 'lodash';
import {
  BrandGithub as GithubIcon,
  Bug as BugIcon,
  Dice as DiceIcon,
  InfoCircle as InfoIcon,
  Sun as SunIcon,
} from '@vicons/tabler';
import Pinyin from 'pinyin-match';
import type { PaletteOption } from './command-palette.types';
import { useToolStore } from '@/tools/tools.store';
import { searchTools } from '@/composable/toolSearch';
import { useStyleStore } from '@/stores/style.store';

const DEFAULT_RECOMMENDED_PATHS = [
  '/json-studio',
  '/cron-simulator',
  '/qr-code-generator',
  '/base64-string-converter',
  '/jwt-parser',
  '/snowflake-id-analyzer',
  '/regex-tester',
  '/encryption',
];

export const useCommandPaletteStore = defineStore('command-palette', () => {
  const toolStore = useToolStore();
  const styleStore = useStyleStore();
  const router = useRouter();
  const searchPrompt = ref('');
  const { t } = useI18n();

  // 系统级内置指令与快捷操作
  const actionOptions = computed<PaletteOption[]>(() => [
    {
      id: 'random-tool',
      name: t('commandPalette.randomTool.name', '随机打开小工具'),
      description: t('commandPalette.randomTool.description', '从工具库中随机挑选并打开一个小工具'),
      action: () => {
        if (toolStore.tools.length > 0) {
          const randomTool = _.sample(toolStore.tools);
          if (randomTool?.path) {
            router.push(randomTool.path);
          }
        }
      },
      icon: DiceIcon,
      category: t('commandPalette.categories.actions', '快捷操作'),
      keywords: ['random', 'tool', 'pick', 'choose', 'select', '随机', '手气不错', '随便选', '工具', 'suiji', 'sj'],
      closeOnSelect: true,
    },
    {
      id: 'toggle-theme',
      name: t('commandPalette.toggleTheme.name', '切换明暗颜色模式'),
      description: t('commandPalette.toggleTheme.description', '在浅色与深色主题外观之间即时切换'),
      action: () => styleStore.toggleDark(),
      icon: SunIcon,
      category: t('commandPalette.categories.actions', '快捷操作'),
      keywords: ['dark', 'theme', 'toggle', 'mode', 'light', 'system', '暗黑', '深色', '浅色', '主题', '夜间', '日间', '模式', 'yanse', 'zhuti', 'mingan'],
      closeOnSelect: true,
    },
    {
      id: 'about-page',
      name: t('commandPalette.about.name', '关于 Ateng-Tools'),
      description: t('commandPalette.about.description', '了解 Ateng-Tools 的架构理念与开源致谢'),
      to: '/about',
      category: t('commandPalette.categories.pages', '系统页面'),
      keywords: ['about', 'learn', 'more', 'info', 'information', '关于', '介绍', '说明', '致谢', 'guanyu'],
      icon: InfoIcon,
      closeOnSelect: true,
    },
    {
      id: 'github-repo',
      name: t('commandPalette.github.name', 'GitHub 开源仓库'),
      description: t('commandPalette.github.description', '前往 GitHub 查看 Ateng-Tools 源码与点亮 Star'),
      href: 'https://github.com/atengk/Ateng-Tools',
      category: t('commandPalette.categories.externalLinks', '外部链接'),
      keywords: ['github', 'repo', 'repository', 'source', 'code', '源码', '仓库', '开源', '主页'],
      icon: GithubIcon,
      closeOnSelect: true,
    },
    {
      id: 'report-issue',
      name: t('commandPalette.reportIssue.name', '提交反馈与建议'),
      description: t('commandPalette.reportIssue.description', '向 Ateng-Tools 提交 Issue、功能建议或缺陷反馈'),
      href: 'https://github.com/atengk/Ateng-Tools/issues/new/choose',
      category: t('commandPalette.categories.externalLinks', '外部链接'),
      keywords: ['report', 'issue', 'bug', 'problem', 'error', '反馈', '报错', '建议', '问题', '提问', 'fankui', 'yijian'],
      icon: BugIcon,
      closeOnSelect: true,
    },
  ]);

  // 默认推荐工具列表 (优先取收藏夹，不足取经典精选)
  const defaultRecommendedTools = computed<PaletteOption[]>(() => {
    const favorites = toolStore.favoriteTools;
    const pickedTools: typeof toolStore.tools = [...favorites];

    for (const path of DEFAULT_RECOMMENDED_PATHS) {
      if (pickedTools.length >= 6) break;
      const found = toolStore.tools.find(t => t.path === path);
      if (found && !pickedTools.some(p => p.path === found.path)) {
        pickedTools.push(found);
      }
    }

    return pickedTools.slice(0, 6).map(tool => ({
      id: tool.path,
      name: tool.name,
      description: tool.description,
      icon: tool.icon,
      to: tool.path,
      toolCategory: tool.category,
      category: t('commandPalette.categories.frequent', '常用推荐'),
      closeOnSelect: true,
    }));
  });

  // 动态检索与分类分组结果
  const filteredSearchResult = computed<Record<string, PaletteOption[]>>(() => {
    const query = searchPrompt.value.trim();

    // 1. 空输入态：返回常用推荐工具与快捷操作
    if (!query) {
      const result: Record<string, PaletteOption[]> = {};
      if (defaultRecommendedTools.value.length > 0) {
        result[t('commandPalette.categories.frequent', '常用推荐')] = defaultRecommendedTools.value;
      }
      result[t('commandPalette.categories.actions', '快捷操作')] = actionOptions.value.slice(0, 2);
      result[t('commandPalette.categories.externalLinks', '外部链接')] = actionOptions.value.slice(3, 4);
      return result;
    }

    // 2. 检索态：基于纯客户端拼音检索引擎查询工具
    const searchToolResults = searchTools(toolStore.tools, query)
      .filter(item => item.matchType !== 'none')
      .slice(0, 8);

    const toolOptions: PaletteOption[] = searchToolResults.map(item => ({
      id: item.tool.path,
      name: item.tool.name,
      description: item.tool.description,
      icon: item.tool.icon,
      to: item.tool.path,
      toolCategory: item.tool.category,
      category: t('commandPalette.categories.tools', '小工具'),
      matchRange: item.matchRange,
      matchCueType: item.matchCueType,
      matchCueValue: item.matchCueValue,
      closeOnSelect: true,
    }));

    // 3. 检索内置动作与外部链接
    const lowerQuery = query.toLowerCase();
    const matchedActions: PaletteOption[] = [];
    const matchedPages: PaletteOption[] = [];
    const matchedLinks: PaletteOption[] = [];

    for (const opt of actionOptions.value) {
      const isNameMatch = opt.name.toLowerCase().includes(lowerQuery) || Boolean(Pinyin.match(opt.name, query));
      const isDescMatch = opt.description?.toLowerCase().includes(lowerQuery) || Boolean(opt.description && Pinyin.match(opt.description, query));
      const isKeywordMatch = opt.keywords?.some(k => k.toLowerCase().includes(lowerQuery) || Boolean(Pinyin.match(k, query)));

      if (isNameMatch || isDescMatch || isKeywordMatch) {
        if (opt.category === t('commandPalette.categories.actions', '快捷操作')) {
          matchedActions.push(opt);
        } else if (opt.category === t('commandPalette.categories.pages', '系统页面')) {
          matchedPages.push(opt);
        } else {
          matchedLinks.push(opt);
        }
      }
    }

    const grouped: Record<string, PaletteOption[]> = {};
    if (toolOptions.length > 0) {
      grouped[t('commandPalette.categories.tools', '小工具')] = toolOptions;
    }
    if (matchedActions.length > 0) {
      grouped[t('commandPalette.categories.actions', '快捷操作')] = matchedActions;
    }
    if (matchedPages.length > 0) {
      grouped[t('commandPalette.categories.pages', '系统页面')] = matchedPages;
    }
    if (matchedLinks.length > 0) {
      grouped[t('commandPalette.categories.externalLinks', '外部链接')] = matchedLinks;
    }

    return grouped;
  });

  // 平铺的所有可导航选项列表
  const flatOptions = computed<PaletteOption[]>(() => {
    return Object.values(filteredSearchResult.value).flat();
  });

  return {
    filteredSearchResult,
    flatOptions,
    searchPrompt,
    actionOptions,
  };
});
