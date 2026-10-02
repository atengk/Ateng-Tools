<!--
  侧边栏扁平领域分类导航组件 (Flat Category Navigation)
  100% 对齐原型设计：仅包含全量工具、我的收藏与 8 大领域分类联动，不展开二级冗长子菜单

  @author Ateng
  @since 2026-10-02
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ToolCategory } from '@/tools/tools.types';
import { useToolStore } from '@/tools/tools.store';
import { useCategory } from '@/composable/category';

withDefaults(defineProps<{ toolsByCategory?: ToolCategory[] }>(), { toolsByCategory: () => [] });

const route = useRoute();
const router = useRouter();
const toolStore = useToolStore();
const { getCategoryTitle } = useCategory();

const categoryEmojiMap: Record<string, string> = {
  all: '🏠',
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

// 预定义 8 大领域标准顺序
const DOMAIN_CATEGORY_KEYS = [
  'dev',
  'converter',
  'security',
  'network',
  'text',
  'pdf',
  'media',
  'calc',
];

const totalToolsCount = computed(() => toolStore.tools.length);
const favoriteCount = computed(() => toolStore.favoriteTools.length);

const categoryList = computed(() => {
  return DOMAIN_CATEGORY_KEYS.map((key) => {
    const found = toolStore.toolsByCategory.find(
      c => c.name.toLowerCase() === key.toLowerCase() || getCategoryTitle(c.name).toLowerCase() === key.toLowerCase(),
    );
    return {
      key,
      emoji: categoryEmojiMap[key] || '📦',
      title: getCategoryTitle(key),
      count: found ? found.components.length : 0,
    };
  });
});

function handleCategorySelect(catKey: string) {
  toolStore.setSelectedCategory(catKey);
  if (route.path !== '/') {
    router.push('/');
  }
}
</script>

<template>
  <div class="sidebar-category-nav select-none flex flex-col space-y-1 text-xs px-3 py-2">
    <!-- 顶部分类导航分组标题 -->
    <div class="px-2 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
      {{ $t('home.sidebar.navigation', '分类导航') }}
    </div>

    <!-- 全部工具快捷项 -->
    <button
      type="button"
      class="nav-item w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all text-left border-none cursor-pointer"
      :class="route.path === '/' && toolStore.selectedCategory === 'all'
        ? 'active-nav bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent'"
      @click="handleCategorySelect('all')"
    >
      <div class="flex items-center gap-2.5">
        <span class="text-sm">🏠</span>
        <span>{{ $t('home.filter.all', '全部工具') }}</span>
      </div>
      <span
        class="count-badge px-1.5 py-0.5 rounded-full text-[10px] font-bold"
        :class="route.path === '/' && toolStore.selectedCategory === 'all'
          ? 'bg-blue-200/60 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300'
          : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'"
      >
        {{ totalToolsCount }}
      </span>
    </button>

    <!-- 我的收藏快捷项 -->
    <div class="pt-0.5">
      <button
        type="button"
        class="nav-item w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all text-left border-none cursor-pointer"
        :class="route.path === '/' && toolStore.selectedCategory === 'favorite'
          ? 'active-nav bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent'"
        @click="handleCategorySelect('favorite')"
      >
        <div class="flex items-center gap-2.5">
          <span class="text-amber-500 text-sm">⭐</span>
          <span>{{ $t('home.categories.favoriteTools', '我的收藏') }}</span>
        </div>
        <span class="count-badge px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          {{ favoriteCount }}
        </span>
      </button>
    </div>

    <!-- 领域分类分组标题 -->
    <div class="pt-3 px-2 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
      {{ $t('home.sidebar.domainCategories', '领域分类') }}
    </div>

    <!-- 8 大领域分类导航项 -->
    <button
      v-for="cat in categoryList"
      :key="cat.key"
      type="button"
      class="nav-item w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-all text-left border-none cursor-pointer"
      :class="route.path === '/' && (toolStore.selectedCategory === cat.key || toolStore.selectedCategory.toLowerCase() === cat.key.toLowerCase() || getCategoryTitle(cat.key) === toolStore.selectedCategory)
        ? 'active-nav bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent'"
      @click="handleCategorySelect(cat.key)"
    >
      <div class="flex items-center gap-2.5">
        <span class="text-sm">{{ cat.emoji }}</span>
        <span>{{ cat.title }}</span>
      </div>
      <span class="text-slate-400 text-[10px] font-normal">
        {{ cat.count }}
      </span>
    </button>
  </div>
</template>

<style scoped lang="less">
.nav-item {
  outline: none;

  &:hover {
    transform: translateX(1px);
  }
}
</style>
