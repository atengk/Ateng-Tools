// @vitest-environment jsdom
/**
 * 针对全站规范八大工具分类拓扑结构与关键工具归属的断言测试
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { describe, expect, it } from 'vitest';
import { tools, toolsByCategory } from './index';
import type { ToolCategoryKey } from './tools.types';

describe('tools category taxonomy', () => {
  const EXPECTED_CATEGORIES: ToolCategoryKey[] = [
    'dev',
    'converter',
    'security',
    'network',
    'text',
    'pdf',
    'media',
    'calc',
  ];

  it('验证全站恰好包含规范八大核心领域分类且名称唯一', () => {
    const categoryNames = toolsByCategory.map(cat => cat.name);
    expect(categoryNames).toHaveLength(EXPECTED_CATEGORIES.length);
    expect(new Set(categoryNames).size).toBe(EXPECTED_CATEGORIES.length);
    expect(categoryNames).toEqual(EXPECTED_CATEGORIES);
  });

  it('验证全站工具总数保持一致且无重复或遗漏', () => {
    const flatToolCount = tools.length;
    const categorySum = toolsByCategory.reduce((sum, cat) => sum + cat.components.length, 0);
    expect(flatToolCount).toBe(categorySum);
    expect(flatToolCount).toBe(119);

    const allPaths = tools.map(t => t.path);
    expect(new Set(allPaths).size).toBe(flatToolCount);
  });

  it('验证历史碎片微分类（Data/Math/Measurement）已彻底整合消除', () => {
    const categoryNames = toolsByCategory.map(cat => String(cat.name).toLowerCase());
    expect(categoryNames).not.toContain('data');
    expect(categoryNames).not.toContain('math');
    expect(categoryNames).not.toContain('measurement');
    expect(categoryNames).not.toContain('crypto');
    expect(categoryNames).not.toContain('web');
    expect(categoryNames).not.toContain('development');
  });

  it('验证安全凭证与认证工具已归拢至 security 分类，扩充大文件校验与证书解析达到 16 款', () => {
    const securityCategory = toolsByCategory.find(cat => cat.name === 'security');
    expect(securityCategory).toBeDefined();
    const paths = securityCategory!.components.map(t => t.path);
    expect(paths).toHaveLength(16);
    expect(paths).toContain('/jwt-parser');
    expect(paths).toContain('/otp-generator');
    expect(paths).toContain('/basic-auth-generator');
    expect(paths).toContain('/token-generator');
    expect(paths).toContain('/rsa-key-pair-generator');
    expect(paths).toContain('/file-checksum');
    expect(paths).toContain('/x509-certificate-inspector');
    expect(paths).toContain('/chinese-id-card-inspector');
  });

  it('验证差异对比与富文本编辑工具已归拢至 text 分类', () => {
    const textCategory = toolsByCategory.find(cat => cat.name === 'text');
    expect(textCategory).toBeDefined();
    const paths = textCategory!.components.map(t => t.path);
    expect(paths).toContain('/text-diff');
    expect(paths).toContain('/json-diff');
    expect(paths).toContain('/html-wysiwyg-editor');
    expect(paths).toContain('/slugify-string');
  });

  it('验证复杂结构与原数据类工具已归拢至 converter 分类，扩充人民币大写转换达到 26 款', () => {
    const converterCategory = toolsByCategory.find(cat => cat.name === 'converter');
    expect(converterCategory).toBeDefined();
    const paths = converterCategory!.components.map(t => t.path);
    expect(paths).toHaveLength(26);
    expect(paths).toContain('/config-converter');
    expect(paths).toContain('/table-converter');
    expect(paths).toContain('/json-to-csv');
    expect(paths).toContain('/phone-parser-and-formatter');
    expect(paths).toContain('/iban-validator-and-parser');
    expect(paths).toContain('/rmb-amount-converter');
  });

  it('验证代码基准构建工具已迁入 dev 分类，并扩充 Git 规范提交与 CSS 视觉工坊达到 27 款', () => {
    const devCategory = toolsByCategory.find(cat => cat.name === 'dev');
    expect(devCategory).toBeDefined();
    const paths = devCategory!.components.map(t => t.path);
    expect(paths).toHaveLength(27);
    expect(paths).toContain('/json-studio');
    expect(paths).toContain('/benchmark-builder');
    expect(paths).toContain('/mybatis-sql-converter');
    expect(paths).toContain('/cron-simulator');
    expect(paths).toContain('/snowflake-id-analyzer');
    expect(paths).toContain('/nginx-config-generator');
    expect(paths).toContain('/mock-data-generator');
    expect(paths).toContain('/http-client');
    expect(paths).toContain('/conventional-commits-generator');
    expect(paths).toContain('/css-visual-studio');
  });

  it('验证数学与生活度量工具已整合至 calc 分类，并成功扩充两款新工具达到 7 款', () => {
    const calcCategory = toolsByCategory.find(cat => cat.name === 'calc');
    expect(calcCategory).toBeDefined();
    const paths = calcCategory!.components.map(t => t.path);
    expect(paths).toHaveLength(7);
    expect(paths).toContain('/math-evaluator');
    expect(paths).toContain('/temperature-converter');
    expect(paths).toContain('/chronometer');
    expect(paths).toContain('/percentage-calculator');
    expect(paths).toContain('/data-storage-converter');
    expect(paths).toContain('/bitwise-calculator');
  });

  it('验证 PDF 与图形多媒体分类工具完整，media 扩充两款新工具达到 7 款', () => {
    const pdfCategory = toolsByCategory.find(cat => cat.name === 'pdf');
    expect(pdfCategory?.components.map(t => t.path)).toContain('/pdf-studio');
    expect(pdfCategory?.components.map(t => t.path)).toContain('/pdf-signature-checker');

    const mediaCategory = toolsByCategory.find(cat => cat.name === 'media');
    expect(mediaCategory).toBeDefined();
    const mediaPaths = mediaCategory!.components.map(t => t.path);
    expect(mediaPaths).toHaveLength(8);
    expect(mediaPaths).toContain('/id-photo-maker');
    expect(mediaPaths).toContain('/image-studio');
    expect(mediaPaths).toContain('/qrcode-generator');
    expect(mediaPaths).toContain('/barcode-generator');
    expect(mediaPaths).toContain('/favicon-generator');
  });

  it('验证网络与 Web 分类扩充抓包日志分析与 CIDR 聚合计算器达到 19 款', () => {
    const networkCategory = toolsByCategory.find(cat => cat.name === 'network');
    expect(networkCategory).toBeDefined();
    const paths = networkCategory!.components.map(t => t.path);
    expect(paths).toHaveLength(19);
    expect(paths).toContain('/har-analyzer');
    expect(paths).toContain('/cidr-calculator');
    expect(paths).toContain('/ipv4-subnet-calculator');
    expect(paths).toContain('/url-encoder');
  });
});

