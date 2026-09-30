<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { textToNatoAlphabet } from './text-to-nato-alphabet.service';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();

const input = ref('');
const natoText = computed(() => textToNatoAlphabet({ text: input.value }));
const { copy } = useCopy({
  source: natoText,
  text: computed(() => t('tools.text-to-nato-alphabet.copied', 'NATO alphabet string copied.')),
});
</script>

<template>
  <div>
    <c-input-text
      v-model:value="input"
      :label="$t('tools.text-to-nato-alphabet.inputLabel', 'Your text to convert to NATO phonetic alphabet')"
      :placeholder="$t('tools.text-to-nato-alphabet.inputPlaceholder', 'Put your text here...')"
      clearable
      mb-5
    />

    <div v-if="natoText">
      <div mb-2>
        {{ $t('tools.text-to-nato-alphabet.outputLabel', 'Your text in NATO phonetic alphabet') }}
      </div>
      <c-card>
        {{ natoText }}
      </c-card>

      <div mt-3 flex justify-center>
        <c-button autofocus @click="copy()">
          {{ $t('tools.text-to-nato-alphabet.copyButton', 'Copy NATO string') }}
        </c-button>
      </div>
    </div>
  </div>
</template>
