/**
 * 图片转 PDF 服务层单元测试
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { describe, expect, it } from 'vitest';
import { PDFDocument } from '@cantoo/pdf-lib';
import { calculatePageLayout, convertImagesToPdf, isJpegBytes } from './image-to-pdf.service';
import type { ImageSourceItem } from './image-to-pdf.types';

// 1x1 纯透明标准 PNG 样例字节
const SAMPLE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SAMPLE_PNG_BYTES = Uint8Array.from(Buffer.from(SAMPLE_PNG_BASE64, 'base64'));

describe('image-to-pdf.service', () => {
  describe('isJpegBytes', () => {
    it('正确识别 JPEG 魔数字节头', () => {
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00]);
      expect(isJpegBytes(jpegBytes)).toBe(true);
    });

    it('对 PNG 或普通字节返回 false', () => {
      expect(isJpegBytes(SAMPLE_PNG_BYTES)).toBe(false);
      expect(isJpegBytes(new Uint8Array([0x00, 0x00]))).toBe(false);
    });
  });

  describe('calculatePageLayout', () => {
    it('对于 A4 纵向排版，页面尺寸应为 595.28 × 841.89', () => {
      const layout = calculatePageLayout(400, 300, 'a4', 'portrait', 'none');
      expect(layout.pageWidth).toBeCloseTo(595.28, 1);
      expect(layout.pageHeight).toBeCloseTo(841.89, 1);
      expect(layout.drawX).toBeGreaterThanOrEqual(0);
      expect(layout.drawY).toBeGreaterThanOrEqual(0);
    });

    it('对于 A4 横向排版，纸张长边应作为宽度', () => {
      const layout = calculatePageLayout(400, 300, 'a4', 'landscape', 'none');
      expect(layout.pageWidth).toBeCloseTo(841.89, 1);
      expect(layout.pageHeight).toBeCloseTo(595.28, 1);
    });

    it('自动适应方向：横向宽图应自适应横版，纵向高图自适应竖版', () => {
      const landscapeLayout = calculatePageLayout(800, 400, 'a4', 'auto', 'none');
      expect(landscapeLayout.pageWidth).toBeGreaterThan(landscapeLayout.pageHeight);

      const portraitLayout = calculatePageLayout(400, 800, 'a4', 'auto', 'none');
      expect(portraitLayout.pageHeight).toBeGreaterThan(portraitLayout.pageWidth);
    });

    it('边距设置应正确缩减可用绘制区域', () => {
      const noMargin = calculatePageLayout(100, 100, 'a4', 'portrait', 'none');
      const withMargin = calculatePageLayout(100, 100, 'a4', 'portrait', 'small');

      expect(withMargin.drawX).toBeGreaterThan(noMargin.drawX);
      expect(withMargin.drawY).toBeGreaterThan(noMargin.drawY);
    });

    it('自适应图片尺寸 (fit) 应以原始图像宽高加边距为纸张规格', () => {
      const layout = calculatePageLayout(320, 240, 'fit', 'auto', 'none');
      expect(layout.pageWidth).toBe(320);
      expect(layout.pageHeight).toBe(240);
      expect(layout.drawWidth).toBe(320);
      expect(layout.drawHeight).toBe(240);
    });
  });

  describe('convertImagesToPdf', () => {
    it('当图片列表为空时应抛出提示异常', async () => {
      await expect(
        convertImagesToPdf([], {
          format: 'a4',
          orientation: 'auto',
          margin: 'none',
        }),
      ).rejects.toThrow('请至少选择一张图片以合成 PDF');
    });

    it('成功合成多张图片为 PDF 文档并生成正确页数', async () => {
      const images: ImageSourceItem[] = [
        {
          id: '1',
          name: 'page1.png',
          type: 'image/png',
          bytes: SAMPLE_PNG_BYTES,
        },
        {
          id: '2',
          name: 'page2.png',
          type: 'image/png',
          bytes: SAMPLE_PNG_BYTES,
        },
      ];

      const result = await convertImagesToPdf(images, {
        format: 'a4',
        orientation: 'auto',
        margin: 'small',
        customFileName: '我的合成相册',
      });

      expect(result.pageCount).toBe(2);
      expect(result.fileName).toBe('我的合成相册.pdf');
      expect(result.bytes).toBeInstanceOf(Uint8Array);
      expect(result.fileSize).toBeGreaterThan(0);

      // 验证生成的 PDF 可以被有效解析
      const doc = await PDFDocument.load(result.bytes);
      expect(doc.getPageCount()).toBe(2);
    });
  });
});
