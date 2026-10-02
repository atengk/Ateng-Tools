/**
 * 首页工具多维检索与拼音匹配管线单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */
import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import type { ToolWithCategory } from '@/tools/tools.types';
import { searchTools, useToolSearch } from './toolSearch';

const mockIcon = {} as any;

const mockTools: ToolWithCategory[] = [
  {
    name: '二维码生成器',
    path: '/qr-code-generator',
    description: '生成与下载自定义二维码图片',
    keywords: ['qrcode', '2d barcode', 'generator'],
    category: 'dev',
    component: async () => ({}),
    icon: mockIcon,
    isNew: false,
  },
  {
    name: 'JSON 转实体生成器',
    path: '/json-to-entity',
    description: '将 JSON 解析并转换为 Java、TypeScript 或 Go 强类型实体模型',
    keywords: ['json', 'entity', 'dto', 'pojo', 'java'],
    category: 'converter',
    component: async () => ({}),
    icon: mockIcon,
    isNew: false,
  },
  {
    name: '哈希文本计算器',
    path: '/hash-text',
    description: '计算文本的 MD5、SHA256 与 SHA512 等哈希散列摘要',
    keywords: ['hash', 'md5', 'sha256', 'digest'],
    category: 'security',
    component: async () => ({}),
    icon: mockIcon,
    isNew: false,
  },
  {
    name: 'UUID 生成器',
    path: '/uuid-generator',
    description: '快速批量生成随机 UUID v4 标识符',
    keywords: ['uuid', 'guid', 'v4', 'random'],
    category: 'dev',
    component: async () => ({}),
    icon: mockIcon,
    isNew: false,
  },
];

describe('toolSearch 检索管线核心服务', () => {
  it('1. 当搜索关键词为空时，返回全量原始工具且 matchType 为 none', () => {
    const results = searchTools(mockTools, '');
    expect(results).toHaveLength(mockTools.length);
    expect(results.every(item => item.matchType === 'none')).toBe(true);
    expect(results.map(item => item.tool.name)).toEqual(mockTools.map(t => t.name));
  });

  it('2. 应该支持中文汉字直接匹配并返回精准匹配区间', () => {
    const results = searchTools(mockTools, '二维码');
    expect(results.length).toBeGreaterThanOrEqual(1);
    const topMatch = results[0];
    expect(topMatch.tool.name).toBe('二维码生成器');
    expect(topMatch.matchRange).toEqual([0, 2]);
  });

  it('3. 应该支持拼音首字母匹配 (如 ewm 命中 二维码生成器)', () => {
    const results = searchTools(mockTools, 'ewm');
    expect(results.length).toBeGreaterThanOrEqual(1);
    const topMatch = results[0];
    expect(topMatch.tool.name).toBe('二维码生成器');
    expect(topMatch.matchType).toBe('pinyin');
    expect(topMatch.matchRange).toEqual([0, 2]);
    expect(topMatch.matchCue).toContain('ewm');
  });

  it('4. 应该支持中文全拼匹配 (如 erweima 命中 二维码生成器)', () => {
    const results = searchTools(mockTools, 'erweima');
    expect(results.length).toBeGreaterThanOrEqual(1);
    const topMatch = results[0];
    expect(topMatch.tool.name).toBe('二维码生成器');
    expect(topMatch.matchType).toBe('pinyin');
    expect(topMatch.matchRange).toEqual([0, 2]);
  });

  it('5. 应该支持英文关键词与缩写检索 (如 dto 命中 JSON 转实体生成器)', () => {
    const results = searchTools(mockTools, 'dto');
    expect(results.length).toBeGreaterThanOrEqual(1);
    const topMatch = results[0];
    expect(topMatch.tool.name).toBe('JSON 转实体生成器');
    expect(topMatch.matchType).toBe('keyword');
    expect(topMatch.matchedKeyword).toBe('dto');
    expect(topMatch.matchCue).toContain('dto');
  });

  it('6. 应该支持功能描述检索 (如 散列摘要 命中 哈希文本计算器)', () => {
    const results = searchTools(mockTools, '散列摘要');
    expect(results.length).toBeGreaterThanOrEqual(1);
    const topMatch = results[0];
    expect(topMatch.tool.name).toBe('哈希文本计算器');
    expect(topMatch.matchType).toBe('description');
  });

  it('7. 梯度权重排序：标题精准匹配优于拼音匹配，拼音匹配优于关键词匹配', () => {
    // 构造包含相似干扰项的数据集
    const customTools: ToolWithCategory[] = [
      {
        name: 'MD5 校验器',
        path: '/md5-checker',
        description: 'md5 工具',
        keywords: ['hash'],
        category: 'security',
        component: async () => ({}),
        icon: mockIcon,
        isNew: false,
      },
      {
        name: '其他工具',
        path: '/other-tool',
        description: '提供 md5 计算功能',
        keywords: ['md5'],
        category: 'dev',
        component: async () => ({}),
        icon: mockIcon,
        isNew: false,
      },
    ];

    const results = searchTools(customTools, 'md5');
    // 标题含有 MD5 的项排在前面，仅在 keywords 或 description 出现的排在后面
    expect(results[0].tool.name).toBe('MD5 校验器');
  });

  it('8. 边界条件防御：空白字符串、特殊符号与未命中处理', () => {
    expect(searchTools(mockTools, '   ')).toHaveLength(mockTools.length);
    expect(searchTools(mockTools, '!!!@@@###$$$%%%')).toHaveLength(0);
  });

  it('9. useToolSearch 响应式 Composable 能够在查询变更时实时重新计算', () => {
    const searchQuery = ref('');
    const { filteredTools, searchResult } = useToolSearch({
      tools: mockTools,
      searchQuery,
    });

    expect(filteredTools.value).toHaveLength(mockTools.length);
    expect(searchResult.value.every(r => r.matchType === 'none')).toBe(true);

    searchQuery.value = 'ewm';
    expect(filteredTools.value).toHaveLength(1);
    expect(filteredTools.value[0].name).toBe('二维码生成器');
    expect(searchResult.value[0].matchType).toBe('pinyin');

    searchQuery.value = '';
    expect(filteredTools.value).toHaveLength(mockTools.length);
  });
});
