<script setup lang="ts">
import { stringify } from 'yaml';
import JSON5 from 'json5';
import type { UseValidationRule } from '@/composable/validation';
import { isNotThrowing } from '@/utils/boolean';
import { withDefaultOnError } from '@/utils/defaults';

const { t } = useI18n();

const transformer = (value: string) => withDefaultOnError(() => stringify(JSON5.parse(value)), '');

const rules = computed<UseValidationRule<string>[]>(() => [
  {
    validator: (value: string) => value === '' || isNotThrowing(() => stringify(JSON5.parse(value))),
    message: t('tools.json-to-yaml-converter.invalidJson', '输入的 JSON 格式无效'),
  },
]);
</script>

<template>
  <format-transformer
    :input-label="t('tools.json-to-yaml-converter.inputLabel', '输入的 JSON')"
    :input-placeholder="t('tools.json-to-yaml-converter.inputPlaceholder', '在此粘贴 JSON 内容...')"
    :output-label="t('tools.json-to-yaml-converter.outputLabel', '转换后的 YAML')"
    output-language="yaml"
    :input-validation-rules="rules"
    :transformer="transformer"
  />
</template>
