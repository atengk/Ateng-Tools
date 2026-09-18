import type { FormatOptionsWithLanguage } from 'sql-formatter';

/**
 * Models and configuration options for MyBatis SQL Log Converter
 */

export type SqlDialect = FormatOptionsWithLanguage['language'];

export interface MyBatisRestoreOptions {
  /** Output format for boolean values: 'numeric' (1/0) or 'keyword' (TRUE/FALSE) */
  booleanFormat: 'numeric' | 'keyword';
  /** Whether to format/prettify the restored SQL */
  prettify: boolean;
  /** SQL dialect for sql-formatter (e.g. 'mysql', 'postgresql', 'plsql', 'tsql', 'sql') */
  dialect: SqlDialect;
}

export interface RestoredStatement {
  /** 1-based statement sequence index */
  id: number;
  /** Raw SQL statement containing '?' placeholders extracted from Preparing line */
  sqlTemplate: string;
  /** Number of parsed parameter tokens */
  paramCount: number;
  /** Number of '?' placeholders found in the SQL template */
  placeholderCount: number;
  /** True if placeholderCount does not equal paramCount */
  hasMismatch: boolean;
  /** Warning translation key or message if count mismatch occurs */
  warningMessage?: string;
  /** Raw parameter strings */
  parameters: string[];
  /** Final runnable SQL with parameters injected */
  restoredSql: string;
  /** Optional formatted SQL using sql-formatter */
  prettifiedSql?: string;
}

export interface RestoreResult {
  /** Individual restored statement items */
  statements: RestoredStatement[];
  /** Semicolon-separated combination of all restored SQL statements */
  combinedSql: string;
}

export const DEFAULT_RESTORE_OPTIONS: MyBatisRestoreOptions = {
  booleanFormat: 'numeric',
  prettify: false,
  dialect: 'mysql',
};
