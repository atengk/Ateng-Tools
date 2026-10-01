/**
 * 全局上下文桥接器单元测试
 * 验证 AppGlobalBridge 挂载后 window.$message, window.$dialog, window.$notification, window.$loadingBar 正常注入
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { h } from 'vue';
import { NDialogProvider, NLoadingBarProvider, NMessageProvider, NNotificationProvider } from 'naive-ui';
import AppGlobalBridge from './AppGlobalBridge.vue';

describe('AppGlobalBridge', () => {
  it('correctly mounts and injects global context instances onto window', () => {
    const TestRoot = {
      render() {
        return h(
          NLoadingBarProvider,
          null,
          () => h(
            NDialogProvider,
            null,
            () => h(
              NNotificationProvider,
              null,
              () => h(
                NMessageProvider,
                null,
                () => h(AppGlobalBridge, null, () => h('div', { id: 'test-child' }, 'Ready')),
              ),
            ),
          ),
        );
      },
    };

    const wrapper = mount(TestRoot);
    expect(wrapper.find('#test-child').text()).toBe('Ready');
    expect(window.$message).toBeDefined();
    expect(typeof window.$message?.success).toBe('function');
    expect(window.$dialog).toBeDefined();
    expect(typeof window.$dialog?.warning).toBe('function');
    expect(window.$notification).toBeDefined();
    expect(typeof window.$notification?.info).toBe('function');
    expect(window.$loadingBar).toBeDefined();
    expect(typeof window.$loadingBar?.start).toBe('function');
  });
});
