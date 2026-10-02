/**
 * CSS 视觉工坊核心类型定义与契约
 *
 * @author Ateng
 * @since 2026-10-02
 */

export interface ShadowLayer {
  id: string;
  inset: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

export interface GlassmorphismConfig {
  blur: number;
  saturate: number;
  bgColor: string;
  bgOpacity: number;
  borderColor: string;
  borderOpacity: number;
  borderWidth: number;
  borderRadius: number;
}

export interface FancyBorderRadiusConfig {
  topLeftX: number;
  topRightX: number;
  bottomRightX: number;
  bottomLeftX: number;
  topLeftY: number;
  topRightY: number;
  bottomRightY: number;
  bottomLeftY: number;
}

export interface CssFluidConfig {
  minViewport: number;
  maxViewport: number;
  minFontSize: number;
  maxFontSize: number;
  rootFontSize: number;
}

export interface FluidTypographyResult {
  clampCss: string;
  minRem: number;
  maxRem: number;
  slopeVw: number;
  interceptRem: number;
  explanation: string;
}

export interface UnitConvertResult {
  px: number;
  rem: number;
  em: number;
  vw: number;
  vh: number;
}
