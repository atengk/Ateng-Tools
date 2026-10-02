<!--
  增强工具卡片组件 (Enhanced Tool Card)
  支持多维搜索标题高亮、Match Cue Badge 微标签与全键盘聚焦交互

  @author Ateng
  @since 2026-10-02
-->
<script setup lang="ts">
import { computed } from 'vue';
import { NIcon, useThemeVars } from 'naive-ui';
import { Search as SearchIcon } from '@vicons/tabler';
import FavoriteButton from './FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';
import { useCategory } from '@/composable/category';
import { brandTokens } from '@/styles/tokens';

interface Props {
  tool: Tool & { category?: string };
  matchRange?: [number, number];
  matchCueType?: 'pinyin' | 'keyword' | 'path';
  matchCueValue?: string;
  isActive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  matchRange: undefined,
  matchCueType: undefined,
  matchCueValue: undefined,
  isActive: false,
});

const theme = useThemeVars();
const { t } = useI18n();
const { getCategoryTitle } = useCategory();

// 标题高亮切片：将标题按匹配下标 [start, end] 拆解为三段
const nameBefore = computed(() => {
  if (!props.matchRange) return '';
  return props.tool.name.slice(0, props.matchRange[0]);
});

const nameMatched = computed(() => {
  if (!props.matchRange) return '';
  return props.tool.name.slice(props.matchRange[0], props.matchRange[1] + 1);
});

const nameAfter = computed(() => {
  if (!props.matchRange) return '';
  return props.tool.name.slice(props.matchRange[1] + 1);
});

// 匹配线索文字：若命中非标题字段（拼音、关键词、路径），生成语义化微标签
const matchCueText = computed(() => {
  if (!props.matchCueType || !props.matchCueValue) return '';
  if (props.matchCueType === 'pinyin') {
    return t('home.search.matchCuePinyin', { value: props.matchCueValue });
  }
  if (props.matchCueType === 'keyword') {
    return t('home.search.matchCueKeyword', { value: props.matchCueValue });
  }
  if (props.matchCueType === 'path') {
    return t('home.search.matchCuePath', { value: props.matchCueValue });
  }
  return props.matchCueValue;
});
</script>

<template>
  <router-link :to="tool.path" class="tool-card-link decoration-none">
    <c-card
      class="tool-card h-full"
      :class="{ 'is-keyboard-active': isActive }"
    >
      <div class="flex items-center justify-between mb-3">
        <n-icon class="tool-icon" size="36" :component="tool.icon" />

        <div class="flex items-center gap-2">
          <span
            v-if="tool.category"
            class="category-tag text-[11px] px-2 py-0.5 rounded-full font-medium"
          >
            {{ getCategoryTitle(tool.category) }}
          </span>

          <FavoriteButton :tool="tool" />
        </div>
      </div>

      <div class="tool-name text-base font-bold my-1 text-black dark:text-white">
        <template v-if="matchRange">
          <span>{{ nameBefore }}</span><span class="highlight-segment font-extrabold text-primary underline decoration-primary decoration-2 underline-offset-3">{{ nameMatched }}</span><span>{{ nameAfter }}</span>
        </template>
        <template v-else>
          {{ tool.name }}
        </template>
      </div>

      <div class="tool-desc line-clamp-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        {{ tool.description }}
      </div>

      <!-- Match Cue Badge 匹配线索微标签 -->
      <div v-if="matchCueText" class="mt-2.5 flex items-center">
        <span class="match-cue-badge text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium bg-primary/10 text-primary">
          <n-icon size="12" :component="SearchIcon" class="match-cue-icon" />
          <span>{{ matchCueText }}</span>
        </span>
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

    &:hover,
    &.is-keyboard-active {
      transform: translateY(-3px);
      border-color: v-bind('theme.primaryColor');
      box-shadow: v-bind('brandTokens.focusRing'), 0 12px 24px -6px rgba(37, 99, 235, 0.14), 0 4px 6px -4px rgba(0, 0, 0, 0.04);

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

  .match-cue-badge {
    background-color: v-bind('brandTokens.primaryLightBg');
    color: v-bind('theme.primaryColor');
    border: 1px solid v-bind('brandTokens.primaryFaded');

    .match-cue-icon {
      font-size: 10px;
    }
  }
}
</style>
