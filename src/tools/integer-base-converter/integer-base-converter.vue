<script setup lang="ts">
import InputCopyable from '../../components/InputCopyable.vue';
import { convertBase } from './integer-base-converter.model';
import { getErrorMessageIfThrows } from '@/utils/error';

const inputProps = {
  'labelPosition': 'left',
  'labelWidth': '170px',
  'labelAlign': 'right',
  'readonly': true,
  'mb-2': '',
} as const;

const input = ref('42');
const inputBase = ref(10);
const outputBase = ref(42);

function errorlessConvert(...args: Parameters<typeof convertBase>) {
  try {
    return convertBase(...args);
  }
  catch (err) {
    return '';
  }
}

const { t } = useI18n();

const error = computed(() =>
  getErrorMessageIfThrows(() =>
    convertBase({ value: input.value, fromBase: inputBase.value, toBase: outputBase.value }),
  ),
);
</script>

<template>
  <div>
    <c-card>
      <c-input-text
        v-model:value="input"
        :label="t('tools.base-converter.inputNumber', '输入数值')"
        :placeholder="t('tools.base-converter.inputNumberPlaceholder', '在此输入数字（例如：42）')"
        label-position="left"
        label-width="110px"
        mb-2
        label-align="right"
      />

      <n-form-item :label="t('tools.base-converter.inputBase', '输入进制')" label-placement="left" label-width="110" :show-feedback="false">
        <n-input-number
          v-model:value="inputBase"
          max="64"
          min="2"
          :placeholder="t('tools.base-converter.inputBasePlaceholder', '输入基数进制（例如：10）')"
          w-full
        />
      </n-form-item>

      <n-alert v-if="error" style="margin-top: 25px" type="error">
        {{ error }}
      </n-alert>
      <n-divider />

      <InputCopyable
        :label="t('tools.base-converter.binary', '二进制 (2)')"
        v-bind="inputProps"
        :value="errorlessConvert({ value: input, fromBase: inputBase, toBase: 2 })"
        :placeholder="t('tools.base-converter.binaryPlaceholder', '二进制转换结果...')"
      />

      <InputCopyable
        :label="t('tools.base-converter.octal', '八进制 (8)')"
        v-bind="inputProps"
        :value="errorlessConvert({ value: input, fromBase: inputBase, toBase: 8 })"
        :placeholder="t('tools.base-converter.octalPlaceholder', '八进制转换结果...')"
      />

      <InputCopyable
        :label="t('tools.base-converter.decimal', '十进制 (10)')"
        v-bind="inputProps"
        :value="errorlessConvert({ value: input, fromBase: inputBase, toBase: 10 })"
        :placeholder="t('tools.base-converter.decimalPlaceholder', '十进制转换结果...')"
      />

      <InputCopyable
        :label="t('tools.base-converter.hexadecimal', '十六进制 (16)')"
        v-bind="inputProps"
        :value="errorlessConvert({ value: input, fromBase: inputBase, toBase: 16 })"
        :placeholder="t('tools.base-converter.hexadecimalPlaceholder', '十六进制转换结果...')"
      />

      <InputCopyable
        :label="t('tools.base-converter.base64', 'Base64 进制 (64)')"
        v-bind="inputProps"
        :value="errorlessConvert({ value: input, fromBase: inputBase, toBase: 64 })"
        :placeholder="t('tools.base-converter.base64Placeholder', 'Base64 转换结果...')"
      />

      <div flex items-baseline>
        <n-input-group style="width: 160px; margin-right: 10px">
          <n-input-group-label> {{ t('tools.base-converter.custom', '自定义') }}: </n-input-group-label>
          <n-input-number v-model:value="outputBase" max="64" min="2" />
        </n-input-group>

        <InputCopyable
          flex-1
          v-bind="inputProps"
          :value="errorlessConvert({ value: input, fromBase: inputBase, toBase: outputBase })"
          :placeholder="`Base ${outputBase}...`"
        />
      </div>
    </c-card>
  </div>
</template>

<style lang="less" scoped>
.n-input-group:not(:first-child) {
  margin-top: 5px;
}
</style>
