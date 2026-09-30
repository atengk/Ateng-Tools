<script setup lang="ts">
import { decodeSafeLinksURL } from './safelink-decoder.service';
import TextareaCopyable from '@/components/TextareaCopyable.vue';

const inputSafeLinkUrl = ref('');
const outputDecodedUrl = computed(() => {
  try {
    return decodeSafeLinksURL(inputSafeLinkUrl.value);
  }
  catch (e: any) {
    return e.toString();
  }
});
</script>

<template>
  <div>
    <c-input-text
      v-model:value="inputSafeLinkUrl"
      raw-text
      :placeholder="$t('tools.safelink-decoder.inputPlaceholder', 'Your input Outlook SafeLink Url...')"
      autofocus
      :label="$t('tools.safelink-decoder.inputLabel', 'Your input Outlook SafeLink Url:')"
    />

    <n-divider />

    <n-form-item :label="$t('tools.safelink-decoder.outputLabel', 'Output decoded URL:')">
      <TextareaCopyable :value="outputDecodedUrl" :word-wrap="true" />
    </n-form-item>
  </div>
</template>
