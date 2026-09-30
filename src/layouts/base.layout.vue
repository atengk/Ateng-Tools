<script lang="ts" setup>
import { NIcon, useThemeVars } from 'naive-ui';
import { RouterLink, useRoute } from 'vue-router';
import { Menu2 } from '@vicons/tabler';
import { storeToRefs } from 'pinia';
import MenuLayout from '../components/MenuLayout.vue';
import NavbarButtons from '../components/NavbarButtons.vue';
import { useStyleStore } from '@/stores/style.store';
import type { ToolCategory } from '@/tools/tools.types';
import { useToolStore } from '@/tools/tools.store';
import CollapsibleToolMenu from '@/components/CollapsibleToolMenu.vue';

const themeVars = useThemeVars();
const styleStore = useStyleStore();
const route = useRoute();
const isHomePage = computed(() => route.path === '/');

const { t } = useI18n();

const toolStore = useToolStore();
const { favoriteTools, toolsByCategory } = storeToRefs(toolStore);

const tools = computed<ToolCategory[]>(() => [
  ...(favoriteTools.value.length > 0 ? [{ name: t('tools.categories.favorite-tools'), components: favoriteTools.value }] : []),
  ...toolsByCategory.value,
]);
</script>

<template>
  <MenuLayout class="menu-layout" :class="{ isSmallScreen: styleStore.isSmallScreen }">
    <template #sider>
      <!-- 左上角 64px 矢量品牌栏 -->
      <RouterLink to="/" class="brand-header">
        <div class="brand-logo">
          <svg class="brand-logo-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div class="brand-text">
          <div class="brand-title-wrap">
            <span class="brand-title">{{ $t('home.brand') }}</span>
            <span class="brand-badge">{{ $t('home.badge') }}</span>
          </div>
          <div class="brand-subtitle">
            {{ $t('home.subtitle') }}
          </div>
        </div>
      </RouterLink>

      <div class="sider-content">
        <div v-if="styleStore.isSmallScreen" flex flex-col items-center mb-4>
          <locale-selector w="90%" mb-2 />
          <div flex justify-center>
            <NavbarButtons />
          </div>
        </div>

        <!-- 侧边栏分类导航列表 (对齐原型) -->
        <CollapsibleToolMenu :tools-by-category="tools" />
      </div>
    </template>

    <template #content>
      <!-- 顶栏 Top Navbar (深度对齐原型) -->
      <header class="top-navbar">
        <!-- 顶栏左侧：收起展开按钮 + 页面标识 -->
        <div class="nav-left">
          <button
            type="button"
            class="hamburger-btn"
            :title="$t('home.toggleMenu')"
            :aria-label="$t('home.toggleMenu')"
            @click="styleStore.isMenuCollapsed = !styleStore.isMenuCollapsed"
          >
            <NIcon size="18" :component="Menu2" />
          </button>

          <router-link to="/" class="nav-brand-title-wrap">
            <span class="page-title">{{ isHomePage ? $t('home.breadcrumb.home', '首页控制台') : $t('home.brand', 'Ateng-Tools') }}</span>
          </router-link>
        </div>

        <!-- 顶栏右侧：搜索栏 + 语言选择 + 模式切换 + GitHub Star 按钮 -->
        <div class="nav-right">
          <command-palette class="nav-search-bar" />

          <locale-selector v-if="!styleStore.isSmallScreen" />

          <NavbarButtons v-if="!styleStore.isSmallScreen" />
        </div>
      </header>

      <slot />
    </template>
  </MenuLayout>
</template>

<style lang="less" scoped>
.top-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid v-bind('themeVars.borderColor');

  .nav-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .hamburger-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid v-bind('themeVars.borderColor');
      background-color: v-bind('themeVars.cardColor');
      color: v-bind('themeVars.textColor1');
      cursor: pointer;
      transition: all 0.18s ease;

      &:hover {
        border-color: #2563eb;
        color: #2563eb;
        background-color: rgba(37, 99, 235, 0.05);
      }
    }

    .nav-brand-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;

      .page-title {
        font-size: 15px;
        font-weight: 700;
        color: v-bind('themeVars.textColorBase');
      }
    }
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;

    .nav-search-bar {
      width: 240px;
      @media (max-width: 640px) {
        width: 140px;
      }
    }
  }
}

.sider-content {
  padding-top: 72px;
  padding-bottom: 40px;
}

.brand-header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  z-index: 10;
  text-decoration: none;
  border-bottom: 1px solid v-bind('themeVars.borderColor');
  background-color: v-bind('themeVars.cardColor');
  transition: all 0.2s ease;
  user-select: none;

  .brand-logo {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
    flex-shrink: 0;

    .brand-logo-icon {
      width: 20px;
      height: 20px;
    }
  }

  .brand-text {
    display: flex;
    flex-direction: column;
    min-width: 0;

    .brand-title-wrap {
      display: flex;
      align-items: center;
      gap: 6px;

      .brand-title {
        font-size: 16px;
        font-weight: 700;
        line-height: 1.2;
        color: v-bind('themeVars.textColorBase');
        letter-spacing: -0.01em;
      }

      .brand-badge {
        font-size: 10px;
        font-weight: 600;
        line-height: 1;
        padding: 2px 5px;
        border-radius: 4px;
        background-color: rgba(37, 99, 235, 0.1);
        border: 1px solid rgba(37, 99, 235, 0.25);
        color: #2563eb;
      }
    }

    .brand-subtitle {
      font-size: 11px;
      color: v-bind('themeVars.textColor3');
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style>
