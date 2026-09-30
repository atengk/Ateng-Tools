<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { convertTextToUnicode, convertUnicodeToText } from './text-to-unicode.service';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();

const inputText = ref('');
const unicodeFromText = computed(() => inputText.value.trim() === '' ? '' : convertTextToUnicode(inputText.value));
const { copy: copyUnicode } = useCopy({ source: unicodeFromText });

const inputUnicode = ref('');
const textFromUnicode = computed(() => inputUnicode.value.trim() === '' ? '' : convertUnicodeToText(inputUnicode.value));
const { copy: copyText } = useCopy({ source: textFromUnicode });
</script>

<template>
  <c-card :title="$t('tools.text-to-unicode.textToUnicodeTitle', 'Text to Unicode')">
    <c-input-text
      v-model:value="inputText"
      multiline
      :placeholder="$t('tools.text-to-unicode.textPlaceholder', 'e.g. \'Hello Avengers\'')"
      :label="$t('tools.text-to-unicode.textInputLabel', 'Enter text to convert to unicode')"
      autosize
      autofocus
      raw-text
      test-id="text-to-unicode-input"
    />
    <c-input-text
      v-model:value="unicodeFromText"
      :label="$t('tools.text-to-unicode.unicodeOutputLabel', 'Unicode from your text')"
      multiline
      raw-text
      readonly
      mt-2
      :placeholder="$t('tools.text-to-unicode.unicodeOutputPlaceholder', 'The unicode representation of your text will be here')"
      test-id="text-to-unicode-output"
    />
    <div mt-2 flex justify-center>
      <c-button :disabled="!unicodeFromText" @click="copyUnicode()">
        {{ $t('tools.text-to-unicode.copyUnicode', 'Copy unicode to clipboard') }}
      </c-button>
    </div>
  </c-card>

  <c-card :title="$t('tools.text-to-unicode.unicodeToTextTitle', 'Unicode to Text')">
    <c-input-text
      v-model:value="inputUnicode"
      multiline
      :placeholder="$t('tools.text-to-unicode.unicodePlaceholder', 'Input Unicode')"
      :label="$t('tools.text-to-unicode.unicodeInputLabel', 'Enter unicode to convert to text')"
      autosize
      raw-text
      test-id="unicode-to-text-input"
    />
    <c-input-text
      v-model:value="textFromUnicode"
      :label="$t('tools.text-to-unicode.textOutputLabel', 'Text from your Unicode')"
      multiline
      raw-text
      readonly
      mt-2
      :placeholder="$t('tools.text-to-unicode.textOutputPlaceholder', 'The text representation of your unicode will be here')"
      test-id="unicode-to-text-output"
    />
    <div mt-2 flex justify-center>
      <c-button :disabled="!textFromUnicode" @click="copyText()">
        {{ $t('tools.text-to-unicode.copyText', 'Copy text to clipboard') }}
      </c-button>
    </div>
  </c-card>
</template>
