/**
 * Favicon 纯函数服务单元测试
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync } from 'fflate';
import {
  FAVICON_SPECS,
  createFaviconZipArchive,
  createIcoFile,
  dataUrlToUint8Array,
  generateHtmlHeadSnippet,
  generateWebManifest,
} from './favicon-generator.service';

describe('favicon-generator.service', () => {
  describe('FAVICON_SPECS 预设规格', () => {
    it('应包含标准 6 项网页图标规格', () => {
      expect(FAVICON_SPECS.length).toBe(6);
      const fileNames = FAVICON_SPECS.map(s => s.fileName);
      expect(fileNames).toContain('favicon-16x16.png');
      expect(fileNames).toContain('favicon-32x32.png');
      expect(fileNames).toContain('favicon-48x48.png');
      expect(fileNames).toContain('apple-touch-icon.png');
      expect(fileNames).toContain('android-chrome-192x192.png');
      expect(fileNames).toContain('android-chrome-512x512.png');
    });

    it('16、32、48 像素规格标记为纳入 ICO', () => {
      const icoSpecs = FAVICON_SPECS.filter(s => s.includeInIco);
      expect(icoSpecs.length).toBe(3);
      expect(icoSpecs.map(s => s.width)).toEqual([16, 32, 48]);
    });
  });

  describe('dataUrlToUint8Array', () => {
    it('正确解析 Base64 DataURL', () => {
      // 字符串 "Hello" 的 Base64 为 SGVsbG8=
      const dataUrl = 'data:image/png;base64,SGVsbG8=';
      const bytes = dataUrlToUint8Array(dataUrl);
      expect(strFromU8(bytes)).toBe('Hello');
    });
  });

  describe('createIcoFile', () => {
    it('空列表输入应抛出错误', () => {
      expect(() => createIcoFile([])).toThrow('图标列表为空');
    });

    it('正确生成多层 ICO 二进制结构', () => {
      const fakePng16 = new Uint8Array([1, 2, 3, 4]);
      const fakePng32 = new Uint8Array([5, 6, 7, 8, 9]);

      const ico = createIcoFile([
        { width: 16, height: 16, pngBytes: fakePng16 },
        { width: 32, height: 32, pngBytes: fakePng32 },
      ]);

      const view = new DataView(ico.buffer);

      // 1. 验证 ICONDIR 头部 (6 字节)
      expect(view.getUint16(0, true)).toBe(0); // Reserved
      expect(view.getUint16(2, true)).toBe(1); // Type = 1 (ICO)
      expect(view.getUint16(4, true)).toBe(2); // Count = 2

      // 2. 验证第一个条目 (16x16)
      expect(view.getUint8(6)).toBe(16); // Width
      expect(view.getUint8(7)).toBe(16); // Height
      expect(view.getUint16(10, true)).toBe(1); // Planes = 1
      expect(view.getUint16(12, true)).toBe(32); // BPP = 32
      expect(view.getUint32(14, true)).toBe(4); // Length = 4
      const offset1 = view.getUint32(18, true);
      expect(offset1).toBe(6 + 2 * 16); // 38

      // 3. 验证第二个条目 (32x32)
      const entry2 = 6 + 16;
      expect(view.getUint8(entry2)).toBe(32);
      expect(view.getUint8(entry2 + 1)).toBe(32);
      expect(view.getUint32(entry2 + 8, true)).toBe(5); // Length = 5
      const offset2 = view.getUint32(entry2 + 12, true);
      expect(offset2).toBe(offset1 + 4);

      // 4. 验证实际数据片段
      expect(Array.from(ico.slice(offset1, offset1 + 4))).toEqual([1, 2, 3, 4]);
      expect(Array.from(ico.slice(offset2, offset2 + 5))).toEqual([5, 6, 7, 8, 9]);
    });
  });

  describe('generateHtmlHeadSnippet', () => {
    it('包含标准 link 标签', () => {
      const html = generateHtmlHeadSnippet();
      expect(html).toContain('<link rel="icon" type="image/x-icon" href="/favicon.ico">');
      expect(html).toContain('apple-touch-icon');
      expect(html).toContain('site.webmanifest');
    });
  });

  describe('generateWebManifest', () => {
    it('生成合法的 JSON 配置', () => {
      const manifestStr = generateWebManifest({
        appName: '我的专属工具箱',
        shortName: '工具箱',
        themeColor: '#18a058',
      });
      const parsed = JSON.parse(manifestStr);
      expect(parsed.name).toBe('我的专属工具箱');
      expect(parsed.short_name).toBe('工具箱');
      expect(parsed.theme_color).toBe('#18a058');
      expect(parsed.icons.length).toBe(2);
      expect(parsed.icons[0].sizes).toBe('192x192');
      expect(parsed.icons[1].sizes).toBe('512x512');
    });
  });

  describe('createFaviconZipArchive', () => {
    it('空字典应抛出异常', () => {
      expect(() => createFaviconZipArchive({})).toThrow('打包文件列表为空');
    });

    it('成功生成可解压的 ZIP 包', () => {
      const files: Record<string, Uint8Array> = {
        'favicon.ico': new Uint8Array([1, 2, 3]),
        'README.txt': strToU8('Favicon Pack'),
      };
      const zipBytes = createFaviconZipArchive(files);
      expect(zipBytes.length).toBeGreaterThan(0);

      // 解压验证
      const unzipped = unzipSync(zipBytes);
      expect(Object.keys(unzipped)).toContain('favicon.ico');
      expect(Object.keys(unzipped)).toContain('README.txt');
      expect(strFromU8(unzipped['README.txt'])).toBe('Favicon Pack');
    });
  });
});
