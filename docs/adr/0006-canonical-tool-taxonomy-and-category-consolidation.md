# 0006. 全站工具规范化八大分类体系与微分类整合设计 (Canonical Tool Taxonomy)

## 状态
已接受 (Accepted)

## 背景与上下文
Ateng-Tools 包含 100+ 个离线开发工具，此前的分类结构直接继承自 IT-Tools 原生 11 个分类，存在明显的架构缺陷：
1. **分类容量两极分化**：`Development`（24 个）与 `Converter`（20 个）占据了全站近半数工具，用户在单分类下难以快速定位；而 `Data`（2 个）、`Math`（3 个）、`Measurement`（3 个）过于单薄，在侧边栏折叠手风琴与首页过滤栏中呈现孤岛效应。
2. **跨分类交叉与认知割裂**：
   - 文本与数据 Diff 对比工具被割裂：`textDiff` 位于 `Text`，而 `jsonDiff` 位于 `Web`；
   - 结构化与配置转换被割裂：`configConverter` 与 `tableConverter` 位于 `Development`，而其他 XML/JSON/YAML/TOML 转换位于 `Converter`；
   - 安全认证凭证被割裂：`jwtParser`、`otpCodeGeneratorAndValidator` 与 `basicAuthGenerator` 混入 `Web`；
   - 字符串编辑工具错位：`htmlWysiwygEditor` 与 `slugifyString` 散落在 `Web`。
3. **分类键命名与本地化不规范**：分类内部标识直接使用含空格或首字母大写的原始英文字符串（如 `'Images and videos'`、`'Converter'`），多语言映射存在硬编码及残留未翻译项（如 `Web` 分类未深度汉化）。

## 架构决策
经过与用户多轮问辩（Grilling Session），达成全量共识并确立以下决策：

### 1. 八大核心领域规范分类拓扑 (Canonical 8-Category Taxonomy)
将原 11 个分类精简并升维为 8 个认知明确、体量均衡（每类约 5~24 个）的核心领域大类：

| 分类 Key (`ToolCategoryKey`) | 中文展示标题 | 英文展示标题 | 默认 Emoji | 工具总数 | 核心定位与代表工具 |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `dev` | **开发运维** | Development | 💻 | 21 | 面向工程开发、容器、环境调度与代码级分析（SQL 日志还原、Cron 模拟器、DDL 转实体、JSON 转实体、Docker 转换、雪花 ID、WebSocket/SSE 调试、Benchmark 代码构建等） |
| `converter` | **格式转换** | Converter | 🔄 | 24 | 全矩阵数据格式、配置、编码与标准数据规范化互转（Spring 配置互转、表格 SQL 互转、JSON/YAML/TOML/XML 互转、Base64、Markdown 转 HTML、电话格式化、IBAN 校验等） |
| `security` | **加密安全** | Security | 🔐 | 13 | 密钥生成、密码学计算、身份凭证与安全审计（Token/UUID/ULID、哈希摘要、Bcrypt、RSA 密钥对、AES 加解密、密码强度评估、JWT 解析、2FA OTP 验证、Basic Auth） |
| `network` | **网络与 Web** | Network & Web | 🌐 | 13 | 网络协议分析、网络编解码与设备网络配置（URL 编解码/解析、UserAgent 解析、HTTP 状态码、MIME 类型、IPv4/IPv6 子网计算、MAC 地址生成/查询等） |
| `text` | **文本与内容** | Text & Content | 📝 | 10 | 文本创作、排版、内容差异对比与字符级处理（文本 Diff、JSON Diff、富文本编辑器、文本统计、占位符生成、Emoji、字符串混淆、ASCII 艺术字、Slug 转换） |
| `pdf` | **PDF 工具** | PDF Tools | 📄 | 6 | 纯客户端独立垂直 PDF 工作台与处理流水线（PDF 签名校验、文本提取、PDF 加解密、图片转 PDF、PDF 转图片、PDF Studio） |
| `media` | **图形与多媒体** | Media & Graphic | 🖼️ | 5 | 纯客户端图像图形编辑与视效处理（Image Studio、二维码生成、WiFi 二维码、SVG 占位图、相机录制） |
| `calc` | **计算与度量** | Math & Measurement | 📐 | 5 | 算术求值、生活日常换算与时间度量（数学表达式求值、ETA 预估、百分比计算、计时器、温度换算） |

### 2. 碎片化微分类彻底消融与吸收原则
- **`Data` 分类废除**：将 `phoneParserAndFormatter` 与 `ibanValidatorAndParser` 吸收归入 `converter`。
- **`Math` 与 `Measurement` 分类合并**：合并为统一的 `calc`（计算与度量），将原 `temperatureConverter`、`mathEvaluator`、`percentageCalculator`、`etaCalculator` 与 `chronometer` 统一汇聚；原 `benchmarkBuilder` 因属于代码级性能测试工具，迁入 `dev`。

### 3. 跨分类工具落位归正原则（功能底层本质优先）
- **差异比对统一**：`textDiff` 与 `jsonDiff` 全部归入 `text`。
- **配置与数据转换统一**：`configConverter`、`tableConverter` 与 `jsonToCsv` 全部由 `dev` 移入 `converter`。
- **凭证与鉴权统一**：`jwtParser`、`otpCodeGeneratorAndValidator` 与 `basicAuthGenerator` 由 `web` 移入 `security`。
- **文本排版与别名统一**：`htmlWysiwygEditor` 与 `slugifyString` 由 `web` 移入 `text`。

### 4. 规范小写枚举 Key 与 i18n 多语言体系
- 底层 TypeScript 类型导出严格的枚举联合类型：
  `export type ToolCategoryKey = 'dev' | 'converter' | 'security' | 'network' | 'text' | 'pdf' | 'media' | 'calc';`
- 在 `locales/zh.yml` 与 `locales/en.yml` 的 `tools.categories.<key>` 命名空间下全面建立规范双语映射，侧栏 Emoji 映射表基于小写 Key 进行映射。

## 后果与影响
- **正面影响**：
  - 彻底均衡各分类工具承载量，消除 2 个工具的单薄分类与 24 个工具的重度臃肿分类；
  - 建立一致直观的心智模型，同类型工具（如所有的 Diff、所有的格式转换、所有的凭证安全工具）零散落；
  - 分类 Key 遵循规范标识符命名，提升代码类型安全度与扩展性。
- **代价与权衡**：
  - 需同步调整 `src/tools/index.ts`、`src/tools/tools.types.ts`、`src/tools/tools.store.ts`、`src/composable/category.ts`、相关测试用例及双语语言包文件。
