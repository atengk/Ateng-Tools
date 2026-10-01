<script setup lang="ts">
/**
 * 条形码生成器视图层组件
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { computed, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import {
  Barcode,
  Copy,
  Download,
  FileCode,
  Wand,
} from '@vicons/tabler';
import type { BarcodeFormat, BarcodeRenderOptions } from './barcode-generator.types';
import { generateBarcodeSvg } from './barcode-generator.service';
import { useCopy } from '@/composable/copy';

const message = useMessage();

// 1. 预设格式示例与选项
const formatOptions = [
  { label: 'Code 128 (通用字符与数字)', value: 'CODE128' },
  { label: 'EAN-13 (国际商品条码)', value: 'EAN13' },
  { label: 'EAN-8 (短商品条码)', value: 'EAN8' },
  { label: 'UPC-A (北美商品条码)', value: 'UPCA' },
  { label: 'Code 39 (工业物流标准)', value: 'CODE39' },
  { label: 'ITF-14 (外箱物流条码)', value: 'ITF14' },
];

const sampleMap: Record<BarcodeFormat, string> = {
  CODE128: 'ATENG-TOOLS-2026',
  EAN13: '690123456789',
  EAN8: '6901234',
  UPCA: '01234567890',
  CODE39: 'CODE-39-LOGISTICS',
  ITF14: '1234567890123',
};

// 2. 响应式表单状态
const format = ref<BarcodeFormat>('CODE128');
const text = ref('ATENG-TOOLS-2026');
const barWidth = ref(2);
const height = ref(80);
const color = ref('#000000');
const background = ref('#ffffff');
const isTransparent = ref(false);
const margin = ref(12);
const showText = ref(true);
const fontSize = ref(15);

// 切换格式时自动填充推荐示例
watch(format, (newFormat) => {
  text.value = sampleMap[newFormat];
});

function handleFillSample() {
  text.value = sampleMap[format.value];
  message.success(`已载入 ${format.value} 预设示例`);
}

// 3. 计算实时渲染结果
const renderOptions = computed<BarcodeRenderOptions>(() => ({
  format: format.value,
  barWidth: barWidth.value,
  height: height.value,
  color: color.value,
  background: isTransparent.value ? 'transparent' : background.value,
  margin: margin.value,
  showText: showText.value,
  fontSize: fontSize.value,
}));

const result = computed(() => generateBarcodeSvg(text.value, renderOptions.value));

// 4. 导出与复制能力
const { copy } = useCopy({ createToast: false });

function handleCopySvg() {
  if (!result.value.isValid || !result.value.svg) {
    message.warning('请先修正条形码内容后再复制');
    return;
  }
  copy(result.value.svg);
  message.success('已成功复制 SVG 矢量源码');
}

function handleDownloadSvg() {
  if (!result.value.isValid || !result.value.svg) {
    message.warning('条形码内容有误，无法导出');
    return;
  }
  const blob = new Blob([result.value.svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.download = `barcode-${result.value.encodedText || 'code'}.svg`;
  anchor.href = url;
  anchor.click();
  URL.revokeObjectURL(url);
  message.success('SVG 矢量图已开始下载');
}

function handleDownloadPng() {
  if (!result.value.isValid || !result.value.svg) {
    message.warning('条形码内容有误，无法导出');
    return;
  }

  // 1. 将 SVG 转换为 DataURL 绘制到离屏 Canvas
  const img = new Image();
  const svgBlob = new Blob([result.value.svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = result.value.totalWidth;
    canvas.height = result.value.totalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      const anchor = document.createElement('a');
      anchor.download = `barcode-${result.value.encodedText || 'code'}.png`;
      anchor.href = canvas.toDataURL('image/png');
      anchor.click();
      message.success('PNG 图像已开始下载');
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}
</script>

<template>
  <div class="space-y-4">
    <!-- 主配置区域 -->
    <n-grid cols="1 s:1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
      <!-- 左侧：参数与输入 -->
      <n-gi>
        <n-card title="条形码参数设置" size="small" hoverable>
          <n-form label-placement="left" label-width="110" :show-feedback="false" class="space-y-3">
            <n-form-item label="编码标准">
              <n-select v-model:value="format" :options="formatOptions" />
            </n-form-item>

            <n-form-item label="条码内容">
              <n-input-group>
                <n-input
                  v-model:value="text"
                  placeholder="请输入条形码内容..."
                  clearable
                />
                <n-button secondary @click="handleFillSample">
                  <template #icon>
                    <n-icon :component="Wand" />
                  </template>
                  示例
                </n-button>
              </n-input-group>
            </n-form-item>

            <n-form-item label="条柱细度 (px)">
              <n-slider v-model:value="barWidth" :min="1" :max="4" :step="1" class="mr-3 flex-1" />
              <n-input-number v-model:value="barWidth" :min="1" :max="4" size="small" class="w-24" />
            </n-form-item>

            <n-form-item label="条柱高度 (px)">
              <n-slider v-model:value="height" :min="30" :max="200" :step="5" class="mr-3 flex-1" />
              <n-input-number v-model:value="height" :min="30" :max="200" size="small" class="w-24" />
            </n-form-item>

            <n-form-item label="留白边距 (px)">
              <n-slider v-model:value="margin" :min="0" :max="40" :step="2" class="mr-3 flex-1" />
              <n-input-number v-model:value="margin" :min="0" :max="40" size="small" class="w-24" />
            </n-form-item>

            <n-form-item label="前景色">
              <n-color-picker v-model:value="color" :modes="['hex']" :show-alpha="false" />
            </n-form-item>

            <n-form-item label="背景色">
              <div class="flex items-center gap-3 w-full">
                <n-color-picker
                  v-model:value="background"
                  :modes="['hex']"
                  :show-alpha="false"
                  :disabled="isTransparent"
                  class="flex-1"
                />
                <n-checkbox v-model:checked="isTransparent">
                  透明背景
                </n-checkbox>
              </div>
            </n-form-item>

            <n-form-item label="显示明文">
              <div class="flex items-center gap-4 w-full">
                <n-switch v-model:value="showText" />
                <template v-if="showText">
                  <span class="text-xs text-gray-500">字号:</span>
                  <n-input-number v-model:value="fontSize" :min="10" :max="24" size="small" class="w-24" />
                </template>
              </div>
            </n-form-item>
          </n-form>
        </n-card>
      </n-gi>

      <!-- 右侧：实时渲染预览与操作 -->
      <n-gi>
        <n-card title="实时预览效果" size="small" hoverable class="h-full flex flex-col justify-between">
          <div class="min-h-56 flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
            <template v-if="result.isValid">
              <!-- SVG 容器渲染 -->
              <div
                class="max-w-full overflow-x-auto p-3 rounded"
                :style="{ background: isTransparent ? 'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%) 50% / 16px 16px' : 'transparent' }"
                v-html="result.svg"
              />
              <div class="text-xs text-gray-400 mt-3 text-center">
                编码内容: <span class="font-mono font-semibold text-gray-700 dark:text-gray-300">{{ result.encodedText }}</span>
                &nbsp;|&nbsp; 尺寸: {{ result.totalWidth }} × {{ result.totalHeight }} px
              </div>
            </template>
            <template v-else>
              <n-alert type="warning" title="无法生成条形码" class="w-full">
                {{ result.error || '输入格式不符合所选标准要求' }}
              </n-alert>
            </template>
          </div>

          <!-- 操作栏按钮组统一居中排布 -->
          <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
            <n-button
              type="primary"
              :disabled="!result.isValid"
              @click="handleDownloadPng"
            >
              <template #icon>
                <n-icon :component="Download" />
              </template>
              下载 PNG 图像
            </n-button>

            <n-button
              secondary
              type="info"
              :disabled="!result.isValid"
              @click="handleDownloadSvg"
            >
              <template #icon>
                <n-icon :component="FileCode" />
              </template>
              下载 SVG 矢量图
            </n-button>

            <n-button
              secondary
              :disabled="!result.isValid"
              @click="handleCopySvg"
            >
              <template #icon>
                <n-icon :component="Copy" />
              </template>
              复制 SVG 源码
            </n-button>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 底部：编码格式规范说明 -->
    <n-card title="常见条形码格式与编码规范" size="small">
      <n-grid cols="1 m:3" :x-gap="12" :y-gap="12">
        <n-gi>
          <div class="p-2 border rounded border-gray-200 dark:border-gray-800">
            <div class="font-semibold text-sm mb-1 flex items-center gap-1">
              <n-icon :component="Barcode" class="text-primary" />
              Code 128 (高密度全字符)
            </div>
            <div class="text-xs text-gray-500">
              现代物流与工业最通用的条码，支持标准 ASCII 全部 128 个字符（字母、数字与符号），自带校验码。
            </div>
          </div>
        </n-gi>
        <n-gi>
          <div class="p-2 border rounded border-gray-200 dark:border-gray-800">
            <div class="font-semibold text-sm mb-1 flex items-center gap-1">
              <n-icon :component="Barcode" class="text-primary" />
              EAN-13 / UPC-A (零售商品码)
            </div>
            <div class="text-xs text-gray-500">
              全球超市与零售通用标准。EAN-13 需 12 位（自动补全第 13 位校验位）或 13 位纯数字；UPC-A 为北美零售标准（11/12 位）。
            </div>
          </div>
        </n-gi>
        <n-gi>
          <div class="p-2 border rounded border-gray-200 dark:border-gray-800">
            <div class="font-semibold text-sm mb-1 flex items-center gap-1">
              <n-icon :component="Barcode" class="text-primary" />
              ITF-14 / Code 39 (外箱与传统工业)
            </div>
            <div class="text-xs text-gray-500">
              ITF-14（交叉二五码）专用于瓦楞纸箱等外包装箱；Code 39 广泛应用于军工、汽车制造与医药标签。
            </div>
          </div>
        </n-gi>
      </n-grid>
    </n-card>
  </div>
</template>
