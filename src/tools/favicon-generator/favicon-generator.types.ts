/**
 * Favicon 网站图标生成器契约与类型定义
 *
 * @author Ateng
 * @since 2026-10-01
 */

/** 图标生成预设规格项 */
export interface FaviconSpec {
  /** 输出文件名，例如 favicon-16x16.png */
  fileName: string
  /** 图标宽度 (像素) */
  width: number
  /** 图标高度 (像素) */
  height: number
  /** 规格用途中文说明 */
  description: string
  /** 是否纳入 favicon.ico 多分辨率集合 */
  includeInIco?: boolean
}

/** 生成的单张图标结果实体 */
export interface GeneratedIconItem {
  fileName: string
  width: number
  height: number
  description: string
  dataUrl: string
  bytes: Uint8Array
}

/** Web Manifest 清单配置选项 */
export interface WebManifestOptions {
  appName: string
  shortName: string
  themeColor: string
  backgroundColor: string
}
