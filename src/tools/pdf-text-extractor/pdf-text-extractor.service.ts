/**
 * PDF 纯文本提取与文档元数据解析纯函数服务层
 *
 * @author Ateng
 * @since 2026-09-30
 */

import pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.js?url';
import type { PdfDocumentMetadata, PdfExtractResult, PdfPageTextItem } from './pdf-text-extractor.types';

// 在真实浏览器生产与开发环境中配置 workerSrc
if (typeof window !== 'undefined' && !navigator?.userAgent?.includes('jsdom') && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

/**
 * 解析并格式化 PDF 规范内部日期格式（如 D:20260930114924Z 或 D:20260930114924+08'00'）
 *
 * @param rawDate PDF 元数据内部原始日期字符串
 * @returns 格式化后的日期文本，若无法解析则返回原始文本或空描述
 */
export function formatPdfDate(rawDate?: string | null): string {
  if (!rawDate) {
    return '未知';
  }

  // 清洗开头的 D: 前缀
  const cleaned = rawDate.replace(/^D:/, '');
  // 正则匹配年月日时分秒: YYYYMMDDHHmmSS
  const match = cleaned.match(/^(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/);
  if (!match) {
    return rawDate;
  }

  const [, year, month = '01', day = '01', hour = '00', minute = '00', second = '00'] = match;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 统计包含中英文混合文本的估算词数
 *
 * @param text 待统计的纯文本
 * @returns 混合词数统计
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) {
    return 0;
  }

  // 1. 匹配中日韩统一表意文字数量
  const cjkMatches = text.match(/[\u4E00-\u9FA5\u3040-\u30FF\uAC00-\uD7AF]/g) || [];
  // 2. 移除中日韩字符后，统计常规西文单词数
  const nonCjkText = text.replace(/[\u4E00-\u9FA5\u3040-\u30FF\uAC00-\uD7AF]/g, ' ').trim();
  const westernWords = nonCjkText ? nonCjkText.split(/\s+/).filter(Boolean).length : 0;

  return cjkMatches.length + westernWords;
}

/**
 * 从单个 PDF 页面 TextContent 中合并出保持排版换行的纯文本
 *
 * @param items 页面文本项列表
 * @returns 保持换行的整页纯文本
 */
export function buildPageTextFromItems(items: any[]): string {
  if (!items || items.length === 0) {
    return '';
  }

  const lineChunks: string[] = [];
  let currentLine = '';

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const str = item.str || '';

    currentLine += str;

    // 若该项显式标记了行尾或者遇到换行符
    if (item.hasEOL || str.endsWith('\n')) {
      lineChunks.push(currentLine.trimEnd());
      currentLine = '';
    }
    else if (i < items.length - 1 && !str.endsWith(' ')) {
      // 若下一个 item 存在且当前无空格，根据相对距离补齐空格
      const nextItem = items[i + 1];
      if (nextItem && nextItem.transform && item.transform) {
        const currentEndX = item.transform[4] + (item.width || 0);
        const nextStartX = nextItem.transform[4];
        if (nextStartX - currentEndX > 2) {
          currentLine += ' ';
        }
      }
    }
  }

  if (currentLine.trim()) {
    lineChunks.push(currentLine.trimEnd());
  }

  return lineChunks.join('\n');
}

/**
 * 解析并提取 PDF 文档的完整元数据与逐页纯文本
 *
 * @param data PDF 二进制缓冲区
 * @returns 包含元数据、逐页文本及全文字数统计的提取结果
 */
export async function extractPdfTextAndMetadata(data: ArrayBuffer | Uint8Array): Promise<PdfExtractResult> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  // 1. 初始化文档载入任务
  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;

  // 2. 提取文档级元数据
  const metaObj = await pdfDoc.getMetadata().catch(() => ({ info: {}, metadata: null }));
  const info: Record<string, any> = metaObj?.info || {};

  let firstPageDimensions = '未知';
  const pages: PdfPageTextItem[] = [];

  // 3. 逐页提取排版文本与尺寸
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    if (pageNum === 1) {
      firstPageDimensions = `${viewport.width.toFixed(1)} × ${viewport.height.toFixed(1)} pt`;
    }

    const textContent = await page.getTextContent();
    const pageText = buildPageTextFromItems(textContent.items);

    pages.push({
      pageNumber: pageNum,
      text: pageText,
      charCount: pageText.length,
      wordCount: countWords(pageText),
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
    });
  }

  // 4. 汇总全文字符与词数
  const allText = pages.map(p => p.text).join('\n\n');
  const totalChars = allText.length;
  const totalWords = pages.reduce((sum, p) => sum + p.wordCount, 0);

  const metadata: PdfDocumentMetadata = {
    title: info.Title || '无标题',
    author: info.Author || '未知作者',
    subject: info.Subject || '无主题',
    keywords: info.Keywords || '无关键字',
    creator: info.Creator || '未知',
    producer: info.Producer || '未知',
    creationDate: formatPdfDate(info.CreationDate),
    modificationDate: formatPdfDate(info.ModDate),
    pdfVersion: info.PDFFormatVersion ? `PDF ${info.PDFFormatVersion}` : '1.7',
    pageCount,
    pageDimensions: firstPageDimensions,
  };

  return {
    metadata,
    pages,
    allText,
    totalChars,
    totalWords,
  };
}
