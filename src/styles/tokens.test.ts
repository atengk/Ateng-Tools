/**
 * 设计令牌单元测试套件
 * 验证色彩格式、灰阶完备性、表面层级与字体栈规范
 *
 * @author Ateng
 * @since 2026-10-01
 */

import { describe, expect, it } from 'vitest';
import {
  brandTokens,
  geometryTokens,
  motionTokens,
  slatePalette,
  statusTokens,
  surfaceTokens,
  typographyTokens,
} from './tokens';

describe('Design Tokens Suite', () => {
  it('should have valid hex colors for brand primary tokens', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    expect(brandTokens.primary).toMatch(hexPattern);
    expect(brandTokens.primary).toBe('#2563eb');
    expect(brandTokens.primaryHover).toMatch(hexPattern);
    expect(brandTokens.primaryPressed).toMatch(hexPattern);
    expect(brandTokens.focusRing).toContain('rgba(37, 99, 235, 0.2)');
  });

  it('should have valid semantic status colors', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    expect(statusTokens.success).toMatch(hexPattern);
    expect(statusTokens.warning).toMatch(hexPattern);
    expect(statusTokens.error).toMatch(hexPattern);
    expect(statusTokens.info).toMatch(hexPattern);
  });

  it('should have complete Slate palette from 50 to 950', () => {
    const keys = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
    for (const key of keys) {
      expect(slatePalette[key]).toBeDefined();
      expect(slatePalette[key]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('should define distinct 3-tier surfaces for light and dark modes', () => {
    // Light mode
    expect(surfaceTokens.light.surface0).toBe(slatePalette[50]);
    expect(surfaceTokens.light.surface1).toBe('#ffffff');
    expect(surfaceTokens.light.surface2).toBe(slatePalette[100]);
    expect(surfaceTokens.light.border).toBe(slatePalette[200]);

    // Dark mode
    expect(surfaceTokens.dark.surface0).toBe(slatePalette[900]);
    expect(surfaceTokens.dark.surface1).toBe(slatePalette[800]);
    expect(surfaceTokens.dark.surface2).toBe(slatePalette[700]);
    expect(surfaceTokens.dark.border).toBe(slatePalette[700]);
  });

  it('should contain high-priority Chinese fonts and monospace code fonts', () => {
    expect(typographyTokens.fontSans).toContain('PingFang SC');
    expect(typographyTokens.fontSans).toContain('Noto Sans SC');
    expect(typographyTokens.fontSans).toContain('Microsoft YaHei');

    expect(typographyTokens.fontMono).toContain('JetBrains Mono');
    expect(typographyTokens.fontMono).toContain('Fira Code');
    expect(typographyTokens.fontMono).toContain('monospace');

    expect(typographyTokens.lineHeightBase).toBe(1.6);
  });

  it('should define standard geometry and motion tokens', () => {
    expect(geometryTokens.radiusControl).toBe('8px');
    expect(geometryTokens.radiusContainer).toBe('12px');
    expect(motionTokens.transitionTheme).toContain('0.25s');
  });
});
