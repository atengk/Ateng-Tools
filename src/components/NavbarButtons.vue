<script setup lang="ts">
import { IconBrandGithub, IconInfoCircle, IconMoon, IconSun } from '@tabler/icons-vue';
import { useThemeVars } from 'naive-ui';
import { useStyleStore } from '@/stores/style.store';

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
        <n-icon v-if="isDarkTheme" size="18" :component="IconSun" />
        <n-icon v-else size="18" :component="IconMoon" />
      </button>
    </c-tooltip>

    <!-- 关于按钮 -->
    <c-tooltip :tooltip="$t('home.nav.about')" position="bottom">
      <router-link to="/about" class="nav-btn icon-btn" :aria-label="$t('home.nav.aboutLabel')">
        <n-icon size="18" :component="IconInfoCircle" />
      </router-link>
    </c-tooltip>

    <!-- 原型同款 GitHub 仓库卡片按钮 -->
    <a
      href="https://github.com/atengk/Ateng-Tools"
      target="_blank"
      rel="noopener noreferrer"
      class="github-link-btn"
      :title="$t('home.nav.githubRepository')"
    >
      <n-icon size="16" :component="IconBrandGithub" />
      <span class="github-text">GitHub</span>
      <span class="star-badge">★ Star</span>
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
    border-color: #2563eb;
    color: #2563eb;
    background-color: rgba(37, 99, 235, 0.05);
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
  color: v-bind('themeVars.textColor1');
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.18s ease;

  &:hover {
    border-color: #2563eb;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.15);
  }

  .github-text {
    @media (max-width: 640px) {
      display: none;
    }
  }

  .star-badge {
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    padding: 2px 5px;
    border-radius: 4px;
    background-color: rgba(37, 99, 235, 0.12);
    color: #2563eb;

    @media (max-width: 640px) {
      display: none;
    }
  }
}
</style>
