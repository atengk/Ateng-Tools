<script setup lang="ts">
import { BrandGithub, Moon, Sun } from '@vicons/tabler';
import { useThemeVars } from 'naive-ui';
import { useStyleStore } from '@/stores/style.store';
import { brandTokens } from '@/styles/tokens';

const styleStore = useStyleStore();
const { isDarkTheme } = toRefs(styleStore);
const themeVars = useThemeVars();
</script>

<template>
  <div class="navbar-actions">
    <!-- 主题切换按钮 -->
    <c-tooltip :tooltip="isDarkTheme ? $t('home.nav.lightMode') : $t('home.nav.darkMode')" position="bottom">
      <button
        type="button"
        class="nav-btn icon-btn"
        :aria-label="$t('home.nav.mode')"
        @click="styleStore.toggleDark()"
      >
        <n-icon v-if="isDarkTheme" size="18" :component="Sun" />
        <n-icon v-else size="18" :component="Moon" />
      </button>
    </c-tooltip>

    <!-- 原型同款 GitHub Star 胶囊按钮 -->
    <a
      href="https://github.com/atengk/Ateng-Tools"
      target="_blank"
      rel="noopener noreferrer"
      class="github-link-btn"
      :title="$t('home.nav.githubRepository')"
    >
      <n-icon size="15" :component="BrandGithub" />
      <span class="star-text">Star</span>
    </a>
  </div>
</template>

<style lang="less" scoped>
.navbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid v-bind('themeVars.borderColor');
  background-color: v-bind('themeVars.cardColor');
  color: v-bind('themeVars.textColor2');
  cursor: pointer;
  text-decoration: none;
  transition: all 0.18s ease;

  &:hover {
    border-color: v-bind('themeVars.primaryColor');
    color: v-bind('themeVars.primaryColor');
    background-color: v-bind('brandTokens.primaryLightBg');
  }
}

.github-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid v-bind('themeVars.borderColor');
  background-color: v-bind('themeVars.cardColor');
  color: v-bind('themeVars.textColor2');
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: v-bind('themeVars.primaryColor');
    color: v-bind('themeVars.primaryColor');
    background-color: v-bind('brandTokens.primaryLightBg');
  }

  .star-text {
    font-size: 12px;
    font-weight: 500;
  }
}
</style>
