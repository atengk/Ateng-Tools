# Ateng-Tools

个人开发者在线工具箱，提供用于格式化、编解码、代码生成与数据转换的纯客户端离线轻量级工具套件。

## 领域术语表 (Language)

### MyBatis SQL 转换器 (MyBatis SQL Converter)

**MyBatis SQL Log Converter**:
Ateng-Tools 中用于解析 MyBatis/MyBatis-Plus 运行时控制台日志，提取 SQL 模板与绑定参数，并将其还原为完整、可执行 SQL 语句的开发者工具。
_避免使用 (Avoid)_: SQL Runner, SQL Debugger, MyBatis Plugin

**Preparing Statement**:
在 MyBatis 控制台日志中紧跟在 `Preparing:` 标记之后的包含 `?` 参数占位符的原始 SQL 模板字符串。
_避免使用 (Avoid)_: Raw SQL, Prepared SQL, SQL Pattern

**Parameter Token**:
在 MyBatis 控制台日志中紧跟在 `Parameters:` 标记之后的单个绑定参数值，包含实际数值及可选的显式类型描述符（如 `value(Type)`）。
_避免使用 (Avoid)_: Argument, Variable, Bind Variable

**Restored SQL**:
将经过类型推断和安全转义的 Parameter Token 注入到 Preparing Statement 的 `?` 占位符中所生成的最终完整可执行 SQL 语句。
_避免使用 (Avoid)_: Merged SQL, Replaced SQL, Formatted Query

**Batch Log Entry**:
从混合日志流中提取出的由一条 Preparing Statement 和其对应 Parameters 行构成的独立最小逻辑单元。
_避免使用 (Avoid)_: Statement Pair, Log Chunk, Query Block

### JSON 转实体生成器 (JSON to Entity Converter)

**JSON to Entity Converter**:
Ateng-Tools 中用于纯客户端解析任意 JSON 结构并自动生成强类型模型的代码生成工具，支持 Java DTO/POJO（带 Lombok 和 Jackson 注解）、TypeScript 接口以及 Go 结构体。
_避免使用 (Avoid)_: JSON to Java, JSON to Class, JSON Parser

**Target Model Definition**:
对分析后的 JSON 对象或数组进行代码映射所生成的强类型模型表示，包含嵌套子类与类型推断映射。
_避免使用 (Avoid)_: Output Class, Converted Schema, Target Entity

### cURL 转换器 (cURL Converter)

**cURL Converter**:
Ateng-Tools 中用于纯客户端解析标准 cURL 命令行语法为结构化 HTTP 请求要素，并将其转换为各语言原生客户端代码（Axios、Fetch、Java HttpClient/OkHttp）的代码生成工具。
_避免使用 (Avoid)_: cURL Parser, HTTP Request Generator, Request Builder

**Parsed Request Spec**:
cURL 命令在解析后生成的结构化中间表示，提取了请求方法、目标 URL、请求头、查询参数以及请求体负载。
_避免使用 (Avoid)_: cURL Object, Request DTO, Extracted Request

### 雪花 ID 分析器 (Snowflake ID Analyzer)

**Snowflake ID Analyzer**:
Ateng-Tools 中用于纯客户端将 64 位分布式雪花 ID 拆解为其组成二进制位段（时间戳、数据中心 ID、工作节点 ID 及自增序列号）并支持可配置逆向推演生成的开发者工具。
_避免使用 (Avoid)_: Snowflake Calculator, Snowflake Inspector, ID Decoder

**Epoch Offset**:
雪花算法具体实现中用作时间零点基准的自定义起始时间戳（毫秒级）。
_避免使用 (Avoid)_: Base Time, Epoch Start, Genesis Timestamp

### SQL DDL 转实体生成器 (SQL DDL to Entity Converter)

**SQL DDL to Entity Converter**:
Ateng-Tools 中用于纯客户端解析 MySQL `CREATE TABLE` 建表 DDL 语句，将字段、主键索引与注释映射生成为带 MyBatis-Plus 和 Lombok 注解的 Java 实体类定义的开发者工具。
_避免使用 (Avoid)_: DDL Generator, Table to Entity, SQL to Code

**Column Mapping Rule**:
将 SQL 数据类型（如 `BIGINT`、`VARCHAR`、`DATETIME`）及其约束确定性转换为目标语言对应类型与注解的映射规则。
_避免使用 (Avoid)_: Field Rule, Type Transformer, Schema Mapping

### WebSocket 与 SSE 流式客户端 (WebSocket & SSE Stream Client)

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
### Spring 配置转换器 (Spring Config Converter)

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

### Cron 表达式模拟器 (Cron Simulator)

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

### 表格数据与 SQL 转换器 (Tabular Data & SQL Converter)

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

### 首页与工具发现体系 (Homepage & Tool Discovery)

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

**Canonical Tool Taxonomy**:
Ateng-Tools 全站规范化的八大核心领域分类拓扑体系（涵盖 `dev` 开发运维、`converter` 格式转换、`security` 加密安全、`network` 网络与 Web、`text` 文本与内容、`pdf` PDF 工具、`media` 图形多媒体、`calc` 计算与度量），用于统一全站工具发现、侧边栏导航、首页过滤标签及多语言国际化映射。
_避免使用 (Avoid)_: Tool Grouping, Type Hierarchy, Classification Scheme

**Tool Category Key**:
工具分类在底层 TypeScript 类型契约及多语言命名空间中的唯一强类型小写枚举标识符（如 `dev`、`converter`、`security`、`network`、`text`、`pdf`、`media`、`calc`）。
_避免使用 (Avoid)_: Category ID, Type Tag, Section Name

**Taxonomy Admission Gate**:
Ateng-Tools 全站增设新顶层工具分类的硬性准入规则与防御门禁：仅当目标专业垂直领域在纯客户端能够支撑至少 3 款及以上高内聚小工具，且其心智模型与现有八大领域清晰正交时，方可通过架构评估升格为新分类，杜绝随意增设导致分类单薄与碎片化。
_避免使用 (Avoid)_: Category Filter Rule, Taxonomy Policy, Group Barrier

### 图片处理工作台 (Image Studio)

**Image Studio**:
Ateng-Tools 中用于纯客户端一站式位图编辑、尺寸缩放、交互式裁剪、图文水印与多格式压缩导出的集成图片处理工作台。
_避免使用 (Avoid)_: Image Editor, Photo Shop, Picture Tool, Image Converter

**Non-destructive Render Pipeline**:
保留原始图像内存句柄，将缩放、裁剪、滤镜、水印与压缩解耦为声明式配置并在导出与预览时计算重绘的非破坏性渲染管道。
_避免使用 (Avoid)_: Canvas Chain, Step Committer, Raster Stack

**Interactive Crop Region**:
在源图画布上由用户通过拖拽控制手柄指定的矩形选区或预设比例（1:1、16:9 等）裁剪范围。
_避免使用 (Avoid)_: Cut Box, Selection Mask, Crop Window

**Before-After Split View**:
在工作台预览视窗中通过可拖曳滑块将原图与处理后位图进行同屏并排即时差分比对的交互视窗。
_避免使用 (Avoid)_: Comparison Slider, Diff Window, Dual Canvas

**Watermark Overlay Spec**:
定义文字水印（内容、字体、字号、颜色、透明度、旋转角、全屏平铺间距）或图片 Logo 水印（源、缩放、透明度）及其在画布上的九宫格定位或阵列布局规则。
_避免使用 (Avoid)_: Stamp Config, Mark Option, Text Label

**Color Palette Extractor**:
基于图像像素采样与色彩量化算法，从当前位图中提取代表性主导色彩集并提供 HEX/RGB 快捷复制的提取分析器。
_避免使用 (Avoid)_: Color Picker, Theme Finder, Dominant Sampler

**EXIF Inspector**:
在客户端解析图像原始二进制数据段（TIFF IFD / GPS IFD），呈现拍摄设备、曝光参数与地理位置等元数据的只读透视抽屉。
_避免使用 (Avoid)_: Meta Viewer, Exif Reader, Tag Browser

**Dimension Preset**:
为开发者常见场景（GitHub 头像、Favicon、社交媒体分享卡片等）预设的标准宽高比与分辨率配置模板。
_避免使用 (Avoid)_: Size Template, Resolution Option, Ratio Preset

### PDF 工具箱与工作台 (PDF Toolkit & Studio)

**PDF Studio**:
Ateng-Tools 中用于纯客户端多页 PDF 可视化编排、页面重排、旋转裁剪、提取拆分与水印注入的集成文档工作台。
_避免使用 (Avoid)_: PDF Editor, Acrobat Web, PDF Viewer

**Virtual Page Deck**:
在客户端内存中维护的由离散 PDF 页面元信息（源文件引用、原始页码、当前旋转角度、删除标记）构成的响应式页面序列。
_避免使用 (Avoid)_: Page List, Slide Array, Document Nodes

**Deferred Rasterizer**:
基于 pdf.js 与 Web Worker/OffscreenCanvas 实现的视口感知与按需延迟渲染缩略图引擎，防止百页大文档导致主线程卡顿与内存膨胀。
_避免使用 (Avoid)_: Page Drawer, Thumbnail Maker, Canvas Looper

**Watermark Stamp Pipeline**:
在 pdf-lib 二进制字节流级别将文本字形或图层透明度按几何矩阵无损嵌入目标页面的渲染管道。
_避免使用 (Avoid)_: Stamp Tool, Watermark Overlay, Text Writer

**Transparent Stamp Rasterizer**:
利用客户端 Canvas 2D 离屏排版将任意字符（中文、生僻字、Emoji）预先栅格化为透明 PNG 位图，免除额外中文字体网络加载并保证全平台视觉一致的水印图层生成器。
_避免使用 (Avoid)_: Font Loader, Canvas Writer, Text Stamper

**In-Memory Zip Archiver**:
在浏览器沙箱内存中将多页导出位图或拆分后的多份 PDF 资产流式压缩为单个 ZIP 压缩包的打包交付器。
_避免使用 (Avoid)_: Zip Utility, File Packer, Batch Downloader

**Page Range Expression**:
用于将紧凑字符串（如 `1-3, 5, 8-12`）解析为确定性零基页码索引集合并提供边界与越界校验的语法解析器。
_避免使用 (Avoid)_: Page String, Number List, Range Filter

### PDF 加密与解密工具 (PDF Encrypt & Decrypt)

**PDF Encrypt & Decrypt**:
Ateng-Tools 中用于纯客户端在浏览器内存中对 PDF 文档进行口令加密、权限细粒度限制及解除密码保护的开发者工具。
_避免使用 (Avoid)_: PDF Locker, PDF Password Remover, PDF Protector

**User Password**:
打开并浏览加密 PDF 文档内容所必需的访问口令。
_避免使用 (Avoid)_: Open Password, Document Secret, View Key

**Owner Password**:
用于锁定并管控文档打印、复制、注释与装配等操作权限的高阶主控口令。
_避免使用 (Avoid)_: Admin Password, Master Pin, Master Key

**Access Permission Matrix**:
在加密 PDF 内部定义的细粒度能力授权集合（涵盖高清/低清打印、文本与图像复制、内容修改、批注标注、表单填写及文档装配重组）。
_避免使用 (Avoid)_: Security Rules, PDF Policies, Rights Config

**Password Stripping**:
在输入正确访问或管理密码后，客户端重构 PDF 二进制对象流并彻底移除安全加密字典（Encrypt Dictionary），生成免密文档的操作。
_避免使用 (Avoid)_: PDF Cracking, Password Hack, Unlock File

