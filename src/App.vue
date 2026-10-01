<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import { NDialogProvider, NGlobalStyle, NLoadingBarProvider, NMessageProvider, NNotificationProvider, darkTheme, dateZhCN, zhCN } from 'naive-ui';
import { darkThemeOverrides, lightThemeOverrides } from './themes';
import { layouts } from './layouts';
import { useStyleStore } from './stores/style.store';
import AppGlobalBridge from './components/AppGlobalBridge.vue';

const route = useRoute();
const layout = computed(() => route?.meta?.layout ?? layouts.base);
const styleStore = useStyleStore();

const theme = computed(() => (styleStore.isDarkTheme ? darkTheme : null));
const themeOverrides = computed(() => (styleStore.isDarkTheme ? darkThemeOverrides : lightThemeOverrides));

const { locale } = useI18n();

const naiveLocale = computed(() => (locale.value === 'zh' ? zhCN : null));
const naiveDateLocale = computed(() => (locale.value === 'zh' ? dateZhCN : null));

syncRef(
  locale,
  useStorage('locale', 'zh'),
);
</script>

<template>
  <n-config-provider
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
  >
    <NGlobalStyle />
    <NLoadingBarProvider>
      <NDialogProvider>
        <NNotificationProvider placement="bottom-right">
          <NMessageProvider placement="bottom">
            <AppGlobalBridge>
              <component :is="layout">
                <RouterView />
              </component>
            </AppGlobalBridge>
          </NMessageProvider>
        </NNotificationProvider>
      </NDialogProvider>
    </NLoadingBarProvider>
  </n-config-provider>
</template>

<style>
body {
  min-height: 100%;
  margin: 0;
  padding: 0;
}

html {
  height: 100%;
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}
</style>
