/**
 * Image Studio (图片处理工作台) 类型契约
 *
 * @author Ateng
 * @since 2026-09-30
 */

/**
 * 图像输出格式
 */
export type ExportImageFormat = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/x-icon';

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
 * 画布背景显示与填充模式
 */
export type CanvasBackgroundMode = 'checkerboard' | 'white' | 'black' | 'custom';

/**
 * 画布背景配置
 */
export interface CanvasBackgroundConfig {
  /** 背景显示与填充模式 */
  mode: CanvasBackgroundMode;
  /** 自定义纯色色值 (HEX) */
  customColor: string;
}

/**
 * 开发者常用尺寸预设模型
 */
export interface DimensionPreset {
  /** 唯一标识键 */
  id: string;
  /** 预设名称 */
  name: string;
  /** 分类分组 */
  category: 'icon' | 'social' | 'common';
  /** 预设宽度 (px) */
  width: number;
  /** 预设高度 (px) */
  height: number;
  /** 简述说明 */
  description?: string;
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
  /** 画布底层填充纯色 (用于透明图转 JPEG 防黑边或纯色底渲染) */
  backgroundColor?: string;
  /** 外部预载入的 Logo Image (可选) */
  loadedLogoImage?: HTMLImageElement | null;
}

/**
 * EXIF GPS 地理位置信息
 */
export interface ExifGpsInfo {
  /** 纬度十进制数值 (如 39.9042) */
  latitude?: number;
  /** 纬度半球 ('N' | 'S') */
  latitudeRef?: string;
  /** 经度十进制数值 (如 116.4074) */
  longitude?: number;
  /** 经度半球 ('E' | 'W') */
  longitudeRef?: string;
  /** 海拔高度 (米) */
  altitude?: number;
  /** 海拔参考 (0=高于海平面, 1=低于海平面) */
  altitudeRef?: number;
  /** 格式化坐标显示字符串 (如 "39.9042° N, 116.4074° E") */
  formattedCoords?: string;
}

/**
 * EXIF 拍摄与设备元数据
 */
export interface ExifMetadata {
  /** 是否解析出有效的 EXIF 元数据 */
  hasData: boolean;
  /** 设备制造厂商 (Make, 如 Apple, Canon, SONY) */
  make?: string;
  /** 相机型号 (Model, 如 iPhone 15 Pro, ILCE-7M4) */
  model?: string;
  /** 镜头型号 (LensModel) */
  lensModel?: string;
  /** 拍摄/处理软件 (Software) */
  software?: string;
  /** 修改时间 (DateTime) */
  dateTime?: string;
  /** 原始拍摄时间 (DateTimeOriginal) */
  dateTimeOriginal?: string;
  /** 快门曝光时间 (ExposureTime, 如 1/120s) */
  exposureTime?: string;
  /** 光圈数 (FNumber, 如 f/1.8) */
  fNumber?: string;
  /** ISO 感光度 (ISOSpeedRatings, 如 100) */
  iso?: number;
  /** 镜头焦距 (FocalLength, 如 24 mm) */
  focalLength?: string;
  /** 图像宽度 (PixelXDimension 或 IFD 宽度) */
  imageWidth?: number;
  /** 图像高度 (PixelYDimension 或 IFD 高度) */
  imageHeight?: number;
  /** 画面方向 (Orientation 1-8) */
  orientation?: number;
  /** 拍摄者/艺术家 (Artist) */
  artist?: string;
  /** 版权信息 (Copyright) */
  copyright?: string;
  /** 图像描述 (ImageDescription) */
  imageDescription?: string;
  /** GPS 地理位置信息 */
  gps?: ExifGpsInfo;
}

/**
 * 调色板色彩项
 */
export interface PaletteColor {
  /** 十六进制颜色代码 (如 #3B82F6) */
  hex: string;
  /** RGB 格式代码 (如 rgb(59, 130, 246)) */
  rgb: string;
  /** 红色通道 (0-255) */
  r: number;
  /** 绿色通道 (0-255) */
  g: number;
  /** 蓝色通道 (0-255) */
  b: number;
  /** 像素占比百分比 (0 - 100) */
  percentage: number;
  /** 搭配前景色推荐 (#000000 或 #FFFFFF) */
  textColor: string;
}



