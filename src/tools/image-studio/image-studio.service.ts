/**
 * Image Studio (图片处理工作台) 纯函数业务服务
 *
 * @author Ateng
 * @since 2026-09-30
 */
import {
  type DimensionPreset,
  type ExifGpsInfo,
  type ExifMetadata,
  type ExportImageFormat,
  MAX_SAFE_IMAGE_DIMENSION,
  MIN_SAFE_IMAGE_DIMENSION,
  type PaletteColor,
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
    case 'image/x-icon':
      return 'ico';
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
  if (format === 'image/x-icon') {
    return generateIcoBlob(canvas);
  }

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

  // 4.1 背景底色填充 (若设置了非透明纯色底，防止透明转 JPEG 产生黑色暗边或按需着色)
  if (options.backgroundColor && options.backgroundColor !== 'transparent') {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = finalCanvas.width;
    bgCanvas.height = finalCanvas.height;
    const bgCtx = bgCanvas.getContext('2d');
    if (bgCtx) {
      bgCtx.fillStyle = options.backgroundColor;
      bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      bgCtx.drawImage(finalCanvas, 0, 0);
      finalCanvas = bgCanvas;
    }
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

/**
 * 健壮的二进制数据安全读取包装器 (防止越界崩溃)
 */
class SafeBinaryReader {
  private view: DataView;
  public littleEndian = false;
  public byteLength: number;

  constructor(buffer: ArrayBuffer | Uint8Array) {
    if (buffer instanceof Uint8Array) {
      this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
    else {
      this.view = new DataView(buffer);
    }
    this.byteLength = this.view.byteLength;
  }

  getUint8(offset: number): number {
    if (offset < 0 || offset + 1 > this.byteLength) return 0;
    return this.view.getUint8(offset);
  }

  getUint16(offset: number, littleEndian = this.littleEndian): number {
    if (offset < 0 || offset + 2 > this.byteLength) return 0;
    return this.view.getUint16(offset, littleEndian);
  }

  getUint32(offset: number, littleEndian = this.littleEndian): number {
    if (offset < 0 || offset + 4 > this.byteLength) return 0;
    return this.view.getUint32(offset, littleEndian);
  }

  getString(offset: number, length: number): string {
    if (offset < 0 || length <= 0 || offset >= this.byteLength) return '';
    const safeLen = Math.min(length, this.byteLength - offset);
    let str = '';
    for (let i = 0; i < safeLen; i++) {
      const code = this.view.getUint8(offset + i);
      if (code === 0) break;
      str += String.fromCharCode(code);
    }
    return str.trim();
  }
}

/**
 * 纯客户端二进制零依赖解析图片中的 EXIF 拍摄与 GPS 隐私元数据
 *
 * @param buffer 图片文件二进制 ArrayBuffer 或 Uint8Array
 * @returns 结构化的 ExifMetadata
 */
export function parseExifMetadata(buffer: ArrayBuffer | Uint8Array): ExifMetadata {
  const emptyResult: ExifMetadata = { hasData: false };

  try {
    const reader = new SafeBinaryReader(buffer);
    if (reader.byteLength < 14) {
      return emptyResult;
    }

    let tiffStart = -1;

    // 1. 检查是否为 JPEG (0xFF 0xD8)
    if (reader.getUint8(0) === 0xFF && reader.getUint8(1) === 0xD8) {
      let offset = 2;
      while (offset < reader.byteLength - 4) {
        if (reader.getUint8(offset) !== 0xFF) {
          offset++;
          continue;
        }

        const marker = reader.getUint8(offset + 1);

        // APP1 (0xFFE1) 包含 EXIF 元数据
        if (marker === 0xE1) {
          const segLength = reader.getUint16(offset + 2, false);
          // 检查 Exif 头部特征字符串 "Exif\0\0" (0x45 0x78 0x69 0x66 0x00 0x00)
          if (
            reader.getUint8(offset + 4) === 0x45
            && reader.getUint8(offset + 5) === 0x78
            && reader.getUint8(offset + 6) === 0x69
            && reader.getUint8(offset + 7) === 0x66
            && reader.getUint8(offset + 8) === 0x00
            && reader.getUint8(offset + 9) === 0x00
          ) {
            tiffStart = offset + 10;
            break;
          }
          offset += 2 + segLength;
        }
        else if (marker === 0xDA || marker === 0xD9) {
          // SOS (Start of Scan) 或 EOI (End of Image)，停止段扫描
          break;
        }
        else {
          const segLength = reader.getUint16(offset + 2, false);
          if (segLength < 2) break;
          offset += 2 + segLength;
        }
      }
    }
    // 2. 检查是否直接为 TIFF 格式头部
    else if (
      (reader.getUint8(0) === 0x49 && reader.getUint8(1) === 0x49)
      || (reader.getUint8(0) === 0x4D && reader.getUint8(1) === 0x4D)
    ) {
      tiffStart = 0;
    }

    if (tiffStart === -1 || tiffStart + 8 > reader.byteLength) {
      return emptyResult;
    }

    // 3. 解析 TIFF Header 确定字节序 (II = Little Endian, MM = Big Endian)
    const byteOrder = (reader.getUint8(tiffStart) << 8) | reader.getUint8(tiffStart + 1);
    if (byteOrder === 0x4949) {
      reader.littleEndian = true;
    }
    else if (byteOrder === 0x4D4D) {
      reader.littleEndian = false;
    }
    else {
      return emptyResult;
    }

    // 固定魔数 42
    if (reader.getUint16(tiffStart + 2) !== 42) {
      return emptyResult;
    }

    const firstIfdOffset = reader.getUint32(tiffStart + 4);
    if (firstIfdOffset <= 0 || tiffStart + firstIfdOffset >= reader.byteLength) {
      return emptyResult;
    }

    const result: ExifMetadata = { hasData: false };

    // 读取单个 Tag 值的通用函数
    const readTagValue = (entryOffset: number): any => {
      const type = reader.getUint16(entryOffset + 2);
      const count = reader.getUint32(entryOffset + 4);
      const rawValueOrOffset = reader.getUint32(entryOffset + 8);

      // Type 2: ASCII 字符串
      if (type === 2) {
        const strOffset = count <= 4 ? entryOffset + 8 : tiffStart + rawValueOrOffset;
        return reader.getString(strOffset, count);
      }
      // Type 3: SHORT (2 字节无符号整数)
      if (type === 3) {
        return reader.getUint16(entryOffset + 8);
      }
      // Type 4: LONG (4 字节无符号整数)
      if (type === 4) {
        return rawValueOrOffset;
      }
      // Type 5: RATIONAL (分子 / 分母)
      if (type === 5) {
        const valOffset = tiffStart + rawValueOrOffset;
        const num = reader.getUint32(valOffset);
        const den = reader.getUint32(valOffset + 4);
        return den !== 0 ? num / den : 0;
      }
      return null;
    };

    // 读取度分秒三元组 RATIONAL
    const readRationalTriplet = (entryOffset: number): [number, number, number] | null => {
      const type = reader.getUint16(entryOffset + 2);
      const count = reader.getUint32(entryOffset + 4);
      const rawValueOrOffset = reader.getUint32(entryOffset + 8);
      if (type !== 5 || count < 3) return null;

      const valOffset = tiffStart + rawValueOrOffset;
      const degNum = reader.getUint32(valOffset);
      const degDen = reader.getUint32(valOffset + 4);
      const minNum = reader.getUint32(valOffset + 8);
      const minDen = reader.getUint32(valOffset + 12);
      const secNum = reader.getUint32(valOffset + 16);
      const secDen = reader.getUint32(valOffset + 20);

      const deg = degDen !== 0 ? degNum / degDen : 0;
      const min = minDen !== 0 ? minNum / minDen : 0;
      const sec = secDen !== 0 ? secNum / secDen : 0;
      return [deg, min, sec];
    };

    let exifSubIfdOffset = 0;
    let gpsSubIfdOffset = 0;

    // 解析 IFD0
    const ifd0Entries = reader.getUint16(tiffStart + firstIfdOffset);
    for (let i = 0; i < ifd0Entries; i++) {
      const entryOffset = tiffStart + firstIfdOffset + 2 + i * 12;
      if (entryOffset + 12 > reader.byteLength) break;

      const tag = reader.getUint16(entryOffset);
      switch (tag) {
        case 0x010F: // Make
          result.make = readTagValue(entryOffset);
          break;
        case 0x0110: // Model
          result.model = readTagValue(entryOffset);
          break;
        case 0x0112: // Orientation
          result.orientation = readTagValue(entryOffset);
          break;
        case 0x0131: // Software
          result.software = readTagValue(entryOffset);
          break;
        case 0x0132: // DateTime
          result.dateTime = readTagValue(entryOffset);
          break;
        case 0x010E: // ImageDescription
          result.imageDescription = readTagValue(entryOffset);
          break;
        case 0x013B: // Artist
          result.artist = readTagValue(entryOffset);
          break;
        case 0x8298: // Copyright
          result.copyright = readTagValue(entryOffset);
          break;
        case 0x8769: // Exif SubIFD Pointer
          exifSubIfdOffset = reader.getUint32(entryOffset + 8);
          break;
        case 0x8825: // GPS SubIFD Pointer
          gpsSubIfdOffset = reader.getUint32(entryOffset + 8);
          break;
      }
    }

    // 解析 Exif SubIFD
    if (exifSubIfdOffset > 0 && tiffStart + exifSubIfdOffset < reader.byteLength) {
      const exifEntries = reader.getUint16(tiffStart + exifSubIfdOffset);
      for (let i = 0; i < exifEntries; i++) {
        const entryOffset = tiffStart + exifSubIfdOffset + 2 + i * 12;
        if (entryOffset + 12 > reader.byteLength) break;

        const tag = reader.getUint16(entryOffset);
        switch (tag) {
          case 0x829A: { // ExposureTime (快门)
            const exp = readTagValue(entryOffset);
            if (typeof exp === 'number' && exp > 0) {
              if (exp < 1) {
                result.exposureTime = `1/${Math.round(1 / exp)}s`;
              }
              else {
                result.exposureTime = `${Number(exp.toFixed(1))}s`;
              }
            }
            break;
          }
          case 0x829D: { // FNumber (光圈)
            const fn = readTagValue(entryOffset);
            if (typeof fn === 'number' && fn > 0) {
              result.fNumber = `f/${Number(fn.toFixed(1))}`;
            }
            break;
          }
          case 0x8827: // ISOSpeedRatings
            result.iso = readTagValue(entryOffset);
            break;
          case 0x9003: // DateTimeOriginal
            result.dateTimeOriginal = readTagValue(entryOffset);
            break;
          case 0x920A: { // FocalLength (焦距)
            const fl = readTagValue(entryOffset);
            if (typeof fl === 'number' && fl > 0) {
              result.focalLength = `${Number(fl.toFixed(1))} mm`;
            }
            break;
          }
          case 0xA434: // LensModel (镜头型号)
            result.lensModel = readTagValue(entryOffset);
            break;
          case 0xA002: // PixelXDimension
            result.imageWidth = readTagValue(entryOffset);
            break;
          case 0xA003: // PixelYDimension
            result.imageHeight = readTagValue(entryOffset);
            break;
        }
      }
    }

    // 解析 GPS SubIFD
    if (gpsSubIfdOffset > 0 && tiffStart + gpsSubIfdOffset < reader.byteLength) {
      const gpsEntries = reader.getUint16(tiffStart + gpsSubIfdOffset);
      const gps: ExifGpsInfo = {};

      let latTriplet: [number, number, number] | null = null;
      let lonTriplet: [number, number, number] | null = null;

      for (let i = 0; i < gpsEntries; i++) {
        const entryOffset = tiffStart + gpsSubIfdOffset + 2 + i * 12;
        if (entryOffset + 12 > reader.byteLength) break;

        const tag = reader.getUint16(entryOffset);
        switch (tag) {
          case 0x0001: // GPSLatitudeRef
            gps.latitudeRef = readTagValue(entryOffset);
            break;
          case 0x0002: // GPSLatitude
            latTriplet = readRationalTriplet(entryOffset);
            break;
          case 0x0003: // GPSLongitudeRef
            gps.longitudeRef = readTagValue(entryOffset);
            break;
          case 0x0004: // GPSLongitude
            lonTriplet = readRationalTriplet(entryOffset);
            break;
          case 0x0005: // GPSAltitudeRef
            gps.altitudeRef = reader.getUint8(entryOffset + 8);
            break;
          case 0x0006: { // GPSAltitude
            const alt = readTagValue(entryOffset);
            if (typeof alt === 'number') {
              gps.altitude = Number(alt.toFixed(1));
            }
            break;
          }
        }
      }

      // 计算十进制经纬度
      if (latTriplet) {
        const decLat = latTriplet[0] + latTriplet[1] / 60 + latTriplet[2] / 3600;
        gps.latitude = Number((gps.latitudeRef === 'S' ? -decLat : decLat).toFixed(5));
      }
      if (lonTriplet) {
        const decLon = lonTriplet[0] + lonTriplet[1] / 60 + lonTriplet[2] / 3600;
        gps.longitude = Number((gps.longitudeRef === 'W' ? -decLon : decLon).toFixed(5));
      }

      if (gps.latitude !== undefined && gps.longitude !== undefined) {
        const latRef = gps.latitudeRef || (gps.latitude >= 0 ? 'N' : 'S');
        const lonRef = gps.longitudeRef || (gps.longitude >= 0 ? 'E' : 'W');
        gps.formattedCoords = `${Math.abs(gps.latitude).toFixed(4)}° ${latRef}, ${Math.abs(gps.longitude).toFixed(4)}° ${lonRef}`;
      }

      if (Object.keys(gps).length > 0) {
        result.gps = gps;
      }
    }

    // 只要提取出任意一项有效信息，即标记 hasData: true
    const hasAnyField = Boolean(
      result.make
      || result.model
      || result.lensModel
      || result.software
      || result.dateTime
      || result.dateTimeOriginal
      || result.exposureTime
      || result.fNumber
      || result.iso
      || result.focalLength
      || result.gps
      || result.artist
      || result.copyright,
    );

    result.hasData = hasAnyField;
    return result;
  }
  catch {
    return emptyResult;
  }
}

/**
 * 将结构化 EXIF 元数据格式化为用户可一键复制的整洁多行摘要报告
 *
 * @param exif EXIF 元数据对象
 * @returns 格式化排版后的多行文本
 */
export function formatExifSummary(exif: ExifMetadata): string {
  if (!exif.hasData) {
    return '【EXIF 元数据】\n未检测到任何相机与拍摄信息（可能为截图、已抹除隐私元数据或非 JPEG 格式）';
  }

  const sections: string[] = [];

  // 设备与器材
  const devLines: string[] = [];
  if (exif.make) devLines.push(`设备厂商：${exif.make}`);
  if (exif.model) devLines.push(`相机型号：${exif.model}`);
  if (exif.lensModel) devLines.push(`镜头型号：${exif.lensModel}`);
  if (exif.software) devLines.push(`固件软件：${exif.software}`);
  if (devLines.length > 0) {
    sections.push(`【设备与器材】\n${devLines.join('\n')}`);
  }

  // 拍摄曝光参数
  const expLines: string[] = [];
  if (exif.exposureTime) expLines.push(`快门速度：${exif.exposureTime}`);
  if (exif.fNumber) expLines.push(`光圈大小：${exif.fNumber}`);
  if (exif.iso) expLines.push(`ISO 感光度：${exif.iso}`);
  if (exif.focalLength) expLines.push(`焦距：${exif.focalLength}`);
  if (exif.imageWidth && exif.imageHeight) {
    expLines.push(`原始尺寸：${exif.imageWidth} × ${exif.imageHeight} px`);
  }
  if (expLines.length > 0) {
    sections.push(`【曝光与参数】\n${expLines.join('\n')}`);
  }

  // 拍摄时间与作者
  const timeLines: string[] = [];
  if (exif.dateTimeOriginal) timeLines.push(`拍摄时间：${exif.dateTimeOriginal}`);
  if (exif.dateTime && exif.dateTime !== exif.dateTimeOriginal) timeLines.push(`修改时间：${exif.dateTime}`);
  if (exif.artist) timeLines.push(`作者：${exif.artist}`);
  if (exif.copyright) timeLines.push(`版权声明：${exif.copyright}`);
  if (timeLines.length > 0) {
    sections.push(`【时间与版权】\n${timeLines.join('\n')}`);
  }

  // GPS 地理位置
  if (exif.gps) {
    const gpsLines: string[] = [];
    if (exif.gps.formattedCoords) gpsLines.push(`经纬度：${exif.gps.formattedCoords}`);
    if (exif.gps.altitude !== undefined) {
      gpsLines.push(`海拔高度：${exif.gps.altitude} 米`);
    }
    if (gpsLines.length > 0) {
      sections.push(`【GPS 地理位置 (敏感隐私)】\n${gpsLines.join('\n')}`);
    }
  }

  return sections.join('\n\n');
}

/**
 * 纯函数：基于图像像素阵列提取 6~8 种主导代表色彩并计算占比与前景色
 *
 * @param pixelData RGBA 像素数据数组
 * @param totalPixels 像素总数
 * @param colorCount 提取的色彩数量 (默认 6 种，最多 8 种)
 * @returns 调色板数组
 */
export function extractColorPaletteFromImageData(
  pixelData: Uint8ClampedArray | number[],
  totalPixels: number,
  colorCount = 6,
): PaletteColor[] {
  if (!pixelData || totalPixels <= 0) {
    return [];
  }

  const targetCount = Math.max(2, Math.min(8, colorCount));
  // 采样步长控制：若像素点过多，等距采样控制在约 10000 像素内，保持毫秒级性能
  const step = Math.max(1, Math.floor(totalPixels / 10000));

  // 15-bit RGB 量化桶：(r>>3)<<10 | (g>>3)<<5 | (b>>3)，每个通道 32 级
  const buckets = new Map<number, { count: number; sumR: number; sumG: number; sumB: number }>();
  let validPixelCount = 0;

  for (let i = 0; i < totalPixels; i += step) {
    const idx = i * 4;
    const a = pixelData[idx + 3];
    // 忽略半透明与全透明像素
    if (a < 128) continue;

    const r = pixelData[idx];
    const g = pixelData[idx + 1];
    const b = pixelData[idx + 2];

    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let entry = buckets.get(key);
    if (!entry) {
      entry = { count: 0, sumR: 0, sumG: 0, sumB: 0 };
      buckets.set(key, entry);
    }
    entry.count++;
    entry.sumR += r;
    entry.sumG += g;
    entry.sumB += b;
    validPixelCount++;
  }

  if (validPixelCount === 0 || buckets.size === 0) {
    return [];
  }

  // 按频次从大到小排序候选桶
  const sortedCandidates = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .map(b => ({
      count: b.count,
      r: Math.round(b.sumR / b.count),
      g: Math.round(b.sumG / b.count),
      b: Math.round(b.sumB / b.count),
    }));

  // 计算感知色彩距离 (加权欧式距离)
  const calcDistance = (
    c1: { r: number; g: number; b: number },
    c2: { r: number; g: number; b: number },
  ): number => {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
  };

  // 多样性筛选：避免选出的颜色过于趋同 (例如一堆极其接近的深黑或浅灰)
  const selected: Array<{ count: number; r: number; g: number; b: number }> = [];

  const tryPickWithThreshold = (threshold: number) => {
    for (const cand of sortedCandidates) {
      if (selected.length >= targetCount) break;
      if (selected.includes(cand)) continue;

      const isDiverse = selected.every(s => calcDistance(s, cand) >= threshold);
      if (isDiverse) {
        selected.push(cand);
      }
    }
  };

  // 1. 优先严格色差 (>= 32)
  tryPickWithThreshold(32);

  // 2. 若数量未达到要求，放宽阈值 (>= 18) 填充
  if (selected.length < targetCount) {
    tryPickWithThreshold(18);
  }

  // 3. 若仍未达到要求，直接顺序补齐未入选的高频颜色
  if (selected.length < targetCount) {
    for (const cand of sortedCandidates) {
      if (selected.length >= targetCount) break;
      if (!selected.includes(cand)) {
        selected.push(cand);
      }
    }
  }

  // 计算选出颜色的总权重以便计算各自的百分比
  const totalSelectedCount = selected.reduce((sum, item) => sum + item.count, 0);

  return selected.map((item) => {
    const hex = `#${[item.r, item.g, item.b]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`;
    const rgb = `rgb(${item.r}, ${item.g}, ${item.b})`;

    // 计算相对亮度决定高对比度前景色 (W3C 亮度公式)
    const luminance = 0.299 * item.r + 0.587 * item.g + 0.114 * item.b;
    const textColor = luminance > 140 ? '#000000' : '#FFFFFF';

    const percentage = totalSelectedCount > 0
      ? Number(((item.count / totalSelectedCount) * 100).toFixed(1))
      : 0;

    return {
      hex,
      rgb,
      r: item.r,
      g: item.g,
      b: item.b,
      percentage,
      textColor,
    };
  });
}

/**
 * 从 HTMLImageElement 或 HTMLCanvasElement 中提取主题调色板
 *
 * @param sourceImage HTMLImageElement 或 HTMLCanvasElement
 * @param colorCount 提取的色彩数量 (默认 6 种)
 * @returns 调色板数组
 */
export function extractColorPalette(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  colorCount = 6,
): PaletteColor[] {
  try {
    const offscreenCanvas = document.createElement('canvas');
    // 缩放到 100x100 采样画布，包含 10000 个采样像素
    const sampleSize = 100;
    offscreenCanvas.width = sampleSize;
    offscreenCanvas.height = sampleSize;
    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) return [];

    ctx.drawImage(sourceImage, 0, 0, sampleSize, sampleSize);
    const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    return extractColorPaletteFromImageData(imgData.data, sampleSize * sampleSize, colorCount);
  }
  catch {
    return [];
  }
}

/**
 * 开发者常用尺寸预设模板库
 */
export const DIMENSION_PRESETS: DimensionPreset[] = [
  // 图标与 Favicon
  {
    id: 'favicon-16',
    name: 'Favicon 极小',
    category: 'icon',
    width: 16,
    height: 16,
    description: '浏览器标签栏经典尺寸 (16 × 16)',
  },
  {
    id: 'favicon-32',
    name: 'Favicon 标准',
    category: 'icon',
    width: 32,
    height: 32,
    description: '高分屏网页标签栏标准尺寸 (32 × 32)',
  },
  {
    id: 'favicon-48',
    name: 'Favicon 高清',
    category: 'icon',
    width: 48,
    height: 48,
    description: 'Windows 桌面快捷方式与书签栏图标 (48 × 48)',
  },
  {
    id: 'apple-touch-180',
    name: 'Apple Touch',
    category: 'icon',
    width: 180,
    height: 180,
    description: 'iOS Safari “添加到主屏幕”图标 (180 × 180)',
  },
  {
    id: 'android-192',
    name: 'Android / PWA',
    category: 'icon',
    width: 192,
    height: 192,
    description: 'Web App Manifest 标准图标 (192 × 192)',
  },
  {
    id: 'app-512',
    name: '应用高清大标',
    category: 'icon',
    width: 512,
    height: 512,
    description: 'PWA 启动大图与应用商店图标 (512 × 512)',
  },

  // 社交网络 & 开源平台
  {
    id: 'github-avatar',
    name: 'GitHub 头像',
    category: 'social',
    width: 400,
    height: 400,
    description: 'GitHub / GitLab / 论坛方形头像标准 (400 × 400)',
  },
  {
    id: 'twitter-card',
    name: 'Twitter / OG 分享卡片',
    category: 'social',
    width: 1200,
    height: 630,
    description: 'OpenGraph 社交网络分享大卡片预览 (1200 × 630)',
  },
  {
    id: 'twitter-banner',
    name: 'Twitter/X 个人横幅',
    category: 'social',
    width: 1500,
    height: 500,
    description: '个人主页顶部背景大横幅 (1500 × 500, 3:1)',
  },
  {
    id: 'wechat-cover',
    name: '微信公众号首图',
    category: 'social',
    width: 900,
    height: 383,
    description: '微信公众平台图文推送首篇大封面 (900 × 383, 2.35:1)',
  },
  {
    id: 'wechat-square',
    name: '微信公众号次图',
    category: 'social',
    width: 200,
    height: 200,
    description: '微信公众平台次篇推送小方形缩略图 (200 × 200, 1:1)',
  },
  {
    id: 'youtube-cover',
    name: 'YouTube 视频封面',
    category: 'social',
    width: 1280,
    height: 720,
    description: '16:9 标清/高清视频封面海报 (1280 × 720)',
  },
  {
    id: 'bilibili-cover',
    name: 'B站视频封面',
    category: 'social',
    width: 1146,
    height: 717,
    description: 'Bilibili 视频稿件标准投稿比例封面 (1146 × 717)',
  },
];

/**
 * 纯函数：将若干帧 PNG/位图二进制数据组装打包为合法的 Windows ICO 图标二进制流
 *
 * @param images 各尺寸图像数据列表 (width, height, data)
 * @returns 组装完成的合法 ICO 二进制 Uint8Array
 */
export function createIcoBinary(
  images: Array<{ width: number; height: number; data: Uint8Array }>,
): Uint8Array {
  if (!images || images.length === 0) {
    throw new Error('ICO 生成失败：必须提供至少一帧图像数据');
  }

  const count = images.length;
  // 头部 ICONDIR 为 6 字节 + 每个目录条目 ICONDIRENTRY 为 16 字节
  const headerSize = 6 + count * 16;
  let totalDataSize = 0;
  for (const img of images) {
    totalDataSize += img.data.byteLength;
  }

  const totalSize = headerSize + totalDataSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const outBytes = new Uint8Array(buffer);

  // 1. 写入 ICONDIR (6 字节)
  view.setUint16(0, 0, true); // idReserved = 0
  view.setUint16(2, 1, true); // idType = 1 (ICO)
  view.setUint16(4, count, true); // idCount (图像数量)

  // 2. 写入 ICONDIRENTRY 与图像数据
  let currentImageOffset = headerSize;

  for (let i = 0; i < count; i++) {
    const img = images[i];
    const entryOffset = 6 + i * 16;

    // bWidth & bHeight (0 代表 256px)
    view.setUint8(entryOffset + 0, img.width >= 256 ? 0 : img.width);
    view.setUint8(entryOffset + 1, img.height >= 256 ? 0 : img.height);
    view.setUint8(entryOffset + 2, 0); // bColorCount = 0 (真彩色)
    view.setUint8(entryOffset + 3, 0); // bReserved = 0
    view.setUint16(entryOffset + 4, 1, true); // wPlanes = 1
    view.setUint16(entryOffset + 6, 32, true); // wBitCount = 32 位真彩色
    view.setUint32(entryOffset + 8, img.data.byteLength, true); // dwBytesInRes
    view.setUint32(entryOffset + 12, currentImageOffset, true); // dwImageOffset

    // 拷贝图像二进制流
    outBytes.set(img.data, currentImageOffset);
    currentImageOffset += img.data.byteLength;
  }

  return outBytes;
}

/**
 * 基于 Canvas 将当前画面缩放并打包为包含 16x16, 32x32, 48x48 像素的 Windows ICO Blob
 *
 * @param sourceCanvas 源 Canvas 画布
 * @param sizes 需要包含的图标尺寸列表，默认 [16, 32, 48]
 * @returns 包含多尺寸的合法 ICO Blob
 */
export async function generateIcoBlob(
  sourceCanvas: HTMLCanvasElement,
  sizes: number[] = [16, 32, 48],
): Promise<Blob> {
  const images: Array<{ width: number; height: number; data: Uint8Array }> = [];

  for (const size of sizes) {
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const ctx = offscreen.getContext('2d');
    if (!ctx) continue;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, size, size);

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      offscreen.toBlob(resolve, 'image/png');
    });

    if (pngBlob) {
      const arrayBuffer = await pngBlob.arrayBuffer();
      images.push({
        width: size,
        height: size,
        data: new Uint8Array(arrayBuffer),
      });
    }
  }

  const icoBinary = createIcoBinary(images);
  return new Blob([icoBinary], { type: 'image/x-icon' });
}

/**
 * 将 Blob 异步转换为 Base64 Data URL 字符串
 *
 * @param blob 二进制 Blob 对象
 * @returns Base64 Data URL 字符串
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      }
      else {
        reject(new Error('转换 Base64 失败'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('读取 Blob 失败'));
    reader.readAsDataURL(blob);
  });
}




