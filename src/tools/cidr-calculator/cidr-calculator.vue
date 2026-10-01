<script setup lang="ts">
/**
 * CIDR 聚合与无类子网合并器视图层组件
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { computed, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  AlertTriangle,
  ArrowsJoin,
  Check,
  ClearAll,
  Copy,
  Network,
  Wand,
} from '@vicons/tabler';
import type { CidrBlock } from './cidr-calculator.types';
import { calculateCidrSummary } from './cidr-calculator.service';
import { useCopy } from '@/composable/copy';

const message = useMessage();

// 1. 预设实用示例
const samplePresets = [
  {
    label: '连续网段聚合 (/24 合并为 /23)',
    value: '192.168.0.0/24\n192.168.1.0/24',
  },
  {
    label: '跨机房 4 网段合并 (/22 超网)',
    value: '10.100.0.0/24\n10.100.1.0/24\n10.100.2.0/24\n10.100.3.0/24',
  },
  {
    label: '重叠冲突与子网包含排查',
    value: '172.16.0.0/16\n172.16.1.0/24\n172.16.1.128/25\n172.16.2.0/24',
  },
  {
    label: '混合散列网段综合计算',
    value: '192.168.10.0/24\n192.168.11.0/24\n192.168.20.0/24\n10.0.0.1\n10.0.0.2',
  },
];

// 2. 状态输入
const rawInput = ref('192.168.0.0/24\n192.168.1.0/24');

// 3. 计算聚合结果
const summary = computed(() => calculateCidrSummary(rawInput.value));

// 4. 聚合后 CIDR 纯文本 (用于一键复制)
const aggregatedText = computed(() =>
  summary.value.aggregatedBlocks.map(b => b.cidr).join('\n'),
);

const { copy: copyAggregated } = useCopy({
  source: aggregatedText,
  createToast: false,
});

function handleCopyAggregated() {
  if (summary.value.aggregatedBlocks.length === 0) {
    message.warning('当前无有效的聚合网段结果');
    return;
  }
  copyAggregated();
  message.success('已复制聚合网段列表至剪贴板');
}

function handleCopySingle(cidr: string) {
  const { copy } = useCopy({ source: ref(cidr), createToast: false });
  copy();
  message.success(`已复制 ${cidr} 至剪贴板`);
}

function handleApplyPreset(val: string) {
  rawInput.value = val;
  message.info('已加载示例网段数据');
}

function handleClear() {
  rawInput.value = '';
}
</script>

<template>
  <div class="space-y-4">
    <!-- 主工作区：响应式栅格 -->
    <n-grid cols="1 s:1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
      <!-- 左侧：网段输入与配置 -->
      <n-gi>
        <n-card title="输入待聚合网段 (CIDR 列表)" size="small">
          <template #header-extra>
            <n-tag type="info" size="small" round>
              有效: {{ summary.validInputs.length }} | 无效: {{ summary.invalidInputs.length }}
            </n-tag>
          </template>

          <!-- 快捷预设按钮组 -->
          <div class="mb-3">
            <div class="text-xs text-neutral-500 mb-1.5 flex items-center gap-1">
              <n-icon size="14" :component="Wand" />
              <span>快速载入常用网段规划示例：</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <n-button
                v-for="preset in samplePresets"
                :key="preset.label"
                size="tiny"
                quaternary
                type="primary"
                @click="handleApplyPreset(preset.value)"
              >
                {{ preset.label }}
              </n-button>
            </div>
          </div>

          <n-form-item label="待合并 CIDR 网段 (支持换行、逗号或分号分隔)" :show-feedback="false">
            <n-input
              v-model:value="rawInput"
              type="textarea"
              placeholder="请输入 IPv4 网段或单个 IP 地址，例如：
192.168.0.0/24
192.168.1.0/24
10.0.0.1"
              :rows="11"
              style="font-family: monospace"
            />
          </n-form-item>

          <div v-if="summary.invalidInputs.length > 0" class="mt-3">
            <n-alert type="warning" size="small" title="以下输入格式无法解析，已自动忽略：">
              <div class="font-mono text-xs mt-1">
                {{ summary.invalidInputs.join(', ') }}
              </div>
            </n-alert>
          </div>

          <!-- 操作栏按钮组统一居中排布 -->
          <div class="mt-4 flex justify-center items-center gap-3">
            <n-button quaternary size="small" @click="handleClear">
              <template #icon>
                <n-icon :component="ClearAll" />
              </template>
              清空输入
            </n-button>
          </div>
        </n-card>
      </n-gi>

      <!-- 右侧：聚合结果核心概览 -->
      <n-gi>
        <n-card title="超网合并与聚合结果" size="small">
          <template #header-extra>
            <n-button
              size="tiny"
              type="primary"
              secondary
              :disabled="summary.aggregatedBlocks.length === 0"
              @click="handleCopyAggregated"
            >
              <template #icon>
                <n-icon :component="Copy" />
              </template>
              复制聚合结果
            </n-button>
          </template>

          <!-- 核心统计指标卡片 -->
          <n-grid cols="3" :x-gap="8" class="mb-4">
            <n-gi>
              <div class="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg text-center border border-neutral-100 dark:border-neutral-700/50">
                <div class="text-xs text-neutral-400">聚合前网段数</div>
                <div class="text-xl font-bold text-neutral-700 dark:text-neutral-200 mt-1">
                  {{ summary.validInputs.length }}
                </div>
              </div>
            </n-gi>
            <n-gi>
              <div class="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg text-center border border-blue-100 dark:border-blue-800/30">
                <div class="text-xs text-blue-600 dark:text-blue-400">聚合后网段数</div>
                <div class="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {{ summary.aggregatedBlocks.length }}
                </div>
              </div>
            </n-gi>
            <n-gi>
              <div class="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg text-center border border-emerald-100 dark:border-emerald-800/30">
                <div class="text-xs text-emerald-600 dark:text-emerald-400">去重总 IP 容量</div>
                <div class="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {{ summary.uniqueIpCount.toLocaleString() }}
                </div>
              </div>
            </n-gi>
          </n-grid>

          <!-- 最小总超网卡片 (涵盖全部输入的最小网段) -->
          <div v-if="summary.minimalSupernet" class="p-3 mb-4 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <n-icon size="18" class="text-indigo-600" :component="ArrowsJoin" />
                <span class="text-xs font-semibold text-indigo-700 dark:text-indigo-400">全局最小聚合总超网 (Minimal Supernet)</span>
              </div>
              <n-button size="tiny" text type="primary" @click="handleCopySingle(summary.minimalSupernet.cidr)">
                复制
              </n-button>
            </div>
            <div class="font-mono text-base font-bold text-indigo-900 dark:text-indigo-200 mt-1.5">
              {{ summary.minimalSupernet.cidr }}
            </div>
            <div class="text-xs text-neutral-500 mt-1 flex flex-wrap gap-x-4">
              <span>掩码: {{ summary.minimalSupernet.subnetMask }}</span>
              <span>广播: {{ summary.minimalSupernet.broadcastAddress }}</span>
              <span>可用主机: {{ summary.minimalSupernet.usableHosts.toLocaleString() }}</span>
            </div>
          </div>

          <!-- 聚合网段清单列表 -->
          <div class="text-xs font-medium text-neutral-500 mb-2">精简聚合后的最小无类子网列表：</div>
          <div v-if="summary.aggregatedBlocks.length > 0" class="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
            <div
              v-for="item in summary.aggregatedBlocks"
              :key="item.cidr"
              class="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/60 hover:border-blue-400 transition-colors"
            >
              <div class="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                {{ item.cidr }}
              </div>
              <div class="text-xs text-neutral-400 flex items-center gap-3">
                <span>{{ item.networkAddress }} ~ {{ item.broadcastAddress }}</span>
                <span class="bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-[11px]">
                  {{ item.totalIps.toLocaleString() }} IP
                </span>
                <n-button size="tiny" quaternary circle @click="handleCopySingle(item.cidr)">
                  <template #icon>
                    <n-icon :component="Copy" />
                  </template>
                </n-button>
              </div>
            </div>
          </div>
          <n-empty v-else description="暂无有效网段" class="py-8" />
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 冲突与重叠警报面板 -->
    <n-card v-if="summary.conflicts.length > 0" size="small" class="border-amber-200 dark:border-amber-900/40">
      <template #header>
        <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <n-icon size="18" :component="AlertTriangle" />
          <span>输入网段冲突与重叠告警 (共检测到 {{ summary.conflicts.length }} 处)</span>
        </div>
      </template>

      <div class="space-y-1.5 max-h-48 overflow-y-auto">
        <div
          v-for="(c, idx) in summary.conflicts"
          :key="idx"
          class="text-xs flex items-center justify-between p-2 rounded bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 border border-amber-100 dark:border-amber-900/30"
        >
          <span>{{ c.description }}</span>
          <n-tag size="tiny" :type="c.type === 'exact' ? 'error' : 'warning'">
            {{ c.type === 'exact' ? '完全重复' : '包含子网' }}
          </n-tag>
        </div>
      </div>
    </n-card>

    <!-- 详细网络属性矩阵表格 -->
    <n-card v-if="summary.aggregatedBlocks.length > 0" title="聚合网段详细属性矩阵" size="small">
      <n-table size="small" :bordered="true" :single-line="false" striped>
        <thead>
          <tr>
            <th>聚合 CIDR</th>
            <th>子网掩码</th>
            <th>反掩码 (通配符)</th>
            <th>首个可用 IP</th>
            <th>末尾可用 IP</th>
            <th>广播地址</th>
            <th>可用主机数</th>
          </tr>
        </thead>
        <tbody class="font-mono text-xs">
          <tr v-for="b in summary.aggregatedBlocks" :key="b.cidr">
            <td class="font-bold text-blue-600 dark:text-blue-400">{{ b.cidr }}</td>
            <td>{{ b.subnetMask }}</td>
            <td>{{ b.wildcardMask }}</td>
            <td>{{ b.firstUsableIp }}</td>
            <td>{{ b.lastUsableIp }}</td>
            <td>{{ b.broadcastAddress }}</td>
            <td>{{ b.usableHosts.toLocaleString() }}</td>
          </tr>
        </tbody>
      </n-table>
    </n-card>
  </div>
</template>
