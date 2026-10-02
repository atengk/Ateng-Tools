/**
 * @vitest-environment jsdom
 * 常用收藏横向磁贴芯片组件单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */
import { markRaw } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import FavoriteChipTile from './FavoriteChipTile.vue';

vi.mock('@/composable/category', () => ({
  useCategory: () => ({
    getCategoryTitle: (cat?: string) => cat ?? '',
  }),
}));

vi.mock('./FavoriteButton.vue', () => ({
  default: {
    name: 'FavoriteButton',
    template: '<button class="fav-btn">★</button>',
  },
}));

const mockTool = {
  name: 'Cron 表达式执行模拟器',
  path: '/cron-evaluator',
  description: '5/6/7 位 Cron 表达式自适应解析',
  keywords: ['cron'],
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
      'n-icon': { template: '<i class="n-icon"><slot /></i>' },
      FavoriteButton: { template: '<button class="fav-btn">★</button>' },
    },
  },
};

describe('FavoriteChipTile 组件单元测试', () => {
  it('1. 正常渲染紧凑芯片结构 (32x32 图标容器、工具标题与分类微标)', () => {
    const wrapper = mount(FavoriteChipTile, {
      ...commonMountOptions,
      props: {
        tool: mockTool,
      },
    });

    expect(wrapper.find('.chip-title').text()).toBe('Cron 表达式执行模拟器');
    expect(wrapper.find('.chip-category').text()).toBe('dev');
    expect(wrapper.find('.chip-icon-box').classes()).toContain('w-8');
    expect(wrapper.find('.chip-icon-box').classes()).toContain('h-8');
    expect(wrapper.find('.chip-icon-box').classes()).toContain('rounded-lg');
  });

  it('2. 对 JSON 类工具渲染原生极客字形 { }', () => {
    const wrapper = mount(FavoriteChipTile, {
      ...commonMountOptions,
      props: {
        tool: {
          ...mockTool,
          name: 'JSON 工作台',
          path: '/json-studio',
        },
      },
    });

    const iconBox = wrapper.find('.chip-icon-box');
    expect(iconBox.text()).toContain('{ }');
  });
});
