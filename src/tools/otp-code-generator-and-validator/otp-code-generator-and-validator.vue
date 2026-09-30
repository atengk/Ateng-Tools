<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useTimestamp } from '@vueuse/core';
import { useThemeVars } from 'naive-ui';
import { useQRCode } from '../qr-code-generator/useQRCode';
import { base32toHex, buildKeyUri, generateSecret, generateTOTP, getCounterFromTime } from './otp.service';
import TokenDisplay from './token-display.vue';
import { useStyleStore } from '@/stores/style.store';
import InputCopyable from '@/components/InputCopyable.vue';
import { computedRefreshable } from '@/composable/computedRefreshable';

const { t } = useI18n();
const now = useTimestamp();
const interval = computed(() => (now.value / 1000) % 30);
const theme = useThemeVars();
const styleStore = useStyleStore();

const secret = ref(generateSecret());

function refreshSecret() {
  secret.value = generateSecret();
}

const [tokens] = computedRefreshable(
  () => ({
    previous: generateTOTP({ key: secret.value, now: now.value - 30000 }),
    current: generateTOTP({ key: secret.value, now: now.value }),
    next: generateTOTP({ key: secret.value, now: now.value + 30000 }),
  }),
  { throttle: 500 },
);

const keyUri = computed(() => buildKeyUri({ secret: secret.value }));

const { qrcode } = useQRCode({
  text: keyUri,
  color: {
    background: computed(() => (styleStore.isDarkTheme ? '#ffffff' : '#00000000')),
    foreground: '#000000',
  },
  options: { width: 210 },
});

const secretValidationRules = [
  {
    message: () => t('tools.otp-generator.validationBase32', 'Secret should be a base32 string'),
    validator: (value: string) => value.toUpperCase().match(/^[A-Z234567]+$/),
  },
  {
    message: () => t('tools.otp-generator.validationRequired', 'Please set a secret'),
    validator: (value: string) => value !== '',
  },
];
</script>

<template>
  <div style="max-width: 350px">
    <c-input-text
      v-model:value="secret"
      :label="$t('tools.otp-generator.secret', 'Secret')"
      :placeholder="$t('tools.otp-generator.secretPlaceholder', 'Paste your TOTP secret...')"
      mb-5
      :validation-rules="secretValidationRules"
    >
      <template #suffix>
        <c-tooltip :tooltip="$t('tools.otp-generator.generateSecretTooltip', 'Generate a new random secret')">
          <c-button circle variant="text" size="small" @click="refreshSecret">
            <icon-mdi-refresh />
          </c-button>
        </c-tooltip>
      </template>
    </c-input-text>

    <div>
      <TokenDisplay :tokens="tokens" />

      <n-progress :percentage="(100 * interval) / 30" :color="theme.primaryColor" :show-indicator="false" />
      <div style="text-align: center">
        {{ $t('tools.otp-generator.nextIn', { sec: String(Math.floor(30 - interval)).padStart(2, '0') }) }}
      </div>
    </div>
    <div mt-4 flex flex-col items-center justify-center gap-3>
      <n-image :src="qrcode" />
      <c-button :href="keyUri" target="_blank">
        {{ $t('tools.otp-generator.openKeyUri', 'Open Key URI in new tab') }}
      </c-button>
    </div>
  </div>
  <div style="max-width: 350px">
    <InputCopyable
      :label="$t('tools.otp-generator.secretHex', 'Secret in hexadecimal')"
      :value="base32toHex(secret)"
      readonly
      :placeholder="$t('tools.otp-generator.secretHexPlaceholder', 'Secret in hex will be displayed here')"
      mb-5
    />

    <InputCopyable
      :label="$t('tools.otp-generator.epoch', 'Epoch (seconds)')"
      :value="Math.floor(now / 1000).toString()"
      readonly
      mb-5
      :placeholder="$t('tools.otp-generator.epochPlaceholder', 'Epoch in sec will be displayed here')"
    />

    <p>{{ $t('tools.otp-generator.iteration', 'Iteration') }}</p>

    <InputCopyable
      :value="String(getCounterFromTime({ now, timeStep: 30 }))"
      readonly
      :label="$t('tools.otp-generator.count', 'Count:')"
      label-position="left"
      label-width="110px"
      label-align="right"
      :placeholder="$t('tools.otp-generator.countPlaceholder', 'Iteration count will be displayed here')"
    />

    <InputCopyable
      :value="getCounterFromTime({ now, timeStep: 30 }).toString(16).padStart(16, '0')"
      readonly
      :placeholder="$t('tools.otp-generator.paddedHexPlaceholder', 'Iteration count in hex will be displayed here')"
      label-position="left"
      label-width="110px"
      label-align="right"
      :label="$t('tools.otp-generator.paddedHex', 'Padded hex:')"
    />
  </div>
</template>

<style lang="less" scoped>
.n-progress {
  margin-top: 10px;
  ::v-deep(.n-progress-graph-line-fill) {
    transition-duration: 0.05s !important;
  }
}

.token {
  text-align: center;
  &.token-current {
    font-size: 20px;
  }
}
</style>
