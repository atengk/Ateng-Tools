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
 * 导出 PDF 配置项
 */
export interface ExportPdfOptions {
  /** 自定义导出文件名（不含扩展名） */
  customFileName?: string;
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
