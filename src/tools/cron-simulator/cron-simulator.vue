<!-- Cron 表达式解析与未来执行时间模拟器组件 -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Calendar, Clock, Copy, Bulb } from '@vicons/tabler';
import { useClipboard } from '@vueuse/core';
import {
  COMMON_CRON_PRESETS,
  type CronPreset,
} from './cron-simulator.models';
import { simulateCron } from './cron-simulator.service';

const { t } = useI18n();
const { copy } = useClipboard();

const cronExpression = ref<string>('0 0 12 ? * WED');
const executionCount = ref<number>(10);
const selectedPreset = ref<string | null>(null);

// 1. 核心计算推演结果
const simulation = computed(() => {
  return simulateCron(cronExpression.value, {
    executionCount: executionCount.value,
  });
});

// 2. 方言徽标展示信息
const dialectBadge = computed(() => {
  switch (simulation.value.dialect) {
    case 'linux':
      return { text: 'Linux Crontab (5 字段: 分 时 日 月 周)', type: 'warning' as const };
    case 'spring':
      return { text: 'Spring / Quartz (6 字段: 秒 分 时 日 月 周)', type: 'info' as const };
    case 'quartz':
      return { text: 'Quartz (7 字段: 秒 分 时 日 月 周 年)', type: 'success' as const };
  }
});

// 3. 预设选项格式化
const presetOptions = COMMON_CRON_PRESETS.map(p => ({
  label: `${p.label} (${p.expression})`,
  value: p.expression,
}));

function handlePresetSelect(value: string) {
  cronExpression.value = value;
}

function clearInput() {
  cronExpression.value = '';
}

function copyExecutions() {
  if (!simulation.value.nextExecutions.length) return;
  const text = simulation.value.nextExecutions
    .map(e => `#${e.index}  ${e.formatted}  ${e.dayOfWeek}  (${e.relativeTime})`)
    .join('\n');
  copy(text);
}
</script>

<template>
  <div style="flex: 0 0 100%" class="cron-simulator">
    <!-- 顶部配置与表达式输入卡片 -->
    <c-card mb-4>
      <div flex flex-col gap-4>
        <!-- 表达式大字号输入与常用预设 -->
        <div flex flex-wrap items-center justify-between gap-3>
          <div flex-1 min-w-300px>
            <n-input
              v-model:value="cronExpression"
              size="large"
              placeholder="输入 Cron 表达式（如 0 0 12 ? * WED 或 */15 * * * *）..."
              font-mono
              clearable
            />
          </div>

          <div flex items-center gap-2>
            <n-select
              v-model:value="selectedPreset"
              size="large"
              placeholder="选择常用业务预设模板..."
              :options="presetOptions"
              style="width: 260px"
              @update:value="handlePresetSelect"
            />
            <c-button size="large" @click="clearInput">
              清空
            </c-button>
          </div>
        </div>

        <!-- 模式指标与推演选项 -->
        <div flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-100 dark:border-zinc-700>
          <div flex items-center gap-3>
            <n-tag v-if="simulation.valid" :type="dialectBadge.type" size="medium" round>
              {{ dialectBadge.text }}
            </n-tag>
            <n-tag v-else type="error" size="medium" round>
              {{ simulation.error || '表达式非法' }}
            </n-tag>
          </div>

          <div flex items-center gap-3 text-13px>
            <span text-gray-500>推演次数:</span>
            <n-radio-group v-model:value="executionCount" size="small">
              <n-radio-button :value="5">5 次</n-radio-button>
              <n-radio-button :value="10">10 次</n-radio-button>
              <n-radio-button :value="20">20 次</n-radio-button>
            </n-radio-group>
          </div>
        </div>
      </div>
    </c-card>

    <!-- 中部：语义直译与分段解析 -->
    <div v-if="simulation.valid" grid grid-cols-1 md:grid-cols-2 gap-4 mb-4>
      <!-- 中文自然语言直译 -->
      <c-card title="中文自然语言语义直译">
        <template #header-extra>
          <n-icon size="20" text-amber-500 :component="Bulb" />
        </template>
        <div flex flex-col gap-2>
          <div text-18px font-semibold text-primary>
            {{ simulation.explanationZh }}
          </div>
          <div v-if="simulation.explanationEn" text-13px text-gray-400 font-mono>
            {{ simulation.explanationEn }}
          </div>
        </div>
      </c-card>

      <!-- 下一次触发倒计时徽标 -->
      <c-card title="距离下一次触发时刻">
        <template #header-extra>
          <n-icon size="20" text-sky-500 :component="Clock" />
        </template>
        <div v-if="simulation.nextExecutions.length > 0" flex items-center justify-between>
          <div>
            <div text-22px font-bold text-sky-600 dark:text-sky-400 font-mono>
              {{ simulation.nextExecutions[0].formatted }}
            </div>
            <div text-13px text-gray-500 mt-1>
              {{ simulation.nextExecutions[0].dayOfWeek }}
            </div>
          </div>
          <n-tag type="info" size="large" round font-semibold>
            {{ simulation.nextExecutions[0].relativeTime }}
          </n-tag>
        </div>
        <div v-else text-gray-400>
          未推演出下一次执行时刻
        </div>
      </c-card>
    </div>

    <!-- 字段拆解视图 -->
    <c-card v-if="simulation.valid && simulation.fields.length > 0" title="Cron 分段语法拆解" mb-4>
      <div grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7 gap-3>
        <div
          v-for="field in simulation.fields"
          :key="field.key"
          p-3
          rounded-md
          bg-gray-50
          dark:bg-zinc-800
          border
          border-gray-200
          dark:border-zinc-700
          flex
          flex-col
          items-center
        >
          <div text-12px text-gray-500 mb-1>{{ field.name }} ({{ field.key }})</div>
          <div text-20px font-mono font-bold text-primary mb-1>{{ field.value }}</div>
          <div text-10px text-gray-400 text-center>{{ field.allowedRange }}</div>
        </div>
      </div>
    </c-card>

    <!-- 下部：未来执行时间序列卡片与复制 -->
    <c-card title="未来执行时间推演序列">
      <template #header-extra>
        <c-button size="small" @click="copyExecutions">
          <template #icon>
            <n-icon :component="Copy" />
          </template>
          复制全部执行时间
        </c-button>
      </template>

      <div v-if="simulation.nextExecutions.length > 0" flex flex-col gap-2>
        <div
          v-for="item in simulation.nextExecutions"
          :key="item.index"
          flex
          items-center
          justify-between
          px-4
          py-2.5
          rounded-md
          border
          border-gray-100
          dark:border-zinc-800
          hover:bg-gray-50
          dark:hover:bg-zinc-800
          transition-colors
        >
          <div flex items-center gap-3>
            <n-tag size="small" round font-mono :type="item.index === 1 ? 'info' : 'default'">
              #{{ item.index }}
            </n-tag>
            <n-icon size="16" text-gray-400 :component="Calendar" />
            <span font-mono text-14px font-semibold>{{ item.formatted }}</span>
            <span text-12px text-gray-500 ml-2>{{ item.dayOfWeek }}</span>
          </div>

          <div text-13px text-gray-400 font-mono>
            {{ item.relativeTime }}
          </div>
        </div>
      </div>

      <div v-else p-8 text-center text-gray-400>
        无满足条件的执行时刻，请检查表达式语法
      </div>
    </c-card>
  </div>
</template>

<style lang="less" scoped>
.cron-simulator {
  width: 100%;
}
</style>
