<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import { useThemeVars } from 'naive-ui';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import MenuIconItem from './MenuIconItem.vue';
import type { Tool, ToolCategory } from '@/tools/tools.types';
import { useToolStore } from '@/tools/tools.store';

const props = withDefaults(defineProps<{ toolsByCategory?: ToolCategory[] }>(), { toolsByCategory: () => [] });
const { toolsByCategory } = toRefs(props);
const route = useRoute();
const router = useRouter();
const toolStore = useToolStore();
const themeVars = useThemeVars();

const makeLabel = (tool: Tool) => () => h(RouterLink, { to: tool.path }, { default: () => tool.name });
const makeIcon = (tool: Tool) => () => h(MenuIconItem, { tool });

const categoryEmojiMap: Record<string, string> = {
  all: '🏠',
  '全部工具': '🏠',
  'all tools': '🏠',
  '我的常用收藏': '⭐',
  '我的收藏': '⭐',
  'favorite-tools': '⭐',
  'your favorite tools': '⭐',
  '开发': '💻',
  'development': '💻',
  '开发运维': '💻',
  '转换器': '🔄',
  'converter': '🔄',
  '格式转换': '🔄',
  '加密': '🔐',
  'crypto': '🔐',
  '加密安全': '🔐',
  '网络': '🌐',
  'network': '🌐',
  '网络测量': '🌐',
  '数学': '📐',
  'math': '📐',
  '测量': '📏',
  'measurement': '📏',
  '文本': '📝',
  'text': '📝',
  '数据': '📊',
  'data': '📊',
  '图片和视频': '🖼️',
  'images and videos': '🖼️',
  'images & videos': '🖼️',
  pdf: '📄',
  'pdf 工具': '📄',
  'pdf tools': '📄',
  web: '🌍',
  Web: '🌍',
};

function getCategoryEmoji(name: string): string {
  return categoryEmojiMap[name] || categoryEmojiMap[name.toLowerCase()] || '📦';
}

const collapsedCategories = useStorage<Record<string, boolean>>(
  'ateng-tools:collapsed-categories',
  {},
  undefined,
  {
    deep: true,
    serializer: {
      read: v => (v ? JSON.parse(v) : {}),
      write: v => JSON.stringify(v),
    },
  },
);

// 监听当前路由，智能自动展开激活工具所在的分类
watch(
  () => route.path,
  (currentPath) => {
    if (!currentPath || currentPath === '/') {
      return;
    }
    const matchedCategory = toolsByCategory.value.find(category =>
      category.components.some(tool => tool.path === currentPath),
    );
    if (matchedCategory) {
      collapsedCategories.value[matchedCategory.name] = false;
    }
  },
  { immediate: true },
);

function toggleCategoryCollapse(name: string, event?: Event) {
  if (event) {
    event.stopPropagation();
  }
  const current = collapsedCategories.value[name] ?? true;
  collapsedCategories.value[name] = !current;
}

function handleCategorySelect(name: string) {
  toolStore.setSelectedCategory(name);
  if (route.path !== '/') {
    router.push('/');
  }
}

const totalToolsCount = computed(() => toolStore.tools.length);

const menuOptions = computed(() =>
  toolsByCategory.value.map(({ name, components }) => {
    const isCurrentActive = components.some(tool => tool.path === route.path);
    const explicitlySet = name in collapsedCategories.value;
    const isCollapsed = explicitlySet ? collapsedCategories.value[name] : !isCurrentActive;

    return {
      name,
      count: components.length,
      isCollapsed,
      tools: components.map(tool => ({
        label: makeLabel(tool),
        icon: makeIcon(tool),
        key: tool.path,
      })),
    };
  }),
);
</script>

<template>
  <div class="sidebar-category-nav">
    <div class="nav-section-title">
      {{ $t('home.brand') }} · 分类导航
    </div>

    <!-- 全部工具快捷项 (对齐原型) -->
    <div
      class="category-nav-item"
      :class="{ active: route.path === '/' && toolStore.selectedCategory === 'all' }"
      @click="handleCategorySelect('all')"
    >
      <div class="item-left">
        <span class="category-icon">🏠</span>
        <span class="category-title">{{ $t('home.filter.all') }}</span>
      </div>
      <span class="count-pill highlight">
        {{ totalToolsCount }}
      </span>
    </div>

    <!-- 各分类导航手风琴列表 -->
    <div
      v-for="{ name, count, tools, isCollapsed } of menuOptions"
      :key="name"
      class="category-group"
    >
      <div
        class="category-nav-item"
        :class="{ active: route.path === '/' && toolStore.selectedCategory === name }"
        @click="handleCategorySelect(name)"
      >
        <div class="item-left">
          <span class="category-icon">{{ getCategoryEmoji(name) }}</span>
          <span class="category-title">{{ name }}</span>
        </div>

        <div class="item-right">
          <span class="count-pill">
            {{ count }}
          </span>
          <button
            type="button"
            class="collapse-toggle-btn"
            :title="isCollapsed ? '展开工具清单' : '折叠工具清单'"
            @click="toggleCategoryCollapse(name, $event)"
          >
            <span
              class="arrow-icon"
              :class="{ expanded: !isCollapsed }"
            >
              <icon-mdi-chevron-right />
            </span>
          </button>
        </div>
      </div>

      <n-collapse-transition :show="!isCollapsed">
        <div class="menu-sub-wrapper">
          <n-menu
            class="submenu"
            :value="route.path"
            :collapsed-width="64"
            :collapsed-icon-size="20"
            :options="tools"
            :indent="10"
            :default-expand-all="true"
          />
        </div>
      </n-collapse-transition>
    </div>
  </div>
</template>

<style scoped lang="less">
.sidebar-category-nav {
  padding: 0 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 10px 4px;
  color: v-bind('themeVars.textColor3');
}

.category-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.16s ease;
  user-select: none;
  border: 1px solid transparent;

  &:hover {
    background-color: rgba(37, 99, 235, 0.05);
  }

  &.active {
    background-color: rgba(37, 99, 235, 0.09);
    border-color: rgba(37, 99, 235, 0.25);

    .category-title {
      color: #2563eb;
      font-weight: 600;
    }

    .count-pill {
      background-color: rgba(37, 99, 235, 0.18);
      color: #2563eb;
      font-weight: 700;
    }
  }

  .item-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    .category-icon {
      font-size: 14px;
      line-height: 1;
      flex-shrink: 0;
    }

    .category-title {
      font-size: 13px;
      color: v-bind('themeVars.textColor2');
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .item-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .count-pill {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 9999px;
    background-color: rgba(148, 163, 184, 0.16);
    color: v-bind('themeVars.textColor3');
    font-weight: 500;
    line-height: 1.2;

    &.highlight {
      background-color: rgba(37, 99, 235, 0.12);
      color: #2563eb;
      font-weight: 700;
    }
  }

  .collapse-toggle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: v-bind('themeVars.textColor3');
    padding: 0;
    transition: all 0.16s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.06);
      color: v-bind('themeVars.textColor1');
    }

    .arrow-icon {
      display: inline-flex;
      transform: rotate(0deg);
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &.expanded {
        transform: rotate(90deg);
      }
    }
  }
}

.menu-sub-wrapper {
  padding-left: 12px;
  margin: 2px 0 6px 12px;
  border-left: 2px solid rgba(148, 163, 184, 0.2);

  .submenu {
    ::v-deep(.n-menu-item) {
      height: 34px;
    }
    ::v-deep(.n-menu-item-content) {
      font-size: 12px;
    }
  }
}
</style>
