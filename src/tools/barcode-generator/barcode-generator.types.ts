/**
 * 条形码生成器类型契约定义
 *
 * @author Ateng
 * @since 2026-10-01
 */

/** 支持的条形码格式编码标准 */
export type BarcodeFormat =
  | 'CODE128'
  | 'EAN13'
  | 'EAN8'
  | 'UPCA'
  | 'CODE39'
  | 'ITF14';

/** 条形码渲染配置选项 */
export interface BarcodeRenderOptions {
  /** 编码标准格式 */
  format: BarcodeFormat
  /** 单根条柱基础宽度 (像素) */
  barWidth: number
  /** 条码条柱高度 (像素) */
  height: number
  /** 前景条柱与文字颜色 (HEX) */
  color: string
  /** 背景填充颜色 (HEX 或 transparent) */
  background: string
  /** 外边距留白 (像素) */
  margin: number
  /** 是否在条形码下方渲染显示明文 */
  showText: boolean
  /** 文本字号大小 (像素) */
  fontSize: number
}

/** 条形码生成输出结果 */
export interface BarcodeResult {
  /** 编码是否校验成功 */
  isValid: boolean
  /** 校验或编码失败时的错误提示信息 */
  error?: string
  /** 原始输入文本 */
  rawText: string
  /** 经过校验位补全或规范化后的编码文本 */
  encodedText: string
  /** 生成的完整矢量 SVG 字符串 */
  svg: string
  /** 条形码总宽度 (像素) */
  totalWidth: number
  /** 条形码总高度 (像素) */
  totalHeight: number
}
