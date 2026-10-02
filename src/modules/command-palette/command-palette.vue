<!--
  全局命令面板组件 (Global Command Palette)
  基于 Spotlight 质感一体化实心卡片、轻量硬件加速遮罩与纯客户端拼音检索引擎构建

  @author Ateng
  @since 2026-10-02
-->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useMagicKeys, whenever } from '@vueuse/core';
import { Search as IconSearch, MoodEmpty as MoodEmptyIcon, X as ClearIcon } from '@vicons/tabler';
import { NIcon, useThemeVars } from 'naive-ui';
import { useCommandPaletteStore } from './command-palette.store';
import type { PaletteOption } from './command-palette.types';
import CommandPaletteOption from './components/command-palette-option.vue';
import { useStyleStore } from '@/stores/style.store';

const isModalOpen = ref(false);
const inputRef = ref<HTMLInputElement>();
const resultsListRef = ref<HTMLDivElement>();
const optionRefs = ref<HTMLElement[]>([]);

const router = useRouter();
const themeVars = useThemeVars();
const styleStore = useStyleStore();
const isMac = computed(() => window.navigator.userAgent.toLowerCase().includes('mac'));
const isDark = computed(() => styleStore.isDarkTheme);

// 彻底杜绝 Teleport 丢失 Scoped 变量的内联实心表面配置 (Surface Elevation Hierarchy)
const backdropStyle = computed(() => ({
  backgroundColor: isDark.value ? 'rgba(0, 0, 0, 0.72)' : 'rgba(15, 23, 42, 0.48)',
}));

const cardStyle = computed(() => ({
  backgroundColor: isDark.value ? '#1e293b' : '#ffffff',
  borderColor: isDark.value ? '#334155' : '#cbd5e1',
  boxShadow: isDark.value
    ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)'
    : '0 25px 50px -12px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.06)',
}));

const headerStyle = computed(() => ({
  backgroundColor: isDark.value ? '#0f172a' : '#f8fafc',
  borderBottom: `1px solid ${isDark.value ? '#334155' : '#e2e8f0'}`,
}));

const inputStyle = computed(() => ({
  color: isDark.value ? '#f8fafc' : '#0f172a',
}));

const placeholderColor = computed(() => isDark.value ? '#64748b' : '#94a3b8');

const escBadgeStyle = computed(() => ({
  backgroundColor: isDark.value ? '#1e293b' : '#ffffff',
  borderColor: isDark.value ? '#475569' : '#cbd5e1',
  color: isDark.value ? '#94a3b8' : '#64748b',
}));

const resultsListStyle = computed(() => ({
  backgroundColor: isDark.value ? '#1e293b' : '#ffffff',
}));

const footerStyle = computed(() => ({
  backgroundColor: isDark.value ? '#0f172a' : '#f8fafc',
  borderTop: `1px solid ${isDark.value ? '#334155' : '#e2e8f0'}`,
  color: isDark.value ? '#94a3b8' : '#64748b',
}));

const kbdStyle = computed(() => ({
  backgroundColor: isDark.value ? '#1e293b' : '#ffffff',
  borderColor: isDark.value ? '#475569' : '#cbd5e1',
  color: isDark.value ? '#cbd5e1' : '#475569',
}));

const commandPaletteStore = useCommandPaletteStore();
const { searchPrompt, filteredSearchResult, flatOptions } = storeToRefs(commandPaletteStore);

const selectedOptionIndex = ref(0);

// 全局快捷键注册 (Ctrl+K / Cmd+K / Esc)
const keys = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && e.type === 'keydown') {
      e.preventDefault();
    }
  },
});

whenever(isModalOpen, async () => {
  selectedOptionIndex.value = 0;
  await nextTick();
  inputRef.value?.focus();
});

whenever(keys.ctrl_k, open);
whenever(keys.meta_k, open);
whenever(keys.escape, close);

function open() {
  isModalOpen.value = true;
}

function close() {
  isModalOpen.value = false;
  searchPrompt.value = '';
  selectedOptionIndex.value = 0;
}

function clearPrompt() {
  searchPrompt.value = '';
  inputRef.value?.focus();
}

// 搜索词变更时，重置高亮索引到首项
watch(searchPrompt, () => {
  selectedOptionIndex.value = 0;
  if (resultsListRef.value) {
    resultsListRef.value.scrollTop = 0;
  }
});

// 获取选项在一维 flatOptions 数组中的实际下标
function getOptionIndex(target: PaletteOption): number {
  return flatOptions.value.findIndex(opt => (opt.id && opt.id === target.id) || opt.name === target.name);
}

// 收集选项 DOM 引用以便自动平滑滚动
function setOptionRef(el: any, index: number) {
  if (el?.$el) {
    optionRefs.value[index] = el.$el;
  } else if (el instanceof HTMLElement) {
    optionRefs.value[index] = el;
  }
}

// 自动滚动确保当前选中项在视口内
watch(selectedOptionIndex, async (idx) => {
  await nextTick();
  const targetEl = optionRefs.value[idx];
  if (targetEl && targetEl.scrollIntoView) {
    targetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
});

// 键盘导航处理
function handleKeydown(event: KeyboardEvent) {
  const { key } = event;
  const total = flatOptions.value.length;

  if (key === 'ArrowDown') {
    event.preventDefault();
    if (total > 0) {
      selectedOptionIndex.value = (selectedOptionIndex.value + 1) % total;
    }
  } else if (key === 'ArrowUp') {
    event.preventDefault();
    if (total > 0) {
      selectedOptionIndex.value = (selectedOptionIndex.value - 1 + total) % total;
    }
  } else if (key === 'Enter') {
    event.preventDefault();
    if (total > 0) {
      const activeOption = flatOptions.value[selectedOptionIndex.value];
      if (activeOption) {
        activateOption(activeOption);
      }
    }
  } else if (key === 'Escape') {
    event.preventDefault();
    close();
  }
}

// 激活并执行选中的命令或路由跳转
function activateOption(option: PaletteOption) {
  if (option.action) {
    option.action();
    if (option.closeOnSelect !== false) {
      close();
    }
    return;
  }

  if (option.to) {
    router.push(option.to);
    if (option.closeOnSelect !== false) {
      close();
    }
    return;
  }

  if (option.href) {
    window.open(option.href, '_blank');
    if (option.closeOnSelect !== false) {
      close();
    }
  }
}
</script>

<template>
  <div class="command-palette-wrapper">
    <!-- 顶栏触发按钮 (用于在具体子页面点击调出) -->
    <button
      type="button"
      class="nav-palette-trigger"
      :title="$t('search.label')"
      :aria-label="$t('search.label')"
      @click="open"
    >
      <div class="trigger-inner">
        <NIcon size="16" :component="IconSearch" class="trigger-icon" />
        <span class="trigger-text">{{ $t('search.label') }}</span>
        <span class="trigger-kbd">{{ isMac ? '⌘' : 'Ctrl' }} K</span>
      </div>
    </button>

    <!-- 模态浮层与 Spotlight 卡片容器 -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isModalOpen"
          class="palette-backdrop-overlay"
          :style="backdropStyle"
          @click="close"
          @keydown="handleKeydown"
        >
          <div class="spotlight-card" :style="cardStyle" @click.stop>
            <!-- 沉浸式搜索输入头部 (凹槽色阶区隔) -->
            <div class="spotlight-header" :style="headerStyle">
              <NIcon size="22" :component="IconSearch" class="search-lead-icon" />

              <input
                ref="inputRef"
                v-model="searchPrompt"
                type="text"
                class="spotlight-input"
                :style="inputStyle"
                :placeholder="$t('commandPalette.placeholder')"
                autocomplete="off"
                spellcheck="false"
              >

              <!-- 清空按钮 -->
              <button
                v-if="searchPrompt"
                type="button"
                class="clear-btn"
                :title="$t('home.search.clear')"
                @click="clearPrompt"
              >
                <NIcon size="16" :component="ClearIcon" />
              </button>

              <kbd class="esc-badge" :style="escBadgeStyle" @click="close">ESC</kbd>
            </div>

            <!-- 候选选项分组列表区 (实心表面，白底/深蓝底) -->
            <div ref="resultsListRef" class="spotlight-results-scroll" :style="resultsListStyle">
              <template v-if="flatOptions.length > 0">
                <div
                  v-for="(options, category) in filteredSearchResult"
                  :key="category"
                  class="category-group"
                >
                  <div class="category-header">
                    {{ category }}
                  </div>
                  <CommandPaletteOption
                    v-for="option in options"
                    :key="option.id || option.name"
                    :ref="(el) => setOptionRef(el, getOptionIndex(option))"
                    :option="option"
                    :selected="selectedOptionIndex === getOptionIndex(option)"
                    @activated="activateOption"
                  />
                </div>
              </template>

              <!-- 搜索无结果时的空状态 -->
              <div v-else class="empty-results-state">
                <NIcon size="36" :component="MoodEmptyIcon" class="empty-icon" />
                <div class="empty-title">{{ $t('commandPalette.emptyNotice') }}</div>
              </div>
            </div>

            <!-- 底部全键盘极客操作指引状态栏 (Keyboard Action Deck，下沉色阶区隔) -->
            <div class="spotlight-footer" :style="footerStyle">
              <div class="shortcut-guides">
                <span class="guide-item">
                  <kbd :style="kbdStyle">↑</kbd><kbd :style="kbdStyle">↓</kbd>
                  <span class="guide-label">{{ $t('commandPalette.shortcuts.navigate') }}</span>
                </span>
                <span class="guide-item">
                  <kbd :style="kbdStyle">↵</kbd>
                  <span class="guide-label">{{ $t('commandPalette.shortcuts.select') }}</span>
                </span>
                <span class="guide-item">
                  <kbd :style="kbdStyle">Esc</kbd>
                  <span class="guide-label">{{ $t('commandPalette.shortcuts.close') }}</span>
                </span>
              </div>

              <div v-if="searchPrompt && flatOptions.length > 0" class="match-count-indicator">
                {{ $t('home.search.matchCount', { count: flatOptions.length }) }}
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="less">
.command-palette-wrapper {
  display: inline-flex;
  align-items: center;
}

// 顶栏触发按钮
.nav-palette-trigger {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid v-bind('themeVars.borderColor');
  background-color: v-bind('themeVars.cardColor');
  color: v-bind('themeVars.textColor3');
  cursor: pointer;
  transition: all 0.18s ease;
  width: 220px;

  @media (max-width: 640px) {
    width: auto;
    padding: 0 8px;
  }

  &:hover {
    border-color: #2563eb;
    color: #2563eb;
  }

  .trigger-inner {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 8px;

    .trigger-icon {
      flex-shrink: 0;
    }

    .trigger-text {
      flex: 1;
      text-align: left;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      @media (max-width: 640px) {
        display: none;
      }
    }

    .trigger-kbd {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid v-bind('themeVars.borderColor');
      background-color: rgba(148, 163, 184, 0.1);
      color: v-bind('themeVars.textColor3');
      flex-shrink: 0;

      @media (max-width: 640px) {
        display: none;
      }
    }
  }
}

// 模态遮罩层 (深色半透明硬件加速，彻底移除 blur)
.palette-backdrop-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 10vh;
  padding-left: 16px;
  padding-right: 16px;
  will-change: opacity;
}

// Spotlight 一体化实心大卡片 (绝对实心，彻底阻断背景穿透)
.spotlight-card {
  width: 100%;
  max-width: 680px;
  border-radius: 16px;
  border-width: 1px;
  border-style: solid;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: translateZ(0);
}

// 沉浸式搜索输入头部 (内嵌凹槽色阶)
.spotlight-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;

  .search-lead-icon {
    color: #2563eb;
    flex-shrink: 0;
  }

  .spotlight-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 15px;
    font-weight: 500;

    &::placeholder {
      color: v-bind('placeholderColor');
      font-weight: 400;
      font-size: 14px;
    }
  }

  .clear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 9999px;
    border: none;
    background-color: rgba(148, 163, 184, 0.15);
    color: v-bind('placeholderColor');
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: rgba(148, 163, 184, 0.25);
    }
  }

  .esc-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 4px;
    border-width: 1px;
    border-style: solid;
    cursor: pointer;
  }
}

// 候选结果滚动区域 (带精致美化极细微滚动条)
.spotlight-results-scroll {
  max-height: 420px;
  overflow-y: auto;
  padding: 8px 0;

  // 自定义优雅极细圆角滚动条
  &::-webkit-scrollbar {
    width: 5px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(148, 163, 184, 0.25);
    border-radius: 9999px;

    &:hover {
      background-color: rgba(148, 163, 184, 0.45);
    }
  }

  .category-group {
    margin-bottom: 8px;

    .category-header {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #2563eb;
      opacity: 0.85;
      padding: 6px 20px 4px;
    }
  }
}

// 空状态呈现
.empty-results-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: v-bind('placeholderColor');

  .empty-icon {
    margin-bottom: 12px;
    opacity: 0.4;
  }

  .empty-title {
    font-size: 14px;
    font-weight: 500;
  }
}

// 底部键盘操作状态栏 (Keyboard Action Deck，下沉色阶)
.spotlight-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  font-size: 12px;

  .shortcut-guides {
    display: flex;
    align-items: center;
    gap: 16px;

    .guide-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;

      kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        font-size: 10px;
        font-family: inherit;
        font-weight: 600;
        border-radius: 3px;
        border-width: 1px;
        border-style: solid;
        box-shadow: 0 1px 1px rgba(0, 0, 0, 0.08);
      }

      .guide-label {
        font-size: 11px;
      }
    }
  }

  .match-count-indicator {
    font-size: 11px;
    font-weight: 600;
    color: #2563eb;
  }
}

// 纯 CSS 硬件加速秒开动画 (耗时 120ms，零掉帧)
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease-out;

  .spotlight-card {
    transition: transform 0.12s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
  }
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;

  .spotlight-card {
    transform: translateY(-8px) scale(0.98);
  }
}
</style>
