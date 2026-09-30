<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useCopy } from '@/composable/copy';
import { base64ToText, isValidBase64, textToBase64 } from '@/utils/base64';
import { withDefaultOnError } from '@/utils/defaults';

const { t } = useI18n();

const encodeUrlSafe = useStorage('base64-string-converter--encode-url-safe', false);
const decodeUrlSafe = useStorage('base64-string-converter--decode-url-safe', false);

const textInput = ref('');
const base64Output = computed(() => textToBase64(textInput.value, { makeUrlSafe: encodeUrlSafe.value }));
const { copy: copyTextBase64 } = useCopy({
  source: base64Output,
  text: computed(() => t('tools.base64-string-converter.copiedBase64', 'Base64 字符串已成功复制至剪贴板')),
});

const base64Input = ref('');
const textOutput = computed(() =>
  withDefaultOnError(() => base64ToText(base64Input.value.trim(), { makeUrlSafe: decodeUrlSafe.value }), ''),
);
const { copy: copyText } = useCopy({
  source: textOutput,
  text: computed(() => t('tools.base64-string-converter.copiedString', '文本已成功复制至剪贴板')),
});
const b64ValidationRules = computed(() => [
  {
    message: t('tools.base64-string-converter.invalidBase64', '无效的 Base64 字符串格式'),
    validator: (value: string) => isValidBase64(value.trim(), { makeUrlSafe: decodeUrlSafe.value }),
  },
]);
const b64ValidationWatch = [decodeUrlSafe];
</script>

<template>
  <c-card :title="$t('tools.base64-string-converter.stringToBase64', '文本转 Base64')">
    <n-form-item :label="$t('tools.base64-string-converter.encodeUrlSafe', 'URL 安全编码 (URL-safe)')" label-placement="left">
      <n-switch v-model:value="encodeUrlSafe" />
    </n-form-item>
    <c-input-text
      v-model:value="textInput"
      multiline
      :placeholder="$t('tools.base64-string-converter.inputPlaceholder', '在此处输入需要编码的文本...')"
      rows="5"
      :label="$t('tools.base64-string-converter.stringToEncode', '待编码文本')"
      raw-text
      mb-5
    />

    <c-input-text
      :label="$t('tools.base64-string-converter.base64Output', 'Base64 编码结果')"
      :value="base64Output"
      multiline
      readonly
      :placeholder="$t('tools.base64-string-converter.base64OutputPlaceholder', '编码后的 Base64 字符串将显示于此处')"
      rows="5"
      mb-5
    />

    <div flex justify-center>
      <c-button @click="copyTextBase64()">
        {{ $t('tools.base64-string-converter.copyBase64', '复制 Base64') }}
      </c-button>
    </div>
  </c-card>

  <c-card :title="$t('tools.base64-string-converter.base64ToString', 'Base64 转文本')">
    <n-form-item :label="$t('tools.base64-string-converter.decodeUrlSafe', 'URL 安全解码 (URL-safe)')" label-placement="left">
      <n-switch v-model:value="decodeUrlSafe" />
    </n-form-item>
    <c-input-text
      v-model:value="base64Input"
      multiline
      :placeholder="$t('tools.base64-string-converter.base64InputPlaceholder', '在此处输入 Base64 字符串...')"
      rows="5"
      :validation-rules="b64ValidationRules"
      :validation-watch="b64ValidationWatch"
      :label="$t('tools.base64-string-converter.base64ToDecode', '待解码 Base64 字符串')"
      mb-5
    />

    <c-input-text
      v-model:value="textOutput"
      :label="$t('tools.base64-string-converter.decodedString', '解码还原文本')"
      :placeholder="$t('tools.base64-string-converter.decodedPlaceholder', '解码还原后的文本内容将显示于此处')"
      multiline
      rows="5"
      readonly
      mb-5
    />

    <div flex justify-center>
      <c-button @click="copyText()">
        {{ $t('tools.base64-string-converter.copyString', '复制还原文本') }}
      </c-button>
    </div>
  </c-card>
</template>
