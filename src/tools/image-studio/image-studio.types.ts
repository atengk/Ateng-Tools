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

/**
 * 几何变换配置 (旋转与镜像)
 */
export interface TransformOptions {
  /** 顺时针旋转角度 (0, 90, 180, 270) */
  rotation: number;
  /** 是否水平镜像翻转 */
  flipHorizontal: boolean;
  /** 是否垂直镜像翻转 */
  flipVertical: boolean;
}

/**
 * 矩形裁剪区域 (基于原图的像素坐标)
 */
export interface CropRegion {
  /** 起始点 X 轴坐标 (像素) */
  x: number;
  /** 起始点 Y 轴坐标 (像素) */
  y: number;
  /** 裁剪宽度 (像素) */
  width: number;
  /** 裁剪高度 (像素) */
  height: number;
}

/**
 * 裁剪预设宽高比例
 */
export type CropAspectRatio = 'free' | '1:1' | '16:9' | '4:3' | '3:2' | '2:1';

/**
 * 水印模式
 */
export type WatermarkMode = 'none' | 'text' | 'image';

/**
 * 九宫格对齐锚点
 */
export type WatermarkAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * 文本水印配置
 */
export interface TextWatermarkConfig {
  /** 文本内容 */
  text: string;
  /** 字号 (px) */
  fontSize: number;
  /** 文字颜色 (十六进制) */
  color: string;
  /** 不透明度 (0.01 - 1.0) */
  opacity: number;
  /** 倾斜角度 (度) */
  rotation: number;
  /** 是否开启全屏倾斜平铺防盗阵列 */
  isTiled: boolean;
  /** 平铺水平间距 (px) */
  tileGapX: number;
  /** 平铺垂直间距 (px) */
  tileGapY: number;
  /** 九宫格停靠锚点 (非平铺模式下生效) */
  anchor: WatermarkAnchor;
  /** 边距 (px) */
  margin: number;
}

/**
 * 图片 Logo 水印配置
 */
export interface ImageWatermarkConfig {
  /** 图片 DataURL 或 Blob URL */
  imageDataUrl: string;
  /** 缩放比例 (0.05 - 1.0) */
  scale: number;
  /** 不透明度 (0.01 - 1.0) */
  opacity: number;
  /** 九宫格停靠锚点 */
  anchor: WatermarkAnchor;
  /** 边距 (px) */
  margin: number;
  /** 倾斜旋转角度 (度) */
  rotation: number;
  /** 是否全屏平铺 */
  isTiled: boolean;
  /** 平铺间距 */
  tileGap: number;
}

/**
 * 综合水印设置
 */
export interface StudioWatermarkConfig {
  /** 是否全局开启水印 */
  enabled: boolean;
  /** 水印模式 (text 或 image) */
  mode: WatermarkMode;
  /** 文字水印配置 */
  text: TextWatermarkConfig;
  /** 图片水印配置 */
  image: ImageWatermarkConfig;
}

/**
 * 综合渲染管线参数
 */
export interface RenderPipelineOptions {
  /** 裁剪选区 (可选) */
  crop?: CropRegion;
  /** 几何变换 (可选) */
  transform?: TransformOptions;
  /** 最终目标宽度 (可选) */
  targetWidth?: number;
  /** 最终目标高度 (可选) */
  targetHeight?: number;
  /** 水印配置 (可选) */
  watermark?: StudioWatermarkConfig;
}


