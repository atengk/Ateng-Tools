<!-- Snowflake ID Analyzer Tool Component -->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useClipboard } from '@vueuse/core';
import {
  SNOWFLAKE_EPOCH_PRESETS,
  type SnowflakeBitMode,
  type SnowflakeGenerateParams,
} from './snowflake-id-analyzer.models';
import {
  generateSnowflakeId,
  parseBatchSnowflakeIds,
  parseSnowflakeId,
} from './snowflake-id-analyzer.service';

const { t } = useI18n();
const { copy, copied } = useClipboard();

// 1. 全局配置与选项
const selectedEpochPreset = ref<number>(SNOWFLAKE_EPOCH_PRESETS[0].epoch);
const customEpoch = ref<number>(1288834974657);
const bitMode = ref<SnowflakeBitMode>('standard');

const activeEpoch = computed(() => {
  if (selectedEpochPreset.value === 0) {
    return customEpoch.value;
  }
  return selectedEpochPreset.value;
});

const epochOptions = SNOWFLAKE_EPOCH_PRESETS.map(preset => ({
  label: preset.label,
  value: preset.epoch,
}));

const modeOptions = [
  { label: '标准 Twitter (5位机房 + 5位机器 + 12位序列)', value: 'standard' },
  { label: '精简模式 (10位机器节点 + 12位序列)', value: 'workerOnly' },
];

// 2. 单条分析状态
const sampleSingleId = '1702983748293849088';
const singleInputId = ref<string>(sampleSingleId);

const singleResult = computed(() => {
  if (!singleInputId.value.trim()) {
    return null;
  }
  try {
    return {
      data: parseSnowflakeId(singleInputId.value, {
        epoch: activeEpoch.value,
        mode: bitMode.value,
      }),
      error: null,
    };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || '解析失败',
    };
  }
});

// 3. 批量分析状态
const sampleBatchText = `1702983748293849088
1702983748293849089
1702983748293849090
1702983748293849091`;
const batchInputText = ref<string>(sampleBatchText);

const batchResult = computed(() => {
  return parseBatchSnowflakeIds(batchInputText.value, {
    epoch: activeEpoch.value,
    mode: bitMode.value,
  });
});

const batchColumns = [
  { title: '雪花 ID (Raw ID)', key: 'rawId', ellipsis: true, sorter: 'default' },
  { title: '生成时间 (Formatted Time)', key: 'formattedDateTime', sorter: 'default' },
  { title: '数据中心 (Datacenter)', key: 'datacenterId', sorter: 'default' },
  { title: '机器节点 (Worker)', key: 'workerId', sorter: (a: any, b: any) => a.workerId - b.workerId },
  { title: '序列号 (Sequence)', key: 'sequence', sorter: (a: any, b: any) => a.sequence - b.sequence },
  {
    title: '状态',
    key: 'isValid',
    render(row: any) {
      return row.isValid
        ? '正常'
        : `异常 (${row.errorMessage})`;
    },
  },
];

// 4. 反向生成器状态
const genParams = reactive<SnowflakeGenerateParams>({
  absoluteTimestamp: Date.now(),
  datacenterId: 1,
  workerId: 1,
  sequence: 0,
});

const generatedId = computed(() => {
  try {
    return generateSnowflakeId(genParams, {
      epoch: activeEpoch.value,
      mode: bitMode.value,
    });
  } catch (err: any) {
    return `生成失败: ${err?.message}`;
  }
});

function setNowTimestamp() {
  genParams.absoluteTimestamp = Date.now();
}

function loadSample() {
  singleInputId.value = sampleSingleId;
}
</script>

<template>
  <div class="snowflake-id-analyzer" style="flex: 0 0 100%">
    <!-- 顶部全局参数卡片 -->
    <c-card mb-4>
      <div flex flex-wrap items-center justify-between gap-4>
        <div flex items-center gap-2>
          <span font-semibold text-14px>纪元选择 (Epoch):</span>
          <n-select
            v-model:value="selectedEpochPreset"
            :options="epochOptions"
            style="width: 260px"
            size="small"
          />
          <n-input-number
            v-if="selectedEpochPreset === 0"
            v-model:value="customEpoch"
            size="small"
            placeholder="自定义时间戳 (ms)"
            style="width: 180px"
          />
        </div>

        <div flex items-center gap-2>
          <span font-semibold text-14px>位分配规范:</span>
          <n-select
            v-model:value="bitMode"
            :options="modeOptions"
            style="width: 320px"
            size="small"
          />
        </div>
      </div>
    </c-card>

    <!-- 主功能 Tabs -->
    <n-tabs type="line" animated>
      <!-- Tab 1: 单条深度分析 -->
      <n-tab-pane name="single" tab="单条深度分析 (Single Inspection)">
        <c-card mb-4>
          <div flex flex-col gap-3>
            <div flex items-center justify-between>
              <label font-medium text-14px>请输入 64 位雪花 ID (Snowflake ID):</label>
              <div flex gap-2>
                <c-button size="small" @click="loadSample">载入示例</c-button>
                <c-button size="small" @click="singleInputId = ''">清空</c-button>
              </div>
            </div>
            <n-input
              v-model:value="singleInputId"
              type="text"
              placeholder="例如: 1702983748293849088"
              size="large"
              clearable
            />
          </div>
        </c-card>

        <!-- 错误告警 -->
        <c-alert v-if="singleResult?.error" type="error" mb-4>
          {{ singleResult.error }}
        </c-alert>

        <!-- 解析详情 -->
        <template v-if="singleResult?.data">
          <!-- 64 位二进制视觉拆解色块 -->
          <c-card mb-4 title="64 位二进制位分布 (Bit Layout Visualizer)">
            <div flex flex-col gap-2>
              <div flex flex-wrap gap-1 font-mono text-12px overflow-x-auto p-2 bg-gray-50 dark:bg-zinc-800 rounded>
                <!-- 符号位 1 bit -->
                <span p-1 bg-gray-200 dark:bg-zinc-700 rounded title="符号位 (1位，固定为0)">
                  {{ singleResult.data.signBit }}
                </span>
                <!-- 时间戳 41 bit -->
                <span p-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded title="时间戳 (41位)">
                  {{ singleResult.data.timestampBits }}
                </span>
                <!-- 机房 ID 5 bit (若 standard 模式) -->
                <span
                  v-if="singleResult.data.datacenterBits"
                  p-1
                  bg-amber-100
                  text-amber-800
                  dark:bg-amber-900
                  dark:text-amber-200
                  rounded
                  title="数据中心 ID (5位)"
                >
                  {{ singleResult.data.datacenterBits }}
                </span>
                <!-- 机器 ID 5位或10位 -->
                <span p-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded title="机器工作节点 ID">
                  {{ singleResult.data.workerBits }}
                </span>
                <!-- 序列号 12 bit -->
                <span p-1 bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 rounded title="递增序列号 (12位)">
                  {{ singleResult.data.sequenceBits }}
                </span>
              </div>
              <div flex flex-wrap items-center gap-4 text-12px text-gray-500>
                <div flex items-center gap-1>
                  <span w-3 h-3 bg-gray-300 dark:bg-zinc-600 rounded inline-block />
                  <span>符号位 (1 bit)</span>
                </div>
                <div flex items-center gap-1>
                  <span w-3 h-3 bg-green-400 rounded inline-block />
                  <span>相对时间戳 (41 bits)</span>
                </div>
                <div v-if="bitMode === 'standard'" flex items-center gap-1>
                  <span w-3 h-3 bg-amber-400 rounded inline-block />
                  <span>数据中心 (5 bits)</span>
                </div>
                <div flex items-center gap-1>
                  <span w-3 h-3 bg-purple-400 rounded inline-block />
                  <span>机器节点 ({{ bitMode === 'standard' ? '5' : '10' }} bits)</span>
                </div>
                <div flex items-center gap-1>
                  <span w-3 h-3 bg-cyan-400 rounded inline-block />
                  <span>自增序列号 (12 bits)</span>
                </div>
              </div>
            </div>
          </c-card>

          <!-- 字段数值明细卡片 -->
          <div grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4>
            <c-card title="生成时间 (Creation Time)">
              <div text-18px font-bold text-green-600 dark:text-green-400>
                {{ singleResult.data.formattedDateTime }}
              </div>
              <div text-12px text-gray-400 mt-1>
                绝对时间戳: {{ singleResult.data.absoluteTimestamp }} ms
              </div>
            </c-card>

            <c-card title="机器工作节点 (Worker ID)">
              <div text-18px font-bold text-purple-600 dark:text-purple-400>
                {{ singleResult.data.workerId }}
              </div>
              <div text-12px text-gray-400 mt-1>
                二进制: {{ singleResult.data.workerBits }}
              </div>
            </c-card>

            <c-card title="自增序列号 (Sequence)">
              <div text-18px font-bold text-cyan-600 dark:text-cyan-400>
                {{ singleResult.data.sequence }}
              </div>
              <div text-12px text-gray-400 mt-1>
                二进制: {{ singleResult.data.sequenceBits }} (0~4095)
              </div>
            </c-card>

            <c-card v-if="singleResult.data.datacenterId !== null" title="数据中心 (Datacenter ID)">
              <div text-18px font-bold text-amber-600 dark:text-amber-400>
                {{ singleResult.data.datacenterId }}
              </div>
              <div text-12px text-gray-400 mt-1>
                二进制: {{ singleResult.data.datacenterBits }} (0~31)
              </div>
            </c-card>

            <c-card title="相对纪元偏移 (Delta Milliseconds)">
              <div text-18px font-semibold>
                +{{ singleResult.data.relativeTimestamp }} ms
              </div>
              <div text-12px text-gray-400 mt-1>
                基于纪元: {{ singleResult.data.epoch }}
              </div>
            </c-card>

            <c-card title="完整 64 位二进制">
              <div font-mono text-11px break-all>
                {{ singleResult.data.binary }}
              </div>
              <c-button size="tiny" mt-2 @click="copy(singleResult.data.binary)">
                复制二进制
              </c-button>
            </c-card>
          </div>
        </template>
      </n-tab-pane>

      <!-- Tab 2: 批量分析 -->
      <n-tab-pane name="batch" tab="多行批量分析 (Batch Inspection)">
        <c-card mb-4>
          <div flex flex-col gap-3>
            <div flex items-center justify-between>
              <label font-medium text-14px>粘贴多个雪花 ID (每行一个):</label>
              <c-button size="small" @click="batchInputText = sampleBatchText">载入批量示例</c-button>
            </div>
            <n-input
              v-model:value="batchInputText"
              type="textarea"
              :rows="5"
              placeholder="每行一个 64 位雪花 ID"
            />
          </div>
        </c-card>

        <c-card title="批量解析结果">
          <n-data-table
            :columns="batchColumns"
            :data="batchResult"
            :pagination="{ pageSize: 10 }"
          />
        </c-card>
      </n-tab-pane>

      <!-- Tab 3: 反向生成器 -->
      <n-tab-pane name="generator" tab="雪花 ID 生成器 (ID Generator)">
        <c-card mb-4>
          <div grid grid-cols-1 md:grid-cols-2 gap-4>
            <div>
              <label block text-13px font-medium mb-1>指定绝对时间戳 (ms):</label>
              <div flex gap-2>
                <n-input-number
                  v-model:value="genParams.absoluteTimestamp"
                  style="width: 100%"
                />
                <c-button size="small" @click="setNowTimestamp">当前时间</c-button>
              </div>
            </div>

            <div v-if="bitMode === 'standard'">
              <label block text-13px font-medium mb-1>数据中心 ID (0~31):</label>
              <n-input-number
                v-model:value="genParams.datacenterId"
                :min="0"
                :max="31"
                style="width: 100%"
              />
            </div>

            <div>
              <label block text-13px font-medium mb-1>
                机器工作节点 ID (0~{{ bitMode === 'standard' ? 31 : 1023 }}):
              </label>
              <n-input-number
                v-model:value="genParams.workerId"
                :min="0"
                :max="bitMode === 'standard' ? 31 : 1023"
                style="width: 100%"
              />
            </div>

            <div>
              <label block text-13px font-medium mb-1>自增序列号 (0~4095):</label>
              <n-input-number
                v-model:value="genParams.sequence"
                :min="0"
                :max="4095"
                style="width: 100%"
              />
            </div>
          </div>
        </c-card>

        <c-card title="生成的 64 位雪花 ID">
          <div flex items-center justify-between gap-4>
            <span text-22px font-bold font-mono text-primary>
              {{ generatedId }}
            </span>
            <c-button size="medium" @click="copy(generatedId)">
              {{ copied ? '已复制' : '复制 ID' }}
            </c-button>
          </div>
        </c-card>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
