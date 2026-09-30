<script setup lang="ts">
import { compareSync, hashSync } from 'bcryptjs';
import { useThemeVars } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();
const themeVars = useThemeVars();

const input = ref('');
const saltCount = ref(10);
const hashed = computed(() => hashSync(input.value, saltCount.value));
const { copy } = useCopy({
  source: hashed,
  text: computed(() => t('tools.bcrypt.copied', 'Hashed string copied to the clipboard')),
});

const compareString = ref('');
const compareHash = ref('');
const compareMatch = computed(() => compareSync(compareString.value, compareHash.value));
</script>

<template>
  <c-card :title="$t('tools.bcrypt.hashTitle', 'Hash')">
    <c-input-text
      v-model:value="input"
      :placeholder="$t('tools.bcrypt.inputPlaceholder', 'Your string to bcrypt...')"
      raw-text
      :label="$t('tools.bcrypt.inputLabel', 'Your string: ')"
      label-position="left"
      label-align="right"
      label-width="120px"
      mb-2
    />
    <n-form-item :label="$t('tools.bcrypt.saltLabel', 'Salt count: ')" label-placement="left" label-width="120">
      <n-input-number v-model:value="saltCount" :placeholder="$t('tools.bcrypt.saltPlaceholder', 'Salt rounds...')" :max="100" :min="0" w-full />
    </n-form-item>

    <c-input-text :value="hashed" readonly text-center />

    <div mt-5 flex justify-center>
      <c-button @click="copy()">
        {{ $t('tools.bcrypt.copyHash', 'Copy hash') }}
      </c-button>
    </div>
  </c-card>

  <c-card :title="$t('tools.bcrypt.compareTitle', 'Compare string with hash')">
    <n-form label-width="140">
      <n-form-item :label="$t('tools.bcrypt.compareStringLabel', 'Your string: ')" label-placement="left">
        <c-input-text v-model:value="compareString" :placeholder="$t('tools.bcrypt.compareStringPlaceholder', 'Your string to compare...')" raw-text />
      </n-form-item>
      <n-form-item :label="$t('tools.bcrypt.compareHashLabel', 'Your hash: ')" label-placement="left">
        <c-input-text v-model:value="compareHash" :placeholder="$t('tools.bcrypt.compareHashPlaceholder', 'Your hash to compare...')" raw-text />
      </n-form-item>
      <n-form-item :label="$t('tools.bcrypt.matchLabel', 'Do they match ? ')" label-placement="left" :show-feedback="false">
        <div class="compare-result" :class="{ positive: compareMatch }">
          {{ compareMatch ? $t('tools.bcrypt.matchYes', 'Yes') : $t('tools.bcrypt.matchNo', 'No') }}
        </div>
      </n-form-item>
    </n-form>
  </c-card>
</template>

<style lang="less" scoped>
.compare-result {
  color: v-bind('themeVars.errorColor');

  &.positive {
    color: v-bind('themeVars.successColor');
  }
}
</style>
