/**
 * CSS 视觉工坊计算与样式生成纯函数服务
 *
 * @author Ateng
 * @since 2026-10-02
 */

import type {
  CssFluidConfig,
  FancyBorderRadiusConfig,
  FluidTypographyResult,
  GlassmorphismConfig,
  ShadowLayer,
  UnitConvertResult,
} from './css-visual-studio.types';

/**
 * 转换 HEX 颜色或已知颜色为标准 RGBA 字符串
 *
 * @param hex 颜色字符串（支持 #fff, #ffffff 或纯色）
 * @param alpha 透明度 (0 ~ 1)
 * @returns 标准 rgba(...) 格式
 */
export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  const a = Math.min(Math.max(0, alpha), 1);

  if (clean.length === 3) {
    const r = Number.parseInt(clean[0] + clean[0], 16);
    const g = Number.parseInt(clean[1] + clean[1], 16);
    const b = Number.parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  if (clean.length === 6) {
    const r = Number.parseInt(clean.substring(0, 2), 16);
    const g = Number.parseInt(clean.substring(2, 4), 16);
    const b = Number.parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // 兜底黑色
  return `rgba(0, 0, 0, ${a})`;
}

/**
 * 格式化多层 Box-Shadow 投影属性
 *
 * @param layers 阴影图层配置列表
 * @returns CSS 属性与单行值
 */
export function formatBoxShadowCss(layers: ShadowLayer[]): {
  css: string;
  shadowValue: string;
} {
  if (!layers || layers.length === 0) {
    return {
      css: 'box-shadow: none;',
      shadowValue: 'none',
    };
  }

  const parts = layers.map((layer) => {
    const colorStr = hexToRgba(layer.color, layer.opacity);
    const insetText = layer.inset ? 'inset ' : '';
    return `${insetText}${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${layer.spread}px ${colorStr}`;
  });

  const shadowValue = parts.join(',\n  ');
  const css = `box-shadow:\n  ${shadowValue};`;

  return { css, shadowValue };
}

/**
 * 格式化毛玻璃拟态 (Glassmorphism) CSS 样式
 *
 * @param config 毛玻璃参数配置
 * @returns CSS 样式块与内联样式字典
 */
export function formatGlassmorphismCss(config: GlassmorphismConfig): {
  css: string;
  inlineStyle: Record<string, string>;
} {
  const bg = hexToRgba(config.bgColor, config.bgOpacity);
  const border = `${config.borderWidth}px solid ${hexToRgba(config.borderColor, config.borderOpacity)}`;
  const blurVal = `blur(${config.blur}px) saturate(${config.saturate}%)`;
  const radius = `${config.borderRadius}px`;

  const css = [
    `background: ${bg};`,
    `backdrop-filter: ${blurVal};`,
    `-webkit-backdrop-filter: ${blurVal};`,
    `border: ${border};`,
    `border-radius: ${radius};`,
  ].join('\n');

  const inlineStyle: Record<string, string> = {
    background: bg,
    backdropFilter: blurVal,
    WebkitBackdropFilter: blurVal,
    border,
    borderRadius: radius,
  };

  return { css, inlineStyle };
}

/**
 * 格式化 8 点不规则有机圆角 (Fancy Border-Radius)
 *
 * @param config 圆角 8 维度百分比
 * @returns CSS 样式与属性值
 */
export function formatFancyBorderRadius(config: FancyBorderRadiusConfig): {
  css: string;
  borderRadiusValue: string;
} {
  const h = `${config.topLeftX}% ${config.topRightX}% ${config.bottomRightX}% ${config.bottomLeftX}%`;
  const v = `${config.topLeftY}% ${config.topRightY}% ${config.bottomRightY}% ${config.bottomLeftY}%`;
  const borderRadiusValue = `${h} / ${v}`;

  return {
    css: `border-radius: ${borderRadiusValue};`,
    borderRadiusValue,
  };
}

/**
 * 计算 CSS 响应式流体排版 (Fluid Typography clamp)
 *
 * @param config 流体排版视口与字号配置
 * @returns clamp 表达式及推导模型
 */
export function calculateFluidTypography(config: CssFluidConfig): FluidTypographyResult {
  const {
    minViewport = 375,
    maxViewport = 1440,
    minFontSize = 16,
    maxFontSize = 32,
    rootFontSize = 16,
  } = config;

  const vpDelta = maxViewport - minViewport;
  const sizeDelta = maxFontSize - minFontSize;

  if (vpDelta <= 0 || sizeDelta <= 0) {
    const fixedRem = Math.round((minFontSize / rootFontSize) * 1000) / 1000;
    return {
      clampCss: `font-size: ${fixedRem}rem;`,
      minRem: fixedRem,
      maxRem: fixedRem,
      slopeVw: 0,
      interceptRem: fixedRem,
      explanation: '视口范围或字号范围无效，回退为固定 rem',
    };
  }

  // 斜率与截距线性推导
  const slope = sizeDelta / vpDelta;
  const slopeVw = Math.round(slope * 100 * 1000) / 1000;

  const interceptPx = minFontSize - slope * minViewport;
  const interceptRem = Math.round((interceptPx / rootFontSize) * 1000) / 1000;

  const minRem = Math.round((minFontSize / rootFontSize) * 1000) / 1000;
  const maxRem = Math.round((maxFontSize / rootFontSize) * 1000) / 1000;

  const middleExpr = interceptRem === 0
    ? `${slopeVw}vw`
    : `${interceptRem}rem + ${slopeVw}vw`;

  const clampCss = `font-size: clamp(${minRem}rem, ${middleExpr}, ${maxRem}rem);`;

  return {
    clampCss,
    minRem,
    maxRem,
    slopeVw,
    interceptRem,
    explanation: `在 ${minViewport}px ~ ${maxViewport}px 视口间字号由 ${minFontSize}px(${minRem}rem) 平滑缩放至 ${maxFontSize}px(${maxRem}rem)`,
  };
}

/**
 * 常用前端 CSS 物理与相对单位快速换算
 *
 * @param px 输入像素值
 * @param rootFontSize 根字号（默认 16px）
 * @param viewportWidth 设计稿宽度（默认 1920px）
 * @param viewportHeight 设计稿高度（默认 1080px）
 * @returns 换算结果字典
 */
export function convertUnits(
  px: number,
  rootFontSize = 16,
  viewportWidth = 1920,
  viewportHeight = 1080,
): UnitConvertResult {
  const safePx = Number.isNaN(px) ? 0 : px;
  const safeRoot = rootFontSize > 0 ? rootFontSize : 16;
  const safeVpW = viewportWidth > 0 ? viewportWidth : 1920;
  const safeVpH = viewportHeight > 0 ? viewportHeight : 1080;

  const rem = Math.round((safePx / safeRoot) * 10000) / 10000;
  const em = rem;
  const vw = Math.round((safePx / safeVpW) * 100 * 10000) / 10000;
  const vh = Math.round((safePx / safeVpH) * 100 * 10000) / 10000;

  return {
    px: safePx,
    rem,
    em,
    vw,
    vh,
  };
}
