<script setup lang="ts">
/**
 * Image Studio (图片处理工作台) 视图组件
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { useMessage } from 'naive-ui';
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import {
  Download,
  FileText,
  Focus,
  InfoCircle,
  Link,
  Maximize,
  Photo,
  Refresh,
  Scale,
  Unlink,
  ZoomIn,
  ZoomOut,
} from '@vicons/tabler';
import {
  calculateDimensionsByHeight,
  calculateDimensionsByPercentage,
  calculateDimensionsByWidth,
  clampDimension,
  exportCanvasToBlob,
  generateExportFileName,
  loadImageFromBlobOrDataUrl,
  rasterizeSvgText,
  renderToCanvas,
} from './image-studio.service';
import {
  type ExportImageFormat,
  type ImageSourceInfo,
  MAX_SAFE_IMAGE_DIMENSION,
} from './image-studio.types';
import { formatBytes } from '@/utils/convert';

const message = useMessage();

// 原始图像元数据
const imageSource = ref<ImageSourceInfo | null>(null);
// 解码后的原始 DOM Image 实体 (shallowRef 避免响应式代理开销)
const rawImageElement = shallowRef<HTMLImageElement | null>(null);

// 缩放尺寸参数
const targetWidth = ref(0);
const targetHeight = ref(0);
const lockAspectRatio = ref(true);

// 视口展示缩放级别 (10% - 500%)
const viewportZoom = ref(1.0);
const viewportContainerRef = ref<HTMLElement | null>(null);

// 导出与压缩配置
const exportFormat = ref<ExportImageFormat>('image/webp');
const exportQuality = ref(90);
const customExportName = ref('');
const isExporting = ref(false);

// 实时预估输出体积
const estimatedOutputSize = ref<number | null>(null);
let estimateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// 隐藏的原生文件输入框
const fileInputRef = ref<HTMLInputElement | null>(null);

/**
 * 是否超出 8192px 极限尺寸防御
 */
const isOverLimit = computed(() => {
  return targetWidth.value > MAX_SAFE_IMAGE_DIMENSION || targetHeight.value > MAX_SAFE_IMAGE_DIMENSION;
});

/**
 * 体积缩减率计算 (负数表示缩小，正数表示膨胀)
 */
const sizeChangeRate = computed(() => {
  if (!imageSource.value || !estimatedOutputSize.value) return null;
  const rate = ((estimatedOutputSize.value - imageSource.value.size) / imageSource.value.size) * 100;
  return Math.round(rate);
});

/**
 * 触发文件选择
 */
function triggerFileInput() {
  fileInputRef.value?.click();
}

/**
 * 解析载入用户输入的图像文件 (支持 PNG, JPEG, WebP, SVG 等)
 */
async function loadFile(file: File) {
  try {
    let img: HTMLImageElement;
    let dataUrl = '';

    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const svgText = await file.text();
      img = await rasterizeSvgText(svgText);
      dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
    }
    else {
      img = await loadImageFromBlobOrDataUrl(file);
      dataUrl = URL.createObjectURL(file);
    }

    rawImageElement.value = img;

    const sourceInfo: ImageSourceInfo = {
      name: file.name,
      originalWidth: img.naturalWidth || img.width,
      originalHeight: img.naturalHeight || img.height,
      size: file.size,
      mimeType: file.type || 'image/png',
      aspectRatio: (img.naturalWidth || img.width) / (img.naturalHeight || img.height),
      dataUrl,
    };

    imageSource.value = sourceInfo;
    targetWidth.value = sourceInfo.originalWidth;
    targetHeight.value = sourceInfo.originalHeight;

    message.success(`成功载入图片 “${file.name}” (${sourceInfo.originalWidth} × ${sourceInfo.originalHeight})`);

    // 默认自适应视口
    nextTick(() => {
      zoomToFit();
      triggerEstimateSize();
    });
  }
  catch (err: any) {
    message.error(`图片解析失败：${err?.message || '文件格式不支持或内容损坏'}`);
  }
}

/**
 * 原生文件输入变更
 */
function onNativeFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    loadFile(file);
  }
  input.value = '';
}

/**
 * 通用文件上传组件回调
 */
function onFileUpload(file: File) {
  loadFile(file);
}

/**
 * 宽度修改响应（保持宽高比联动）
 */
function handleWidthInput(val: number | null) {
  if (val === null || val <= 0) return;
  targetWidth.value = clampDimension(val);
  if (lockAspectRatio.value && imageSource.value) {
    const { height } = calculateDimensionsByWidth(targetWidth.value, imageSource.value.aspectRatio);
    targetHeight.value = height;
  }
}

/**
 * 高度修改响应（保持宽高比联动）
 */
function handleHeightInput(val: number | null) {
  if (val === null || val <= 0) return;
  targetHeight.value = clampDimension(val);
  if (lockAspectRatio.value && imageSource.value) {
    const { width } = calculateDimensionsByHeight(targetHeight.value, imageSource.value.aspectRatio);
    targetWidth.value = width;
  }
}

/**
 * 快捷百分比缩放
 */
function applyPercentageScale(percent: number) {
  if (!imageSource.value) return;
  const { width, height } = calculateDimensionsByPercentage(
    imageSource.value.originalWidth,
    imageSource.value.originalHeight,
    percent,
  );
  targetWidth.value = width;
  targetHeight.value = height;
}

/**
 * 视口滚轮缩放
 */
function onCanvasWheel(event: WheelEvent) {
  const delta = event.deltaY < 0 ? 0.1 : -0.1;
  const newZoom = Math.min(5.0, Math.max(0.1, viewportZoom.value + delta));
  viewportZoom.value = Math.round(newZoom * 10) / 10;
}

/**
 * 视口适应窗口
 */
function zoomToFit() {
  if (!viewportContainerRef.value || !imageSource.value) {
    viewportZoom.value = 1.0;
    return;
  }

  const containerW = viewportContainerRef.value.clientWidth - 48;
  const containerH = viewportContainerRef.value.clientHeight - 48;
  if (containerW <= 0 || containerH <= 0) return;

  const scaleW = containerW / imageSource.value.originalWidth;
  const scaleH = containerH / imageSource.value.originalHeight;
  const fitScale = Math.min(scaleW, scaleH, 1.0);

  viewportZoom.value = Math.max(0.1, Math.round(fitScale * 100) / 100);
}

/**
 * 视口 1:1 实际像素
 */
function zoomActual() {
  viewportZoom.value = 1.0;
}

/**
 * 视口放大缩小步进
 */
function adjustZoom(delta: number) {
  const newZoom = Math.min(5.0, Math.max(0.1, viewportZoom.value + delta));
  viewportZoom.value = Math.round(newZoom * 10) / 10;
}

/**
 * 拖拽进主视窗导入
 */
function onDragOver(event: DragEvent) {
  event.preventDefault();
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  const file = event.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    loadFile(file);
  }
}

/**
 * 剪贴板 Ctrl+V 粘贴监听
 */
function handlePaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        loadFile(file);
        message.info('已从剪贴板快速粘贴导入图像');
        break;
      }
    }
  }
}

/**
 * 防抖预估导出体积
 */
function triggerEstimateSize() {
  if (estimateDebounceTimer) {
    clearTimeout(estimateDebounceTimer);
  }
  estimateDebounceTimer = setTimeout(async () => {
    if (!rawImageElement.value || targetWidth.value <= 0 || targetHeight.value <= 0) {
      estimatedOutputSize.value = null;
      return;
    }

    try {
      const canvas = renderToCanvas(rawImageElement.value, targetWidth.value, targetHeight.value);
      const quality = exportFormat.value === 'image/png' ? 1.0 : exportQuality.value / 100;
      const blob = await exportCanvasToBlob(canvas, exportFormat.value, quality);
      estimatedOutputSize.value = blob.size;
    }
    catch {
      estimatedOutputSize.value = null;
    }
  }, 200);
}

// 监听参数变化重新预估体积
watch(
  [targetWidth, targetHeight, exportFormat, exportQuality],
  () => {
    if (imageSource.value) {
      triggerEstimateSize();
    }
  },
);

/**
 * 执行最终导出并下载
 */
async function handleExportDownload() {
  if (!rawImageElement.value || !imageSource.value) {
    message.warning('尚未载入图片，无法执行导出');
    return;
  }

  if (isOverLimit.value) {
    message.error(`尺寸超出浏览器安全上限 (${MAX_SAFE_IMAGE_DIMENSION}px)，请先调小宽高`);
    return;
  }

  isExporting.value = true;
  try {
    const canvas = renderToCanvas(rawImageElement.value, targetWidth.value, targetHeight.value);
    const quality = exportFormat.value === 'image/png' ? 1.0 : exportQuality.value / 100;
    const blob = await exportCanvasToBlob(canvas, exportFormat.value, quality);

    const outName = generateExportFileName(
      customExportName.value.trim() || imageSource.value.name,
      exportFormat.value,
      `${targetWidth.value}x${targetHeight.value}`,
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = outName;
    anchor.click();
    URL.revokeObjectURL(url);

    message.success(`导出成功！已保存为 “${outName}” (${formatBytes(blob.size)})`);
  }
  catch (err: any) {
    message.error(`导出处理失败：${err?.message || '未知错误'}`);
  }
  finally {
    isExporting.value = false;
  }
}

/**
 * 重置工作台
 */
function handleResetAll() {
  if (imageSource.value?.dataUrl && imageSource.value.dataUrl.startsWith('blob:')) {
    URL.revokeObjectURL(imageSource.value.dataUrl);
  }
  imageSource.value = null;
  rawImageElement.value = null;
  targetWidth.value = 0;
  targetHeight.value = 0;
  viewportZoom.value = 1.0;
  estimatedOutputSize.value = null;
  customExportName.value = '';
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('paste', handlePaste);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('paste', handlePaste);
  }
  handleResetAll();
});
</script>

<template>
  <div style="flex: 0 0 100%" class="image-studio-container" flex flex-col gap-4>
    <!-- 隐藏的文件选择输入框 -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/svg+xml,image/bmp,image/gif"
      style="display: none"
      @change="onNativeFileChange"
    >

    <!-- 初始上传区域 (无图片时展示) -->
    <div v-if="!imageSource" mx-auto w-full max-w-650px py-6>
      <c-file-upload
        :title="$t('tools.image-studio.uploadTitle', '将图片拖拽至此处，或点击浏览选择')"
        :button-text="$t('tools.image-studio.browseFiles', '浏览选择图片 (支持 PNG/JPG/WebP/SVG)')"
        accept="image/*,.svg"
        @file-upload="onFileUpload"
      />
      <div text-center text-xs text-gray-400 mt-3>
        提示：也支持直接在网页任意位置使用 <strong>Ctrl+V</strong> 剪贴板快速粘贴图像
      </div>
    </div>

    <!-- 工作台主界面 (有图片时展示左右双栏布局) -->
    <div v-else class="studio-layout">
      <!-- 左侧：图像主视窗与画布区域 -->
      <div class="studio-viewport-card">
        <!-- 视口顶部悬浮快捷控制栏 (严格水平居中) -->
        <div class="viewport-toolbar">
          <div flex items-center justify-center gap-2 flex-wrap>
            <n-button size="tiny" secondary @click="adjustZoom(-0.1)" title="缩小视口">
              <template #icon>
                <n-icon :component="ZoomOut" />
              </template>
            </n-button>

            <span text-xs font-mono font-medium class="w-48px text-center">
              {{ Math.round(viewportZoom * 100) }}%
            </span>

            <n-button size="tiny" secondary @click="adjustZoom(0.1)" title="放大视口">
              <template #icon>
                <n-icon :component="ZoomIn" />
              </template>
            </n-button>

            <n-button size="tiny" secondary @click="zoomToFit" title="自动适应视口大小">
              <template #icon>
                <n-icon :component="Maximize" />
              </template>
              适应
            </n-button>

            <n-button size="tiny" secondary @click="zoomActual" title="恢复 100% 原始尺寸">
              <template #icon>
                <n-icon :component="Focus" />
              </template>
              1:1
            </n-button>

            <div class="toolbar-divider" />

            <n-button size="tiny" secondary type="primary" @click="triggerFileInput" title="更换新图片">
              <template #icon>
                <n-icon :component="Refresh" />
              </template>
              更换图片
            </n-button>
          </div>
        </div>

        <!-- 视口主画布舞台 (棋盘格透明底纹背景) -->
        <div
          ref="viewportContainerRef"
          class="viewport-stage checkerboard-bg"
          @wheel.prevent="onCanvasWheel"
          @dragover="onDragOver"
          @drop="onDrop"
        >
          <div
            class="viewport-image-wrapper"
            :style="{
              transform: `scale(${viewportZoom})`,
              transformOrigin: 'center center',
            }"
          >
            <img
              :src="imageSource.dataUrl"
              :alt="imageSource.name"
              class="viewport-image"
            >
          </div>
        </div>
      </div>

      <!-- 右侧：控制与导出侧边面板 -->
      <div class="studio-sidebar" flex flex-col gap-4>
        <!-- 卡片 1：原图基础信息 -->
        <n-card size="small" :bordered="true">
          <template #header>
            <div flex items-center gap-2 text-sm>
              <n-icon size="18" class="text-primary" :component="Photo" />
              <span>原图基本信息</span>
            </div>
          </template>

          <div flex flex-col gap-2 text-xs>
            <div flex items-center justify-between>
              <span class="text-gray-500">文件名：</span>
              <span font-medium truncate max-w-180px :title="imageSource.name">{{ imageSource.name }}</span>
            </div>
            <div flex items-center justify-between>
              <span class="text-gray-500">原始分辨率：</span>
              <span font-mono font-bold>{{ imageSource.originalWidth }} × {{ imageSource.originalHeight }} px</span>
            </div>
            <div flex items-center justify-between>
              <span class="text-gray-500">原始体积：</span>
              <n-tag size="tiny" type="info" :bordered="false" round>
                {{ formatBytes(imageSource.size) }}
              </n-tag>
            </div>
            <div flex items-center justify-between>
              <span class="text-gray-500">宽高比率：</span>
              <span font-mono>{{ imageSource.aspectRatio.toFixed(2) }} ({{ Math.round(imageSource.aspectRatio * 100) / 100 }}:1)</span>
            </div>
          </div>
        </n-card>

        <!-- 卡片 2：尺寸缩放调节 -->
        <n-card size="small" :bordered="true">
          <template #header>
            <div flex items-center justify-between text-sm>
              <div flex items-center gap-2>
                <n-icon size="18" class="text-primary" :component="Scale" />
                <span>分辨率与尺寸缩放</span>
              </div>
              <!-- 等比锁定开关 -->
              <div flex items-center gap-1.5>
                <n-switch v-model:value="lockAspectRatio" size="small">
                  <template #checked-icon>
                    <n-icon :component="Link" />
                  </template>
                  <template #unchecked-icon>
                    <n-icon :component="Unlink" />
                  </template>
                </n-switch>
                <span text-11px class="text-gray-400">等比锁定</span>
              </div>
            </div>
          </template>

          <div flex flex-col gap-3>
            <!-- 快捷缩放比例按钮组 (水平居中) -->
            <div flex items-center justify-center gap-1.5 flex-wrap>
              <n-button
                v-for="p in [25, 50, 75, 100, 150, 200]"
                :key="p"
                size="tiny"
                secondary
                :type="targetWidth === Math.round(imageSource.originalWidth * p / 100) ? 'primary' : 'default'"
                @click="applyPercentageScale(p)"
              >
                {{ p }}%
              </n-button>
            </div>

            <!-- 自定义目标像素输入 -->
            <div grid grid-cols-2 gap-3.5>
              <div>
                <span text-11px class="text-gray-500 mb-1 block">宽度 (W, px)：</span>
                <n-input-number
                  :value="targetWidth"
                  :min="1"
                  :max="MAX_SAFE_IMAGE_DIMENSION"
                  :step="10"
                  size="small"
                  @update:value="handleWidthInput"
                />
              </div>

              <div>
                <span text-11px class="text-gray-500 mb-1 block">高度 (H, px)：</span>
                <n-input-number
                  :value="targetHeight"
                  :min="1"
                  :max="MAX_SAFE_IMAGE_DIMENSION"
                  :step="10"
                  size="small"
                  @update:value="handleHeightInput"
                />
              </div>
            </div>

            <!-- 超限警示信息 -->
            <div v-if="isOverLimit" class="bg-red-50 dark:bg-red-950 p-2 rounded text-11px text-red-600 flex items-center gap-1.5">
              <n-icon size="14" :component="InfoCircle" />
              <span>尺寸超出安全上限 ({{ MAX_SAFE_IMAGE_DIMENSION }}px)，导出可能失败</span>
            </div>
          </div>
        </n-card>

        <!-- 卡片 3：格式压缩与导出下载 -->
        <n-card size="small" :bordered="true">
          <template #header>
            <div flex items-center gap-2 text-sm>
              <n-icon size="18" class="text-primary" :component="Download" />
              <span>格式转换与压缩导出</span>
            </div>
          </template>

          <div flex flex-col gap-3.5>
            <!-- 导出格式单选 -->
            <div>
              <span text-11px class="text-gray-500 mb-1.5 block">目标文件格式：</span>
              <n-radio-group v-model:value="exportFormat" name="exportFormatRadio" size="small" style="width: 100%">
                <div grid grid-cols-3 gap-1.5 w-full>
                  <n-radio-button value="image/webp" class="text-center">
                    WebP (推荐)
                  </n-radio-button>
                  <n-radio-button value="image/jpeg" class="text-center">
                    JPEG
                  </n-radio-button>
                  <n-radio-button value="image/png" class="text-center">
                    PNG
                  </n-radio-button>
                </div>
              </n-radio-group>
            </div>

            <!-- 画质滑块 (JPEG & WebP) -->
            <div v-if="exportFormat !== 'image/png'">
              <div flex items-center justify-between mb-1>
                <span text-11px class="text-gray-500">压缩画质：</span>
                <span text-xs font-mono font-bold class="text-primary">{{ exportQuality }}%</span>
              </div>
              <n-slider
                v-model:value="exportQuality"
                :min="1"
                :max="100"
                :step="1"
              />
            </div>
            <div v-else text-11px class="text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
              PNG 格式采用无损压缩，画质滑块免配置
            </div>

            <!-- 体积预估与对比 -->
            <div class="bg-gray-50 dark:bg-gray-800 p-2.5 rounded text-xs flex flex-col gap-1.5">
              <div flex items-center justify-between>
                <span class="text-gray-500">预估导出体积：</span>
                <span font-mono font-bold>
                  {{ estimatedOutputSize ? formatBytes(estimatedOutputSize) : '计算中...' }}
                </span>
              </div>

              <div v-if="sizeChangeRate !== null" flex items-center justify-between>
                <span class="text-gray-500">对比原图变化：</span>
                <n-tag
                  size="tiny"
                  :type="sizeChangeRate < 0 ? 'success' : 'warning'"
                  round
                  :bordered="false"
                >
                  {{ sizeChangeRate > 0 ? `+${sizeChangeRate}%` : `${sizeChangeRate}%` }}
                </n-tag>
              </div>
            </div>

            <!-- 自定义文件名 -->
            <div>
              <span text-11px class="text-gray-500 mb-1 block">自定义文件名 (选填)：</span>
              <n-input
                v-model:value="customExportName"
                placeholder="留空默认原文件名加尺寸后缀"
                size="small"
                clearable
              >
                <template #prefix>
                  <n-icon :component="FileText" class="text-gray-400" />
                </template>
              </n-input>
            </div>

            <!-- 导出按钮 (水平居中) -->
            <div flex items-center justify-center pt-1>
              <n-button
                type="primary"
                size="medium"
                block
                :loading="isExporting"
                :disabled="isOverLimit"
                @click="handleExportDownload"
              >
                <template #icon>
                  <n-icon :component="Download" />
                </template>
                一键导出并下载
              </n-button>
            </div>
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.studio-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 16px;
  width: 100%;
  min-height: 580px;
}

@media (max-width: 992px) {
  .studio-layout {
    grid-template-columns: 1fr;
  }
}

.studio-viewport-card {
  position: relative;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 520px;
}

.viewport-toolbar {
  padding: 8px 12px;
  border-bottom: 1px solid var(--n-border-color);
  background-color: var(--n-color-embedded);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  background-color: var(--n-border-color);
  margin: 0 4px;
}

.viewport-stage {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 460px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 24px;
  box-sizing: border-box;
}

.viewport-image-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease-out;
}

.viewport-image {
  max-width: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  user-select: none;
  pointer-events: none;
}

/* 经典透明棋盘格纹理底色 */
.checkerboard-bg {
  background-color: #f1f5f9;
  background-image:
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}

:deep(.dark) .checkerboard-bg {
  background-color: #0f172a;
  background-image:
    linear-gradient(45deg, #1e293b 25%, transparent 25%),
    linear-gradient(-45deg, #1e293b 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #1e293b 75%),
    linear-gradient(-45deg, transparent 75%, #1e293b 75%);
}

.studio-sidebar {
  width: 100%;
}
</style>
