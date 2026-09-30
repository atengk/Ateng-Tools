<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { codesByCategories } from './http-status-codes.constants';
import { useFuzzySearch } from '@/composable/fuzzySearch';

const { t } = useI18n();

const search = ref('');

const { searchResult } = useFuzzySearch({
  search,
  data: codesByCategories.flatMap(({ codes, category }) => codes.map(code => ({ ...code, category }))),
  options: {
    keys: [{ name: 'code', weight: 3 }, { name: 'name', weight: 2 }, 'description', 'category'],
  },
});

function getCategoryTitle(category: string) {
  if (category === 'Search results') {
    return t('tools.http-status-codes.searchResults', 'Search results');
  }
  if (category.startsWith('1xx')) {
    return t('tools.http-status-codes.category1xx', '1xx informational response');
  }
  if (category.startsWith('2xx')) {
    return t('tools.http-status-codes.category2xx', '2xx success');
  }
  if (category.startsWith('3xx')) {
    return t('tools.http-status-codes.category3xx', '3xx redirection');
  }
  if (category.startsWith('4xx')) {
    return t('tools.http-status-codes.category4xx', '4xx client errors');
  }
  if (category.startsWith('5xx')) {
    return t('tools.http-status-codes.category5xx', '5xx server errors');
  }
  return category;
}

const codesByCategoryFiltered = computed(() => {
  if (!search.value) {
    return codesByCategories;
  }

  return [{ category: 'Search results', codes: searchResult.value }];
});
</script>

<template>
  <div>
    <c-input-text
      v-model:value="search"
      :placeholder="$t('tools.http-status-codes.searchPlaceholder', 'Search http status...')"
      autofocus
      raw-text
      mb-10
    />

    <div v-for="{ codes, category } of codesByCategoryFiltered" :key="category" mb-8>
      <div mb-2 text-xl>
        {{ getCategoryTitle(category) }}
      </div>

      <c-card v-for="{ code, description, name, type } of codes" :key="code" mb-2>
        <div text-lg font-bold>
          {{ code }} {{ name }}
        </div>
        <div op-70>
          {{ description }} {{ type !== 'HTTP' ? `For ${type}.` : '' }}
        </div>
      </c-card>
    </div>
  </div>
</template>
