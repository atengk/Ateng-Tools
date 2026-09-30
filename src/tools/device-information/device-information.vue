<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useWindowSize } from '@vueuse/core';

const { t } = useI18n();
const { width, height } = useWindowSize();

const sections = computed(() => [
  {
    name: t('tools.device-information.screen', 'Screen'),
    information: [
      {
        label: t('tools.device-information.screenSize', 'Screen size'),
        value: computed(() => `${window.screen.availWidth} x ${window.screen.availHeight}`),
      },
      {
        label: t('tools.device-information.orientation', 'Orientation'),
        value: computed(() => window.screen.orientation.type),
      },
      {
        label: t('tools.device-information.orientationAngle', 'Orientation angle'),
        value: computed(() => `${window.screen.orientation.angle}°`),
      },
      {
        label: t('tools.device-information.colorDepth', 'Color depth'),
        value: computed(() => `${window.screen.colorDepth} bits`),
      },
      {
        label: t('tools.device-information.pixelRatio', 'Pixel ratio'),
        value: computed(() => `${window.devicePixelRatio} dppx`),
      },
      {
        label: t('tools.device-information.windowSize', 'Window size'),
        value: computed(() => `${width.value} x ${height.value}`),
      },
    ],
  },
  {
    name: t('tools.device-information.device', 'Device'),
    information: [
      {
        label: t('tools.device-information.browserVendor', 'Browser vendor'),
        value: computed(() => navigator.vendor),
      },
      {
        label: t('tools.device-information.languages', 'Languages'),
        value: computed(() => navigator.languages.join(', ')),
      },
      {
        label: t('tools.device-information.platform', 'Platform'),
        value: computed(() => navigator.platform),
      },
      {
        label: t('tools.device-information.userAgent', 'User agent'),
        value: computed(() => navigator.userAgent),
      },
    ],
  },
]);
</script>

<template>
  <c-card v-for="{ name, information } in sections" :key="name" :title="name">
    <n-grid cols="1 400:2" x-gap="12" y-gap="12">
      <n-gi v-for="{ label, value: { value } } in information" :key="label" class="information">
        <div class="label">
          {{ label }}
        </div>

        <div class="value">
          <n-ellipsis v-if="value">
            {{ value }}
          </n-ellipsis>
          <div v-else class="undefined-value">
            {{ $t('tools.device-information.unknown', 'unknown') }}
          </div>
        </div>
      </n-gi>
    </n-grid>
  </c-card>
</template>

<style lang="less" scoped>
.information {
  padding: 14px 16px;
  border-radius: 4px;
  background-color: #aaaaaa11;

  .label {
    font-size: 14px;
    opacity: 0.8;
    line-height: 1;
    margin-bottom: 5px;
  }
  .value {
    font-size: 20px;
    font-weight: 400;
  }

  .undefined-value {
    opacity: 0.8;
  }
}
</style>
