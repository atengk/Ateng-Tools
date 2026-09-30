/**
 * PDF Studio (PDF 工坊) 类型契约
 *
 * @author Ateng
 * @since 2026-09-30
 */

/**
 * 虚拟页面项数据结构 (Virtual Page Deck 中的单元节点)
 */
export interface VirtualPageItem {
  /** 虚拟页面全局唯一标识 */
  id: string;
  /** 所属原始文档 ID (支持多文档合并) */
  sourceDocId: string;
  /** 所属原始文档名称 */
  sourceDocName?: string;
  /** 在原始来源文档中的物理页码索引 (从 0 开始) */
  originalPageIndex: number;
  /** 累计旋转角度 (0, 90, 180, 270) */
  rotation: number;
  /** 逻辑删除标记 (为 true 时不参与导出) */
  isDeleted: boolean;
  /** 离屏渲染生成的微缩缩略图 ObjectURL */
  thumbnailUrl?: string;
  /** 是否正在后台视口延迟光栅化渲染中 */
  isRendering?: boolean;
}

/**
 * 来源文档注册项
 */
export interface SourceDocumentItem {
  /** 文档唯一标识 */
  id: string;
  /** 原始文件名 */
  name: string;
  /** 文档二进制字节流 */
  bytes: Uint8Array;
  /** 包含的总页数 */
  pageCount: number;
  /** 文件原始大小（字节） */
  size: number;
}

/**
 * 水印类型
 */
export type WatermarkType = 'none' | 'text' | 'image';

/**
 * 水印排版布局方式
 */
export type WatermarkLayout = 'center' | 'tile';

/**
 * 水印与印章配置项
 */
export interface WatermarkConfig {
  /** 水印类型 */
  type: WatermarkType;
  /** 文字水印内容（支持中英文、特殊字符、Emoji） */
  text?: string;
  /** 文字大小 (pt/px，默认 36) */
  fontSize?: number;
  /** 文字颜色（十六进制 Hex，默认 #999999） */
  color?: string;
  /** 水印不透明度 (0.01 - 1.0，默认 0.3) */
  opacity?: number;
  /** 旋转角度（角度制，默认 -30） */
  rotation?: number;
  /** 排布方式：居中印章 (center) 或全页平铺 (tile) */
  layout?: WatermarkLayout;
  /** 平铺间距（默认 140） */
  tileGap?: number;
  /** 图片水印的 Base64 或 DataURL */
  imageDataUrl?: string;
  /** 图片水印缩放系数 (0.1 - 2.0，默认 0.5) */
  imageScale?: number;
}

/**
 * 导出 PDF 配置项
 */
export interface ExportPdfOptions {
  /** 自定义导出文件名（不含扩展名） */
  customFileName?: string;
  /** 水印配置 */
  watermark?: WatermarkConfig;
}

/**
 * 导出 PDF 处理结果
 */
export interface ExportPdfResult {
  /** 序列化生成的最终 PDF 二进制流 */
  bytes: Uint8Array;
  /** 导出的文件名 */
  fileName: string;
  /** 实际导出的有效总页数 */
  pageCount: number;
  /** 生成文件大小（字节） */
  fileSize: number;
}

