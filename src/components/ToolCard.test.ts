/**
 * @vitest-environment jsdom
 * 增强工具卡片高亮、微容器与底栏单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */
import { markRaw } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ToolCard from './ToolCard.vue';

const mockDict: Record<string, string> = {
  'home.search.matchCuePinyin': '拼音: {value}',
  'home.search.matchCueKeyword': '关键词: {value}',
  'home.search.matchCuePath': '路径: {value}',
  'home.card.offlineTag': '⚡ 纯前端离线',
  'home.card.openTool': '打开工具',
  'home.card.features.qrCodeGenerate': '二维码生成',
};

vi.mock('vue-i18n', () => ({
  createI18n: () => ({
    global: {
      t: (k: string) => k,
    },
  }),
  useI18n: () => ({
    t: (key: string, params?: any) => {
      let val = mockDict[key] ?? (typeof params === 'string' ? params : key);
      if (params && typeof params !== 'string') {
        Object.entries(params).forEach(([k, v]) => {
          val = val.replace(`{${k}}`, String(v));
        });
      }
      return val;
    },
    te: (key: string) => key in mockDict,
  }),
}));

vi.mock('./FavoriteButton.vue', () => ({
  default: {
    name: 'FavoriteButton',
    template: '<button class="fav-btn" />',
  },
}));

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
  icon: markRaw({ render: () => null }),
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
        let val = mockDict[key] ?? key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            val = val.replace(`{${k}}`, String(v));
          });
        }
        return val;
      },
    },
  },
};

describe('ToolCard 组件单元测试', () => {
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

  it('5. 渲染 40x40 微底色图标容器，并根据工具应用原型风格的多彩浅底主题', () => {
    const wrapper = mount(ToolCard, {
      ...commonMountOptions,
      props: {
        tool: mockTool,
      },
    });

    const iconWrapper = wrapper.find('.tool-icon-wrapper');
    expect(iconWrapper.exists()).toBe(true);
    expect(iconWrapper.classes()).toContain('w-10');
    expect(iconWrapper.classes()).toContain('h-10');
    expect(iconWrapper.classes()).toContain('rounded-xl');
  });

  it('6. 渲染卡片底部辅助操作底栏 (左侧特性亮点词，右侧打开工具指引)', () => {
    const wrapper = mount(ToolCard, {
      ...commonMountOptions,
      props: {
        tool: mockTool,
      },
    });

    const footer = wrapper.find('.tool-card-footer');
    expect(footer.exists()).toBe(true);
    expect(footer.find('.card-feature-tag').exists()).toBe(true);
    expect(footer.find('.card-feature-tag').text()).toContain('二维码生成');
    expect(footer.find('.card-open-action').text()).toContain('打开工具');
  });

  it('7. 对 JSON 类工具优先渲染原生极客字形 { }', () => {
    const wrapper = mount(ToolCard, {
      ...commonMountOptions,
      props: {
        tool: {
          ...mockTool,
          name: 'JSON 工作台',
          path: '/json-studio',
        },
      },
    });

    const iconWrapper = wrapper.find('.tool-icon-wrapper');
    expect(iconWrapper.text()).toContain('{ }');
  });
});
