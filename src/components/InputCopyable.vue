<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { Copy as IconCopy } from '@vicons/tabler';
import { useCopy } from '@/composable/copy';

const props = defineProps<{ value: string }>();
const emit = defineEmits(['update:value']);

const value = useVModel(props, 'value', emit);
const { t } = useI18n();
const { copy, isJustCopied } = useCopy({ source: value, createToast: false });
const tooltipText = computed(() => isJustCopied.value ? t('common.copied', '已复制！') : t('common.copyToClipboard', '复制到剪贴板'));
</script>

<template>
  <c-input-text v-model:value="value">
    <template #suffix>
      <c-tooltip :tooltip="tooltipText">
        <c-button circle variant="text" size="small" @click="copy()">
          <n-icon size="16" :component="IconCopy" />
        </c-button>
      </c-tooltip>
    </template>
  </c-input-text>
</template>
