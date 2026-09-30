<script setup lang="ts">
import { SHA1 } from 'crypto-js';
import { useI18n } from 'vue-i18n';
import InputCopyable from '@/components/InputCopyable.vue';
import { macAddressValidation } from '@/utils/macAddress';

const { t } = useI18n();

const macAddress = ref('20:37:06:12:34:56');
const calculatedSections = computed(() => {
  const timestamp = new Date().getTime();
  const hex40bit = SHA1(timestamp + macAddress.value)
    .toString()
    .substring(30);

  const ula = `fd${hex40bit.substring(0, 2)}:${hex40bit.substring(2, 6)}:${hex40bit.substring(6)}`;

  return [
    {
      label: 'IPv6 ULA:',
      value: `${ula}::/48`,
    },
    {
      label: `${t('tools.ipv6-ula-generator.firstRoutable', 'First routable block')}:`,
      value: `${ula}:0::/64`,
    },
    {
      label: `${t('tools.ipv6-ula-generator.lastRoutable', 'Last routable block')}:`,
      value: `${ula}:ffff::/64`,
    },
  ];
});

const addressValidation = macAddressValidation(macAddress);
</script>

<template>
  <div>
    <n-alert :title="$t('common.info', 'Info')" type="info">
      {{ $t('tools.ipv6-ula-generator.infoAlert', 'This tool uses the first method suggested by IETF using the current timestamp plus the mac address, sha1 hashed, and the lower 40 bits to generate your random ULA.') }}
    </n-alert>

    <c-input-text
      v-model:value="macAddress"
      :placeholder="$t('tools.ipv6-ula-generator.macPlaceholder', 'Type a MAC address')"
      clearable
      :label="$t('tools.ipv6-ula-generator.macAddress', 'MAC address:')"
      raw-text
      my-8
      :validation="addressValidation"
    />

    <div v-if="addressValidation.isValid">
      <InputCopyable
        v-for="{ label, value } in calculatedSections"
        :key="label"
        :value="value"
        :label="label"
        label-width="180px"
        label-align="right"
        label-position="left"
        readonly
        mb-2
      />
    </div>
  </div>
</template>
