<script setup lang="ts">
import JSON5 from 'json5';
import type { UseValidationRule } from '@/composable/validation';
import { withDefaultOnError } from '@/utils/defaults';

const { t } = useI18n();

const defaultValue = '{\n\t"hello": [\n\t\t"world"\n\t]\n}';
const transformer = (value: string) => withDefaultOnError(() => JSON.stringify(JSON5.parse(value), null, 0), '');

const rules = computed<UseValidationRule<string>[]>(() => [
  {
    validator: (v: string) => v === '' || JSON5.parse(v),
    message: t('tools.json-minify.invalidJson', '提供的 JSON 格式无效'),
  },
]);
</script>

<template>
  <format-transformer
    :input-label="t('tools.json-minify.inputLabel', '原始 JSON 内容')"
    :input-default="defaultValue"
    :input-placeholder="t('tools.json-minify.inputPlaceholder', '在此粘贴原始 JSON 内容...')"
    :output-label="t('tools.json-minify.outputLabel', '压缩后的 JSON')"
    output-language="json"
    :input-validation-rules="rules"
    :transformer="transformer"
  />
</template>
