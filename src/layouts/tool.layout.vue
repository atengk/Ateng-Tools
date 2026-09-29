<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router';
import { useThemeVars } from 'naive-ui';
import { useHead } from '@vueuse/head';
import type { HeadObject } from '@vueuse/head';

import BaseLayout from './base.layout.vue';
import FavoriteButton from '@/components/FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';
import { useToolStore } from '@/tools/tools.store';

const themeVars = useThemeVars();
const route = useRoute();
const router = useRouter();
const toolStore = useToolStore();

const { t } = useI18n();

const i18nKey = computed<string>(() => route.path.trim().replace('/', ''));
const toolTitle = computed<string>(() => t(`tools.${i18nKey.value}.title`, String(route.meta.name)));
const toolDescription = computed<string>(() => t(`tools.${i18nKey.value}.description`, String(route.meta.description)));
const currentTool = computed(() => toolStore.tools.find(tool => tool.path === route.path));

function navigateCategory(cat: string) {
  toolStore.selectedCategory = cat;
  router.push('/');
}

const head = computed<HeadObject>(() => ({
  title: `${toolTitle.value} - Ateng-Tools`,
  meta: [
    {
      name: 'description',
      content: toolDescription.value,
    },
    {
      name: 'keywords',
      content: ((route.meta.keywords ?? []) as string[]).join(','),
    },
  ],
}));
useHead(head);
</script>

<template>
  <BaseLayout>
    <div class="tool-layout">
      <!-- 微型轻量面包屑导航 (对齐原型) -->
      <nav class="tool-breadcrumb" aria-label="Breadcrumb">
        <router-link to="/" class="breadcrumb-item breadcrumb-link">
          <svg class="breadcrumb-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {{ $t('home.breadcrumb.home', '首页控制台') }}
        </router-link>
        <span class="breadcrumb-separator">/</span>
        <span
          v-if="currentTool?.category"
          class="breadcrumb-item breadcrumb-link clickable-category"
          @click="navigateCategory(currentTool.category)"
        >
          {{ currentTool.category }}
        </span>
        <span v-if="currentTool?.category" class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item breadcrumb-current" aria-current="page">
          {{ toolTitle }}
        </span>
      </nav>

      <div class="tool-header">
        <div flex flex-nowrap items-center justify-between>
          <n-h1>
            {{ toolTitle }}
          </n-h1>

          <div>
            <FavoriteButton :tool="{ name: route.meta.name, path: route.path } as Tool" />
          </div>
        </div>

        <div class="separator" />

        <div class="description">
          {{ toolDescription }}
        </div>
      </div>
    </div>

    <div class="tool-content">
      <slot />
    </div>
  </BaseLayout>
</template>

<style lang="less" scoped>
.tool-content {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;

  ::v-deep(& > *) {
    flex: 0 1 600px;
  }
}

.tool-layout {
  max-width: 600px;
  margin: 0 auto;
  box-sizing: border-box;

  .tool-breadcrumb {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding-top: 16px;
    font-size: 13px;

    .breadcrumb-link {
      color: v-bind('themeVars.textColor3');
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      transition: color 0.15s ease;

      &:hover {
        color: #2563eb;
      }

      .breadcrumb-icon {
        width: 14px;
        height: 14px;
      }
    }

    .clickable-category {
      &:hover {
        text-decoration: underline;
      }
    }

    .breadcrumb-separator {
      color: v-bind('themeVars.textColorDisabled');
      font-size: 11px;
      user-select: none;
    }

    .breadcrumb-current {
      color: v-bind('themeVars.textColor1');
      font-weight: 500;
    }
  }

  .tool-header {
    padding: 16px 0 40px;
    width: 100%;

    .n-h1 {
      opacity: 0.9;
      font-size: 40px;
      font-weight: 400;
      margin: 0;
      line-height: 1;
    }

    .separator {
      width: 200px;
      height: 2px;
      background: rgb(161, 161, 161);
      opacity: 0.2;

      margin: 10px 0;
    }

    .description {
      margin: 0;

      opacity: 0.7;
    }
  }
}
</style>
