<script setup lang="ts">
import * as monaco from 'monaco-editor';
import { useI18n } from 'vue-i18n';
import { useStyleStore } from '@/stores/style.store';

const props = withDefaults(defineProps<{ options?: monaco.editor.IDiffEditorOptions }>(), { options: () => ({}) });
const { options } = toRefs(props);
const { t } = useI18n();

const editorContainer = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneDiffEditor | null = null;

monaco.editor.defineTheme('ateng-tools-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#00000000',
  },
});

monaco.editor.defineTheme('ateng-tools-light', {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#00000000',
  },
});

const styleStore = useStyleStore();

watch(
  () => styleStore.isDarkTheme,
  isDarkTheme => monaco.editor.setTheme(isDarkTheme ? 'ateng-tools-dark' : 'ateng-tools-light'),
  { immediate: true },
);

watch(
  () => options.value,
  options => editor?.updateOptions(options),
  { immediate: true, deep: true },
);

useResizeObserver(editorContainer, () => {
  editor?.layout();
});

onMounted(() => {
  if (!editorContainer.value) {
    return;
  }

  editor = monaco.editor.createDiffEditor(editorContainer.value, {
    originalEditable: true,
    minimap: {
      enabled: false,
    },
  });

  editor.setModel({
    original: monaco.editor.createModel(t('tools.text-diff.originalText'), 'txt'),
    modified: monaco.editor.createModel(t('tools.text-diff.modifiedText'), 'txt'),
  });
});
</script>

<template>
  <div ref="editorContainer" h-600px />
</template>
