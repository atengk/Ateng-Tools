<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useCopy } from '@/composable/copy';
import { useValidation } from '@/composable/validation';
import { isNotThrowing } from '@/utils/boolean';
import { withDefaultOnError } from '@/utils/defaults';

const { t } = useI18n();

const encodeInput = ref('Hello world :)');
const encodeOutput = computed(() => withDefaultOnError(() => encodeURIComponent(encodeInput.value), ''));

const encodedValidation = useValidation({
  source: encodeInput,
  rules: [
    {
      validator: value => isNotThrowing(() => encodeURIComponent(value)),
      message: t('tools.url-encoder.parseError', '无法解析此字符串格式'),
    },
  ],
});

const { copy: copyEncoded } = useCopy({
  source: encodeOutput,
  text: computed(() => t('tools.url-encoder.copiedEncoded', 'URL 编码结果已成功复制至剪贴板')),
});

const decodeInput = ref('Hello%20world%20%3A)');
const decodeOutput = computed(() => withDefaultOnError(() => decodeURIComponent(decodeInput.value), ''));

const decodeValidation = useValidation({
  source: decodeInput,
  rules: [
    {
      validator: value => isNotThrowing(() => decodeURIComponent(value)),
      message: t('tools.url-encoder.parseError', '无法解析此字符串格式'),
    },
  ],
});

const { copy: copyDecoded } = useCopy({
  source: decodeOutput,
  text: computed(() => t('tools.url-encoder.copiedDecoded', 'URL 解码结果已成功复制至剪贴板')),
});
</script>

<template>
  <c-card :title="$t('tools.url-encoder.encodeTitle', 'URL 编码 (Encode)')">
    <c-input-text
      v-model:value="encodeInput"
      :label="$t('tools.url-encoder.rawString', '原始文本：')"
      :validation="encodedValidation"
      multiline
      autosize
      :placeholder="$t('tools.url-encoder.encodePlaceholder', '输入待进行 URL 编码的字符串...')"
      rows="2"
      mb-3
    />

    <c-input-text
      :label="$t('tools.url-encoder.encodedString', 'URL 编码结果：')"
      :value="encodeOutput"
      multiline
      autosize
      readonly
      :placeholder="$t('tools.url-encoder.encodedPlaceholder', '编码后的字符串将显示在此处...')"
      rows="2"
      mb-3
    />

    <div flex justify-center>
      <c-button @click="copyEncoded()">
        {{ $t('tools.url-encoder.copyEncoded', '复制编码结果') }}
      </c-button>
    </div>
  </c-card>
  <c-card :title="$t('tools.url-encoder.decodeTitle', 'URL 解码 (Decode)')">
    <c-input-text
      v-model:value="decodeInput"
      :label="$t('tools.url-encoder.encodedInput', '待解码的 URL 编码字符串：')"
      :validation="decodeValidation"
      multiline
      autosize
      :placeholder="$t('tools.url-encoder.decodePlaceholder', '输入包含 % 百分号编码的字符串...')"
      rows="2"
      mb-3
    />

    <c-input-text
      :label="$t('tools.url-encoder.decodedString', 'URL 解码结果：')"
      :value="decodeOutput"
      multiline
      autosize
      readonly
      :placeholder="$t('tools.url-encoder.decodedPlaceholder', '解码还原后的字符串将显示在此处...')"
      rows="2"
      mb-3
    />

    <div flex justify-center>
      <c-button @click="copyDecoded()">
        {{ $t('tools.url-encoder.copyDecoded', '复制解码结果') }}
      </c-button>
    </div>
  </c-card>
</template>
