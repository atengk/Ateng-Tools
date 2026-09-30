<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { UAParser } from 'ua-parser-js';
import { Adjustments, Browser, Cpu, Devices, Engine } from '@vicons/tabler';
import UserAgentResultCards from './user-agent-result-cards.vue';
import type { UserAgentResultSection } from './user-agent-parser.types';
import { withDefaultOnError } from '@/utils/defaults';

const { t } = useI18n();

const ua = ref(navigator.userAgent as string);

function getUserAgentInfo(userAgent: string) {
  return userAgent.trim().length > 0
    ? UAParser(userAgent.trim())
    : ({ ua: '', browser: {}, cpu: {}, device: {}, engine: {}, os: {} } as UAParser.IResult);
}
const userAgentInfo = computed(() => withDefaultOnError(() => getUserAgentInfo(ua.value), undefined));

const sections = computed<UserAgentResultSection[]>(() => [
  {
    heading: t('tools.user-agent-parser.browser', 'Browser'),
    icon: Browser,
    content: [
      {
        label: t('tools.user-agent-parser.name', 'Name'),
        getValue: block => block?.browser.name,
        undefinedFallback: t('tools.user-agent-parser.noBrowserName', 'No browser name available'),
      },
      {
        label: t('tools.user-agent-parser.version', 'Version'),
        getValue: block => block?.browser.version,
        undefinedFallback: t('tools.user-agent-parser.noBrowserVersion', 'No browser version available'),
      },
    ],
  },
  {
    heading: t('tools.user-agent-parser.engine', 'Engine'),
    icon: Engine,
    content: [
      {
        label: t('tools.user-agent-parser.name', 'Name'),
        getValue: block => block?.engine.name,
        undefinedFallback: t('tools.user-agent-parser.noEngineName', 'No engine name available'),
      },
      {
        label: t('tools.user-agent-parser.version', 'Version'),
        getValue: block => block?.engine.version,
        undefinedFallback: t('tools.user-agent-parser.noEngineVersion', 'No engine version available'),
      },
    ],
  },
  {
    heading: t('tools.user-agent-parser.os', 'OS'),
    icon: Adjustments,
    content: [
      {
        label: t('tools.user-agent-parser.name', 'Name'),
        getValue: block => block?.os.name,
        undefinedFallback: t('tools.user-agent-parser.noOsName', 'No OS name available'),
      },
      {
        label: t('tools.user-agent-parser.version', 'Version'),
        getValue: block => block?.os.version,
        undefinedFallback: t('tools.user-agent-parser.noOsVersion', 'No OS version available'),
      },
    ],
  },
  {
    heading: t('tools.user-agent-parser.device', 'Device'),
    icon: Devices,
    content: [
      {
        label: t('tools.user-agent-parser.model', 'Model'),
        getValue: block => block?.device.model,
        undefinedFallback: t('tools.user-agent-parser.noDeviceModel', 'No device model available'),
      },
      {
        label: t('tools.user-agent-parser.type', 'Type'),
        getValue: block => block?.device.type,
        undefinedFallback: t('tools.user-agent-parser.noDeviceType', 'No device type available'),
      },
      {
        label: t('tools.user-agent-parser.vendor', 'Vendor'),
        getValue: block => block?.device.vendor,
        undefinedFallback: t('tools.user-agent-parser.noDeviceVendor', 'No device vendor available'),
      },
    ],
  },
  {
    heading: t('tools.user-agent-parser.cpu', 'CPU'),
    icon: Cpu,
    content: [
      {
        label: t('tools.user-agent-parser.architecture', 'Architecture'),
        getValue: block => block?.cpu.architecture,
        undefinedFallback: t('tools.user-agent-parser.noCpuArch', 'No CPU architecture available'),
      },
    ],
  },
]);
</script>

<template>
  <div>
    <c-input-text
      v-model:value="ua"
      :label="$t('tools.user-agent-parser.uaLabel', 'User agent string')"
      multiline
      :placeholder="$t('tools.user-agent-parser.uaPlaceholder', 'Put your user-agent here...')"
      clearable
      raw-text
      rows="2"
      autosize
      monospace
      mb-3
    />

    <UserAgentResultCards :user-agent-info="userAgentInfo" :sections="sections" />
  </div>
</template>
