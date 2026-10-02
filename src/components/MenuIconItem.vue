<script setup lang="ts">
import type { Tool } from '@/tools/tools.types';

const props = defineProps<{ tool: Tool }>();
const { tool } = toRefs(props);
</script>

<template>
  <div class="menu-icon-item">
    <n-icon :component="tool.icon" />
  </div>
</template>

<style lang="less" scoped>
.menu-icon-item {
  position: relative;
}
</style>
