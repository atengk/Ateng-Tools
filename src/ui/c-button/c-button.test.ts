import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CButton from './c-button.vue';

describe('CButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders default button without crashing', () => {
    const wrapper = mount(CButton as any, {
      slots: {
        default: 'Click me',
      },
    });
    expect(wrapper.text()).toBe('Click me');
    const vm = wrapper.vm as any;
    expect(vm.size).toBeDefined();
    expect(vm.size.fontSize).toBe('14px');
  });

  it('guarantees size and size.fontSize are defined even when unsupported size is passed', () => {
    const wrapper = mount(CButton as any, {
      props: {
        size: 'tiny' as any,
      },
      slots: {
        default: 'Tiny Button',
      },
    });
    // This reproduces the exact error: when size is undefined, accessing size.fontSize throws TypeError
    const vm = wrapper.vm as any;
    expect(vm.size).toBeDefined();
    expect(vm.size.fontSize).toBeDefined();
  });
});
