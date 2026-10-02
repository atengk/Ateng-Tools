/**
 * @vitest-environment jsdom
 * 全局命令面板组件渲染与交互单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CommandPalette from './command-palette.vue';

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<any>('vue-router');
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
    }),
  };
});

vi.mock('@/composable/category', () => ({
  useCategory: () => ({
    getCategoryTitle: (cat?: string) => cat ?? '',
  }),
}));

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<any>('vue-i18n');
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        if (key === 'commandPalette.placeholder') return '搜索小工具...';
        if (key === 'search.label') return '搜索';
        if (key === 'home.search.matchCount') return `找到 ${params?.count} 款工具`;
        return key;
      },
      te: () => true,
    }),
  };
});

const commonMountOptions = {
  global: {
    stubs: {
      teleport: true,
      NIcon: { template: '<i class="n-icon"><slot /></i>' },
      'n-icon': { template: '<i class="n-icon"><slot /></i>' },
    },
    mocks: {
      $t: (key: string, params?: Record<string, unknown>) => {
        if (key === 'commandPalette.placeholder') return '搜索小工具...';
        if (key === 'search.label') return '搜索';
        if (key === 'home.search.matchCount') return `找到 ${params?.count} 款工具`;
        return key;
      },
    },
  },
};

describe('CommandPalette 组件渲染与交互', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('1. 正常渲染顶栏触发按钮', () => {
    const wrapper = mount(CommandPalette, commonMountOptions);
    const triggerBtn = wrapper.find('button.nav-palette-trigger');
    expect(triggerBtn.exists()).toBe(true);
    expect(triggerBtn.text()).toContain('搜索');
  });

  it('2. 点击触发按钮唤起 Spotlight 卡片弹窗', async () => {
    const wrapper = mount(CommandPalette, commonMountOptions);
    await wrapper.find('button.nav-palette-trigger').trigger('click');

    const spotlightCard = wrapper.find('.spotlight-card');
    expect(spotlightCard.exists()).toBe(true);

    const input = wrapper.find('input.spotlight-input');
    expect(input.exists()).toBe(true);
  });

  it('3. 唤起弹窗且无输入时展示默认分类与推荐操作', async () => {
    const wrapper = mount(CommandPalette, commonMountOptions);
    await wrapper.find('button.nav-palette-trigger').trigger('click');

    const categoryHeaders = wrapper.findAll('.category-header');
    expect(categoryHeaders.length).toBeGreaterThan(0);

    const footer = wrapper.find('.spotlight-footer');
    expect(footer.exists()).toBe(true);
  });

  it('4. 键盘 Escape 键能够平滑关闭弹窗', async () => {
    const wrapper = mount(CommandPalette, commonMountOptions);
    await wrapper.find('button.nav-palette-trigger').trigger('click');
    expect(wrapper.find('.spotlight-card').exists()).toBe(true);

    await wrapper.find('.palette-backdrop-overlay').trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('.spotlight-card').exists()).toBe(false);
  });
});
