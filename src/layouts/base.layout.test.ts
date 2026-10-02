/**
 * @vitest-environment jsdom
 * 基础布局与顶栏搜索分流单测
 *
 * @author Ateng
 * @since 2026-10-02
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import BaseLayout from './base.layout.vue';

const mockCurrentRoute = ref({ path: '/' });

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<any>('vue-router');
  return {
    ...actual,
    useRoute: () => mockCurrentRoute.value,
    RouterLink: { template: '<a><slot /></a>' },
  };
});

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<any>('vue-i18n');
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, defaultVal?: string) => defaultVal ?? key,
    }),
  };
});

const commonMountOptions = {
  global: {
    stubs: {
      MenuLayout: { template: '<div class="menu-layout"><slot name="sider" /><slot name="content" /></div>' },
      NavbarButtons: { template: '<div class="navbar-buttons" />' },
      CollapsibleToolMenu: { template: '<div class="collapsible-tool-menu" />' },
      'command-palette': { template: '<div class="nav-command-palette" />' },
      'locale-selector': { template: '<div class="locale-selector" />' },
      'n-icon': { template: '<i class="n-icon" />' },
      RouterLink: { template: '<a><slot /></a>' },
    },
    mocks: {
      $t: (key: string, defaultVal?: string) => defaultVal ?? key,
    },
  },
};

describe('BaseLayout 顶栏搜索分流机制', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('1. 在首页 (path: /) 时，顶栏不渲染 command-palette 小搜索框', () => {
    mockCurrentRoute.value = { path: '/' };
    const wrapper = mount(BaseLayout, commonMountOptions);

    expect(wrapper.find('.nav-command-palette').exists()).toBe(false);
  });

  it('2. 在非首页 (如 path: /qr-code-generator) 时，顶栏渲染 command-palette 小搜索框', () => {
    mockCurrentRoute.value = { path: '/qr-code-generator' };
    const wrapper = mount(BaseLayout, commonMountOptions);

    expect(wrapper.find('.nav-command-palette').exists()).toBe(true);
  });
});
