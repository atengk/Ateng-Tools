<script setup lang="ts">
import type { lib } from 'crypto-js';
import {
  HmacMD5,
  HmacRIPEMD160,
  HmacSHA1,
  HmacSHA224,
  HmacSHA256,
  HmacSHA3,
  HmacSHA384,
  HmacSHA512,
  enc,
} from 'crypto-js';
import { useI18n } from 'vue-i18n';

import { convertHexToBin } from '../hash-text/hash-text.service';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();

const algos = {
  MD5: HmacMD5,
  RIPEMD160: HmacRIPEMD160,
  SHA1: HmacSHA1,
  SHA3: HmacSHA3,
  SHA224: HmacSHA224,
  SHA256: HmacSHA256,
  SHA384: HmacSHA384,
  SHA512: HmacSHA512,
} as const;

type Encoding = keyof typeof enc | 'Bin';

function formatWithEncoding(words: lib.WordArray, encoding: Encoding) {
  if (encoding === 'Bin') {
    return convertHexToBin(words.toString(enc.Hex));
  }
  return words.toString(enc[encoding]);
}

const plainText = ref('');
const secret = ref('');
const hashFunction = ref<keyof typeof algos>('SHA256');
const encoding = ref<Encoding>('Hex');
const hmac = computed(() =>
  formatWithEncoding(algos[hashFunction.value](plainText.value, secret.value), encoding.value),
);
const { copy } = useCopy({
  source: hmac,
  text: computed(() => t('tools.hmac-generator.copied', 'HMAC string copied to the clipboard')),
});

const encodingOptions = computed(() => [
  {
    label: t('tools.hash-text.encodings.bin', 'Binary (base 2)'),
    value: 'Bin',
  },
  {
    label: t('tools.hash-text.encodings.hex', 'Hexadecimal (base 16)'),
    value: 'Hex',
  },
  {
    label: t('tools.hash-text.encodings.base64', 'Base64 (base 64)'),
    value: 'Base64',
  },
  {
    label: t('tools.hash-text.encodings.base64url', 'Base64-url (base 64 with url safe chars)'),
    value: 'Base64url',
  },
]);
</script>

<template>
  <div flex flex-col gap-4>
    <c-input-text
      v-model:value="plainText"
      multiline
      raw-text
      :placeholder="$t('tools.hmac-generator.inputPlaceholder', 'Plain text to compute the hash...')"
      rows="3"
      autosize
      autofocus
      :label="$t('tools.hmac-generator.inputLabel', 'Plain text to compute the hash')"
    />
    <c-input-text
      v-model:value="secret"
      raw-text
      :placeholder="$t('tools.hmac-generator.secretPlaceholder', 'Enter the secret key...')"
      :label="$t('tools.hmac-generator.secretLabel', 'Secret key')"
      clearable
    />

    <div flex gap-2>
      <c-select
        v-model:value="hashFunction"
        :label="$t('tools.hmac-generator.algoLabel', 'Hashing function')"
        flex-1
        :placeholder="$t('tools.hmac-generator.algoPlaceholder', 'Select an hashing function...')"
        :options="Object.keys(algos).map((label) => ({ label, value: label }))"
      />
      <c-select
        v-model:value="encoding"
        :label="$t('tools.hmac-generator.encodingLabel', 'Output encoding')"
        flex-1
        :placeholder="$t('tools.hmac-generator.encodingPlaceholder', 'Select the result encoding...')"
        :options="encodingOptions"
      />
    </div>
    <input-copyable
      v-model:value="hmac"
      type="textarea"
      :placeholder="$t('tools.hmac-generator.outputPlaceholder', 'The result of the HMAC...')"
      :label="$t('tools.hmac-generator.outputLabel', 'HMAC of your text')"
    />
    <div flex justify-center>
      <c-button @click="copy()">
        {{ $t('tools.hmac-generator.copy', 'Copy HMAC') }}
      </c-button>
    </div>
  </div>
</template>
