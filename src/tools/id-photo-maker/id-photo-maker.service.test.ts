/**
 * 证件照制作工坊 (ID Photo Maker) 单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { describe, expect, it } from 'vitest';
import {
  applyBrushToMask,
  applyFeathering,
  calculateColorDistance,
  calculateDownscaleFactor,
  calculatePrintLayout,
  generateToleranceMask,
  getPhotoSpecById,
  hexToRgb,
  mmToPx,
  pxToMm,
  resolveCustomDimensions,
  rgbToHex,
  sampleImageCorners,
  searchOptimalQuality,
} from './id-photo-maker.service';

describe('ID Photo Maker Service', () => {
  describe('物理毫米与像素换算 (mm <-> px)', () => {
    it('标准 25.4 毫米在 300 DPI 下应精确为 300 像素', () => {
      expect(mmToPx(25.4, 300)).toBe(300);
    });

    it('一寸照 25x35mm 在 300 DPI 下应四舍五入为 295x413 像素', () => {
      expect(mmToPx(25, 300)).toBe(295);
      expect(mmToPx(35, 300)).toBe(413);
    });

    it('二寸照 35x49mm 在 300 DPI 下应为 413x579 像素', () => {
      expect(mmToPx(35, 300)).toBe(413);
      expect(mmToPx(49, 300)).toBe(579);
    });

    it('处理零值或负值边界时应安全返回 0', () => {
      expect(mmToPx(0, 300)).toBe(0);
      expect(mmToPx(-10, 300)).toBe(0);
      expect(mmToPx(25, 0)).toBe(0);
      expect(pxToMm(0, 300)).toBe(0);
      expect(pxToMm(-100, 300)).toBe(0);
    });

    it('300 像素在 300 DPI 下反向换算应为 25.4 毫米', () => {
      expect(pxToMm(300, 300)).toBe(25.4);
    });
  });

  describe('规格预设与自定义尺寸解析', () => {
    it('能正确根据 ID 获取内置规格一寸照与二寸照', () => {
      const oneInch = getPhotoSpecById('one-inch');
      expect(oneInch).toBeDefined();
      expect(oneInch?.widthMm).toBe(25);
      expect(oneInch?.heightMm).toBe(35);

      const twoInch = getPhotoSpecById('two-inch');
      expect(twoInch?.widthMm).toBe(35);
      expect(twoInch?.heightMm).toBe(49);
    });

    it('查询不存在的规格 ID 时应返回 undefined', () => {
      expect(getPhotoSpecById('non-existent')).toBeUndefined();
    });

    it('自定义毫米输入时能正确计算出像素值', () => {
      const result = resolveCustomDimensions({
        width: 30,
        height: 40,
        unit: 'mm',
        dpi: 300,
      });
      expect(result.widthMm).toBe(30);
      expect(result.heightMm).toBe(40);
      expect(result.widthPx).toBe(mmToPx(30, 300));
      expect(result.heightPx).toBe(mmToPx(40, 300));
      expect(result.dpi).toBe(300);
    });

    it('自定义像素输入时能正确推导出物理毫米数', () => {
      const result = resolveCustomDimensions({
        width: 600,
        height: 800,
        unit: 'px',
        dpi: 300,
      });
      expect(result.widthPx).toBe(600);
      expect(result.heightPx).toBe(800);
      expect(result.widthMm).toBe(pxToMm(600, 300));
      expect(result.heightMm).toBe(pxToMm(800, 300));
    });
  });

  describe('颜色转换与色距度量', () => {
    it('正确解析 6 位与 3 位十六进制 HEX 颜色', () => {
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#438EDB')).toEqual({ r: 67, g: 142, b: 219 });
      expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('DE1B1B')).toEqual({ r: 222, g: 27, b: 27 });
      expect(hexToRgb('invalid')).toBeNull();
    });

    it('正确格式化 RGB 到十六进制大写字面量', () => {
      expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF');
      expect(rgbToHex(67, 142, 219)).toBe('#438EDB');
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
    });

    it('完全相同颜色的欧几里得距离应为 0', () => {
      const c = { r: 100, g: 150, b: 200 };
      expect(calculateColorDistance(c, c)).toBe(0);
    });

    it('纯黑与纯白的距离应归一化为 100', () => {
      const black = { r: 0, g: 0, b: 0 };
      const white = { r: 255, g: 255, b: 255 };
      expect(Math.round(calculateColorDistance(black, white))).toBe(100);
    });
  });

  describe('四角背景采样与容差蒙版生成', () => {
    it('图像四角采样应能提取出背景纯色', () => {
      const width = 10;
      const height = 10;
      const pixels = new Uint8ClampedArray(width * height * 4);
      // 填充为红色
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 222;
        pixels[i + 1] = 27;
        pixels[i + 2] = 27;
        pixels[i + 3] = 255;
      }

      const sample = sampleImageCorners(pixels, width, height);
      expect(sample).toEqual({ r: 222, g: 27, b: 27 });
    });

    it('基于容差阈值正确剔除背景像素', () => {
      const width = 2;
      const height = 1;
      const pixels = new Uint8ClampedArray(8);
      // 像素 0: 红色背景 (222, 27, 27)
      pixels[0] = 222;
      pixels[1] = 27;
      pixels[2] = 27;
      pixels[3] = 255;
      // 像素 1: 黑色头发前景 (10, 10, 10)
      pixels[4] = 10;
      pixels[5] = 10;
      pixels[6] = 10;
      pixels[7] = 255;

      const mask = generateToleranceMask(pixels, width, height, { r: 222, g: 27, b: 27 }, 15);
      // 红色背景应被清除为 0
      expect(mask[0]).toBe(0);
      // 黑色头发应被保留为 255
      expect(mask[1]).toBe(255);
    });
  });

  describe('边缘羽化与修容画笔涂抹', () => {
    it('羽化半径为 0 时应原样返回蒙版副本', () => {
      const mask = new Uint8Array([0, 255, 0, 255]);
      const feathered = applyFeathering(mask, 2, 2, 0);
      expect(Array.from(feathered)).toEqual([0, 255, 0, 255]);
    });

    it('羽化半径大于 0 时应对阶跃边缘产生平滑过渡', () => {
      const width = 5;
      const height = 5;
      const mask = new Uint8Array(width * height).fill(0);
      mask[12] = 255; // 中心点

      const feathered = applyFeathering(mask, width, height, 1);
      // 中心点值会被扩散平均，周围点被微量提亮
      expect(feathered[12]).toBeLessThan(255);
      expect(feathered[11]).toBeGreaterThan(0);
    });

    it('画笔擦除模式能将目标区域蒙版清零', () => {
      const width = 10;
      const height = 10;
      const mask = new Uint8Array(width * height).fill(255);

      const erased = applyBrushToMask(mask, width, height, 5, 5, 2, 1.0, 'erase');
      expect(erased[5 * width + 5]).toBe(0);
    });

    it('画笔还原模式能将擦除区域恢复为 255', () => {
      const width = 10;
      const height = 10;
      const mask = new Uint8Array(width * height).fill(0);

      const restored = applyBrushToMask(mask, width, height, 5, 5, 2, 1.0, 'restore');
      expect(restored[5 * width + 5]).toBe(255);
    });
  });

  describe('冲印排版几何引擎 (Print Sheet Layout)', () => {
    it('一寸照 (295x413px) 在 6寸横向相纸 (1795x1205px @ 300DPI) 上应能排下 8~9 张', () => {
      const result = calculatePrintLayout(295, 413, {
        paperType: '6-inch',
        orientation: 'landscape',
        gapMm: 2,
        marginMm: 3,
        showCutMarks: true,
        dpi: 300,
      });

      expect(result.cols).toBeGreaterThanOrEqual(4);
      expect(result.rows).toBeGreaterThanOrEqual(2);
      expect(result.totalCount).toBeGreaterThanOrEqual(8);
      expect(result.items.length).toBe(result.totalCount);
      expect(result.cutLines.length).toBeGreaterThan(0);
    });

    it('二寸照 (413x579px) 在 5寸纵向相纸上能正确计算出排版矩阵', () => {
      const result = calculatePrintLayout(413, 579, {
        paperType: '5-inch',
        orientation: 'portrait',
        gapMm: 2,
        marginMm: 3,
        showCutMarks: true,
        dpi: 300,
      });

      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.items.length).toBe(result.totalCount);
    });

    it('当照片尺寸超过相纸可用范围时安全返回空数组', () => {
      const result = calculatePrintLayout(9999, 9999, {
        paperType: '5-inch',
        orientation: 'landscape',
        gapMm: 2,
        marginMm: 3,
        showCutMarks: true,
        dpi: 300,
      });

      expect(result.cols).toBe(0);
      expect(result.rows).toBe(0);
      expect(result.totalCount).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('目标体积二分搜索压缩与下采样兜底', () => {
    it('二分搜索能快速收敛至最贴合且不大于目标上限的最优画质', async () => {
      // 模拟质量越高质量越大的单调字节生成器
      const mockEvaluate = (q: number) => {
        // q in [0.05, 0.98], 模拟字节数 10KB ~ 100KB
        return 10 * 1024 + q * 90 * 1024;
      };

      const targetBytes = 50 * 1024; // 50 KB
      const result = await searchOptimalQuality(mockEvaluate, targetBytes, 0.05, 0.98, 8);

      expect(result.finalBytes).toBeLessThanOrEqual(targetBytes);
      expect(result.iterations).toBeLessThanOrEqual(8);
      expect(result.quality).toBeGreaterThan(0.05);
    });

    it('下采样计算因子在当前字节超标时应返回小于 1.0 的安全缩放比', () => {
      const currentBytes = 100 * 1024;
      const targetBytes = 50 * 1024;
      const factor = calculateDownscaleFactor(currentBytes, targetBytes);

      expect(factor).toBeLessThan(1.0);
      expect(factor).toBeGreaterThanOrEqual(0.2);
    });

    it('当前字节小于等于目标体积时下采样因子应保持 1.0', () => {
      expect(calculateDownscaleFactor(40 * 1024, 50 * 1024)).toBe(1.0);
    });
  });
});
