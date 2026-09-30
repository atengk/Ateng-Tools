<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Exchange } from '@vicons/tabler';
import { isValidIpv4 } from '../ipv4-address-converter/ipv4-address-converter.service';
import type { Ipv4RangeExpanderResult } from './ipv4-range-expander.types';
import { calculateCidr } from './ipv4-range-expander.service';
import ResultRow from './result-row.vue';
import { useValidation } from '@/composable/validation';

const { t } = useI18n();

const rawStartAddress = useStorage('ipv4-range-expander:startAddress', '192.168.1.1');
const rawEndAddress = useStorage('ipv4-range-expander:endAddress', '192.168.6.255');

const result = computed(() => calculateCidr({ startIp: rawStartAddress.value, endIp: rawEndAddress.value }));

const calculatedValues = computed<{
  id: string
  label: string
  getOldValue: (result: Ipv4RangeExpanderResult | undefined) => string | undefined
  getNewValue: (result: Ipv4RangeExpanderResult | undefined) => string | undefined
}[]>(() => [
  {
    id: 'start-address',
    label: t('tools.ipv4-range-expander.startAddress', 'Start address'),
    getOldValue: () => rawStartAddress.value,
    getNewValue: result => result?.newStart,
  },
  {
    id: 'end-address',
    label: t('tools.ipv4-range-expander.endAddress', 'End address'),
    getOldValue: () => rawEndAddress.value,
    getNewValue: result => result?.newEnd,
  },
  {
    id: 'addresses-in-range',
    label: t('tools.ipv4-range-expander.addressesInRange', 'Addresses in range'),
    getOldValue: result => result?.oldSize?.toLocaleString(),
    getNewValue: result => result?.newSize?.toLocaleString(),
  },
  {
    id: 'cidr',
    label: 'CIDR',
    getOldValue: () => '',
    getNewValue: result => result?.newCidr,
  },
]);

const startIpValidation = useValidation({
  source: rawStartAddress,
  rules: [{ message: () => t('tools.ipv4-range-expander.invalidIp', 'Invalid ipv4 address'), validator: ip => isValidIpv4({ ip }) }],
});
const endIpValidation = useValidation({
  source: rawEndAddress,
  rules: [{ message: () => t('tools.ipv4-range-expander.invalidIp', 'Invalid ipv4 address'), validator: ip => isValidIpv4({ ip }) }],
});

const showResult = computed(() => endIpValidation.isValid && startIpValidation.isValid && result.value !== undefined);

function onSwitchStartEndClicked() {
  const tmpStart = rawStartAddress.value;
  rawStartAddress.value = rawEndAddress.value;
  rawEndAddress.value = tmpStart;
}
</script>

<template>
  <div>
    <div mb-4 flex gap-4>
      <c-input-text
        v-model:value="rawStartAddress"
        :label="$t('tools.ipv4-range-expander.startLabel', 'Start address')"
        :placeholder="$t('tools.ipv4-range-expander.startPlaceholder', 'Start IPv4 address...')"
        :validation="startIpValidation"
        clearable
      />

      <c-input-text
        v-model:value="rawEndAddress"
        :label="$t('tools.ipv4-range-expander.endLabel', 'End address')"
        :placeholder="$t('tools.ipv4-range-expander.endPlaceholder', 'End IPv4 address...')"
        :validation="endIpValidation"
        clearable
      />
    </div>

    <n-table v-if="showResult" data-test-id="result">
      <thead>
        <tr>
          <th scope="col">
            &nbsp;
          </th>
          <th scope="col">
            {{ $t('tools.ipv4-range-expander.oldValue', 'old value') }}
          </th>
          <th scope="col">
            {{ $t('tools.ipv4-range-expander.newValue', 'new value') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <ResultRow
          v-for="{ id, label, getOldValue, getNewValue } in calculatedValues"
          :id="id"
          :key="id"
          :label="label"
          :old-value="getOldValue(result)"
          :new-value="getNewValue(result)"
        />
      </tbody>
    </n-table>
    <n-alert
      v-else-if="startIpValidation.isValid && endIpValidation.isValid"
      :title="$t('tools.ipv4-range-expander.invalidCombinationTitle', 'Invalid combination of start and end IPv4 address')"
      type="error"
    >
      <div my-3 op-70>
        {{ $t('tools.ipv4-range-expander.invalidCombinationDesc', 'The end IPv4 address is lower than the start IPv4 address. This is not valid and no result could be calculated. In the most cases the solution to solve this problem is to change start and end address.') }}
      </div>

      <c-button @click="onSwitchStartEndClicked">
        <n-icon mr-2 :component="Exchange" depth="3" size="22" />
        {{ $t('tools.ipv4-range-expander.switchAddresses', 'Switch start and end IPv4 address') }}
      </c-button>
    </n-alert>
  </div>
</template>
