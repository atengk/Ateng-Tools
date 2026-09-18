import { camelCase, pascalCase } from 'change-case';
import type {
  ColumnDefinition,
  SqlDdlOptions,
  TableDefinition,
} from './sql-ddl-to-entity.models';

/**
 * 将 MySQL CREATE TABLE 语句解析为结构化表与字段模型
 * @param ddl SQL 建表语句
 * @param options 解析配置选项
 * @returns TableDefinition
 */
export function parseMySqlDdl(
  ddl: string,
  options: SqlDdlOptions,
): TableDefinition {
  const cleanDdl = ddl.trim();

  // 1. 提取表名
  const tableMatch = cleanDdl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?/i);
  if (!tableMatch) {
    throw new Error('未识别到有效的 CREATE TABLE 语句');
  }
  const tableName = tableMatch[2] || tableMatch[1];

  // 2. 提取表注释
  let tableComment = '';
  const commentMatch = cleanDdl.match(/(?:ENGINE\s*=\s*\w+.*?|\))\s*COMMENT\s*=\s*['"]([^'"]*)['"]/i);
  if (commentMatch) {
    tableComment = commentMatch[1];
  }

  // 3. 计算生成的实体类名称 (根据配置是否剥离 t_ 前缀)
  let cleanName = tableName;
  if (options.removeTablePrefix && /^t_/i.test(cleanName)) {
    cleanName = cleanName.replace(/^t_/i, '');
  }
  const entityName = pascalCase(cleanName) + (options.entityNameSuffix || '');

  // 4. 提取建表括号内的核心字段定义体
  const firstParenIndex = cleanDdl.indexOf('(');
  const lastParenIndex = cleanDdl.lastIndexOf(')');
  if (firstParenIndex === -1 || lastParenIndex === -1) {
    throw new Error('DDL 语法错误：缺少括号包裹的列定义');
  }
  const body = cleanDdl.slice(firstParenIndex + 1, lastParenIndex);

  // 5. 提前提取主键列名
  let primaryKeyColumn: string | undefined;
  const pkMatch = body.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
  if (pkMatch) {
    const pkRaw = pkMatch[1].split(',')[0].trim();
    primaryKeyColumn = pkRaw.replace(/[`'"]/g, '');
  }

  // 6. 逐行解析列定义
  const rawLines = body.split(/\r?\n/);
  const columns: ColumnDefinition[] = [];

  for (const rawLine of rawLines) {
    const line = rawLine.trim().replace(/,$/, '');
    if (!line || line.startsWith('--') || line.startsWith('/*')) {
      continue;
    }

    // 忽略索引与外键等约束行
    if (
      /^PRIMARY\s+KEY/i.test(line) ||
      /^KEY\s+/i.test(line) ||
      /^INDEX\s+/i.test(line) ||
      /^UNIQUE\s+KEY/i.test(line) ||
      /^CONSTRAINT\s+/i.test(line) ||
      /^FULLTEXT\s+/i.test(line) ||
      /^SPATIAL\s+/i.test(line)
    ) {
      continue;
    }

    // 正则提取列名、SQL 类型与后续修饰词
    const colMatch = line.match(/^`?([a-zA-Z0-9_]+)`?\s+([a-zA-Z]+)(?:\([^)]+\))?(.*)$/);
    if (!colMatch) {
      continue;
    }

    const columnName = colMatch[1];
    const sqlType = colMatch[2].toUpperCase();
    const rest = colMatch[3] || '';

    // 提取字段注释 COMMENT 'xxx'
    let colComment = '';
    const colCommentMatch = rest.match(/COMMENT\s+['"]([^'"]*)['"]/i);
    if (colCommentMatch) {
      colComment = colCommentMatch[1];
    }

    // 属性名
    const fieldName = camelCase(columnName);

    // 主键判定
    const isPrimaryKey =
      columnName === primaryKeyColumn ||
      /PRIMARY\s+KEY/i.test(rest);

    if (isPrimaryKey && !primaryKeyColumn) {
      primaryKeyColumn = columnName;
    }

    // 逻辑删除判定
    const isLogicDelete =
      columnName.toLowerCase() === 'deleted' ||
      columnName.toLowerCase() === 'is_deleted';

    const isAutoIncrement = /AUTO_INCREMENT/i.test(rest);
    const isNullable = !/NOT\s+NULL/i.test(rest);

    // 类型映射 (遵循 Java 21 / MyBatis-Plus / Vue 3 规范)
    let javaType = 'String';
    let tsType = 'string';

    switch (sqlType) {
      case 'BIGINT':
        javaType = 'Long';
        tsType = 'number';
        break;
      case 'INT':
      case 'INTEGER':
      case 'MEDIUMINT':
      case 'SMALLINT':
      case 'TINYINT':
        javaType = 'Integer';
        tsType = 'number';
        break;
      case 'DECIMAL':
      case 'NUMERIC':
        javaType = 'BigDecimal';
        tsType = 'number';
        break;
      case 'DOUBLE':
      case 'FLOAT':
        javaType = sqlType === 'FLOAT' ? 'Float' : 'Double';
        tsType = 'number';
        break;
      case 'DATETIME':
      case 'TIMESTAMP':
        javaType = 'LocalDateTime';
        tsType = 'string';
        break;
      case 'DATE':
        javaType = 'LocalDate';
        tsType = 'string';
        break;
      case 'TIME':
        javaType = 'LocalTime';
        tsType = 'string';
        break;
      case 'BOOLEAN':
      case 'BIT':
        javaType = 'Boolean';
        tsType = 'boolean';
        break;
      default:
        javaType = 'String';
        tsType = 'string';
        break;
    }

    columns.push({
      columnName,
      fieldName,
      sqlType,
      javaType,
      tsType,
      comment: colComment,
      isPrimaryKey,
      isAutoIncrement,
      isLogicDelete,
      isNullable,
    });
  }

  return {
    tableName,
    entityName,
    tableComment,
    columns,
    primaryKeyColumn,
  };
}

/**
 * 根据表结构生成 Java 实体类代码 (Lombok + MyBatis-Plus)
 */
export function generateJavaFromTable(
  table: TableDefinition,
  options: SqlDdlOptions,
): string {
  const lines: string[] = [];

  // 1. 包名
  if (options.packageName) {
    lines.push(`package ${options.packageName};`, '');
  }

  // 2. 收集所需 Import
  const imports = new Set<string>();
  imports.add('import java.io.Serializable;');

  for (const col of table.columns) {
    if (col.javaType === 'LocalDateTime') {
      imports.add('import java.time.LocalDateTime;');
    }
    if (col.javaType === 'LocalDate') {
      imports.add('import java.time.LocalDate;');
    }
    if (col.javaType === 'BigDecimal') {
      imports.add('import java.math.BigDecimal;');
    }
  }

  if (options.useLombok) {
    imports.add('import lombok.Data;');
    imports.add('import lombok.Builder;');
    imports.add('import lombok.NoArgsConstructor;');
    imports.add('import lombok.AllArgsConstructor;');
  }

  if (options.useMyBatisPlus) {
    imports.add('import com.baomidou.mybatisplus.annotation.TableName;');
    if (table.columns.some(c => c.isPrimaryKey)) {
      imports.add('import com.baomidou.mybatisplus.annotation.TableId;');
      imports.add('import com.baomidou.mybatisplus.annotation.IdType;');
    }
    if (table.columns.some(c => c.isLogicDelete)) {
      imports.add('import com.baomidou.mybatisplus.annotation.TableLogic;');
    }
  }

  lines.push(...Array.from(imports).sort(), '');

  // 3. 类 Javadoc 注释
  lines.push('/**');
  if (table.tableComment) {
    lines.push(` * ${table.tableComment}`);
  } else {
    lines.push(` * ${table.tableName} 实体`);
  }
  lines.push(' * @author Ateng');
  lines.push(' */');

  // 4. 类注解
  if (options.useLombok) {
    lines.push('@Data');
    lines.push('@Builder');
    lines.push('@NoArgsConstructor');
    lines.push('@AllArgsConstructor');
  }

  if (options.useMyBatisPlus) {
    lines.push(`@TableName("${table.tableName}")`);
  }

  // 5. 类主体
  lines.push(`public class ${table.entityName} implements Serializable {`);
  lines.push('    private static final long serialVersionUID = 1L;', '');

  // 6. 字段列表
  for (const col of table.columns) {
    lines.push('    /**');
    if (col.comment) {
      lines.push(`     * ${col.comment}`);
    } else {
      lines.push(`     * ${col.columnName}`);
    }
    lines.push('     */');

    if (options.useMyBatisPlus) {
      if (col.isPrimaryKey) {
        lines.push(`    @TableId(type = IdType.${options.idType})`);
      }
      if (col.isLogicDelete) {
        lines.push('    @TableLogic');
      }
    }

    lines.push(`    private ${col.javaType} ${col.fieldName};`, '');
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * 根据表结构生成 TypeScript 接口定义
 */
export function generateTsFromTable(table: TableDefinition): string {
  const lines: string[] = [];

  lines.push('/**');
  if (table.tableComment) {
    lines.push(` * ${table.tableComment}`);
  } else {
    lines.push(` * ${table.tableName}`);
  }
  lines.push(' */');
  lines.push(`export interface ${table.entityName} {`);

  for (const col of table.columns) {
    if (col.comment) {
      lines.push(`  /** ${col.comment} */`);
    }
    lines.push(`  ${col.fieldName}?: ${col.tsType};`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * 统一根据 DDL 生成目标代码
 */
export function generateCodeFromDdl(
  ddl: string,
  options: SqlDdlOptions,
): string {
  if (!ddl.trim()) {
    return '';
  }

  try {
    const table = parseMySqlDdl(ddl, options);
    if (options.targetLanguage === 'typescript') {
      return generateTsFromTable(table);
    }
    return generateJavaFromTable(table, options);
  } catch (err: any) {
    return `// DDL 解析与代码生成失败: ${err?.message || '语法错误'}`;
  }
}
