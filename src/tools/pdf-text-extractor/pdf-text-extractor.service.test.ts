/**
 * 针对 PDF 文本与元数据提取核心业务逻辑的单元测试
 *
 * @author Ateng
 * @since 2026-09-30
 */

import { createRequire } from 'module';
import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  buildPageTextFromItems,
  countWords,
  extractPdfTextAndMetadata,
  formatPdfDate,
  getPdfjs,
} from './pdf-text-extractor.service';

const require = createRequire(import.meta.url);

describe('pdf-text-extractor.service', () => {
  beforeAll(() => {
    const pdfjs = getPdfjs();
    pdfjs.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.js');
  });

  describe('formatPdfDate', () => {
    it('能够正确解析带 D: 前缀的标准 UTC 时间', () => {
      const res = formatPdfDate('D:20260930114924Z');
      expect(res).toBe('2026-09-30 11:49:24');
    });

    it('能够处理带有时区偏移的时长格式', () => {
      const res = formatPdfDate("D:20231209083000+08'00'");
      expect(res).toBe('2023-12-09 08:30:00');
    });

    it('空值或无法匹配时能够优雅回退兜底', () => {
      expect(formatPdfDate(null)).toBe('未知');
      expect(formatPdfDate('')).toBe('未知');
      expect(formatPdfDate('invalid-date')).toBe('invalid-date');
    });
  });

  describe('countWords', () => {
    it('正确计算中英文混合词数', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
      expect(countWords('Hello World')).toBe(2);
      expect(countWords('你好世界')).toBe(4);
      expect(countWords('Hello 你好 World 世界')).toBe(6);
    });
  });

  describe('buildPageTextFromItems', () => {
    it('能够按行末标识正确插入换行符', () => {
      const items = [
        { str: '第一行文本', hasEOL: true },
        { str: '第二行内容', hasEOL: false },
        { str: '追加文本', hasEOL: true },
      ];

      const text = buildPageTextFromItems(items);
      expect(text).toBe('第一行文本\n第二行内容追加文本');
    });

    it('空项输入返回空字符串', () => {
      expect(buildPageTextFromItems([])).toBe('');
    });
  });

  describe('extractPdfTextAndMetadata', () => {
    it('能够从真实 PDF 二进制流中完整提取文档元数据与分页文本', async () => {
      // 1. 利用 pdf-lib 在内存中动态创建测试文档
      const doc = await PDFDocument.create();
      doc.setTitle('自动化测试说明书');
      doc.setAuthor('Ateng');
      doc.setSubject('单测');
      doc.setKeywords(['测试', 'PDF', '提取']);

      // 页面 1
      const page1 = doc.addPage([500, 700]);
      page1.drawText('Page 1 Content Line 1', { x: 50, y: 650 });

      // 页面 2
      const page2 = doc.addPage([600, 800]);
      page2.drawText('Page 2 Another Text', { x: 50, y: 750 });

      const pdfBytes = await doc.save();

      // 2. 调用提取服务
      const result = await extractPdfTextAndMetadata(pdfBytes);

      // 3. 验证元数据
      expect(result.metadata.title).toBe('自动化测试说明书');
      expect(result.metadata.author).toBe('Ateng');
      expect(result.metadata.subject).toBe('单测');
      expect(result.metadata.pageCount).toBe(2);
      expect(result.metadata.pageDimensions).toContain('500.0 × 700.0 点');

      // 4. 验证逐页提取
      expect(result.pages.length).toBe(2);
      expect(result.pages[0].pageNumber).toBe(1);
      expect(result.pages[0].text).toContain('Page 1 Content Line 1');
      expect(result.pages[1].pageNumber).toBe(2);
      expect(result.pages[1].text).toContain('Page 2 Another Text');

      // 5. 验证全文统计
      expect(result.totalChars).toBeGreaterThan(0);
      expect(result.totalWords).toBeGreaterThan(0);
      expect(result.allText).toContain('Page 1 Content Line 1');
      expect(result.allText).toContain('Page 2 Another Text');
    });
  });
});
