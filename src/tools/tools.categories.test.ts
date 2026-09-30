/**
 * 针对顶层工具分类拓扑结构与关键工具归属的断言测试
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { describe, expect, it } from 'vitest';
import { toolsByCategory } from './index';

describe('tools category taxonomy', () => {
  it('验证顶层 PDF 工具分类已存在并正确收纳 pdf-signature-checker 与 pdf-text-extractor', () => {
    const pdfCategory = toolsByCategory.find(cat => cat.name === 'PDF');
    expect(pdfCategory).toBeDefined();
    expect(pdfCategory?.components.some(tool => tool.path === '/pdf-signature-checker')).toBe(true);
    expect(pdfCategory?.components.some(tool => tool.path === '/pdf-text-extractor')).toBe(true);
  });

  it('验证 Crypto 分类已彻底剥离 pdf-signature-checker 避免分类混淆', () => {
    const cryptoCategory = toolsByCategory.find(cat => cat.name === 'Crypto');
    expect(cryptoCategory).toBeDefined();
    expect(cryptoCategory?.components.some(tool => tool.path === '/pdf-signature-checker')).toBe(false);
  });

  it('验证全量分类名称具有唯一性', () => {
    const categoryNames = toolsByCategory.map(cat => cat.name);
    const uniqueNames = new Set(categoryNames);
    expect(categoryNames.length).toBe(uniqueNames.size);
  });
});
