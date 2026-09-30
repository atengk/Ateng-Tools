<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import InputCopyable from '../../components/InputCopyable.vue';
import { isNotThrowing } from '@/utils/boolean';
import { withDefaultOnError } from '@/utils/defaults';

const { t } = useI18n();

const urlToParse = ref('https://atengk.github.io/Ateng-Tools/url-parser?key1=value&key2=value2#the-hash');

const urlParsed = computed(() => withDefaultOnError(() => new URL(urlToParse.value), undefined));
const urlValidationRules = [
  {
    validator: (value: string) => isNotThrowing(() => new URL(value)),
    message: () => t('tools.url-parser.invalidUrl', 'Invalid url'),
  },
];

const properties = computed<{ title: string; key: keyof URL }[]>(() => [
  { title: t('tools.url-parser.protocol', 'Protocol'), key: 'protocol' },
  { title: t('tools.url-parser.username', 'Username'), key: 'username' },
  { title: t('tools.url-parser.password', 'Password'), key: 'password' },
  { title: t('tools.url-parser.hostname', 'Hostname'), key: 'hostname' },
  { title: t('tools.url-parser.port', 'Port'), key: 'port' },
  { title: t('tools.url-parser.path', 'Path'), key: 'pathname' },
  { title: t('tools.url-parser.params', 'Params'), key: 'search' },
]);
</script>

<template>
  <c-card>
    <c-input-text
      v-model:value="urlToParse"
      :label="$t('tools.url-parser.urlToParse', 'Your url to parse:')"
      :placeholder="$t('tools.url-parser.urlPlaceholder', 'Your url to parse...')"
      raw-text
      :validation-rules="urlValidationRules"
    />

    <n-divider />

    <InputCopyable
      v-for="{ title, key } in properties"
      :key="key"
      :label="title"
      :value="(urlParsed?.[key] as string) ?? ''"
      readonly
      label-position="left"
      label-width="110px"
      mb-2
      placeholder=" "
    />

    <div
      v-for="[k, v] in Object.entries(Object.fromEntries(urlParsed?.searchParams.entries() ?? []))"
      :key="k"
      mb-2
      w-full
      flex
    >
      <div style="flex: 1 0 110px">
        <icon-mdi-arrow-right-bottom />
      </div>

      <InputCopyable :value="k" readonly />
      <InputCopyable :value="v" readonly />
    </div>
  </c-card>
</template>

<style lang="less" scoped>
.n-input-group-label {
  text-align: right;
}
.n-input-group {
  margin: 2px 0;
}
</style>
