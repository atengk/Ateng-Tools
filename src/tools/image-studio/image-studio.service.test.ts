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
  calculateTransformedDimensions,
  clampCropRegion,
  clampDimension,
  generateExportFileName,
  getAspectRatioValue,
  getFormatExtension,
  normalizeRotationAngle,
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

  describe('normalizeRotationAngle 与 calculateTransformedDimensions 几何旋转变换', () => {
    it('正确规范化旋转角度至 0/90/180/270', () => {
      expect(normalizeRotationAngle(0)).toBe(0);
      expect(normalizeRotationAngle(90)).toBe(90);
      expect(normalizeRotationAngle(360)).toBe(0);
      expect(normalizeRotationAngle(450)).toBe(90);
      expect(normalizeRotationAngle(-90)).toBe(270);
      expect(normalizeRotationAngle(-180)).toBe(180);
    });

    it('0° 与 180° 保持原始画面宽高', () => {
      const dim0 = calculateTransformedDimensions(1920, 1080, 0);
      expect(dim0.width).toBe(1920);
      expect(dim0.height).toBe(1080);

      const dim180 = calculateTransformedDimensions(1920, 1080, 180);
      expect(dim180.width).toBe(1920);
      expect(dim180.height).toBe(1080);
    });

    it('90° 与 270° 正确对调宽高尺寸', () => {
      const dim90 = calculateTransformedDimensions(1920, 1080, 90);
      expect(dim90.width).toBe(1080);
      expect(dim90.height).toBe(1920);

      const dim270 = calculateTransformedDimensions(1920, 1080, 270);
      expect(dim270.width).toBe(1080);
      expect(dim270.height).toBe(1920);
    });
  });

  describe('clampCropRegion 裁剪区域坐标安全约束', () => {
    it('将正常裁剪选区保留在原边界内', () => {
      const crop = clampCropRegion({ x: 50, y: 50, width: 400, height: 300 }, 1000, 800);
      expect(crop).toEqual({ x: 50, y: 50, width: 400, height: 300 });
    });

    it('自动截断超出图片右侧与底部的选区', () => {
      const crop = clampCropRegion({ x: 800, y: 600, width: 500, height: 400 }, 1000, 800);
      expect(crop.x).toBe(800);
      expect(crop.y).toBe(600);
      expect(crop.width).toBe(200); // 1000 - 800
      expect(crop.height).toBe(200); // 800 - 600
    });

    it('将负数起点归零', () => {
      const crop = clampCropRegion({ x: -100, y: -50, width: 300, height: 200 }, 1000, 800);
      expect(crop.x).toBe(0);
      expect(crop.y).toBe(0);
      expect(crop.width).toBe(300);
      expect(crop.height).toBe(200);
    });
  });

  describe('getAspectRatioValue 预设裁剪比例解析', () => {
    it('准确返回各预设比例值', () => {
      expect(getAspectRatioValue('free')).toBeNull();
      expect(getAspectRatioValue('1:1')).toBe(1.0);
      expect(getAspectRatioValue('16:9')).toBeCloseTo(1.777, 2);
      expect(getAspectRatioValue('4:3')).toBeCloseTo(1.333, 2);
      expect(getAspectRatioValue('3:2')).toBe(1.5);
      expect(getAspectRatioValue('2:1')).toBe(2.0);
    });
  });
});

