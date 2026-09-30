/**
 * PDF 转图片与 ZIP 归档服务单测
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { buildImageFileName, createZipArchive, getImageMimeType } from './pdf-to-image.service';

describe('pdf-to-image.service', () => {
  describe('getImageMimeType', () => {
    it('正确映射不同格式至标准 MIME 类型', () => {
      expect(getImageMimeType('png')).toBe('image/png');
      expect(getImageMimeType('jpeg')).toBe('image/jpeg');
      expect(getImageMimeType('webp')).toBe('image/webp');
    });
  });

  describe('buildImageFileName', () => {
    it('对于小于 10 页的文档，页码应补充两位零填充', () => {
      const name = buildImageFileName('我的合同.pdf', 3, 8, 'png');
      expect(name).toBe('我的合同_第03页.png');
    });

    it('对于大于 100 页的文档，页码应根据总位数动态自适应零填充', () => {
      const name = buildImageFileName('技术规格书', 5, 250, 'png');
      expect(name).toBe('技术规格书_第005页.png');
    });

    it('jpeg 格式的扩展名应规范映射为 .jpg', () => {
      const name = buildImageFileName('报告.pdf', 1, 1, 'jpeg');
      expect(name).toBe('报告_第01页.jpg');
    });

    it('webp 格式的扩展名应为 .webp', () => {
      const name = buildImageFileName('图册.pdf', 2, 5, 'webp');
      expect(name).toBe('图册_第02页.webp');
    });

    it('当输入空文件名时应提供合理的文档基名兜底', () => {
      const name = buildImageFileName('', 1, 1, 'png');
      expect(name).toBe('文档_第01页.png');
    });
  });

  describe('createZipArchive', () => {
    it('当输入空文件字典时应抛出错误拦截', async () => {
      await expect(createZipArchive({})).rejects.toThrow('归档文件列表为空');
    });

    it('在浏览器内存中正确打包生成 ZIP 压缩包并可被成功解压还原', async () => {
      const mockFiles: Record<string, Uint8Array> = {
        'page_01.png': new Uint8Array([10, 20, 30, 40]),
        'page_02.png': new Uint8Array([50, 60, 70, 80]),
      };

      const zipBytes = await createZipArchive(mockFiles);
      expect(zipBytes).toBeInstanceOf(Uint8Array);
      expect(zipBytes.length).toBeGreaterThan(0);

      // 解压验证内容完整性
      const unzipped = unzipSync(zipBytes);
      expect(Object.keys(unzipped)).toContain('page_01.png');
      expect(Object.keys(unzipped)).toContain('page_02.png');
      expect(Array.from(unzipped['page_01.png'])).toEqual([10, 20, 30, 40]);
      expect(Array.from(unzipped['page_02.png'])).toEqual([50, 60, 70, 80]);
    });
  });
});
