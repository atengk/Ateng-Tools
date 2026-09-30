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
  Check,
  Columns,
  Crop,
  Download,
  FileText,
  FlipHorizontal,
  FlipVertical,
  Focus,
  History,
  InfoCircle,
  Link,
  Maximize,
  Photo,
  Refresh,
  Rotate,
  RotateClockwise,
  Scale,
  Unlink,
  X,
  ZoomIn,
  ZoomOut,
} from '@vicons/tabler';
import {
  calculateDimensionsByHeight,
  calculateDimensionsByPercentage,
  calculateDimensionsByWidth,
  calculateTransformedDimensions,
  clampCropRegion,
  clampDimension,
  exportCanvasToBlob,
  generateExportFileName,
  getAspectRatioValue,
  loadImageFromBlobOrDataUrl,
  rasterizeSvgText,
  renderImagePipeline,
} from './image-studio.service';
import {
  type CropAspectRatio,
  type CropRegion,
  type ExportImageFormat,
  type ImageSourceInfo,
  MAX_SAFE_IMAGE_DIMENSION,
  type TransformOptions,
} from './image-studio.types';
import { formatBytes } from '@/utils/convert';

const message = useMessage();

// 原始图像元数据
const imageSource = ref<ImageSourceInfo | null>(null);
// 解码后的原始 DOM Image 实体 (shallowRef 避免响应式代理开销)
const rawImageElement = shallowRef<HTMLImageElement | null>(null);

// 几何变换参数
const transform = ref<TransformOptions>({
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
});

// 已生效应用的裁剪选区
const appliedCrop = ref<CropRegion | null>(null);

// 交互式裁剪状态
const isCropping = ref(false);
const cropRatio = ref<CropAspectRatio>('free');
const cropSelection = ref<CropRegion>({ x: 0, y: 0, width: 100, height: 100 });
const activeDragHandle = ref<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
let dragStartPointer = { x: 0, y: 0 };
let initialCropState = { x: 0, y: 0, width: 0, height: 0 };

// 差分双视窗滑块对比模式
const isCompareMode = ref(false);
const splitPosition = ref(50);
const isSplitDragging = ref(false);

// 缩放尺寸参数
const targetWidth = ref(0);
const targetHeight = ref(0);
const lockAspectRatio = ref(true);

// 视口展示缩放级别 (10% - 500%)
const viewportZoom = ref(1.0);
const viewportContainerRef = ref<HTMLElement | null>(null);
const imageWrapperRef = ref<HTMLElement | null>(null);

// 导出与压缩配置
const exportFormat = ref<ExportImageFormat>('image/webp');
const exportQuality = ref(90);
const customExportName = ref('');
const isExporting = ref(false);

// 处理后的实时预览图 URL 与体积预估
const processedPreviewUrl = ref<string>('');
const estimatedOutputSize = ref<number | null>(null);
let estimateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// 隐藏的原生文件输入框
const fileInputRef = ref<HTMLInputElement | null>(null);

/**
 * 当前画面基准物理尺寸 (考虑已应用裁剪与旋转 90/270 之后的尺寸)
 */
const baseVisualDimensions = computed(() => {
  if (!imageSource.value) return { width: 0, height: 0 };
  const w = appliedCrop.value ? appliedCrop.value.width : imageSource.value.originalWidth;
  const h = appliedCrop.value ? appliedCrop.value.height : imageSource.value.originalHeight;
  return calculateTransformedDimensions(w, h, transform.value.rotation);
});

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
    transform.value = { rotation: 0, flipHorizontal: false, flipVertical: false };
    appliedCrop.value = null;
    isCropping.value = false;
    isCompareMode.value = false;

    targetWidth.value = sourceInfo.originalWidth;
    targetHeight.value = sourceInfo.originalHeight;

    message.success(`成功载入图片 “${file.name}” (${sourceInfo.originalWidth} × ${sourceInfo.originalHeight})`);

    // 默认自适应视口
    nextTick(() => {
      zoomToFit();
      updatePipelinePreview();
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
  if (lockAspectRatio.value && baseVisualDimensions.value.height > 0) {
    const ratio = baseVisualDimensions.value.width / baseVisualDimensions.value.height;
    const { height } = calculateDimensionsByWidth(targetWidth.value, ratio);
    targetHeight.value = height;
  }
}

/**
 * 高度修改响应（保持宽高比联动）
 */
function handleHeightInput(val: number | null) {
  if (val === null || val <= 0) return;
  targetHeight.value = clampDimension(val);
  if (lockAspectRatio.value && baseVisualDimensions.value.height > 0) {
    const ratio = baseVisualDimensions.value.width / baseVisualDimensions.value.height;
    const { width } = calculateDimensionsByHeight(targetHeight.value, ratio);
    targetWidth.value = width;
  }
}

/**
 * 快捷百分比缩放
 */
function applyPercentageScale(percent: number) {
  if (!baseVisualDimensions.value.width) return;
  const { width, height } = calculateDimensionsByPercentage(
    baseVisualDimensions.value.width,
    baseVisualDimensions.value.height,
    percent,
  );
  targetWidth.value = width;
  targetHeight.value = height;
}

/**
 * 几何顺时针旋转 90°
 */
function handleRotateClockwise() {
  transform.value.rotation = (transform.value.rotation + 90) % 360;
  // 尺寸对调
  const temp = targetWidth.value;
  targetWidth.value = targetHeight.value;
  targetHeight.value = temp;
}

/**
 * 几何逆时针旋转 90°
 */
function handleRotateCounterClockwise() {
  transform.value.rotation = (transform.value.rotation + 270) % 360;
  // 尺寸对调
  const temp = targetWidth.value;
  targetWidth.value = targetHeight.value;
  targetHeight.value = temp;
}

/**
 * 切换水平镜像翻转
 */
function handleToggleFlipH() {
  transform.value.flipHorizontal = !transform.value.flipHorizontal;
}

/**
 * 切换垂直镜像翻转
 */
function handleToggleFlipV() {
  transform.value.flipVertical = !transform.value.flipVertical;
}

/**
 * 重置几何变换
 */
function handleResetTransform() {
  transform.value = { rotation: 0, flipHorizontal: false, flipVertical: false };
  targetWidth.value = baseVisualDimensions.value.width;
  targetHeight.value = baseVisualDimensions.value.height;
  message.info('已重置所有旋转与镜像变换');
}

/**
 * 开启交互式裁剪模式
 */
function startCropping() {
  if (!imageSource.value) return;
  isCompareMode.value = false;
  isCropping.value = true;

  // 初始化选区为当前整个原图或已有裁剪区
  if (appliedCrop.value) {
    cropSelection.value = { ...appliedCrop.value };
  }
  else {
    const origW = imageSource.value.originalWidth;
    const origH = imageSource.value.originalHeight;
    cropSelection.value = {
      x: Math.round(origW * 0.1),
      y: Math.round(origH * 0.1),
      width: Math.round(origW * 0.8),
      height: Math.round(origH * 0.8),
    };
  }
  applyRatioToSelection(cropRatio.value);
}

/**
 * 切换裁剪预设比例
 */
function handleCropRatioChange(ratio: CropAspectRatio) {
  cropRatio.value = ratio;
  applyRatioToSelection(ratio);
}

function applyRatioToSelection(ratio: CropAspectRatio) {
  if (!imageSource.value) return;
  const ratioVal = getAspectRatioValue(ratio);
  if (!ratioVal) return;

  const currentW = cropSelection.value.width;
  let newH = Math.round(currentW / ratioVal);
  if (cropSelection.value.y + newH > imageSource.value.originalHeight) {
    newH = imageSource.value.originalHeight - cropSelection.value.y;
    cropSelection.value.width = Math.round(newH * ratioVal);
  }
  cropSelection.value.height = newH;
}

/**
 * 确认应用裁剪
 */
function applyCrop() {
  if (!imageSource.value) return;
  const safeCrop = clampCropRegion(
    cropSelection.value,
    imageSource.value.originalWidth,
    imageSource.value.originalHeight,
  );
  appliedCrop.value = safeCrop;
  isCropping.value = false;

  // 更新目标宽高等比同步
  const dims = calculateTransformedDimensions(safeCrop.width, safeCrop.height, transform.value.rotation);
  targetWidth.value = dims.width;
  targetHeight.value = dims.height;

  message.success(`已应用裁剪 (${safeCrop.width} × ${safeCrop.height} px)`);
}

/**
 * 清除已应用的裁剪恢复原图
 */
function clearAppliedCrop() {
  appliedCrop.value = null;
  isCropping.value = false;
  if (imageSource.value) {
    const dims = calculateTransformedDimensions(
      imageSource.value.originalWidth,
      imageSource.value.originalHeight,
      transform.value.rotation,
    );
    targetWidth.value = dims.width;
    targetHeight.value = dims.height;
  }
  message.info('已恢复完整原图范围');
}

/**
 * 取消当前裁剪编辑
 */
function cancelCrop() {
  isCropping.value = false;
}

/**
 * 裁剪手柄按下与拖拽事件
 */
function onCropHandleMouseDown(handle: 'move' | 'nw' | 'ne' | 'se' | 'sw', event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();
  activeDragHandle.value = handle;
  dragStartPointer = { x: event.clientX, y: event.clientY };
  initialCropState = { ...cropSelection.value };

  window.addEventListener('mousemove', onCropMouseMove);
  window.addEventListener('mouseup', onCropMouseUp);
}

function onCropMouseMove(event: MouseEvent) {
  if (!activeDragHandle.value || !imageSource.value) return;

  // 转换为相对图片真实像素的位移变化量
  const deltaX = (event.clientX - dragStartPointer.x) / viewportZoom.value;
  const deltaY = (event.clientY - dragStartPointer.y) / viewportZoom.value;

  const maxW = imageSource.value.originalWidth;
  const maxH = imageSource.value.originalHeight;
  const ratioVal = getAspectRatioValue(cropRatio.value);

  if (activeDragHandle.value === 'move') {
    const newX = Math.max(0, Math.min(maxW - initialCropState.width, initialCropState.x + deltaX));
    const newY = Math.max(0, Math.min(maxH - initialCropState.height, initialCropState.y + deltaY));
    cropSelection.value.x = Math.round(newX);
    cropSelection.value.y = Math.round(newY);
  }
  else if (activeDragHandle.value === 'se') {
    let newW = Math.max(20, Math.min(maxW - initialCropState.x, initialCropState.width + deltaX));
    let newH = Math.max(20, Math.min(maxH - initialCropState.y, initialCropState.height + deltaY));
    if (ratioVal) {
      newH = Math.round(newW / ratioVal);
      if (initialCropState.y + newH > maxH) {
        newH = maxH - initialCropState.y;
        newW = Math.round(newH * ratioVal);
      }
    }
    cropSelection.value.width = Math.round(newW);
    cropSelection.value.height = Math.round(newH);
  }
  else if (activeDragHandle.value === 'nw') {
    const newX = Math.max(0, Math.min(initialCropState.x + initialCropState.width - 20, initialCropState.x + deltaX));
    const newY = Math.max(0, Math.min(initialCropState.y + initialCropState.height - 20, initialCropState.y + deltaY));
    const newW = initialCropState.width + (initialCropState.x - newX);
    const newH = initialCropState.height + (initialCropState.y - newY);
    cropSelection.value.x = Math.round(newX);
    cropSelection.value.y = Math.round(newY);
    cropSelection.value.width = Math.round(newW);
    cropSelection.value.height = Math.round(newH);
  }
}

function onCropMouseUp() {
  activeDragHandle.value = null;
  window.removeEventListener('mousemove', onCropMouseMove);
  window.removeEventListener('mouseup', onCropMouseUp);
}

/**
 * 差分对比分割条拖拽事件
 */
function onSplitDividerMouseDown(event: MouseEvent) {
  event.stopPropagation();
  event.preventDefault();
  isSplitDragging.value = true;
  window.addEventListener('mousemove', onSplitMouseMove);
  window.addEventListener('mouseup', onSplitMouseUp);
}

function onSplitMouseMove(event: MouseEvent) {
  if (!isSplitDragging.value || !imageWrapperRef.value) return;
  const rect = imageWrapperRef.value.getBoundingClientRect();
  const posX = event.clientX - rect.left;
  const percent = (posX / rect.width) * 100;
  splitPosition.value = Math.max(0, Math.min(100, Math.round(percent)));
}

function onSplitMouseUp() {
  isSplitDragging.value = false;
  window.removeEventListener('mousemove', onSplitMouseMove);
  window.removeEventListener('mouseup', onSplitMouseUp);
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
  if (!viewportContainerRef.value || !baseVisualDimensions.value.width) {
    viewportZoom.value = 1.0;
    return;
  }

  const containerW = viewportContainerRef.value.clientWidth - 48;
  const containerH = viewportContainerRef.value.clientHeight - 48;
  if (containerW <= 0 || containerH <= 0) return;

  const scaleW = containerW / baseVisualDimensions.value.width;
  const scaleH = containerH / baseVisualDimensions.value.height;
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
 * 执行非破坏性渲染管线：更新实时预览与体积预估
 */
function updatePipelinePreview() {
  if (estimateDebounceTimer) {
    clearTimeout(estimateDebounceTimer);
  }
  estimateDebounceTimer = setTimeout(async () => {
    if (!rawImageElement.value || targetWidth.value <= 0 || targetHeight.value <= 0) {
      estimatedOutputSize.value = null;
      return;
    }

    try {
      const canvas = renderImagePipeline(rawImageElement.value, {
        crop: appliedCrop.value || undefined,
        transform: transform.value,
        targetWidth: targetWidth.value,
        targetHeight: targetHeight.value,
      });

      const quality = exportFormat.value === 'image/png' ? 1.0 : exportQuality.value / 100;
      const blob = await exportCanvasToBlob(canvas, exportFormat.value, quality);

      if (processedPreviewUrl.value) {
        URL.revokeObjectURL(processedPreviewUrl.value);
      }
      processedPreviewUrl.value = URL.createObjectURL(blob);
      estimatedOutputSize.value = blob.size;
    }
    catch {
      estimatedOutputSize.value = null;
    }
  }, 180);
}

// 监听参数变化重新执行渲染管线
watch(
  [
    targetWidth,
    targetHeight,
    exportFormat,
    exportQuality,
    appliedCrop,
    () => transform.value.rotation,
    () => transform.value.flipHorizontal,
    () => transform.value.flipVertical,
  ],
  () => {
    if (imageSource.value) {
      updatePipelinePreview();
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
    const canvas = renderImagePipeline(rawImageElement.value, {
      crop: appliedCrop.value || undefined,
      transform: transform.value,
      targetWidth: targetWidth.value,
      targetHeight: targetHeight.value,
    });

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
  if (processedPreviewUrl.value) {
    URL.revokeObjectURL(processedPreviewUrl.value);
  }
  imageSource.value = null;
  rawImageElement.value = null;
  transform.value = { rotation: 0, flipHorizontal: false, flipVertical: false };
  appliedCrop.value = null;
  isCropping.value = false;
  isCompareMode.value = false;
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

            <!-- 裁剪工具入口 -->
            <n-button
              size="tiny"
              secondary
              :type="isCropping ? 'warning' : 'default'"
              @click="isCropping ? cancelCrop() : startCropping()"
              title="交互式矩形裁剪"
            >
              <template #icon>
                <n-icon :component="Crop" />
              </template>
              {{ isCropping ? '退出裁剪' : (appliedCrop ? '编辑裁剪' : '裁剪') }}
            </n-button>

            <!-- 差分比对开关 -->
            <n-button
              size="tiny"
              secondary
              :disabled="isCropping"
              :type="isCompareMode ? 'primary' : 'default'"
              @click="isCompareMode = !isCompareMode"
              title="左右滑动分割比对原图与压缩画质"
            >
              <template #icon>
                <n-icon :component="Columns" />
              </template>
              {{ isCompareMode ? '关闭对比' : '差分对比' }}
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
          <!-- 图像渲染容器 (带平滑缩放) -->
          <div
            ref="imageWrapperRef"
            class="viewport-image-wrapper"
            :style="{
              transform: `scale(${viewportZoom})`,
              transformOrigin: 'center center',
            }"
          >
            <!-- 模式 1：交互式裁剪编辑覆盖层 -->
            <div v-if="isCropping" class="cropper-container">
              <!-- 原图底图 -->
              <img
                :src="imageSource.dataUrl"
                :alt="imageSource.name"
                class="cropper-base-image"
              >

              <!-- 裁剪半透明深色遮罩 -->
              <div class="crop-backdrop" />

              <!-- 可交互高亮裁剪矩形框 -->
              <div
                class="crop-selection-box"
                :style="{
                  left: `${(cropSelection.x / imageSource.originalWidth) * 100}%`,
                  top: `${(cropSelection.y / imageSource.originalHeight) * 100}%`,
                  width: `${(cropSelection.width / imageSource.originalWidth) * 100}%`,
                  height: `${(cropSelection.height / imageSource.originalHeight) * 100}%`,
                }"
                @mousedown="onCropHandleMouseDown('move', $event)"
              >
                <!-- 尺寸标签 -->
                <div class="crop-dim-badge">
                  {{ cropSelection.width }} × {{ cropSelection.height }}
                </div>

                <!-- 四个角交互拉伸把手 -->
                <div class="crop-handle nw" @mousedown="onCropHandleMouseDown('nw', $event)" />
                <div class="crop-handle ne" @mousedown="onCropHandleMouseDown('ne', $event)" />
                <div class="crop-handle se" @mousedown="onCropHandleMouseDown('se', $event)" />
                <div class="crop-handle sw" @mousedown="onCropHandleMouseDown('sw', $event)" />
              </div>
            </div>

            <!-- 模式 2：差分双视窗滑块对比模式 (Before-After Split View) -->
            <div v-else-if="isCompareMode" class="compare-container">
              <!-- 底层：处理后压缩图 (After) -->
              <img
                :src="processedPreviewUrl || imageSource.dataUrl"
                alt="after"
                class="compare-image after-image"
              >
              <div class="compare-tag after-tag">
                处理后 (After)
              </div>

              <!-- 顶层：原图 (Before)，使用 clip-path 切割 -->
              <div
                class="compare-before-layer"
                :style="{ clipPath: `polygon(0 0, ${splitPosition}% 0, ${splitPosition}% 100%, 0 100%)` }"
              >
                <img
                  :src="imageSource.dataUrl"
                  alt="before"
                  class="compare-image before-image"
                  :style="{
                    transform: `rotate(${transform.rotation}deg) scale(${transform.flipHorizontal ? -1 : 1}, ${transform.flipVertical ? -1 : 1})`,
                  }"
                >
                <div class="compare-tag before-tag">
                  原始图 (Before)
                </div>
              </div>

              <!-- 垂直拖拽分割线与居中手柄 -->
              <div
                class="split-divider"
                :style="{ left: `${splitPosition}%` }"
                @mousedown="onSplitDividerMouseDown"
              >
                <div class="split-handle" title="按住左右拖动对比画质细节">
                  <div class="split-handle-line" />
                </div>
              </div>
            </div>

            <!-- 模式 3：标准预览模式 (经过非破坏性渲染管线) -->
            <div
              v-else
              class="standard-preview-container"
              :style="{
                transform: `rotate(${transform.rotation}deg) scale(${transform.flipHorizontal ? -1 : 1}, ${transform.flipVertical ? -1 : 1})`,
              }"
            >
              <img
                :src="processedPreviewUrl || imageSource.dataUrl"
                :alt="imageSource.name"
                class="viewport-image"
              >
            </div>
          </div>
        </div>

        <!-- 裁剪模式专属底部操作栏 (严格水平居中) -->
        <div v-if="isCropping" class="cropper-toolbar">
          <div flex flex-wrap items-center justify-center gap-2>
            <span text-xs font-bold class="text-gray-500">裁剪比例：</span>
            <n-radio-group
              :value="cropRatio"
              size="tiny"
              @update:value="handleCropRatioChange"
            >
              <n-radio-button value="free">
                自由
              </n-radio-button>
              <n-radio-button value="1:1">
                1:1 (头像)
              </n-radio-button>
              <n-radio-button value="16:9">
                16:9 (横屏)
              </n-radio-button>
              <n-radio-button value="4:3">
                4:3
              </n-radio-button>
              <n-radio-button value="3:2">
                3:2
              </n-radio-button>
              <n-radio-button value="2:1">
                2:1 (横幅)
              </n-radio-button>
            </n-radio-group>

            <div class="toolbar-divider" />

            <n-button size="tiny" type="primary" @click="applyCrop">
              <template #icon>
                <n-icon :component="Check" />
              </template>
              应用裁剪
            </n-button>

            <n-button size="tiny" secondary @click="cancelCrop">
              <template #icon>
                <n-icon :component="X" />
              </template>
              取消
            </n-button>
          </div>
        </div>
      </div>

      <!-- 右侧：控制与导出侧边面板 -->
      <div class="studio-sidebar" flex flex-col gap-4>
        <!-- 卡片 1：原图基础信息 -->
        <n-card size="small" :bordered="true">
          <template #header>
            <div flex items-center justify-between text-sm>
              <div flex items-center gap-2>
                <n-icon size="18" class="text-primary" :component="Photo" />
                <span>原图与裁剪信息</span>
              </div>
              <n-button
                v-if="appliedCrop"
                size="tiny"
                quaternary
                type="warning"
                @click="clearAppliedCrop"
              >
                还原全图
              </n-button>
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
            <div v-if="appliedCrop" flex items-center justify-between>
              <span class="text-gray-500">裁剪有效区：</span>
              <n-tag size="tiny" type="warning" :bordered="false" round>
                {{ appliedCrop.width }} × {{ appliedCrop.height }} px
              </n-tag>
            </div>
            <div flex items-center justify-between>
              <span class="text-gray-500">原始体积：</span>
              <n-tag size="tiny" type="info" :bordered="false" round>
                {{ formatBytes(imageSource.size) }}
              </n-tag>
            </div>
            <div flex items-center justify-between>
              <span class="text-gray-500">当前基准尺寸：</span>
              <span font-mono font-bold class="text-primary">
                {{ baseVisualDimensions.width }} × {{ baseVisualDimensions.height }} px
              </span>
            </div>
          </div>
        </n-card>

        <!-- 卡片 2：几何旋转与镜像变换 -->
        <n-card size="small" :bordered="true">
          <template #header>
            <div flex items-center justify-between text-sm>
              <div flex items-center gap-2>
                <n-icon size="18" class="text-primary" :component="Rotate" />
                <span>几何旋转与镜像</span>
              </div>
              <n-button
                v-if="transform.rotation !== 0 || transform.flipHorizontal || transform.flipVertical"
                size="tiny"
                quaternary
                type="info"
                @click="handleResetTransform"
                title="恢复初始方向"
              >
                重置
              </n-button>
            </div>
          </template>

          <div flex flex-col gap-2.5>
            <!-- 几何变换按钮组 (严格水平居中) -->
            <div flex items-center justify-center gap-2 flex-wrap>
              <n-button size="small" secondary @click="handleRotateCounterClockwise" title="逆时针旋转 90°">
                <template #icon>
                  <n-icon :component="Rotate" />
                </template>
                逆转 90°
              </n-button>

              <n-button size="small" secondary @click="handleRotateClockwise" title="顺时针旋转 90°">
                <template #icon>
                  <n-icon :component="RotateClockwise" />
                </template>
                顺转 90°
              </n-button>

              <n-button
                size="small"
                secondary
                :type="transform.flipHorizontal ? 'primary' : 'default'"
                @click="handleToggleFlipH"
                title="水平镜像翻转"
              >
                <template #icon>
                  <n-icon :component="FlipHorizontal" />
                </template>
                水平翻转
              </n-button>

              <n-button
                size="small"
                secondary
                :type="transform.flipVertical ? 'primary' : 'default'"
                @click="handleToggleFlipV"
                title="垂直镜像翻转"
              >
                <template #icon>
                  <n-icon :component="FlipVertical" />
                </template>
                垂直翻转
              </n-button>
            </div>
          </div>
        </n-card>

        <!-- 卡片 3：尺寸缩放调节 -->
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
                :type="targetWidth === Math.round(baseVisualDimensions.width * p / 100) ? 'primary' : 'default'"
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

        <!-- 卡片 4：格式压缩与导出下载 -->
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
  z-index: 20;
}

.cropper-toolbar {
  padding: 8px 12px;
  border-top: 1px solid var(--n-border-color);
  background-color: var(--n-color-embedded);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
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
  position: relative;
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

.standard-preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 交互式裁剪样式 */
.cropper-container {
  position: relative;
  display: inline-block;
  user-select: none;
}

.cropper-base-image {
  display: block;
  max-width: none;
  pointer-events: none;
}

.crop-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.55);
  pointer-events: none;
}

.crop-selection-box {
  position: absolute;
  box-sizing: border-box;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
  cursor: move;
  z-index: 10;
}

.crop-dim-badge {
  position: absolute;
  top: -24px;
  left: 0;
  background-color: rgba(0, 0, 0, 0.75);
  color: #ffffff;
  font-size: 10px;
  font-family: monospace;
  padding: 2px 6px;
  border-radius: 2px;
  white-space: nowrap;
  pointer-events: none;
}

.crop-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: var(--n-primary-color);
  border: 2px solid #ffffff;
  box-sizing: border-box;
  border-radius: 50%;
  z-index: 15;
}

.crop-handle.nw { top: -6px; left: -6px; cursor: nwse-resize; }
.crop-handle.ne { top: -6px; right: -6px; cursor: nesw-resize; }
.crop-handle.se { bottom: -6px; right: -6px; cursor: nwse-resize; }
.crop-handle.sw { bottom: -6px; left: -6px; cursor: nesw-resize; }

/* 差分双视窗滑块比对 (Before-After Split View) */
.compare-container {
  position: relative;
  display: inline-block;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  user-select: none;
}

.compare-image {
  display: block;
  max-width: none;
  pointer-events: none;
}

.compare-before-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.compare-tag {
  position: absolute;
  top: 10px;
  font-size: 11px;
  font-weight: bold;
  padding: 3px 8px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  pointer-events: none;
  z-index: 10;
}

.before-tag { left: 10px; }
.after-tag { right: 10px; }

.split-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #ffffff;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
  cursor: ew-resize;
  z-index: 15;
  transform: translateX(-50%);
}

.split-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #ffffff;
  border: 2px solid var(--n-primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.split-handle-line {
  width: 4px;
  height: 14px;
  border-left: 2px solid #94a3b8;
  border-right: 2px solid #94a3b8;
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
