/**
 * 模糊搜索 Composable 单元测试
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { useFuzzySearch } from './fuzzySearch';

describe('useFuzzySearch', () => {
  it('应该支持静态数组的基本模糊搜索', () => {
    const search = ref('json');
    const data = [
      { name: 'JSON Viewer', category: '工具' },
      { name: 'Base64 String', category: '工具' },
      { name: 'JSON to YAML', category: '工具' },
    ];

    const { searchResult } = useFuzzySearch({
      search,
      data,
      options: { keys: ['name'] },
    });

    expect(searchResult.value.length).toBe(2);
    expect(searchResult.value.map(item => item.name)).toContain('JSON Viewer');
    expect(searchResult.value.map(item => item.name)).toContain('JSON to YAML');
  });

  it('应该支持响应式 Ref 数据源并在数据更新时响应', () => {
    const search = ref('工具');
    const data = ref([
      { name: 'A', category: '工具' },
      { name: 'B', category: '页面' },
    ]);

    const { searchResult } = useFuzzySearch({
      search,
      data,
      options: { keys: ['category'] },
    });

    expect(searchResult.value.length).toBe(1);
    expect(searchResult.value[0].name).toBe('A');

    // 动态添加一项
    data.value = [
      ...data.value,
      { name: 'C', category: '工具' },
    ];

    expect(searchResult.value.length).toBe(2);
    expect(searchResult.value.map(item => item.name)).toContain('C');
  });

  it('在搜索关键词为空且 filterEmpty 为 false 时返回全量数据', () => {
    const search = ref('');
    const data = ['apple', 'banana', 'cherry'];

    const { searchResult } = useFuzzySearch({
      search,
      data,
      options: { filterEmpty: false },
    });

    expect(searchResult.value).toEqual(['apple', 'banana', 'cherry']);
  });
});
