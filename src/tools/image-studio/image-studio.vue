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
  Camera,
  Certificate,
  Check,
  Code,
  ColorPicker,
  Columns,
  Copy,
  Crop,
  Download,
  Eye,
  FileSearch,
  FileText,
  FlipHorizontal,
  FlipVertical,
  Focus,
  GridDots,
  History,
  InfoCircle,
  LayersSubtract,
  LayoutGrid,
  Link,
  MapPin,
  Maximize,
  Palette,
  Photo,
  Refresh,
  Rotate,
  RotateClockwise,
  Scale,
  ShieldCheck,
  Typography,
  Unlink,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from '@vicons/tabler';
import {
  blobToBase64,
  calculateDimensionsByHeight,
  calculateDimensionsByPercentage,
  calculateDimensionsByWidth,
  calculateTransformedDimensions,
  clampCropRegion,
  clampDimension,
  DIMENSION_PRESETS,
  exportCanvasToBlob,
  extractColorPalette,
  formatExifSummary,
  generateExportFileName,
  getAspectRatioValue,
  loadImageFromBlobOrDataUrl,
  parseExifMetadata,
  rasterizeSvgText,
  renderImagePipeline,
} from './image-studio.service';
import {
  type CanvasBackgroundConfig,
  type CanvasBackgroundMode,
  type CropAspectRatio,
  type CropRegion,
  type DimensionPreset,
  type ExifMetadata,
  type ExportImageFormat,
  type ImageSourceInfo,
  MAX_SAFE_IMAGE_DIMENSION,
  type PaletteColor,
  type StudioWatermarkConfig,
  type TransformOptions,
  type WatermarkAnchor,
} from './image-studio.types';
import { useCopy } from '@/composable/copy';
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

// 图文双模水印与全屏防盗阵列
const watermarkConfig = ref<StudioWatermarkConfig>({
  enabled: false,
  mode: 'text',
  text: {
    text: '内部资料 严禁外传',
    fontSize: 28,
    color: '#999999',
    opacity: 0.35,
    rotation: -45,
    isTiled: true,
    tileGapX: 120,
    tileGapY: 100,
    anchor: 'bottom-right',
    margin: 20,
  },
  image: {
    imageDataUrl: '',
    scale: 0.3,
    opacity: 0.5,
    anchor: 'bottom-right',
    margin: 20,
    rotation: 0,
    isTiled: false,
    tileGap: 140,
  },
});
const loadedLogoImage = shallowRef<HTMLImageElement | null>(null);
const logoInputRef = ref<HTMLInputElement | null>(null);

// 剪贴板复制 composable
const { copy } = useCopy({ createToast: false });

// EXIF 隐私透视与抽屉状态
const exifData = ref<ExifMetadata>({ hasData: false });
const isExifDrawerOpen = ref(false);

// 主题调色板提取状态
const paletteColors = ref<PaletteColor[]>([]);
const paletteCount = ref(6);

// 画布背景显示与底色填充配置
const backgroundConfig = ref<CanvasBackgroundConfig>({
  mode: 'checkerboard',
  customColor: '#FFFFFF',
});

// 计算当前生效的背景填充底色 (若透明转 JPEG 默认填充纯白兜底防黑边)
const effectiveBackgroundColor = computed(() => {
  switch (backgroundConfig.value.mode) {
    case 'white':
      return '#FFFFFF';
    case 'black':
      return '#000000';
    case 'custom':
      return backgroundConfig.value.customColor || '#FFFFFF';
    case 'checkerboard':
    default:
      return exportFormat.value === 'image/jpeg' ? '#FFFFFF' : 'transparent';
  }
});

const backgroundModeLabel = computed(() => {
  switch (backgroundConfig.value.mode) {
    case 'white':
      return '纯白底';
    case 'black':
      return '纯黑底';
    case 'custom':
      return '自定义底色';
    case 'checkerboard':
    default:
      return '透明棋盘格';
  }
});

// 选中的开发者常用尺寸预设
const selectedPresetId = ref<string | null>(null);

// 尺寸预设分组选项 (供 NSelect 使用)
const presetSelectOptions = computed(() => [
  {
    type: 'group',
    label: 'Windows 图标与 Favicon',
    key: 'icon-group',
    children: DIMENSION_PRESETS.filter(p => p.category === 'icon').map(p => ({
      label: `${p.name} (${p.width}×${p.height})`,
      value: p.id,
    })),
  },
  {
    type: 'group',
    label: '社交网络与开发者平台',
    key: 'social-group',
    children: DIMENSION_PRESETS.filter(p => p.category === 'social').map(p => ({
      label: `${p.name} (${p.width}×${p.height})`,
      value: p.id,
    })),
  },
]);

// 导出与压缩配置
const exportFormat = ref<ExportImageFormat>('image/webp');
const exportQuality = ref(90);
const customExportName = ref('');
const isExporting = ref(false);
const isCopyingBase64 = ref(false);

// 处理后的实时预览图 URL 与体积预估
const processedPreviewUrl = ref<string>('');
const estimatedOutputSize = ref<number | null>(null);
let estimateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// 隐藏的原生文件输入框
const fileInputRef = ref<HTMLInputElement | null>(null);

/**
 * 应用开发者常用尺寸预设
 */
function applyDimensionPreset(presetId: string | null) {
  if (!presetId) return;
  const preset = DIMENSION_PRESETS.find(p => p.id === presetId);
  if (!preset) return;
  selectedPresetId.value = presetId;
  targetWidth.value = preset.width;
  targetHeight.value = preset.height;
  message.success(`已应用“${preset.name}”预设尺寸 (${preset.width} × ${preset.height} px)`);
}

/**
 * 一键复制当前渲染图的 Base64 Data URL 字符串
 */
async function handleCopyBase64() {
  if (!rawImageElement.value || targetWidth.value <= 0 || targetHeight.value <= 0) {
    message.warning('请先载入并处理图片');
    return;
  }

  try {
    isCopyingBase64.value = true;
    const canvas = renderImagePipeline(rawImageElement.value, {
      crop: appliedCrop.value || undefined,
      transform: transform.value,
      targetWidth: targetWidth.value,
      targetHeight: targetHeight.value,
      watermark: watermarkConfig.value,
      backgroundColor: effectiveBackgroundColor.value,
      loadedLogoImage: loadedLogoImage.value,
    });

    const quality = exportFormat.value === 'image/png' ? 1.0 : exportQuality.value / 100;
    const blob = await exportCanvasToBlob(canvas, exportFormat.value, quality);
    const dataUrl = await blobToBase64(blob);

    copy(dataUrl);
    message.success(`已成功复制 Base64 Data URL (共 ${dataUrl.length.toLocaleString()} 字符)`);
  }
  catch (err: any) {
    message.error(`Base64 生成失败：${err?.message || '未知错误'}`);
  }
  finally {
    isCopyingBase64.value = false;
  }
}

/**
 * 一键复制全部 EXIF 摘要报告
 */
function copyExifSummary() {
  const summary = formatExifSummary(exifData.value);
  copy(summary);
  message.success('已复制完整 EXIF 摘要报告');
}

/**
 * 复制单个 EXIF 属性值
 */
function copyFieldValue(label: string, value?: string | number) {
  if (value === undefined || value === '') return;
  copy(String(value));
  message.success(`已复制 ${label}: ${value}`);
}

/**
 * 重新提取当前画面的调色板
 */
function refreshPalette() {
  if (rawImageElement.value) {
    if (targetWidth.value > 0 && targetHeight.value > 0) {
      try {
        const canvas = renderImagePipeline(rawImageElement.value, {
          crop: appliedCrop.value || undefined,
          transform: transform.value,
          targetWidth: Math.min(300, targetWidth.value),
          targetHeight: Math.min(300, targetHeight.value),
          watermark: watermarkConfig.value,
          loadedLogoImage: loadedLogoImage.value,
        });
        paletteColors.value = extractColorPalette(canvas, paletteCount.value);
        return;
      }
      catch {
        // 降级使用原图提取
      }
    }
    paletteColors.value = extractColorPalette(rawImageElement.value, paletteCount.value);
  }
}

/**
 * 复制单个 HEX 颜色代码
 */
function copyColorHex(hex: string) {
  copy(hex);
  message.success(`已复制 HEX 色值: ${hex}`);
}

/**
 * 复制单个 RGB 颜色代码
 */
function copyColorRgb(rgb: string) {
  copy(rgb);
  message.success(`已复制 RGB 色值: ${rgb}`);
}

/**
 * 复制全部调色板代码 (HEX)
 */
function copyAllPaletteHex() {
  if (paletteColors.value.length === 0) return;
  const list = paletteColors.value.map(c => c.hex).join(', ');
  copy(list);
  message.success('已复制全部 HEX 色代码');
}

/**
 * 复制全部调色板代码 (RGB)
 */
function copyAllPaletteRgb() {
  if (paletteColors.value.length === 0) return;
  const list = paletteColors.value.map(c => c.rgb).join(', ');
  copy(list);
  message.success('已复制全部 RGB 色代码');
}

/**
 * 九宫格锚点选项定义
 */
const anchorGridList: WatermarkAnchor[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

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
 * 触发主图像文件选择
 */
function triggerFileInput() {
  fileInputRef.value?.click();
}

/**
 * 触发 Logo 图片文件选择
 */
function triggerLogoInput() {
  logoInputRef.value?.click();
}

/**
 * 处理 Logo 文件上传
 */
async function onLogoFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const img = await loadImageFromBlobOrDataUrl(file);
    loadedLogoImage.value = img;
    watermarkConfig.value.image.imageDataUrl = URL.createObjectURL(file);
    watermarkConfig.value.mode = 'image';
    message.success(`已载入水印 LOGO “${file.name}”`);
    updatePipelinePreview();
  }
  catch {
    message.error('水印 Logo 图片解析失败');
  }
  finally {
    input.value = '';
  }
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

    // 异步零阻塞解析原图 EXIF 元数据
    file.arrayBuffer().then((buf) => {
      exifData.value = parseExifMetadata(buf);
    }).catch(() => {
      exifData.value = { hasData: false };
    });

    // 提取初始原图调色板
    paletteColors.value = extractColorPalette(img, paletteCount.value);

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
        watermark: watermarkConfig.value,
        backgroundColor: effectiveBackgroundColor.value,
        loadedLogoImage: loadedLogoImage.value,
      });

      const quality = exportFormat.value === 'image/png' ? 1.0 : exportQuality.value / 100;
      const blob = await exportCanvasToBlob(canvas, exportFormat.value, quality);

      if (processedPreviewUrl.value) {
        URL.revokeObjectURL(processedPreviewUrl.value);
      }
      processedPreviewUrl.value = URL.createObjectURL(blob);
      estimatedOutputSize.value = blob.size;

      // 实时采样提取主题调色板
      paletteColors.value = extractColorPalette(canvas, paletteCount.value);
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
    () => effectiveBackgroundColor.value,
    () => transform.value.rotation,
    () => transform.value.flipHorizontal,
    () => transform.value.flipVertical,
    () => watermarkConfig.value.enabled,
    () => watermarkConfig.value.mode,
    () => watermarkConfig.value.text.text,
    () => watermarkConfig.value.text.fontSize,
    () => watermarkConfig.value.text.color,
    () => watermarkConfig.value.text.opacity,
    () => watermarkConfig.value.text.rotation,
    () => watermarkConfig.value.text.isTiled,
    () => watermarkConfig.value.text.anchor,
    () => watermarkConfig.value.text.margin,
    () => watermarkConfig.value.image.scale,
    () => watermarkConfig.value.image.opacity,
    () => watermarkConfig.value.image.anchor,
    () => watermarkConfig.value.image.isTiled,
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
      watermark: watermarkConfig.value,
      backgroundColor: effectiveBackgroundColor.value,
      loadedLogoImage: loadedLogoImage.value,
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
    <input
      ref="logoInputRef"
      type="file"
      accept="image/png,image/jpeg,image/svg+xml"
      style="display: none"
      @change="onLogoFileChange"
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

            <!-- EXIF 透视入口 -->
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-button
                  size="tiny"
                  secondary
                  :type="exifData.hasData ? 'info' : 'default'"
                  @click="isExifDrawerOpen = true"
                >
                  <template #icon>
                    <n-icon :component="FileSearch" />
                  </template>
                  EXIF 透视
                </n-button>
              </template>
              {{ exifData.hasData ? '已检测到原图 EXIF 元数据，点击打开隐私透视抽屉' : '查看原图 EXIF 元数据与隐私检测' }}
            </n-tooltip>

            <!-- 画布背景模式切换 -->
            <n-popselect
              v-model:value="backgroundConfig.mode"
              :options="[
                { label: '透明棋盘格 (默认)', value: 'checkerboard' },
                { label: '纯白底色 (#FFF)', value: 'white' },
                { label: '纯黑底色 (#000)', value: 'black' },
                { label: '自定义纯色...', value: 'custom' },
              ]"
              size="small"
              trigger="click"
            >
              <n-button size="tiny" secondary title="切换视口与导出背景模式">
                <template #icon>
                  <n-icon :component="LayersSubtract" />
                </template>
                {{ backgroundModeLabel }}
              </n-button>
            </n-popselect>

            <!-- 自定义纯色底选择器 -->
            <n-color-picker
              v-if="backgroundConfig.mode === 'custom'"
              v-model:value="backgroundConfig.customColor"
              size="tiny"
              :show-alpha="false"
              style="width: 28px"
              title="设置自定义背景纯色"
            />

            <div class="toolbar-divider" />

            <n-button size="tiny" secondary type="primary" @click="triggerFileInput" title="更换新图片">
              <template #icon>
                <n-icon :component="Refresh" />
              </template>
              更换图片
            </n-button>
          </div>
        </div>

        <!-- 视口主画布舞台 (根据 backgroundConfig.mode 自适应切换底色与纹理) -->
        <div
          ref="viewportContainerRef"
          class="viewport-stage"
          :class="{ 'checkerboard-bg': backgroundConfig.mode === 'checkerboard' }"
          :style="{
            backgroundColor: backgroundConfig.mode === 'white'
              ? '#ffffff'
              : (backgroundConfig.mode === 'black'
                ? '#000000'
                : (backgroundConfig.mode === 'custom' ? backgroundConfig.customColor : undefined)),
          }"
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

            <!-- 模式 3：标准预览模式 (经过非破坏性渲染管线与水印) -->
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

            <!-- 查看原图 EXIF 快捷入口 -->
            <div pt-1>
              <n-button
                size="tiny"
                secondary
                :type="exifData.hasData ? 'info' : 'default'"
                block
                @click="isExifDrawerOpen = true"
              >
                <template #icon>
                  <n-icon :component="FileSearch" />
                </template>
                原图 EXIF 隐私透视 ({{ exifData.hasData ? '已解析' : '无元数据' }})
              </n-button>
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

        <!-- 卡片 3：图文双模水印与全屏防盗阵列 -->
        <n-card size="small" :bordered="true">
          <template #header>
            <div flex items-center justify-between text-sm>
              <div flex items-center gap-2>
                <n-icon size="18" class="text-primary" :component="Certificate" />
                <span>图文水印与防盗阵列</span>
              </div>
              <!-- 全局启用开关 -->
              <div flex items-center gap-1.5>
                <n-switch v-model:value="watermarkConfig.enabled" size="small" />
                <span text-11px class="text-gray-400">{{ watermarkConfig.enabled ? '已启用' : '未启用' }}</span>
              </div>
            </div>
          </template>

          <div v-if="watermarkConfig.enabled" flex flex-col gap-3.5>
            <!-- 水印模式切换 -->
            <div flex items-center justify-center>
              <n-radio-group v-model:value="watermarkConfig.mode" size="small">
                <n-radio-button value="text">
                  <div flex items-center gap-1>
                    <n-icon size="14" :component="Typography" />
                    <span>文字水印</span>
                  </div>
                </n-radio-button>
                <n-radio-button value="image">
                  <div flex items-center gap-1>
                    <n-icon size="14" :component="Photo" />
                    <span>Logo 图片</span>
                  </div>
                </n-radio-button>
              </n-radio-group>
            </div>

            <!-- 文字水印专属配置 -->
            <div v-if="watermarkConfig.mode === 'text'" flex flex-col gap-2.5>
              <div>
                <span text-11px class="text-gray-500 mb-1 block">水印文本：</span>
                <n-input
                  v-model:value="watermarkConfig.text.text"
                  placeholder="输入水印文字内容"
                  size="small"
                  clearable
                />
              </div>

              <div grid grid-cols-2 gap-2.5>
                <div>
                  <span text-11px class="text-gray-500 mb-1 block">字号 ({{ watermarkConfig.text.fontSize }}px)：</span>
                  <n-slider
                    v-model:value="watermarkConfig.text.fontSize"
                    :min="12"
                    :max="100"
                    :step="2"
                  />
                </div>

                <div>
                  <span text-11px class="text-gray-500 mb-1 block">文字颜色：</span>
                  <n-color-picker
                    v-model:value="watermarkConfig.text.color"
                    :show-alpha="false"
                    size="small"
                  />
                </div>
              </div>

              <div grid grid-cols-2 gap-2.5>
                <div>
                  <span text-11px class="text-gray-500 mb-1 block">不透明度 ({{ Math.round(watermarkConfig.text.opacity * 100) }}%)：</span>
                  <n-slider
                    v-model:value="watermarkConfig.text.opacity"
                    :min="0.05"
                    :max="1.0"
                    :step="0.05"
                  />
                </div>

                <div>
                  <span text-11px class="text-gray-500 mb-1 block">旋转角度 ({{ watermarkConfig.text.rotation }}°)：</span>
                  <n-slider
                    v-model:value="watermarkConfig.text.rotation"
                    :min="-90"
                    :max="90"
                    :step="5"
                  />
                </div>
              </div>

              <!-- 全屏对角平铺开关 -->
              <div flex items-center justify-between pt-1>
                <div flex items-center gap-1.5>
                  <n-icon size="16" class="text-primary" :component="GridDots" />
                  <span text-xs font-medium>全屏对角平铺阵列 (防盗)</span>
                </div>
                <n-switch v-model:value="watermarkConfig.text.isTiled" size="small" />
              </div>

              <!-- 非平铺模式：九宫格锚点选择 -->
              <div v-if="!watermarkConfig.text.isTiled" flex flex-col gap-1.5 pt-1>
                <span text-11px class="text-gray-500">九宫格停靠定位：</span>
                <div class="anchor-grid-wrapper">
                  <div
                    v-for="anchor in anchorGridList"
                    :key="anchor"
                    class="anchor-grid-cell"
                    :class="{ active: watermarkConfig.text.anchor === anchor }"
                    :title="anchor"
                    @click="watermarkConfig.text.anchor = anchor"
                  />
                </div>
              </div>
            </div>

            <!-- 图片 Logo 水印专属配置 -->
            <div v-if="watermarkConfig.mode === 'image'" flex flex-col gap-2.5>
              <div>
                <n-button size="small" block secondary type="primary" @click="triggerLogoInput">
                  <template #icon>
                    <n-icon :component="Upload" />
                  </template>
                  {{ watermarkConfig.image.imageDataUrl ? '更换水印 LOGO' : '上传水印 LOGO (PNG)' }}
                </n-button>
              </div>

              <div v-if="watermarkConfig.image.imageDataUrl" flex flex-col gap-2.5>
                <div grid grid-cols-2 gap-2.5>
                  <div>
                    <span text-11px class="text-gray-500 mb-1 block">Logo 缩放 ({{ Math.round(watermarkConfig.image.scale * 100) }}%)：</span>
                    <n-slider
                      v-model:value="watermarkConfig.image.scale"
                      :min="0.05"
                      :max="1.0"
                      :step="0.05"
                    />
                  </div>

                  <div>
                    <span text-11px class="text-gray-500 mb-1 block">不透明度 ({{ Math.round(watermarkConfig.image.opacity * 100) }}%)：</span>
                    <n-slider
                      v-model:value="watermarkConfig.image.opacity"
                      :min="0.05"
                      :max="1.0"
                      :step="0.05"
                    />
                  </div>
                </div>

                <!-- 图片全屏平铺开关 -->
                <div flex items-center justify-between pt-1>
                  <div flex items-center gap-1.5>
                    <n-icon size="16" class="text-primary" :component="GridDots" />
                    <span text-xs font-medium>全屏对角平铺阵列</span>
                  </div>
                  <n-switch v-model:value="watermarkConfig.image.isTiled" size="small" />
                </div>

                <!-- 非平铺模式：九宫格锚点选择 -->
                <div v-if="!watermarkConfig.image.isTiled" flex flex-col gap-1.5 pt-1>
                  <span text-11px class="text-gray-500">九宫格停靠定位：</span>
                  <div class="anchor-grid-wrapper">
                    <div
                      v-for="anchor in anchorGridList"
                      :key="anchor"
                      class="anchor-grid-cell"
                      :class="{ active: watermarkConfig.image.anchor === anchor }"
                      :title="anchor"
                      @click="watermarkConfig.image.anchor = anchor"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else text-11px class="text-gray-400 py-1 text-center">
            点击上方开关开启防盗文字或 LOGO 水印
          </div>
        </n-card>

        <!-- 卡片 4：主题调色板提取 (Color Palette Extractor) -->
        <n-card size="small" :bordered="true">
          <template #header>
            <div flex items-center justify-between text-sm>
              <div flex items-center gap-2>
                <n-icon size="18" class="text-primary" :component="Palette" />
                <span>主题调色板提取</span>
              </div>
              <!-- 色彩量化数量切换 -->
              <div flex items-center gap-1.5>
                <n-radio-group v-model:value="paletteCount" size="tiny" @update:value="refreshPalette">
                  <n-radio-button :value="6">
                    6 色
                  </n-radio-button>
                  <n-radio-button :value="8">
                    8 色
                  </n-radio-button>
                </n-radio-group>
              </div>
            </div>
          </template>

          <div flex flex-col gap-3>
            <!-- 色谱综合占比连续渐变色条 -->
            <div
              v-if="paletteColors.length > 0"
              class="h-6 w-full rounded overflow-hidden flex shadow-inner border border-gray-200 dark:border-gray-700"
            >
              <div
                v-for="color in paletteColors"
                :key="color.hex"
                class="h-full transition-all duration-300 relative group cursor-pointer"
                :style="{
                  width: `${color.percentage}%`,
                  backgroundColor: color.hex,
                }"
                :title="`${color.hex} (${color.percentage}%) - 点击复制`"
                @click="copyColorHex(color.hex)"
              />
            </div>

            <!-- 色块卡片网格列表 (双列) -->
            <div v-if="paletteColors.length > 0" grid grid-cols-2 gap-2>
              <div
                v-for="color in paletteColors"
                :key="color.hex"
                class="palette-swatch-card"
                :title="`点击复制 HEX: ${color.hex}`"
                @click="copyColorHex(color.hex)"
              >
                <!-- 纯色圆角微块 -->
                <div
                  class="palette-color-box"
                  :style="{ backgroundColor: color.hex, color: color.textColor }"
                >
                  <span text-10px font-mono font-bold opacity-90>{{ color.percentage }}%</span>
                </div>

                <!-- 颜色信息 -->
                <div flex flex-col justify-center flex-1 min-w-0 pr-1>
                  <span font-mono text-xs font-bold truncate>{{ color.hex }}</span>
                  <span font-mono text-10px class="text-gray-400" truncate>{{ color.rgb }}</span>
                </div>

                <!-- 快捷复制 RGB -->
                <n-button
                  size="tiny"
                  quaternary
                  circle
                  title="复制 RGB 色值代码"
                  @click.stop="copyColorRgb(color.rgb)"
                >
                  <template #icon>
                    <n-icon size="13" :component="Copy" />
                  </template>
                </n-button>
              </div>
            </div>
            <div v-else text-11px class="text-gray-400 text-center py-2">
              暂无可用调色板数据
            </div>

            <!-- 快捷复制与刷新按钮组 (严格居中排布) -->
            <div flex items-center justify-center gap-2 pt-1>
              <n-button size="tiny" secondary @click="copyAllPaletteHex">
                <template #icon>
                  <n-icon :component="Copy" />
                </template>
                全部 HEX
              </n-button>

              <n-button size="tiny" secondary @click="copyAllPaletteRgb">
                <template #icon>
                  <n-icon :component="Copy" />
                </template>
                全部 RGB
              </n-button>

              <n-button size="tiny" quaternary @click="refreshPalette" title="重新从当前画面采样">
                <template #icon>
                  <n-icon :component="Refresh" />
                </template>
              </n-button>
            </div>
          </div>
        </n-card>

        <!-- 卡片 5：尺寸缩放调节 -->
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
            <!-- 开发者常用尺寸预设模板 -->
            <div>
              <span text-11px class="text-gray-500 mb-1 block">开发者常用尺寸模板：</span>
              <n-select
                v-model:value="selectedPresetId"
                :options="presetSelectOptions"
                placeholder="快速套用尺寸 (如 Favicon, GitHub 头像...)"
                size="small"
                clearable
                filterable
                @update:value="applyDimensionPreset"
              />
            </div>

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

        <!-- 卡片 5：格式压缩与导出下载 -->
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
                <div grid grid-cols-4 gap-1.5 w-full>
                  <n-radio-button value="image/webp" class="text-center">
                    WebP
                  </n-radio-button>
                  <n-radio-button value="image/jpeg" class="text-center">
                    JPEG
                  </n-radio-button>
                  <n-radio-button value="image/png" class="text-center">
                    PNG
                  </n-radio-button>
                  <n-radio-button value="image/x-icon" class="text-center">
                    ICO
                  </n-radio-button>
                </div>
              </n-radio-group>
            </div>

            <!-- 画质滑块 (JPEG & WebP) 或无损提示 -->
            <div v-if="exportFormat !== 'image/png' && exportFormat !== 'image/x-icon'">
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
            <div v-else-if="exportFormat === 'image/x-icon'" text-11px class="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 p-2 rounded leading-relaxed">
              Windows Favicon 格式自动打包 16×16、32×32、48×48 多尺寸高保真 PNG 图标容器
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

            <!-- 隐私抹除安全标识 -->
            <div flex items-center justify-between text-xs class="bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200">
              <div flex items-center gap-1.5>
                <n-icon size="16" class="text-emerald-600 dark:text-emerald-400" :component="ShieldCheck" />
                <span font-medium>已 100% 抹除 EXIF 与 GPS 敏感信息</span>
              </div>
              <n-tag size="tiny" type="success" :bordered="false" round>
                安全保护
              </n-tag>
            </div>

            <!-- 导出与 Base64 直出按钮组 (水平居中对齐) -->
            <div flex items-center justify-center gap-2 pt-1>
              <n-button
                type="primary"
                size="medium"
                style="flex: 1"
                :loading="isExporting"
                :disabled="isOverLimit"
                @click="handleExportDownload"
              >
                <template #icon>
                  <n-icon :component="Download" />
                </template>
                导出并下载
              </n-button>

              <n-button
                size="medium"
                secondary
                type="info"
                :loading="isCopyingBase64"
                :disabled="isOverLimit"
                title="一键生成并复制 Base64 Data URL 字符串"
                @click="handleCopyBase64"
              >
                <template #icon>
                  <n-icon :component="Code" />
                </template>
                复制 Base64
              </n-button>
            </div>
          </div>
        </n-card>
      </div>
    </div>

    <!-- 原图 EXIF 隐私透视只读抽屉 (EXIF Inspector) -->
    <n-drawer v-model:show="isExifDrawerOpen" :width="460" placement="right">
      <n-drawer-content title="EXIF 隐私元数据透视" closable>
        <!-- 隐私抹除保障提示横幅 -->
        <div class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded p-3 mb-4 flex items-start gap-2.5">
          <n-icon size="18" class="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" :component="ShieldCheck" />
          <div text-xs class="text-emerald-800 dark:text-emerald-200 leading-relaxed">
            <div font-bold mb-0.5>
              100% 纯客户端隐私抹除保障
            </div>
            本工具导出的所有图片文件（PNG/JPEG/WebP）均在浏览器本地内存中重新渲染生成，已自动且彻底抹除相机厂商、设备型号、拍摄参数及 GPS 地理位置等元数据，杜绝个人隐私泄露。
          </div>
        </div>

        <!-- 空状态：无 EXIF 数据 -->
        <div v-if="!exifData.hasData" class="py-12 flex flex-col items-center justify-center text-center">
          <n-empty description="未检测到任何 EXIF 元数据">
            <template #extra>
              <div text-xs class="text-gray-400 max-w-280px mt-1 leading-normal">
                原图可能为网页截图、已抹除隐私的照片，或文件格式不包含 EXIF 段。在公网分享此图片无隐私泄露风险。
              </div>
            </template>
          </n-empty>
        </div>

        <!-- 详细 EXIF 元数据分类卡片 -->
        <div v-else flex flex-col gap-4>
          <!-- GPS 地理位置定位敏感卡片 (若存在 GPS) -->
          <div
            v-if="exifData.gps"
            class="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded p-3 text-xs flex flex-col gap-1.5"
          >
            <div flex items-center justify-between font-bold class="text-amber-800 dark:text-amber-200">
              <div flex items-center gap-1.5>
                <n-icon size="16" class="text-amber-600" :component="MapPin" />
                <span>检测到 GPS 敏感定位数据！</span>
              </div>
              <n-tag size="tiny" type="warning" round :bordered="false">
                高危敏感
              </n-tag>
            </div>
            <div class="text-amber-700 dark:text-amber-300">
              原图包含了拍摄时的精确物理坐标，直接分享原图极易暴露家庭住址或工作定位；使用本工具导出时已自动为您抹除。
            </div>
            <div class="bg-white/80 dark:bg-black/30 p-2 rounded flex items-center justify-between font-mono mt-1">
              <span truncate :title="exifData.gps.formattedCoords">{{ exifData.gps.formattedCoords }}</span>
              <n-button
                size="tiny"
                quaternary
                type="primary"
                @click="copyFieldValue('GPS 经纬度坐标', exifData.gps.formattedCoords)"
              >
                复制坐标
              </n-button>
            </div>
            <div v-if="exifData.gps.altitude !== undefined" flex items-center justify-between text-11px class="text-gray-500">
              <span>海拔高度：</span>
              <span>{{ exifData.gps.altitude }} 米</span>
            </div>
          </div>

          <!-- 设备与相机信息 -->
          <n-card size="small" title="相机与设备" :bordered="true">
            <n-descriptions :column="1" size="small" label-placement="left">
              <n-descriptions-item label="设备厂商">
                <span font-medium>{{ exifData.make || '未知' }}</span>
              </n-descriptions-item>
              <n-descriptions-item label="相机型号">
                <span font-medium>{{ exifData.model || '未知' }}</span>
              </n-descriptions-item>
              <n-descriptions-item label="镜头型号">
                <span>{{ exifData.lensModel || '未知' }}</span>
              </n-descriptions-item>
              <n-descriptions-item label="固件软件">
                <span>{{ exifData.software || '未知' }}</span>
              </n-descriptions-item>
            </n-descriptions>
          </n-card>

          <!-- 拍摄曝光参数 -->
          <n-card size="small" title="拍摄曝光参数" :bordered="true">
            <n-descriptions :column="2" size="small" label-placement="left">
              <n-descriptions-item label="快门速度">
                <span font-mono font-bold>{{ exifData.exposureTime || '未知' }}</span>
              </n-descriptions-item>
              <n-descriptions-item label="光圈大小">
                <span font-mono font-bold>{{ exifData.fNumber || '未知' }}</span>
              </n-descriptions-item>
              <n-descriptions-item label="ISO 感光度">
                <span font-mono font-bold>{{ exifData.iso !== undefined ? exifData.iso : '未知' }}</span>
              </n-descriptions-item>
              <n-descriptions-item label="镜头焦距">
                <span font-mono>{{ exifData.focalLength || '未知' }}</span>
              </n-descriptions-item>
              <n-descriptions-item v-if="exifData.imageWidth && exifData.imageHeight" label="原始尺寸" :span="2">
                <span font-mono>{{ exifData.imageWidth }} × {{ exifData.imageHeight }} px</span>
              </n-descriptions-item>
            </n-descriptions>
          </n-card>

          <!-- 拍摄时间与版权信息 -->
          <n-card size="small" title="时间与版权" :bordered="true">
            <n-descriptions :column="1" size="small" label-placement="left">
              <n-descriptions-item label="拍摄时间">
                <span>{{ exifData.dateTimeOriginal || exifData.dateTime || '未知' }}</span>
              </n-descriptions-item>
              <n-descriptions-item v-if="exifData.artist" label="拍摄作者">
                <span>{{ exifData.artist }}</span>
              </n-descriptions-item>
              <n-descriptions-item v-if="exifData.copyright" label="版权声明">
                <span>{{ exifData.copyright }}</span>
              </n-descriptions-item>
            </n-descriptions>
          </n-card>
        </div>

        <!-- 抽屉底部操作栏 (严格居中排布) -->
        <template #footer>
          <div flex items-center justify-center w-full>
            <n-button
              type="primary"
              secondary
              block
              :disabled="!exifData.hasData"
              @click="copyExifSummary"
            >
              <template #icon>
                <n-icon :component="Copy" />
              </template>
              一键复制完整 EXIF 摘要报告
            </n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>
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

/* 九宫格锚点选择器小组件 */
.anchor-grid-wrapper {
  display: grid;
  grid-template-columns: repeat(3, 28px);
  gap: 4px;
  width: fit-content;
  background-color: var(--n-color-embedded);
  padding: 4px;
  border-radius: 4px;
  border: 1px solid var(--n-border-color);
}

.anchor-grid-cell {
  width: 28px;
  height: 28px;
  border-radius: 3px;
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
  cursor: pointer;
  transition: all 0.15s ease;
}

.anchor-grid-cell:hover {
  border-color: var(--n-primary-color);
  transform: scale(1.05);
}

.anchor-grid-cell.active {
  background-color: var(--n-primary-color);
  border-color: var(--n-primary-color);
  box-shadow: 0 0 0 1px var(--n-primary-color);
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

/* 主题调色板色块卡片 */
.palette-swatch-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background-color: var(--n-color-embedded);
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.palette-swatch-card:hover {
  border-color: var(--n-primary-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.palette-color-box {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}
</style>
