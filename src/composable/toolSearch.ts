/**
 * 首页工具多维检索与拼音匹配服务
 *
 * @author Ateng
 * @since 2026-10-02
 */
import { type MaybeRef, get } from '@vueuse/core';
import { computed, type ComputedRef } from 'vue';
import Pinyin from 'pinyin-match';
import type { ToolWithCategory } from '../tools/tools.types';

export type MatchType = 'exact' | 'pinyin' | 'keyword' | 'description' | 'none';
export type MatchCueType = 'pinyin' | 'keyword' | 'path';

/**
 * 梯度检索权重分值配置
 */
export const TOOL_SEARCH_WEIGHTS = {
  EXACT_TITLE: 100,
  SUBSTRING_TITLE_BASE: 90,
  EXACT_SLUG: 85,
  PINYIN_TITLE_BASE: 80,
  SUBSTRING_SLUG: 75,
  EXACT_KEYWORD: 65,
  SUBSTRING_KEYWORD: 55,
  PINYIN_KEYWORD: 50,
  SUBSTRING_DESC: 35,
  PINYIN_DESC: 30,
} as const;

export interface ToolSearchResultItem {
  tool: ToolWithCategory;
  score: number;
  matchType: MatchType;
  matchRange?: [number, number];
  matchedKeyword?: string;
  matchCueType?: MatchCueType;
  matchCueValue?: string;
  matchCue?: string;
}

/**
 * 纯函数：对工具列表进行拼音首字母、全拼与中英文多维检索排序
 *
 * @param tools 全量工具列表
 * @param query 用户输入的搜索词
 * @returns 排序后的检索项列表
 */
export function searchTools(
  tools: ToolWithCategory[],
  query: string,
): ToolSearchResultItem[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return tools.map(tool => ({
      tool,
      score: 0,
      matchType: 'none',
    }));
  }

  const qLower = trimmed.toLowerCase();
  const results: ToolSearchResultItem[] = [];

  for (const tool of tools) {
    let bestScore = 0;
    let matchType: MatchType = 'none';
    let matchRange: [number, number] | undefined;
    let matchedKeyword: string | undefined;
    let matchCueType: MatchCueType | undefined;
    let matchCueValue: string | undefined;
    let matchCue: string | undefined;

    const nameLower = tool.name.toLowerCase();

    // 1. 标题完全相等或前缀匹配
    if (nameLower === qLower) {
      bestScore = TOOL_SEARCH_WEIGHTS.EXACT_TITLE;
      matchType = 'exact';
      matchRange = [0, tool.name.length - 1];
    } else {
      const nameSubIdx = nameLower.indexOf(qLower);
      if (nameSubIdx >= 0) {
        bestScore = TOOL_SEARCH_WEIGHTS.SUBSTRING_TITLE_BASE - nameSubIdx * 2;
        matchType = 'exact';
        matchRange = [nameSubIdx, nameSubIdx + qLower.length - 1];
      }
    }

    // 2. 拼音全拼 / 首字母匹配 (通过 pinyin-match)
    const pinyinMatch = Pinyin.match(tool.name, trimmed);
    if (pinyinMatch) {
      const [start, end] = pinyinMatch;
      const pinyinScore = TOOL_SEARCH_WEIGHTS.PINYIN_TITLE_BASE - start * 2;
      if (pinyinScore > bestScore) {
        bestScore = pinyinScore;
        matchType = 'pinyin';
        matchRange = [start, end];
        // 若标题中并未字面包含用户输入的查询词，则提供拼音命中线索数据
        if (!nameLower.includes(qLower)) {
          matchCueType = 'pinyin';
          matchCueValue = trimmed;
          matchCue = `pinyin: ${trimmed}`;
        }
      }
    }

    // 3. 路由路径 Slug 匹配
    const slug = tool.path.replace(/^\//, '').toLowerCase();
    if (slug === qLower && bestScore < TOOL_SEARCH_WEIGHTS.EXACT_SLUG) {
      bestScore = TOOL_SEARCH_WEIGHTS.EXACT_SLUG;
      matchType = 'keyword';
      matchedKeyword = tool.path;
      matchCueType = 'path';
      matchCueValue = tool.path;
      matchCue = `path: ${tool.path}`;
    } else if (slug.includes(qLower) && bestScore < TOOL_SEARCH_WEIGHTS.SUBSTRING_SLUG) {
      bestScore = TOOL_SEARCH_WEIGHTS.SUBSTRING_SLUG;
      matchType = 'keyword';
      matchedKeyword = tool.path;
      matchCueType = 'path';
      matchCueValue = tool.path;
      matchCue = `path: ${tool.path}`;
    }

    // 4. 关键词 Keywords 匹配
    if (Array.isArray(tool.keywords)) {
      for (const kw of tool.keywords) {
        const kwLower = kw.toLowerCase();
        if (kwLower === qLower) {
          if (bestScore < TOOL_SEARCH_WEIGHTS.EXACT_KEYWORD) {
            bestScore = TOOL_SEARCH_WEIGHTS.EXACT_KEYWORD;
            matchType = 'keyword';
            matchedKeyword = kw;
            matchCueType = 'keyword';
            matchCueValue = kw;
            matchCue = `keyword: ${kw}`;
          }
          break;
        } else if (kwLower.includes(qLower)) {
          if (bestScore < TOOL_SEARCH_WEIGHTS.SUBSTRING_KEYWORD) {
            bestScore = TOOL_SEARCH_WEIGHTS.SUBSTRING_KEYWORD;
            matchType = 'keyword';
            matchedKeyword = kw;
            matchCueType = 'keyword';
            matchCueValue = kw;
            matchCue = `keyword: ${kw}`;
          }
        } else {
          const kwPinyin = Pinyin.match(kw, trimmed);
          if (kwPinyin && bestScore < TOOL_SEARCH_WEIGHTS.PINYIN_KEYWORD) {
            bestScore = TOOL_SEARCH_WEIGHTS.PINYIN_KEYWORD;
            matchType = 'keyword';
            matchedKeyword = kw;
            matchCueType = 'keyword';
            matchCueValue = kw;
            matchCue = `keyword: ${kw}`;
          }
        }
      }
    }

    // 5. 描述 Description 匹配
    const descLower = tool.description.toLowerCase();
    const descIdx = descLower.indexOf(qLower);
    if (descIdx >= 0) {
      if (bestScore < TOOL_SEARCH_WEIGHTS.SUBSTRING_DESC) {
        bestScore = TOOL_SEARCH_WEIGHTS.SUBSTRING_DESC;
        matchType = 'description';
      }
    } else {
      const descPinyin = Pinyin.match(tool.description, trimmed);
      if (descPinyin && bestScore < TOOL_SEARCH_WEIGHTS.PINYIN_DESC) {
        bestScore = TOOL_SEARCH_WEIGHTS.PINYIN_DESC;
        matchType = 'description';
      }
    }

    // 若有命中得分，加入结果集
    if (bestScore > 0) {
      results.push({
        tool,
        score: bestScore,
        matchType,
        matchRange,
        matchedKeyword,
        matchCueType,
        matchCueValue,
        matchCue,
      });
    }
  }

  // 按得分降序排序
  return results.sort((a, b) => b.score - a.score);
}

/**
 * 响应式 Hook：将工具列表与搜索文本进行实时绑定过滤
 *
 * @param options 输入参数对象，包含 tools 与 searchQuery
 * @returns 包含响应式 searchResult 与 filteredTools 的对象
 */
export function useToolSearch({
  tools,
  searchQuery,
}: {
  tools: MaybeRef<ToolWithCategory[]>;
  searchQuery: MaybeRef<string>;
}): {
  searchResult: ComputedRef<ToolSearchResultItem[]>;
  filteredTools: ComputedRef<ToolWithCategory[]>;
} {
  const searchResult = computed<ToolSearchResultItem[]>(() => {
    const rawTools = get(tools) ?? [];
    const query = get(searchQuery) ?? '';
    return searchTools(rawTools, query);
  });

  const filteredTools = computed<ToolWithCategory[]>(() => {
    return searchResult.value.map(item => item.tool);
  });

  return {
    searchResult,
    filteredTools,
  };
}
