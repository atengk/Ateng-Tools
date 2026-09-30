<script setup lang="ts">
import { stringify as stringifyToml } from 'iarna-toml-esm';
import { parse as parseYaml } from 'yaml';
import { withDefaultOnError } from '../../utils/defaults';
import type { UseValidationRule } from '@/composable/validation';

const { t } = useI18n();

const convertYamlToToml = (value: string) => [stringifyToml(parseYaml(value))].flat().join('\n').trim();

const transformer = (value: string) => value.trim() === '' ? '' : withDefaultOnError(() => convertYamlToToml(value), '');

const rules = computed<UseValidationRule<string>[]>(() => [
  {
    validator: (v: string) => v === '' || parseYaml(v),
    message: t('tools.yaml-to-toml.invalidYaml', '输入的 YAML 格式无效'),
  },
]);
</script>

<template>
  <format-transformer
    :input-label="t('tools.yaml-to-toml.inputLabel', '输入的 YAML')"
    :input-placeholder="t('tools.yaml-to-toml.inputPlaceholder', '在此粘贴 YAML 内容...')"
    :output-label="t('tools.yaml-to-toml.outputLabel', '转换后的 TOML')"
    output-language="toml"
    :input-validation-rules="rules"
    :transformer="transformer"
  />
</template>
