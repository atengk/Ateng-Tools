<script setup lang="ts">
const { availableLocales, locale } = useI18n();

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
  <c-select
    v-model:value="locale"
    :options="localeOptions"
    :placeholder="$t('home.nav.selectLanguage', '选择语言')"
    w-100px
  />
</template>
