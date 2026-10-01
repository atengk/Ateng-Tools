<script setup lang="ts">
/**
 * 全局上下文桥接组件 (Global Context Bridge)
 * 将 Naive UI 的 Message、Dialog、Notification、LoadingBar 受管实例挂载到 window，
 * 使非 Vue setup 环境（路由守卫、全局异常拦截、Pinia Store 等）可安全调用。
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { useDialog, useLoadingBar, useMessage, useNotification } from 'naive-ui';

window.$message = useMessage();
window.$dialog = useDialog();
window.$notification = useNotification();
window.$loadingBar = useLoadingBar();
</script>

<template>
  <slot />
</template>
