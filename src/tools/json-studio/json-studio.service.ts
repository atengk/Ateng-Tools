/**
 * JSON Studio 核心业务服务层
 * 纯函数实现，无 DOM / Vue 依赖，高度可测试
 *
 * @author Ateng
 * @since 2026-10-02
 */

import JSON5 from 'json5';
import { camelCase, paramCase, pascalCase, snakeCase } from 'change-case';
import type {
  BasicMetrics,
  FormatOptions,
  FormatResult,
  JsonDetailedMetrics,
  JsonPathMatchItem,
  JsonPathQueryResult,
  JsonTreeNode,
  JsonTypeDistribution,
  JsonValidationResult,
  JsonValueType,
  KeyCaseType,
  SmartRepairResult,
  StringEscapeResult,
  TransformResult,
} from './json-studio.types';

/**
 * 校验输入文本是否为合法的 JSON 语法
 *
 * @param raw 待校验的原始字符串
 * @returns 语法校验结果与错误描述
 */
export function validateJson(raw: string): JsonValidationResult {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { isValid: true };
  }

  try {
    JSON.parse(trimmed);
    return { isValid: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      error: message,
    };
  }
}

/**
 * 格式化排版 JSON 文本
 * 优先采用严格 JSON 解析，失败时尝试 JSON5 容错解析
 *
 * @param raw 原始 JSON 字符串
 * @param options 格式化选项 (缩进空格数或 Tab)
 * @returns 格式化后的排版结果
 */
export function formatJson(raw: string, options: FormatOptions = {}): FormatResult {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { success: true, output: '' };
  }

  let indentStr: string | number = 2;
  if (options.indent === 4) {
    indentStr = 4;
  } else if (options.indent === 'tab') {
    indentStr = '\t';
  }

  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // 降级尝试以 JSON5 解析
      parsed = JSON5.parse(trimmed);
    }
    const output = JSON.stringify(parsed, null, indentStr);
    return { success: true, output };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid JSON syntax';
    return { success: false, output: raw, error: errorMsg };
  }
}

/**
 * 紧凑单行压缩 JSON 文本
 *
 * @param raw 原始 JSON 字符串
 * @returns 压缩后的单行结果
 */
export function minifyJson(raw: string): FormatResult {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { success: true, output: '' };
  }

  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parsed = JSON5.parse(trimmed);
    }
    const output = JSON.stringify(parsed);
    return { success: true, output };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid JSON syntax';
    return { success: false, output: raw, error: errorMsg };
  }
}

/**
 * 计算 JSON 基础尺寸、行数与字符度量
 *
 * @param raw 原始字符串
 * @returns 基础度量指标
 */
export function calculateBasicMetrics(raw: string): BasicMetrics {
  const charCount = raw.length;
  const lineCount = raw === '' ? 0 : raw.split(/\r\n|\r|\n/).length;

  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(raw).length;

  let formattedBytes = 0;
  let minifiedBytes = 0;

  if (raw.trim() !== '') {
    try {
      const parsed = JSON.parse(raw);
      formattedBytes = encoder.encode(JSON.stringify(parsed, null, 2)).length;
      minifiedBytes = encoder.encode(JSON.stringify(parsed)).length;
    } catch {
      // 语法无效时保持 0
    }
  }

  return {
    rawBytes,
    formattedBytes,
    minifiedBytes,
    lineCount,
    charCount,
  };
}

/**
 * 人类可读的字节体积格式化 (B / KB / MB)
 *
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0 || !Number.isFinite(bytes)) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 100 || i === 0 ? 0 : 2)} ${units[i]}`;
}

/**
 * 获取用于快速演示与探索的示例 JSON 数据
 *
 * @returns 结构丰富的标准 JSON 字符串
 */
export function getSampleJson(): string {
  const sample = {
    service: 'ateng-tools-gateway',
    version: '1.0.0',
    active: true,
    port: 8080,
    cluster: {
      region: 'ap-east-1',
      zone: 'zone-b',
      replicas: 3,
      tags: ['production', 'gateway', 'offline-first'],
    },
    endpoints: [
      {
        path: '/api/v1/health',
        method: 'GET',
        authenticated: false,
        rate_limit: null,
      },
      {
        path: '/api/v1/tools',
        method: 'POST',
        authenticated: true,
        rate_limit: {
          requests_per_minute: 120,
          burst: 30,
        },
      },
    ],
    metadata: {
      author: 'Ateng',
      license: 'GNU GPLv3',
      updated_at: '2026-10-02T10:00:00Z',
    },
  };

  return JSON.stringify(sample, null, 2);
}

/**
 * 确定 JavaScript 任意值的精准 JSON 类型
 *
 * @param val 待判断的任意值
 * @returns 标准 JsonValueType
 */
export function determineJsonType(val: unknown): JsonValueType {
  if (val === null) {
    return 'null';
  }
  if (Array.isArray(val)) {
    return 'array';
  }
  if (typeof val === 'object') {
    return 'object';
  }
  if (typeof val === 'number') {
    return 'number';
  }
  if (typeof val === 'boolean') {
    return 'boolean';
  }
  return 'string';
}

/**
 * 递归构建供视图层渲染的交互式 JSON 树形节点结构
 *
 * @param value 目标对象或值
 * @param rootPath 当前节点绝对 JSONPath 路径，默认 "$"
 * @param depth 当前层级深度，默认 0
 * @param keyName 节点键名或索引描述，默认 "$"
 * @param idPrefix 节点唯一 ID 前缀，默认 "root"
 * @returns 树形节点结构
 */
export function buildJsonTree(
  value: unknown,
  rootPath = '$',
  depth = 0,
  keyName = '$',
  idPrefix = 'root',
): JsonTreeNode {
  const type = determineJsonType(value);

  if (type === 'null') {
    return {
      id: idPrefix,
      key: keyName,
      jsonPath: rootPath,
      type: 'null',
      value: null,
      displayValue: 'null',
      depth,
    };
  }

  if (type === 'string') {
    return {
      id: idPrefix,
      key: keyName,
      jsonPath: rootPath,
      type: 'string',
      value,
      displayValue: JSON.stringify(value),
      depth,
    };
  }

  if (type === 'number' || type === 'boolean') {
    return {
      id: idPrefix,
      key: keyName,
      jsonPath: rootPath,
      type,
      value,
      displayValue: String(value),
      depth,
    };
  }

  if (type === 'array') {
    const arr = value as unknown[];
    const children: JsonTreeNode[] = arr.map((item, idx) =>
      buildJsonTree(item, `${rootPath}[${idx}]`, depth + 1, `[${idx}]`, `${idPrefix}[${idx}]`),
    );
    return {
      id: idPrefix,
      key: keyName,
      jsonPath: rootPath,
      type: 'array',
      value,
      displayValue: `[ ${arr.length} 项 ]`,
      depth,
      childCount: arr.length,
      children,
    };
  }

  // object
  const obj = (value ?? {}) as Record<string, unknown>;
  const keys = Object.keys(obj);
  const children: JsonTreeNode[] = keys.map(k => {
    const isStandardIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k);
    const childPath = isStandardIdentifier ? `${rootPath}.${k}` : `${rootPath}['${k}']`;
    return buildJsonTree(obj[k], childPath, depth + 1, k, `${idPrefix}.${k}`);
  });

  return {
    id: idPrefix,
    key: keyName,
    jsonPath: rootPath,
    type: 'object',
    value,
    displayValue: `{ ${keys.length} 个键 }`,
    depth,
    childCount: keys.length,
    children,
  };
}

/**
 * 递归收集所有包含子节点的容器节点 ID (用于全部展开)
 *
 * @param node 根节点
 * @returns 容器节点 ID 列表
 */
export function collectAllContainerIds(node: JsonTreeNode): string[] {
  const ids: string[] = [];
  function traverse(n: JsonTreeNode) {
    if (n.children && n.children.length > 0) {
      ids.push(n.id);
      n.children.forEach(traverse);
    }
  }
  traverse(node);
  return ids;
}

/**
 * 根据指定最大展开层级筛选待展开的容器节点 ID (用于展开至第 1/2/3 层)
 *
 * @param node 根节点
 * @param maxDepth 最大展开深度 (如 1 表示仅展开根节点深度 0，显示其直接子节点)
 * @returns 待展开节点 ID 列表
 */
export function collectNodeIdsByDepth(node: JsonTreeNode, maxDepth: number): string[] {
  const ids: string[] = [];
  function traverse(n: JsonTreeNode) {
    if (n.depth < maxDepth && n.children && n.children.length > 0) {
      ids.push(n.id);
      n.children.forEach(traverse);
    }
  }
  traverse(node);
  return ids;
}

/**
 * 提取节点的复制文本 (基本类型提取原值，对象/数组提取格式化 JSON)
 *
 * @param node 目标节点
 * @returns 可直接复制的文本
 */
export function getNodeValueForCopy(node: JsonTreeNode): string {
  if (node.type === 'string') {
    return typeof node.value === 'string' ? node.value : String(node.value);
  }
  if (node.type === 'number' || node.type === 'boolean' || node.type === 'null') {
    return String(node.value);
  }
  return JSON.stringify(node.value, null, 2);
}

/**
 * 树内文本搜索与过滤
 *
 * @param node 根节点
 * @param query 搜索关键词
 * @returns 过滤后的树形节点、匹配数量与命中 JSONPath 集合
 */
export function filterJsonTree(
  node: JsonTreeNode,
  query: string,
): { filteredNode: JsonTreeNode | null; matchedCount: number; matchedPaths: Set<string>; expandedIds: Set<string> } {
  const q = query.trim().toLowerCase();
  if (q === '') {
    return {
      filteredNode: node,
      matchedCount: 0,
      matchedPaths: new Set(),
      expandedIds: new Set(),
    };
  }

  const matchedPaths = new Set<string>();
  const expandedIds = new Set<string>();
  let matchedCount = 0;

  function matches(n: JsonTreeNode): boolean {
    const keyMatch = n.key.toLowerCase().includes(q);
    const valueMatch =
      typeof n.value === 'string' || typeof n.value === 'number' || typeof n.value === 'boolean'
        ? String(n.value).toLowerCase().includes(q)
        : false;
    const pathMatch = n.jsonPath.toLowerCase().includes(q);
    return keyMatch || valueMatch || pathMatch;
  }

  function walk(n: JsonTreeNode): JsonTreeNode | null {
    const selfMatch = matches(n);
    if (selfMatch) {
      matchedCount += 1;
      matchedPaths.add(n.jsonPath);
    }

    if (!n.children || n.children.length === 0) {
      return selfMatch ? { ...n } : null;
    }

    const filteredChildren: JsonTreeNode[] = [];
    for (const child of n.children) {
      const filteredChild = walk(child);
      if (filteredChild) {
        filteredChildren.push(filteredChild);
      }
    }

    if (selfMatch || filteredChildren.length > 0) {
      expandedIds.add(n.id);
      return {
        ...n,
        children: filteredChildren,
      };
    }

    return null;
  }

  const filtered = walk(node);
  return {
    filteredNode: filtered,
    matchedCount,
    matchedPaths,
    expandedIds,
  };
}

/**
 * 纯客户端非标 JSON 语法智能修复
 * 覆盖：
 * 1. 纠偏 Python 关键字字面量 (None -> null, True -> true, False -> false)
 * 2. 剥离单行注释 (//) 与多行注释 (/* ... *\/)
 * 3. 清理对象与数组尾随冗余逗号 (, } / , ])
 * 4. 纠正单引号属性名与单引号字符串为标准双引号 ('...' -> "...")
 * 5. 自动补全未加引号的对象属性名 ({ name: "Tom" } -> { "name": "Tom" })
 * 6. 控制字符与转义字符标准化
 *
 * @param input 原始可能损坏或非标的 JSON 文本
 * @returns 修复结果契约
 */
export function smartRepairJson(input: string): SmartRepairResult {
  const trimmed = input.trim();
  if (trimmed === '') {
    return {
      repairedText: '',
      repairedJson: '',
      hasChanges: false,
      success: true,
      repairedRules: [],
      appliedRules: [],
    };
  }

  // 1. 如果原始文本已是严格合法 JSON，无需变更
  try {
    const directParsed = JSON.parse(trimmed);
    const directText = JSON.stringify(directParsed, null, 2);
    return {
      repairedText: directText,
      repairedJson: directText,
      hasChanges: false,
      success: true,
      repairedRules: [],
      appliedRules: [],
    };
  } catch {
    // 进入容错修复管线
  }

  const repairedRules: string[] = [];
  let working = trimmed;

  // 规则 1：Python 字面量纠偏
  if (/\b(None|True|False)\b/.test(working)) {
    const before = working;
    working = working
      .replace(/\bNone\b/g, 'null')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false');
    if (working !== before) {
      repairedRules.push('纠偏 Python 关键字字面量 (None/True/False -> null/true/false)');
    }
  }

  // 规则 2：清理 JavaScript 注释
  if (/\/\/.*|\/\*[\s\S]*?\*\//.test(working)) {
    const before = working;
    working = working
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '');
    if (working !== before) {
      repairedRules.push('剥离 JavaScript 单行与多行注释');
    }
  }

  // 规则 3：纠正单引号键和值 ('key': 'value')
  if (/'([^'\\]*(?:\\.[^'\\]*)*)'/.test(working)) {
    const before = working;
    working = working.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, content) => {
      const escapedDoubleQuotes = content.replace(/"/g, '\\"').replace(/\\'/g, "'");
      return `"${escapedDoubleQuotes}"`;
    });
    if (working !== before) {
      repairedRules.push('纠正单引号包裹的键名与字符串为标准双引号');
    }
  }

  // 规则 4：为未加引号的对象键名自动补全双引号
  const unquotedKeyRegex = /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$-]*)\s*:/g;
  if (unquotedKeyRegex.test(working)) {
    const before = working;
    working = working.replace(unquotedKeyRegex, '$1"$2":');
    if (working !== before) {
      repairedRules.push('补全对象中缺失双引号的属性键名');
    }
  }

  // 规则 5：清理尾随逗号 (Trailing commas)
  if (/,\s*([}\]])/.test(working)) {
    const before = working;
    working = working.replace(/,\s*([}\]])/g, '$1');
    if (working !== before) {
      repairedRules.push('清理对象与数组中多余的尾随逗号');
    }
  }

  // 尝试以标准 JSON 解析已清洗文本
  try {
    const parsed = JSON.parse(working);
    const repairedText = JSON.stringify(parsed, null, 2);
    const rules = repairedRules.length > 0 ? repairedRules : ['语法格式标准化修复'];
    return {
      repairedText,
      repairedJson: repairedText,
      hasChanges: true,
      success: true,
      repairedRules: rules,
      appliedRules: rules,
    };
  } catch {
    // 降级尝试以 JSON5 解析兜底
    try {
      const parsed5 = JSON5.parse(working);
      const repairedText = JSON.stringify(parsed5, null, 2);
      if (repairedRules.length === 0) {
        repairedRules.push('解析器容错规范化修复');
      }
      return {
        repairedText,
        repairedJson: repairedText,
        hasChanges: true,
        success: true,
        repairedRules,
        appliedRules: repairedRules,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '无法自动修复当前损坏的语法';
      return {
        repairedText: working,
        repairedJson: working,
        hasChanges: working !== trimmed,
        success: false,
        repairedRules,
        appliedRules: repairedRules,
        error: errorMsg,
      };
    }
  }
}

/**
 * 双向字符串反转义 (Unescape)
 * 将从日志、网关或代码字面量中复制出的嵌套转义 JSON 字符串还原为标准格式
 *
 * @param raw 待反转义的字符串
 * @returns 反转义结果
 */
export function unescapeJsonString(raw: string): StringEscapeResult {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { success: true, output: '' };
  }

  let text = trimmed;

  // 如果首尾包含双引号或单引号包裹，尝试剥离
  if (
    (text.startsWith('"') && text.endsWith('"') && text.length >= 2) ||
    (text.startsWith("'") && text.endsWith("'") && text.length >= 2)
  ) {
    try {
      const unwrapped = JSON.parse(text);
      if (typeof unwrapped === 'string') {
        text = unwrapped;
      }
    } catch {
      text = text.slice(1, -1);
    }
  }

  // 还原转义字符：\" -> ", \\ -> \, \n -> 换行, \t -> 制表符, \r -> 回车
  text = text
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r');

  // 如果反转义后的内容是合法 JSON，自动进行排版美化
  try {
    const parsed = JSON.parse(text);
    return {
      success: true,
      output: JSON.stringify(parsed, null, 2),
    };
  } catch {
    return {
      success: true,
      output: text,
    };
  }
}

/**
 * 双向字符串转义 (Escape)
 * 将 JSON 压缩并转义为可直接嵌入代码字符串字面量的安全字符串
 *
 * @param raw 原始 JSON 字符串
 * @returns 转义后的单行代码字符串
 */
export function escapeJsonString(raw: string): StringEscapeResult {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { success: true, output: '""' };
  }

  let minified = trimmed;
  try {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      parsed = JSON5.parse(trimmed);
    }
    minified = JSON.stringify(parsed);
  } catch {
    minified = trimmed.replace(/\r?\n\s*/g, ' ');
  }

  const escaped = JSON.stringify(minified);
  return {
    success: true,
    output: escaped,
  };
}

/**
 * 内部 JSONPath 解析路径段模型
 */
interface PathStep {
  isRecursive: boolean;
  type: 'property' | 'wildcard' | 'index' | 'slice' | 'filter' | 'union';
  property?: string;
  index?: number;
  slice?: { start?: number; end?: number; step?: number };
  filter?: {
    path: string;
    op?: '==' | '!=' | '<' | '<=' | '>' | '>=';
    val?: unknown;
  };
  union?: (string | number)[];
}

/**
 * 递归收集节点及其所有子孙节点
 */
function collectDescendants(node: unknown, currentPath: string): { value: unknown; path: string }[] {
  const result: { value: unknown; path: string }[] = [{ value: node, path: currentPath }];
  if (Array.isArray(node)) {
    for (let idx = 0; idx < node.length; idx++) {
      result.push(...collectDescendants(node[idx], `${currentPath}[${idx}]`));
    }
  } else if (node !== null && typeof node === 'object') {
    for (const key of Object.keys(node as Record<string, unknown>)) {
      result.push(...collectDescendants((node as Record<string, unknown>)[key], `${currentPath}.${key}`));
    }
  }
  return result;
}

/**
 * 解析切片参数
 */
function parseSlice(sliceStr: string) {
  const parts = sliceStr.split(':');
  const start = parts[0]?.trim() !== '' ? Number(parts[0]) : undefined;
  const end = parts[1]?.trim() !== '' ? Number(parts[1]) : undefined;
  const step = parts[2] !== undefined && parts[2].trim() !== '' ? Number(parts[2]) : 1;
  return { start, end, step };
}

/**
 * 解析过滤表达式
 */
function parseFilterExpression(content: string) {
  const trimmed = content.trim();
  // 匹配操作符 ==, !=, <=, >=, <, >
  const match = trimmed.match(
    /^@(?:\.([a-zA-Z0-9_$]+)|\[(?:'([^']+)'|"([^"]+)"|(\d+))\])\s*(==|!=|<=|>=|<|>)\s*(.+)$/,
  );
  if (match) {
    const field = match[1] || match[2] || match[3] || match[4];
    const op = match[5] as '==' | '!=' | '<' | '<=' | '>' | '>=';
    const rawVal = match[6].trim();
    let val: unknown = rawVal;
    if ((rawVal.startsWith("'") && rawVal.endsWith("'")) || (rawVal.startsWith('"') && rawVal.endsWith('"'))) {
      val = rawVal.slice(1, -1);
    } else if (rawVal === 'true') {
      val = true;
    } else if (rawVal === 'false') {
      val = false;
    } else if (rawVal === 'null') {
      val = null;
    } else if (!isNaN(Number(rawVal))) {
      val = Number(rawVal);
    }
    return { path: field, op, val };
  }

  // 存在性测试：@.isbn 或 @.prop
  const existsMatch = trimmed.match(/^@(?:\.([a-zA-Z0-9_$]+)|\[(?:'([^']+)'|"([^"]+)"|(\d+))\])$/);
  if (existsMatch) {
    const field = existsMatch[1] || existsMatch[2] || existsMatch[3] || existsMatch[4];
    return { path: field };
  }

  // 兜底返回原生路径
  return { path: trimmed.replace(/^@\.?/, '') };
}

/**
 * 对单项评估过滤条件
 */
function evaluateFilterItem(
  item: unknown,
  filterInfo: { path: string; op?: '==' | '!=' | '<' | '<=' | '>' | '>='; val?: unknown },
): boolean {
  if (item === null || typeof item !== 'object') {
    return false;
  }
  const obj = item as Record<string, unknown>;
  const propVal = obj[filterInfo.path];

  // 仅存在性测试
  if (!filterInfo.op) {
    return filterInfo.path in obj && propVal !== undefined && propVal !== null && propVal !== false;
  }

  // 比较操作符
  const target = filterInfo.val;
  switch (filterInfo.op) {
    case '==':
      // eslint-disable-next-line eqeqeq
      return propVal == target;
    case '!=':
      // eslint-disable-next-line eqeqeq
      return propVal != target;
    case '>':
      return Number(propVal) > Number(target);
    case '>=':
      return Number(propVal) >= Number(target);
    case '<':
      return Number(propVal) < Number(target);
    case '<=':
      return Number(propVal) <= Number(target);
    default:
      return false;
  }
}

/**
 * 解析 JSONPath 路径表达式为结构化步进序列
 */
function parseJsonPath(rawExpr: string): PathStep[] {
  let str = rawExpr.trim();
  if (str.startsWith('$')) {
    str = str.slice(1);
  }

  const steps: PathStep[] = [];
  let i = 0;
  const len = str.length;

  while (i < len) {
    let isRecursive = false;

    if (str.startsWith('..', i)) {
      isRecursive = true;
      i += 2;
    } else if (str[i] === '.') {
      i += 1;
    }

    if (i >= len) {
      break;
    }

    if (str[i] === '[') {
      const bracketStart = i;
      let bracketEnd = -1;
      let inSingleQuote = false;
      let inDoubleQuote = false;
      let parenDepth = 0;

      for (let j = i + 1; j < len; j++) {
        const char = str[j];
        const prevChar = str[j - 1];

        if (char === "'" && prevChar !== '\\' && !inDoubleQuote) {
          inSingleQuote = !inSingleQuote;
        } else if (char === '"' && prevChar !== '\\' && !inSingleQuote) {
          inDoubleQuote = !inDoubleQuote;
        } else if (!inSingleQuote && !inDoubleQuote) {
          if (char === '(') parenDepth++;
          else if (char === ')') parenDepth--;
          else if (char === ']' && parenDepth === 0) {
            bracketEnd = j;
            break;
          }
        }
      }

      if (bracketEnd === -1) {
        throw new Error(`缺少闭合方括号 ']'，位于位置 ${bracketStart}`);
      }

      const inside = str.slice(bracketStart + 1, bracketEnd).trim();
      i = bracketEnd + 1;

      if (inside.startsWith('?')) {
        let filterContent = inside.slice(1).trim();
        if (filterContent.startsWith('(') && filterContent.endsWith(')')) {
          filterContent = filterContent.slice(1, -1).trim();
        }
        steps.push({
          isRecursive,
          type: 'filter',
          filter: parseFilterExpression(filterContent),
        });
      } else if (inside.includes(':')) {
        steps.push({
          isRecursive,
          type: 'slice',
          slice: parseSlice(inside),
        });
      } else if (inside === '*') {
        steps.push({
          isRecursive,
          type: 'wildcard',
        });
      } else if (
        (inside.startsWith("'") && inside.endsWith("'")) ||
        (inside.startsWith('"') && inside.endsWith('"'))
      ) {
        steps.push({
          isRecursive,
          type: 'property',
          property: inside.slice(1, -1),
        });
      } else if (inside.includes(',')) {
        const parts = inside.split(',').map(p => p.trim());
        const unionItems = parts.map(p => {
          if ((p.startsWith("'") && p.endsWith("'")) || (p.startsWith('"') && p.endsWith('"'))) {
            return p.slice(1, -1);
          }
          const num = Number(p);
          return isNaN(num) ? p : num;
        });
        steps.push({
          isRecursive,
          type: 'union',
          union: unionItems,
        });
      } else if (/^-?\d+$/.test(inside)) {
        steps.push({
          isRecursive,
          type: 'index',
          index: Number(inside),
        });
      } else {
        steps.push({
          isRecursive,
          type: 'property',
          property: inside,
        });
      }
    } else {
      let nameEnd = i;
      while (nameEnd < len && str[nameEnd] !== '.' && str[nameEnd] !== '[') {
        nameEnd++;
      }
      const propName = str.slice(i, nameEnd).trim();
      i = nameEnd;

      if (propName === '*') {
        steps.push({
          isRecursive,
          type: 'wildcard',
        });
      } else if (propName.length > 0) {
        steps.push({
          isRecursive,
          type: 'property',
          property: propName,
        });
      }
    }
  }

  return steps;
}

/**
 * 纯客户端标准 JSONPath 语法查询引擎
 * 支持根选择器 ($)、通配符 (*)、切片 ([start:end:step])、深度递归 (..) 与属性过滤表达式 ([?(@.price < 30)])
 *
 * @param source JSON 数据对象或待解析的 JSON 字符串
 * @param expression JSONPath 查询表达式
 * @returns 标准查询结果契约
 */
export function queryJsonPath(source: unknown, expression: string): JsonPathQueryResult {
  const trimmedExpr = expression.trim();
  if (trimmedExpr === '') {
    return {
      success: true,
      expression: trimmedExpr,
      items: [],
      results: [],
      matchedPaths: [],
    };
  }

  let rootData: unknown = source;
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (trimmed === '') {
      return {
        success: true,
        expression: trimmedExpr,
        items: [],
        results: [],
        matchedPaths: [],
      };
    }
    try {
      rootData = JSON.parse(trimmed);
    } catch {
      try {
        rootData = JSON5.parse(trimmed);
      } catch (err: unknown) {
        return {
          success: false,
          expression: trimmedExpr,
          items: [],
          results: [],
          matchedPaths: [],
          error: `无法解析源 JSON 数据: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  // 纯根路径直接返回
  if (trimmedExpr === '$') {
    return {
      success: true,
      expression: trimmedExpr,
      items: [{ path: '$', value: rootData }],
      results: [rootData],
      matchedPaths: ['$'],
    };
  }

  let steps: PathStep[];
  try {
    steps = parseJsonPath(trimmedExpr);
  } catch (err: unknown) {
    return {
      success: false,
      expression: trimmedExpr,
      items: [],
      results: [],
      matchedPaths: [],
      error: `JSONPath 表达式解析异常: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  let currentSet: { value: unknown; path: string }[] = [{ value: rootData, path: '$' }];

  for (const step of steps) {
    let candidatePool: { value: unknown; path: string }[] = [];

    if (step.isRecursive) {
      for (const node of currentSet) {
        candidatePool.push(...collectDescendants(node.value, node.path));
      }
    } else {
      candidatePool = currentSet;
    }

    const nextSet: { value: unknown; path: string }[] = [];

    for (const item of candidatePool) {
      const val = item.value;
      const curPath = item.path;

      if (val === null || val === undefined) {
        continue;
      }

      if (step.type === 'property' && step.property !== undefined) {
        if (typeof val === 'object' && !Array.isArray(val) && Object.prototype.hasOwnProperty.call(val, step.property)) {
          nextSet.push({
            value: (val as Record<string, unknown>)[step.property],
            path: `${curPath}.${step.property}`,
          });
        }
      } else if (step.type === 'index' && step.index !== undefined) {
        if (Array.isArray(val)) {
          const actualIdx = step.index < 0 ? val.length + step.index : step.index;
          if (actualIdx >= 0 && actualIdx < val.length) {
            nextSet.push({
              value: val[actualIdx],
              path: `${curPath}[${actualIdx}]`,
            });
          }
        }
      } else if (step.type === 'wildcard') {
        if (Array.isArray(val)) {
          for (let idx = 0; idx < val.length; idx++) {
            nextSet.push({
              value: val[idx],
              path: `${curPath}[${idx}]`,
            });
          }
        } else if (typeof val === 'object') {
          for (const k of Object.keys(val as Record<string, unknown>)) {
            nextSet.push({
              value: (val as Record<string, unknown>)[k],
              path: `${curPath}.${k}`,
            });
          }
        }
      } else if (step.type === 'slice' && step.slice) {
        if (Array.isArray(val)) {
          const len = val.length;
          const { start, end, step: st = 1 } = step.slice;
          const s = start === undefined ? 0 : (start < 0 ? Math.max(0, len + start) : Math.min(len, start));
          const e = end === undefined ? len : (end < 0 ? Math.max(0, len + end) : Math.min(len, end));

          if (st > 0) {
            for (let idx = s; idx < e; idx += st) {
              nextSet.push({
                value: val[idx],
                path: `${curPath}[${idx}]`,
              });
            }
          }
        }
      } else if (step.type === 'filter' && step.filter) {
        if (Array.isArray(val)) {
          for (let idx = 0; idx < val.length; idx++) {
            if (evaluateFilterItem(val[idx], step.filter)) {
              nextSet.push({
                value: val[idx],
                path: `${curPath}[${idx}]`,
              });
            }
          }
        } else if (typeof val === 'object') {
          for (const k of Object.keys(val as Record<string, unknown>)) {
            const childVal = (val as Record<string, unknown>)[k];
            if (evaluateFilterItem(childVal, step.filter)) {
              nextSet.push({
                value: childVal,
                path: `${curPath}.${k}`,
              });
            }
          }
        }
      } else if (step.type === 'union' && step.union) {
        if (Array.isArray(val)) {
          for (const u of step.union) {
            if (typeof u === 'number') {
              const actualIdx = u < 0 ? val.length + u : u;
              if (actualIdx >= 0 && actualIdx < val.length) {
                nextSet.push({
                  value: val[actualIdx],
                  path: `${curPath}[${actualIdx}]`,
                });
              }
            }
          }
        } else if (typeof val === 'object') {
          for (const u of step.union) {
            const prop = String(u);
            if (Object.prototype.hasOwnProperty.call(val, prop)) {
              nextSet.push({
                value: (val as Record<string, unknown>)[prop],
                path: `${curPath}.${prop}`,
              });
            }
          }
        }
      }
    }

    currentSet = nextSet;
  }

  // 基于 path 去重
  const seenPaths = new Set<string>();
  const uniqueItems: JsonPathMatchItem[] = [];

  for (const item of currentSet) {
    if (!seenPaths.has(item.path)) {
      seenPaths.add(item.path);
      uniqueItems.push({
        path: item.path,
        value: item.value,
      });
    }
  }

  return {
    success: true,
    expression: trimmedExpr,
    items: uniqueItems,
    results: uniqueItems.map(i => i.value),
    matchedPaths: uniqueItems.map(i => i.path),
  };
}

/**
 * 转换单一键名的风格
 */
function convertKeyCase(key: string, targetCase: KeyCaseType): string {
  if (/^\d+$/.test(key)) {
    return key;
  }
  switch (targetCase) {
    case 'camelCase':
      return camelCase(key);
    case 'snake_case':
      return snakeCase(key);
    case 'kebab-case':
      return paramCase(key);
    case 'pascalCase':
      return pascalCase(key);
    default:
      return key;
  }
}

/**
 * 深层递归批量转换 JSON 对象/数组中的所有键名命名风格
 *
 * @param source JSON 数据对象或字符串
 * @param targetCase 目标命名风格 (camelCase / snake_case / kebab-case / pascalCase)
 * @returns 转换结果契约
 */
export function transformKeyCase(source: unknown, targetCase: KeyCaseType): TransformResult {
  let parsed: unknown = source;
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (trimmed === '') {
      return { success: true, output: '' };
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      try {
        parsed = JSON5.parse(trimmed);
      } catch (err: unknown) {
        return {
          success: false,
          output: '',
          error: `源数据无法被解析为合法 JSON: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  function walk(node: unknown): unknown {
    if (Array.isArray(node)) {
      return node.map(item => walk(item));
    }
    if (node !== null && typeof node === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        const transformedKey = convertKeyCase(k, targetCase);
        result[transformedKey] = walk(v);
      }
      return result;
    }
    return node;
  }

  try {
    const transformed = walk(parsed);
    return {
      success: true,
      output: JSON.stringify(transformed, null, 2),
    };
  } catch (err: unknown) {
    return {
      success: false,
      output: '',
      error: `键名风格转换异常: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * 将深层嵌套的 JSON 结构扁平化为一层键值对 (Flatten)
 * 数组采用 [0] 标识，对象属性采用点号连接 (如 user.profile.name, items[0].id)
 *
 * @param source JSON 数据对象或字符串
 * @returns 扁平化结果契约
 */
export function flattenJson(source: unknown): TransformResult {
  let parsed: unknown = source;
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (trimmed === '') {
      return { success: true, output: '' };
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      try {
        parsed = JSON5.parse(trimmed);
      } catch (err: unknown) {
        return {
          success: false,
          output: '',
          error: `源数据无法被解析为合法 JSON: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  if (parsed === null || typeof parsed !== 'object') {
    return {
      success: true,
      output: JSON.stringify(parsed, null, 2),
    };
  }

  const flattened: Record<string, unknown> = {};

  function recurse(cur: unknown, prop: string) {
    if (cur === null || typeof cur !== 'object') {
      flattened[prop] = cur;
      return;
    }

    if (Array.isArray(cur)) {
      if (cur.length === 0) {
        flattened[prop] = [];
        return;
      }
      for (let i = 0; i < cur.length; i++) {
        recurse(cur[i], prop ? `${prop}[${i}]` : `[${i}]`);
      }
      return;
    }

    const keys = Object.keys(cur as Record<string, unknown>);
    if (keys.length === 0) {
      flattened[prop] = {};
      return;
    }

    for (const key of keys) {
      const val = (cur as Record<string, unknown>)[key];
      recurse(val, prop ? `${prop}.${key}` : key);
    }
  }

  try {
    recurse(parsed, '');
    return {
      success: true,
      output: JSON.stringify(flattened, null, 2),
    };
  } catch (err: unknown) {
    return {
      success: false,
      output: '',
      error: `扁平化处理异常: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * 分词解析扁平键名路径
 * 例如 "user.profile.name" -> ["user", "profile", "name"]
 * 例如 "items[0].id" -> ["items", 0, "id"]
 * 例如 "[0]" -> [0]
 */
function parseFlattenedKeyTokens(key: string): (string | number)[] {
  const tokens: (string | number)[] = [];
  const regex = /(?:^|\.)([^.[\]]+)|\[(\d+)\]|\[(?:'([^']+)'|"([^"]+)")\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(key)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(match[1]);
    } else if (match[2] !== undefined) {
      tokens.push(Number(match[2]));
    } else if (match[3] !== undefined) {
      tokens.push(match[3]);
    } else if (match[4] !== undefined) {
      tokens.push(match[4]);
    }
  }

  return tokens.length > 0 ? tokens : [key];
}

/**
 * 将扁平的键值对反向还原为多层嵌套的原始 JSON 结构 (Unflatten)
 * 100% 对称无损还原对象与数组
 *
 * @param source 扁平化的 JSON 数据对象或字符串
 * @returns 逆还原结果契约
 */
export function unflattenJson(source: unknown): TransformResult {
  let parsed: unknown = source;
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (trimmed === '') {
      return { success: true, output: '' };
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      try {
        parsed = JSON5.parse(trimmed);
      } catch (err: unknown) {
        return {
          success: false,
          output: '',
          error: `源数据无法被解析为合法 JSON: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      success: true,
      output: JSON.stringify(parsed, null, 2),
    };
  }

  const flatObj = parsed as Record<string, unknown>;
  const keys = Object.keys(flatObj);
  if (keys.length === 0) {
    return {
      success: true,
      output: '{}',
    };
  }

  try {
    let root: any = null;

    for (const key of keys) {
      const val = flatObj[key];
      const tokens = parseFlattenedKeyTokens(key);
      if (tokens.length === 0) {
        continue;
      }

      if (root === null) {
        root = typeof tokens[0] === 'number' ? [] : {};
      }

      let cur = root;
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const isLast = i === tokens.length - 1;

        if (isLast) {
          cur[token] = val;
        } else {
          const nextToken = tokens[i + 1];
          if (cur[token] === undefined || cur[token] === null || typeof cur[token] !== 'object') {
            cur[token] = typeof nextToken === 'number' ? [] : {};
          }
          cur = cur[token];
        }
      }
    }

    return {
      success: true,
      output: JSON.stringify(root ?? {}, null, 2),
    };
  } catch (err: unknown) {
    return {
      success: false,
      output: '',
      error: `逆还原处理异常: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * 深度全量度量分析
 * 包括最大嵌套深度、键总数、数组总数、最大数组长度、各基本类型分布以及压缩空间节省率
 *
 * @param raw 原始 JSON 字符串
 * @returns 深度度量结果契约
 */
export function calculateDetailedMetrics(raw: string): JsonDetailedMetrics {
  const basic = calculateBasicMetrics(raw);
  const defaultDistribution: JsonTypeDistribution = {
    objectCount: 0,
    arrayCount: 0,
    stringCount: 0,
    numberCount: 0,
    booleanCount: 0,
    nullCount: 0,
  };

  const compressionRatio =
    basic.rawBytes > 0
      ? Math.max(0, Math.round(((basic.rawBytes - basic.minifiedBytes) / basic.rawBytes) * 100))
      : 0;

  const trimmed = raw.trim();
  if (trimmed === '') {
    return {
      ...basic,
      maxDepth: 0,
      totalKeys: 0,
      totalArrays: 0,
      maxArrayLength: 0,
      leafCount: 0,
      typeDistribution: defaultDistribution,
      compressionRatio,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    try {
      parsed = JSON5.parse(trimmed);
    } catch {
      return {
        ...basic,
        maxDepth: 0,
        totalKeys: 0,
        totalArrays: 0,
        maxArrayLength: 0,
        leafCount: 0,
        typeDistribution: defaultDistribution,
        compressionRatio,
      };
    }
  }

  let maxDepth = 0;
  let totalKeys = 0;
  let totalArrays = 0;
  let maxArrayLength = 0;

  const distribution: JsonTypeDistribution = {
    objectCount: 0,
    arrayCount: 0,
    stringCount: 0,
    numberCount: 0,
    booleanCount: 0,
    nullCount: 0,
  };

  function traverse(node: unknown, depth: number) {
    if (depth > maxDepth) {
      maxDepth = depth;
    }

    if (node === null) {
      distribution.nullCount++;
      return;
    }

    if (typeof node === 'string') {
      distribution.stringCount++;
      return;
    }

    if (typeof node === 'number') {
      distribution.numberCount++;
      return;
    }

    if (typeof node === 'boolean') {
      distribution.booleanCount++;
      return;
    }

    if (Array.isArray(node)) {
      totalArrays++;
      distribution.arrayCount++;
      if (node.length > maxArrayLength) {
        maxArrayLength = node.length;
      }
      for (const item of node) {
        traverse(item, depth + 1);
      }
      return;
    }

    if (typeof node === 'object') {
      distribution.objectCount++;
      const entries = Object.entries(node as Record<string, unknown>);
      totalKeys += entries.length;
      for (const [, val] of entries) {
        traverse(val, depth + 1);
      }
    }
  }

  traverse(parsed, 1);

  const leafCount =
    distribution.stringCount +
    distribution.numberCount +
    distribution.booleanCount +
    distribution.nullCount;

  return {
    ...basic,
    maxDepth,
    totalKeys,
    totalArrays,
    maxArrayLength,
    leafCount,
    typeDistribution: distribution,
    compressionRatio,
  };
}



