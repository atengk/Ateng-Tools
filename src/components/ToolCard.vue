<script setup lang="ts">
import { useThemeVars } from 'naive-ui';
import FavoriteButton from './FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';
import { useCategory } from '@/composable/category';

const props = defineProps<{ tool: Tool & { category?: string } }>();
const { tool } = toRefs(props);
const theme = useThemeVars();
const { getCategoryTitle } = useCategory();
</script>

<template>
  <router-link :to="tool.path" class="tool-card-link decoration-none">
    <c-card class="tool-card h-full">
      <div class="flex items-center justify-between mb-3">
        <n-icon class="tool-icon" size="36" :component="tool.icon" />

        <div class="flex items-center gap-2">
          <span
            v-if="tool.category"
            class="category-tag text-[11px] px-2 py-0.5 rounded-full font-medium"
          >
            {{ getCategoryTitle(tool.category) }}
          </span>

          <span
            v-if="tool.isNew"
            class="new-badge text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white leading-none"
            :style="{ backgroundColor: theme.primaryColor }"
          >
            {{ $t('toolCard.new') }}
          </span>

          <FavoriteButton :tool="tool" />
        </div>
      </div>

      <div class="tool-name text-base font-bold my-1 text-black dark:text-white">
        {{ tool.name }}
      </div>

      <div class="tool-desc line-clamp-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        {{ tool.description }}
      </div>
    </c-card>
  </router-link>
</template>

<style scoped lang="less">
.tool-card-link {
  display: block;
  height: 100%;

  .tool-card {
    border: 1px solid v-bind('theme.borderColor');
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05);
    transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
      transform: translateY(-3px);
      border-color: v-bind('theme.primaryColor');
      box-shadow: 0 12px 24px -6px rgba(37, 99, 235, 0.14), 0 4px 6px -4px rgba(0, 0, 0, 0.04);

      .tool-name {
        color: v-bind('theme.primaryColor');
        transition: color 0.2s ease;
      }
    }
  }

  .tool-icon {
    color: v-bind('theme.textColor2');
    transition: color 0.2s ease;
  }

  .category-tag {
    background-color: rgba(148, 163, 184, 0.12);
    color: v-bind('theme.textColor3');
  }
}
</style>
