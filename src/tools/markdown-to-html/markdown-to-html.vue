<script setup lang="ts">
import markdownit from 'markdown-it';
import TextareaCopyable from '@/components/TextareaCopyable.vue';

const { t } = useI18n();

const inputMarkdown = ref('');
const outputHtml = computed(() => {
  const md = markdownit();
  return md.render(inputMarkdown.value);
});

function printHtml() {
  const w = window.open();
  if (w === null) {
    return;
  }
  w.document.body.innerHTML = outputHtml.value;
  w.print();
}
</script>

<template>
  <div>
    <c-input-text
      v-model:value="inputMarkdown"
      multiline raw-text
      :placeholder="t('tools.markdown-to-html.inputPlaceholder', '在此输入 Markdown 内容...')"
      rows="8"
      autofocus
      :label="t('tools.markdown-to-html.inputLabel', '待转换的 Markdown 内容：')"
    />

    <n-divider />

    <n-form-item :label="t('tools.markdown-to-html.outputLabel', '转换后的 HTML：')">
      <TextareaCopyable :value="outputHtml" :word-wrap="true" language="html" />
    </n-form-item>

    <div flex justify-center>
      <n-button @click="printHtml">
        {{ t('tools.markdown-to-html.printPdf', '打印 / 导出为 PDF') }}
      </n-button>
    </div>
  </div>
</template>
