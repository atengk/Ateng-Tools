import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CButton from './c-button.vue';

describe('CButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders default button without crashing', () => {
    const wrapper = mount(CButton, {
      slots: {
        default: 'Click me',
      },
    });
    expect(wrapper.text()).toBe('Click me');
    expect(wrapper.vm.size).toBeDefined();
    expect(wrapper.vm.size.fontSize).toBe('14px');
  });

  it('guarantees size and size.fontSize are defined even when unsupported size is passed', () => {
    const wrapper = mount(CButton, {
      props: {
        // @ts-expect-error testing invalid size passed from templates
        size: 'tiny',
      },
      slots: {
        default: 'Tiny Button',
      },
    });
    // This reproduces the exact error: when size is undefined, accessing size.fontSize throws TypeError
    expect(wrapper.vm.size).toBeDefined();
    expect(wrapper.vm.size.fontSize).toBeDefined();
  });
});
