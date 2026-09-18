import { format as formatSql } from 'sql-formatter';
import {
  DEFAULT_RESTORE_OPTIONS,
  type MyBatisRestoreOptions,
  type RestoreResult,
  type RestoredStatement,
} from './mybatis-sql-converter.models';

/**
 * Escapes internal single quotes and wraps the value in SQL single quotes.
 * If the value was already wrapped in outer quotes in the log, strips them first.
 *
 * @param val Raw string value
 * @returns Safely wrapped SQL string literal
 */
export function wrapSqlString(val: string): string {
  // 1. Strip pre-existing outer quotes if already present in log
  const unquoted = val.replace(/^'([\s\S]*)'$/, '$1');

  // 2. Escape internal single quotes
  const escaped = unquoted.replace(/'/g, "\\'");

  // 3. Wrap in SQL single quotes
  return `'${escaped}'`;
}

/**
 * Tokenize parameters line by splitting on commas outside balanced delimiters.
 * Handles nested parentheses, brackets, braces, double quotes, and outer single quotes.
 *
 * @param paramsLine The raw parameter string after "Parameters:"
 * @returns Array of individual parameter tokens
 */
export function tokenizeParameters(paramsLine: string): string[] {
  // 1. Validate empty input
  const trimmed = paramsLine.trim();
  if (!trimmed) {
    return [];
  }

  // 2. Initialize tracking state
  const tokens: string[] = [];
  let currentToken = '';
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let inDoubleQuote = false;
  let inSingleQuote = false;

  // 3. Scan characters sequentially
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const prevChar = i > 0 ? trimmed[i - 1] : '';
    const nextChar = i < trimmed.length - 1 ? trimmed[i + 1] : '';

    // Handle double quote toggling
    if (char === '"' && prevChar !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    }

    // Handle outer single quotes (excluding English mid-word apostrophes like it's or don't)
    const isMidWordApostrophe = /[a-zA-Z]/.test(prevChar) && /[a-zA-Z]/.test(nextChar);
    if (char === "'" && prevChar !== '\\' && !inDoubleQuote && !isMidWordApostrophe) {
      inSingleQuote = !inSingleQuote;
    }

    // Check safe delimiter boundary
    if (!inDoubleQuote && !inSingleQuote) {
      if (char === '(') parenDepth++;
      else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
      else if (char === '[') bracketDepth++;
      else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
      else if (char === '{') braceDepth++;
      else if (char === '}') braceDepth = Math.max(0, braceDepth - 1);
      else if (char === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
        tokens.push(currentToken.trim());
        currentToken = '';
        continue;
      }
    }

    currentToken += char;
  }

  // 4. Append the final token
  if (currentToken.trim()) {
    tokens.push(currentToken.trim());
  }

  return tokens;
}

/**
 * Format an individual parameter token into safe SQL literal representation.
 *
 * @param token Raw token string, e.g. "123(Long)" or "admin(String)" or "null"
 * @param options Format options (boolean format, etc.)
 * @returns Formatted SQL parameter string
 */
export function formatParameterValue(token: string, options: MyBatisRestoreOptions): string {
  // 1. Check for null values
  const trimmed = token.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') {
    return 'NULL';
  }

  // 2. Extract value and type suffix
  const typeMatch = trimmed.match(/^(.*)\(([^()]+)\)$/);
  let rawVal = trimmed;
  let rawType = '';

  if (typeMatch) {
    rawVal = typeMatch[1].trim();
    rawType = typeMatch[2].trim().toLowerCase();
  }

  if (rawVal.toLowerCase() === 'null' || rawType === 'null') {
    return 'NULL';
  }

  // 3. Numeric types: keep unquoted
  const numericTypes = ['integer', 'int', 'long', 'bigdecimal', 'double', 'float', 'short', 'byte', 'number'];
  if (numericTypes.includes(rawType)) {
    return rawVal;
  }

  // 4. Boolean types: map to 1/0 or TRUE/FALSE
  if (rawType === 'boolean') {
    const isTrue = rawVal.toLowerCase() === 'true';
    return options.booleanFormat === 'numeric' ? (isTrue ? '1' : '0') : (isTrue ? 'TRUE' : 'FALSE');
  }

  // 5. String & Character types: wrap and escape
  const stringTypes = ['string', 'char', 'character', 'text'];
  if (stringTypes.includes(rawType)) {
    return wrapSqlString(rawVal);
  }

  // 6. Date & Time types: wrap in single quotes
  const dateTypes = ['date', 'timestamp', 'time', 'localdate', 'localdatetime', 'localtime'];
  if (dateTypes.includes(rawType)) {
    return wrapSqlString(rawVal);
  }

  // 7. Fallback for untyped values: infer numbers vs strings
  if (!rawType && /^-?\d+(\.\d+)?$/.test(rawVal)) {
    return rawVal;
  }

  return wrapSqlString(rawVal);
}

/**
 * Build a single RestoredStatement entity from a template and parameters string.
 *
 * @param id Statement sequence index
 * @param rawSql Raw SQL template line
 * @param paramsLine Raw parameters line or null
 * @param options User formatting options
 * @returns Completed RestoredStatement entity
 */
export function buildRestoredStatement(
  id: number,
  rawSql: string,
  paramsLine: string | null,
  options: MyBatisRestoreOptions,
): RestoredStatement {
  // 1. Clean SQL template and count placeholders
  const sqlTemplate = rawSql.trim().replace(/;$/, '');
  const placeholderMatches = sqlTemplate.match(/\?/g);
  const placeholderCount = placeholderMatches ? placeholderMatches.length : 0;

  // 2. Tokenize parameters and check for count mismatch
  const paramTokens = paramsLine !== null ? tokenizeParameters(paramsLine) : [];
  const paramCount = paramTokens.length;
  const hasMismatch = placeholderCount !== paramCount;
  const warningMessage = hasMismatch
    ? `Placeholder count (${placeholderCount}) does not match parameter count (${paramCount}).`
    : undefined;

  // 3. Inject parameter values into '?' placeholders
  let paramIndex = 0;
  const restoredSqlWithoutSemicolon = sqlTemplate.replace(/\?/g, () => {
    if (paramIndex < paramTokens.length) {
      const formatted = formatParameterValue(paramTokens[paramIndex], options);
      paramIndex++;
      return formatted;
    }
    return '?';
  });

  const restoredSql = `${restoredSqlWithoutSemicolon};`;

  // 4. Optionally format the SQL with dialect
  let prettifiedSql: string | undefined;
  if (options.prettify) {
    try {
      prettifiedSql = formatSql(restoredSql, {
        language: options.dialect,
        keywordCase: 'upper',
      });
    } catch {
      prettifiedSql = restoredSql;
    }
  }

  return {
    id,
    sqlTemplate,
    paramCount,
    placeholderCount,
    hasMismatch,
    warningMessage,
    parameters: paramTokens,
    restoredSql,
    prettifiedSql,
  };
}

/**
 * Parse raw MyBatis console logs and restore them into executable SQL statements.
 *
 * @param rawLogs Multiline console logs containing Preparing and optional Parameters lines
 * @param userOptions Optional configuration overrides
 * @returns Result object containing restored statements and combined SQL
 */
export function parseAndRestoreMyBatisLogs(
  rawLogs: string,
  userOptions?: Partial<MyBatisRestoreOptions>,
): RestoreResult {
  // 1. Merge default options and validate input
  const options: MyBatisRestoreOptions = { ...DEFAULT_RESTORE_OPTIONS, ...userOptions };
  if (!rawLogs || !rawLogs.trim()) {
    return { statements: [], combinedSql: '' };
  }

  // 2. Iterate through lines to pair Preparing and Parameters blocks
  const lines = rawLogs.split(/\r?\n/);
  const statements: RestoredStatement[] = [];
  let currentPreparingSql: string | null = null;
  let statementIndex = 1;

  for (const line of lines) {
    const preparingMatch = line.match(/(?:==>\s*)?Preparing:\s*(.+)$/i);
    if (preparingMatch) {
      if (currentPreparingSql !== null) {
        statements.push(buildRestoredStatement(statementIndex++, currentPreparingSql, null, options));
      }
      currentPreparingSql = preparingMatch[1].trim();
      continue;
    }

    const parametersMatch = line.match(/(?:==>\s*)?Parameters:\s*(.*)$/i);
    if (parametersMatch && currentPreparingSql !== null) {
      statements.push(buildRestoredStatement(statementIndex++, currentPreparingSql, parametersMatch[1].trim(), options));
      currentPreparingSql = null;
    }
  }

  // 3. Commit any dangling statement at end of log
  if (currentPreparingSql !== null) {
    statements.push(buildRestoredStatement(statementIndex++, currentPreparingSql, null, options));
  }

  // 4. Combine all restored SQL statements
  const combinedSql = statements
    .map(s => (options.prettify && s.prettifiedSql ? s.prettifiedSql : s.restoredSql))
    .join('\n\n');

  return { statements, combinedSql };
}
