/**
 * 图片转 PDF 工具类型契约
 *
 * @author Ateng
 * @since 2026-09-30
 */

/**
 * 纸张标准规格
 * - a4: 标准 A4 纸张规格 (210 × 297 mm)
 * - a3: 标准 A3 纸张规格 (297 × 420 mm)
 * - letter: 美规信纸 Letter 规格 (8.5 × 11 inch)
 * - fit: 自适应单图原始像素尺寸
 */
export type PageFormat = 'a4' | 'a3' | 'letter' | 'fit';

/**
 * 页面纸张方向
 * - auto: 根据每张图片的宽高比自动选择最匹配的方向
 * - portrait: 强制垂直纵向
 * - landscape: 强制水平横向
 */
export type PageOrientation = 'auto' | 'portrait' | 'landscape';

/**
 * 页边距设置
 * - none: 无边距 (0 mm)
 * - small: 窄边距 (10 mm)
 * - normal: 适中边距 (20 mm)
 */
export type PageMargin = 'none' | 'small' | 'normal';

/**
 * 输入的图片项数据结构
 */
export interface ImageSourceItem {
  /** 唯一标识 */
  id: string;
  /** 图片二进制字节数据 */
  bytes: Uint8Array;
  /** 原始文件名 */
  name: string;
  /** 文件 MIME 类型 (如 image/png, image/jpeg 等) */
  type: string;
  /** 本地临时预览 URL（用于 UI 展示） */
  previewUrl?: string;
  /** 文件原始大小（字节） */
  size?: number;
  /** 图片实际像素宽度 */
  width?: number;
  /** 图片实际像素高度 */
  height?: number;
}

/**
 * 图片合成 PDF 全局参数配置
 */
export interface ImageToPdfOptions {
  /** 纸张规格 */
  format: PageFormat;
  /** 页面方向 */
  orientation: PageOrientation;
  /** 页边距预设 */
  margin: PageMargin;
  /** 自定义导出文件名（不含扩展名） */
  customFileName?: string;
}

/**
 * PDF 合成结果
 */
export interface ImageToPdfResult {
  /** 生成的 PDF 二进制字节流 */
  bytes: Uint8Array;
  /** 合成导出的建议完整文件名 */
  fileName: string;
  /** 文档总页数 */
  pageCount: number;
  /** 生成的文档文件体积（字节） */
  fileSize: number;
}
