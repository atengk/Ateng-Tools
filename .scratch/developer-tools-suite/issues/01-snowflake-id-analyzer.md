# 01 — Snowflake ID Analyzer

**What to build:** A complete Snowflake ID analysis and generation tool. Users can input a 64-bit integer Snowflake ID to view its decomposed components (timestamp, formatted datetime, relative time, datacenter ID, worker ID, and sequence number) along with a segmented, color-coded 64-bit binary representation. Users can configure the epoch (Twitter default or custom) and switch bit allocations (5+5+12 vs 10+12). A batch parsing mode allows pasting multiple IDs to produce a detailed data table. A generator panel allows synthesizing mock IDs from specified parameters.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] Single 64-bit Snowflake ID decomposition correctly extracts timestamp, datacenter ID, worker ID, and sequence without BigInt precision loss.
- [x] Visual color-coded binary bit representation displays 64 bits partitioned into Sign, Timestamp, Datacenter, Worker, and Sequence chunks.
- [x] Configurable base epoch timestamp (defaulting to Twitter epoch `1288834974657L`) and support for custom epochs.
- [x] Support for both 5+5+12 (datacenter + worker) and 10+12 (worker only) bit layouts.
- [x] Batch analysis mode parses multiline IDs into a sortable data table.
- [x] ID generator synthesizes a valid 64-bit ID from user-specified timestamp, machine, and sequence values.
- [x] Unit tests in `snowflake-id-analyzer.service.test.ts` pass and cover standard parsing, custom epochs, layout variations, batch runs, and error handling.
- [x] Full UI implemented in Naive UI with tool registration and route `/snowflake-id-analyzer`.
