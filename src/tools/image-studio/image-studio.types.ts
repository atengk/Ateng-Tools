/**
 * Image Studio (图片处理工作台) 类型契约
 *
 * @author Ateng
 * @since 2026-09-30
 */

/**
 * 图像输出格式
 */
export type ExportImageFormat = 'image/png' | 'image/jpeg' | 'image/webp';

/**
 * 8192px 最大安全尺寸防御常量
 */
export const MAX_SAFE_IMAGE_DIMENSION = 8192;
export const MIN_SAFE_IMAGE_DIMENSION = 1;

/**
 * 原始图像源信息元数据
 */
export interface ImageSourceInfo {
  /** 文件名 */
  name: string;
  /** 原始像素宽度 */
  originalWidth: number;
  /** 原始像素高度 */
  originalHeight: number;
  /** 原始文件大小 (字节) */
  size: number;
  /** MIME 类型 */
  mimeType: string;
  /** 原始宽高比 (width / height) */
  aspectRatio: number;
  /** 图片预览 Data URL 或 Object URL */
  dataUrl: string;
}

/**
 * 缩放变换配置
 */
export interface ResizeOptions {
  /** 目标宽度 */
  width: number;
  /** 目标高度 */
  height: number;
  /** 是否保持宽高比锁定 */
  keepAspectRatio: boolean;
}

/**
 * 导出与压缩配置项
 */
export interface ExportOptions {
  /** 目标文件格式 */
  format: ExportImageFormat;
  /** 压缩质量 (0.01 - 1.0, 对应 1% - 100%) */
  quality: number;
  /** 自定义导出文件名 (不含扩展名) */
  customFileName?: string;
}

/**
 * 导出渲染成果
 */
export interface ExportResult {
  /** 导出的二进制数据 */
  blob: Blob;
  /** 资源访问 URL */
  url: string;
  /** 输出像素宽度 */
  width: number;
  /** 输出像素高度 */
  height: number;
  /** 输出大小 (字节) */
  size: number;
  /** 导出格式 */
  format: ExportImageFormat;
  /** 导出的完整文件名 */
  fileName: string;
}
