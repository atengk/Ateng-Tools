/**
 * Spring 配置与环境变量四合一核心转换服务
 *
 * @author Ateng
 * @since 2026-09-29
 */

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  type ConfigConversionResult,
  type ConfigConverterOptions,
  type ConfigFormat,
  DEFAULT_CONFIG_CONVERTER_OPTIONS,
} from './config-converter.models';

interface FlatEntry {
  key: string
  value: any
}

/**
 * 格式化 Properties 文件中的单项值
 *
 * @param value 原始值
 * @returns 字符串表示
 */
function formatPropertyValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * 格式化环境变量单项值，含特殊字符时添加双引号并转义
 *
 * @param value 原始值
 * @returns 环境变量值字符串
 */
function formatEnvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[\s"'#$`\\]/.test(str) || str === '') {
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return str;
}

/**
 * 将点号路径转为 Spring Boot 环境变量规范命名
 * 规则：连字符转下划线、点号转下划线、数组索引 [0] 转 _0、全大写
 *
 * @param dotKey 点号路径（如 `spring.datasource.hikari.maximum-pool-size`）
 * @param relaxed 是否遵循 Spring 宽松绑定
 * @returns 环境变量名（如 `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE`）
 */
export function dotKeyToEnvKey(dotKey: string, relaxed = true): string {
  if (!relaxed) {
    return dotKey.replace(/\./g, '_').toUpperCase();
  }
  return dotKey
    .replace(/\[(\d+)\]/g, '_$1')
    .replace(/[.-]/g, '_')
    .replace(/_+/g, '_')
    .toUpperCase();
}

/**
 * 将环境变量名逆向还原为点号属性路径
 * 规则：全小写、数字段还原为数组索引 [0]、下划线还原为点号
 *
 * @param envKey 环境变量键名（如 `SERVERS_0_URL`）
 * @returns 点号路径（如 `servers[0].url`）
 */
export function envKeyToDotKey(envKey: string): string {
  const lower = envKey.toLowerCase();
  // 1. 将中间的数字下划线模式 _0_ 转换为 [0].
  const withMiddleIndex = lower.replace(/_(\d+)_/g, '[$1].');
  // 2. 将末尾的数字下划线模式 _0 转换为 [0]
  const withEndIndex = withMiddleIndex.replace(/_(\d+)$/g, '[$1]');
  // 3. 将剩余的下划线转换为点号
  return withEndIndex.replace(/_/g, '.');
}

/**
 * 将嵌套对象递归展开为扁平键值对列表（点号路径表示法）
 *
 * @param obj 任意嵌套对象或数组
 * @param prefix 当前前缀路径
 * @returns 扁平条目列表
 */
export function flattenObject(obj: any, prefix = ''): FlatEntry[] {
  if (obj === null || obj === undefined) {
    return prefix ? [{ key: prefix, value: '' }] : [];
  }

  if (typeof obj !== 'object') {
    return [{ key: prefix, value: obj }];
  }

  const entries: FlatEntry[] = [];

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      if (prefix) {
        entries.push({ key: prefix, value: '[]' });
      }
      return entries;
    }
    obj.forEach((item, index) => {
      const childPrefix = prefix ? `${prefix}[${index}]` : `[${index}]`;
      entries.push(...flattenObject(item, childPrefix));
    });
    return entries;
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) {
    if (prefix) {
      entries.push({ key: prefix, value: '{}' });
    }
    return entries;
  }

  keys.forEach((key) => {
    const childPrefix = prefix ? `${prefix}.${key}` : key;
    entries.push(...flattenObject(obj[key], childPrefix));
  });

  return entries;
}

/**
 * 将属性路径拆分为属性名或索引数组
 * 例如：`servers[0].url` -> `['servers', 0, 'url']`
 *
 * @param path 路径字符串
 * @returns 路径段元组
 */
function tokenizePath(path: string): Array<string | number> {
  const tokens: Array<string | number> = [];
  const parts = path.split('.');

  for (const part of parts) {
    const regex = /([^\[\]]+)|\[(\d+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(part)) !== null) {
      if (match[2] !== undefined) {
        tokens.push(Number.parseInt(match[2], 10));
      } else if (match[1] !== undefined) {
        tokens.push(match[1]);
      }
    }
  }

  return tokens;
}

/**
 * 将扁平键值对列表反向还原为深度嵌套的对象或数组树
 *
 * @param entries 扁平键值列表
 * @returns 嵌套树状结构
 */
export function unflattenEntries(entries: FlatEntry[]): Record<string, any> {
  const root: Record<string, any> = {};

  for (const { key, value } of entries) {
    if (!key.trim()) {
      continue;
    }
    const tokens = tokenizePath(key);
    if (tokens.length === 0) {
      continue;
    }

    let current: any = root;

    for (let i = 0; i < tokens.length - 1; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];
      const isNextArray = typeof nextToken === 'number';

      if (typeof token === 'number') {
        if (!Array.isArray(current)) {
          current = [];
        }
        if (current[token] === undefined) {
          current[token] = isNextArray ? [] : {};
        }
        current = current[token];
      } else {
        if (current[token] === undefined || typeof current[token] !== 'object') {
          current[token] = isNextArray ? [] : {};
        }
        current = current[token];
      }
    }

    const lastToken = tokens[tokens.length - 1];
    if (typeof lastToken === 'number') {
      if (!Array.isArray(current)) {
        current = [];
      }
      current[lastToken] = value;
    } else {
      current[lastToken] = value;
    }
  }

  return root;
}

/**
 * 解析 Java .properties 文本为扁平键值列表
 *
 * @param content 原始 Properties 文本
 * @returns 扁平条目数组
 */
export function parseProperties(content: string): FlatEntry[] {
  const entries: FlatEntry[] = [];
  const lines = content.split(/\r?\n/);
  let currentKey = '';
  let currentValue = '';
  let isContinuing = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // 1. 跳过注释与空行
    if (!isContinuing && (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!'))) {
      continue;
    }

    // 2. 处理多行折行延续
    if (isContinuing) {
      if (rawLine.endsWith('\\')) {
        currentValue += rawLine.slice(0, -1).trim();
      } else {
        currentValue += rawLine.trim();
        entries.push({ key: currentKey, value: currentValue });
        isContinuing = false;
        currentKey = '';
        currentValue = '';
      }
      continue;
    }

    // 3. 匹配首个非转义分隔符 (= 或 :)
    const match = rawLine.match(/^([^=:]+)[=:](.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2];

      if (val.endsWith('\\')) {
        currentKey = key;
        currentValue = val.slice(0, -1).trim();
        isContinuing = true;
      } else {
        entries.push({ key, value: parseTypedValue(val.trim()) });
      }
    }
  }

  return entries;
}

/**
 * 解析 .env 环境变量文本为扁平键值列表
 *
 * @param content 原始 ENV 文本
 * @param relaxed 是否开启 Spring 宽松绑定逆向还原
 * @returns 扁平条目数组
 */
export function parseEnv(content: string, relaxed = true): FlatEntry[] {
  const entries: FlatEntry[] = [];
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    if (line.startsWith('export ')) {
      line = line.slice(7).trim();
    }

    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }

    const rawKey = line.slice(0, eqIndex).trim();
    let rawVal = line.slice(eqIndex + 1).trim();

    // 去除成对单双引号
    if (
      (rawVal.startsWith('"') && rawVal.endsWith('"')) ||
      (rawVal.startsWith('\'') && rawVal.endsWith('\''))
    ) {
      rawVal = rawVal.slice(1, -1);
    }

    const dotKey = relaxed ? envKeyToDotKey(rawKey) : rawKey.toLowerCase();
    entries.push({
      key: dotKey,
      value: parseTypedValue(rawVal),
    });
  }

  return entries;
}

/**
 * 尝试将字符串解析为原生类型（数字、布尔值等）
 *
 * @param str 字符串值
 * @returns 原生类型或原始字符串
 */
function parseTypedValue(str: string): any {
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (str === 'null') return null;
  if (/^-?\d+$/.test(str)) {
    const num = Number.parseInt(str, 10);
    if (!Number.isNaN(num) && Number.isSafeInteger(num)) {
      return num;
    }
  }
  if (/^-?\d+\.\d+$/.test(str)) {
    const num = Number.parseFloat(str);
    if (!Number.isNaN(num)) {
      return num;
    }
  }
  return str;
}

/**
 * 智能嗅探输入文本的配置格式
 *
 * @param input 待检测文本
 * @returns 探测出的格式类型
 */
export function detectConfigFormat(input: string): ConfigFormat {
  const trimmed = input.trim();
  if (!trimmed) {
    return 'yaml';
  }

  // 1. JSON 格式检测
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // 容错继续嗅探
    }
  }

  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('!'));

  // 2. 检查是否为 ENV 格式（大写下划线键名 + 包含等号）
  const envMatches = lines.filter(l => /^(export\s+)?[A-Z0-9_]+=/.test(l));
  if (envMatches.length > 0 && envMatches.length >= lines.length * 0.7) {
    return 'env';
  }

  // 3. 检查是否为 Properties 格式（包含 = 或 : 且键名带点号，无 YAML 嵌套缩进）
  const propMatches = lines.filter(l => /^[a-zA-Z0-9_.-]+\s*[=:]/.test(l));
  const hasIndent = trimmed.split(/\r?\n/).some(l => /^\s{2,}\S/.test(l));
  if (propMatches.length > 0 && propMatches.length >= lines.length * 0.7 && !hasIndent) {
    return 'properties';
  }

  // 4. 默认推断为 YAML
  return 'yaml';
}

/**
 * Spring 配置与环境变量四合一格式转换主接口
 *
 * @param input 输入源文本
 * @param from 源格式
 * @param to 目标格式
 * @param customOptions 用户自定义配置选项
 * @returns 转换结果
 */
export function convertConfig(
  input: string,
  from: ConfigFormat,
  to: ConfigFormat,
  customOptions: Partial<ConfigConverterOptions> = {},
): ConfigConversionResult {
  const options: ConfigConverterOptions = {
    ...DEFAULT_CONFIG_CONVERTER_OPTIONS,
    ...customOptions,
  };

  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return {
      success: true,
      output: '',
      entryCount: 0,
    };
  }

  try {
    // 1. 解析源格式为统一扁平条目列表与树结构
    let flatEntries: FlatEntry[] = [];
    let treeObj: Record<string, any> = {};

    switch (from) {
      case 'yaml': {
        const parsed = parseYaml(trimmedInput);
        if (parsed && typeof parsed === 'object') {
          treeObj = parsed;
          flatEntries = flattenObject(parsed);
        }
        break;
      }
      case 'json': {
        const parsed = JSON.parse(trimmedInput);
        if (parsed && typeof parsed === 'object') {
          treeObj = parsed;
          flatEntries = flattenObject(parsed);
        }
        break;
      }
      case 'properties': {
        flatEntries = parseProperties(trimmedInput);
        treeObj = unflattenEntries(flatEntries);
        break;
      }
      case 'env': {
        flatEntries = parseEnv(trimmedInput, options.relaxedBinding);
        treeObj = unflattenEntries(flatEntries);
        break;
      }
    }

    if (options.sortKeys) {
      flatEntries.sort((a, b) => a.key.localeCompare(b.key));
    }

    // 2. 根据目标格式导出结果文本
    let output = '';

    switch (to) {
      case 'yaml': {
        output = stringifyYaml(treeObj, {
          indent: options.indent,
          lineWidth: 0,
        });
        break;
      }
      case 'json': {
        output = JSON.stringify(treeObj, null, options.indent);
        break;
      }
      case 'properties': {
        output = flatEntries
          .map(e => `${e.key}=${formatPropertyValue(e.value)}`)
          .join('\n');
        break;
      }
      case 'env': {
        output = flatEntries
          .map((e) => {
            const envKey = dotKeyToEnvKey(e.key, options.relaxedBinding);
            return `${envKey}=${formatEnvValue(e.value)}`;
          })
          .join('\n');
        break;
      }
    }

    return {
      success: true,
      output: output.trim(),
      entryCount: flatEntries.length,
    };
  } catch (err: any) {
    return {
      success: false,
      output: '',
      error: err?.message || '未知解析异常',
      entryCount: 0,
    };
  }
}
