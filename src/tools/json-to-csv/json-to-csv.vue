<script setup lang="ts">
import JSON5 from 'json5';
import { convertArrayToCsv } from './json-to-csv.service';
import type { UseValidationRule } from '@/composable/validation';
import { withDefaultOnError } from '@/utils/defaults';

const { t } = useI18n();

function transformer(value: string) {
  return withDefaultOnError(() => {
    if (value === '') {
      return '';
    }
    return convertArrayToCsv({ array: JSON5.parse(value) });
  }, '');
}

const rules = computed<UseValidationRule<string>[]>(() => [
  {
    validator: (v: string) => v === '' || JSON5.parse(v),
    message: t('tools.json-to-csv.invalidJson', '输入的 JSON 格式无效'),
  },
]);
</script>

<template>
  <format-transformer
    :input-label="t('tools.json-to-csv.inputLabel', '原始 JSON 内容')"
    :input-placeholder="t('tools.json-to-csv.inputPlaceholder', '在此粘贴原始 JSON 内容...')"
    :output-label="t('tools.json-to-csv.outputLabel', '转换后的 CSV')"
    :input-validation-rules="rules"
    :transformer="transformer"
  />
</template>
