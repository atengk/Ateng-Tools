<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import _ from 'lodash';
import { generateRandomMacAddress } from './mac-adress-generator.models';
import { computedRefreshable } from '@/composable/computedRefreshable';
import { useCopy } from '@/composable/copy';
import { usePartialMacAddressValidation } from '@/utils/macAddress';

const { t } = useI18n();

const amount = useStorage('mac-address-generator-amount', 1);
const macAddressPrefix = useStorage('mac-address-generator-prefix', '64:16:7F');

const prefixValidation = usePartialMacAddressValidation(macAddressPrefix);

const casesTransformers = computed(() => [
  { label: t('tools.mac-address-generator.uppercase', 'Uppercase'), value: 'upper' },
  { label: t('tools.mac-address-generator.lowercase', 'Lowercase'), value: 'lower' },
]);
const caseType = ref('upper');

const separators = computed(() => [
  {
    label: ':',
    value: ':',
  },
  {
    label: '-',
    value: '-',
  },
  {
    label: '.',
    value: '.',
  },
  {
    label: t('tools.mac-address-generator.none', 'None'),
    value: '',
  },
]);
const separator = useStorage('mac-address-generator-separator', ':');

const [macAddresses, refreshMacAddresses] = computedRefreshable(() => {
  if (!prefixValidation.isValid) {
    return '';
  }

  const ids = _.times(amount.value, () => {
    const raw = generateRandomMacAddress({
      prefix: macAddressPrefix.value,
      separator: separator.value,
    });
    return caseType.value === 'upper' ? raw.toUpperCase() : raw.toLowerCase();
  });
  return ids.join('\n');
});

const { copy } = useCopy({
  source: macAddresses,
  text: computed(() => t('tools.mac-address-generator.copied', 'MAC addresses copied to the clipboard')),
});
</script>

<template>
  <div flex flex-col justify-center gap-2>
    <div flex items-center>
      <label w-150px pr-12px text-right>{{ $t('tools.mac-address-generator.quantity', 'Quantity:') }}</label>
      <n-input-number v-model:value="amount" min="1" max="100" flex-1 />
    </div>

    <c-input-text
      v-model:value="macAddressPrefix"
      :label="$t('tools.mac-address-generator.prefix', 'MAC address prefix:')"
      :placeholder="$t('tools.mac-address-generator.prefixPlaceholder', 'Set a prefix, e.g. 64:16:7F')"
      clearable
      label-position="left"
      spellcheck="false"
      :validation="prefixValidation"
      raw-text
      label-width="150px"
      label-align="right"
    />

    <c-buttons-select
      v-model:value="caseType"
      :options="casesTransformers"
      :label="$t('tools.mac-address-generator.case', 'Case:')"
      label-width="150px"
      label-align="right"
    />

    <c-buttons-select
      v-model:value="separator"
      :options="separators"
      :label="$t('tools.mac-address-generator.separator', 'Separator:')"
      label-width="150px"
      label-align="right"
    />

    <c-card mt-5 flex data-test-id="ulids">
      <pre m-0 m-x-auto>{{ macAddresses }}</pre>
    </c-card>

    <div flex justify-center gap-2>
      <c-button data-test-id="refresh" @click="refreshMacAddresses()">
        {{ $t('common.refresh', 'Refresh') }}
      </c-button>
      <c-button @click="copy()">
        {{ $t('common.copy', 'Copy') }}
      </c-button>
    </div>
  </div>
</template>
