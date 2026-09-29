<p align="center">
  <h1 align="center">🛠️ Ateng-Tools（阿腾工具箱）</h1>
  <p align="center">专为开发者打造的现代化在线工具箱 · 纯前端离线运行 · 优雅轻快</p>
  <p align="center">
    <a href="https://atengk.github.io/Ateng-Tools/">👉 在线体验 Ateng-Tools</a>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.x-42b883?style=flat-square&logo=vuedotjs" alt="Vue 3" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-4.x-646cff?style=flat-square&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/UI-Naive%20UI-18a058?style=flat-square" alt="Naive UI" />
  <img src="https://img.shields.io/badge/License-GNU%20GPLv3-blue.svg?style=flat-square" alt="License GPLv3" />
</p>

---

## 🌟 核心特性 (Features)

- 🔒 **100% 纯前端离线安全**：所有工具算法与数据转换均在浏览器客户端本地执行，不向任何第三方后端上传用户敏感数据与密钥。
- 🎨 **现代化科技蓝主题 (Tech Blue)**：采用科技极客蓝（`#2563eb`）作为主品牌色，亮色模式下搭配 Slate-50（`#f8fafc`）微冷灰底衬与纯白悬浮卡片，支持明暗主题一键平滑切换。
- 🇨🇳 **深度中文化与本地化**：默认全站简体中文，Naive UI 核心组件（日期选择、时间戳、分页器、下拉框）均实现组件级中文映射。
- 🧭 **首页高效聚合与分类导航**：
  - **精炼 Hero 状态栏**：展示收录总数、新增动态与离线安全运行指标。
  - **分类胶囊过滤器 (Tool Category Filter)**：提供“全部”、“开发运维”、“格式转换”、“加密安全”、“网络测量”等分类胶囊标签，实现毫秒级响应式卡片过滤。
  - **常用收藏区**：支持置顶常用工具卡片，支持自由拖拽重新排序与一键星标收藏。
  - **卡片微动效**：悬浮轻量上浮（`hover: -translate-y-1`）与科技蓝光晕反馈，卡片自带所属领域 Badge 与“新”角标。
- 📂 **左侧目录智能折叠**：左侧工具栏分类默认全部闭合折叠，界面清爽聚焦；访问具体工具路由时智能感知并自动展开定位所在分类。
- 📱 **响应式与 PWA 支持**：适配桌面端与移动端，内置 Service Worker 离线渐进式 Web 应用能力。

---

## 🚀 快速上手 (Quick Start)

### 环境依赖

- [Node.js](https://nodejs.org/) (>= 18.x)
- [pnpm](https://pnpm.io/) (>= 8.x 或 9.x)

### 常用命令

```sh
# 1. 克隆代码仓库
git clone https://github.com/atengk/Ateng-Tools.git
cd Ateng-Tools

# 2. 安装项目依赖
pnpm install

# 3. 启动本地开发服务器（默认端口 5173，自动热重载）
pnpm dev

# 4. 执行全量静态类型检查
pnpm typecheck

# 5. 运行单元测试（Vitest）
pnpm test:unit

# 6. 生产环境打包构建（产物输出至 dist/）
pnpm build
```

---

## 🛠️ 新建工具脚手架 (Tool Scaffolding)

本项目内置开箱即用的自动化脚手架，用于快速生成规范的单工具模板文件与国际化骨架：

```sh
pnpm run script:create:tool <tool-name>
```

该命令将在 `src/tools/<tool-name>` 目录下创建标准组件、Service 与国际化配置，并在 `src/tools/index.ts` 中自动完成工具注册。

---

## 📖 架构设计与规范 (Architecture)

- **单上下文领域模型**：详见根目录 [`CONTEXT.md`](./CONTEXT.md)
- **架构决策记录 (ADR)**：
  - [ADR 0001: 客户端自包含开发者工具架构](./docs/adr/0001-client-side-dev-tools-architecture.md)
  - [ADR 0002: WebSocket 与 SSE 客户端架构](./docs/adr/0002-websocket-and-sse-stream-client-architecture.md)
  - [ADR 0003: 首页视觉重构、品牌溯源与默认中文深度本地化](./docs/adr/0003-homepage-redesign-and-brand-attribution.md)

---

## 🤝 致谢与开源协议 (Attribution & License)

- 本项目基于优秀开源项目 [IT-Tools](https://github.com/CorentinTh/it-tools)（作者：[Corentin Thomasset](https://corentin.tech)）二次开发构建，特此向原作者与开源社区致谢！
- 本项目遵循 [GNU General Public License v3.0 (GPLv3)](LICENSE) 开源协议。
