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

**Homepage Tool Search Filter**:
首页主体区域中常驻的即时交互式搜索过滤组件，提供多维权重分级检索、拼音全拼与首字母匹配，并直接驱动本页 Enhanced Tool Card 的毫秒级重排与过滤展示。
_避免使用 (Avoid)_: In-Page Search, Card Filter, Quick Search Input

**Portal Hero Section**:
首页主体顶部的通透极简居中欢迎与核心入口单元，剥离冗余大卡片底色与装饰性指标格子，高度控制在 105px 左右，直接聚合纯离线安全徽标与单真理源即时搜索栏。
_避免使用 (Avoid)_: Top Banner, Welcome Box, Big Banner

**Single Source Search**:
全站首页的单真理源即时搜索交互架构，在首页彻底隐藏顶栏搜索条，并将全局快捷键（`Ctrl+K`、`⌘K`、`/`）100% 统一路由聚焦至中央主搜索框，消除双搜索歧义。
_避免使用 (Avoid)_: Dual Search, Top Search Bar, Duplicate Search Box

**Favorites Quick Shelf**:
首页中以横向弹性微卡片呈现用户标星工具的轻量化陈列货架，提供领域图标、精简标题与拖拽手柄，避免在少量收藏时破坏网格平衡。
_避免使用 (Avoid)_: Favorite Grid, Star List, Bookmark Row

**Categorized Segmented Control**:
首页中结合 Tabler 原生矢量领域图标与计数徽章的交互式分类过滤组件，支持无冗余状态展示与大屏自适应排布。
_避免使用 (Avoid)_: Category Pills, Type Filter, Tag Bar

**Micro-Surfaced Icon Container**:
在 Enhanced Tool Card 中包裹 Tabler 矢量图标的柔和半透明浅底圆角微容器，强化图标聚焦度并统一几何韵律。
_避免使用 (Avoid)_: Icon Box, Round Icon, Tool Glyph

**Viewport Rhythm Boundary**:
全站首页与展示列表在大屏显示器下的标准化最大宽度容器与居中对齐基线，消除超宽屏下卡片横向拉伸失衡。
_避免使用 (Avoid)_: Max Width Wrap, Page Container, Content Limiter

**Favorites Chip Tile**:
常用收藏货架中采用的紧凑横向弹性磁贴芯片（高度约 40px），仅包含 32px 微图标、工具标题、分类小标与快捷移出星标，彻底取代大面积全尺寸卡片。
_避免使用 (Avoid)_: Favorite Card, Star Item, Bookmark Box

**Dynamic Colorful Icon Palette**:
为工具卡片微底色容器提供丰富视觉辨识度的多样化柔和浅底调色板（包含青、蓝、翠绿、紫、琥珀、橙、粉等），杜绝同一分类下卡片图标千篇一律单调发灰。
_避免使用 (Avoid)_: Random Color, Icon Style, Theme Colors

**Pinyin Token Indexer**:
在客户端内存中将工具中文名称及描述预编译或实时提取为拼音全拼与拼音首字母缩写的轻量级分词索引引擎，用于增强 Fuse.js 模糊匹配在中文场景下的无感命中能力。
_避免使用 (Avoid)_: Pinyin Converter, Chinese Search Helper, Pinyin Parser

**Tool Category Filter**:
首页用于按领域分类（如开发运维、数据转换、安全加密、网络测量等）即时筛选工具集合的交互式标签组。
_避免使用 (Avoid)_: Tool Selector, Type Switcher, Category Pill

**Flat Category Navigation**:
侧边栏中采用的扁平单层领域分类导航，仅包含全量工具、收藏快捷项与 8 大领域分类及计数徽章，点击联动右侧分类筛选，不展开二级工具长列表，保持侧边栏清爽与高利用率。
_避免使用 (Avoid)_: Tree Menu, Submenu List, Nested Navigation

**Feature Highlight Tag**:
在 Enhanced Tool Card 左下角以微字号呈现的具体工具专属能力亮点标签（如 `⚡ 极速预测`、`⚡ 可视化交互`），以个性化亮点替换同质化重复标签。
_避免使用 (Avoid)_: Offline Tag, Card Badge, Tool Label

**Enhanced Tool Card**:
首页与工具列表呈现具体小工具的基础卡片单元，包含领域图标、多语言本地化名称、简短功能描述、新功能徽标、所属分类胶囊与收藏开关。
_避免使用 (Avoid)_: Tool Box, App Tile, Utility Item

**Match Cue Badge**:
在 Enhanced Tool Card 上呈现非标题可见字段（如拼音首字母缩写、内部 keywords 或别名）命中线索的微型视觉徽标。
_避免使用 (Avoid)_: Search Hint, Match Tag, Hit Label

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

**Global Command Palette**:
全站顶层通用的悬浮式全局命令面板与快速跳转弹窗，基于半透明毛玻璃高斯模糊背景与一体化 Spotlight 质感卡片构建，全面复用纯客户端拼音检索引擎与多维权重排序，支持全键盘极客导航、初始高频推荐与系统快捷动作执行。
_避免使用 (Avoid)_: Search Dialog, Pop Search, Quick Window, Spotlight Clone

**Command Option Descriptor**:
在全局命令面板中表达单个可选项（工具跳转项、系统状态切换、外部文档链接）的规范化模型，包含标题、简述、分组标识、Tabler 矢量图标与执行回调。
_避免使用 (Avoid)_: Palette Item, Result Row, Command Node

**Spotlight Surface Container**:
具有大圆角、多层微阴影与无边框沉浸式搜索头的全局命令面板核心卡片容器，遵循 Surface Elevation Hierarchy 语义层级标准。
_避免使用 (Avoid)_: Search Box, Modal Frame, Popup Card

**Keyboard Action Deck**:
固定停靠于全局命令面板底部的轻量快捷键指引状态栏，提供方向键切换、回车跳转与 Esc 关闭等键盘极客操作提示。
_避免使用 (Avoid)_: Shortcut Bar, Footer Hints, Key Helper

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

### 全局设计系统与排版规范 (Design System & Typography)

**Canonical Design Token**:
Ateng-Tools 全站通用的设计令牌单一真理源，以 Tailwind Blue (`#2563eb`) 为品牌主色，严格绑定状态悬浮（`#3b82f6`）、按下（`#1d4ed8`）与半透明浅底（`rgba(37, 99, 235, 0.12)`），并在 Naive UI、UnoCSS 与组件层保持 100% 映射一致。
_避免使用 (Avoid)_: Custom Color, Theme Constant, Style Variable, Hex Literal

**Surface Elevation Hierarchy**:
全站界面在亮暗模式下的三层结构表面与边框分级体系（Surface 0 底板背景、Surface 1 主卡片与导航区、Surface 2 输入框与悬浮弹层），暗色模式基于 Slate 系列（`#0f172a` / `#1e293b` / `#334155`）构建高品质视觉纵深。
_避免使用 (Avoid)_: Dark Layer, Background Depth, Color Level

**Chinese Typography Stack**:
优先保障中文字符清晰度、笔画呼吸感与等宽代码排版的全局字体栈契约，包含高质量现代系统中文黑体与知名编程等宽字体，严禁对中文字体套用负字间距。
_避免使用 (Avoid)_: Font List, System Font, Typography Preset

**Component Geometry Rhythm**:
全站容器组件（12px 圆角 + 微投影）与操作控件（8px 圆角 + 聚焦外环环绕）的标准化几何尺度与交互基线。
_避免使用 (Avoid)_: Border Radius Rule, Component Shape, Corner Scale

### 全局基础设施与交互韧性规范 (Global Infrastructure & Interaction Resilience)

**Global Context Bridge**:
在根组件挂载期向 `window` 注入受管 Naive UI 实例引用（`$message`、`$dialog`、`$notification`、`$loadingBar`）的桥接器，确保无 Vue 上下文环境（路由前置守卫、Pinia Store、全局异常拦截器）能够安全发起弹窗与进度控制。
_避免使用 (Avoid)_: Global Window Hack, UI Helper, Window Naive

**Progressive Navigation Feedback**:
在路由切换生命周期中，结合 `loadingBar` 启动/完成/异常，以及 `scrollBehavior` 智能顶置复位的全局路由交互增强机制。
_避免使用 (Avoid)_: Route Spinner, Top Bar Loader, Page Scroll Fix

**Canonical Tabler Iconography**:
全域强制使用 `@vicons/tabler` 原生 SVG 组件，杜绝遗留 `icon-mdi-*` 伪类组件与非标图标集合的矢量图标资产标准。
_避免使用 (Avoid)_: MDI Icons, Unocss Icons, Custom SVG

**Defensive Error Interception**:
通过 `app.config.errorHandler` 在应用层统一捕获未受控运行时异常，结合 `$message.error` 进行语义化中文反馈并防范页面白屏崩溃的全局韧性防线。
_避免使用 (Avoid)_: Crash Guard, Exception Catch, Error Boundary Component

**Manifest Theme Synchronization**:
将 PWA 网页清单与移动端 WebMeta 声明严格绑定至全站设计令牌单一真理源（`tokens.colors.primary.DEFAULT` 与 `tokens.colors.slate[50]`）的契约规则。
_避免使用 (Avoid)_: Meta Hardcoding, PWA Color Patch, Standalone Manifest Config

### P2P 局域网快传 (P2P File Transfer)

**P2P File Transfer**:
Ateng-Tools 中用于纯客户端跨设备（手机与电脑、电脑与电脑）点对点文件与文本即时传输的开发者工具，基于 WebRTC DataChannel 实现，支持扫码秒连与端到端加密直连。
_避免使用 (Avoid)_: Web AirDrop, Snapdrop Clone, File Sync, File Server

**Signaling Broker**:
负责在对等端建立 WebRTC 通信前转发房间信标、SDP Offer/Answer 及 ICE 候选者等握手元数据的轻量中继模块；连接一旦建立即刻脱困，绝不触碰任何文件数据载荷。
_避免使用 (Avoid)_: File Relay, Transfer Server, Signaling Server

**Air-Gapped Exchange**:
在完全无外网或严格内网环境中，通过双向二维码动态扫描或剪贴板文本导入导出完成 SDP 握手的无服务端 WebRTC 建立模式。
_避免使用 (Avoid)_: Offline Sync, Local Hack, Manual Pair

**Chunked Stream Transceiver**:
基于浏览器 File API 与 WebRTC DataChannel，将待发文件切片为 16KB~64KB 顺序数据块，并结合 `bufferedAmountLowThreshold` 背压流控进行安全投送与流式重组的传输引擎。
_避免使用 (Avoid)_: File Slicer, Binary Pump, Chunk Buffer

**Transfer Session**:
两个对等端设备之间成功建立的经过 DTLS 加密的独立通信生命周期，包含对端设备指纹、网络连接状态、待发/接收任务队列与双向数据通道。
_避免使用 (Avoid)_: Peer Room, Connection Context, Socket Pair

### HTTP 客户端 (HTTP Client)

**HTTP Client**:
Ateng-Tools 中用于纯客户端轻量级 HTTP 接口调试与测试的开发者工具，支持多请求方法、参数与请求体构建、鉴权认证、实时响应分析与 cURL 语法双向导入导出。
_避免使用 (Avoid)_: Postman Clone, Mini Postman, Web Postman, Request Builder, API Tester

**Request Spec**:
在 HTTP 客户端中用于描述单次 HTTP 请求全部要素的结构化数据契约模型，包含请求方法、目标 URL、查询参数、请求头、鉴权凭据与请求体。
_避免使用 (Avoid)_: Request Object, Fetch Param, HTTP Config

**Response Snapshot**:
客户端发起请求后捕获的响应结果快照，包含 HTTP 状态码、耗时统计（毫秒）、响应体尺寸、响应头字典以及结构化或原始响应体内容。
_避免使用 (Avoid)_: Response DTO, HTTP Result, Output Chunk

**CORS Diagnostic Guard**:
在纯客户端请求遭遇跨域资源共享（CORS）策略拦截或网络失败时，负责智能诊断异常类型、提供排查指导并引导一键降级为 cURL 终端命令的容错防御机制。
_避免使用 (Avoid)_: Error Interceptor, Proxy Hack, Network Fallback

### JSON 工作台 (JSON Studio)

**JSON Studio**:
Ateng-Tools 中用于纯客户端一站式 JSON 语法高亮编辑、可视化树形交互、JSONPath 提取过滤、非标语法智能修复、字符串转义还原及多维格式转换的集成工作台。
_避免使用 (Avoid)_: JSON Editor, JSON Formatter, JSON Tool, JSON Prettify

**Interactive Tree Explorer**:
在 JSON Studio 中支持节点按层级折叠展开、数据类型徽章区分、绝对 JSONPath 路径一键复制与节点值即时提取的交互式树形视图。
_避免使用 (Avoid)_: Tree View, JSON Tree, Object Hierarchy

**JSONPath Query Engine**:
在纯客户端基于标准 JSONPath 语法对内存中的 JSON 结构进行多层级检索、条件过滤与匹配项独立提取的查询引擎。
_避免使用 (Avoid)_: JSON Filter, Path Search, Query Runner

**JSON Smart Repair**:
纯客户端智能识别并修复非标 JSON（补全缺失引号、单双引号纠正、剥离多行与行内注释、清除尾随逗号及纠偏 Python 非标布尔/空字面量）的容错清洗算法。
_避免使用 (Avoid)_: JSON Fixer, Syntax Corrector, Error Cleaner

**Key Case Transformer**:
对深度嵌套 JSON 数据结构中的所有键名批量执行大小驼峰、下划线与中划线命名风格递归转换的算法服务。
_避免使用 (Avoid)_: Key Rename, Case Switcher, Field Formatter

**JSON Metric Inspector**:
对 JSON 结构进行深度解析，度量其最大嵌套深度、各类型节点分布、Key 数量与字节量级的高维统计透视器。
_避免使用 (Avoid)_: JSON Stats, Size Counter, Node Analyzer

### 证件照制作工坊 (ID Photo Maker)

**ID Photo Maker**:
Ateng-Tools 中用于纯客户端一站式规格裁切、合规构图、背景替换、冲印排版与目标体积约束压缩的独立证件照生成工具。
_避免使用 (Avoid)_: ID Photo Generator, Passport Tool, Photo Cutout, Portrait Maker

**Photo Spec Preset**:
包含官方标准毫米尺寸（如一寸 25×35mm、二寸 35×49mm、小二寸 35×45mm）、300 DPI 对应像素宽高矩阵与特定考试/证照用途分类的结构化规格模型。
_避免使用 (Avoid)_: Size Template, Photo Dimension, Spec Item

**Compliance Guideline Grid**:
在人像编辑视窗中用于辅助用户对齐头顶距、眼平线、下巴基线及半身轮廓的标准证件照几何参考辅助线体系。
_避免使用 (Avoid)_: Face Ruler, Alignment Mask, Crop Lines

**Tolerance Matting Engine**:
在纯客户端基于欧几里得色彩距离（Euclidean Color Distance）与容差阈值进行纯色或接近纯色背景分割，并提供边缘羽化（Edge Feathering）与手动擦除/保留修容画笔的轻量级算法。
_避免使用 (Avoid)_: Magic Wand, Background Eraser, Color Cutter

**Print Sheet Layout**:
将多张合规证件照按最佳几何间距与裁切标记虚线自动排列在 5寸 (89×127mm) 或 6寸 (102×152mm) 冲印相纸上的排版渲染管道。
_避免使用 (Avoid)_: Multi-photo Grid, Print Canvas, Tiling Sheet

**KB Target Compressor**:
针对报名网站对文件大小（如 20KB~50KB）的硬性指标，通过二分搜索（Binary Search）动态逼近最优质量因子并在纯客户端沙箱内导出符合字节阈值限制的图像压缩器。
_避免使用 (Avoid)_: Size Limiter, Image Shrinker, Quality Seeker

### 人民币大写金额转换器 (RMB Amount Converter)

**RMB Amount Converter**:
Ateng-Tools 中用于纯客户端将阿拉伯数字金额与中文金融大写金额进行合规双向转换的轻量级工具。
_避免使用 (Avoid)_: Money Words, Capital Number, Currency Translator

**Financial Uppercase Grammar**:
中国人民银行规定的会计与票据标准中文大写数码（零、壹、贰...）与币别单位（元、角、分、整）规范。
_避免使用 (Avoid)_: Chinese Number, Big Digits, Money Text

### 中国居民身份证透视器 (Chinese ID Card Inspector)

**Chinese ID Card Inspector**:
Ateng-Tools 中用于纯客户端验证 18 位中国居民身份证合法性、推演户籍归属与年龄生理特征、并提供安全脱敏掩码与测试样本的工具。
_避免使用 (Avoid)_: ID Card Validator, Citizen Checker, ID Tool

**Checksum Mod 11-2**:
ISO 7064:1983.MOD 11-2 校验码加权求和算法，用于判定 18 位居民身份证第 18 位校验位的数学合法性。
_避免使用 (Avoid)_: Mod Check, Last Digit Calc, ID Parity

### 规范化 Git 提交生成器 (Conventional Commits Generator)

**Conventional Commits Generator**:
Ateng-Tools 中用于纯客户端引导式组装符合 Conventional Commits 规范的结构化 Git 提交信息并提供一键终端命令复制的开发者工具。
_避免使用 (Avoid)_: Commit Helper, Git Message Builder, Commit Formatter

**Commit Structure Spec**:
由变更类型（Type）、影响范围（Scope）、重大破坏标记（Breaking Mark）、简短摘要（Subject）、详细正文（Body）及脚注关联（Footer）构成的标准提交模型。
_避免使用 (Avoid)_: Message DTO, Git Input, Commit Template

### CSS 视觉工坊 (CSS Visual Studio)

**CSS Visual Studio**:
Ateng-Tools 中用于纯客户端所见即所得调试多重阴影、毛玻璃拟态、异形圆角及流体排版并即时导出纯净 CSS 与 UnoCSS 类名的样式工作台。
_避免使用 (Avoid)_: CSS Maker, Style Generator, Shadow Builder

**Multi-layer Shadow Stacker**:
支持内外阴影混合、离散光源位移与透明度微调的可视化多层投影叠加引擎。
_避免使用 (Avoid)_: Shadow List, Box Shadow Model, Elevation Array

