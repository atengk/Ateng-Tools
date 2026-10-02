/**
 * SVG 优化与组件转换器纯函数服务
 *
 * @author Ateng
 * @since 2026-10-02
 */

import type {
  SvgConversionResult,
  SvgOptimizeOptions,
} from './svg-to-component-converter.types';

/**
 * 常见 SVG 短横线属性到 React JSX 驼峰式命名的映射表
 */
const REACT_ATTR_MAP: Record<string, string> = {
  class: 'className',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-opacity': 'strokeOpacity',
  'fill-rule': 'fillRule',
  'fill-opacity': 'fillOpacity',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'color-interpolation-filters': 'colorInterpolationFilters',
  'font-size': 'fontSize',
  'font-family': 'fontFamily',
  'font-weight': 'fontWeight',
  'text-anchor': 'textAnchor',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'xmlns:xlink': 'xmlnsXlink',
  'xlink:href': 'xlinkHref',
  'xlink:title': 'xlinkTitle',
  'xml:space': 'xmlSpace',
};

/**
 * 清洗并优化原始 SVG 源码
 *
 * @param rawSvg 原始 SVG 字符串
 * @param options 优化选项
 */
export function sanitizeAndOptimizeSvg(
  rawSvg: string,
  options: SvgOptimizeOptions = {},
): {
  cleanedSvg: string;
  width?: string;
  height?: string;
  viewBox?: string;
  error?: string;
} {
  const trimmed = rawSvg.trim();
  if (!trimmed) {
    return { cleanedSvg: '', error: 'SVG 内容不能为空' };
  }

  // 1. 基础预清洗：剔除 XML 声明、DOCTYPE、注释
  let cleaned = trimmed
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // 2. 移除常见的制图软件专有命名空间与标签
  if (options.removeEditorData !== false) {
    cleaned = cleaned
      .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
      .replace(/<sodipodi:[\s\S]*?\/>/gi, '')
      .replace(/<sodipodi:[\s\S]*?<\/sodipodi:[\s\S]*?>/gi, '')
      .replace(/<inkscape:[\s\S]*?\/>/gi, '')
      .replace(/<inkscape:[\s\S]*?<\/inkscape:[\s\S]*?>/gi, '')
      .replace(/\s+(xmlns:inkscape|xmlns:sodipodi|xmlns:sketch|xmlns:vectornator|xmlns:illustrator|xmlns:serif|xmlns:ns\d+)="[^"]*"/gi, '')
      .replace(/\s+(inkscape:[a-zA-Z0-9_-]+|sodipodi:[a-zA-Z0-9_-]+|sketch:[a-zA-Z0-9_-]+)="[^"]*"/gi, '');
  }

  // 3. 移除危险脚本与内联事件
  cleaned = cleaned
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on[a-z]+="[^"]*"/gi, '');

  // 4. 定位根 <svg> 标签
  const svgOpenMatch = cleaned.match(/<svg([^>]*)>/i);
  if (!svgOpenMatch) {
    return { cleanedSvg: '', error: '未找到合法的 <svg> 根节点' };
  }

  const rawAttrs = svgOpenMatch[1];

  // 提取现有 width, height, viewBox
  const widthMatch = rawAttrs.match(/\bwidth="([^"]+)"/i);
  const heightMatch = rawAttrs.match(/\bheight="([^"]+)"/i);
  const viewBoxMatch = rawAttrs.match(/\bviewBox="([^"]+)"/i);

  const width = widthMatch ? widthMatch[1] : undefined;
  const height = heightMatch ? heightMatch[1] : undefined;
  let viewBox = viewBoxMatch ? viewBoxMatch[1] : undefined;

  // 若缺失 viewBox 但有具体的数字 width / height，则自动推导补齐
  if (!viewBox && width && height) {
    const numW = parseFloat(width);
    const numH = parseFloat(height);
    if (!isNaN(numW) && !isNaN(numH) && numW > 0 && numH > 0) {
      viewBox = `0 0 ${numW} ${numH}`;
    }
  }

  // 重构根 <svg> 属性
  let newAttrs = rawAttrs;

  // 移除固定尺寸
  if (options.removeDimensions) {
    newAttrs = newAttrs.replace(/\s+\bwidth="[^"]*"/gi, '');
    newAttrs = newAttrs.replace(/\s+\bheight="[^"]*"/gi, '');
  }

  // 确保或替换 viewBox
  if (viewBox && !newAttrs.match(/\bviewBox=/i)) {
    newAttrs += ` viewBox="${viewBox}"`;
  }

  // 确保 xmlns
  if (!newAttrs.match(/\bxmlns=/i)) {
    newAttrs = ` xmlns="http://www.w3.org/2000/svg"${newAttrs}`;
  }

  cleaned = cleaned.replace(svgOpenMatch[0], `<svg${newAttrs}>`);

  // 5. 颜色替换为 currentColor (可选)
  if (options.useCurrentColor) {
    cleaned = cleaned
      .replace(/fill="(?!none|transparent|url\()[^"]*"/gi, 'fill="currentColor"')
      .replace(/stroke="(?!none|transparent|url\()[^"]*"/gi, 'stroke="currentColor"');
  }

  // 6. 压缩空白
  if (options.minify) {
    cleaned = cleaned
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .trim();
  } else {
    // 基础整理
    cleaned = cleaned.replace(/^\s*[\r\n]/gm, '').trim();
  }

  return {
    cleanedSvg: cleaned,
    width,
    height,
    viewBox,
  };
}

/**
 * 生成 Vue 3 单文件组件代码 (<script setup lang="ts">)
 *
 * @param svgCode 清洗后的 SVG
 * @param componentName 组件名称
 */
export function generateVue3Component(svgCode: string, componentName = 'SvgIcon'): string {
  // 提取 svg 标签内部与属性
  const svgMatch = svgCode.match(/<svg([^>]*)>([\s\S]*)<\/svg>/i);
  if (!svgMatch) {
    return `<template>\n  ${svgCode}\n</template>`;
  }

  let attrs = svgMatch[1].trim();
  const innerHtml = svgMatch[2].trim();

  // 若属性中带有固定的 width/height，移除以便用 props.size 控制
  attrs = attrs
    .replace(/\s+\bwidth="[^"]*"/gi, '')
    .replace(/\s+\bheight="[^"]*"/gi, '');

  return `<template>
  <svg
    ${attrs}
    :width="size"
    :height="size"
    :fill="color || 'currentColor'"
    v-bind="$attrs"
  >
    ${innerHtml}
  </svg>
</template>

<script setup lang="ts">
/**
 * ${componentName} 矢量图标组件
 *
 * @author Ateng
 * @since 2026-10-02
 */

withDefaults(
  defineProps<{
    size?: string | number;
    color?: string;
  }>(),
  {
    size: 24,
  },
);
</script>
`;
}

/**
 * 生成 React TSX 函数组件代码
 *
 * @param svgCode 清洗后的 SVG
 * @param componentName 组件名称
 */
export function generateReactComponent(svgCode: string, componentName = 'SvgIcon'): string {
  // 转换属性为 React 驼峰格式
  let reactSvg = svgCode;

  Object.entries(REACT_ATTR_MAP).forEach(([kebab, camel]) => {
    const reg = new RegExp(`\\s+${kebab}=`, 'g');
    reactSvg = reactSvg.replace(reg, ` ${camel}=`);
  });

  // 在根 <svg> 注入 {...props}
  reactSvg = reactSvg.replace(/<svg([^>]*)>/i, '<svg$1 {...props}>');

  return `import type { SVGProps } from 'react';

/**
 * ${componentName} 矢量图标组件
 *
 * @author Ateng
 * @since 2026-10-02
 */
export const ${componentName} = (props: SVGProps<SVGSVGElement>) => {
  return (
    ${reactSvg}
  );
};

export default ${componentName};
`;
}

/**
 * 生成 Data URI 格式 (Base64 与 URL 编码)
 *
 * @param svgCode SVG 字符串
 */
export function generateDataUri(svgCode: string): { base64: string; utf8: string } {
  if (!svgCode) {
    return { base64: '', utf8: '' };
  }

  let base64 = '';
  try {
    if (typeof btoa === 'function') {
      base64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgCode)))}`;
    } else if (typeof Buffer !== 'undefined') {
      base64 = `data:image/svg+xml;base64,${Buffer.from(svgCode).toString('base64')}`;
    }
  } catch {
    base64 = '';
  }

  const utf8 = `data:image/svg+xml;utf8,${encodeURIComponent(svgCode)}`;

  return { base64, utf8 };
}

/**
 * 完整 SVG 转换流程协调器
 *
 * @param rawSvg 原始 SVG 字符串
 * @param options 转换选项
 */
export function convertSvg(
  rawSvg: string,
  options: SvgOptimizeOptions = {},
): SvgConversionResult {
  const originalSize = rawSvg.length;
  const sanitized = sanitizeAndOptimizeSvg(rawSvg, options);

  if (sanitized.error || !sanitized.cleanedSvg) {
    return {
      isValid: false,
      errorMessage: sanitized.error || '无效的 SVG 格式',
      cleanedSvg: '',
      vue3Code: '',
      reactCode: '',
      dataUri: '',
      dataUriUtf8: '',
      originalSize,
      cleanedSize: 0,
      reductionPercentage: 0,
    };
  }

  const cleanedSize = sanitized.cleanedSvg.length;
  const reductionPercentage =
    originalSize > 0
      ? Math.max(0, Math.round(((originalSize - cleanedSize) / originalSize) * 100))
      : 0;

  const compName = options.componentName || 'SvgIcon';
  const vue3Code = generateVue3Component(sanitized.cleanedSvg, compName);
  const reactCode = generateReactComponent(sanitized.cleanedSvg, compName);
  const { base64, utf8 } = generateDataUri(sanitized.cleanedSvg);

  return {
    isValid: true,
    cleanedSvg: sanitized.cleanedSvg,
    vue3Code,
    reactCode,
    dataUri: base64,
    dataUriUtf8: utf8,
    originalSize,
    cleanedSize,
    reductionPercentage,
    width: sanitized.width,
    height: sanitized.height,
    viewBox: sanitized.viewBox,
  };
}
