<script setup lang="ts">
import { parse as parseYaml } from 'yaml';
import type { UseValidationRule } from '@/composable/validation';
import { isNotThrowing } from '@/utils/boolean';
import { withDefaultOnError } from '@/utils/defaults';

const { t } = useI18n();

function transformer(value: string) {
  return withDefaultOnError(() => {
    const obj = parseYaml(value, { merge: true });
    return obj ? JSON.stringify(obj, null, 3) : '';
  }, '');
}

const rules = computed<UseValidationRule<string>[]>(() => [
  {
    validator: (value: string) => isNotThrowing(() => parseYaml(value)),
    message: t('tools.yaml-to-json-converter.invalidYaml', '输入的 YAML 格式无效'),
  },
]);
</script>

<template>
  <format-transformer
    :input-label="t('tools.yaml-to-json-converter.inputLabel', '输入的 YAML')"
    :input-placeholder="t('tools.yaml-to-json-converter.inputPlaceholder', '在此粘贴 YAML 内容...')"
    :output-label="t('tools.yaml-to-json-converter.outputLabel', '转换后的 JSON')"
    output-language="json"
    :input-validation-rules="rules"
    :transformer="transformer"
  />
</template>
