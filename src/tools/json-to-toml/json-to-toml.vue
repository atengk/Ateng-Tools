<script setup lang="ts">
import { stringify as stringifyToml } from 'iarna-toml-esm';
import JSON5 from 'json5';
import { withDefaultOnError } from '../../utils/defaults';
import type { UseValidationRule } from '@/composable/validation';

const { t } = useI18n();

const convertJsonToToml = (value: string) => [stringifyToml(JSON5.parse(value))].flat().join('\n').trim();

const transformer = (value: string) => value.trim() === '' ? '' : withDefaultOnError(() => convertJsonToToml(value), '');

const rules = computed<UseValidationRule<string>[]>(() => [
  {
    validator: (v: string) => v === '' || JSON5.parse(v),
    message: t('tools.json-to-toml.invalidJson', '输入的 JSON 格式无效'),
  },
]);
</script>

<template>
  <format-transformer
    :input-label="t('tools.json-to-toml.inputLabel', '输入的 JSON')"
    :input-placeholder="t('tools.json-to-toml.inputPlaceholder', '在此粘贴 JSON 内容...')"
    :output-label="t('tools.json-to-toml.outputLabel', '转换后的 TOML')"
    output-language="toml"
    :input-validation-rules="rules"
    :transformer="transformer"
  />
</template>
