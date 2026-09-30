<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { addMilliseconds, formatRelative } from 'date-fns';
import { enGB, zhCN } from 'date-fns/locale';

import { formatMsDuration } from './eta-calculator.service';

const { t, locale } = useI18n();

const unitCount = ref(3 * 62);
const unitPerTimeSpan = ref(3);
const timeSpan = ref(5);
const timeSpanUnitMultiplier = ref(60000);
const startedAt = ref(Date.now());

const durationMs = computed(() => {
  const timeSpanMs = timeSpan.value * timeSpanUnitMultiplier.value;

  return unitCount.value / (unitPerTimeSpan.value / timeSpanMs);
});
const endAt = computed(() =>
  formatRelative(addMilliseconds(startedAt.value, durationMs.value), Date.now(), {
    locale: locale.value === 'zh' ? zhCN : enGB,
  }),
);

const timeSpanUnitOptions = computed(() => [
  { label: t('tools.eta-calculator.units.ms', 'milliseconds'), value: 1 },
  { label: t('tools.eta-calculator.units.s', 'seconds'), value: 1000 },
  { label: t('tools.eta-calculator.units.m', 'minutes'), value: 1000 * 60 },
  { label: t('tools.eta-calculator.units.h', 'hours'), value: 1000 * 60 * 60 },
  { label: t('tools.eta-calculator.units.d', 'days'), value: 1000 * 60 * 60 * 24 },
]);
</script>

<template>
  <div>
    <div text-justify op-70>
      {{ $t('tools.eta-calculator.exampleDesc', 'With a concrete example, if you wash 5 plates in 3 minutes and you have 500 plates to wash, it will take you 5 hours to wash them all.') }}
    </div>
    <n-divider />
    <div flex gap-2>
      <n-form-item :label="$t('tools.eta-calculator.amountConsume', 'Amount of element to consume')" flex-1>
        <n-input-number v-model:value="unitCount" :min="1" />
      </n-form-item>
      <n-form-item :label="$t('tools.eta-calculator.startedAt', 'The consumption started at')" flex-1>
        <n-date-picker v-model:value="startedAt" type="datetime" />
      </n-form-item>
    </div>

    <p>{{ $t('tools.eta-calculator.unitConsumedSpan', 'Amount of unit consumed by time span') }}</p>
    <div flex flex-col items-baseline gap-y-2 md:flex-row>
      <n-input-number v-model:value="unitPerTimeSpan" :min="1" />
      <div flex items-baseline gap-2>
        <span ml-2>{{ $t('tools.eta-calculator.in', 'in') }}</span>
        <n-input-number v-model:value="timeSpan" min-w-130px :min="1" />
        <c-select
          v-model:value="timeSpanUnitMultiplier"
          min-w-130px
          :options="timeSpanUnitOptions"
        />
      </div>
    </div>

    <n-divider />
    <c-card mb-2>
      <n-statistic :label="$t('tools.eta-calculator.totalDuration', 'Total duration')">
        {{ formatMsDuration(durationMs) }}
      </n-statistic>
    </c-card>
    <c-card>
      <n-statistic :label="$t('tools.eta-calculator.itWillEnd', 'It will end ')">
        {{ endAt }}
      </n-statistic>
    </c-card>
  </div>
</template>

<style lang="less" scoped>
.n-input-number,
.n-date-picker {
  width: 100%;
}
</style>
