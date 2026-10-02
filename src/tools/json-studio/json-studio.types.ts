/**
 * JSON Studio 核心模型与类型契约
 *
 * @author Ateng
 * @since 2026-10-02
 */

/**
 * 缩进空格/格式类型
 */
export type IndentType = 2 | 4 | 'tab';

/**
 * 格式化配置选项
 */
export interface FormatOptions {
  /** 缩进类型 */
  indent?: IndentType;
}

/**
 * 格式化执行结果
 */
export interface FormatResult {
  /** 是否格式化成功 */
  success: boolean;
  /** 格式化后内容 */
  output: string;
  /** 错误信息 */
  error?: string;
}

/**
 * JSON 语法校验结果
 */
export interface JsonValidationResult {
  /** 语法是否有效 */
  isValid: boolean;
  /** 错误信息 */
  error?: string;
  /** 发生错误的行号 (1-based) */
  line?: number;
  /** 发生错误的列号 (1-based) */
  column?: number;
}

/**
 * 基础尺寸与行数度量
 */
export interface BasicMetrics {
  /** 原始字节数 */
  rawBytes: number;
  /** 格式化后字节数 */
  formattedBytes: number;
  /** 压缩后字节数 */
  minifiedBytes: number;
  /** 原始文本总行数 */
  lineCount: number;
  /** 原始文本字符数 */
  charCount: number;
}

/**
 * JSON 节点基本类型枚举值
 */
export type JsonValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

/**
 * 交互式树形视图节点模型
 */
export interface JsonTreeNode {
  /** 唯一节点 ID，例如 "root" 或 "root.users[0]" */
  id: string;
  /** 节点显示名称 (键名或数组索引)，例如 "users" 或 "[0]" */
  key: string;
  /** 绝对 JSONPath 路径，例如 "$.data.users[0]" */
  jsonPath: string;
  /** 节点数据类型 */
  type: JsonValueType;
  /** 节点原始值 */
  value: unknown;
  /** 格式化显示文本 (如 "{ 3 个键 }" 或 '"hello"') */
  displayValue: string;
  /** 子节点列表 (仅 object 或 array 存在) */
  children?: JsonTreeNode[];
  /** 节点层级深度 (0-based) */
  depth: number;
  /** 子项计数 (键数量或数组项数量) */
  childCount?: number;
}

/**
 * 智能修复结果契约
 */
export interface SmartRepairResult {
  /** 修复后的标准 JSON 文本 */
  repairedText: string;
  /** 兼容字段：修复后的标准 JSON 文本 */
  repairedJson?: string;
  /** 是否产生修复变更 */
  hasChanges: boolean;
  /** 是否修复成功且为合法 JSON */
  success: boolean;
  /** 命中的修复规则描述列表 */
  repairedRules: string[];
  /** 兼容字段：命中的修复规则描述列表 */
  appliedRules?: string[];
  /** 错误描述 */
  error?: string;
}

/**
 * 字符串转义/反转义结果契约
 */
export interface StringEscapeResult {
  /** 转换后内容 */
  output: string;
  /** 是否转换成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * JSONPath 单项匹配契约
 */
export interface JsonPathMatchItem {
  /** 节点绝对 JSONPath 路径，例如 "$.store.book[0].author" */
  path: string;
  /** 节点值 */
  value: unknown;
}

/**
 * JSONPath 查询结果契约
 */
export interface JsonPathQueryResult {
  /** 查询是否成功解析与执行 */
  success: boolean;
  /** 执行的原始查询表达式 */
  expression: string;
  /** 匹配项列表 */
  items: JsonPathMatchItem[];
  /** 提取的值集合 */
  results: unknown[];
  /** 匹配到的所有绝对路径集合 */
  matchedPaths: string[];
  /** 错误描述 */
  error?: string;
}

/**
 * 键名命名风格类型
 */
export type KeyCaseType = 'camelCase' | 'snake_case' | 'kebab-case' | 'pascalCase';

/**
 * 结构与命名转换执行结果
 */
export interface TransformResult {
  /** 是否转换成功 */
  success: boolean;
  /** 转换后内容（带格式化排版） */
  output: string;
  /** 错误描述 */
  error?: string;
}

/**
 * 结构类型分布统计
 */
export interface JsonTypeDistribution {
  objectCount: number;
  arrayCount: number;
  stringCount: number;
  numberCount: number;
  booleanCount: number;
  nullCount: number;
}

/**
 * 深度度量分析大纲契约
 */
export interface JsonDetailedMetrics extends BasicMetrics {
  /** 最大嵌套层级深度 (根节点为 1) */
  maxDepth: number;
  /** 对象键总数 (所有层级 Key 总计) */
  totalKeys: number;
  /** 数组总数 */
  totalArrays: number;
  /** 数组中的最大长度 */
  maxArrayLength: number;
  /** 叶子值节点总数 */
  leafCount: number;
  /** 各类型分布计数 */
  typeDistribution: JsonTypeDistribution;
  /** 压缩节省空间比例 (%) */
  compressionRatio: number;
}


