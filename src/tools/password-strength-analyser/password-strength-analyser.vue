<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { getPasswordCrackTimeEstimation } from './password-strength-analyser.service';

const { t, locale } = useI18n();

const password = ref('');
const crackTimeEstimation = computed(() => getPasswordCrackTimeEstimation({ password: password.value }));

function formatCrackDuration(duration: string) {
  if (locale.value !== 'zh') {
    return duration;
  }
  if (!duration || duration === 'Instantly') {
    return '瞬间破解 (0 秒)';
  }
  if (duration === 'Less than a second') {
    return '不足 1 秒';
  }
  return duration
    .replace(/\bmillennia\b|\bmillenium\b/g, '千年')
    .replace(/\bcenturies\b|\bcentury\b/g, '个世纪')
    .replace(/\bdecades\b|\bdecade\b/g, '个十年')
    .replace(/\byears\b|\byear\b/g, '年')
    .replace(/\bmonths\b|\bmonth\b/g, '个月')
    .replace(/\bweeks\b|\bweek\b/g, '周')
    .replace(/\bdays\b|\bday\b/g, '天')
    .replace(/\bhours\b|\bhour\b/g, '小时')
    .replace(/\bminutes\b|\bminute\b/g, '分钟')
    .replace(/\bseconds\b|\bsecond\b/g, '秒')
    .replace(/,\s*/g, '，');
}

const details = computed(() => [
  {
    label: t('tools.password-strength-analyser.passwordLength'),
    value: crackTimeEstimation.value.passwordLength,
  },
  {
    label: t('tools.password-strength-analyser.entropy'),
    value: Math.round(crackTimeEstimation.value.entropy * 100) / 100,
  },
  {
    label: t('tools.password-strength-analyser.charsetSize'),
    value: crackTimeEstimation.value.charsetLength,
  },
  {
    label: t('tools.password-strength-analyser.score'),
    value: `${Math.round(crackTimeEstimation.value.score * 100)} / 100`,
  },
]);
</script>

<template>
  <div flex flex-col gap-3>
    <c-input-text
      v-model:value="password"
      type="password"
      :placeholder="$t('tools.password-strength-analyser.passwordPlaceholder')"
      clearable
      autofocus
      raw-text
      test-id="password-input"
    />

    <c-card text-center>
      <div op-60>
        {{ $t('tools.password-strength-analyser.bruteForceDuration') }}
      </div>
      <div text-2xl data-test-id="crack-duration">
        {{ formatCrackDuration(crackTimeEstimation.crackDurationFormatted) }}
      </div>
    </c-card>
    <c-card>
      <div v-for="({ label, value }) of details" :key="label" flex gap-3>
        <div flex-1 text-right op-60>
          {{ label }}
        </div>
        <div flex-1 text-left>
          {{ value }}
        </div>
      </div>
    </c-card>
    <div op-70>
      <span font-bold>{{ $t('tools.password-strength-analyser.noteLabel') }}</span>
      {{ $t('tools.password-strength-analyser.noteText') }}
    </div>
  </div>
</template>
