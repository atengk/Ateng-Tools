/**
 * @vitest-environment jsdom
 * 增强工具卡片高亮与微标签单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ToolCard from './ToolCard.vue';

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<any>('vue-i18n');
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        if (key === 'home.search.matchCuePinyin') return `拼音: ${params?.value}`;
        if (key === 'home.search.matchCueKeyword') return `关键词: ${params?.value}`;
        if (key === 'home.search.matchCuePath') return `路径: ${params?.value}`;
        return key;
      },
      te: () => true,
    }),
  };
});

vi.mock('@/composable/category', () => ({
  useCategory: () => ({
    getCategoryTitle: (cat?: string) => cat ?? '',
  }),
}));

const mockTool = {
  name: '二维码生成器',
  path: '/qr-code-generator',
  description: '生成与下载自定义二维码图片',
  keywords: ['qrcode', '2d barcode'],
  category: 'dev',
  component: async () => ({}),
  icon: {} as any,
  isNew: false,
};

const commonMountOptions = {
  global: {
    stubs: {
      RouterLink: { template: '<a><slot /></a>' },
      'router-link': { template: '<a><slot /></a>' },
      'c-card': { template: '<div class="c-card"><slot /></div>' },
      'n-icon': { template: '<i class="n-icon"><slot /></i>' },
      FavoriteButton: { template: '<button class="fav-btn" />' },
    },
    mocks: {
      $t: (key: string, params?: Record<string, unknown>) => {
        if (key === 'home.search.matchCuePinyin') return `拼音: ${params?.value}`;
        if (key === 'home.search.matchCueKeyword') return `关键词: ${params?.value}`;
        if (key === 'home.search.matchCuePath') return `路径: ${params?.value}`;
        return key;
      },
    },
  },
};

describe('ToolCard 搜索高亮与 Match Cue Badge 渲染', () => {
  it('1. 无搜索高亮范围时，正常渲染完整纯文本标题', () => {
    const wrapper = mount(ToolCard, {
      ...commonMountOptions,
      props: {
        tool: mockTool,
      },
    });

    expect(wrapper.find('.tool-name').text()).toBe('二维码生成器');
    expect(wrapper.find('.highlight-segment').exists()).toBe(false);
    expect(wrapper.find('.match-cue-badge').exists()).toBe(false);
  });

  it('2. 传入 matchRange 时，标题应切片并高亮命中文字', () => {
    const wrapper = mount(ToolCard, {
      ...commonMountOptions,
      props: {
        tool: mockTool,
        matchRange: [0, 2] as [number, number], // "二维码"
      },
    });

    const highlightSegment = wrapper.find('.highlight-segment');
    expect(highlightSegment.exists()).toBe(true);
    expect(highlightSegment.text()).toBe('二维码');
    expect(wrapper.find('.tool-name').text()).toBe('二维码生成器');
  });

  it('3. 传入 matchCueType 与 matchCueValue 时，应渲染 Match Cue Badge 微标签', () => {
    const wrapper = mount(ToolCard, {
      ...commonMountOptions,
      props: {
        tool: mockTool,
        matchCueType: 'pinyin',
        matchCueValue: 'ewm',
      },
    });

    const badge = wrapper.find('.match-cue-badge');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toContain('拼音: ewm');
  });

  it('4. 传入 isActive: true 时，工具卡片具有 is-keyboard-active 聚焦样式类', () => {
    const wrapper = mount(ToolCard, {
      ...commonMountOptions,
      props: {
        tool: mockTool,
        isActive: true,
      },
    });

    expect(wrapper.find('.tool-card').classes()).toContain('is-keyboard-active');
  });
});
