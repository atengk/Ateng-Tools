/**
 * PDF 转图片与 ZIP 归档纯函数服务
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { zip } from 'fflate';
import type { ImageFormat, ResolutionScale } from './pdf-to-image.types';

let pdfjsPromise: Promise<any> | null = null;

/**
 * 惰性异步获取 pdfjs 实例并初始化 worker
 */
export async function getPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      const resolved = (pdfjs as any).default ?? pdfjs;
      if (typeof window !== 'undefined' && resolved.GlobalWorkerOptions) {
        resolved.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.js',
          import.meta.url,
        ).toString();
      }
      return resolved;
    })();
  }
  return pdfjsPromise;
}

/**
 * 将图片格式转换为对应的标准 MIME 类型
 */
export function getImageMimeType(format: ImageFormat): string {
  switch (format) {
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'png':
    default:
      return 'image/png';
  }
}

/**
 * 构建规范化的单页图片文件名（带动态零填充位数，如 文档_第01页.png）
 */
export function buildImageFileName(
  baseName: string,
  pageNumber: number,
  totalPages: number,
  format: ImageFormat,
): string {
  const digits = Math.max(2, String(totalPages).length);
  const padIndex = String(pageNumber).padStart(digits, '0');
  const ext = format === 'jpeg' ? 'jpg' : format;
  const cleanBase = baseName.replace(/\.[^/.]+$/, '').trim() || '文档';
  return `${cleanBase}_第${padIndex}页.${ext}`;
}

/**
 * 将内存中多个二进制文件在内存中快速打包为 ZIP 字节数组
 *
 * @param files 文件名字典 { '文件名.png': Uint8Array }
 * @returns 压缩包二进制流
 */
export function createZipArchive(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    if (!files || Object.keys(files).length === 0) {
      reject(new Error('归档文件列表为空，无法创建 ZIP 压缩包'));
      return;
    }

    zip(files, { level: 0 }, (err, data) => {
      if (err) {
        reject(err);
      }
      else {
        resolve(data);
      }
    });
  });
}

/**
 * 光栅化渲染 PDF 指定页面至 Canvas
 *
 * @param pdfDoc PDF 文档代理实例
 * @param pageNumber 页码（从 1 开始）
 * @param scale 分辨率缩放比例 (1x, 2x, 3x)
 * @param targetCanvas 目标画布对象
 */
export async function renderPdfPageToCanvas(
  pdfDoc: any,
  pageNumber: number,
  scale: ResolutionScale,
  targetCanvas: HTMLCanvasElement,
): Promise<{ width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  targetCanvas.width = Math.floor(viewport.width);
  targetCanvas.height = Math.floor(viewport.height);

  const context = targetCanvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 渲染环境初始化失败');
  }

  // 纯白背景保底，防止透明通道在转 JPEG 时产生黑底
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

  const renderContext = {
    canvasContext: context,
    viewport,
  };

  await page.render(renderContext).promise;

  return {
    width: targetCanvas.width,
    height: targetCanvas.height,
  };
}

/**
 * 辅助将 Canvas 转换为二进制 Blob
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  quality = 0.92,
): Promise<Blob> {
  const mimeType = getImageMimeType(format);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas 导出图片失败'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}
