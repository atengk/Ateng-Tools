<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useCopy } from '@/composable/copy';
import { textToBase64 } from '@/utils/base64';

const { t } = useI18n();

const username = ref('');
const password = ref('');
const header = computed(() => `Authorization: Basic ${textToBase64(`${username.value}:${password.value}`)}`);

const { copy } = useCopy({
  source: header,
  text: computed(() => t('tools.basic-auth-generator.copied', 'Header copied to the clipboard')),
});
</script>

<template>
  <div>
    <c-input-text
      v-model:value="username"
      :label="$t('tools.basic-auth-generator.username', 'Username')"
      :placeholder="$t('tools.basic-auth-generator.usernamePlaceholder', 'Your username...')"
      clearable
      raw-text
      mb-5
    />
    <c-input-text
      v-model:value="password"
      :label="$t('tools.basic-auth-generator.password', 'Password')"
      :placeholder="$t('tools.basic-auth-generator.passwordPlaceholder', 'Your password...')"
      clearable
      raw-text
      mb-2
      type="password"
    />

    <c-card>
      <n-statistic :label="$t('tools.basic-auth-generator.authHeader', 'Authorization header:')" class="header">
        <n-scrollbar x-scrollable style="max-width: 550px; margin-bottom: -10px; padding-bottom: 10px" trigger="none">
          {{ header }}
        </n-scrollbar>
      </n-statistic>
    </c-card>
    <div mt-5 flex justify-center>
      <c-button @click="copy()">
        {{ $t('tools.basic-auth-generator.copy', 'Copy header') }}
      </c-button>
    </div>
  </div>
</template>

<style lang="less" scoped>
::v-deep(.n-statistic-value__content) {
  font-family: monospace;
  font-size: 17px !important;
  white-space: nowrap;
}
</style>
