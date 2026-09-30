<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Netmask } from 'netmask';
import { useStorage } from '@vueuse/core';
import { ArrowLeft, ArrowRight } from '@vicons/tabler';
import { getIPClass } from './ipv4-subnet-calculator.models';
import { withDefaultOnError } from '@/utils/defaults';
import { isNotThrowing } from '@/utils/boolean';
import SpanCopyable from '@/components/SpanCopyable.vue';

const { t } = useI18n();

const ip = useStorage('ipv4-subnet-calculator:ip', '192.168.0.1/24');

const getNetworkInfo = (address: string) => new Netmask(address.trim());

const networkInfo = computed(() => withDefaultOnError(() => getNetworkInfo(ip.value), undefined));

const ipValidationRules = [
  {
    message: () => t('tools.ipv4-subnet-calculator.validationError', 'We cannot parse this address, check the format'),
    validator: (value: string) => isNotThrowing(() => getNetworkInfo(value.trim())),
  },
];

const sections = computed<{
  label: string
  getValue: (blocks: Netmask) => string | undefined
  undefinedFallback?: string
}[]>(() => [
  {
    label: t('tools.ipv4-subnet-calculator.netmask', 'Netmask'),
    getValue: block => block.toString(),
  },
  {
    label: t('tools.ipv4-subnet-calculator.networkAddress', 'Network address'),
    getValue: ({ base }) => base,
  },
  {
    label: t('tools.ipv4-subnet-calculator.networkMask', 'Network mask'),
    getValue: ({ mask }) => mask,
  },
  {
    label: t('tools.ipv4-subnet-calculator.networkMaskBinary', 'Network mask in binary'),
    getValue: ({ bitmask }) => ('1'.repeat(bitmask) + '0'.repeat(32 - bitmask)).match(/.{8}/g)?.join('.') ?? '',
  },
  {
    label: t('tools.ipv4-subnet-calculator.cidrNotation', 'CIDR notation'),
    getValue: ({ bitmask }) => `/${bitmask}`,
  },
  {
    label: t('tools.ipv4-subnet-calculator.wildcardMask', 'Wildcard mask'),
    getValue: ({ hostmask }) => hostmask,
  },
  {
    label: t('tools.ipv4-subnet-calculator.networkSize', 'Network size'),
    getValue: ({ size }) => String(size),
  },
  {
    label: t('tools.ipv4-subnet-calculator.firstAddress', 'First address'),
    getValue: ({ first }) => first,
  },
  {
    label: t('tools.ipv4-subnet-calculator.lastAddress', 'Last address'),
    getValue: ({ last }) => last,
  },
  {
    label: t('tools.ipv4-subnet-calculator.broadcastAddress', 'Broadcast address'),
    getValue: ({ broadcast }) => broadcast,
    undefinedFallback: t('tools.ipv4-subnet-calculator.noBroadcast', 'No broadcast address with this mask'),
  },
  {
    label: t('tools.ipv4-subnet-calculator.ipClass', 'IP class'),
    getValue: ({ base: ip }) => getIPClass({ ip }),
    undefinedFallback: t('tools.ipv4-subnet-calculator.unknownClass', 'Unknown class type'),
  },
]);

function switchToBlock({ count = 1 }: { count?: number }) {
  const next = networkInfo.value?.next(count);

  if (next) {
    ip.value = next.toString();
  }
}
</script>

<template>
  <div>
    <c-input-text
      v-model:value="ip"
      :label="$t('tools.ipv4-subnet-calculator.ipLabel', 'An IPv4 address with or without mask')"
      :placeholder="$t('tools.ipv4-subnet-calculator.ipPlaceholder', 'The ipv4 address...')"
      :validation-rules="ipValidationRules"
      mb-4
    />

    <div v-if="networkInfo">
      <n-table>
        <tbody>
          <tr v-for="{ getValue, label, undefinedFallback } in sections" :key="label">
            <td font-bold>
              {{ label }}
            </td>
            <td>
              <SpanCopyable v-if="getValue(networkInfo)" :value="getValue(networkInfo)" />
              <span v-else op-70>
                {{ undefinedFallback }}
              </span>
            </td>
          </tr>
        </tbody>
      </n-table>

      <div mt-3 flex items-center justify-between>
        <c-button @click="switchToBlock({ count: -1 })">
          <n-icon :component="ArrowLeft" />
          {{ $t('tools.ipv4-subnet-calculator.prevBlock', 'Previous block') }}
        </c-button>
        <c-button @click="switchToBlock({ count: 1 })">
          {{ $t('tools.ipv4-subnet-calculator.nextBlock', 'Next block') }}
          <n-icon :component="ArrowRight" />
        </c-button>
      </div>
    </div>
  </div>
</template>
