# 0017. 第二批日常生活与全栈开发常用工具扩展架构决策 (Second Batch Tools Expansion)

## 状态
已接受 (Accepted)

## 背景与上下文
在第一批 4 款高频工具（`rmb-amount-converter`, `chinese-id-card-inspector`, `conventional-commits-generator`, `css-visual-studio`）成功落地后，按照整体规划与用户确认，启动第二批 4 款针对日常计算与前后端全栈开发高频场景的工具建设：
1. **跨体系物理量与度量衡换算**：日常办公、海外技术文档阅读及工程参数核算中，频繁遇到公制、英制（磅、英寸、加仑）与中国市制（斤、两、丈、市亩）的换算需求；
2. **矢量图组件化与前端资源净化**：UI 设计师交付的 SVG 往往带有大量矢量软件冗余元数据（Adobe/Inkscape 命名空间、冗余属性等），前端在 Vue 3 与 React 项目中迫切需要一键清洗并转为原生组件或 Data URI；
3. **API 鉴权与 JWT 离线签名与验签**：全栈开发在联调微服务或鉴权中间件时，使用在线 JWT 调试工具存在密钥外流和 Payload 隐私泄露重大风险，迫切需要纯客户端离线 HMAC 签名与防篡改验签工具；
4. **团队互动与随机决策辅助**：日常团队午餐选择、会议发言轮转、评审买单或抽签决策需要直观、公平且具有良好交互体验的随机大转盘。

为保证系统架构的一致性、离线安全与代码质量，本决策对第二批工具矩阵的分类、架构设计及实现边界进行统一定义。

## 架构决策

### 1. 工具矩阵与分类落位 (Taxonomy Alignment)
严格遵循 [ADR-0006](0006-canonical-tool-taxonomy-and-category-consolidation.md) 8 大标准分类拓扑：
- **`unit-converter` (万能物理单位换算器)**：落位于 **`calc`**（计算辅助）分类，提供 8 大物理维度的矩阵式响应换算；
- **`svg-to-component-converter` (SVG 优化与组件转换器)**：落位于 **`dev`**（开发运维）分类，提供纯客户端 DOMParser 清洗与多前端框架代码生成；
- **`jwt-signer` (JWT 签名与验签工坊)**：落位于 **`security`**（加密安全）分类，基于原生 Web Crypto API 实现纯离线 HMAC 签名、篡改校验与时间状态审计；
- **`decision-wheel` (随机决策转盘)**：落位于 **`calc`**（计算辅助）分类，集成 HTML5 Canvas 惯性物理旋转动画与多套开箱即用生活预设。

### 2. 纯客户端离线与原生 API 优先 (Zero-Leakage & Web Standard APIs)
严格坚守 [ADR-0001](0001-client-side-dev-tools-architecture.md) 离线安全红线：
- **Web Crypto API (HMAC-SHA256/384/512)**：JWT 签名与验证完全使用浏览器原生 `window.crypto.subtle`，零外部依赖，密钥与敏感 Token 绝对不离浏览器内存；
- **DOMParser 客户端安全净化**：SVG 解析使用标准 `DOMParser`，在内存虚拟 DOM 中剔除 `<script>` 脚本标签与非标命名空间，防御 XSS 并生成干净的代码结构；
- **HTML5 Canvas 惯性动画**：转盘动画采用 `requestAnimationFrame` 结合三次贝塞尔非线性缓动减速模型，轻量流畅，不依赖庞大动画引擎。

### 3. 功能特性与边界规范 (Feature Specifications)

#### 3.1 万能物理单位换算器 (`unit-converter`)
- **8 大物理维度**：涵盖长度（Length）、面积（Area）、质量（Mass）、体积（Volume）、速度（Velocity）、压力（Pressure）、功率（Power）、能量（Energy）；
- **全系度量衡覆盖**：同维度内无缝联动公制（Metric，SI）、英美制（Imperial/US）及中国传统市制（Chinese Municipal）；
- **响应式矩阵换算**：在任意单位输入数值，其余所有同维度单位即时联动更新；支持精度位数调节（2~10 位小数）与快速一键复制。

#### 3.2 SVG 优化与组件转换器 (`svg-to-component-converter`)
- **智能元数据清洗**：移除 XML 声明、DOCTYPE、注释、编辑器私有命名空间（`xmlns:inkscape`, `xmlns:sodipodi` 等）；
- **前端实用转换**：
  - Vue 3 `<script setup lang="ts">` 组件（支持外部传入 `size`, `color`, `class` props）；
  - React JSX / TSX 函数组件（驼峰化属性，如 `stroke-width` -> `strokeWidth`）；
  - 纯净内联 SVG（保留/重写 `viewBox`，可选替换颜色为 `currentColor`）；
  - Base64 Data URI（用于 CSS `background-image` 或 `<img>` 标签）；
- **实时可视化对比**：提供清洗前后大小对比与即时渲染画布。

#### 3.3 JWT 签名与验签工坊 (`jwt-signer`)
- **多算法支持**：覆盖对称密钥 HMAC-SHA256 (HS256)、HMAC-SHA384 (HS384)、HMAC-SHA512 (HS512)；
- **双向签名与验签工作流**：
  - **离线签名模式**：可编辑 Header 与 Payload（提供默认常用字段与格式化），输入密钥，即时生成并拼装三段式 Base64URL JWT；
  - **离线验签与解析模式**：解析任意 JWT 的 Header 与 Payload，输入密钥自动校验签名匹配度；
- **时间合规透视**：解析 `exp`（过期时间）、`nbf`（生效时间）、`iat`（签发时间），以人类可读格式展示并提供当前有效性诊断卡片。

#### 3.4 随机决策转盘 (`decision-wheel`)
- **物理惯性旋转模型**：动态初始角速度与平滑减速停止，指针精准落入扇区判定；
- **生活与办公多重预设**：开箱即用预设模板（“今天吃什么”、“谁来买单”、“开会谁先发言”、“真大冒险”、“数字抽签”等）；
- **自定义选项与权重配置**：支持添加/删除选项、自定义文本、配色与占比权重；
- **抽中历史与结果播报**：展示最近抽中历史，支持重新抽取与公平概率分布图。

### 4. 标准工程五件套与国际化准则 (Standard 5-Layer Blueprint & i18n)
所有 4 款小工具均遵循项目五件套标准：
1. `index.ts`（使用 `@vicons/tabler` 原生图标）；
2. `<name>.types.ts`（严格强类型定义）；
3. `<name>.service.ts`（无状态可测试纯函数）；
4. `<name>.service.test.ts`（Vitest 100% 单元测试覆盖）；
5. `<name>.vue`（Naive UI 视图展示，居中操作按钮，`useCopy({ createToast: false })` + 单一 Toast）；
6. 仅维护 `locales/zh.yml` 与 `locales/en.yml` 的完整交互词条闭环。

## 后果与影响

- **正面影响**：
  - 进一步完善了 Ateng-Tools 在度量衡换算、SVG 资源转译、接口安全测试及生活趣味决策上的功能完备性；
  - 彻底规避了开发者将内部 JWT 密钥或私密 token 上传到外部在线解析网站的安全隐患；
  - 遵循纯原生与 Web 标准 API，保持零外部重型依赖。
- **代价与权衡**：
  - JWT 目前仅支持对称加密 HMAC（HS256/384/512），非对称加密（RS256/ES256）依赖复杂证书链解析与私钥格式解析（PKCS8/SPKI），可在未来独立作为“公私钥与证书签名工坊”渐进扩展。
