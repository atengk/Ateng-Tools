<template>
  <div class="space-y-4">
    <!-- 顶部维度选择选项卡 -->
    <n-card size="small" class="shadow-sm">
      <n-tabs
        v-model:value="activeDimensionId"
        type="segment"
        animated
        @update:value="handleDimensionChange"
      >
        <n-tab-pane
          v-for="dim in allDimensions"
          :key="dim.id"
          :name="dim.id"
          :tab="t(dim.nameKey)"
        />
      </n-tabs>
    </n-card>

    <!-- 换算配置与矩阵主区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <!-- 左侧：输入源与换算选项 (占 4 列) -->
      <div class="lg:col-span-4 min-w-0 space-y-4">
        <n-card :title="t('tools.unit-converter.sourceInputTitle')" size="small">
          <n-form label-placement="top" size="medium">
            <n-form-item :label="t('tools.unit-converter.sourceUnitLabel')">
              <n-select
                v-model:value="sourceUnitId"
                :options="unitSelectOptions"
                filterable
              />
            </n-form-item>

            <n-form-item :label="t('tools.unit-converter.sourceValueLabel')">
              <n-input-number
                v-model:value="sourceValue"
                :precision="undefined"
                class="w-full"
                placeholder="1"
                clearable
              />
            </n-form-item>

            <!-- 常用快捷数值 -->
            <div class="flex flex-wrap gap-1.5 mb-2">
              <n-button
                v-for="quick in [1, 10, 100, 1000]"
                :key="quick"
                size="tiny"
                secondary
                @click="sourceValue = quick"
              >
                {{ quick }}
              </n-button>
              <n-button
                size="tiny"
                secondary
                @click="sourceValue = 0.5"
              >
                0.5
              </n-button>
            </div>
          </n-form>
        </n-card>

        <!-- 精度设置卡片 -->
        <n-card :title="t('tools.unit-converter.optionsTitle')" size="small">
          <div class="space-y-4">
            <div>
              <div class="flex justify-between items-center mb-1 text-xs text-neutral-500">
                <span>{{ t('tools.unit-converter.precisionLabel') }}</span>
                <span class="font-mono font-bold">{{ precision }} 位</span>
              </div>
              <n-slider
                v-model:value="precision"
                :min="0"
                :max="10"
                :step="1"
              />
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm text-neutral-700 dark:text-neutral-300">
                {{ t('tools.unit-converter.trimZerosLabel') }}
              </span>
              <n-switch v-model:value="removeTrailingZeros" size="small" />
            </div>

            <!-- 系统筛选 -->
            <div>
              <div class="text-xs text-neutral-500 mb-2">
                {{ t('tools.unit-converter.filterSystemLabel') }}
              </div>
              <n-radio-group v-model:value="systemFilter" size="small">
                <n-radio-button value="all">
                  {{ t('tools.unit-converter.allSystems') }}
                </n-radio-button>
                <n-radio-button value="metric">
                  {{ t('tools.unit-converter.metricSystem') }}
                </n-radio-button>
                <n-radio-button value="imperial">
                  {{ t('tools.unit-converter.imperialSystem') }}
                </n-radio-button>
                <n-radio-button value="chinese">
                  {{ t('tools.unit-converter.chineseSystem') }}
                </n-radio-button>
              </n-radio-group>
            </div>
          </div>
        </n-card>
      </div>

      <!-- 右侧：换算结果网格 (占 8 列) -->
      <div class="lg:col-span-8 min-w-0 space-y-3">
        <n-card
          :title="`${t('tools.unit-converter.resultsTitle')} (${filteredResults.length})`"
          size="small"
        >
          <template #header-extra>
            <n-button size="tiny" secondary type="primary" @click="handleCopyAll">
              {{ t('tools.unit-converter.copyAll') }}
            </n-button>
          </template>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              v-for="item in filteredResults"
              :key="item.id"
              class="p-3 rounded-lg border transition-all duration-200 hover:shadow-md min-w-0"
              :class="item.id === sourceUnitId
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : 'border-neutral-200 dark:border-neutral-800 bg-surface'"
            >
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="font-medium text-sm truncate">
                    {{ t(item.name) }}
                  </span>
                  <n-tag size="tiny" :type="getSystemTagType(item.system)" round>
                    {{ item.symbol }}
                  </n-tag>
                </div>
                <n-tag
                  v-if="item.id === sourceUnitId"
                  size="tiny"
                  type="success"
                  round
                >
                  {{ t('tools.unit-converter.currentSource') }}
                </n-tag>
                <n-button
                  v-else
                  size="tiny"
                  quaternary
                  @click="setAsSource(item.id, item.value)"
                >
                  {{ t('tools.unit-converter.setAsSource') }}
                </n-button>
              </div>

              <!-- 数值展示与复制 -->
              <div class="flex items-baseline justify-between gap-2 mt-2 min-w-0">
                <div class="text-lg font-bold font-mono tracking-tight truncate text-primary select-all">
                  {{ item.formatted }}
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <n-button
                        size="tiny"
                        quaternary
                        circle
                        @click="handleCopyValue(item.formatted)"
                      >
                        <template #icon>
                          <n-icon :component="CopyIcon" />
                        </template>
                      </n-button>
                    </template>
                    {{ t('tools.unit-converter.copyValue') }}
                  </n-tooltip>
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <n-button
                        size="tiny"
                        quaternary
                        circle
                        @click="handleCopyFullEquation(item)"
                      >
                        <template #icon>
                          <n-icon :component="EqualIcon" />
                        </template>
                      </n-button>
                    </template>
                    {{ t('tools.unit-converter.copyFullEquation') }}
                  </n-tooltip>
                </div>
              </div>

              <!-- 科学计数法辅助行 (极值时提示) -->
              <div
                v-if="item.scientific !== item.formatted && Math.abs(item.value) >= 1e6"
                class="text-2xs font-mono text-neutral-400 mt-0.5 truncate"
              >
                ≈ {{ item.scientific }} {{ item.symbol }}
              </div>
            </div>
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 万能物理单位换算器视图展示
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { Copy as CopyIcon, Equal as EqualIcon } from '@vicons/tabler';
import { useCopy } from '@/composable/copy';
import type { DimensionId, UnitSystem } from './unit-converter.types';
import {
  convertDimension,
  getAllDimensions,
  getDimension,
} from './unit-converter.service';

const { t } = useI18n();
const message = useMessage();
const { copy } = useCopy({ createToast: false });

const allDimensions = getAllDimensions();
const activeDimensionId = ref<DimensionId>('length');

// 当前维度对象
const currentDimension = computed(() => getDimension(activeDimensionId.value));

// 来源单位与数值
const sourceUnitId = ref<string>('m');
const sourceValue = ref<number | null>(1);

// 换算设置
const precision = ref<number>(6);
const removeTrailingZeros = ref<boolean>(true);
const systemFilter = ref<string>('all');

// 维度切换处理
function handleDimensionChange(newDimId: string) {
  const dim = getDimension(newDimId as DimensionId);
  if (dim) {
    sourceUnitId.value = dim.baseUnitId;
    sourceValue.value = 1;
  }
}

// 下拉框选项
const unitSelectOptions = computed(() => {
  if (!currentDimension.value) return [];
  return currentDimension.value.units.map(u => ({
    label: `${t(u.nameKey)} (${u.symbol})`,
    value: u.id,
  }));
});

// 计算所有换算结果
const conversionResults = computed(() => {
  const val = sourceValue.value ?? 0;
  return convertDimension(
    activeDimensionId.value,
    sourceUnitId.value,
    val,
    {
      precision: precision.value,
      removeTrailingZeros: removeTrailingZeros.value,
    },
  );
});

// 筛选后的结果
const filteredResults = computed(() => {
  if (systemFilter.value === 'all') {
    return conversionResults.value;
  }
  return conversionResults.value.filter(item => item.system === systemFilter.value);
});

// 设置某个单位为来源基准
function setAsSource(unitId: string, val: number) {
  sourceUnitId.value = unitId;
  sourceValue.value = Number(val.toFixed(precision.value));
}

// 复制纯数值
async function handleCopyValue(valStr: string) {
  const ok = await copy(valStr);
  if (ok) {
    message.success(t('tools.unit-converter.copiedValue'));
  }
}

// 复制等式，如: "1 m = 3 尺"
async function handleCopyFullEquation(item: any) {
  const sourceUnit = currentDimension.value?.units.find(u => u.id === sourceUnitId.value);
  const srcSymbol = sourceUnit?.symbol || '';
  const equation = `${sourceValue.value ?? 0} ${srcSymbol} = ${item.formatted} ${item.symbol}`;
  const ok = await copy(equation);
  if (ok) {
    message.success(t('tools.unit-converter.copiedEquation'));
  }
}

// 复制全量换算表
async function handleCopyAll() {
  const sourceUnit = currentDimension.value?.units.find(u => u.id === sourceUnitId.value);
  const srcSymbol = sourceUnit?.symbol || '';
  const header = `=== ${t(currentDimension.value?.nameKey || '')} (${sourceValue.value ?? 0} ${srcSymbol}) ===\n`;
  const lines = filteredResults.value.map(
    item => `${t(item.name)} (${item.symbol}): ${item.formatted}`,
  );
  const text = header + lines.join('\n');
  const ok = await copy(text);
  if (ok) {
    message.success(t('tools.unit-converter.copiedAll'));
  }
}

// 标签类型匹配
function getSystemTagType(sys: UnitSystem): 'default' | 'info' | 'warning' | 'success' {
  switch (sys) {
    case 'metric':
      return 'info';
    case 'imperial':
      return 'warning';
    case 'chinese':
      return 'success';
    default:
      return 'default';
  }
}
</script>
