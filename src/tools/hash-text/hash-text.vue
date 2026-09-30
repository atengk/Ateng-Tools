<script setup lang="ts">
import type { lib } from 'crypto-js';
import { MD5, RIPEMD160, SHA1, SHA224, SHA256, SHA3, SHA384, SHA512, enc } from 'crypto-js';

import InputCopyable from '../../components/InputCopyable.vue';
import { convertHexToBin } from './hash-text.service';
import { useQueryParam } from '@/composable/queryParams';

const { t } = useI18n();

const algos = {
  MD5,
  SHA1,
  SHA256,
  SHA224,
  SHA512,
  SHA384,
  SHA3,
  RIPEMD160,
} as const;

type AlgoNames = keyof typeof algos;
type Encoding = keyof typeof enc | 'Bin';
const algoNames = Object.keys(algos) as AlgoNames[];
const encoding = useQueryParam<Encoding>({ defaultValue: 'Hex', name: 'encoding' });
const clearText = ref('');

const encodingOptions = computed(() => [
  {
    label: t('tools.hash-text.encodings.bin'),
    value: 'Bin',
  },
  {
    label: t('tools.hash-text.encodings.hex'),
    value: 'Hex',
  },
  {
    label: t('tools.hash-text.encodings.base64'),
    value: 'Base64',
  },
  {
    label: t('tools.hash-text.encodings.base64url'),
    value: 'Base64url',
  },
]);

function formatWithEncoding(words: lib.WordArray, encoding: Encoding) {
  if (encoding === 'Bin') {
    return convertHexToBin(words.toString(enc.Hex));
  }

  return words.toString(enc[encoding]);
}

const hashText = (algo: AlgoNames, value: string) => formatWithEncoding(algos[algo](value), encoding.value);
</script>

<template>
  <div>
    <c-card>
      <c-input-text
        v-model:value="clearText"
        multiline
        raw-text
        :placeholder="$t('tools.hash-text.inputPlaceholder')"
        rows="3"
        autosize
        autofocus
        :label="$t('tools.hash-text.inputTextLabel')"
      />

      <n-divider />

      <c-select
        v-model:value="encoding"
        mb-4
        :label="$t('tools.hash-text.digestEncoding')"
        :options="encodingOptions"
      />

      <div v-for="algo in algoNames" :key="algo" style="margin: 5px 0">
        <n-input-group>
          <n-input-group-label style="flex: 0 0 120px">
            {{ algo }}
          </n-input-group-label>
          <InputCopyable :value="hashText(algo, clearText)" readonly />
        </n-input-group>
      </div>
    </c-card>
  </div>
</template>
