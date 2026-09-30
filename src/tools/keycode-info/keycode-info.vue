<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEventListener } from '@vueuse/core';
import InputCopyable from '../../components/InputCopyable.vue';

const { t } = useI18n();

const event = ref<KeyboardEvent>();

useEventListener(document, 'keydown', (e) => {
  event.value = e;
});

const fields = computed(() => {
  if (!event.value) {
    return [];
  }

  return [
    {
      label: t('tools.keycode-info.key', 'Key :'),
      value: event.value.key,
      placeholder: t('tools.keycode-info.keyPlaceholder', 'Key name...'),
    },
    {
      label: t('tools.keycode-info.keycode', 'Keycode :'),
      value: String(event.value.keyCode),
      placeholder: t('tools.keycode-info.keycodePlaceholder', 'Keycode...'),
    },
    {
      label: t('tools.keycode-info.code', 'Code :'),
      value: event.value.code,
      placeholder: t('tools.keycode-info.codePlaceholder', 'Code...'),
    },
    {
      label: t('tools.keycode-info.location', 'Location :'),
      value: String(event.value.location),
      placeholder: t('tools.keycode-info.locationPlaceholder', 'Location...'),
    },

    {
      label: t('tools.keycode-info.modifiers', 'Modifiers :'),
      value: [
        event.value.metaKey && 'Meta',
        event.value.shiftKey && 'Shift',
        event.value.ctrlKey && 'Ctrl',
        event.value.altKey && 'Alt',
      ]
        .filter(Boolean)
        .join(' + '),
      placeholder: t('tools.keycode-info.modifiersNone', 'None'),
    },
  ];
});
</script>

<template>
  <div>
    <c-card mb-5 text-center important:py-12>
      <div v-if="event" mb-2 text-3xl>
        {{ event.key }}
      </div>
      <span lh-1 op-70>
        {{ $t('tools.keycode-info.pressKey', 'Press the key on your keyboard you want to get info about this key') }}
      </span>
    </c-card>

    <n-input-group v-for="({ label, value, placeholder }, i) of fields" :key="i" style="margin-bottom: 5px">
      <n-input-group-label style="flex: 0 0 150px">
        {{ label }}
      </n-input-group-label>
      <InputCopyable :value="value" readonly :placeholder="placeholder" />
    </n-input-group>
  </div>
</template>
