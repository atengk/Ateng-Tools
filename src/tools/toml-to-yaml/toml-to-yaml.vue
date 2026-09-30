<script setup lang="ts">
import { parse as parseToml } from 'iarna-toml-esm';
import { stringify as stringifyToYaml } from 'yaml';
import { withDefaultOnError } from '../../utils/defaults';
import { isValidToml } from '../toml-to-json/toml.services';
import type { UseValidationRule } from '@/composable/validation';

const { t } = useI18n();

const transformer = (value: string) => value.trim() === '' ? '' : withDefaultOnError(() => stringifyToYaml(parseToml(value)), '');

const rules = computed<UseValidationRule<string>[]>(() => [
  {
    validator: isValidToml,
    message: t('tools.toml-to-yaml.invalidToml', '输入的 TOML 格式无效'),
  },
]);
</script>

<template>
  <format-transformer
    :input-label="t('tools.toml-to-yaml.inputLabel', '输入的 TOML')"
    :input-placeholder="t('tools.toml-to-yaml.inputPlaceholder', '在此粘贴 TOML 内容...')"
    :output-label="t('tools.toml-to-yaml.outputLabel', '转换后的 YAML')"
    output-language="yaml"
    :input-validation-rules="rules"
    :transformer="transformer"
  />
</template>
