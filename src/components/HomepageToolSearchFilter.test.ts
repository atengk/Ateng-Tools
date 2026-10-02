/**
 * @vitest-environment jsdom
 * 首页工具即时搜索过滤组件单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import HomepageToolSearchFilter from './HomepageToolSearchFilter.vue';

describe('HomepageToolSearchFilter', () => {
  it('1. 正常渲染输入框并展示占位提示', () => {
    const wrapper = mount(HomepageToolSearchFilter, {
      props: {
        modelValue: '',
        isSearching: false,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const input = wrapper.find('input.search-input');
    expect(input.exists()).toBe(true);
    expect(wrapper.find('.clear-button').exists()).toBe(false);
    expect(wrapper.find('.match-count-pill').exists()).toBe(false);
  });

  it('2. 输入文本触发 update:modelValue 事件', async () => {
    const wrapper = mount(HomepageToolSearchFilter, {
      props: {
        modelValue: '',
        isSearching: false,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const input = wrapper.find('input.search-input');
    await input.setValue('ewm');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['ewm']);
  });

  it('3. 在处于检索态 (isSearching=true) 时展示匹配计数胶囊与清空按钮', async () => {
    const wrapper = mount(HomepageToolSearchFilter, {
      props: {
        modelValue: 'ewm',
        matchedCount: 3,
        isSearching: true,
      },
      global: {
        mocks: {
          $t: (key: string, params?: any) => params?.count ? `找到 ${params.count} 款工具` : key,
        },
      },
    });

    expect(wrapper.find('.match-count-pill').exists()).toBe(true);
    expect(wrapper.find('.match-count-pill').text()).toContain('3');

    const clearButton = wrapper.find('.clear-button');
    expect(clearButton.exists()).toBe(true);

    await clearButton.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['']);
    expect(wrapper.emitted('clear')).toBeTruthy();
  });

  it('4. 正确暴露 focus 与 blur 实例方法', () => {
    const wrapper = mount(HomepageToolSearchFilter, {
      props: {
        modelValue: '',
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const exposed = (wrapper.vm as any).$?.exposed || wrapper.vm;
    expect(typeof exposed.focus).toBe('function');
    expect(typeof exposed.blur).toBe('function');
  });

  it('5. 按 Enter 键派发 submit 事件', async () => {
    const wrapper = mount(HomepageToolSearchFilter, {
      props: {
        modelValue: 'ewm',
        isSearching: true,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const input = wrapper.find('input.search-input');
    await input.trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('submit')).toBeTruthy();
  });

  it('6. 按 ArrowDown 与 ArrowUp 派发 arrow-down 与 arrow-up 事件', async () => {
    const wrapper = mount(HomepageToolSearchFilter, {
      props: {
        modelValue: 'ewm',
        isSearching: true,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const input = wrapper.find('input.search-input');
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(wrapper.emitted('arrow-down')).toBeTruthy();

    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(wrapper.emitted('arrow-up')).toBeTruthy();
  });

  it('7. 按 Escape 键清空输入并派发 clear 事件', async () => {
    const wrapper = mount(HomepageToolSearchFilter, {
      props: {
        modelValue: 'ewm',
        isSearching: true,
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const input = wrapper.find('input.search-input');
    await input.trigger('keydown', { key: 'Escape' });

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['']);
    expect(wrapper.emitted('clear')).toBeTruthy();
  });
});
