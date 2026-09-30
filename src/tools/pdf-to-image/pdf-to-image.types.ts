/**
 * PDF 转图片工具类型契约
 *
 * @author Ateng
 * @since 2026-09-30
 */

/**
 * 输出图片格式
 */
export type ImageFormat = 'png' | 'jpeg' | 'webp';

/**
 * 清晰度缩放倍率 (1x = 72 DPI, 2x = 144 DPI, 3x = 216 DPI)
 */
export type ResolutionScale = 1 | 2 | 3;

/**
 * 转换全局配置参数
 */
export interface PdfToImageOptions {
  /** 目标图片输出格式 */
  format: ImageFormat;
  /** 渲染清晰度缩放倍率 */
  scale: ResolutionScale;
  /** 图片质量（仅对 JPEG 与 WebP 有效，范围 0.1 ~ 1.0） */
  quality?: number;
}

/**
 * 单页渲染结果项
 */
export interface PdfPageImageItem {
  /** 页码（从 1 开始） */
  pageNumber: number;
  /** 渲染生成的图片宽（像素） */
  width: number;
  /** 渲染生成的图片高（像素） */
  height: number;
  /** 图片二进制 Blob */
  blob: Blob;
  /** 本地临时预览 DataURL / ObjectURL */
  previewUrl: string;
  /** 导出的建议单页文件名 */
  fileName: string;
  /** 图片大小（字节） */
  fileSize: number;
}

/**
 * ZIP 压缩归档打包结果
 */
export interface PdfZipArchiveResult {
  /** 压缩包二进制 Blob */
  blob: Blob;
  /** 建议压缩包文件名 */
  fileName: string;
  /** 压缩包大小（字节） */
  fileSize: number;
  /** 包含的图片总张数 */
  imageCount: number;
}
