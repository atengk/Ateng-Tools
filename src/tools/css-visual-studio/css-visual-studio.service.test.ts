/**
 * CSS 视觉工坊单元测试套件
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { describe, expect, it } from 'vitest';
import {
  calculateFluidTypography,
  convertUnits,
  formatBoxShadowCss,
  formatFancyBorderRadius,
  formatGlassmorphismCss,
  hexToRgba,
} from './css-visual-studio.service';

describe('css-visual-studio.service', () => {
  describe('hexToRgba', () => {
    it('正确解析 3 位与 6 位十六进制颜色', () => {
      expect(hexToRgba('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
      expect(hexToRgba('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
      expect(hexToRgba('#2563eb', 0.8)).toBe('rgba(37, 99, 235, 0.8)');
    });
  });

  describe('formatBoxShadowCss', () => {
    it('处理空图层', () => {
      expect(formatBoxShadowCss([]).css).toBe('box-shadow: none;');
    });

    it('格式化单层与多层投影', () => {
      const layers = [
        {
          id: '1',
          inset: false,
          offsetX: 0,
          offsetY: 4,
          blur: 6,
          spread: -1,
          color: '#000000',
          opacity: 0.1,
        },
        {
          id: '2',
          inset: true,
          offsetX: 0,
          offsetY: 2,
          blur: 4,
          spread: 0,
          color: '#ffffff',
          opacity: 0.5,
        },
      ];

      const res = formatBoxShadowCss(layers);
      expect(res.css).toContain('box-shadow:');
      expect(res.css).toContain('0px 4px 6px -1px rgba(0, 0, 0, 0.1)');
      expect(res.css).toContain('inset 0px 2px 4px 0px rgba(255, 255, 255, 0.5)');
    });
  });

  describe('formatGlassmorphismCss', () => {
    it('生成标准毛玻璃拟态样式与前缀', () => {
      const config = {
        blur: 16,
        saturate: 180,
        bgColor: '#ffffff',
        bgOpacity: 0.25,
        borderColor: '#ffffff',
        borderOpacity: 0.3,
        borderWidth: 1,
        borderRadius: 16,
      };

      const res = formatGlassmorphismCss(config);
      expect(res.css).toContain('backdrop-filter: blur(16px) saturate(180%);');
      expect(res.css).toContain('-webkit-backdrop-filter: blur(16px) saturate(180%);');
      expect(res.css).toContain('border-radius: 16px;');
      expect(res.inlineStyle.borderRadius).toBe('16px');
    });
  });

  describe('formatFancyBorderRadius', () => {
    it('生成符合标准的 8 点不规则圆角语法', () => {
      const config = {
        topLeftX: 30,
        topRightX: 70,
        bottomRightX: 70,
        bottomLeftX: 30,
        topLeftY: 30,
        topRightY: 30,
        bottomRightY: 70,
        bottomLeftY: 70,
      };

      const res = formatFancyBorderRadius(config);
      expect(res.css).toBe('border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;');
      expect(res.borderRadiusValue).toBe('30% 70% 70% 30% / 30% 30% 70% 70%');
    });
  });

  describe('calculateFluidTypography', () => {
    it('计算响应式 clamp() 字号', () => {
      const config = {
        minViewport: 375,
        maxViewport: 1440,
        minFontSize: 16,
        maxFontSize: 32,
        rootFontSize: 16,
      };

      const res = calculateFluidTypography(config);
      expect(res.clampCss).toContain('font-size: clamp(1rem, ');
      expect(res.clampCss).toContain('2rem);');
      expect(res.minRem).toBe(1);
      expect(res.maxRem).toBe(2);
    });

    it('防御异常视口输入', () => {
      const config = {
        minViewport: 1000,
        maxViewport: 500,
        minFontSize: 16,
        maxFontSize: 16,
        rootFontSize: 16,
      };

      const res = calculateFluidTypography(config);
      expect(res.clampCss).toBe('font-size: 1rem;');
    });
  });

  describe('convertUnits', () => {
    it('准确换算 px 至 rem/em/vw/vh', () => {
      const res = convertUnits(16, 16, 1920, 1080);
      expect(res.px).toBe(16);
      expect(res.rem).toBe(1);
      expect(res.em).toBe(1);
      expect(res.vw).toBe(0.8333);
      expect(res.vh).toBe(1.4815);
    });
  });
});
