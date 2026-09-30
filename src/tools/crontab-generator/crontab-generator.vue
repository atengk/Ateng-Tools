<script setup lang="ts">
import cronstrue from 'cronstrue';
import { isValidCron } from 'cron-validator';
import { useI18n } from 'vue-i18n';
import { useStyleStore } from '@/stores/style.store';

const { t, locale } = useI18n();

function isCronValid(v: string) {
  return isValidCron(v, { allowBlankDay: true, alias: true, seconds: true });
}

const styleStore = useStyleStore();

const cron = ref('40 * * * *');
const cronstrueConfig = reactive({
  verbose: true,
  dayOfWeekStartIndexZero: true,
  use24HourTimeFormat: true,
  throwExceptionOnParseError: true,
});

const helpers = computed(() => [
  {
    symbol: '*',
    meaning: t('tools.crontab-generator.helpers.anyValue', 'Any value'),
    example: '* * * *',
    equivalent: t('tools.crontab-generator.helpers.everyMinute', 'Every minute'),
  },
  {
    symbol: '-',
    meaning: t('tools.crontab-generator.helpers.rangeValues', 'Range of values'),
    example: '1-10 * * *',
    equivalent: t('tools.crontab-generator.helpers.min1to10', 'Minutes 1 through 10'),
  },
  {
    symbol: ',',
    meaning: t('tools.crontab-generator.helpers.listValues', 'List of values'),
    example: '1,10 * * *',
    equivalent: t('tools.crontab-generator.helpers.min1and10', 'At minutes 1 and 10'),
  },
  {
    symbol: '/',
    meaning: t('tools.crontab-generator.helpers.stepValues', 'Step values'),
    example: '*/10 * * *',
    equivalent: t('tools.crontab-generator.helpers.every10Min', 'Every 10 minutes'),
  },
  {
    symbol: '@yearly',
    meaning: t('tools.crontab-generator.helpers.yearly', 'Once every year at midnight of 1 January'),
    example: '@yearly',
    equivalent: '0 0 1 1 *',
  },
  {
    symbol: '@annually',
    meaning: t('tools.crontab-generator.helpers.annually', 'Same as @yearly'),
    example: '@annually',
    equivalent: '0 0 1 1 *',
  },
  {
    symbol: '@monthly',
    meaning: t('tools.crontab-generator.helpers.monthly', 'Once a month at midnight on the first day'),
    example: '@monthly',
    equivalent: '0 0 1 * *',
  },
  {
    symbol: '@weekly',
    meaning: t('tools.crontab-generator.helpers.weekly', 'Once a week at midnight on Sunday morning'),
    example: '@weekly',
    equivalent: '0 0 * * 0',
  },
  {
    symbol: '@daily',
    meaning: t('tools.crontab-generator.helpers.daily', 'Once a day at midnight'),
    example: '@daily',
    equivalent: '0 0 * * *',
  },
  {
    symbol: '@midnight',
    meaning: t('tools.crontab-generator.helpers.midnight', 'Same as @daily'),
    example: '@midnight',
    equivalent: '0 0 * * *',
  },
  {
    symbol: '@hourly',
    meaning: t('tools.crontab-generator.helpers.hourly', 'Once an hour at the beginning of the hour'),
    example: '@hourly',
    equivalent: '0 * * * *',
  },
  {
    symbol: '@reboot',
    meaning: t('tools.crontab-generator.helpers.reboot', 'Run at startup'),
    example: '',
    equivalent: '',
  },
]);

const cronString = computed(() => {
  if (isCronValid(cron.value)) {
    try {
      return cronstrue.toString(cron.value, {
        ...cronstrueConfig,
        locale: locale.value === 'zh' ? 'zh_CN' : 'en',
      });
    } catch {
      return ' ';
    }
  }
  return ' ';
});

const cronValidationRules = [
  {
    validator: (value: string) => isCronValid(value),
    message: () => t('tools.crontab-generator.invalidCron', 'This cron is invalid'),
  },
];
</script>

<template>
  <c-card>
    <div mx-auto max-w-sm>
      <c-input-text
        v-model:value="cron"
        size="large"
        placeholder="* * * * *"
        :validation-rules="cronValidationRules"
        mb-3
      />
    </div>

    <div class="cron-string">
      {{ cronString }}
    </div>

    <n-divider />

    <div flex justify-center>
      <n-form :show-feedback="false" label-width="200" label-placement="left">
        <n-form-item :label="$t('tools.crontab-generator.verbose', 'Verbose')">
          <n-switch v-model:value="cronstrueConfig.verbose" />
        </n-form-item>
        <n-form-item :label="$t('tools.crontab-generator.use24Hour', 'Use 24 hour time format')">
          <n-switch v-model:value="cronstrueConfig.use24HourTimeFormat" />
        </n-form-item>
        <n-form-item :label="$t('tools.crontab-generator.daysStartZero', 'Days start at 0')">
          <n-switch v-model:value="cronstrueConfig.dayOfWeekStartIndexZero" />
        </n-form-item>
      </n-form>
    </div>
  </c-card>
  <c-card>
    <pre>
┌──────────── [optional] seconds (0 - 59)
| ┌────────── minute (0 - 59)
| | ┌──────── hour (0 - 23)
| | | ┌────── day of month (1 - 31)
| | | | ┌──── month (1 - 12) OR jan,feb,mar,apr ...
| | | | | ┌── day of week (0 - 6, sunday=0) OR sun,mon ...
| | | | | |
* * * * * * command</pre>

    <div v-if="styleStore.isSmallScreen">
      <c-card v-for="{ symbol, meaning, example, equivalent } in helpers" :key="symbol" mb-3 important:border-none>
        <div>
          {{ $t('tools.crontab-generator.symbol', 'Symbol:') }} <strong>{{ symbol }}</strong>
        </div>
        <div>
          {{ $t('tools.crontab-generator.meaning', 'Meaning:') }} <strong>{{ meaning }}</strong>
        </div>
        <div>
          {{ $t('tools.crontab-generator.example', 'Example:') }}
          <strong><code>{{ example }}</code></strong>
        </div>
        <div>
          {{ $t('tools.crontab-generator.equivalent', 'Equivalent:') }} <strong>{{ equivalent }}</strong>
        </div>
      </c-card>
    </div>

    <c-table v-else :data="helpers" />
  </c-card>
</template>

<style lang="less" scoped>
::v-deep(input) {
  font-size: 30px;
  font-family: monospace;
  padding: 5px;
  text-align: center;
}

.cron-string {
  text-align: center;
  font-size: 22px;
  opacity: 0.8;
  margin: 5px 0 15px;
}

pre {
  overflow: auto;
  padding: 10px 0;
}
</style>
