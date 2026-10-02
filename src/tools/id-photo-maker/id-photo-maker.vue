<script setup lang="ts">
/**
 * 证件照制作工坊 (ID Photo Maker) 视图组件
 *
 * @author Ateng
 * @since 2026-10-02
 */
import { useMessage } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from 'vue';
import {
  Adjustments,
  ArrowsMaximize,
  AspectRatio,
  Brush,
  Check,
  ColorPicker as ColorPickerIcon,
  Copy,
  Cut,
  Download,
  Eraser,
  Eye,
  Id,
  IdBadge,
  LayoutGrid,
  Maximize,
  Palette,
  Photo,
  Printer,
  Refresh,
  Rotate,
  RotateClockwise,
  Scan,
  Trash,
  Upload,
  ZoomIn,
  ZoomOut,
} from '@vicons/tabler';
import { useCopy } from '@/composable/copy';
import {
  BACKGROUND_COLOR_PRESETS,
  type BackgroundConfig,
  type CustomSpecConfig,
  type ExportImageFormat,
  type GuidelineConfig,
  type MattingConfig,
  PHOTO_SPEC_PRESETS,
  type PhotoSpec,
  type PhotoSpecCategory,
  type PortraitTransform,
  type PrintPaperConfig,
  type TargetKbConfig,
} from './id-photo-maker.types';
import {
  applyBrushToMask,
  applyFeathering,
  calculateDownscaleFactor,
  calculatePrintLayout,
  generateToleranceMask,
  getPhotoSpecById,
  hexToRgb,
  mmToPx,
  pxToMm,
  resolveCustomDimensions,
  sampleImageCorners,
  searchOptimalQuality,
} from './id-photo-maker.service';

const message = useMessage();
const { t } = useI18n();
const { copy } = useCopy({ createToast: false });

// 视窗 Tab 切换：单张制作 / 冲印相纸
const activeTab = ref<'single' | 'print'>('single');

// 原始图像与上传状态
const hasImage = ref(false);
const rawImageElement = shallowRef<HTMLImageElement | null>(null);
const rawImageWidth = ref(0);
const rawImageHeight = ref(0);
const rawImageMime = ref('image/jpeg');

// 画布 DOM 引用
const previewCanvasRef = ref<HTMLCanvasElement | null>(null);
const printCanvasRef = ref<HTMLCanvasElement | null>(null);
const canvasContainerRef = ref<HTMLDivElement | null>(null);

// 规格分类与当前规格
const currentCategory = ref<PhotoSpecCategory>('common');
const selectedSpecId = ref<string>('one-inch');

// 自定义规格状态
const customSpec = reactive<CustomSpecConfig>({
  width: 25,
  height: 35,
  unit: 'mm',
  dpi: 300,
});

// 人像空间变换姿态
const transform = reactive<PortraitTransform>({
  x: 0,
  y: 0,
  scale: 1.0,
  rotation: 0,
});

// 合规参考线配置
const guidelines = reactive<GuidelineConfig>({
  showGuidelines: true,
  headTopRatio: 0.12,
  eyeLineRatio: 0.45,
  chinLineRatio: 0.75,
});

// 底色填充配置
const background = reactive<BackgroundConfig>({
  type: 'solid',
  color: '#FFFFFF',
  gradientStart: '#438EDB',
  gradientEnd: '#87CEEB',
});
const activeBgPresetId = ref<string>('white');

// 容差抠图配置
const matting = reactive<MattingConfig>({
  enabled: false,
  baseColor: { r: 255, g: 255, b: 255 },
  tolerance: 20,
  feather: 2,
  activeTool: 'none',
  brushSize: 25,
  brushHardness: 0.7,
});

// 手动修容画笔自定义蒙版修改层 (Uint8Array)
const customBrushMask = shallowRef<Uint8Array | null>(null);

// 目标文件大小压缩配置
const targetKb = reactive<TargetKbConfig>({
  enabled: false,
  targetKb: 50,
  allowDownscale: true,
});
const exportFormat = ref<ExportImageFormat>('image/jpeg');
const manualQuality = ref<number>(90);
const isCompressing = ref<boolean>(false);
const compressStatusMsg = ref<string>('');

// 冲印相纸设置
const printPaper = reactive<PrintPaperConfig>({
  paperType: '6-inch',
  orientation: 'landscape',
  gapMm: 2,
  marginMm: 3,
  showCutMarks: true,
  dpi: 300,
});

// 当前生效的物理尺寸与像素规格
const currentDimensions = computed(() => {
  if (currentCategory.value === 'custom') {
    return resolveCustomDimensions(customSpec);
  }
  const preset = getPhotoSpecById(selectedSpecId.value) || PHOTO_SPEC_PRESETS[0];
  return {
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    widthPx: preset.widthPx,
    heightPx: preset.heightPx,
    dpi: preset.dpi,
  };
});

// 冲印排版几何计算
const printLayout = computed(() => {
  const { widthPx, heightPx } = currentDimensions.value;
  return calculatePrintLayout(widthPx, heightPx, printPaper);
});

// 过滤后的规格预设列表
const filteredPresets = computed(() => {
  return PHOTO_SPEC_PRESETS.filter((item) => item.category === currentCategory.value);
});

// 拖拽与画笔交互状态
const isDragging = ref(false);
const lastMousePos = { x: 0, y: 0 };
const isPainting = ref(false);

/**
 * 处理文件上传
 */
function onFileUpload(file: File) {
  if (!file || !file.type.startsWith('image/')) {
    message.error('请上传有效的图片文件');
    return;
  }

  rawImageMime.value = file.type;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    rawImageElement.value = img;
    rawImageWidth.value = img.naturalWidth || img.width;
    rawImageHeight.value = img.naturalHeight || img.height;
    hasImage.value = true;
    customBrushMask.value = null;

    // 自动重置人像缩放比例使之适合规格
    resetPortraitTransform();

    // 默认提取四角采样色
    sampleCornersFromImage(img);

    nextTick(() => {
      renderSinglePhoto();
    });
  };
  img.onerror = () => {
    message.error('图片加载失败，请检查文件是否损坏');
  };
  img.src = url;
}

/**
 * 监听粘贴事件 (Ctrl+V)
 */
function handlePaste(event: ClipboardEvent) {
  if (!event.clipboardData || !event.clipboardData.items) return;
  const items = event.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile();
      if (file) {
        onFileUpload(file);
        message.success('已从剪贴板载入图片');
        break;
      }
    }
  }
}

/**
 * 采样四角颜色
 */
function sampleCornersFromImage(img: HTMLImageElement) {
  const offCanvas = document.createElement('canvas');
  offCanvas.width = img.naturalWidth || img.width;
  offCanvas.height = img.naturalHeight || img.height;
  const ctx = offCanvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
  const sampled = sampleImageCorners(imgData.data, offCanvas.width, offCanvas.height);
  matting.baseColor = sampled;
}

/**
 * 自动提取四角基准色操作
 */
function handleAutoSampleCorners() {
  if (!rawImageElement.value) return;
  sampleCornersFromImage(rawImageElement.value);
  customBrushMask.value = null;
  message.success('已自动采样四角背景颜色');
  renderSinglePhoto();
}

/**
 * 重置人像位移与旋转姿态
 */
function resetPortraitTransform() {
  if (!rawImageElement.value) return;
  const { widthPx, heightPx } = currentDimensions.value;
  const imgW = rawImageWidth.value;
  const imgH = rawImageHeight.value;

  // 计算等比填充缩放比
  const scale = Math.max(widthPx / imgW, heightPx / imgH);
  transform.scale = Number(scale.toFixed(2));
  transform.x = 0;
  transform.y = 0;
  transform.rotation = 0;
}

/**
 * 选择底色预设
 */
function selectBgPreset(preset: (typeof BACKGROUND_COLOR_PRESETS)[number]) {
  activeBgPresetId.value = preset.id;
  background.type = preset.type;
  if (preset.type === 'solid') {
    background.color = preset.color;
  } else if (preset.type === 'gradient') {
    background.gradientStart = preset.gradientStart;
    background.gradientEnd = preset.gradientEnd;
  }
  renderSinglePhoto();
}

/**
 * 核心渲染：生成单张证件照离屏 Canvas
 */
function createProcessedPhotoCanvas(overrideScaleFactor = 1.0): HTMLCanvasElement {
  const { widthPx: baseW, heightPx: baseH } = currentDimensions.value;
  const targetW = Math.max(10, Math.round(baseW * overrideScaleFactor));
  const targetH = Math.max(10, Math.round(baseH * overrideScaleFactor));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. 绘制背景底色
  if (background.type === 'solid' && background.color) {
    ctx.fillStyle = background.color;
    ctx.fillRect(0, 0, targetW, targetH);
  } else if (background.type === 'gradient' && background.gradientStart && background.gradientEnd) {
    const gradient = ctx.createLinearGradient(0, 0, 0, targetH);
    gradient.addColorStop(0, background.gradientStart);
    gradient.addColorStop(1, background.gradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, targetW, targetH);
  } else if (background.type === 'transparent') {
    ctx.clearRect(0, 0, targetW, targetH);
  }

  // 若无图片直接返回底板
  if (!rawImageElement.value) return canvas;

  // 2. 准备人像层
  const portraitCanvas = document.createElement('canvas');
  portraitCanvas.width = targetW;
  portraitCanvas.height = targetH;
  const pCtx = portraitCanvas.getContext('2d');
  if (!pCtx) return canvas;

  const img = rawImageElement.value;
  const imgW = rawImageWidth.value;
  const imgH = rawImageHeight.value;

  // 应用空间几何变换
  pCtx.save();
  pCtx.translate(targetW / 2 + transform.x * overrideScaleFactor, targetH / 2 + transform.y * overrideScaleFactor);
  pCtx.rotate((transform.rotation * Math.PI) / 180);
  pCtx.scale(transform.scale * overrideScaleFactor, transform.scale * overrideScaleFactor);
  pCtx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
  pCtx.restore();

  // 3. 处理色差容差抠图与画笔修容
  if (matting.enabled && matting.baseColor) {
    const pData = pCtx.getImageData(0, 0, targetW, targetH);
    // 生成基准容差蒙版
    let mask = generateToleranceMask(pData.data, targetW, targetH, matting.baseColor, matting.tolerance);

    // 叠加手动修容画笔修改层
    if (customBrushMask.value && customBrushMask.value.length === mask.length) {
      for (let i = 0; i < mask.length; i++) {
        mask[i] = customBrushMask.value[i];
      }
    }

    // 应用边缘平滑羽化
    if (matting.feather > 0) {
      mask = applyFeathering(mask, targetW, targetH, matting.feather);
    }

    // 覆写 Alpha 通道
    for (let i = 0; i < mask.length; i++) {
      pData.data[i * 4 + 3] = mask[i];
    }
    pCtx.putImageData(pData, 0, 0);
  }

  // 将人像层绘制于背景之上
  ctx.drawImage(portraitCanvas, 0, 0);

  return canvas;
}

/**
 * 渲染主预览视窗（包含合规参考线）
 */
function renderSinglePhoto() {
  const canvas = previewCanvasRef.value;
  if (!canvas) return;

  const { widthPx, heightPx } = currentDimensions.value;
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 获取处理后的真实照片
  const photoCanvas = createProcessedPhotoCanvas(1.0);
  ctx.clearRect(0, 0, widthPx, heightPx);
  ctx.drawImage(photoCanvas, 0, 0);

  // 绘制合规参考线网格
  if (guidelines.showGuidelines && hasImage.value) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const headY = Math.round(heightPx * guidelines.headTopRatio);
    const eyeY = Math.round(heightPx * guidelines.eyeLineRatio);
    const chinY = Math.round(heightPx * guidelines.chinLineRatio);
    const centerX = Math.round(widthPx / 2);

    // 垂直中心对齐线
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, heightPx);
    ctx.stroke();

    // 头顶参考线 (蓝色)
    ctx.strokeStyle = '#3B82F6';
    ctx.beginPath();
    ctx.moveTo(0, headY);
    ctx.lineTo(widthPx, headY);
    ctx.stroke();

    // 眼睛水平线 (绿色)
    ctx.strokeStyle = '#10B981';
    ctx.beginPath();
    ctx.moveTo(0, eyeY);
    ctx.lineTo(widthPx, eyeY);
    ctx.stroke();

    // 下巴基准线 (黄色)
    ctx.strokeStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(0, chinY);
    ctx.lineTo(widthPx, chinY);
    ctx.stroke();

    // 半身轮廓椭圆辅助框
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.beginPath();
    const faceRadiusX = widthPx * 0.28;
    const faceRadiusY = (chinY - headY) * 0.55;
    const faceCenterY = headY + (chinY - headY) * 0.5;
    ctx.ellipse(centerX, faceCenterY, faceRadiusX, faceRadiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 标注文字
    ctx.setLineDash([]);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 3;
    ctx.fillText('头顶线', 6, headY - 4);
    ctx.fillText('眼平线', 6, eyeY - 4);
    ctx.fillText('下巴线', 6, chinY - 4);

    ctx.restore();
  }
}

/**
 * 渲染冲印排版相纸视窗
 */
function renderPrintSheet() {
  const canvas = printCanvasRef.value;
  if (!canvas) return;

  const layout = printLayout.value;
  canvas.width = layout.paperWidthPx;
  canvas.height = layout.paperHeightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. 填充白底相纸
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, layout.paperWidthPx, layout.paperHeightPx);

  // 2. 生成单张无网格纯净证件照
  const photoCanvas = createProcessedPhotoCanvas(1.0);

  // 3. 遍历各阵列点位并绘制
  for (const item of layout.items) {
    ctx.drawImage(photoCanvas, item.x, item.y, item.width, item.height);
  }

  // 4. 绘制十字裁切虚线
  if (printPaper.showCutMarks && layout.cutLines.length > 0) {
    ctx.save();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    for (const line of layout.cutLines) {
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * 画布交互：鼠标按下
 */
function handleCanvasMouseDown(e: MouseEvent) {
  if (!hasImage.value || !previewCanvasRef.value) return;
  const rect = previewCanvasRef.value.getBoundingClientRect();
  const scaleX = previewCanvasRef.value.width / rect.width;
  const scaleY = previewCanvasRef.value.height / rect.height;
  const canvasX = (e.clientX - rect.left) * scaleX;
  const canvasY = (e.clientY - rect.top) * scaleY;

  // 吸管模式：拾取颜色
  if (matting.activeTool === 'eyedropper') {
    const ctx = previewCanvasRef.value.getContext('2d');
    if (ctx) {
      const pixel = ctx.getImageData(Math.round(canvasX), Math.round(canvasY), 1, 1).data;
      matting.baseColor = { r: pixel[0], g: pixel[1], b: pixel[2] };
      matting.activeTool = 'none';
      customBrushMask.value = null;
      message.success(`已吸取基准色: RGB(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`);
      renderSinglePhoto();
    }
    return;
  }

  // 画笔模式 (erase / restore)
  if (matting.activeTool === 'erase' || matting.activeTool === 'restore') {
    isPainting.value = true;
    applyBrushAt(canvasX, canvasY);
    return;
  }

  // 普通拖拽平移模式
  isDragging.value = true;
  lastMousePos.x = e.clientX;
  lastMousePos.y = e.clientY;
}

/**
 * 画布交互：鼠标移动
 */
function handleCanvasMouseMove(e: MouseEvent) {
  if (isPainting.value && previewCanvasRef.value) {
    const rect = previewCanvasRef.value.getBoundingClientRect();
    const scaleX = previewCanvasRef.value.width / rect.width;
    const scaleY = previewCanvasRef.value.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    applyBrushAt(canvasX, canvasY);
    return;
  }

  if (isDragging.value) {
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    lastMousePos.x = e.clientX;
    lastMousePos.y = e.clientY;

    transform.x += dx;
    transform.y += dy;
    renderSinglePhoto();
  }
}

/**
 * 画布交互：鼠标释放
 */
function handleCanvasMouseUp() {
  isDragging.value = false;
  isPainting.value = false;
}

/**
 * 画布滚轮缩放人像
 */
function handleCanvasWheel(e: WheelEvent) {
  if (!hasImage.value) return;
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  const newScale = Math.max(0.1, Math.min(5.0, transform.scale + delta));
  transform.scale = Number(newScale.toFixed(2));
  renderSinglePhoto();
}

/**
 * 局部画笔涂抹计算
 */
function applyBrushAt(x: number, y: number) {
  const { widthPx, heightPx } = currentDimensions.value;
  if (!customBrushMask.value) {
    // 初始化全量蒙版
    const pCanvas = document.createElement('canvas');
    pCanvas.width = widthPx;
    pCanvas.height = heightPx;
    const pCtx = pCanvas.getContext('2d');
    if (!pCtx || !rawImageElement.value || !matting.baseColor) return;

    pCtx.save();
    pCtx.translate(widthPx / 2 + transform.x, heightPx / 2 + transform.y);
    pCtx.rotate((transform.rotation * Math.PI) / 180);
    pCtx.scale(transform.scale, transform.scale);
    pCtx.drawImage(
      rawImageElement.value,
      -rawImageWidth.value / 2,
      -rawImageHeight.value / 2,
      rawImageWidth.value,
      rawImageHeight.value,
    );
    pCtx.restore();

    const pData = pCtx.getImageData(0, 0, widthPx, heightPx);
    customBrushMask.value = generateToleranceMask(
      pData.data,
      widthPx,
      heightPx,
      matting.baseColor,
      matting.tolerance,
    );
  }

  const mode = matting.activeTool === 'erase' ? 'erase' : 'restore';
  customBrushMask.value = applyBrushToMask(
    customBrushMask.value,
    widthPx,
    heightPx,
    x,
    y,
    matting.brushSize,
    matting.brushHardness,
    mode,
  );
  renderSinglePhoto();
}

/**
 * 重置修容画笔
 */
function handleClearBrushMask() {
  customBrushMask.value = null;
  message.info('已重置修容画笔修改记录');
  renderSinglePhoto();
}

/**
 * 单张证件照导出与精确 KB 压缩
 */
async function handleExportSinglePhoto() {
  if (!hasImage.value) {
    message.warning('请先上传人像照片');
    return;
  }

  isCompressing.value = true;
  compressStatusMsg.value = '';

  try {
    let finalCanvas = createProcessedPhotoCanvas(1.0);
    let finalQuality = manualQuality.value / 100;
    let format = exportFormat.value;

    if (targetKb.enabled) {
      // 开启目标体积二分逼近，推荐 JPEG/WebP
      if (format === 'image/png') {
        format = 'image/jpeg';
      }
      const targetBytes = targetKb.targetKb * 1024;

      // 评估函数
      const evaluateQuality = async (q: number) => {
        return new Promise<number>((resolve) => {
          finalCanvas.toBlob(
            (b) => {
              resolve(b ? b.size : 0);
            },
            format,
            q,
          );
        });
      };

      // 第一轮二分查找
      const result = await searchOptimalQuality(evaluateQuality, targetBytes, 0.05, 0.98, 8);
      finalQuality = result.quality;

      // 若最小画质仍超标且允许下采样
      if (result.finalBytes > targetBytes && targetKb.allowDownscale) {
        const factor = calculateDownscaleFactor(result.finalBytes, targetBytes);
        finalCanvas = createProcessedPhotoCanvas(factor);

        const reEvaluate = async (q: number) => {
          return new Promise<number>((resolve) => {
            finalCanvas.toBlob(
              (b) => {
                resolve(b ? b.size : 0);
              },
              format,
              q,
            );
          });
        };
        const downscaledResult = await searchOptimalQuality(reEvaluate, targetBytes, 0.05, 0.98, 8);
        finalQuality = downscaledResult.quality;
        compressStatusMsg.value = `已触发轻微等比下采样保护，实际 ${(downscaledResult.finalBytes / 1024).toFixed(1)} KB`;
      } else {
        compressStatusMsg.value = `已达成目标体积：实际 ${(result.finalBytes / 1024).toFixed(1)} KB (上限 ${targetKb.targetKb} KB)`;
      }
    }

    finalCanvas.toBlob(
      (blob) => {
        isCompressing.value = false;
        if (!blob) {
          message.error('生成图片失败');
          return;
        }

        const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg';
        const fileName = `id-photo-${currentDimensions.value.widthMm}x${currentDimensions.value.heightMm}mm-${Date.now()}.${ext}`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

        message.success(compressStatusMsg.value || '证件照下载成功');
      },
      format,
      finalQuality,
    );
  } catch (err) {
    isCompressing.value = false;
    message.error('导出时出现异常');
  }
}

/**
 * 复制单张照片至剪贴板
 */
async function handleCopyPhoto() {
  if (!hasImage.value) {
    message.warning('请先上传人像照片');
    return;
  }
  const canvas = createProcessedPhotoCanvas(1.0);
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      message.success('已成功将证件照复制至剪贴板');
    } catch {
      message.error('浏览器暂不支持直接复制图片到剪贴板，请使用下载');
    }
  }, 'image/png');
}

/**
 * 下载 300 DPI 冲印高清大图
 */
function handleDownloadPrintSheet() {
  if (!hasImage.value) {
    message.warning('请先上传人像照片');
    return;
  }

  const canvas = printCanvasRef.value;
  if (!canvas) return;

  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const fileName = `id-photo-print-sheet-${printPaper.paperType}-${printLayout.value.totalCount}pcs-${Date.now()}.jpg`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      message.success('冲印大图下载成功，可直接送印！');
    },
    'image/jpeg',
    0.98,
  );
}

// 监听参数变化重新渲染
watch(
  [
    currentCategory,
    selectedSpecId,
    () => customSpec.width,
    () => customSpec.height,
    () => customSpec.unit,
    () => customSpec.dpi,
    () => guidelines.showGuidelines,
    () => matting.enabled,
    () => matting.tolerance,
    () => matting.feather,
    () => background.type,
    () => background.color,
    () => background.gradientStart,
    () => background.gradientEnd,
  ],
  () => {
    if (activeTab.value === 'single') {
      renderSinglePhoto();
    } else {
      renderPrintSheet();
    }
  },
);

watch(activeTab, (tab) => {
  nextTick(() => {
    if (tab === 'single') {
      renderSinglePhoto();
    } else {
      renderPrintSheet();
    }
  });
});

watch(
  [
    () => printPaper.paperType,
    () => printPaper.orientation,
    () => printPaper.gapMm,
    () => printPaper.marginMm,
    () => printPaper.showCutMarks,
  ],
  () => {
    if (activeTab.value === 'print') {
      renderPrintSheet();
    }
  },
);

onMounted(() => {
  window.addEventListener('paste', handlePaste);
});

onUnmounted(() => {
  window.removeEventListener('paste', handlePaste);
});
</script>

<template>
  <div class="space-y-4">
    <!-- 头部未上传状态：拖拽上传卡片 -->
    <n-card v-if="!hasImage" class="rounded-xl border-base shadow-sm">
      <c-file-upload
        :title="t('tools.id-photo-maker.upload.title')"
        :button-text="t('tools.id-photo-maker.upload.browse')"
        accept="image/*"
        @file-upload="onFileUpload"
      />
      <div class="mt-3 text-center text-xs text-slate-400">
        {{ t('tools.id-photo-maker.upload.hint') }} · {{ t('tools.id-photo-maker.upload.pasteHint') }}
      </div>
    </n-card>

    <!-- 已上传状态：一体化双栏工作台 -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <!-- 左侧控制面板 (5 列，min-w-0 抗溢出) -->
      <div class="lg:col-span-5 min-w-0 space-y-4">
        <!-- 规格选择卡片 -->
        <n-card :title="t('tools.id-photo-maker.panels.specs')" size="small" class="rounded-xl shadow-sm border-base">
          <template #header-extra>
            <n-button text size="tiny" class="text-primary" @click="resetPortraitTransform">
              <template #icon>
                <n-icon :component="Refresh" />
              </template>
              {{ t('tools.id-photo-maker.guidelines.resetTransform') }}
            </n-button>
          </template>

          <!-- 规格分类切换 -->
          <n-radio-group v-model:value="currentCategory" size="small" class="w-full mb-3">
            <n-radio-button value="common" class="flex-1 text-center">
              {{ t('tools.id-photo-maker.categories.common') }}
            </n-radio-button>
            <n-radio-button value="exam" class="flex-1 text-center">
              {{ t('tools.id-photo-maker.categories.exam') }}
            </n-radio-button>
            <n-radio-button value="certificate" class="flex-1 text-center">
              {{ t('tools.id-photo-maker.categories.certificate') }}
            </n-radio-button>
            <n-radio-button value="custom" class="flex-1 text-center">
              {{ t('tools.id-photo-maker.categories.custom') }}
            </n-radio-button>
          </n-radio-group>

          <!-- 预设规格列表 -->
          <div v-if="currentCategory !== 'custom'" class="space-y-2">
            <n-select
              v-model:value="selectedSpecId"
              :options="
                filteredPresets.map((p) => ({
                  label: `${t(p.nameKey)} (${p.widthMm}×${p.heightMm}mm)`,
                  value: p.id,
                }))
              "
              size="small"
            />
            <div class="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
              <span>物理尺寸: <b>{{ currentDimensions.widthMm }}×{{ currentDimensions.heightMm }} mm</b></span>
              <span>像素: <b>{{ currentDimensions.widthPx }}×{{ currentDimensions.heightPx }} px</b> ({{ currentDimensions.dpi }} DPI)</span>
            </div>
          </div>

          <!-- 自定义规格输入 -->
          <div v-else class="space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <n-form-item :label="t('tools.id-photo-maker.custom.width')" size="small" :show-feedback="false">
                <n-input-number v-model:value="customSpec.width" :min="5" :max="5000" size="small" class="w-full" />
              </n-form-item>
              <n-form-item :label="t('tools.id-photo-maker.custom.height')" size="small" :show-feedback="false">
                <n-input-number v-model:value="customSpec.height" :min="5" :max="5000" size="small" class="w-full" />
              </n-form-item>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <n-form-item :label="t('tools.id-photo-maker.custom.unit')" size="small" :show-feedback="false">
                <n-radio-group v-model:value="customSpec.unit" size="small" class="w-full">
                  <n-radio-button value="mm" class="flex-1 text-center">mm</n-radio-button>
                  <n-radio-button value="px" class="flex-1 text-center">px</n-radio-button>
                </n-radio-group>
              </n-form-item>
              <n-form-item :label="t('tools.id-photo-maker.custom.dpi')" size="small" :show-feedback="false">
                <n-input-number v-model:value="customSpec.dpi" :min="72" :max="600" :step="50" size="small" class="w-full" />
              </n-form-item>
            </div>
          </div>
        </n-card>

        <!-- 底色与抠图面板 -->
        <n-card :title="t('tools.id-photo-maker.panels.background')" size="small" class="rounded-xl shadow-sm border-base">
          <!-- 预设底色快速切换色块 -->
          <div class="mb-3">
            <div class="text-xs text-slate-500 mb-1.5">{{ t('tools.id-photo-maker.bg.title') }}</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="preset in BACKGROUND_COLOR_PRESETS"
                :key="preset.id"
                class="px-2.5 py-1 text-xs rounded-md border transition-all flex items-center space-x-1"
                :class="
                  activeBgPresetId === preset.id
                    ? 'border-primary ring-2 ring-blue-500/20 font-medium'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                "
                @click="selectBgPreset(preset)"
              >
                <span
                  class="w-3.5 h-3.5 rounded-full inline-block border border-black/10"
                  :style="{
                    background:
                      preset.type === 'gradient'
                        ? `linear-gradient(to bottom, ${preset.gradientStart}, ${preset.gradientEnd})`
                        : preset.color || 'transparent',
                  }"
                />
                <span>{{ t(preset.nameKey) }}</span>
              </button>
            </div>
          </div>

          <!-- 自定义拾色器 -->
          <div class="flex items-center justify-between text-xs mb-3 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
            <span>{{ t('tools.id-photo-maker.bg.custom') }}</span>
            <n-color-picker
              v-model:value="background.color"
              size="small"
              :show-alpha="false"
              class="w-24"
              @update:value="
                () => {
                  background.type = 'solid';
                  activeBgPresetId = 'custom';
                  renderSinglePhoto();
                }
              "
            />
          </div>

          <n-divider class="my-2" />

          <!-- 色差容差抠图开关 -->
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium">{{ t('tools.id-photo-maker.bg.mattingEnable') }}</span>
            <n-switch v-model:value="matting.enabled" size="small" />
          </div>

          <!-- 抠图细节控制项 -->
          <div v-if="matting.enabled" class="space-y-3 pt-1">
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-500">{{ t('tools.id-photo-maker.bg.eyedropper') }}</span>
              <div class="flex items-center space-x-2">
                <span
                  class="w-5 h-5 rounded border inline-block"
                  :style="{
                    backgroundColor: matting.baseColor
                      ? `rgb(${matting.baseColor.r}, ${matting.baseColor.g}, ${matting.baseColor.b})`
                      : '#FFF',
                  }"
                />
                <n-button
                  size="tiny"
                  :type="matting.activeTool === 'eyedropper' ? 'primary' : 'default'"
                  @click="
                    matting.activeTool = matting.activeTool === 'eyedropper' ? 'none' : 'eyedropper'
                  "
                >
                  <template #icon>
                    <n-icon :component="ColorPickerIcon" />
                  </template>
                  {{ matting.activeTool === 'eyedropper' ? '点击画面取色' : '吸管' }}
                </n-button>
                <n-button size="tiny" @click="handleAutoSampleCorners">
                  四角采样
                </n-button>
              </div>
            </div>

            <!-- 容差滑块 -->
            <div>
              <div class="flex justify-between text-xs text-slate-500 mb-1">
                <span>{{ t('tools.id-photo-maker.bg.tolerance') }}</span>
                <span>{{ matting.tolerance }}</span>
              </div>
              <n-slider v-model:value="matting.tolerance" :min="1" :max="80" :step="1" />
            </div>

            <!-- 羽化滑块 -->
            <div>
              <div class="flex justify-between text-xs text-slate-500 mb-1">
                <span>{{ t('tools.id-photo-maker.bg.feather') }}</span>
                <span>{{ matting.feather }} px</span>
              </div>
              <n-slider v-model:value="matting.feather" :min="0" :max="8" :step="1" />
            </div>

            <!-- 修容画笔按钮组 -->
            <div>
              <div class="text-xs text-slate-500 mb-1.5">{{ t('tools.id-photo-maker.bg.brushTools') }}</div>
              <div class="flex space-x-2">
                <n-button
                  size="tiny"
                  class="flex-1"
                  :type="matting.activeTool === 'erase' ? 'primary' : 'default'"
                  @click="matting.activeTool = matting.activeTool === 'erase' ? 'none' : 'erase'"
                >
                  <template #icon>
                    <n-icon :component="Eraser" />
                  </template>
                  {{ t('tools.id-photo-maker.bg.eraseBrush') }}
                </n-button>
                <n-button
                  size="tiny"
                  class="flex-1"
                  :type="matting.activeTool === 'restore' ? 'primary' : 'default'"
                  @click="matting.activeTool = matting.activeTool === 'restore' ? 'none' : 'restore'"
                >
                  <template #icon>
                    <n-icon :component="Brush" />
                  </template>
                  {{ t('tools.id-photo-maker.bg.restoreBrush') }}
                </n-button>
                <n-button size="tiny" @click="handleClearBrushMask">
                  {{ t('tools.id-photo-maker.bg.clearMask') }}
                </n-button>
              </div>
            </div>
          </div>
        </n-card>

        <!-- 人像姿态与构图面板 -->
        <n-card :title="t('tools.id-photo-maker.panels.guidelines')" size="small" class="rounded-xl shadow-sm border-base">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs">{{ t('tools.id-photo-maker.guidelines.toggle') }}</span>
              <n-switch v-model:value="guidelines.showGuidelines" size="small" />
            </div>

            <div>
              <div class="flex justify-between text-xs text-slate-500 mb-1">
                <span>{{ t('tools.id-photo-maker.guidelines.zoom') }}</span>
                <span>{{ Math.round(transform.scale * 100) }}%</span>
              </div>
              <n-slider
                v-model:value="transform.scale"
                :min="0.2"
                :max="3.0"
                :step="0.02"
                @update:value="renderSinglePhoto"
              />
            </div>

            <div>
              <div class="flex justify-between text-xs text-slate-500 mb-1">
                <span>{{ t('tools.id-photo-maker.guidelines.rotate') }}</span>
                <span>{{ transform.rotation }}°</span>
              </div>
              <n-slider
                v-model:value="transform.rotation"
                :min="-45"
                :max="45"
                :step="1"
                @update:value="renderSinglePhoto"
              />
            </div>
          </div>
        </n-card>

        <!-- 冲印相纸设置面板 (仅冲印 Tab 显示) -->
        <n-card
          v-if="activeTab === 'print'"
          :title="t('tools.id-photo-maker.panels.printSettings')"
          size="small"
          class="rounded-xl shadow-sm border-base"
        >
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <n-form-item :label="t('tools.id-photo-maker.print.paperType')" size="small" :show-feedback="false">
                <n-select
                  v-model:value="printPaper.paperType"
                  size="small"
                  :options="[
                    { label: t('tools.id-photo-maker.print.fiveInch'), value: '5-inch' },
                    { label: t('tools.id-photo-maker.print.sixInch'), value: '6-inch' },
                  ]"
                />
              </n-form-item>
              <n-form-item :label="t('tools.id-photo-maker.print.orientation')" size="small" :show-feedback="false">
                <n-radio-group v-model:value="printPaper.orientation" size="small" class="w-full">
                  <n-radio-button value="landscape" class="flex-1 text-center">横向</n-radio-button>
                  <n-radio-button value="portrait" class="flex-1 text-center">纵向</n-radio-button>
                </n-radio-group>
              </n-form-item>
            </div>

            <div class="flex items-center justify-between text-xs">
              <span>{{ t('tools.id-photo-maker.print.cutMarks') }}</span>
              <n-switch v-model:value="printPaper.showCutMarks" size="small" />
            </div>

            <div class="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 text-xs text-primary flex items-center justify-between">
              <span>{{ t('tools.id-photo-maker.print.totalCount') }}</span>
              <b class="text-sm font-bold">{{ printLayout.totalCount }} {{ t('tools.id-photo-maker.print.unitCount') }} ({{ printLayout.rows }}行 × {{ printLayout.cols }}列)</b>
            </div>
          </div>
        </n-card>

        <!-- 导出与体积压缩卡片 (单张 Tab 显示) -->
        <n-card
          v-if="activeTab === 'single'"
          :title="t('tools.id-photo-maker.panels.export')"
          size="small"
          class="rounded-xl shadow-sm border-base"
        >
          <div class="space-y-3">
            <!-- 目标体积限制开关 -->
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium">{{ t('tools.id-photo-maker.compress.enable') }}</span>
              <n-switch v-model:value="targetKb.enabled" size="small" />
            </div>

            <div v-if="targetKb.enabled" class="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-600 dark:text-slate-300">{{ t('tools.id-photo-maker.compress.targetKb') }}</span>
                <n-input-number v-model:value="targetKb.targetKb" :min="10" :max="1024" size="small" class="w-28" />
              </div>
              <div class="flex items-center justify-between pt-1">
                <span class="text-xs text-slate-500">{{ t('tools.id-photo-maker.compress.downscale') }}</span>
                <n-switch v-model:value="targetKb.allowDownscale" size="small" />
              </div>
            </div>

            <div v-else class="grid grid-cols-2 gap-2">
              <n-form-item :label="t('tools.id-photo-maker.compress.format')" size="small" :show-feedback="false">
                <n-select
                  v-model:value="exportFormat"
                  size="small"
                  :options="[
                    { label: 'JPG', value: 'image/jpeg' },
                    { label: 'PNG (无损)', value: 'image/png' },
                    { label: 'WebP', value: 'image/webp' },
                  ]"
                />
              </n-form-item>
              <n-form-item :label="t('tools.id-photo-maker.compress.quality')" size="small" :show-feedback="false">
                <n-slider v-model:value="manualQuality" :min="10" :max="100" size="small" />
              </n-form-item>
            </div>
          </div>
        </n-card>
      </div>

      <!-- 右侧主预览与视窗展示区 (7 列，min-w-0 抗溢出) -->
      <div class="lg:col-span-7 min-w-0 space-y-4">
        <!-- 视窗切换 Tab 栏 -->
        <div class="flex items-center justify-between bg-surface p-1 rounded-xl border border-base">
          <n-tabs v-model:value="activeTab" type="segment" size="small" class="w-64">
            <n-tab-pane name="single" :tab="t('tools.id-photo-maker.tabs.single')">
              <template #tab>
                <div class="flex items-center space-x-1">
                  <n-icon :component="Id" />
                  <span>{{ t('tools.id-photo-maker.tabs.single') }}</span>
                </div>
              </template>
            </n-tab-pane>
            <n-tab-pane name="print" :tab="t('tools.id-photo-maker.tabs.print')">
              <template #tab>
                <div class="flex items-center space-x-1">
                  <n-icon :component="Printer" />
                  <span>{{ t('tools.id-photo-maker.tabs.print') }}</span>
                </div>
              </template>
            </n-tab-pane>
          </n-tabs>

          <c-file-upload
            custom-button
            accept="image/*"
            @file-upload="onFileUpload"
          >
            <template #button>
              <n-button size="tiny" tertiary>
                <template #icon>
                  <n-icon :component="Upload" />
                </template>
                {{ t('tools.id-photo-maker.upload.changePhoto') }}
              </n-button>
            </template>
          </c-file-upload>
        </div>

        <!-- 主视窗渲染卡片 -->
        <n-card class="rounded-xl border-base shadow-sm overflow-hidden" content-style="padding: 16px;">
          <!-- 单张证件照模式视窗 -->
          <div
            v-show="activeTab === 'single'"
            ref="canvasContainerRef"
            class="flex flex-col items-center justify-center min-h-[420px] bg-slate-100 dark:bg-slate-900/60 rounded-xl p-4 relative select-none overflow-hidden"
          >
            <canvas
              ref="previewCanvasRef"
              class="max-h-[460px] max-w-full shadow-lg rounded-sm cursor-grab active:cursor-grabbing border border-black/10"
              @mousedown="handleCanvasMouseDown"
              @mousemove="handleCanvasMouseMove"
              @mouseup="handleCanvasMouseUp"
              @mouseleave="handleCanvasMouseUp"
              @wheel="handleCanvasWheel"
            />
            <div class="mt-2 text-xs text-slate-400 flex items-center space-x-1">
              <n-icon :component="Scan" size="14" />
              <span>{{ t('tools.id-photo-maker.actions.dragHint') }}</span>
            </div>
          </div>

          <!-- 冲印相纸模式视窗 -->
          <div
            v-show="activeTab === 'print'"
            class="flex flex-col items-center justify-center min-h-[420px] bg-slate-100 dark:bg-slate-900/60 rounded-xl p-4 relative overflow-auto"
          >
            <canvas
              ref="printCanvasRef"
              class="max-h-[460px] max-w-full shadow-lg rounded-sm border border-slate-300 dark:border-slate-700"
            />
          </div>

          <!-- 操作按钮组 (居中对齐规范) -->
          <div class="mt-4 flex flex-wrap items-center justify-center gap-3">
            <template v-if="activeTab === 'single'">
              <n-button
                type="primary"
                size="medium"
                :loading="isCompressing"
                class="px-6"
                @click="handleExportSinglePhoto"
              >
                <template #icon>
                  <n-icon :component="Download" />
                </template>
                {{ t('tools.id-photo-maker.actions.downloadSingle') }}
              </n-button>
              <n-button size="medium" secondary @click="handleCopyPhoto">
                <template #icon>
                  <n-icon :component="Copy" />
                </template>
                {{ t('tools.id-photo-maker.actions.copyImage') }}
              </n-button>
            </template>

            <template v-else>
              <n-button
                type="primary"
                size="medium"
                class="px-6"
                @click="handleDownloadPrintSheet"
              >
                <template #icon>
                  <n-icon :component="Printer" />
                </template>
                {{ t('tools.id-photo-maker.print.downloadSheet') }}
              </n-button>
            </template>
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 保证画布文字抗锯齿与拖拽不触发浏览器默认选区 */
canvas {
  touch-action: none;
  image-rendering: -webkit-optimize-contrast;
}
</style>
