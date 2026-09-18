# 02 — cURL Converter

**What to build:** An end-to-end cURL command parser, inspector, and code generator. Users paste bash `curl` commands (including multiline strings with line-continuation backslashes) to generate clean JavaScript Axios, modern Fetch, and Java 11/21 HttpClient snippets. In addition to code generation, a visual inspection panel extracts and tabulates URL components, Query Parameters, Headers, Request Body (with JSON auto-formatting), and Authentication details.

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] Robust lexical tokenization of cURL arguments (`-X`, `-H`, `-d`, `--data-raw`, `-u`, `--url`, multiline `\` and quotes).
- [x] Code generation for JavaScript Axios (`axios.request({...})`).
- [x] Code generation for JavaScript native `fetch(...)`.
- [x] Code generation for Java 11/21 standard `java.net.http.HttpClient`.
- [x] Visual inspection tab showing parsed Method, URL, Query table, Headers table, and Body viewer.
- [x] "Load Sample" button providing a realistic multiline cURL example with headers and JSON body.
- [x] Unit tests in `curl-converter.service.test.ts` pass and cover GET, POST JSON, form data, basic auth, bearer tokens, and multiline commands.
- [x] Full UI implemented in Naive UI with tool registration and route `/curl-converter`.
