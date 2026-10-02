<!--
  人民币大写金额转换器视图层
  @author Ateng
  @since 2026-10-02
-->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import {
  ArrowsExchange,
  Check,
  Coins,
  Copy,
  FileInvoice,
  Rotate,
  Trash,
} from '@vicons/tabler';
import { useCopy } from '@/composable/copy';
import {
  numberToRmbWords,
  rmbWordsToNumber,
} from './rmb-amount-converter.service';
import type {
  RmbConvertOptions,
  RmbIntegerSuffix,
  RmbRoundMode,
} from './rmb-amount-converter.types';

const { t } = useI18n();
const message = useMessage();
const { copy } = useCopy({ createToast: false });

const activeTab = ref<'toWords' | 'toNumber'>('toWords');

// 1. 数字转大写状态
const rawInput = ref<string>('12345.67');
const convertOptions = reactive<RmbConvertOptions>({
  showPrefix: false,
  integerSuffix: '整',
  roundMode: 'round',
});

const quickPresets = [
  { label: '¥100', value: '100' },
  { label: '¥1,000', value: '1000' },
  { label: '¥10,000', value: '10000' },
  { label: '¥100,000', value: '100000' },
  { label: '¥1,000,000', value: '1000000' },
  { label: '¥123,456.78', value: '123456.78' },
  { label: '¥100,010.01', value: '100010.01' },
];

const convertResult = computed(() => {
  const trimmed = rawInput.value.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return {
      success: true,
      data: numberToRmbWords(trimmed, convertOptions),
      error: '',
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : '金额格式错误',
    };
  }
});

function handleCopy(text: string) {
  if (!text) return;
  copy(text);
  message.success(t('tools.rmb-amount-converter.copySuccess'));
}

function setPreset(val: string) {
  rawInput.value = val;
}

function clearInput() {
  rawInput.value = '';
}

// 2. 大写转数字状态
const rawWordsInput = ref<string>('壹万贰仟叁佰肆拾伍元陆角柒分');

const parseResult = computed(() => {
  const trimmed = rawWordsInput.value.trim();
  if (!trimmed) {
    return null;
  }
  return rmbWordsToNumber(trimmed);
});

function loadSampleWords() {
  rawWordsInput.value = '人民币壹万贰仟叁佰肆拾伍元陆角柒分';
}

function clearWordsInput() {
  rawWordsInput.value = '';
}
</script>

<template>
  <div class="space-y-4">
    <!-- 主工作区 Tabs -->
    <n-card class="shadow-sm">
      <n-tabs v-model:value="activeTab" type="segment" animated>
        <!-- Tab 1: 数字转大写 -->
        <n-tab-pane name="toWords" :tab="t('tools.rmb-amount-converter.tabToWords')">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3">
            <!-- 左侧：输入与配置 -->
            <div class="lg:col-span-5 space-y-4 min-w-0">
              <n-card size="small" :title="t('tools.rmb-amount-converter.inputAmountLabel')" class="bg-surface">
                <template #header-extra>
                  <n-button text size="tiny" type="error" @click="clearInput">
                    <template #icon>
                      <n-icon :component="Trash" />
                    </template>
                    清空
                  </n-button>
                </template>

                <div class="space-y-3">
                  <n-input
                    v-model:value="rawInput"
                    size="large"
                    placeholder="12345.67"
                    clearable
                    autofocus
                  >
                    <template #prefix>
                      <span class="font-bold text-gray-500 mr-1">￥</span>
                    </template>
                  </n-input>

                  <!-- 常用金额快捷预设 -->
                  <div>
                    <div class="text-xs text-gray-400 mb-1">
                      {{ t('tools.rmb-amount-converter.quickPresets') }}
                    </div>
                    <div class="flex flex-wrap gap-1.5">
                      <n-tag
                        v-for="item in quickPresets"
                        :key="item.value"
                        size="small"
                        round
                        checkable
                        :checked="rawInput === item.value"
                        class="cursor-pointer"
                        @click="setPreset(item.value)"
                      >
                        {{ item.label }}
                      </n-tag>
                    </div>
                  </div>

                  <n-divider class="my-2" />

                  <!-- 转换选项 -->
                  <div class="space-y-2.5 text-sm">
                    <div class="flex items-center justify-between">
                      <span>{{ t('tools.rmb-amount-converter.optionPrefix') }}</span>
                      <n-switch v-model:value="convertOptions.showPrefix" size="small" />
                    </div>

                    <div class="flex items-center justify-between">
                      <span>{{ t('tools.rmb-amount-converter.optionSuffix') }}</span>
                      <n-radio-group
                        v-model:value="convertOptions.integerSuffix"
                        size="small"
                      >
                        <n-radio-button value="整">
                          {{ t('tools.rmb-amount-converter.suffixZheng') }}
                        </n-radio-button>
                        <n-radio-button value="正">
                          {{ t('tools.rmb-amount-converter.suffixZheng2') }}
                        </n-radio-button>
                        <n-radio-button value="">
                          {{ t('tools.rmb-amount-converter.suffixNone') }}
                        </n-radio-button>
                      </n-radio-group>
                    </div>

                    <div class="flex items-center justify-between">
                      <span>{{ t('tools.rmb-amount-converter.optionRound') }}</span>
                      <n-radio-group
                        v-model:value="convertOptions.roundMode"
                        size="small"
                      >
                        <n-radio-button value="round">
                          {{ t('tools.rmb-amount-converter.roundRound') }}
                        </n-radio-button>
                        <n-radio-button value="truncate">
                          {{ t('tools.rmb-amount-converter.roundTruncate') }}
                        </n-radio-button>
                      </n-radio-group>
                    </div>
                  </div>
                </div>
              </n-card>
            </div>

            <!-- 右侧：大写展示与导出 -->
            <div class="lg:col-span-7 space-y-4 min-w-0">
              <template v-if="convertResult && convertResult.success && convertResult.data">
                <!-- 核心结果卡片 -->
                <n-card size="small" class="bg-surface shadow-xs">
                  <div class="space-y-4">
                    <!-- 大写主文本 -->
                    <div>
                      <div class="text-xs text-gray-400 mb-1 flex items-center justify-between">
                        <span>{{ t('tools.rmb-amount-converter.wordsLabel') }}</span>
                        <n-button
                          size="tiny"
                          secondary
                          type="primary"
                          @click="handleCopy(convertResult.data.words)"
                        >
                          <template #icon>
                            <n-icon :component="Copy" />
                          </template>
                          复制
                        </n-button>
                      </div>
                      <div class="p-3.5 bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/20 rounded-lg">
                        <div class="text-xl sm:text-2xl font-semibold tracking-wide text-primary break-all">
                          {{ convertResult.data.words }}
                        </div>
                      </div>
                    </div>

                    <!-- 带前缀形式 -->
                    <div>
                      <div class="text-xs text-gray-400 mb-1 flex items-center justify-between">
                        <span>{{ t('tools.rmb-amount-converter.prefixedWordsLabel') }}</span>
                        <n-button
                          size="tiny"
                          secondary
                          @click="handleCopy(convertResult.data.prefixedWords)"
                        >
                          <template #icon>
                            <n-icon :component="Copy" />
                          </template>
                          复制
                        </n-button>
                      </div>
                      <div class="p-2.5 bg-gray-500/5 border border-base rounded text-base font-medium break-all">
                        {{ convertResult.data.prefixedWords }}
                      </div>
                    </div>

                    <!-- 规范发票/合同模板 -->
                    <div>
                      <div class="text-xs text-gray-400 mb-1 flex items-center justify-between">
                        <span>{{ t('tools.rmb-amount-converter.templateLabel') }}</span>
                        <n-button
                          size="tiny"
                          type="success"
                          secondary
                          @click="handleCopy(convertResult.data.standardTemplate)"
                        >
                          <template #icon>
                            <n-icon :component="Copy" />
                          </template>
                          一键复制模板
                        </n-button>
                      </div>
                      <div class="p-2.5 bg-gray-500/5 border border-base rounded text-sm text-gray-700 dark:text-gray-300 break-all font-mono">
                        {{ convertResult.data.standardTemplate }}
                      </div>
                    </div>

                    <!-- 千分位格式化金额 -->
                    <div class="pt-1 border-t border-base flex items-center justify-between text-xs text-gray-500">
                      <span>{{ t('tools.rmb-amount-converter.formattedAmountLabel') }}</span>
                      <span class="font-mono font-medium text-sm text-gray-700 dark:text-gray-200">
                        ￥{{ convertResult.data.formattedNumber }}
                      </span>
                    </div>
                  </div>
                </n-card>

                <!-- 拆解明细与数码对照 -->
                <n-card size="small" :title="t('tools.rmb-amount-converter.breakdownTitle')" class="bg-surface">
                  <div class="grid grid-cols-3 gap-2 text-center text-xs">
                    <div class="p-2 bg-gray-500/5 rounded">
                      <div class="text-gray-400 mb-1">
                        {{ t('tools.rmb-amount-converter.breakdownInt') }}
                      </div>
                      <div class="font-medium truncate" :title="convertResult.data.breakdown.integerPart">
                        {{ convertResult.data.breakdown.integerPart }}
                      </div>
                    </div>
                    <div class="p-2 bg-gray-500/5 rounded">
                      <div class="text-gray-400 mb-1">
                        {{ t('tools.rmb-amount-converter.breakdownJiao') }}
                      </div>
                      <div class="font-medium">
                        {{ convertResult.data.breakdown.jiao || '—' }}
                      </div>
                    </div>
                    <div class="p-2 bg-gray-500/5 rounded">
                      <div class="text-gray-400 mb-1">
                        {{ t('tools.rmb-amount-converter.breakdownFen') }}
                      </div>
                      <div class="font-medium">
                        {{ convertResult.data.breakdown.fen || '—' }}
                      </div>
                    </div>
                  </div>
                </n-card>
              </template>

              <!-- 错误状态提示 -->
              <template v-else-if="convertResult && !convertResult.success">
                <n-alert type="error" :title="convertResult.error" />
              </template>

              <!-- 空状态提示 -->
              <template v-else>
                <div class="p-8 text-center text-gray-400 border border-dashed border-base rounded-lg">
                  请输入有效的金额数值以生成中文大写
                </div>
              </template>
            </div>
          </div>
        </n-tab-pane>

        <!-- Tab 2: 大写转数字 -->
        <n-tab-pane name="toNumber" :tab="t('tools.rmb-amount-converter.tabToNumber')">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3">
            <!-- 左侧：输入大写 -->
            <div class="lg:col-span-6 space-y-4 min-w-0">
              <n-card size="small" :title="t('tools.rmb-amount-converter.inputWordsLabel')" class="bg-surface">
                <template #header-extra>
                  <n-space size="small">
                    <n-button text size="tiny" type="primary" @click="loadSampleWords">
                      {{ t('tools.rmb-amount-converter.sampleWords') }}
                    </n-button>
                    <n-button text size="tiny" type="error" @click="clearWordsInput">
                      <template #icon>
                        <n-icon :component="Trash" />
                      </template>
                      清空
                    </n-button>
                  </n-space>
                </template>

                <n-input
                  v-model:value="rawWordsInput"
                  type="textarea"
                  :rows="4"
                  :placeholder="t('tools.rmb-amount-converter.inputWordsPlaceholder')"
                  clearable
                />
              </n-card>
            </div>

            <!-- 右侧：反向还原结果 -->
            <div class="lg:col-span-6 space-y-4 min-w-0">
              <n-card size="small" :title="t('tools.rmb-amount-converter.cardParsedResult')" class="bg-surface">
                <template v-if="parseResult && parseResult.success">
                  <div class="space-y-4">
                    <div>
                      <div class="text-xs text-gray-400 mb-1 flex items-center justify-between">
                        <span>{{ t('tools.rmb-amount-converter.parsedAmountLabel') }}</span>
                        <n-button
                          size="tiny"
                          secondary
                          type="primary"
                          @click="handleCopy(String(parseResult.amount))"
                        >
                          <template #icon>
                            <n-icon :component="Copy" />
                          </template>
                          复制纯数值
                        </n-button>
                      </div>
                      <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div class="text-2xl font-bold font-mono text-primary">
                          {{ parseResult.amount }}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div class="text-xs text-gray-400 mb-1 flex items-center justify-between">
                        <span>{{ t('tools.rmb-amount-converter.formattedAmountLabel') }}</span>
                        <n-button
                          size="tiny"
                          secondary
                          @click="handleCopy(parseResult.formattedNumber)"
                        >
                          <template #icon>
                            <n-icon :component="Copy" />
                          </template>
                          复制千分位
                        </n-button>
                      </div>
                      <div class="p-2.5 bg-gray-500/5 border border-base rounded font-mono text-lg font-semibold text-gray-800 dark:text-gray-100">
                        ￥{{ parseResult.formattedNumber }}
                      </div>
                    </div>
                  </div>
                </template>

                <template v-else-if="parseResult && !parseResult.success">
                  <n-alert type="warning" :title="parseResult.errorMessage || t('tools.rmb-amount-converter.parseError')" />
                </template>

                <template v-else>
                  <div class="p-8 text-center text-gray-400 border border-dashed border-base rounded-lg">
                    请输入中文金融大写金额以还原为数字
                  </div>
                </template>
              </n-card>
            </div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>
