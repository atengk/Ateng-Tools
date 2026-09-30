/**
 * Image Studio (图片处理工作台) 纯函数业务服务
 *
 * @author Ateng
 * @since 2026-09-30
 */
import {
  type ExportImageFormat,
  MAX_SAFE_IMAGE_DIMENSION,
  MIN_SAFE_IMAGE_DIMENSION,
  type StudioWatermarkConfig,
  type WatermarkAnchor,
} from './image-studio.types';

/**
 * 将像素尺寸限制在 [1, 8192] 安全取值范围内并四舍五入取整
 *
 * @param dim 输入像素尺寸
 * @returns 安全区间内的整数尺寸
 */
export function clampDimension(dim: number): number {
  if (isNaN(dim) || !isFinite(dim)) {
    return MIN_SAFE_IMAGE_DIMENSION;
  }
  const rounded = Math.round(dim);
  return Math.max(MIN_SAFE_IMAGE_DIMENSION, Math.min(MAX_SAFE_IMAGE_DIMENSION, rounded));
}

/**
 * 基于给定宽度和宽高比，计算等比缩放后的完整宽高
 *
 * @param newWidth 目标宽度
 * @param aspectRatio 原始宽高比 (width / height)
 * @returns 规范化后的目标尺寸对象
 */
export function calculateDimensionsByWidth(
  newWidth: number,
  aspectRatio: number,
): { width: number; height: number } {
  const safeWidth = clampDimension(newWidth);
  const ratio = aspectRatio > 0 ? aspectRatio : 1;
  const safeHeight = clampDimension(safeWidth / ratio);
  return {
    width: safeWidth,
    height: safeHeight,
  };
}

/**
 * 基于给定高度和宽高比，计算等比缩放后的完整宽高
 *
 * @param newHeight 目标高度
 * @param aspectRatio 原始宽高比 (width / height)
 * @returns 规范化后的目标尺寸对象
 */
export function calculateDimensionsByHeight(
  newHeight: number,
  aspectRatio: number,
): { width: number; height: number } {
  const safeHeight = clampDimension(newHeight);
  const ratio = aspectRatio > 0 ? aspectRatio : 1;
  const safeWidth = clampDimension(safeHeight * ratio);
  return {
    width: safeWidth,
    height: safeHeight,
  };
}

/**
 * 基于百分比进行尺寸缩放
 *
 * @param origWidth 原始宽度
 * @param origHeight 原始高度
 * @param percent 缩放百分比 (例如 50 表示 50%)
 * @returns 缩放后的像素尺寸对象
 */
export function calculateDimensionsByPercentage(
  origWidth: number,
  origHeight: number,
  percent: number,
): { width: number; height: number } {
  const scale = Math.max(0.01, percent / 100);
  return {
    width: clampDimension(origWidth * scale),
    height: clampDimension(origHeight * scale),
  };
}

/**
 * 获取图片格式的标准扩展名 (不含点)
 *
 * @param format MIME 格式
 * @returns 标准扩展名
 */
export function getFormatExtension(format: ExportImageFormat): string {
  switch (format) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'png';
  }
}

/**
 * 生成导出文件名
 *
 * @param originalName 原始文件名
 * @param format 目标导出格式
 * @param suffix 自定义后缀名，默认 'resized'
 * @returns 带有新扩展名的完整导出文件名
 */
export function generateExportFileName(
  originalName: string,
  format: ExportImageFormat,
  suffix = 'resized',
): string {
  const ext = getFormatExtension(format);
  const baseName = (originalName || 'image').replace(/\.[^/.]+$/, '').trim() || 'image';
  return `${baseName}_${suffix}.${ext}`;
}

/**
 * 离屏渲染目标图像到全新尺寸的 Canvas 画布
 *
 * @param sourceImg 源图像 (HTMLImageElement 或 HTMLCanvasElement)
 * @param targetWidth 目标输出宽度
 * @param targetHeight 目标输出高度
 * @returns 渲染完成的 HTMLCanvasElement
 */
export function renderToCanvas(
  sourceImg: CanvasImageSource,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  if (typeof document === 'undefined' || !document.createElement) {
    throw new Error('Canvas 仅在支持 DOM 的浏览器环境中可用');
  }

  const canvas = document.createElement('canvas');
  canvas.width = clampDimension(targetWidth);
  canvas.height = clampDimension(targetHeight);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法初始化 Canvas 2D 绘图上下文');
  }

  // 启用高质量图像平滑缩放
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(sourceImg, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * 将 Canvas 画布导出为对应格式与画质的二进制 Blob
 *
 * @param canvas 画布元素
 * @param format 目标格式 (image/png, image/jpeg, image/webp)
 * @param quality 压缩质量 (0.01 - 1.0)
 * @returns 二进制 Blob
 */
export async function exportCanvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportImageFormat,
  quality = 0.92,
): Promise<Blob> {
  const safeQuality = Math.max(0.01, Math.min(1.0, quality));

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        }
        else {
          reject(new Error('Canvas 导出 Blob 失败'));
        }
      },
      format,
      safeQuality,
    );
  });
}

/**
 * 从 Blob 或 DataURL 异步加载 HTMLImageElement 图像实体
 *
 * @param src 数据源 (Blob 对象或字符串 URL)
 * @returns 异步加载完成的 HTMLImageElement
 */
export function loadImageFromBlobOrDataUrl(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Image 加载仅在支持 DOM 的浏览器环境中可用'));
      return;
    }

    const img = new Image();
    let objectUrl = '';

    img.onload = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      resolve(img);
    };

    img.onerror = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(new Error('图片加载解析失败，请检查文件格式是否有效'));
    };

    if (typeof src === 'string') {
      img.src = src;
    }
    else {
      objectUrl = URL.createObjectURL(src);
      img.src = objectUrl;
    }
  });
}

/**
 * 将 SVG 源码字符串光栅化为 HTMLImageElement
 *
 * @param svgText SVG XML 文本内容
 * @returns 异步光栅化后的 Image 元素
 */
export function rasterizeSvgText(svgText: string): Promise<HTMLImageElement> {
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  return loadImageFromBlobOrDataUrl(blob);
}

/**
 * 将旋转角度规范化为 [0, 90, 180, 270] 标准象限角度
 *
 * @param angle 输入角度 (度)
 * @returns 0, 90, 180 或 270
 */
export function normalizeRotationAngle(angle: number): number {
  return ((Math.round(angle) % 360) + 360) % 360;
}

/**
 * 根据旋转角度计算旋转后的实际画面宽高
 *
 * @param width 原始宽度
 * @param height 原始高度
 * @param rotation 旋转角度 (0, 90, 180, 270)
 * @returns 变换后的画面像素宽高
 */
export function calculateTransformedDimensions(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const normalized = normalizeRotationAngle(rotation);
  if (normalized === 90 || normalized === 270) {
    return {
      width: clampDimension(height),
      height: clampDimension(width),
    };
  }
  return {
    width: clampDimension(width),
    height: clampDimension(height),
  };
}

/**
 * 将裁剪选区约束在目标边界内部并确保不小于 1px
 *
 * @param crop 原始裁剪区域
 * @param maxWidth 最大边界宽度
 * @param maxHeight 最大边界高度
 * @returns 安全受控的裁剪区域
 */
export function clampCropRegion(
  crop: { x: number; y: number; width: number; height: number },
  maxWidth: number,
  maxHeight: number,
): { x: number; y: number; width: number; height: number } {
  const safeMaxWidth = Math.max(1, maxWidth);
  const safeMaxHeight = Math.max(1, maxHeight);

  const x = Math.max(0, Math.min(safeMaxWidth - 1, Math.round(crop.x)));
  const y = Math.max(0, Math.min(safeMaxHeight - 1, Math.round(crop.y)));

  const remainingW = safeMaxWidth - x;
  const remainingH = safeMaxHeight - y;

  const width = Math.max(1, Math.min(remainingW, Math.round(crop.width)));
  const height = Math.max(1, Math.min(remainingH, Math.round(crop.height)));

  return { x, y, width, height };
}

/**
 * 解析裁剪比例预设为浮点数值
 *
 * @param ratio 预设比例枚举
 * @returns 比例浮点数 (width / height)，若为 free 则返回 null
 */
export function getAspectRatioValue(ratio: string): number | null {
  switch (ratio) {
    case '1:1':
      return 1.0;
    case '16:9':
      return 16 / 9;
    case '4:3':
      return 4 / 3;
    case '3:2':
      return 3 / 2;
    case '2:1':
      return 2.0;
    default:
      return null;
  }
}

/**
 * 综合非破坏性渲染管线：依次应用裁剪、旋转/镜像几何变换及目标尺寸缩放
 *
 * @param sourceImg 源图像实体 (HTMLImageElement / HTMLCanvasElement)
 * @param options 综合渲染管线参数
 * @returns 渲染生成的最终 Canvas 元素
 */
export function renderImagePipeline(
  sourceImg: CanvasImageSource,
  options: {
    crop?: { x: number; y: number; width: number; height: number };
    transform?: { rotation: number; flipHorizontal: boolean; flipVertical: boolean };
    targetWidth?: number;
    targetHeight?: number;
  } = {},
): HTMLCanvasElement {
  if (typeof document === 'undefined' || !document.createElement) {
    throw new Error('Canvas 仅在支持 DOM 的浏览器环境中可用');
  }

  // 1. 获取源图像真实像素尺寸
  let srcW = 0;
  let srcH = 0;
  if ('naturalWidth' in sourceImg && typeof sourceImg.naturalWidth === 'number') {
    srcW = sourceImg.naturalWidth || (sourceImg as any).width;
    srcH = sourceImg.naturalHeight || (sourceImg as any).height;
  }
  else {
    srcW = (sourceImg as any).width;
    srcH = (sourceImg as any).height;
  }

  srcW = clampDimension(srcW);
  srcH = clampDimension(srcH);

  // 2. 阶段一：裁剪截取
  let clippedCanvas: HTMLCanvasElement;
  if (options.crop) {
    const safeCrop = clampCropRegion(options.crop, srcW, srcH);
    clippedCanvas = document.createElement('canvas');
    clippedCanvas.width = safeCrop.width;
    clippedCanvas.height = safeCrop.height;

    const cropCtx = clippedCanvas.getContext('2d');
    if (!cropCtx) {
      throw new Error('裁剪画布初始化失败');
    }

    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = 'high';
    cropCtx.drawImage(
      sourceImg,
      safeCrop.x,
      safeCrop.y,
      safeCrop.width,
      safeCrop.height,
      0,
      0,
      safeCrop.width,
      safeCrop.height,
    );
  }
  else {
    clippedCanvas = document.createElement('canvas');
    clippedCanvas.width = srcW;
    clippedCanvas.height = srcH;
    const ctx = clippedCanvas.getContext('2d');
    ctx?.drawImage(sourceImg, 0, 0, srcW, srcH);
  }

  // 3. 阶段二：几何旋转与镜像变换
  const rotation = normalizeRotationAngle(options.transform?.rotation ?? 0);
  const flipH = Boolean(options.transform?.flipHorizontal);
  const flipV = Boolean(options.transform?.flipVertical);

  const transformedDims = calculateTransformedDimensions(
    clippedCanvas.width,
    clippedCanvas.height,
    rotation,
  );

  const transformedCanvas = document.createElement('canvas');
  transformedCanvas.width = transformedDims.width;
  transformedCanvas.height = transformedDims.height;

  const transCtx = transformedCanvas.getContext('2d');
  if (!transCtx) {
    throw new Error('几何变换画布初始化失败');
  }

  transCtx.imageSmoothingEnabled = true;
  transCtx.imageSmoothingQuality = 'high';

  transCtx.save();
  transCtx.translate(transformedCanvas.width / 2, transformedCanvas.height / 2);
  transCtx.rotate((rotation * Math.PI) / 180);
  transCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  transCtx.drawImage(
    clippedCanvas,
    -clippedCanvas.width / 2,
    -clippedCanvas.height / 2,
    clippedCanvas.width,
    clippedCanvas.height,
  );
  transCtx.restore();

  // 4. 阶段三：最终目标缩放
  const finalW = options.targetWidth ? clampDimension(options.targetWidth) : transformedCanvas.width;
  const finalH = options.targetHeight ? clampDimension(options.targetHeight) : transformedCanvas.height;

  let finalCanvas: HTMLCanvasElement;
  if (finalW === transformedCanvas.width && finalH === transformedCanvas.height) {
    finalCanvas = transformedCanvas;
  }
  else {
    finalCanvas = document.createElement('canvas');
    finalCanvas.width = finalW;
    finalCanvas.height = finalH;

    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) {
      throw new Error('最终缩放画布初始化失败');
    }

    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(transformedCanvas, 0, 0, finalW, finalH);
  }

  // 5. 阶段四：叠加图文水印
  if (options.watermark && options.watermark.enabled) {
    applyWatermarkToCanvas(finalCanvas, options.watermark, options.loadedLogoImage);
  }

  return finalCanvas;
}

/**
 * 根据九宫格锚点计算水印元素左上角 (x, y) 目标坐标
 *
 * @param canvasW 画布宽度
 * @param canvasH 画布高度
 * @param itemW 水印内容宽度
 * @param itemH 水印内容高度
 * @param anchor 九宫格锚点位置
 * @param margin 距离画布边缘的最小安全边距 (默认 20px)
 * @returns 水印左上角坐标 { x, y }
 */
export function calculateAnchorPosition(
  canvasW: number,
  canvasH: number,
  itemW: number,
  itemH: number,
  anchor: WatermarkAnchor,
  margin = 20,
): { x: number; y: number } {
  const safeMargin = Math.max(0, margin);

  let x = 0;
  let y = 0;

  // 1. 水平 X 轴锚点计算
  if (anchor === 'top-left' || anchor === 'middle-left' || anchor === 'bottom-left') {
    x = safeMargin;
  }
  else if (anchor === 'top-center' || anchor === 'center' || anchor === 'bottom-center') {
    x = Math.round((canvasW - itemW) / 2);
  }
  else {
    // right
    x = Math.round(canvasW - itemW - safeMargin);
  }

  // 2. 垂直 Y 轴锚点计算
  if (anchor === 'top-left' || anchor === 'top-center' || anchor === 'top-right') {
    y = safeMargin;
  }
  else if (anchor === 'middle-left' || anchor === 'center' || anchor === 'middle-right') {
    y = Math.round((canvasH - itemH) / 2);
  }
  else {
    // bottom
    y = Math.round(canvasH - itemH - safeMargin);
  }

  return { x, y };
}

/**
 * 在目标 Canvas 画布上叠加绘制图文水印
 *
 * @param canvas 目标绘制画布
 * @param watermark 水印配置项
 * @param loadedLogoImg 预先加载好的图片水印 DOM 元素 (可选)
 */
export function applyWatermarkToCanvas(
  canvas: HTMLCanvasElement,
  watermark: StudioWatermarkConfig,
  loadedLogoImg?: HTMLImageElement | null,
): void {
  if (!watermark.enabled || watermark.mode === 'none') {
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const canvasW = canvas.width;
  const canvasH = canvas.height;

  if (watermark.mode === 'text') {
    const cfg = watermark.text;
    const text = cfg.text?.trim();
    if (!text) return;

    const fontSize = Math.max(10, cfg.fontSize || 28);
    const opacity = Math.max(0.01, Math.min(1.0, cfg.opacity ?? 0.3));
    const rotationRad = ((cfg.rotation ?? -45) * Math.PI) / 180;
    const color = cfg.color || '#999999';

    ctx.save();
    ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (cfg.isTiled) {
      // 全屏倾斜平铺防盗阵列
      const textMetrics = ctx.measureText(text);
      const textW = textMetrics.width;
      const stepX = Math.max(80, textW + (cfg.tileGapX || 120));
      const stepY = Math.max(60, fontSize + (cfg.tileGapY || 100));

      const bound = Math.max(canvasW, canvasH) * 1.5;
      let rowIndex = 0;

      for (let y = -bound; y < canvasH + bound; y += stepY) {
        const rowOffsetX = (rowIndex % 2 === 1) ? stepX / 2 : 0;
        for (let x = -bound + rowOffsetX; x < canvasW + bound; x += stepX) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotationRad);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
        rowIndex++;
      }
    }
    else {
      // 九宫格单点停靠
      const textMetrics = ctx.measureText(text);
      const textW = textMetrics.width;
      const textH = fontSize;

      const pos = calculateAnchorPosition(
        canvasW,
        canvasH,
        textW,
        textH,
        cfg.anchor || 'bottom-right',
        cfg.margin ?? 24,
      );

      ctx.save();
      // 平移到文本中心
      ctx.translate(pos.x + textW / 2, pos.y + textH / 2);
      ctx.rotate(rotationRad);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
  else if (watermark.mode === 'image' && loadedLogoImg) {
    const cfg = watermark.image;
    const logoW = loadedLogoImg.naturalWidth || loadedLogoImg.width;
    const logoH = loadedLogoImg.naturalHeight || loadedLogoImg.height;
    if (logoW <= 0 || logoH <= 0) return;

    const scale = Math.max(0.02, Math.min(2.0, cfg.scale || 0.3));
    const targetLogoW = Math.round(logoW * scale);
    const targetLogoH = Math.round(logoH * scale);
    const opacity = Math.max(0.01, Math.min(1.0, cfg.opacity ?? 0.5));
    const rotationRad = ((cfg.rotation ?? 0) * Math.PI) / 180;

    ctx.save();
    ctx.globalAlpha = opacity;

    if (cfg.isTiled) {
      const stepX = Math.max(60, targetLogoW + (cfg.tileGap || 140));
      const stepY = Math.max(60, targetLogoH + (cfg.tileGap || 140));
      const bound = Math.max(canvasW, canvasH) * 1.5;

      for (let y = -bound; y < canvasH + bound; y += stepY) {
        for (let x = -bound; x < canvasW + bound; x += stepX) {
          ctx.save();
          ctx.translate(x + targetLogoW / 2, y + targetLogoH / 2);
          ctx.rotate(rotationRad);
          ctx.drawImage(loadedLogoImg, -targetLogoW / 2, -targetLogoH / 2, targetLogoW, targetLogoH);
          ctx.restore();
        }
      }
    }
    else {
      const pos = calculateAnchorPosition(
        canvasW,
        canvasH,
        targetLogoW,
        targetLogoH,
        cfg.anchor || 'bottom-right',
        cfg.margin ?? 24,
      );

      ctx.save();
      ctx.translate(pos.x + targetLogoW / 2, pos.y + targetLogoH / 2);
      ctx.rotate(rotationRad);
      ctx.drawImage(loadedLogoImg, -targetLogoW / 2, -targetLogoH / 2, targetLogoW, targetLogoH);
      ctx.restore();
    }
    ctx.restore();
  }
}


