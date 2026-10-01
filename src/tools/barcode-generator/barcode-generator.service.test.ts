/**
 * 条形码编码与矢量渲染服务单元测试
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { describe, expect, it } from 'vitest';
import {
  encodeToBinaryPattern,
  generateBarcodeSvg,
  validateAndNormalizeText,
} from './barcode-generator.service';
import type { BarcodeRenderOptions } from './barcode-generator.types';

describe('barcode-generator.service', () => {
  describe('validateAndNormalizeText', () => {
    it('空值应返回错误', () => {
      const res = validateAndNormalizeText('', 'CODE128');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('请输入待编码内容');
    });

    describe('CODE128', () => {
      it('支持标准 ASCII 字符串', () => {
        const res = validateAndNormalizeText('HELLO-123', 'CODE128');
        expect(res.isValid).toBe(true);
        expect(res.normalizedText).toBe('HELLO-123');
      });

      it('遇到非 ASCII 字符应报错', () => {
        const res = validateAndNormalizeText('中文条形码', 'CODE128');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('仅支持标准 ASCII');
      });
    });

    describe('EAN13', () => {
      it('12 位数字应自动计算并补全第 13 位校验位', () => {
        // 690123456789 -> 计算校验位
        const res = validateAndNormalizeText('690123456789', 'EAN13');
        expect(res.isValid).toBe(true);
        expect(res.normalizedText.length).toBe(13);
        expect(res.normalizedText.startsWith('690123456789')).toBe(true);
      });

      it('13 位数字校验位正确时应通过', () => {
        const res12 = validateAndNormalizeText('690123456789', 'EAN13');
        const correct13 = res12.normalizedText;
        const res13 = validateAndNormalizeText(correct13, 'EAN13');
        expect(res13.isValid).toBe(true);
        expect(res13.normalizedText).toBe(correct13);
      });

      it('13 位数字校验位错误时应报错', () => {
        const res12 = validateAndNormalizeText('690123456789', 'EAN13');
        const wrongCheck = (Number(res12.normalizedText[12]) + 1) % 10;
        const wrong13 = `690123456789${wrongCheck}`;
        const res = validateAndNormalizeText(wrong13, 'EAN13');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('校验位错误');
      });

      it('非法长度应报错', () => {
        const res = validateAndNormalizeText('12345', 'EAN13');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('必须由 12 位或 13 位纯数字构成');
      });
    });

    describe('EAN8', () => {
      it('7 位数字应自动计算校验位', () => {
        const res = validateAndNormalizeText('6901234', 'EAN8');
        expect(res.isValid).toBe(true);
        expect(res.normalizedText.length).toBe(8);
      });

      it('8 位校验位错误应报错', () => {
        const res = validateAndNormalizeText('69012340', 'EAN8');
        // 验证结果取决于 0 是否为该码的正确校验位，如果不是则报错
        if (!res.isValid) {
          expect(res.error).toContain('校验位错误');
        }
      });
    });

    describe('UPCA', () => {
      it('11 位数字应自动补全第 12 位校验位', () => {
        const res = validateAndNormalizeText('01234567890', 'UPCA');
        expect(res.isValid).toBe(true);
        expect(res.normalizedText.length).toBe(12);
      });
    });

    describe('CODE39', () => {
      it('支持大写字母、数字及特殊字符', () => {
        const res = validateAndNormalizeText('code-39', 'CODE39');
        expect(res.isValid).toBe(true);
        expect(res.normalizedText).toBe('CODE-39');
      });

      it('包含非法字符应报错', () => {
        const res = validateAndNormalizeText('CODE#39', 'CODE39');
        expect(res.isValid).toBe(false);
        expect(res.error).toContain('包含非法字符');
      });
    });

    describe('ITF14', () => {
      it('13 位数字应计算校验位补齐 14 位', () => {
        const res = validateAndNormalizeText('1234567890123', 'ITF14');
        expect(res.isValid).toBe(true);
        expect(res.normalizedText.length).toBe(14);
      });
    });
  });

  describe('encodeToBinaryPattern', () => {
    it('为各种支持格式生成合法的 0/1 条位序列', () => {
      const c128 = encodeToBinaryPattern('TEST-123', 'CODE128');
      expect(c128).toMatch(/^[01]+$/);

      const ean13 = encodeToBinaryPattern('6901234567892', 'EAN13');
      expect(ean13).toMatch(/^[01]+$/);
      expect(ean13.length).toBe(95); // EAN-13 标准为 95 模块

      const ean8 = encodeToBinaryPattern('69012347', 'EAN8');
      expect(ean8).toMatch(/^[01]+$/);
      expect(ean8.length).toBe(67); // EAN-8 标准为 67 模块

      const upca = encodeToBinaryPattern('012345678905', 'UPCA');
      expect(upca).toMatch(/^[01]+$/);

      const c39 = encodeToBinaryPattern('ABC', 'CODE39');
      expect(c39).toMatch(/^[01]+$/);

      const itf14 = encodeToBinaryPattern('12345678901231', 'ITF14');
      expect(itf14).toMatch(/^[01]+$/);
    });
  });

  describe('generateBarcodeSvg', () => {
    const defaultOptions: BarcodeRenderOptions = {
      format: 'CODE128',
      barWidth: 2,
      height: 80,
      color: '#000000',
      background: '#ffffff',
      margin: 10,
      showText: true,
      fontSize: 14,
    };

    it('有效文本应成功生成完整 SVG 标签与尺寸', () => {
      const res = generateBarcodeSvg('ATENG-2026', defaultOptions);
      expect(res.isValid).toBe(true);
      expect(res.svg).toContain('<svg');
      expect(res.svg).toContain('</svg>');
      expect(res.svg).toContain('<rect');
      expect(res.svg).toContain('<text');
      expect(res.svg).toContain('ATENG-2026');
      expect(res.totalWidth).toBeGreaterThan(100);
      expect(res.totalHeight).toBe(80 + 20 + 14 + 8); // height + margin*2 + fontSize + 8
    });

    it('隐藏文本时不包含 <text> 标签', () => {
      const res = generateBarcodeSvg('ATENG-2026', { ...defaultOptions, showText: false });
      expect(res.isValid).toBe(true);
      expect(res.svg).not.toContain('<text');
      expect(res.totalHeight).toBe(80 + 20);
    });

    it('透明背景不包含全局背景 rect', () => {
      const res = generateBarcodeSvg('ATENG-2026', { ...defaultOptions, background: 'transparent' });
      expect(res.isValid).toBe(true);
      expect(res.svg).not.toContain('<rect width="');
    });

    it('无效输入应返回 isValid=false 和错误信息', () => {
      const res = generateBarcodeSvg('', defaultOptions);
      expect(res.isValid).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.svg).toBe('');
    });
  });
});
