<!--
  中国居民身份证透视器视图层
  @author Ateng
  @since 2026-10-02
-->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import {
  Check,
  Copy,
  Id,
  Refresh,
  ShieldCheck,
  Trash,
  Wand,
  X,
} from '@vicons/tabler';
import { useCopy } from '@/composable/copy';
import {
  PROVINCE_MAP,
  generateMockIdCards,
  inspectIdCard,
} from './chinese-id-card-inspector.service';
import type { IdCardMockOptions } from './chinese-id-card-inspector.types';

const { t } = useI18n();
const message = useMessage();
const { copy } = useCopy({ createToast: false });

const activeTab = ref<'inspect' | 'mock'>('inspect');

// 1. 透视分析状态
const inputId = ref<string>('110101199003072378');

const report = computed(() => {
  const trimmed = inputId.value.trim();
  if (!trimmed) return null;
  return inspectIdCard(trimmed);
});

function handleCopy(text: string) {
  if (!text) return;
  copy(text);
  message.success(t('tools.chinese-id-card-inspector.copySuccess'));
}

function loadValidSample() {
  const [sample] = generateMockIdCards({ count: 1, minAge: 25, maxAge: 35 });
  inputId.value = sample;
}

function load15Sample() {
  inputId.value = '110101900307237';
}

function clearInput() {
  inputId.value = '';
}

// 2. 研发测试号生成状态
const mockOptions = reactive<IdCardMockOptions>({
  provinceCode: undefined,
  gender: undefined,
  minAge: 18,
  maxAge: 60,
  count: 6,
});

const provinceSelectOptions = computed(() => {
  const list = Object.entries(PROVINCE_MAP).map(([code, name]) => ({
    label: `${code} - ${name}`,
    value: code,
  }));
  return [{ label: t('tools.chinese-id-card-inspector.mockProvinceAll'), value: '' }, ...list];
});

const generatedMocks = ref<string[]>([]);

function runGenerate() {
  generatedMocks.value = generateMockIdCards({
    provinceCode: mockOptions.provinceCode || undefined,
    gender: mockOptions.gender,
    minAge: mockOptions.minAge,
    maxAge: mockOptions.maxAge,
    count: mockOptions.count,
  });
}

function copyAllMocks() {
  if (generatedMocks.value.length === 0) return;
  copy(generatedMocks.value.join('\n'));
  message.success(t('tools.chinese-id-card-inspector.copySuccess'));
}

// 初始化生成几个示例
runGenerate();
</script>

<template>
  <div class="space-y-4">
    <n-card class="shadow-sm">
      <n-tabs v-model:value="activeTab" type="segment" animated>
        <!-- Tab 1: 校验与透视 -->
        <n-tab-pane name="inspect" :tab="t('tools.chinese-id-card-inspector.tabInspect')">
          <div class="space-y-4 mt-3">
            <!-- 顶部输入卡片 -->
            <n-card size="small" class="bg-surface">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium">
                    {{ t('tools.chinese-id-card-inspector.inputLabel') }}
                  </span>
                  <div class="flex items-center space-x-2">
                    <n-button text size="tiny" type="primary" @click="loadValidSample">
                      {{ t('tools.chinese-id-card-inspector.sampleValid') }}
                    </n-button>
                    <n-button text size="tiny" type="info" @click="load15Sample">
                      {{ t('tools.chinese-id-card-inspector.sample15') }}
                    </n-button>
                    <n-button text size="tiny" type="error" @click="clearInput">
                      <template #icon>
                        <n-icon :component="Trash" />
                      </template>
                      清空
                    </n-button>
                  </div>
                </div>

                <n-input
                  v-model:value="inputId"
                  size="large"
                  :placeholder="t('tools.chinese-id-card-inspector.inputPlaceholder')"
                  clearable
                  autofocus
                  class="font-mono text-lg"
                >
                  <template #prefix>
                    <n-icon :component="Id" class="text-gray-400 mr-1" />
                  </template>
                </n-input>
              </div>
            </n-card>

            <!-- 校验结果与透视信息 -->
            <template v-if="report">
              <!-- 1. 状态指示横幅 -->
              <div v-if="report.validation.isValid" class="p-3.5 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                <div class="flex items-center space-x-2 text-green-600 dark:text-green-400 font-medium">
                  <n-icon size="20" :component="Check" />
                  <span>{{ t('tools.chinese-id-card-inspector.validTitle') }}</span>
                  <n-tag v-if="report.validation.is15Digit" size="small" type="info" round>
                    一代 15 位身份证
                  </n-tag>
                  <n-tag v-else size="small" type="success" round>
                    二代 18 位标准身份证
                  </n-tag>
                </div>
                <div v-if="report.validation.is15Digit && report.details" class="flex items-center space-x-2 text-xs">
                  <span class="text-gray-400">{{ t('tools.chinese-id-card-inspector.upgraded18') }}</span>
                  <span class="font-mono font-bold text-primary">{{ report.details.standardNumber }}</span>
                  <n-button size="tiny" secondary type="primary" @click="handleCopy(report.details.standardNumber)">
                    复制 18 位
                  </n-button>
                </div>
              </div>

              <div v-else class="p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2 text-red-600 dark:text-red-400">
                <n-icon size="20" :component="X" />
                <span class="font-medium">{{ t('tools.chinese-id-card-inspector.invalidTitle') }}：</span>
                <span class="text-sm">{{ report.validation.errorMessage }}</span>
              </div>

              <!-- 2. 透视属性网格卡片 -->
              <div v-if="report.details" class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <!-- 归属地 -->
                <div class="p-3.5 bg-surface border border-base rounded-lg min-w-0">
                  <div class="text-xs text-gray-400 mb-1">
                    {{ t('tools.chinese-id-card-inspector.region') }}
                  </div>
                  <div class="font-medium text-base truncate" :title="report.details.fullRegion">
                    {{ report.details.fullRegion }}
                  </div>
                </div>

                <!-- 生日与年龄 -->
                <div class="p-3.5 bg-surface border border-base rounded-lg min-w-0">
                  <div class="text-xs text-gray-400 mb-1">
                    {{ t('tools.chinese-id-card-inspector.birthDate') }} / {{ t('tools.chinese-id-card-inspector.age') }}
                  </div>
                  <div class="font-medium text-base font-mono">
                    {{ report.details.birthDate }}
                    <span class="text-xs text-primary font-sans ml-1">({{ report.details.age }} 岁)</span>
                  </div>
                </div>

                <!-- 性别 -->
                <div class="p-3.5 bg-surface border border-base rounded-lg min-w-0">
                  <div class="text-xs text-gray-400 mb-1">
                    {{ t('tools.chinese-id-card-inspector.gender') }} / {{ t('tools.chinese-id-card-inspector.nominalAge') }}
                  </div>
                  <div class="font-medium text-base">
                    <n-tag size="small" :type="report.details.gender === 'male' ? 'info' : 'error'" round>
                      {{ report.details.genderText }}性
                    </n-tag>
                    <span class="text-xs text-gray-400 ml-2">虚岁 {{ report.details.nominalAge }} 岁</span>
                  </div>
                </div>

                <!-- 生肖与星座 -->
                <div class="p-3.5 bg-surface border border-base rounded-lg min-w-0">
                  <div class="text-xs text-gray-400 mb-1">
                    {{ t('tools.chinese-id-card-inspector.zodiac') }} / {{ t('tools.chinese-id-card-inspector.constellation') }}
                  </div>
                  <div class="font-medium text-base">
                    <span>属{{ report.details.chineseZodiac }}</span>
                    <span class="text-gray-400 mx-1">·</span>
                    <span class="text-amber-600 dark:text-amber-400">{{ report.details.constellation }}</span>
                  </div>
                </div>
              </div>

              <!-- 3. 校验码详细对比卡片 -->
              <n-card v-if="!report.validation.is15Digit" size="small" :title="t('tools.chinese-id-card-inspector.checksumDetail')" class="bg-surface">
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center space-x-6 font-mono">
                    <div>
                      <span class="text-gray-400 mr-2">{{ t('tools.chinese-id-card-inspector.actualChecksum') }}</span>
                      <span class="font-bold text-base">{{ report.validation.actualChecksum }}</span>
                    </div>
                    <div>
                      <span class="text-gray-400 mr-2">{{ t('tools.chinese-id-card-inspector.expectedChecksum') }}</span>
                      <span class="font-bold text-base text-primary">{{ report.validation.expectedChecksum }}</span>
                    </div>
                  </div>
                  <div>
                    <n-tag v-if="report.validation.checksumMatches" type="success" size="small" round>
                      {{ t('tools.chinese-id-card-inspector.checksumPass') }}
                    </n-tag>
                    <n-tag v-else type="error" size="small" round>
                      {{ t('tools.chinese-id-card-inspector.checksumFail') }}
                    </n-tag>
                  </div>
                </div>
              </n-card>

              <!-- 4. 安全合规脱敏卡片 -->
              <n-card v-if="report.details" size="small" :title="t('tools.chinese-id-card-inspector.maskSection')" class="bg-surface">
                <div class="space-y-3">
                  <div class="flex items-center justify-between p-2.5 bg-gray-500/5 rounded border border-base">
                    <div>
                      <div class="text-xs text-gray-400">{{ t('tools.chinese-id-card-inspector.maskFront6Back4') }}</div>
                      <div class="font-mono text-base font-semibold tracking-wider">{{ report.details.masks.front6Back4 }}</div>
                    </div>
                    <n-button size="tiny" secondary type="primary" @click="handleCopy(report.details.masks.front6Back4)">
                      <template #icon>
                        <n-icon :component="Copy" />
                      </template>
                      复制
                    </n-button>
                  </div>

                  <div class="flex items-center justify-between p-2.5 bg-gray-500/5 rounded border border-base">
                    <div>
                      <div class="text-xs text-gray-400">{{ t('tools.chinese-id-card-inspector.maskHideRegion') }}</div>
                      <div class="font-mono text-base font-semibold tracking-wider">{{ report.details.masks.hideRegion }}</div>
                    </div>
                    <n-button size="tiny" secondary @click="handleCopy(report.details.masks.hideRegion)">
                      <template #icon>
                        <n-icon :component="Copy" />
                      </template>
                      复制
                    </n-button>
                  </div>
                </div>
              </n-card>
            </template>

            <template v-else>
              <div class="p-8 text-center text-gray-400 border border-dashed border-base rounded-lg">
                请输入 18 位身份证或 15 位老一代号码以透视分析
              </div>
            </template>
          </div>
        </n-tab-pane>

        <!-- Tab 2: 研发测试虚拟号生成 -->
        <n-tab-pane name="mock" :tab="t('tools.chinese-id-card-inspector.tabMock')">
          <div class="space-y-4 mt-3">
            <n-card size="small" class="bg-surface">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <!-- 省份筛选 -->
                <div>
                  <div class="text-xs text-gray-400 mb-1">
                    {{ t('tools.chinese-id-card-inspector.mockProvince') }}
                  </div>
                  <n-select
                    v-model:value="mockOptions.provinceCode"
                    :options="provinceSelectOptions"
                    filterable
                    placeholder="全国随机"
                  />
                </div>

                <!-- 性别筛选 -->
                <div>
                  <div class="text-xs text-gray-400 mb-1">
                    {{ t('tools.chinese-id-card-inspector.mockGender') }}
                  </div>
                  <n-radio-group v-model:value="mockOptions.gender" size="medium">
                    <n-radio-button :value="undefined">
                      {{ t('tools.chinese-id-card-inspector.mockGenderAny') }}
                    </n-radio-button>
                    <n-radio-button value="male">
                      {{ t('tools.chinese-id-card-inspector.mockGenderMale') }}
                    </n-radio-button>
                    <n-radio-button value="female">
                      {{ t('tools.chinese-id-card-inspector.mockGenderFemale') }}
                    </n-radio-button>
                  </n-radio-group>
                </div>

                <!-- 生成数量 -->
                <div>
                  <div class="text-xs text-gray-400 mb-1">
                    {{ t('tools.chinese-id-card-inspector.mockCount') }}
                  </div>
                  <n-input-number
                    v-model:value="mockOptions.count"
                    :min="1"
                    :max="30"
                  />
                </div>

                <!-- 居中操作按钮 -->
                <div class="flex items-center space-x-2">
                  <n-button type="primary" class="flex-1" @click="runGenerate">
                    <template #icon>
                      <n-icon :component="Wand" />
                    </template>
                    {{ t('tools.chinese-id-card-inspector.generateButton') }}
                  </n-button>
                  <n-button secondary @click="copyAllMocks">
                    <template #icon>
                      <n-icon :component="Copy" />
                    </template>
                    {{ t('tools.chinese-id-card-inspector.batchCopy') }}
                  </n-button>
                </div>
              </div>
            </n-card>

            <!-- 生成结果列表 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="id in generatedMocks"
                :key="id"
                class="p-3 bg-surface border border-base rounded-lg flex items-center justify-between"
              >
                <div class="space-y-1">
                  <div class="font-mono text-base font-bold tracking-wide">
                    {{ id }}
                  </div>
                  <div class="text-xs text-gray-400 flex items-center space-x-2">
                    <n-tag size="tiny" type="success" round>
                      MOD 11-2 合规
                    </n-tag>
                    <span>{{ inspectIdCard(id).details?.fullRegion }}</span>
                    <span>{{ inspectIdCard(id).details?.genderText }}</span>
                    <span>{{ inspectIdCard(id).details?.age }} 岁</span>
                  </div>
                </div>

                <n-button size="small" secondary type="primary" @click="handleCopy(id)">
                  <template #icon>
                    <n-icon :component="Copy" />
                  </template>
                  复制
                </n-button>
              </div>
            </div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>
