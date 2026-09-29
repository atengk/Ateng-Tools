# Ateng-Tools

Personal developer online toolbox providing client-side utility applications for formatting, encoding, generation, and data conversion.

## Language

### MyBatis SQL Converter

**MyBatis SQL Log Converter**:
A developer tool within Ateng-Tools that parses MyBatis/MyBatis-Plus runtime console logs, extracts SQL templates and bound parameters, and restores them into complete, executable SQL statements.
_Avoid_: SQL Runner, SQL Debugger, MyBatis Plugin

**Preparing Statement**:
The raw SQL string containing `?` parameter placeholders logged after the `Preparing:` marker in MyBatis console logs.
_Avoid_: Raw SQL, Prepared SQL, SQL Pattern

**Parameter Token**:
An individual bound parameter value logged after the `Parameters:` marker, containing a value and optional explicit type descriptor such as `value(Type)`.
_Avoid_: Argument, Variable, Bind Variable

**Restored SQL**:
The final executable SQL statement obtained by injecting typed and safely escaped Parameter Tokens into the `?` placeholders of a Preparing Statement.
_Avoid_: Merged SQL, Replaced SQL, Formatted Query

**Batch Log Entry**:
A distinct logical unit composed of one Preparing Statement and its corresponding Parameters line extracted from a mixed log stream.
_Avoid_: Statement Pair, Log Chunk, Query Block

### JSON to Entity Converter

**JSON to Entity Converter**:
A client-side tool that analyzes arbitrary JSON structures and generates typed models, supporting Java DTO/POJO (with Lombok and Jackson annotations), TypeScript interfaces, and Go structs.
_Avoid_: JSON to Java, JSON to Class, JSON Parser

**Target Model Definition**:
The generated code representation of an analyzed JSON object or array, including nested classes and type mappings.
_Avoid_: Output Class, Converted Schema, Target Entity

### cURL Converter

**cURL Converter**:
A client-side tool that parses standard cURL command syntax into structured HTTP request elements and converts them into native client code (Axios, Fetch, Java HttpClient/OkHttp).
_Avoid_: cURL Parser, HTTP Request Generator, Request Builder

**Parsed Request Spec**:
The intermediate structured representation of a cURL command, capturing method, URL, headers, query parameters, and request body.
_Avoid_: cURL Object, Request DTO, Extracted Request

### Snowflake ID Analyzer

**Snowflake ID Analyzer**:
A client-side tool that decomposes 64-bit distributed snowflake IDs into their composite bit segments (timestamp, datacenter ID, worker ID, and sequence number) and supports configurable reverse ID generation.
_Avoid_: Snowflake Calculator, Snowflake Inspector, ID Decoder

**Epoch Offset**:
The custom start timestamp (in milliseconds) used by a Snowflake algorithm implementation as the base zero point.
_Avoid_: Base Time, Epoch Start, Genesis Timestamp

### SQL DDL to Entity Converter

**SQL DDL to Entity Converter**:
A client-side tool that parses MySQL `CREATE TABLE` DDL statements and converts columns, primary keys, and comments into mapped Java Entity definitions with MyBatis-Plus and Lombok annotations.
_Avoid_: DDL Generator, Table to Entity, SQL to Code

**Column Mapping Rule**:
The deterministic logic converting SQL data types (e.g., `BIGINT`, `VARCHAR`, `DATETIME`) and constraints into corresponding target language types and annotations.
_Avoid_: Field Rule, Type Transformer, Schema Mapping

### WebSocket & SSE Stream Client

**WebSocket & SSE Stream Client**:
Ateng-Tools 中用于纯客户端实时通信与流式接口调试的开发者工具，支持 WebSocket 全双工通信与 Server-Sent Events (SSE) 事件流监听，提供消息帧解析与心跳保活机制。
_避免使用 (Avoid)_: Socket Tester, WS Inspector, Stream Proxy

**Message Frame**:
通过 WebSocket 或 SSE 连接传输的单条协议数据包或事件块，携带传输方向（发送/接收）、高精度时间戳、数据格式（JSON/文本）与字节量度。
_避免使用 (Avoid)_: Log Item, Packet Chunk, Socket Row

**Stream Aggregator**:
将离散到达的连续流式数据帧（如 LLM 大模型 SSE 事件块）在客户端进行顺序拼接并投影为连贯全文或 Markdown 渲染图景的聚合解析视图。
_避免使用 (Avoid)_: Chunk Merger, Stream Collector, Token Joiner

**Heartbeat Pinger**:
在活动的 WebSocket 连接上按可配置间隔周期性发送保活探测负载（Ping/自定义 JSON）的客户端保活调度器。
_避免使用 (Avoid)_: Ping Timer, Keepalive Daemon, Echo Loop

**Payload Preset**:
用户保存在浏览器本地存储中、用于一键填入发送编辑器的命名常用消息模板对象。
_避免使用 (Avoid)_: Snippet, Quick Text, Draft Item

**SSE Stream Engine**:
基于 Fetch API 与 ReadableStream 构建的纯客户端流式读取引擎，支持以 GET 或 POST 方式携带自定义请求头与 JSON 负载，解析并在客户端流式分发 SSE 协议块。
_避免使用 (Avoid)_: EventSource Wrapper, SSE Driver, Stream Reader

**First-Packet Auth**:
在 WebSocket 连接握手建立（`onopen`）后毫秒级立即自动发出的客户端首包鉴权凭证协议。
_避免使用 (Avoid)_: Handshake Auth, Initial Message, Connect Token

**Frame Buffer**:
具有固定容量上限的先进先出（FIFO）消息帧环形缓冲队列，用于高频推送下防止浏览器 DOM 与内存膨胀。
_避免使用 (Avoid)_: History Array, Packet Cache, Message Queue



