/**
 * SVG 优化与组件转换器单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { describe, expect, it } from 'vitest';
import {
  convertSvg,
  generateDataUri,
  generateReactComponent,
  generateVue3Component,
  sanitizeAndOptimizeSvg,
} from './svg-to-component-converter.service';

const SAMPLE_DIRTY_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Created with Inkscape -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="100" height="100" viewBox="0 0 100 100">
  <metadata>Illustrator Metadata</metadata>
  <inkscape:path-effect effect="spiro" />
  <circle cx="50" cy="50" r="40" stroke="#000000" stroke-width="4" fill="#ff0000" />
</svg>`;

describe('svg-to-component-converter.service', () => {
  it('应成功清洗冗余 XML 头、注释、metadata 及编辑器命名空间', () => {
    const res = sanitizeAndOptimizeSvg(SAMPLE_DIRTY_SVG, {
      removeEditorData: true,
      minify: true,
    });

    expect(res.error).toBeUndefined();
    expect(res.cleanedSvg).not.toContain('<?xml');
    expect(res.cleanedSvg).not.toContain('<!DOCTYPE');
    expect(res.cleanedSvg).not.toContain('<!-- Created with Inkscape -->');
    expect(res.cleanedSvg).not.toContain('xmlns:inkscape');
    expect(res.cleanedSvg).not.toContain('<metadata>');
    expect(res.cleanedSvg).not.toContain('<inkscape:path-effect');
    expect(res.viewBox).toBe('0 0 100 100');
  });

  it('缺失 viewBox 时应根据 width 和 height 自动推导补齐', () => {
    const rawNoViewBox = `<svg width="64" height="64"><rect width="64" height="64" fill="blue"/></svg>`;
    const res = sanitizeAndOptimizeSvg(rawNoViewBox);

    expect(res.viewBox).toBe('0 0 64 64');
    expect(res.cleanedSvg).toContain('viewBox="0 0 64 64"');
  });

  it('启用 currentColor 替换时应将固定颜色转为 currentColor', () => {
    const res = sanitizeAndOptimizeSvg(SAMPLE_DIRTY_SVG, {
      useCurrentColor: true,
    });

    expect(res.cleanedSvg).toContain('fill="currentColor"');
    expect(res.cleanedSvg).toContain('stroke="currentColor"');
  });

  it('应能正确生成 Vue 3 组件模板', () => {
    const cleaned = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>`;
    const vueCode = generateVue3Component(cleaned, 'CustomArrow');

    expect(vueCode).toContain('<template>');
    expect(vueCode).toContain('<script setup lang="ts">');
    expect(vueCode).toContain('CustomArrow 矢量图标组件');
    expect(vueCode).toContain(':width="size"');
    expect(vueCode).toContain(':height="size"');
  });

  it('应能正确生成 React 组件并将 SVG 属性驼峰化', () => {
    const cleaned = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke-width="2" stroke-linecap="round" fill-rule="evenodd"/></svg>`;
    const reactCode = generateReactComponent(cleaned, 'ArrowIcon');

    expect(reactCode).toContain('export const ArrowIcon = (props: SVGProps<SVGSVGElement>) =>');
    expect(reactCode).toContain('strokeWidth="2"');
    expect(reactCode).toContain('strokeLinecap="round"');
    expect(reactCode).toContain('fillRule="evenodd"');
    expect(reactCode).toContain('{...props}');
  });

  it('应正确生成 Data URI', () => {
    const cleaned = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect/></svg>`;
    const uris = generateDataUri(cleaned);

    expect(uris.base64).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(uris.utf8).toMatch(/^data:image\/svg\+xml;utf8,/);
  });

  it('完整转换器 convertSvg 调度与体积压缩率计算', () => {
    const result = convertSvg(SAMPLE_DIRTY_SVG, {
      componentName: 'MyIcon',
      useCurrentColor: true,
      minify: true,
    });

    expect(result.isValid).toBe(true);
    expect(result.originalSize).toBeGreaterThan(result.cleanedSize);
    expect(result.reductionPercentage).toBeGreaterThan(0);
    expect(result.vue3Code).toContain('MyIcon');
    expect(result.reactCode).toContain('MyIcon');
  });

  it('空文本或非法输入时应返回优雅错误提示', () => {
    const resultEmpty = convertSvg('');
    expect(resultEmpty.isValid).toBe(false);

    const resultInvalid = convertSvg('<div>这不是一个SVG</div>');
    expect(resultInvalid.isValid).toBe(false);
    expect(resultInvalid.errorMessage).toContain('未找到合法的 <svg> 根节点');
  });
});
