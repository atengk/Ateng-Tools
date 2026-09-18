# 01 — Core Parser and Restoration Engine

**What to build:**
A robust, pure client-side engine and service function that takes multiline raw console logs, filters out log noise (timestamps, log levels, thread names), identifies Preparing Statements and Parameter Tokens, performs balanced lexical parsing on parameters, safely escapes and quotes values according to their data types, injects them into the `?` placeholders, and handles edge cases such as zero-parameter queries and parameter count mismatches. Comprehensive Vitest unit tests verify the engine against various real-world MyBatis log scenarios.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Extract one or more Preparing Statements from dirty console logs with metadata prefixes
- [x] Pair each statement with its corresponding Parameters line when present
- [x] Correctly parse zero-parameter queries and leave them intact as valid SQL
- [x] Tokenize parameters by commas only outside nested parentheses and quotes (handling complex types like JSON strings)
- [x] Safely cast parameter types: String/Date/Timestamp/Time enclosed in single quotes with internal quotes escaped; Integer/Long/Double/BigDecimal unquoted; null/null(Null) replaced with SQL NULL; Boolean converted according to booleanFormat option
- [x] Warn gracefully without throwing when placeholder count does not equal parameter count
- [x] Comprehensive unit test suite with 100% passing tests in Vitest
