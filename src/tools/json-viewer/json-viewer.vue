<script setup lang="ts">
import JSON5 from 'json5';
import { useStorage } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { formatJson } from './json.models';
import { withDefaultOnError } from '@/utils/defaults';
import { useValidation } from '@/composable/validation';
import TextareaCopyable from '@/components/TextareaCopyable.vue';

const { t } = useI18n();
const router = useRouter();
const inputElement = ref<HTMLElement>();

const rawJson = useStorage('json-prettify:raw-json', '{"hello": "world", "foo": "bar"}');
const indentSize = useStorage('json-prettify:indent-size', 3);
const sortKeys = useStorage('json-prettify:sort-keys', true);
const cleanJson = computed(() => withDefaultOnError(() => formatJson({ rawJson, indentSize, sortKeys }), ''));

const rawJsonValidation = useValidation({
  source: rawJson,
  rules: [
    {
      validator: v => v === '' || JSON5.parse(v),
      message: t('tools.json-prettify.invalidJson', '提供的 JSON 格式不合法'),
    },
  ],
});
</script>

<template>
  <n-alert
    type="info"
    class="mb-4"
    :title="t('tools.json-studio.legacyBannerTitle', '✨ 体验全新一代 JSON 综合工作台 (JSON Studio)')"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <span class="text-xs">
        {{ t('tools.json-studio.legacyBannerDesc', '集成 VSCode 级 Monaco 编辑器、交互式树形图、JSONPath 语法提取、非标容错修复与命名风格转换。') }}
      </span>
      <n-button size="small" type="primary" secondary @click="router.push('/json-studio')">
        {{ t('tools.json-studio.legacyBannerBtn', '立即前往体验') }}
      </n-button>
    </div>
  </n-alert>

  <div style="flex: 0 0 100%">
    <div style="margin: 0 auto; max-width: 600px" flex justify-center gap-3>
      <n-form-item :label="$t('tools.json-prettify.sortKeys', '键名按字母排序')" label-placement="left" label-width="120">
        <n-switch v-model:value="sortKeys" />
      </n-form-item>
      <n-form-item :label="$t('tools.json-prettify.indentSize', '缩进空格数')" label-placement="left" label-width="100" :show-feedback="false">
        <n-input-number v-model:value="indentSize" min="0" max="10" style="width: 100px" />
      </n-form-item>
    </div>
  </div>

  <n-form-item
    :label="$t('tools.json-prettify.rawJson', '原始 JSON 内容')"
    :feedback="rawJsonValidation.message"
    :validation-status="rawJsonValidation.status"
  >
    <c-input-text
      ref="inputElement"
      v-model:value="rawJson"
      :placeholder="$t('tools.json-prettify.rawJsonPlaceholder', '在此处粘贴原始 JSON 内容...')"
      rows="20"
      multiline
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      monospace
    />
  </n-form-item>
  <n-form-item :label="$t('tools.json-prettify.prettifiedJson', '美化排版后的 JSON')">
    <TextareaCopyable :value="cleanJson" language="json" :follow-height-of="inputElement" />
  </n-form-item>
</template>

<style lang="less" scoped>
.result-card {
  position: relative;
  .copy-button {
    position: absolute;
    top: 10px;
    right: 10px;
  }
}
</style>
