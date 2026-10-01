# 0008. 全局设计令牌统一与中文排版视觉规范架构设计 (Global Design Tokens & Typography Unification)

## 状态
已接受 (Accepted)

## 背景与上下文
Ateng-Tools 作为面向现代开发者的客户端离线轻量级工具箱，承载了包含代码编辑器、SQL 还原器、Diff 对比、图形处理、PDF 工作台与多源数据转换在内的 100+ 款高频工具。

在近期的系统审查与架构推演中，发现全站视觉与排版体系存在以下历史遗留割裂与规范缺失：
1. **主色令牌多头割裂**：
   Naive UI 全局主题已升级至科技蓝（Tailwind Blue `#2563eb`），但 `unocss.config.ts`、`src/ui/theme/themes.ts` 及存量组件 `c-input-text`、`c-select` 仍残留 IT-Tools 祖传绿色（`#18a058` / `#1ea54c`），导致不同工具在按钮焦点、输入高亮与选择态上出现“蓝绿交织”的视觉精神分裂。
2. **暗色背景表面脱节**：
   Naive UI 采用深邃的 Slate 体系（背景 `#0f172a`、卡片 `#1e293b`、边框 `#334155`），而 UnoCSS 快捷类却使用冷黑灰（`#1c1c1c`、`#232323`），缺乏统一的表面海拔深度（Surface Elevation）定义。
3. **中文排版与代码字体栈缺失**：
   全站未在顶层显式声明现代高质量中文字体栈，依赖浏览器底层粗糙的黑体回退；部分工具标题存在负字间距（`letter-spacing < 0`），违背中文方块字呼吸感标准；且各代码与日志展示区缺乏统一等宽字体规范。
4. **组件几何与交互非标**：
   卡片、按钮、输入框、下拉框在不同组件库与模板中圆角混用（4px、6px、8px、12px 参差不齐），且在亮暗主题切换时缺乏平滑过渡动效，产生闪屏刺眼感。

## 架构决策

经过深度设计推演与多轮前沿对齐，确立以下全站样式优化架构决策：

### 1. 建立设计令牌单一真理源 (Design Tokens Single Source of Truth)
- 在 `src/styles/tokens.ts` 中集中声明设计令牌常量，涵盖品牌色、Slate 灰阶、三层表面、边框、阴影、圆角与字体栈：
  - **Primary**: 主色 `#2563eb`，Hover `#3b82f6`，Pressed `#1d4ed8`，Faded `rgba(37, 99, 235, 0.12)`。
  - **Success/Warning/Error**: 分别标准化为 `#10b981` (Emerald)、`#f59e0b` (Amber)、`#ef4444` (Rose)。
- 彻底清理全站所有硬编码绿色（`#18a058`、`#1ea54c`），实现全站单一品牌色。
- `unocss.config.ts`、Naive UI `src/themes.ts` 以及全局 CSS 变量统一从 `tokens.ts` 导入消费，彻底杜绝多配置源漂移。

### 2. 规范 Slate 三层表面深度体系 (Surface Elevation Hierarchy)
统一界面在亮暗模式下的三层结构表面与边框分级：
- **Surface 0 (底板背景)**：Light `#f8fafc` (slate-50) / Dark `#0f172a` (slate-900)
- **Surface 1 (卡片/顶栏/侧边栏)**：Light `#ffffff` / Dark `#1e293b` (slate-800)
- **Surface 2 (输入框/弹出层/次级区块)**：Light `#f1f5f9` (slate-100) / Dark `#334155` (slate-700)
- **Border (通用边框线)**：Light `#e2e8f0` (slate-200) / Dark `#334155` (slate-700)
重构 `unocss.config.ts` 中的 `bg-surface`、`bg-background` 与边框快捷类，与 Naive UI 完全闭环一致。

### 3. 全局注入现代中文字体栈与代码等宽字体标准 (Chinese Typography Stack)
在 `src/App.vue`、`index.html` 与 Naive UI `common` 配置中统一注入规范字体栈：
- **正文字体栈 (Sans-Serif)**：
  `system-ui, -apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif`
- **等宽代码字体栈 (Monospace)**：
  `'JetBrains Mono', 'Fira Code', ui-monospace, Menlo, Monaco, Consolas, 'PingFang SC', monospace`
- **中文排版红线**：
  - 正文充裕行高 `1.6`；
  - 彻底清除所有中文字符串上的负字间距（`letter-spacing: normal` 或微正间距），坚守汉字笔画舒展呼吸感底线；
  - 加粗层级统一采用标准 `600`/`700`，全站启用抗锯齿平滑渲染（`-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`）。

### 4. 确立 8px 控件 / 12px 容器的标准微圆角与投影规范 (Component Geometry Rhythm)
- **容器级组件 (Card, Modal, Drawer, Hero)**：统一为 `12px` 圆角，辅以柔和微投影。
- **控件级组件 (Button, Input, Select, Tag)**：统一为 `8px` 圆角，标准控件基准高度设为 34px/36px。
- **徽标与状态药丸 (Badge, Pill)**：统一为 `6px` 或全胶囊 `9999px`。
- **聚焦外环 (Focus Ring)**：统一采用 `0 0 0 2px rgba(37, 99, 235, 0.2)`，杜绝生硬的高对比边框震颤。

### 5. 全局平滑过渡微动效与定制 Slate 细滚动条
- 在全局容器、卡片与边框上注入轻量级颜色过渡：`transition: background-color 0.25s ease, border-color 0.25s ease`，消除亮暗切换闪烁感。
- 在全局配置轻量优化的 6px~8px 细滚动条，轨道透明，滑块采用自适应 Slate 灰阶（亮色 `#cbd5e1`，暗色 `#475569`，hover `#64748b`），带有微圆角，维持工作区紧凑整洁。

### 6. 存量自定义组件 `src/ui/c-*` 无侵入式主题桥接
- 保持 `src/ui/c-button`、`c-input-text`、`c-select`、`c-card`、`c-modal`、`c-alert` 外部调用 API 与 Props 100% 不变。
- 重构其底层主题适配层（`src/ui/theme/themes.ts` 与 `*.theme.ts`），直接引用全局科技蓝与 Slate 设计令牌。
- 存量 100+ 小工具无需改动业务逻辑与模板即可立即享有一致的现代视觉质感。

## 后果与影响

- **正面影响**：
  - **视觉体验高度统一**：彻底消除绿色与蓝色的历史混杂现象，建立专业、克制、现代的科技视觉识别体系；
  - **深色模式质感飞跃**：Slate 蓝灰阶梯取代冷黑灰，卡片与底板层级分明，大幅改善暗光下长时间使用的阅读疲劳；
  - **中文排版清晰舒展**：原生优质中文字体栈结合 1.6 行高与零负字距红线，彻底消灭笔画粘连与锯齿边缘；
  - **零业务破坏性**：通过集中令牌与主题桥接，在不破坏任何工具模板的前提下实现全站像素级无缝演进；
  - **维护成本骤降**：令牌集中管理，后续样式调整仅需维护单一真理源。
- **代价与权衡**：
  - 需要在构建期和启动期对少量存量工具的特殊样式做视觉回归校验（如 Favicon 生成器、Color 颜色转换器中若含有演示用的绿色色块需予以明确区分，不被主题替换误伤）。
