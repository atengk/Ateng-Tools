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
