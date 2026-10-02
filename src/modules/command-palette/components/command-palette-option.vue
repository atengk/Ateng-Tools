<!--
  全局命令面板单项选项组件 (Command Option Descriptor)
  支持标题高亮切片、Match Cue Badge 与主题色高亮键盘选中态

  @author Ateng
  @since 2026-10-02
-->
<script setup lang="ts">
import { computed } from 'vue';
import { NIcon } from 'naive-ui';
import { CornerDownLeft as EnterIcon, Search as SearchIcon } from '@vicons/tabler';
import type { PaletteOption } from '../command-palette.types';
import { useCategory } from '@/composable/category';
import { useStyleStore } from '@/stores/style.store';

const props = withDefaults(defineProps<{
  option: PaletteOption;
  selected?: boolean;
}>(), {
  selected: false,
});

const emit = defineEmits<{
  (e: 'activated', option: PaletteOption): void;
}>();

const styleStore = useStyleStore();
const { t } = useI18n();
const { getCategoryTitle } = useCategory();
const isDark = computed(() => styleStore.isDarkTheme);

// 标题高亮切片
const nameBefore = computed(() => {
  if (!props.option.matchRange) return '';
  return props.option.name.slice(0, props.option.matchRange[0]);
});

const nameMatched = computed(() => {
  if (!props.option.matchRange) return '';
  return props.option.name.slice(props.option.matchRange[0], props.option.matchRange[1] + 1);
});

const nameAfter = computed(() => {
  if (!props.option.matchRange) return '';
  return props.option.name.slice(props.option.matchRange[1] + 1);
});

// 匹配线索文字
const matchCueText = computed(() => {
  if (!props.option.matchCueType || !props.option.matchCueValue) return '';
  if (props.option.matchCueType === 'pinyin') {
    return t('home.search.matchCuePinyin', { value: props.option.matchCueValue });
  }
  if (props.option.matchCueType === 'keyword') {
    return t('home.search.matchCueKeyword', { value: props.option.matchCueValue });
  }
  return props.option.matchCueValue;
});

// 高对比度实心内联色彩配置
const itemStyle = computed(() => {
  if (props.selected) {
    return {
      backgroundColor: isDark.value ? 'rgba(37, 99, 235, 0.22)' : 'rgba(37, 99, 235, 0.08)',
      borderLeft: `3px solid ${isDark.value ? '#3b82f6' : '#2563eb'}`,
    };
  }
  return {
    backgroundColor: 'transparent',
    borderLeft: '3px solid transparent',
  };
});

const titleStyle = computed(() => {
  if (props.selected) {
    return { color: isDark.value ? '#60a5fa' : '#2563eb' };
  }
  return { color: isDark.value ? '#f8fafc' : '#0f172a' };
});

const descStyle = computed(() => ({
  color: isDark.value ? '#94a3b8' : '#64748b',
}));

const iconWrapStyle = computed(() => {
  if (props.selected) {
    return {
      backgroundColor: isDark.value ? 'rgba(37, 99, 235, 0.35)' : 'rgba(37, 99, 235, 0.15)',
      color: isDark.value ? '#93c5fd' : '#2563eb',
    };
  }
  return {
    backgroundColor: isDark.value ? '#334155' : '#f1f5f9',
    color: isDark.value ? '#cbd5e1' : '#475569',
  };
});

const categoryPillStyle = computed(() => ({
  backgroundColor: isDark.value ? '#334155' : '#f1f5f9',
  color: isDark.value ? '#94a3b8' : '#64748b',
}));

const actionEnterStyle = computed(() => ({
  backgroundColor: isDark.value ? '#1e293b' : '#ffffff',
  borderColor: isDark.value ? 'rgba(59, 130, 246, 0.4)' : 'rgba(37, 99, 235, 0.3)',
  color: isDark.value ? '#60a5fa' : '#2563eb',
}));
</script>

<template>
  <div
    role="option"
    :aria-selected="selected"
    class="palette-option-item"
    :class="{ 'is-selected': selected }"
    :style="itemStyle"
    @click="emit('activated', option)"
  >
    <!-- 左侧专属图标容器 -->
    <div class="option-icon-wrap" :style="iconWrapStyle">
      <NIcon v-if="option.icon" size="20" :component="option.icon" class="option-icon" />
    </div>

    <!-- 中间标题与描述信息 -->
    <div class="option-content">
      <div class="option-title" :style="titleStyle">
        <template v-if="option.matchRange">
          <span>{{ nameBefore }}</span><span class="highlight-segment">{{ nameMatched }}</span><span>{{ nameAfter }}</span>
        </template>
        <template v-else>
          {{ option.name }}
        </template>
      </div>

      <div v-if="option.description" class="option-desc" :style="descStyle">
        {{ option.description }}
      </div>
    </div>

    <!-- 右侧徽标与快捷键动作胶囊 -->
    <div class="option-meta">
      <!-- 匹配线索微标签 -->
      <span v-if="matchCueText" class="match-cue-badge">
        <NIcon size="11" :component="SearchIcon" class="mr-0.5" />
        {{ matchCueText }}
      </span>

      <!-- 所属分类标签 -->
      <span v-if="option.toolCategory" class="category-pill" :style="categoryPillStyle">
        {{ getCategoryTitle(option.toolCategory) }}
      </span>

      <!-- 选中状态直达指示器 -->
      <div v-if="selected" class="action-enter-hint" :style="actionEnterStyle">
        <NIcon size="12" :component="EnterIcon" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.palette-option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  margin: 2px 8px;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.12s ease;
  user-select: none;

  &:hover {
    background-color: rgba(37, 99, 235, 0.06);
  }

  .option-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    flex-shrink: 0;
    transition: all 0.12s ease;
  }

  .option-content {
    flex: 1;
    min-width: 0;

    .option-title {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      .highlight-segment {
        color: #2563eb;
        text-decoration: underline;
        text-underline-offset: 2px;
        font-weight: 700;
      }
    }

    .option-desc {
      font-size: 12px;
      line-height: 1.35;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .option-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .match-cue-badge {
      display: inline-flex;
      align-items: center;
      font-size: 11px;
      padding: 1px 7px;
      border-radius: 9999px;
      background-color: rgba(37, 99, 235, 0.1);
      color: #2563eb;
      border: 1px solid rgba(37, 99, 235, 0.2);
    }

    .category-pill {
      font-size: 11px;
      padding: 1px 7px;
      border-radius: 9999px;
    }

    .action-enter-hint {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 1px solid transparent;
    }
  }
}
</style>
