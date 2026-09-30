/**
 * Image Studio 业务服务单元测试
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { describe, expect, it } from 'vitest';
import {
  calculateDimensionsByHeight,
  calculateDimensionsByPercentage,
  calculateDimensionsByWidth,
  clampDimension,
  generateExportFileName,
  getFormatExtension,
} from './image-studio.service';
import { MAX_SAFE_IMAGE_DIMENSION, MIN_SAFE_IMAGE_DIMENSION } from './image-studio.types';

describe('image-studio.service', () => {
  describe('clampDimension 尺寸安全钳位防御', () => {
    it('正确将合法数值四舍五入保留在安全区间内', () => {
      expect(clampDimension(1920.4)).toBe(1920);
      expect(clampDimension(1080.8)).toBe(1081);
    });

    it('将超出 8192px 的超大尺寸截断至安全上限', () => {
      expect(clampDimension(9999)).toBe(MAX_SAFE_IMAGE_DIMENSION);
      expect(clampDimension(100000)).toBe(MAX_SAFE_IMAGE_DIMENSION);
    });

    it('将小于 1 的负数、0 与非法 NaN 转换为安全下限 1', () => {
      expect(clampDimension(0)).toBe(MIN_SAFE_IMAGE_DIMENSION);
      expect(clampDimension(-500)).toBe(MIN_SAFE_IMAGE_DIMENSION);
      expect(clampDimension(Number.NaN)).toBe(MIN_SAFE_IMAGE_DIMENSION);
      expect(clampDimension(Number.POSITIVE_INFINITY)).toBe(MIN_SAFE_IMAGE_DIMENSION);
    });
  });

  describe('calculateDimensionsByWidth 根据目标宽度计算等比尺寸', () => {
    it('标准 16:9 比例图像准确计算高度', () => {
      const { width, height } = calculateDimensionsByWidth(1280, 16 / 9);
      expect(width).toBe(1280);
      expect(height).toBe(720);
    });

    it('正方形 1:1 图像保持宽高一致', () => {
      const { width, height } = calculateDimensionsByWidth(500, 1);
      expect(width).toBe(500);
      expect(height).toBe(500);
    });

    it('面对异常非正比例安全降级', () => {
      const { width, height } = calculateDimensionsByWidth(800, 0);
      expect(width).toBe(800);
      expect(height).toBe(800);
    });
  });

  describe('calculateDimensionsByHeight 根据目标高度计算等比尺寸', () => {
    it('标准 16:9 比例图像准确计算宽度', () => {
      const { width, height } = calculateDimensionsByHeight(720, 16 / 9);
      expect(width).toBe(1280);
      expect(height).toBe(720);
    });

    it('纵向 9:16 移动端海报比例准确计算宽度', () => {
      const { width, height } = calculateDimensionsByHeight(1920, 9 / 16);
      expect(width).toBe(1080);
      expect(height).toBe(1920);
    });
  });

  describe('calculateDimensionsByPercentage 按百分比快捷缩放', () => {
    it('正确计算 50% 缩放', () => {
      const { width, height } = calculateDimensionsByPercentage(1920, 1080, 50);
      expect(width).toBe(960);
      expect(height).toBe(540);
    });

    it('正确计算 25% 缩放', () => {
      const { width, height } = calculateDimensionsByPercentage(800, 400, 25);
      expect(width).toBe(200);
      expect(height).toBe(100);
    });

    it('正确计算 200% 放大并受 8192px 上限保护', () => {
      const { width, height } = calculateDimensionsByPercentage(5000, 3000, 200);
      expect(width).toBe(MAX_SAFE_IMAGE_DIMENSION); // 10000 被截断至 8192
      expect(height).toBe(6000);
    });
  });

  describe('getFormatExtension 与 generateExportFileName 导出文件名生成', () => {
    it('正确获取各格式的标准扩展名', () => {
      expect(getFormatExtension('image/png')).toBe('png');
      expect(getFormatExtension('image/jpeg')).toBe('jpg');
      expect(getFormatExtension('image/webp')).toBe('webp');
    });

    it('生成带后缀的标准导出文件名', () => {
      expect(generateExportFileName('avatar.png', 'image/webp')).toBe('avatar_resized.webp');
      expect(generateExportFileName('banner.jpeg', 'image/jpeg', 'compressed')).toBe('banner_compressed.jpg');
      expect(generateExportFileName('', 'image/png', 'output')).toBe('image_output.png');
    });
  });
});
