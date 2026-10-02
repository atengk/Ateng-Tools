<script setup lang="ts">
import JSON5 from 'json5';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { UseValidationRule } from '@/composable/validation';
import { withDefaultOnError } from '@/utils/defaults';

const { t } = useI18n();
const router = useRouter();

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
  <div class="flex flex-col gap-4 w-full">
    <n-alert
      type="info"
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

    <format-transformer
      :input-label="t('tools.json-minify.inputLabel', '原始 JSON 内容')"
      :input-default="defaultValue"
      :input-placeholder="t('tools.json-minify.inputPlaceholder', '在此粘贴原始 JSON 内容...')"
      :output-label="t('tools.json-minify.outputLabel', '压缩后的 JSON')"
      output-language="json"
      :input-validation-rules="rules"
      :transformer="transformer"
    />
  </div>
</template>
