<script setup lang="ts">
import { IconDragDrop } from '@tabler/icons-vue';
import { useHead } from '@vueuse/head';
import { computed, ref } from 'vue';
import Draggable from 'vuedraggable';
import { useThemeVars } from 'naive-ui';
import ToolCard from '../components/ToolCard.vue';
import { useToolStore } from '@/tools/tools.store';
import { useCategory } from '@/composable/category';

const toolStore = useToolStore();
const theme = useThemeVars();
const { t } = useI18n();
const { getCategoryTitle } = useCategory();

useHead({
  title: computed(() => `${t('home.brand')} - ${t('home.subtitle')}`),
});

const favoriteTools = computed(() => toolStore.favoriteTools);

// Selected category filter: synchronized with toolStore for sidebar navigation
const selectedCategory = computed({
  get: () => toolStore.selectedCategory,
  set: (val: string) => toolStore.setSelectedCategory(val),
});

const categoryOptions = computed(() => {
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

          <div class="hero-stats">
            <div class="stat-item">
              <span class="dot bg-blue" />
              <span class="stat-label">{{ $t('home.hero.stats.total') }}</span>
              <strong class="stat-val">{{ toolStore.tools.length }} {{ $t('home.hero.stats.unit') }}</strong>
            </div>

            <div class="stat-item">
              <span class="dot bg-green" />
              <span class="stat-label">{{ $t('home.hero.stats.new') }}</span>
              <strong class="stat-val">{{ toolStore.newTools.length }} {{ $t('home.hero.stats.unit') }}</strong>
            </div>

            <div class="stat-item">
              <span class="dot bg-amber" />
              <span class="stat-label">{{ $t('home.hero.stats.privacy') }}</span>
              <strong class="stat-val">{{ $t('home.hero.stats.privacyValue') }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的常用收藏区 -->
      <div class="favorites-section">
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
            <strong>{{ selectedCategory === 'all' ? $t('home.filter.all') : getCategoryTitle(selectedCategory) }}</strong>
          </div>
        </div>

        <!-- 工具卡片网格 -->
        <div v-if="filteredTools.length > 0" class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4 mt-4">
          <ToolCard v-for="tool in filteredTools" :key="tool.name" :tool="tool" />
        </div>
        <div v-else class="empty-search-state">
          {{ $t('home.filter.noMatch') }}
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
    margin: 0 0 18px;
    color: v-bind('theme.textColor2');
  }

  .hero-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      border: 1px solid v-bind('theme.borderColor');
      background-color: v-bind('theme.cardColor');

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;

        &.bg-blue { background-color: #2563eb; }
        &.bg-green { background-color: #10b981; }
        &.bg-amber { background-color: #f59e0b; }
      }

      .stat-label {
        color: v-bind('theme.textColor3');
      }

      .stat-val {
        color: v-bind('theme.textColorBase');
        font-weight: 700;
      }
    }
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
