/**
 * Image Studio 业务服务单元测试
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { describe, expect, it } from 'vitest';
import {
  calculateAnchorPosition,
  calculateDimensionsByHeight,
  calculateDimensionsByPercentage,
  calculateDimensionsByWidth,
  calculateTransformedDimensions,
  clampCropRegion,
  clampDimension,
  createIcoBinary,
  DIMENSION_PRESETS,
  extractColorPaletteFromImageData,
  formatExifSummary,
  generateExportFileName,
  getAspectRatioValue,
  getFormatExtension,
  normalizeRotationAngle,
  parseExifMetadata,
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

  describe('calculateAnchorPosition 九宫格锚点坐标定位算法', () => {
    const canvasW = 1000;
    const canvasH = 800;
    const itemW = 200;
    const itemH = 100;
    const margin = 20;

    it('正确计算顶部 3 个锚点 (top-left, top-center, top-right)', () => {
      expect(calculateAnchorPosition(canvasW, canvasH, itemW, itemH, 'top-left', margin)).toEqual({
        x: 20,
        y: 20,
      });
      expect(calculateAnchorPosition(canvasW, canvasH, itemW, itemH, 'top-center', margin)).toEqual({
        x: 400, // (1000 - 200) / 2
        y: 20,
      });
      expect(calculateAnchorPosition(canvasW, canvasH, itemW, itemH, 'top-right', margin)).toEqual({
        x: 780, // 1000 - 200 - 20
        y: 20,
      });
    });

    it('正确计算中部 3 个锚点 (middle-left, center, middle-right)', () => {
      expect(calculateAnchorPosition(canvasW, canvasH, itemW, itemH, 'middle-left', margin)).toEqual({
        x: 20,
        y: 350, // (800 - 100) / 2
      });
      expect(calculateAnchorPosition(canvasW, canvasH, itemW, itemH, 'center', margin)).toEqual({
        x: 400,
        y: 350,
      });
      expect(calculateAnchorPosition(canvasW, canvasH, itemW, itemH, 'middle-right', margin)).toEqual({
        x: 780,
        y: 350,
      });
    });

    it('正确计算底部 3 个锚点 (bottom-left, bottom-center, bottom-right)', () => {
      expect(calculateAnchorPosition(canvasW, canvasH, itemW, itemH, 'bottom-left', margin)).toEqual({
        x: 20,
        y: 680, // 800 - 100 - 20
      });
      expect(calculateAnchorPosition(canvasW, canvasH, itemW, itemH, 'bottom-center', margin)).toEqual({
        x: 400,
        y: 680,
      });
      expect(calculateAnchorPosition(canvasW, canvasH, itemW, itemH, 'bottom-right', margin)).toEqual({
        x: 780,
        y: 680,
      });
    });
  });

  describe('parseExifMetadata EXIF 隐私元数据二进制解析', () => {
    it('对于过短或空的二进制数据，安全返回 hasData: false 且零崩溃', () => {
      expect(parseExifMetadata(new ArrayBuffer(0))).toEqual({ hasData: false });
      expect(parseExifMetadata(new ArrayBuffer(10))).toEqual({ hasData: false });
    });

    it('对于普通非 JPEG / 非 TIFF 二进制数据，安全返回 hasData: false', () => {
      const buffer = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(parseExifMetadata(buffer)).toEqual({ hasData: false });
    });

    it('对于标准含有 APP1 EXIF 段的 JPEG 数据，正确提取相机厂商、型号、ISO 与拍摄时间', () => {
      const buffer = new ArrayBuffer(512);
      const view = new DataView(buffer);

      // 1. JPEG SOI
      view.setUint8(0, 0xFF);
      view.setUint8(1, 0xD8);

      // 2. APP1 Marker (0xFFE1)
      view.setUint8(2, 0xFF);
      view.setUint8(3, 0xE1);
      view.setUint16(4, 500, false); // 段长度

      // 3. "Exif\0\0"
      view.setUint8(6, 0x45); // 'E'
      view.setUint8(7, 0x78); // 'x'
      view.setUint8(8, 0x69); // 'i'
      view.setUint8(9, 0x66); // 'f'
      view.setUint8(10, 0x00);
      view.setUint8(11, 0x00);

      // TIFF 头部从 offset 12 开始
      const tiffStart = 12;
      // 'II' (Little-Endian)
      view.setUint8(tiffStart, 0x49);
      view.setUint8(tiffStart + 1, 0x49);
      // Magic 42
      view.setUint16(tiffStart + 2, 42, true);
      // IFD0 偏移量：8
      view.setUint32(tiffStart + 4, 8, true);

      // IFD0 位于 tiffStart + 8 (20)
      const ifd0 = tiffStart + 8;
      view.setUint16(ifd0, 3, true); // 3 个 entries

      // Entry 1: 0x010F Make ("Sony\0")
      view.setUint16(ifd0 + 2, 0x010F, true);
      view.setUint16(ifd0 + 4, 2, true); // ASCII
      view.setUint32(ifd0 + 6, 5, true); // count 5
      view.setUint32(ifd0 + 10, 80, true); // 偏移量相对 tiffStart = 80
      const makeStr = 'Sony\0';
      for (let i = 0; i < makeStr.length; i++) {
        view.setUint8(tiffStart + 80 + i, makeStr.charCodeAt(i));
      }

      // Entry 2: 0x0110 Model ("A7M4\0")
      view.setUint16(ifd0 + 14, 0x0110, true);
      view.setUint16(ifd0 + 16, 2, true); // ASCII
      view.setUint32(ifd0 + 18, 5, true);
      view.setUint32(ifd0 + 22, 90, true); // 偏移量相对 tiffStart = 90
      const modelStr = 'A7M4\0';
      for (let i = 0; i < modelStr.length; i++) {
        view.setUint8(tiffStart + 90 + i, modelStr.charCodeAt(i));
      }

      // Entry 3: 0x8769 ExifIFDPointer
      view.setUint16(ifd0 + 26, 0x8769, true);
      view.setUint16(ifd0 + 28, 4, true); // LONG
      view.setUint32(ifd0 + 30, 1, true);
      view.setUint32(ifd0 + 34, 120, true); // 偏移量相对 tiffStart = 120

      // Exif SubIFD 位于 tiffStart + 120
      const exifSub = tiffStart + 120;
      view.setUint16(exifSub, 2, true); // 2 entries

      // SubEntry 1: 0x8827 ISO = 800 (SHORT)
      view.setUint16(exifSub + 2, 0x8827, true);
      view.setUint16(exifSub + 4, 3, true); // SHORT
      view.setUint32(exifSub + 6, 1, true);
      view.setUint16(exifSub + 10, 800, true); // inline 存储值

      // SubEntry 2: 0x9003 DateTimeOriginal ("2026:09:30 18:00:00\0")
      view.setUint16(exifSub + 14, 0x9003, true);
      view.setUint16(exifSub + 16, 2, true); // ASCII
      view.setUint32(exifSub + 18, 20, true);
      view.setUint32(exifSub + 22, 160, true); // 偏移量相对 tiffStart = 160
      const dateStr = '2026:09:30 18:00:00\0';
      for (let i = 0; i < dateStr.length; i++) {
        view.setUint8(tiffStart + 160 + i, dateStr.charCodeAt(i));
      }

      const res = parseExifMetadata(buffer);
      expect(res.hasData).toBe(true);
      expect(res.make).toBe('Sony');
      expect(res.model).toBe('A7M4');
      expect(res.iso).toBe(800);
      expect(res.dateTimeOriginal).toBe('2026:09:30 18:00:00');
    });

    it('formatExifSummary 对空数据生成友好安全提示', () => {
      const summary = formatExifSummary({ hasData: false });
      expect(summary).toContain('未检测到任何相机与拍摄信息');
    });

    it('formatExifSummary 对完整数据格式化生成多类别报告', () => {
      const summary = formatExifSummary({
        hasData: true,
        make: 'Apple',
        model: 'iPhone 15 Pro',
        exposureTime: '1/120s',
        fNumber: 'f/1.8',
        iso: 100,
        gps: {
          formattedCoords: '39.9042° N, 116.4074° E',
          altitude: 45.2,
        },
      });
      expect(summary).toContain('【设备与器材】');
      expect(summary).toContain('设备厂商：Apple');
      expect(summary).toContain('相机型号：iPhone 15 Pro');
      expect(summary).toContain('【曝光与参数】');
      expect(summary).toContain('快门速度：1/120s');
      expect(summary).toContain('【GPS 地理位置 (敏感隐私)】');
      expect(summary).toContain('经纬度：39.9042° N, 116.4074° E');
    });
  });

  describe('extractColorPaletteFromImageData 主题调色板提取纯函数', () => {
    it('对空像素数组或零像素返回空数组', () => {
      expect(extractColorPaletteFromImageData([], 0)).toEqual([]);
      expect(extractColorPaletteFromImageData(new Uint8ClampedArray(0), 0)).toEqual([]);
    });

    it('对纯透明图像像素返回空数组', () => {
      // 4 个像素，每个 alpha 为 0
      const transparentData = [
        255, 0, 0, 0,
        0, 255, 0, 50,
        0, 0, 255, 100,
        100, 100, 100, 80,
      ];
      expect(extractColorPaletteFromImageData(transparentData, 4)).toEqual([]);
    });

    it('对纯单色图像提取出准确颜色代码与 100% 占比', () => {
      // 10 个纯红像素 (255, 0, 0, 255)
      const redPixels: number[] = [];
      for (let i = 0; i < 10; i++) {
        redPixels.push(255, 0, 0, 255);
      }
      const palette = extractColorPaletteFromImageData(redPixels, 10, 6);
      expect(palette.length).toBe(1);
      // 15-bit 量化后的纯红通道值为 255
      expect(palette[0].r).toBe(255);
      expect(palette[0].g).toBe(0);
      expect(palette[0].b).toBe(0);
      expect(palette[0].hex).toBe('#FF0000');
      expect(palette[0].rgb).toBe('rgb(255, 0, 0)');
      expect(palette[0].percentage).toBe(100);
      expect(palette[0].textColor).toBe('#FFFFFF');
    });

    it('对包含红、蓝两种主色彩的图像提取出互斥的色彩且具备高对比文本色', () => {
      const mixedPixels: number[] = [];
      // 60 个纯红 (255, 0, 0, 255)
      for (let i = 0; i < 60; i++) {
        mixedPixels.push(255, 0, 0, 255);
      }
      // 40 个纯蓝 (0, 0, 255, 255)
      for (let i = 0; i < 40; i++) {
        mixedPixels.push(0, 0, 255, 255);
      }
      const palette = extractColorPaletteFromImageData(mixedPixels, 100, 6);
      expect(palette.length).toBe(2);
      expect(palette.map(p => p.hex)).toContain('#FF0000');
      expect(palette.map(p => p.hex)).toContain('#0000FF');
      expect(palette[0].percentage + palette[1].percentage).toBeCloseTo(100, 0);
    });

    it('多色彩图像能提取出 6 种主导代表色彩并计算百分比', () => {
      const multiPixels: number[] = [];
      // 生成 6 种完全不同色彩的像素块
      const colors = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],
        [255, 0, 255],
        [0, 255, 255],
      ];
      for (const [r, g, b] of colors) {
        for (let i = 0; i < 20; i++) {
          multiPixels.push(r, g, b, 255);
        }
      }

      const palette = extractColorPaletteFromImageData(multiPixels, 120, 6);
      expect(palette.length).toBe(6);
      palette.forEach((color) => {
        expect(color.hex).toMatch(/^#[0-9A-F]{6}$/);
        expect(color.rgb).toMatch(/^rgb\(\d+,\s*\d+,\s*\d+\)$/);
        expect(color.percentage).toBeGreaterThan(0);
        expect(['#000000', '#FFFFFF']).toContain(color.textColor);
      });
    });
  });

  describe('createIcoBinary Windows Favicon 二进制打包算法', () => {
    it('正确生成合法标准的 ICO 二进制结构 (包含魔数 0x0000、0x0001 与条目目录)', () => {
      // 模拟 16x16 与 32x32 两帧 PNG 数据
      const png16 = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]); // 12 字节
      const png32 = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 5, 6, 7, 8, 9, 10]); // 14 字节

      const icoBytes = createIcoBinary([
        { width: 16, height: 16, data: png16 },
        { width: 32, height: 32, data: png32 },
      ]);

      expect(icoBytes).toBeInstanceOf(Uint8Array);
      // 总长度：ICONDIR(6) + 2 * ICONDIRENTRY(16) + 12 + 14 = 38 + 26 = 64 字节
      expect(icoBytes.byteLength).toBe(6 + 2 * 16 + 12 + 14);

      const view = new DataView(icoBytes.buffer);

      // 验证 ICONDIR
      expect(view.getUint16(0, true)).toBe(0); // idReserved
      expect(view.getUint16(2, true)).toBe(1); // idType (1 = ICO)
      expect(view.getUint16(4, true)).toBe(2); // idCount (2 帧)

      // 验证第 1 帧 ICONDIRENTRY (offset 6)
      expect(view.getUint8(6)).toBe(16); // width
      expect(view.getUint8(7)).toBe(16); // height
      expect(view.getUint8(8)).toBe(0); // colorCount
      expect(view.getUint16(10, true)).toBe(1); // planes
      expect(view.getUint16(12, true)).toBe(32); // bitCount
      expect(view.getUint32(14, true)).toBe(12); // bytes in res
      expect(view.getUint32(18, true)).toBe(38); // dwImageOffset (6 + 32 = 38)

      // 验证第 2 帧 ICONDIRENTRY (offset 22)
      expect(view.getUint8(22)).toBe(32); // width
      expect(view.getUint8(23)).toBe(32); // height
      expect(view.getUint32(30, true)).toBe(14); // bytes in res
      expect(view.getUint32(34, true)).toBe(50); // dwImageOffset (38 + 12 = 50)

      // 验证数据无损嵌入
      expect(icoBytes.slice(38, 50)).toEqual(png16);
      expect(icoBytes.slice(50, 64)).toEqual(png32);
    });

    it('当传入 256px 尺寸时，目录条目宽度和高度规范写入 0 (Windows 规范)', () => {
      const dummy = new Uint8Array([1, 2, 3]);
      const icoBytes = createIcoBinary([{ width: 256, height: 256, data: dummy }]);
      const view = new DataView(icoBytes.buffer);
      expect(view.getUint8(6)).toBe(0); // 256px 对应写入 0
      expect(view.getUint8(7)).toBe(0);
    });

    it('若传入空数组，抛出友好的错误提示', () => {
      expect(() => createIcoBinary([])).toThrow('ICO 生成失败');
    });
  });

  describe('DIMENSION_PRESETS 与格式支持', () => {
    it('getFormatExtension 支持 image/x-icon 扩展名 ico', () => {
      expect(getFormatExtension('image/x-icon')).toBe('ico');
    });

    it('DIMENSION_PRESETS 包含主流开发与社交媒体尺寸且数据完备', () => {
      expect(DIMENSION_PRESETS.length).toBeGreaterThanOrEqual(10);

      const ids = DIMENSION_PRESETS.map(p => p.id);
      expect(ids).toContain('github-avatar');
      expect(ids).toContain('favicon-32');
      expect(ids).toContain('twitter-card');
      expect(ids).toContain('wechat-cover');

      DIMENSION_PRESETS.forEach((preset) => {
        expect(preset.width).toBeGreaterThan(0);
        expect(preset.height).toBeGreaterThan(0);
        expect(preset.name.length).toBeGreaterThan(0);
        expect(['icon', 'social', 'common']).toContain(preset.category);
      });
    });
  });
});



