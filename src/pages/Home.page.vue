<script setup lang="ts">
import { IconDragDrop } from '@tabler/icons-vue';
import { useHead } from '@vueuse/head';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Draggable from 'vuedraggable';
import { useThemeVars } from 'naive-ui';
import ToolCard from '../components/ToolCard.vue';
import HomepageToolSearchFilter from '../components/HomepageToolSearchFilter.vue';
import { useToolStore } from '@/tools/tools.store';
import { useCategory } from '@/composable/category';
import { useToolSearch } from '@/composable/toolSearch';

const toolStore = useToolStore();
const theme = useThemeVars();
const router = useRouter();
const { t } = useI18n();
const { getCategoryTitle } = useCategory();

useHead({
  title: computed(() => `${t('home.brand')} - ${t('home.subtitle')}`),
});

const favoriteTools = computed(() => toolStore.favoriteTools);

// 搜索文本与状态机
const searchQuery = ref('');
const isSearching = computed(() => searchQuery.value.trim().length > 0);
const previousCategory = ref<string>('all');
const searchFilterRef = ref<InstanceType<typeof HomepageToolSearchFilter>>();
const activeCardIndex = ref(0);

// Selected category filter: synchronized with toolStore for sidebar navigation
const selectedCategory = computed({
  get: () => toolStore.selectedCategory,
  set: (val: string) => toolStore.setSelectedCategory(val),
});

// 全库多维拼音检索管线
const { searchResult, filteredTools: searchedTools } = useToolSearch({
  tools: computed(() => toolStore.tools),
  searchQuery,
});

// 快速索引检索结果元数据（高亮区间与 Match Cue Badge）
const searchResultMap = computed(() => {
  const map = new Map<string, (typeof searchResult.value)[number]>();
  if (isSearching.value) {
    for (const item of searchResult.value) {
      map.set(item.tool.path, item);
    }
  }
  return map;
});

// 监听搜索词变化重置键盘聚焦项
watch(searchQuery, () => {
  activeCardIndex.value = 0;
});

// 监听搜索状态，实现全库穿透与分类记忆无缝还原
watch(isSearching, (searching) => {
  if (searching) {
    if (selectedCategory.value !== 'all') {
      previousCategory.value = selectedCategory.value;
      selectedCategory.value = 'all';
    }
  } else {
    if (previousCategory.value && previousCategory.value !== 'all') {
      selectedCategory.value = previousCategory.value;
    }
  }
});

function onClearSearch() {
  searchQuery.value = '';
  if (previousCategory.value && previousCategory.value !== 'all') {
    selectedCategory.value = previousCategory.value;
  }
}

function onArrowDown() {
  if (filteredTools.value.length === 0) return;
  activeCardIndex.value = (activeCardIndex.value + 1) % filteredTools.value.length;
}

function onArrowUp() {
  if (filteredTools.value.length === 0) return;
  activeCardIndex.value = (activeCardIndex.value - 1 + filteredTools.value.length) % filteredTools.value.length;
}

function onSubmitSearch() {
  if (filteredTools.value.length === 0) return;
  const target = filteredTools.value[activeCardIndex.value] || filteredTools.value[0];
  if (target?.path) {
    router.push(target.path);
  }
}

// 辅助检测当前焦点是否处于表单输入控件中
function isEditableElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || el.isContentEditable;
}

function handleGlobalKeydown(e: KeyboardEvent) {
  const isCtrlOrMetaK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
  if (isCtrlOrMetaK) {
    e.preventDefault();
    searchFilterRef.value?.focus();
    return;
  }

  if (e.key === '/' && !isEditableElement(e.target)) {
    e.preventDefault();
    searchFilterRef.value?.focus();
  } else if (e.key === 'Escape' && isSearching.value) {
    onClearSearch();
    searchFilterRef.value?.blur();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});

const categoryOptions = computed(() => {
  if (isSearching.value) {
    return [
      { key: 'all', label: t('home.filter.all'), count: searchedTools.value.length },
    ];
  }
  return [
    { key: 'all', label: t('home.filter.all'), count: toolStore.tools.length },
    ...toolStore.toolsByCategory.map(cat => ({
      key: cat.name,
      label: getCategoryTitle(cat.name),
      count: cat.components.length,
    })),
  ];
});

const filteredTools = computed(() => {
  if (isSearching.value) {
    return searchedTools.value;
  }
  if (selectedCategory.value === 'all') {
    return toolStore.tools;
  }
  return toolStore.tools.filter(tool => tool.category === selectedCategory.value);
});

// Update favorite tools order when drag is finished
function onUpdateFavoriteTools() {
  toolStore.updateFavoriteTools(favoriteTools.value);
}
</script>

<template>
  <div class="home-page-container">
    <div class="content-wrapper">
      <!-- 现代化 Hero 欢迎卡片 -->
      <div class="hero-banner">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="hero-badge-icon">🛠️</span>
            <span class="hero-badge-title">{{ $t('home.hero.badge') }}</span>
            <span class="pulse-dot" />
            <span class="hero-badge-sub">{{ $t('home.hero.architecture') }}</span>
          </div>

          <h1 class="hero-title">
            {{ $t('home.hero.title') }}
          </h1>

          <p class="hero-desc">
            {{ $t('home.hero.description') }}
          </p>
        </div>
      </div>

      <!-- 首页即时搜索过滤栏 Homepage Tool Search Filter -->
      <HomepageToolSearchFilter
        ref="searchFilterRef"
        v-model="searchQuery"
        :matched-count="searchedTools.length"
        :is-searching="isSearching"
        @clear="onClearSearch"
        @submit="onSubmitSearch"
        @arrow-down="onArrowDown"
        @arrow-up="onArrowUp"
      />

      <!-- 我的常用收藏区 (非空搜索时平滑折叠) -->
      <transition name="fade">
        <div v-show="!isSearching" class="favorites-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="star-icon">★</span>
              <span>{{ $t('home.categories.favoriteTools') }}</span>
              <span class="count-badge">{{ favoriteTools.length }}</span>
              <c-tooltip :tooltip="$t('home.categories.favoritesDndToolTip')">
                <n-icon :component="IconDragDrop" size="16" class="cursor-help opacity-60 hover:opacity-100" />
              </c-tooltip>
            </h2>
            <span class="section-hint">{{ $t('home.filter.favoriteHint') }}</span>
          </div>

          <transition name="height">
            <div v-if="favoriteTools.length > 0">
              <Draggable
                :list="favoriteTools"
                class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4"
                ghost-class="ghost-favorites-draggable"
                item-key="name"
                @end="onUpdateFavoriteTools"
              >
                <template #item="{ element: tool }">
                  <ToolCard :tool="tool" />
                </template>
              </Draggable>
            </div>
            <div v-else class="empty-favorites">
              {{ $t('home.filter.noFavorites') }}
            </div>
          </transition>
        </div>
      </transition>

      <!-- 分类标签过滤器 Tool Category Filter -->
      <div class="category-filter-section">
        <div class="filter-bar">
          <div class="category-pills">
            <button
              v-for="cat in categoryOptions"
              :key="cat.key"
              type="button"
              class="cat-pill"
              :class="{ active: selectedCategory === cat.key }"
              @click="selectedCategory = cat.key"
            >
              <span>{{ cat.label }}</span>
              <span class="pill-count">({{ cat.count }})</span>
            </button>
          </div>

          <div class="current-cat-indicator">
            <span>{{ $t('home.filter.current') }}</span>
            <strong>{{ isSearching ? $t('home.search.matchCount', { count: searchedTools.length }) : (selectedCategory === 'all' ? $t('home.filter.all') : getCategoryTitle(selectedCategory)) }}</strong>
          </div>
        </div>

        <!-- 工具卡片网格 -->
        <div v-if="filteredTools.length > 0" class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4 mt-4">
          <ToolCard
            v-for="(tool, index) in filteredTools"
            :key="tool.name"
            :tool="tool"
            :match-range="searchResultMap.get(tool.path)?.matchRange"
            :match-cue-type="searchResultMap.get(tool.path)?.matchCueType"
            :match-cue-value="searchResultMap.get(tool.path)?.matchCueValue"
            :is-active="isSearching && activeCardIndex === index"
          />
        </div>
        <div v-else class="empty-search-state">
          <p>{{ $t('home.filter.noMatch') }}</p>
          <c-button v-if="isSearching" size="small" class="mt-3" @click="onClearSearch">
            {{ $t('home.search.clear') }}
          </c-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.home-page-container {
  padding: 24px 0 60px;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero-banner {
  border-radius: 16px;
  padding: 24px 28px;
  border: 1px solid rgba(37, 99, 235, 0.22);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(248, 250, 252, 0.95) 55%, rgba(59, 130, 246, 0.04) 100%);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  :root.dark & {
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(30, 41, 59, 0.8) 100%);
    border-color: rgba(37, 99, 235, 0.3);
  }

  .hero-content {
    max-width: 800px;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 12px;
    border: 1px solid rgba(37, 99, 235, 0.2);
    background-color: v-bind('theme.cardColor');
    color: v-bind('theme.primaryColor');

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #2563eb;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .hero-badge-sub {
      font-weight: 400;
      color: v-bind('theme.textColor3');
    }
  }

  .hero-title {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: normal;
    margin: 0 0 10px;
    color: v-bind('theme.textColorBase');
  }

  .hero-desc {
    font-size: 13px;
    line-height: 1.6;
    margin: 0;
    color: v-bind('theme.textColor2');
  }
}

.favorites-section {
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .section-title {
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      color: v-bind('theme.textColorBase');
      margin: 0;

      .star-icon {
        color: #f59e0b;
        font-size: 16px;
      }

      .count-badge {
        font-size: 11px;
        padding: 2px 7px;
        border-radius: 9999px;
        background-color: rgba(148, 163, 184, 0.15);
        color: v-bind('theme.textColor3');
        font-weight: 600;
      }
    }

    .section-hint {
      font-size: 12px;
      color: v-bind('theme.textColor3');
    }
  }

  .empty-favorites {
    padding: 20px;
    text-align: center;
    font-size: 12px;
    border-radius: 12px;
    border: 1px dashed v-bind('theme.borderColor');
    color: v-bind('theme.textColor3');
  }
}

.category-filter-section {
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 14px;
    border-bottom: 1px solid v-bind('theme.borderColor');

    .category-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      @media (max-width: 768px) {
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 6px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;

        &::-webkit-scrollbar {
          display: none;
        }

        .cat-pill {
          flex-shrink: 0;
          white-space: nowrap;
        }
      }

      .cat-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.18s ease;
        border: 1px solid v-bind('theme.borderColor');
        background-color: v-bind('theme.cardColor');
        color: v-bind('theme.textColor2');

        &:hover {
          border-color: v-bind('theme.primaryColor');
          color: v-bind('theme.primaryColor');
        }

        &.active {
          background-color: v-bind('theme.primaryColor');
          border-color: v-bind('theme.primaryColor');
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);

          .pill-count {
            opacity: 0.85;
          }
        }

        .pill-count {
          font-size: 11px;
          opacity: 0.7;
        }
      }
    }

    .current-cat-indicator {
      font-size: 12px;
      color: v-bind('theme.textColor3');

      strong {
        color: v-bind('theme.primaryColor');
        margin-left: 4px;
      }
    }
  }

  .empty-search-state {
    padding: 36px 20px;
    text-align: center;
    font-size: 12px;
    border-radius: 12px;
    border: 1px dashed v-bind('theme.borderColor');
    color: v-bind('theme.textColor3');
    margin-top: 16px;
  }
}

.ghost-favorites-draggable {
  opacity: 0.4;
  background-color: #ccc;
  border: 2px dashed #666;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  transform: scale(1.05);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
