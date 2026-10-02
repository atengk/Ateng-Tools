<template>
  <div class="space-y-4">
    <!-- 主工作区：双栏布局 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <!-- 左栏：源码输入与清洗配置 (5 列) -->
      <div class="lg:col-span-5 min-w-0 space-y-4">
        <n-card :title="t('tools.svg-to-component-converter.inputCardTitle')" size="small">
          <template #header-extra>
            <div class="flex items-center gap-2">
              <n-button size="tiny" quaternary @click="loadSampleSvg">
                {{ t('tools.svg-to-component-converter.loadSample') }}
              </n-button>
              <n-button size="tiny" quaternary @click="clearInput">
                {{ t('tools.svg-to-component-converter.clear') }}
              </n-button>
            </div>
          </template>

          <n-input
            v-model:value="rawSvgInput"
            type="textarea"
            :placeholder="t('tools.svg-to-component-converter.inputPlaceholder')"
            :autosize="{ minRows: 8, maxRows: 16 }"
            class="font-mono text-xs"
          />

          <!-- 文件上传拖拽辅助 -->
          <div class="mt-3">
            <n-upload
              :show-file-list="false"
              accept=".svg"
              @before-upload="handleFileUpload"
            >
              <n-upload-dragger>
                <div class="text-xs text-neutral-500 py-1">
                  {{ t('tools.svg-to-component-converter.uploadHint') }}
                </div>
              </n-upload-dragger>
            </n-upload>
          </div>
        </n-card>

        <!-- 优化与转换选项 -->
        <n-card :title="t('tools.svg-to-component-converter.optionsTitle')" size="small">
          <div class="space-y-3">
            <div>
              <div class="text-xs text-neutral-500 mb-1">
                {{ t('tools.svg-to-component-converter.componentNameLabel') }}
              </div>
              <n-input
                v-model:value="componentName"
                placeholder="SvgIcon"
                size="small"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div class="flex items-center justify-between p-2 rounded bg-surface border border-neutral-100 dark:border-neutral-800">
                <span>{{ t('tools.svg-to-component-converter.useCurrentColor') }}</span>
                <n-switch v-model:value="useCurrentColor" size="small" />
              </div>
              <div class="flex items-center justify-between p-2 rounded bg-surface border border-neutral-100 dark:border-neutral-800">
                <span>{{ t('tools.svg-to-component-converter.removeDimensions') }}</span>
                <n-switch v-model:value="removeDimensions" size="small" />
              </div>
              <div class="flex items-center justify-between p-2 rounded bg-surface border border-neutral-100 dark:border-neutral-800">
                <span>{{ t('tools.svg-to-component-converter.removeEditorData') }}</span>
                <n-switch v-model:value="removeEditorData" size="small" />
              </div>
              <div class="flex items-center justify-between p-2 rounded bg-surface border border-neutral-100 dark:border-neutral-800">
                <span>{{ t('tools.svg-to-component-converter.minifyCode') }}</span>
                <n-switch v-model:value="minifyCode" size="small" />
              </div>
            </div>
          </div>
        </n-card>
      </div>

      <!-- 右栏：实时预览与多框架输出 (7 列) -->
      <div class="lg:col-span-7 min-w-0 space-y-4">
        <!-- 实时视觉预览与统计 -->
        <n-card size="small">
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <!-- 视觉预览画布 -->
            <div class="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
              <div class="text-2xs text-neutral-400 mb-2">
                {{ t('tools.svg-to-component-converter.previewCanvas') }}
              </div>
              <div
                v-if="conversionResult.isValid"
                class="w-24 h-24 flex items-center justify-center p-2 rounded bg-white dark:bg-neutral-800 shadow-inner overflow-hidden text-primary"
                v-html="conversionResult.cleanedSvg"
              />
              <div
                v-else
                class="w-24 h-24 flex items-center justify-center text-xs text-neutral-400"
              >
                {{ t('tools.svg-to-component-converter.noPreview') }}
              </div>
            </div>

            <!-- 体积与属性统计 -->
            <div class="sm:col-span-7 grid grid-cols-2 gap-3 min-w-0">
              <n-statistic :label="t('tools.svg-to-component-converter.originalSize')">
                <span class="font-mono text-base">{{ conversionResult.originalSize }} B</span>
              </n-statistic>
              <n-statistic :label="t('tools.svg-to-component-converter.cleanedSize')">
                <span class="font-mono text-base text-primary">{{ conversionResult.cleanedSize }} B</span>
              </n-statistic>
              <n-statistic :label="t('tools.svg-to-component-converter.compressionRate')">
                <span class="font-mono text-base text-emerald-600 font-bold">
                  {{ conversionResult.reductionPercentage }}%
                </span>
              </n-statistic>
              <n-statistic :label="t('tools.svg-to-component-converter.viewBox')">
                <span class="font-mono text-xs truncate block max-w-full">
                  {{ conversionResult.viewBox || '-' }}
                </span>
              </n-statistic>
            </div>
          </div>
        </n-card>

        <!-- 转换代码选项卡输出 -->
        <n-card size="small" class="overflow-hidden">
          <n-tabs v-model:value="activeOutputTab" type="line" animated>
            <!-- Vue 3 选项卡 -->
            <n-tab-pane name="vue3" tab="Vue 3 (SFC)">
              <div class="space-y-3">
                <div class="flex justify-center gap-2">
                  <n-button size="small" type="primary" @click="handleCopy(conversionResult.vue3Code)">
                    <template #icon><n-icon :component="CopyIcon" /></template>
                    {{ t('tools.svg-to-component-converter.copyCode') }}
                  </n-button>
                  <n-button size="small" secondary @click="handleDownload(conversionResult.vue3Code, `${componentName}.vue`)">
                    <template #icon><n-icon :component="DownloadIcon" /></template>
                    {{ t('tools.svg-to-component-converter.downloadFile') }}
                  </n-button>
                </div>
                <div class="overflow-x-auto max-w-full rounded bg-neutral-900 p-2">
                  <n-code :code="conversionResult.vue3Code" language="html" word-wrap />
                </div>
              </div>
            </n-tab-pane>

            <!-- React 选项卡 -->
            <n-tab-pane name="react" tab="React (TSX)">
              <div class="space-y-3">
                <div class="flex justify-center gap-2">
                  <n-button size="small" type="primary" @click="handleCopy(conversionResult.reactCode)">
                    <template #icon><n-icon :component="CopyIcon" /></template>
                    {{ t('tools.svg-to-component-converter.copyCode') }}
                  </n-button>
                  <n-button size="small" secondary @click="handleDownload(conversionResult.reactCode, `${componentName}.tsx`)">
                    <template #icon><n-icon :component="DownloadIcon" /></template>
                    {{ t('tools.svg-to-component-converter.downloadFile') }}
                  </n-button>
                </div>
                <div class="overflow-x-auto max-w-full rounded bg-neutral-900 p-2">
                  <n-code :code="conversionResult.reactCode" language="typescript" word-wrap />
                </div>
              </div>
            </n-tab-pane>

            <!-- 纯净 SVG 选项卡 -->
            <n-tab-pane name="svg" tab="Cleaned SVG">
              <div class="space-y-3">
                <div class="flex justify-center gap-2">
                  <n-button size="small" type="primary" @click="handleCopy(conversionResult.cleanedSvg)">
                    <template #icon><n-icon :component="CopyIcon" /></template>
                    {{ t('tools.svg-to-component-converter.copyCode') }}
                  </n-button>
                  <n-button size="small" secondary @click="handleDownload(conversionResult.cleanedSvg, `${componentName}.svg`)">
                    <template #icon><n-icon :component="DownloadIcon" /></template>
                    {{ t('tools.svg-to-component-converter.downloadFile') }}
                  </n-button>
                </div>
                <div class="overflow-x-auto max-w-full rounded bg-neutral-900 p-2">
                  <n-code :code="conversionResult.cleanedSvg" language="xml" word-wrap />
                </div>
              </div>
            </n-tab-pane>

            <!-- Data URI 选项卡 -->
            <n-tab-pane name="datauri" tab="Data URI">
              <div class="space-y-3">
                <div>
                  <div class="flex justify-between items-center mb-1 text-xs text-neutral-500">
                    <span>Base64 Data URI</span>
                    <n-button size="tiny" quaternary @click="handleCopy(conversionResult.dataUri)">
                      {{ t('tools.svg-to-component-converter.copy') }}
                    </n-button>
                  </div>
                  <n-input
                    :value="conversionResult.dataUri"
                    readonly
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 4 }"
                    class="font-mono text-xs"
                  />
                </div>

                <div>
                  <div class="flex justify-between items-center mb-1 text-xs text-neutral-500">
                    <span>CSS Background-Image</span>
                    <n-button size="tiny" quaternary @click="handleCopy(`background-image: url('${conversionResult.dataUri}');`)">
                      {{ t('tools.svg-to-component-converter.copy') }}
                    </n-button>
                  </div>
                  <n-input
                    :value="`background-image: url('${conversionResult.dataUri}');`"
                    readonly
                    class="font-mono text-xs"
                  />
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * SVG 优化与组件转换器视图层
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import type { UploadFileInfo } from 'naive-ui';
import { Copy as CopyIcon, Download as DownloadIcon } from '@vicons/tabler';
import { useCopy } from '@/composable/copy';
import { convertSvg } from './svg-to-component-converter.service';

const { t } = useI18n();
const message = useMessage();
const { copy } = useCopy({ createToast: false });

const rawSvgInput = ref<string>('');
const componentName = ref<string>('MyIcon');
const useCurrentColor = ref<boolean>(true);
const removeDimensions = ref<boolean>(true);
const removeEditorData = ref<boolean>(true);
const minifyCode = ref<boolean>(false);
const activeOutputTab = ref<string>('vue3');

// 示例 SVG
const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- Cleaned by Ateng Tools -->
  <metadata>Editor Meta</metadata>
  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
</svg>`;

// 载入示例
function loadSampleSvg() {
  rawSvgInput.value = SAMPLE_SVG;
  componentName.value = 'LayersIcon';
}

// 清空输入
function clearInput() {
  rawSvgInput.value = '';
}

// 转换计算属性
const conversionResult = computed(() => {
  return convertSvg(rawSvgInput.value, {
    componentName: componentName.value || 'SvgIcon',
    useCurrentColor: useCurrentColor.value,
    removeDimensions: removeDimensions.value,
    removeEditorData: removeEditorData.value,
    minify: minifyCode.value,
  });
});

// 处理文件上传读取
async function handleFileUpload(options: { file: UploadFileInfo }) {
  const file = options.file.file;
  if (!file) return false;

  try {
    const text = await file.text();
    rawSvgInput.value = text;
    // 从文件名提取组件名，例如 "arrow-right.svg" -> "ArrowRight"
    const baseName = file.name.replace(/\.svg$/i, '');
    const pascal = baseName
      .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
      .replace(/^\w/, c => c.toUpperCase());
    if (pascal) {
      componentName.value = pascal;
    }
    message.success(t('tools.svg-to-component-converter.uploadSuccess'));
  } catch {
    message.error(t('tools.svg-to-component-converter.uploadError'));
  }

  return false;
}

// 复制代码
async function handleCopy(code: string) {
  if (!code) return;
  const ok = await copy(code);
  if (ok) {
    message.success(t('tools.svg-to-component-converter.copySuccess'));
  }
}

// 下载文件
function handleDownload(content: string, fileName: string) {
  if (!content) return;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  message.success(t('tools.svg-to-component-converter.downloadSuccess'));
}

// 初始化时载入示例
loadSampleSvg();
</script>
