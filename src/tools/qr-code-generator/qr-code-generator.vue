<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { QRCodeErrorCorrectionLevel } from 'qrcode';
import { useQRCode } from './useQRCode';
import { useDownloadFileFromBase64 } from '@/composable/downloadBase64';

const { t } = useI18n();

const foreground = ref('#000000ff');
const background = ref('#ffffffff');
const errorCorrectionLevel = ref<QRCodeErrorCorrectionLevel>('medium');

const errorCorrectionLevels = computed(() => [
  { label: t('tools.qrcode-generator.low', 'Low (7%)'), value: 'low' },
  { label: t('tools.qrcode-generator.medium', 'Medium (15%)'), value: 'medium' },
  { label: t('tools.qrcode-generator.quartile', 'Quartile (25%)'), value: 'quartile' },
  { label: t('tools.qrcode-generator.high', 'High (30%)'), value: 'high' },
]);

const text = ref('https://github.com/atengk/Ateng-Tools');
const { qrcode } = useQRCode({
  text,
  color: {
    background,
    foreground,
  },
  errorCorrectionLevel,
  options: { width: 1024 },
});

const { download } = useDownloadFileFromBase64({ source: qrcode, filename: 'qr-code.png' });
</script>

<template>
  <c-card>
    <n-grid x-gap="12" y-gap="12" cols="1 600:3">
      <n-gi span="2">
        <c-input-text
          v-model:value="text"
          label-position="left"
          label-width="130px"
          label-align="right"
          :label="$t('tools.qrcode-generator.textLabel', 'Text:')"
          multiline
          rows="1"
          autosize
          :placeholder="$t('tools.qrcode-generator.textPlaceholder', 'Your link or text...')"
          mb-6
        />
        <n-form label-width="130" label-placement="left">
          <n-form-item :label="$t('tools.qrcode-generator.fgColor', 'Foreground color:')">
            <n-color-picker v-model:value="foreground" :modes="['hex']" />
          </n-form-item>
          <n-form-item :label="$t('tools.qrcode-generator.bgColor', 'Background color:')">
            <n-color-picker v-model:value="background" :modes="['hex']" />
          </n-form-item>
          <c-select
            v-model:value="errorCorrectionLevel"
            :label="$t('tools.qrcode-generator.errorResistance', 'Error resistance:')"
            label-position="left"
            label-width="130px"
            label-align="right"
            :options="errorCorrectionLevels"
          />
        </n-form>
      </n-gi>
      <n-gi>
        <div flex flex-col items-center gap-3>
          <n-image :src="qrcode" width="200" />
          <c-button @click="download">
            {{ $t('tools.qr-code-generator.download', 'Download qr-code') }}
          </c-button>
        </div>
      </n-gi>
    </n-grid>
  </c-card>
</template>
