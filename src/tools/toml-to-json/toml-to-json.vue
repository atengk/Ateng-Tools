<script setup lang="ts">
import { parse as parseToml } from 'iarna-toml-esm';
import { withDefaultOnError } from '../../utils/defaults';
import { isValidToml } from './toml.services';
import type { UseValidationRule } from '@/composable/validation';

const { t } = useI18n();

const transformer = (value: string) => value === '' ? '' : withDefaultOnError(() => JSON.stringify(parseToml(value), null, 3), '');

const rules = computed<UseValidationRule<string>[]>(() => [
  {
    validator: isValidToml,
    message: t('tools.toml-to-json.invalidToml', '输入的 TOML 格式无效'),
  },
]);
</script>

<template>
  <format-transformer
    :input-label="t('tools.toml-to-json.inputLabel', '输入的 TOML')"
    :input-placeholder="t('tools.toml-to-json.inputPlaceholder', '在此粘贴 TOML 内容...')"
    :output-label="t('tools.toml-to-json.outputLabel', '转换后的 JSON')"
    output-language="json"
    :input-validation-rules="rules"
    :transformer="transformer"
  />
</template>
