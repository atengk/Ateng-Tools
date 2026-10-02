<script setup lang="ts">
import { useHead } from '@vueuse/head';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Draggable from 'vuedraggable';
import { useThemeVars } from 'naive-ui';
import ToolCard from '../components/ToolCard.vue';
import FavoriteChipTile from '../components/FavoriteChipTile.vue';
import HomepageToolSearchFilter from '../components/HomepageToolSearchFilter.vue';
import { useToolStore } from '@/tools/tools.store';
import { useCategory } from '@/composable/category';
import { useToolSearch } from '@/composable/toolSearch';
import { brandTokens } from '@/styles/tokens';
import {
  Calculator as IconCalculator,
  Code as IconCode,
  File as IconFile,
  FileText as IconFileText,
  Home as IconHome,
  Photo as IconPhoto,
  Refresh as IconRefresh,
  ShieldLock as IconShieldLock,
  World as IconWorld,
} from '@vicons/tabler';

const categoryIconMap: Record<string, any> = {
  all: IconHome,
  dev: IconCode,
  converter: IconRefresh,
  security: IconShieldLock,
  network: IconWorld,
  text: IconFileText,
  pdf: IconFile,
  media: IconPhoto,
  calc: IconCalculator,
};

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

const categoryEmojiMap: Record<string, string> = {
  all: '',
  favorite: '⭐',
  dev: '💻',
  converter: '🔄',
  security: '🔐',
  network: '🌐',
  text: '📝',
  pdf: '📄',
  media: '🖼️',
  calc: '📐',
};

const categoryOptions = computed(() => {
  if (isSearching.value) {
    return [
      {
        key: 'all',
        label: t('home.filter.all'),
        count: searchedTools.value.length,
        emoji: '',
        icon: categoryIconMap.all,
      },
    ];
  }
  return [
    {
      key: 'all',
      label: t('home.filter.all'),
      count: toolStore.tools.length,
      emoji: '',
      icon: categoryIconMap.all,
    },
    ...toolStore.toolsByCategory.map(cat => ({
      key: cat.name,
      label: getCategoryTitle(cat.name),
      count: cat.components.length,
      emoji: categoryEmojiMap[cat.name] || '',
      icon: categoryIconMap[cat.name] || IconHome,
    })),
  ];
});

const filteredTools = computed(() => {
  if (isSearching.value) {
    return searchedTools.value;
  }
  const sel = selectedCategory.value?.toLowerCase() || 'all';
  if (sel === 'all') {
    return toolStore.tools;
  }
  if (sel === 'favorite') {
    return favoriteTools.value;
  }
  return toolStore.tools.filter((tool) => {
    const cat = tool.category?.toLowerCase() || '';
    return cat === sel || getCategoryTitle(cat).toLowerCase() === sel;
  });
});

// Update favorite tools order when drag is finished
function onUpdateFavoriteTools() {
  toolStore.updateFavoriteTools(favoriteTools.value);
}
</script>

<template>
  <div class="home-page-container">
    <div class="content-wrapper">
      <!-- 现代化通透超薄 Hero 门户 (Portal Hero Section - 单行居中同行) -->
      <section class="hero-banner">
        <div class="hero-header-row">
          <div class="hero-badge">
            <span class="pulse-dot" />
            <span class="hero-badge-title">{{ $t('home.hero.badge') }}</span>
          </div>

          <h1 class="hero-title">
            {{ $t('home.hero.title') }}
          </h1>
        </div>
      </section>

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

      <!-- 我的常用收藏区 (灵动收藏货架：横向弹性磁贴芯片组，0 收藏静默隐藏) -->
      <transition name="fade">
        <section v-if="!isSearching && favoriteTools.length > 0" class="favorites-section">
          <div class="section-header">
            <div class="section-title-wrap">
              <span class="star-icon">★</span>
              <span class="section-title-text">{{ $t('home.categories.favoriteTools') }}</span>
              <span class="count-badge">{{ favoriteTools.length }}</span>
              <span class="section-sub-hint text-slate-400 text-[11px] font-normal hidden sm:inline">{{ $t('home.filter.favoriteHint') }}</span>
            </div>
          </div>

          <div class="favorites-flow flex flex-wrap items-center gap-2.5">
            <Draggable
              :list="favoriteTools"
              class="flex flex-wrap items-center gap-2.5"
              ghost-class="ghost-favorites-draggable"
              item-key="name"
              @end="onUpdateFavoriteTools"
            >
              <template #item="{ element: tool }">
                <FavoriteChipTile :tool="tool" />
              </template>
            </Draggable>
          </div>
        </section>
      </transition>

      <!-- 分类标签过滤器 Tool Category Filter -->
      <section class="category-filter-section">
        <div class="filter-bar">
          <div class="category-pills">
            <button
              v-for="cat in categoryOptions"
              :key="cat.key"
              type="button"
              class="cat-pill"
              :class="{ active: selectedCategory === cat.key || selectedCategory.toLowerCase() === cat.key.toLowerCase() }"
              @click="selectedCategory = cat.key"
            >
              <span v-if="cat.emoji" class="pill-emoji">{{ cat.emoji }}</span>
              <span>{{ cat.label }}</span>
              <span class="pill-count">({{ cat.count }})</span>
            </button>
          </div>

          <!-- 右侧精炼统计信息 (搜索时动态呈现，非搜索时保持清爽静默) -->
          <div v-if="isSearching" class="search-result-stat text-xs text-slate-400">
            <span>{{ $t('home.search.matchCount', { count: searchedTools.length }) }}</span>
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
      </section>
    </div>
  </div>
</template>

<style scoped lang="less">
.home-page-container {
  padding: 0 0 60px;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 1360px;
  margin: 0 auto;
  width: 100%;
  padding: 0 20px;
  box-sizing: border-box;

  @media (max-width: 640px) {
    padding: 0 12px;
    gap: 12px;
  }
}

.hero-banner {
  text-align: center;
  padding: 4px 12px 0;
  margin: 0 auto;
  max-width: 900px;
  background: transparent;
  border: none;
  box-shadow: none;

  .hero-header-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid rgba(16, 185, 129, 0.3);
    background-color: rgba(16, 185, 129, 0.08);
    color: #059669;

    :root.dark & {
      border-color: rgba(16, 185, 129, 0.25);
      background-color: rgba(16, 185, 129, 0.12);
      color: #34d399;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #10b981;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  }

  .hero-title {
    font-size: 20px;
    font-weight: 900;
    line-height: 1.3;
    letter-spacing: normal;
    margin: 0;
    color: v-bind('theme.textColorBase');

    @media (max-width: 640px) {
      font-size: 17px;
    }
  }
}

.favorites-section {
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;

      .star-icon {
        color: #f59e0b;
        font-size: 15px;
      }

      .section-title-text {
        font-size: 13px;
        font-weight: 700;
        color: #d97706;

        :root.dark & {
          color: #f59e0b;
        }
      }

      .count-badge {
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 9999px;
        background-color: rgba(245, 158, 11, 0.15);
        color: #d97706;
        font-weight: 700;

        :root.dark & {
          color: #fbbf24;
        }
      }
    }
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
        gap: 6px;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.18s ease;
        border: 1px solid v-bind('theme.borderColor');
        background-color: v-bind('theme.cardColor');
        color: v-bind('theme.textColor2');

        .cat-pill-icon {
          flex-shrink: 0;
          transition: transform 0.15s ease;
        }

        &:hover {
          border-color: v-bind('theme.primaryColor');
          color: v-bind('theme.primaryColor');

          .cat-pill-icon {
            transform: scale(1.1);
          }
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

    .search-result-stat {
      font-size: 12px;
      color: v-bind('theme.textColor3');
      font-weight: 500;
      white-space: nowrap;
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
