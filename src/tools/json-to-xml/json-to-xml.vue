<script setup lang="ts">
import convert from 'xml-js';
import JSON5 from 'json5';
import { withDefaultOnError } from '@/utils/defaults';
import type { UseValidationRule } from '@/composable/validation';

const { t } = useI18n();

const defaultValue = '{"a":{"_attributes":{"x":"1.234","y":"It\'s"}}}';
function transformer(value: string) {
  return withDefaultOnError(() => {
    return convert.js2xml(JSON5.parse(value), { compact: true });
  }, '');
}

const rules = computed<UseValidationRule<string>[]>(() => [
  {
    validator: (v: string) => v === '' || JSON5.parse(v),
    message: t('tools.json-to-xml.invalidJson', '输入的 JSON 格式无效'),
  },
]);
</script>

<template>
  <format-transformer
    :input-label="t('tools.json-to-xml.inputLabel', '输入的 JSON 内容')"
    :input-default="defaultValue"
    :input-placeholder="t('tools.json-to-xml.inputPlaceholder', '在此粘贴 JSON 内容...')"
    :output-label="t('tools.json-to-xml.outputLabel', '转换后的 XML')"
    output-language="xml"
    :transformer="transformer"
    :input-validation-rules="rules"
  />
</template>
