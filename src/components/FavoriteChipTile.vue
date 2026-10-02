<!--
  常用收藏横向磁贴芯片组件 (Favorites Chip Tile)
  轻巧紧凑呈现收藏工具，高度约 40px，横向弹性排列，支持直达与快捷移除

  @author Ateng
  @since 2026-10-02
-->
<script setup lang="ts">
import { computed } from 'vue';
import { NIcon, useThemeVars } from 'naive-ui';
import FavoriteButton from './FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';
import { useCategory } from '@/composable/category';
import { statusTokens } from '@/styles/tokens';

interface Props {
  tool: Tool & { category?: string };
}

const props = defineProps<Props>();

const themeVars = useThemeVars();
const { getCategoryTitle } = useCategory();

const COLOR_PALETTES = [
  { bgClass: 'bg-blue-50 dark:bg-blue-950/60', iconClass: 'text-blue-600 dark:text-blue-400' },
  { bgClass: 'bg-emerald-50 dark:bg-emerald-950/60', iconClass: 'text-emerald-600 dark:text-emerald-400' },
  { bgClass: 'bg-orange-50 dark:bg-orange-950/60', iconClass: 'text-orange-600 dark:text-orange-400' },
  { bgClass: 'bg-cyan-50 dark:bg-cyan-950/60', iconClass: 'text-cyan-600 dark:text-cyan-400' },
  { bgClass: 'bg-purple-50 dark:bg-purple-950/60', iconClass: 'text-purple-600 dark:text-purple-400' },
  { bgClass: 'bg-indigo-50 dark:bg-indigo-950/60', iconClass: 'text-indigo-600 dark:text-indigo-400' },
  { bgClass: 'bg-pink-50 dark:bg-pink-950/60', iconClass: 'text-pink-600 dark:text-pink-400' },
  { bgClass: 'bg-amber-50 dark:bg-amber-950/60', iconClass: 'text-amber-600 dark:text-amber-400' },
  { bgClass: 'bg-teal-50 dark:bg-teal-950/60', iconClass: 'text-teal-600 dark:text-teal-400' },
  { bgClass: 'bg-rose-50 dark:bg-rose-950/60', iconClass: 'text-rose-600 dark:text-rose-400' },
];

function getToolIconTheme(tool: { path?: string; name?: string }): { bgClass: string; iconClass: string } {
  const path = tool.path?.toLowerCase() || '';
  if (path.includes('json')) return COLOR_PALETTES[1];
  if (path.includes('git')) return COLOR_PALETTES[2];
  if (path.includes('port') || path.includes('mac')) return COLOR_PALETTES[3];
  if (path.includes('cron')) return COLOR_PALETTES[0];
  if (path.includes('jwt') || path.includes('token') || path.includes('crypto')) return COLOR_PALETTES[7];
  if (path.includes('base64')) return COLOR_PALETTES[6];
  if (path.includes('sql')) return COLOR_PALETTES[8];

  const str = tool.path || tool.name || '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return COLOR_PALETTES[hash % COLOR_PALETTES.length];
}

const iconTheme = computed(() => getToolIconTheme(props.tool));

const isJsonTool = computed(() => {
  const p = props.tool.path?.toLowerCase() || '';
  return p.includes('json') && !p.includes('converter') && !p.includes('to');
});
</script>

<template>
  <router-link :to="tool.path" class="favorite-chip-link decoration-none select-none">
    <div class="favorite-chip-item flex items-center gap-2.5 p-2 px-3 rounded-xl border transition-all duration-200">
      <!-- 32x32 微图标微容器 -->
      <div
        class="chip-icon-box w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
        :class="iconTheme.bgClass"
      >
        <span v-if="isJsonTool" class="font-mono font-bold text-xs leading-none" :class="iconTheme.iconClass">{ }</span>
        <n-icon v-else size="16" :component="tool.icon" :class="iconTheme.iconClass" />
      </div>

      <!-- 工具标题与分类微标 -->
      <div class="flex-1 min-w-0 pr-1">
        <div class="flex items-center gap-1.5">
          <span class="chip-title text-xs font-bold truncate text-slate-800 dark:text-slate-100">
            {{ tool.name }}
          </span>
          <span
            v-if="tool.category"
            class="chip-category text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
          >
            {{ getCategoryTitle(tool.category) }}
          </span>
        </div>
      </div>

      <!-- 快捷收藏切换星标 -->
      <div class="shrink-0" @click.stop>
        <FavoriteButton :tool="tool" />
      </div>
    </div>
  </router-link>
</template>

<style scoped lang="less">
.favorite-chip-link {
  display: block;

  .favorite-chip-item {
    min-width: 220px;
    max-width: 280px;
    background-color: v-bind('themeVars.cardColor');
    border: 1px solid rgba(245, 158, 11, 0.35);
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, v-bind('themeVars.cardColor') 60%);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);

    :root.dark & {
      border-color: rgba(245, 158, 11, 0.25);
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, v-bind('themeVars.cardColor') 60%);
    }

    &:hover {
      transform: translateY(-1.5px);
      border-color: v-bind('statusTokens.warning');
      box-shadow: 0 4px 12px -2px v-bind('statusTokens.warningFaded'), 0 2px 4px -2px rgba(0, 0, 0, 0.04);

      .chip-title {
        color: v-bind('statusTokens.warningPressed');
      }
    }
  }
}
</style>
