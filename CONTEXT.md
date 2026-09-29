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
### Spring Config Converter

**Spring Config Converter**:
Ateng-Tools 中用于纯客户端微服务与云原生配置四合一双向互转的开发者工具，支持 YAML、Properties、ENV 环境变量与 JSON 任意互转，兼容 Spring Boot 宽松绑定规范与数组展开。
_避免使用 (Avoid)_: Yaml Converter, Env Generator, Properties Tool

**Relaxed Binding Mapper**:
遵循 Spring Boot 规范将点号路径与连字符配置映射为大写下划线环境变量（如 `spring.datasource.hikari.maximum-pool-size` ↔ `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE`）的命名转换引擎。
_避免使用 (Avoid)_: Case Transformer, String Upper, Name Rule

**Path Tokenizer**:
将复杂配置键（如 `servers[0].url`）拆分为属性字段与数组索引元组的词法分词器。
_避免使用 (Avoid)_: Key Splitter, Dot Separator

**Flat Entry**:
配置树完全扁平化后的最小单位，由全限定点号路径键和标量值组成。
_避免使用 (Avoid)_: Config Row, Line Item, Key Pair
### Cron Simulator

**Cron Simulator**:
Ateng-Tools 中用于纯客户端定时任务表达式解析与执行模拟的开发者工具，支持 Linux 5 位、Spring 6 位与 Quartz 7 位自适应识别，提供中文自然语言直译与未来执行时间序列精准推演。
_避免使用 (Avoid)_: Cron Generator, Crontab Tester, Cron Helper

**Dialect Detector**:
根据表达式空格分词段数（5、6、7 位）和特殊符号智能识别目标调度框架规范（Linux、Spring、Quartz）的自适应嗅探器。
_避免使用 (Avoid)_: Cron Parser, Format Check

**Execution Timeline Engine**:
基于时间跳步状态机快速推演未来 N 次匹配执行时刻的无死锁时间计算引擎。
_避免使用 (Avoid)_: Date Iterator, Cron Looper

**Cron Field Tokenizer**:
将表达式拆解为秒、分、时、日、月、周、年独立结构并提供取值范围校验的可视化分词器。
_避免使用 (Avoid)_: Segment Splitter, Field Array

### Tabular Data & SQL Converter

**Tabular Data & SQL Converter**:
Ateng-Tools 中用于纯客户端多源表格数据解析与批量 SQL/Markdown 导出的开发者工具，支持 TSV、CSV、Markdown 表格与 JSON 数组全矩阵双向互转，提供分批 Batch Size 切片与类型安全转义。
_避免使用 (Avoid)_: Excel to SQL, Table Parser, CSV Converter

**Table Intermediate Model**:
表格数据在内存中的规范化中间结构，由表头数组、规整数据行矩阵与列类型推断描述符构成。
_避免使用 (Avoid)_: Grid Object, Raw Matrix, Table DTO

**Batch Slice Generator**:
按照配置的 `batchSize` 阈值将大批量数据行切割为多条分组 `INSERT INTO table (...) VALUES (...), (...)` 语句的批处理生成器。
_避免使用 (Avoid)_: SQL Splitter, Group Insert, Chunk Writer

**SQL Cell Escaper**:
对单元格数据执行类型推断（数字无引号、布尔值按规范、空值转 NULL、字符串转义单引号防注入）的安全格式化器。
_避免使用 (Avoid)_: Value Cleaner, Quote Adder

### Homepage & Tool Discovery

**Tool Category Filter**:
首页用于按领域分类（如开发运维、数据转换、安全加密、网络测量等）即时筛选工具集合的交互式标签组。
_避免使用 (Avoid)_: Tool Selector, Type Switcher, Category Pill

**Enhanced Tool Card**:
首页与工具列表呈现具体小工具的基础卡片单元，包含领域图标、多语言本地化名称、简短功能描述、新功能徽标、所属分类胶囊与收藏开关。
_避免使用 (Avoid)_: Tool Box, App Tile, Utility Item

**Brand Attribution Banner**:
用于规范声明本工具箱基于 IT-Tools 开源项目二次开发构建并致谢原作者的合规展示单元。
_避免使用 (Avoid)_: Sponsor Banner, Promo Header

**Collapsible Tool Menu**:
左侧侧边栏中按领域分组的层级导航菜单，默认保持全折叠状态以呈现极简清爽视野，且具备在进入具体工具路由时智能感知并自动展开定位目标分类的能力。
_避免使用 (Avoid)_: Tree Menu, Tool List, Category Accordion


