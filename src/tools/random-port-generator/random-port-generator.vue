<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { generatePort } from './random-port-generator.model';
import { computedRefreshable } from '@/composable/computedRefreshable';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();

const [port, refreshPort] = computedRefreshable(() => String(generatePort()));

const { copy } = useCopy({
  source: port,
  text: computed(() => t('tools.random-port-generator.copied', 'Port copied to the clipboard')),
});
</script>

<template>
  <c-card>
    <div class="port">
      {{ port }}
    </div>
    <div flex justify-center gap-3>
      <c-button @click="copy()">
        {{ $t('common.copy', 'Copy') }}
      </c-button>
      <c-button @click="refreshPort">
        {{ $t('common.refresh', 'Refresh') }}
      </c-button>
    </div>
  </c-card>
</template>

<style lang="less" scoped>
.port {
  text-align: center;
  font-size: 26px;
  font-weight: 400;
  margin: 10px 0 25px;
}
</style>
