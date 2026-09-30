/**
 * PDF 文本与元数据提取器数据模型契约
 *
 * @author Ateng
 * @since 2026-09-30
 */

export interface PdfDocumentMetadata {
  /**
   * 文档标题
   */
  title: string;

  /**
   * 文档作者
   */
  author: string;

  /**
   * 主题
   */
  subject: string;

  /**
   * 关键字
   */
  keywords: string;

  /**
   * 创建工具 (Creator)
   */
  creator: string;

  /**
   * 制作程序 (Producer)
   */
  producer: string;

  /**
   * 创建日期
   */
  creationDate: string;

  /**
   * 修改日期
   */
  modificationDate: string;

  /**
   * PDF 规范版本 (如 1.7)
   */
  pdfVersion: string;

  /**
   * 总页数
   */
  pageCount: number;

  /**
   * 首页页面物理尺寸描述 (如 595.3 x 841.9 pt)
   */
  pageDimensions: string;
}

export interface PdfPageTextItem {
  /**
   * 页码 (从 1 开始)
   */
  pageNumber: number;

  /**
   * 提取的纯文本内容
   */
  text: string;

  /**
   * 字符总数
   */
  charCount: number;

  /**
   * 单词总数
   */
  wordCount: number;

  /**
   * 页面宽度
   */
  width: number;

  /**
   * 页面高度
   */
  height: number;
}

export interface PdfExtractResult {
  /**
   * 解析后的文档元数据
   */
  metadata: PdfDocumentMetadata;

  /**
   * 逐页文本数据列表
   */
  pages: PdfPageTextItem[];

  /**
   * 全文合并文本
   */
  allText: string;

  /**
   * 全文总字符数
   */
  totalChars: number;

  /**
   * 全文总单词数
   */
  totalWords: number;
}
