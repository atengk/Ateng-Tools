<script setup lang="ts">
import { formatXml, isValidXML } from './xml-formatter.service';
import type { UseValidationRule } from '@/composable/validation';

const { t } = useI18n();

const defaultValue = '<hello><world>foo</world><world>bar</world></hello>';
const indentSize = useStorage('xml-formatter:indent-size', 2);
const collapseContent = useStorage('xml-formatter:collapse-content', true);

function transformer(value: string) {
  return formatXml(value, {
    indentation: ' '.repeat(indentSize.value),
    collapseContent: collapseContent.value,
    lineSeparator: '\n',
  });
}

const rules = computed<UseValidationRule<string>[]>(() => [
  {
    validator: isValidXML,
    message: t('tools.xml-formatter.invalidXml', '提供的 XML 格式无效'),
  },
]);
</script>

<template>
  <div important:flex-full important:flex-shrink-0 important:flex-grow-0>
    <div flex justify-center>
      <n-form-item :label="t('tools.xml-formatter.collapseContent', '折叠空标签内容:')" label-placement="left">
        <n-switch v-model:value="collapseContent" />
      </n-form-item>
      <n-form-item :label="t('tools.xml-formatter.indentSize', '缩进空格数:')" label-placement="left" label-width="100" :show-feedback="false">
        <n-input-number v-model:value="indentSize" min="0" max="10" w-100px />
      </n-form-item>
    </div>
  </div>

  <format-transformer
    :input-label="t('tools.xml-formatter.inputLabel', '原始 XML 内容')"
    :input-placeholder="t('tools.xml-formatter.inputPlaceholder', '在此粘贴原始 XML 内容...')"
    :output-label="t('tools.xml-formatter.outputLabel', '格式化后的 XML')"
    output-language="xml"
    :input-validation-rules="rules"
    :transformer="transformer"
    :input-default="defaultValue"
  />
</template>
