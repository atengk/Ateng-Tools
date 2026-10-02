<!--
  首页即时交互式搜索过滤组件 (Homepage Tool Search Filter)

  @author Ateng
  @since 2026-10-02
-->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { Search as SearchIcon, X as ClearIcon } from '@vicons/tabler';
import { NIcon, useThemeVars } from 'naive-ui';
import { brandTokens } from '@/styles/tokens';

interface Props {
  modelValue: string;
  matchedCount?: number;
  isSearching?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  matchedCount: 0,
  isSearching: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'clear'): void;
  (e: 'submit'): void;
  (e: 'arrow-down'): void;
  (e: 'arrow-up'): void;
}>();

const themeVars = useThemeVars();
const inputRef = ref<HTMLInputElement>();
const isFocused = ref(false);

const isMac = computed(() => {
  if (typeof navigator === 'undefined') return false;
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
});

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}

function onClear() {
  emit('update:modelValue', '');
  emit('clear');
  inputRef.value?.focus();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    onClear();
  } else if (event.key === 'Enter') {
    emit('submit');
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    emit('arrow-down');
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    emit('arrow-up');
  }
}

function focus() {
  inputRef.value?.focus();
}

function blur() {
  inputRef.value?.blur();
}

defineExpose({
  focus,
  blur,
});
</script>

<template>
  <div class="homepage-search-filter-wrapper">
    <div
      class="search-bar-box"
      :class="{ 'is-focused': isFocused, 'is-active': isSearching }"
    >
      <NIcon :component="SearchIcon" size="20" class="search-lead-icon" />

      <input
        ref="inputRef"
        type="text"
        class="search-input"
        :value="modelValue"
        :placeholder="$t('home.search.placeholder')"
        autocomplete="off"
        spellcheck="false"
        @input="onInput"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown="onKeydown"
      >

      <div class="search-actions">
        <!-- 匹配计数胶囊 -->
        <span v-if="isSearching" class="match-count-pill">
          {{ $t('home.search.matchCount', { count: matchedCount }) }}
        </span>

        <!-- 清空按钮 -->
        <button
          v-if="isSearching"
          type="button"
          class="clear-button"
          :title="$t('home.search.clear')"
          :aria-label="$t('home.search.clear')"
          @click="onClear"
        >
          <NIcon :component="ClearIcon" size="16" />
        </button>

        <!-- 桌面端快捷键指引 -->
        <div class="shortcut-hints select-none">
          <span v-if="!isSearching" class="shortcut-hint-item">
            <kbd class="shortcut-kbd">{{ isMac ? '⌘' : 'Ctrl' }}</kbd>
            <kbd class="shortcut-kbd">K</kbd>
            <span class="shortcut-sep">/</span>
            <kbd class="shortcut-kbd">/</kbd>
          </span>
          <span v-else class="shortcut-hint-item">
            <kbd class="shortcut-kbd">Esc</kbd>
            <span class="hint-text">{{ $t('home.search.shortcutClear') }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.homepage-search-filter-wrapper {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
}

.search-bar-box {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 16px;
  border-radius: 12px;
  background-color: v-bind('themeVars.cardColor');
  border: 1px solid v-bind('themeVars.borderColor');
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.04);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &.is-focused,
  &.is-active {
    border-color: v-bind('themeVars.primaryColor');
    box-shadow: v-bind('brandTokens.focusRing'), 0 4px 12px 0 rgba(0, 0, 0, 0.05);
  }

  .search-lead-icon {
    color: v-bind('themeVars.textColor3');
    flex-shrink: 0;
    transition: color 0.2s ease;
  }

  &.is-focused .search-lead-icon,
  &.is-active .search-lead-icon {
    color: v-bind('themeVars.primaryColor');
  }

  .search-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 15px;
    line-height: 1.5;
    color: v-bind('themeVars.textColorBase');

    &::placeholder {
      color: v-bind('themeVars.textColor3');
      opacity: 0.8;
    }
  }

  .search-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .match-count-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 500;
    background-color: v-bind('brandTokens.primaryLightBg');
    color: v-bind('themeVars.primaryColor');
  }

  .clear-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: v-bind('themeVars.textColor3');
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.06);
      color: v-bind('themeVars.textColorBase');
    }

    :root.dark &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  }

  .shortcut-hints {
    display: flex;
    align-items: center;
    gap: 8px;

    .shortcut-hint-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: v-bind('themeVars.textColor3');

      .shortcut-kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        padding: 0 4px;
        border-radius: 4px;
        font-family: inherit;
        font-size: 11px;
        font-weight: 600;
        background-color: rgba(125, 125, 125, 0.1);
        border: 1px solid rgba(125, 125, 125, 0.2);
        color: v-bind('themeVars.textColor2');
      }

      .shortcut-sep {
        font-size: 11px;
        color: v-bind('themeVars.textColor3');
        opacity: 0.6;
        margin: 0 1px;
      }

      .hint-text {
        font-size: 12px;
      }
    }
  }
}

// 移动端响应式微调：满宽并隐藏快捷键徽标
@media (max-width: 768px) {
  .homepage-search-filter-wrapper {
    max-width: 100%;
  }

  .search-bar-box {
    height: 46px;
    padding: 0 12px;

    .shortcut-hints {
      display: none;
    }
  }
}
</style>
