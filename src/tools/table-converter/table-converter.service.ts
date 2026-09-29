/**
 * 表格与多格式数据互转器核心服务
 *
 * @author Ateng
 * @since 2026-09-29
 */

import {
  type ColumnType,
  DEFAULT_TABLE_CONVERTER_OPTIONS,
  type TableConversionResult,
  type TableConverterOptions,
  type TableData,
  type TableInputFormat,
  type TableOutputFormat,
} from './table-converter.models';

/**
 * 智能嗅探输入文本的表格格式
 *
 * @param input 输入源文本
 * @returns 探测出的表格格式
 */
export function detectTableFormat(input: string): TableInputFormat {
  const trimmed = input.trim();
  if (!trimmed) {
    return 'tsv';
  }

  // 1. JSON 数组探测
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        return 'json';
      }
    } catch {
      // 容错继续
    }
  }

  const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);

  // 2. Markdown 表格探测（包含管道符 | 以及分割线 |---|）
  const markdownTablePipes = lines.filter(l => l.includes('|'));
  const hasDivider = lines.some(l => /\|\s*:?-+:?\s*\|/.test(l));
  if (markdownTablePipes.length >= 2 && hasDivider) {
    return 'markdown';
  }

  // 3. TSV 探测（Excel / 网页表格复制粘贴带有制表符 \t）
  const tabLines = lines.filter(l => l.includes('\t'));
  if (tabLines.length > 0 && tabLines.length >= lines.length * 0.7) {
    return 'tsv';
  }

  // 4. CSV 探测（逗号或分号分隔）
  const commaLines = lines.filter(l => l.includes(',') || l.includes(';'));
  if (commaLines.length > 0 && commaLines.length >= lines.length * 0.7) {
    return 'csv';
  }

  return 'tsv';
}

/**
 * 通用 CSV / TSV 分隔文本词法解析器
 * 完整支持双引号包裹、双引号转义 ("") 与跨行单元格
 *
 * @param text 输入文本
 * @param delimiter 分隔符（默认为制表符 \t 或逗号 ,）
 * @returns 二维字符串数组
 */
export function parseDelimitedText(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // 跳过下一个连续引号
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        // 忽略 Windows 回车符，统一由 \n 换行
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  // 追加最后一个单元格与最后一行
  currentRow.push(currentCell.trim());
  if (currentRow.some(c => c.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * 解析 Markdown 表格文本为二维行数组
 *
 * @param text Markdown 文本
 * @returns 二维字符串数组
 */
export function parseMarkdownTable(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  const rows: string[][] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || !line.includes('|')) {
      continue;
    }

    // 过滤 Markdown 分割线行（如 |---|:---:|）
    if (/^\|?(\s*:?-+:?\s*\|)+\s*$/.test(line)) {
      continue;
    }

    let cells = line.split('|').map(c => c.trim());
    // 如果首尾由于两侧管道符产生空项则移除
    if (line.startsWith('|')) {
      cells = cells.slice(1);
    }
    if (line.endsWith('|')) {
      cells = cells.slice(0, -1);
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return rows;
}

/**
 * 解析 JSON 对象数组为表格数据
 *
 * @param text JSON 文本
 * @returns 规范表格数据
 */
export function parseJsonTable(text: string): { headers: string[]; rawRows: any[][] } {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { headers: [], rawRows: [] };
  }

  // 1. 提取所有属性名的并集作为表头
  const headerSet = new Set<string>();
  parsed.forEach((item) => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(k => headerSet.add(k));
    }
  });
  const headers = Array.from(headerSet);

  // 2. 填充每一行数据
  const rawRows = parsed.map((item) => {
    return headers.map(h => (item && item[h] !== undefined ? item[h] : null));
  });

  return { headers, rawRows };
}

/**
 * 智能推断每一列的数据类型
 *
 * @param rows 数据行二维数组
 * @param columnCount 列数
 * @returns 类型数组
 */
export function inferColumnTypes(rows: any[][], columnCount: number): ColumnType[] {
  const types: ColumnType[] = [];

  for (let c = 0; c < columnCount; c++) {
    let hasNumber = false;
    let hasBoolean = false;
    let isAllNumber = true;
    let isAllBoolean = true;

    for (let r = 0; r < rows.length; r++) {
      const val = rows[r][c];
      if (val === null || val === undefined || val === '') {
        continue;
      }

      const strVal = String(val).trim();
      const lower = strVal.toLowerCase();

      // 布尔检查
      if (lower === 'true' || lower === 'false') {
        hasBoolean = true;
        isAllNumber = false;
        continue;
      } else {
        isAllBoolean = false;
      }

      // 数值检查（排除空字符串与 NaN）
      if (!Number.isNaN(Number(strVal)) && /^-?\d+(\.\d+)?$/.test(strVal)) {
        hasNumber = true;
      } else {
        isAllNumber = false;
      }
    }

    if (hasNumber && isAllNumber) {
      types.push('number');
    } else if (hasBoolean && isAllBoolean) {
      types.push('boolean');
    } else {
      types.push('string');
    }
  }

  return types;
}

/**
 * 将解析出的二维数据构建为统一表格模型
 *
 * @param rawRows 原始二维行
 * @param hasHeader 首行是否为表头
 * @returns 统一表格数据对象
 */
export function buildTableData(rawRows: any[][], hasHeader = true): TableData {
  if (rawRows.length === 0) {
    return {
      headers: [],
      rows: [],
      inferredTypes: [],
      rowCount: 0,
      columnCount: 0,
    };
  }

  // 1. 规整列数统一对齐
  const maxCols = Math.max(...rawRows.map(r => r.length));
  const normalizedRows = rawRows.map((r) => {
    if (r.length < maxCols) {
      return [...r, ...Array.from({ length: maxCols - r.length }, () => '')];
    }
    return r;
  });

  // 2. 提取表头与数据行
  let headers: string[] = [];
  let dataRows: any[][] = [];

  if (hasHeader && normalizedRows.length > 0) {
    headers = normalizedRows[0].map((h, i) => String(h || `col_${i + 1}`));
    dataRows = normalizedRows.slice(1);
  } else {
    headers = Array.from({ length: maxCols }, (_, i) => `col_${i + 1}`);
    dataRows = normalizedRows;
  }

  const inferredTypes = inferColumnTypes(dataRows, maxCols);

  return {
    headers,
    rows: dataRows,
    inferredTypes,
    rowCount: dataRows.length,
    columnCount: headers.length,
  };
}

/**
 * 格式化 SQL 单个单元格的值，带单引号转义与类型安全
 *
 * @param val 单元格值
 * @param type 列类型
 * @param nullPlaceholder 空值输出
 * @returns SQL 表达式片断
 */
function formatSqlCellValue(val: any, type: ColumnType, nullPlaceholder = 'NULL'): string {
  if (val === null || val === undefined || String(val).trim() === '') {
    return nullPlaceholder;
  }

  const str = String(val).trim();

  if (type === 'number') {
    const num = Number(str);
    if (!Number.isNaN(num)) {
      return str;
    }
  }

  if (type === 'boolean') {
    return str.toLowerCase() === 'true' ? '1' : '0';
  }

  // 字符串类型：单引号替换为两个单引号防注入并包裹
  return `'${str.replace(/'/g, "''")}'`;
}

/**
 * 包装 SQL 字段与表名标识符
 *
 * @param name 字段或表名
 * @param quote 引用风格
 * @returns 包装后名称
 */
function quoteSqlIdentifier(name: string, quote: 'backtick' | 'double' | 'none'): string {
  if (quote === 'backtick') return `\`${name.replace(/`/g, '')}\``;
  if (quote === 'double') return `"${name.replace(/"/g, '')}"`;
  return name;
}

/**
 * 导出表格数据为批量 SQL INSERT 语句
 *
 * @param table 表格数据模型
 * @param options 转换参数
 * @returns SQL 批量脚本文本
 */
export function exportToSql(table: TableData, options: TableConverterOptions): string {
  if (table.rows.length === 0 || table.headers.length === 0) {
    return '';
  }

  const quotedTable = quoteSqlIdentifier(options.tableName || 'my_table', options.quoteIdentifier);
  const quotedHeaders = table.headers.map(h => quoteSqlIdentifier(h, options.quoteIdentifier)).join(', ');

  const batchSize = Math.max(1, options.batchSize || 100);
  const sqlStatements: string[] = [];

  // 按 batchSize 分片生成批量插入
  for (let i = 0; i < table.rows.length; i += batchSize) {
    const chunk = table.rows.slice(i, i + batchSize);
    const valueRows = chunk.map((row) => {
      const cellValues = row.map((cell, colIndex) => {
        const type = table.inferredTypes[colIndex] || 'string';
        return formatSqlCellValue(cell, type, options.nullPlaceholder);
      });
      return `  (${cellValues.join(', ')})`;
    });

    const statement = `INSERT INTO ${quotedTable} (${quotedHeaders}) VALUES\n${valueRows.join(',\n')};`;
    sqlStatements.push(statement);
  }

  return sqlStatements.join('\n\n');
}

/**
 * 导出表格数据为美化对齐的 Markdown 表格
 *
 * @param table 表格数据模型
 * @returns Markdown 表格文本
 */
export function exportToMarkdown(table: TableData): string {
  if (table.headers.length === 0) {
    return '';
  }

  // 计算每一列最大字符显示宽度
  const colWidths: number[] = table.headers.map(h => Math.max(3, h.length));

  table.rows.forEach((row) => {
    row.forEach((cell, i) => {
      const len = String(cell ?? '').length;
      if (len > colWidths[i]) {
        colWidths[i] = len;
      }
    });
  });

  // 1. 生成表头行
  const headerLine = `| ${table.headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ')} |`;
  // 2. 生成分割线行
  const dividerLine = `| ${colWidths.map(w => '-'.repeat(w)).join(' | ')} |`;
  // 3. 生成数据行
  const rowLines = table.rows.map((row) => {
    return `| ${row.map((cell, i) => String(cell ?? '').padEnd(colWidths[i])).join(' | ')} |`;
  });

  return [headerLine, dividerLine, ...rowLines].join('\n');
}

/**
 * 导出表格数据为 JSON 对象数组
 *
 * @param table 表格数据模型
 * @returns 美化 JSON 文本
 */
export function exportToJson(table: TableData): string {
  const jsonArray = table.rows.map((row) => {
    const obj: Record<string, any> = {};
    table.headers.forEach((header, i) => {
      const val = row[i];
      const type = table.inferredTypes[i];
      if (val === null || val === undefined || val === '') {
        obj[header] = null;
      } else if (type === 'number') {
        const num = Number(val);
        obj[header] = Number.isNaN(num) ? val : num;
      } else if (type === 'boolean') {
        obj[header] = String(val).toLowerCase() === 'true';
      } else {
        obj[header] = val;
      }
    });
    return obj;
  });

  return JSON.stringify(jsonArray, null, 2);
}

/**
 * 导出表格数据为标准 CSV
 *
 * @param table 表格数据模型
 * @returns CSV 文本
 */
export function exportToCsv(table: TableData): string {
  const formatCell = (val: any) => {
    const str = String(val ?? '');
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [];
  lines.push(table.headers.map(formatCell).join(','));
  table.rows.forEach((row) => {
    lines.push(row.map(formatCell).join(','));
  });

  return lines.join('\n');
}

/**
 * 表格与多格式数据互转主接口
 *
 * @param input 输入源文本
 * @param from 源输入格式
 * @param to 目标输出格式
 * @param customOptions 自定义选项
 * @returns 转换结果
 */
export function convertTabularData(
  input: string,
  from: TableInputFormat,
  to: TableOutputFormat,
  customOptions: Partial<TableConverterOptions> = {},
): TableConversionResult {
  const options: TableConverterOptions = {
    ...DEFAULT_TABLE_CONVERTER_OPTIONS,
    ...customOptions,
  };

  const trimmed = input.trim();
  if (!trimmed) {
    return {
      success: true,
      output: '',
      detectedFormat: 'tsv',
      rowCount: 0,
      columnCount: 0,
    };
  }

  try {
    const resolvedFrom = from === 'auto' ? detectTableFormat(trimmed) : from;
    let table: TableData;

    // 1. 解析输入源
    switch (resolvedFrom) {
      case 'json': {
        const { headers, rawRows } = parseJsonTable(trimmed);
        table = {
          headers,
          rows: rawRows,
          inferredTypes: inferColumnTypes(rawRows, headers.length),
          rowCount: rawRows.length,
          columnCount: headers.length,
        };
        break;
      }
      case 'markdown': {
        const rawRows = parseMarkdownTable(trimmed);
        table = buildTableData(rawRows, options.hasHeader);
        break;
      }
      case 'csv': {
        const rawRows = parseDelimitedText(trimmed, trimmed.includes(';') && !trimmed.includes(',') ? ';' : ',');
        table = buildTableData(rawRows, options.hasHeader);
        break;
      }
      case 'tsv':
      default: {
        const rawRows = parseDelimitedText(trimmed, '\t');
        table = buildTableData(rawRows, options.hasHeader);
        break;
      }
    }

    // 2. 根据目标格式导出
    let output = '';
    switch (to) {
      case 'sql':
        output = exportToSql(table, options);
        break;
      case 'markdown':
        output = exportToMarkdown(table);
        break;
      case 'json':
        output = exportToJson(table);
        break;
      case 'csv':
        output = exportToCsv(table);
        break;
    }

    return {
      success: true,
      output,
      detectedFormat: resolvedFrom,
      rowCount: table.rowCount,
      columnCount: table.columnCount,
    };
  } catch (err: any) {
    return {
      success: false,
      output: '',
      error: err?.message || '表格数据转换异常',
      detectedFormat: 'tsv',
      rowCount: 0,
      columnCount: 0,
    };
  }
}
