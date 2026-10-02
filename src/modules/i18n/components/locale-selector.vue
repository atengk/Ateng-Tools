<!--
  语言切换胶囊按钮 (Locale Pill Selector)
  对齐原型样式：34px 统一几何高度微边框药丸，点击唤起语言选项

  @author Ateng
  @since 2026-10-02
-->
<script setup lang="ts">
import { computed } from 'vue';
import { NPopselect, useThemeVars } from 'naive-ui';

const { availableLocales, locale } = useI18n();
const themeVars = useThemeVars();

const supportedLocales = ['zh', 'en'];

const localesLong: Record<string, string> = {
  zh: '简体中文',
  en: 'English',
};

const localeOptions = computed(() =>
  supportedLocales
    .filter(loc => availableLocales.includes(loc))
    .map(loc => ({
      label: localesLong[loc] ?? loc,
      value: loc,
    })),
);
</script>

<template>
  <n-popselect v-model:value="locale" :options="localeOptions" trigger="click">
    <button type="button" class="locale-pill-btn select-none" :title="$t('home.nav.selectLanguage', '切换语言')">
      <span>{{ localesLong[locale] ?? '简体中文' }}</span>
    </button>
  </n-popselect>
</template>

<style lang="less" scoped>
.locale-pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid v-bind('themeVars.borderColor');
  background-color: v-bind('themeVars.cardColor');
  color: v-bind('themeVars.textColor2');
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: v-bind('themeVars.primaryColor');
    color: v-bind('themeVars.primaryColor');
  }
}
</style>
