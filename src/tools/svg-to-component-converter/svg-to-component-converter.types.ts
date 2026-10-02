/**
 * SVG 优化与组件转换器类型契约
 *
 * @author Ateng
 * @since 2026-10-02
 */

export type TargetFramework = 'vue3' | 'react' | 'svg' | 'datauri';

export interface SvgOptimizeOptions {
  componentName?: string;
  removeDimensions?: boolean; // 移除固定的 width / height
  useCurrentColor?: boolean; // 将 fill/stroke 替换为 currentColor
  keepViewBox?: boolean; // 保持或自动补齐 viewBox
  removeComments?: boolean; // 移除注释与元数据
  removeEditorData?: boolean; // 移除 Inkscape/Illustrator 冗余数据
  minify?: boolean; // 压缩去除多余空格
}

export interface SvgConversionResult {
  isValid: boolean;
  errorMessage?: string;
  cleanedSvg: string;
  vue3Code: string;
  reactCode: string;
  dataUri: string;
  dataUriUtf8: string;
  originalSize: number;
  cleanedSize: number;
  reductionPercentage: number;
  width?: string;
  height?: string;
  viewBox?: string;
}
