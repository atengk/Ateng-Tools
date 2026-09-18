Status: ready-for-agent

# Specification: MyBatis SQL Log Converter

## Problem Statement

When developing and debugging backend Java applications using MyBatis or MyBatis-Plus, runtime database queries are output into logs with SQL statements and parameter bindings separated across distinct lines (e.g. `==>  Preparing: SELECT ... ?` followed by `==> Parameters: 1(Long), 'foo'(String)`). When inspecting slow queries, errors, or data anomalies, developers frequently need to copy these queries into database clients (Navicat, DBeaver, DataGrip, MySQL CLI) to run them manually. Manually replacing dozens of `?` placeholders with their corresponding typed values, handling quotes, escaping strings, and extracting queries from noisy console logs with timestamps and thread names is tedious, error-prone, and significantly slows down developer productivity.

## Solution

A dedicated client-side utility in Ateng-Tools — the **MyBatis SQL Log Converter**. It allows developers to paste raw, multiline console logs directly into an input box. The tool automatically detects Preparing Statements and Parameter Tokens, safely casts and escapes parameters according to their types, replaces `?` placeholders, and produces complete, executable Restored SQL. It supports multiple SQL queries in a single log snippet, provides automatic SQL prettifying via `sql-formatter` with dialect selection, and offers one-click copying for individual queries as well as the entire batch.

## User Stories

1. As a Java developer, I want to paste raw console logs containing `==>  Preparing:` and `==> Parameters:` lines into the tool, so that I can automatically extract executable SQL without manual text cleaning.
2. As a Java developer, I want the tool to ignore surrounding log metadata such as timestamps, log levels (`[DEBUG]`), thread names, and package paths, so that I do not need to clean log lines before pasting.
3. As a backend engineer, I want string parameters to be automatically wrapped in single quotes and internal single quotes escaped, so that the resulting SQL syntax is valid and prevents SQL syntax errors.
4. As a backend engineer, I want numeric types (`Integer`, `Long`, `BigDecimal`, `Double`, `Float`, `Short`, `Byte`) to remain unquoted, so that database query optimizers can use numerical indexes correctly.
5. As a developer, I want `null` parameters (e.g. `null(Null)` or `null`) to be converted to unquoted SQL `NULL`, so that nullable column conditions and inserts evaluate accurately.
6. As a developer, I want timestamp and date parameters (e.g. `Timestamp`, `Date`, `Time`, `LocalDate`, `LocalDateTime`) to be enclosed in single quotes, so that SQL date/time parsing works across DBMS engines.
7. As a developer, I want a configurable option to choose whether boolean parameters (`Boolean`) are output as numbers (`1` / `0`) or keywords (`TRUE` / `FALSE`), so that I can match the conventions of my target database (e.g. MySQL tinyint vs PostgreSQL boolean).
8. As a developer, I want queries with zero parameters (statements containing no `?` placeholders and no parameters line) to be detected and output directly as valid executable SQL, so that parameterless queries are not discarded.
9. As a developer, I want complex string parameters containing commas, parentheses, or JSON content (e.g. `{"key":"val,1"}(String)`) to be parsed accurately without splitting inside the value, so that complex data structures do not break query restoration.
10. As a developer, I want to paste a continuous log block containing multiple distinct SQL queries executed in sequence, so that all queries are restored in order in a single operation.
11. As a developer, I want an automatic SQL prettify toggle with dialect selection (e.g. MySQL, PostgreSQL, Oracle), so that complex multiline queries are easy to read and inspect.
12. As a developer, I want to see a clear warning indicator if the number of `?` placeholders in a Preparing Statement does not match the number of Parameter Tokens, so that I am alerted to truncated or incomplete logs without losing the partially restored SQL.
13. As a developer, I want a "Load Sample" button, so that I can quickly try out and understand the tool's functionality with one click.
14. As a developer, I want a "Copy All" button as well as individual copy buttons per restored statement, so that I can conveniently paste either the whole transaction or a single query into my database client.
15. As a non-English user, I want the tool's interface, labels, and error messages to be fully localized in Chinese and English, so that I can use the tool comfortably in my preferred language.

## Implementation Decisions

- **Architecture & Location**:
  The tool is implemented as a pure client-side component in Ateng-Tools under the `Development` category, registered with route path `/mybatis-sql-converter`.
- **Parsing Strategy**:
  - Scanning: The parser processes multiline input by scanning for the `Preparing:` keyword to mark the start of a Preparing Statement, capturing the SQL template.
  - Parameter Association: For each Preparing Statement, the parser searches forward for the subsequent `Parameters:` line belonging to that statement until another Preparing Statement or end-of-input is encountered. If no Parameters line exists, the statement is treated as a zero-parameter query.
  - Parameter Tokenizer: A state-machine / balanced-delimiter tokenizer splits the parameter line by commas only when not inside balanced parentheses or quotes, extracting each `value(Type)` or `value` token.
- **Type Casting & Quoting**:
  - Nulls: `null`, `(Null)`, `null(...)` -> `NULL`.
  - Numbers: `(Integer)`, `(Long)`, `(BigDecimal)`, `(Double)`, `(Float)`, `(Short)`, `(Byte)`, `(Number)` -> unquoted string representation.
  - Booleans: `(Boolean)` -> converted to `1`/`0` or `TRUE`/`FALSE` based on active user setting.
  - Strings / Characters: `(String)`, `(Char)`, `(Character)` -> enclosed in single quotes `'...'` with internal single quotes escaped (`\'` or `''`).
  - Dates & Times: `(Date)`, `(Time)`, `(Timestamp)`, `(LocalDate)`, `(LocalDateTime)` -> enclosed in single quotes `'...'`.
  - Default / Fallback: If no recognized type matches or value is not explicitly typed, infer numbers as unquoted and all others as quoted strings.
- **Formatting Integration**:
  Use the project's existing `sql-formatter` library for formatting Restored SQL when the prettify toggle is active, supporting the standard dialects available in the project.
- **State & UI Layout**:
  - Responsive two-column split layout (stacked on small screens).
  - Left panel: Multi-line text input with "Load Sample", "Clear", and "Paste" helper actions.
  - Right panel: Toolbar with Prettify toggle, Dialect selector, Boolean format radio/select, followed by the Restored SQL output card(s) and action buttons ("Copy All", per-statement "Copy").
  - Warning badges displayed when placeholder count != parameter count.
- **Internationalization**:
  Key entries added to `locales/en.yml` and `locales/zh.yml` under `tools.mybatis-sql-converter.*`.

## Testing Decisions

- **Core Seam**:
  Testing focuses strictly on the pure parsing and restoration engine (`parseAndRestoreMyBatisLogs`), validating external behavior rather than internal regular expressions.
- **Test Matrix**:
  - Basic single statement with mixed parameter types (Integer, String, Date, null).
  - Multiple statements in a single multiline dirty log snippet.
  - Parameterless query (zero `?` placeholders).
  - Parameters containing commas, brackets, and quotes within strings (e.g. JSON strings).
  - Mismatched placeholder and parameter count (verifying partial fill + warning flag).
  - Different boolean format options (`1/0` vs `TRUE/FALSE`).
  - Formatting with `sql-formatter` dialects.
- **Prior Art**:
  Follow the pattern of existing unit tests in `src/tools/` (e.g. `xml-formatter.service.test.ts`, `token-generator.service.test.ts`, `yaml-to-json.e2e.spec.ts`) executed with `pnpm test:unit`.

## Out of Scope

- Reverse conversion (converting executable SQL back into MyBatis XML `<select>` or `?` prepared statements).
- Direct database execution or connection management (the tool is strictly an in-browser log text transformer).
- Storing query history in remote servers (local browser memory / Pinia only).

## Further Notes

- The tool requires zero additional runtime npm packages, as `sql-formatter` is already an established dependency in the repository.
