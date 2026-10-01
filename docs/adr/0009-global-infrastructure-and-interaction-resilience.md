# 0009. 全局基础设施完备性与交互韧性架构设计 (Global Infrastructure & Interaction Resilience)

## 状态
已接受 (Accepted)

## 背景与上下文
在 Ateng-Tools 完成全局设计令牌统一（ADR-0008）后，我们对全站全局基础设施进行了全盘静态排查与推演，发现以下全局底层容器、路由交互、组件图标与异常拦截方面的缺失与技术债务：

1. **全局 Naive UI 容器提供者缺失**：
   `src/App.vue` 仅声明了 `<NMessageProvider>` 与 `<NNotificationProvider>`，遗漏了 `<NDialogProvider>` 与 `<NLoadingBarProvider>`。然而 `vite.config.ts` 已全局自动导入了 `useDialog` 与 `useLoadingBar`。在非组件环境或任意工具直接调用时，会触发运行时抛错 `No outer provider found`，存在严重隐患。
2. **全局路由加载反馈与滚动复位缺失**：
   `src/router.ts` 既未配置 `scrollBehavior`，也未配置路由守卫（`beforeEach` / `afterEach` / `onError`）与顶栏进度条的联动。用户在长页面工具与主页之间切页时，滚动条不会自动复位到顶部，且在加载大体积异步分包工具时无即时加载进度反馈。
3. **全局核心公共组件残留 MDI 伪类图标**：
   项目规范已严格要求全域图标统一使用 `@vicons/tabler` 原生矢量组件，但顶栏核心搜索 `src/modules/command-palette/command-palette.vue` 仍在使用 `<icon-mdi-search />`，其 Pinia Store 中直接引入了 5 个 `~icons/mdi/*` 图标；侧边栏 `src/components/CollapsibleToolMenu.vue` 仍在消费 `<icon-mdi-chevron-right />`。
4. **缺少全局未捕获异常防御拦截器**：
   `src/main.ts` 未配置 `app.config.errorHandler`。当个别小工具在处理畸变二进制或异常正则时发生未捕获运行时错误，容易导致 Vue 界面静默无响应或白屏，缺乏友好的语义化中文提示与重置恢复机制。
5. **PWA Manifest 与 Design Tokens 脱节**：
   `vite.config.ts` 中的 `VitePWA` 插件配置硬编码了主题色与底色，需要与 `src/styles/tokens.ts` 中的集中设计令牌建立同源契约。

## 架构决策

基于前沿推演与最佳实践，确立以下 5 项全局架构决策：

### 1. 全局容器完备性与 Context Bridge 挂载器
- 在 `src/App.vue` 中补齐 `<NDialogProvider>` 与 `<NLoadingBarProvider>` 嵌套包裹。
- 封装轻量级的全局桥接组件 `AppGlobalBridge.vue`（或通过 Vue setup 挂载），将 Naive UI 提供的 `useMessage()`、`useDialog()`、`useNotification()`、`useLoadingBar()` 受管实例暴露挂载至 `window`（如 `window.$message`、`window.$dialog`、`window.$loadingBar`、`window.$notification`）。
- 确保在 Vue 组件外部生命周期（例如路由守卫拦截器、Pinia Actions、全局异常捕获钩子）中均可安全、稳定调用全局加载进度条与消息弹窗。

### 2. 路由平滑导航反馈与智能滚动复位
- 在 `src/router.ts` 中配置标准 `scrollBehavior`：
  ```ts
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0, behavior: 'smooth' };
  }
  ```
- 在全局路由守卫中联动 `loadingBar`：
  - `router.beforeEach`: 触发 `window.$loadingBar?.start()`；
  - `router.afterEach`: 触发 `window.$loadingBar?.finish()`；
  - `router.onError`: 触发 `window.$loadingBar?.error()`。

### 3. 全局核心组件图标全量迁移至 `@vicons/tabler`
- 清理 `src/modules/command-palette/command-palette.vue` 与 `src/modules/command-palette/command-palette.store.ts` 中的所有 `~icons/mdi/*` 引用，统一替换为 `@vicons/tabler`：
  - 搜索图标：`IconSearch`
  - 随机工具：`IconDice5`
  - 明暗主题：`IconSun` / `IconMoon`
  - GitHub 仓库：`IconBrandGithub`
  - 提交反馈：`IconBug`
  - 关于项目：`IconInfoCircle`
- 清理 `src/components/CollapsibleToolMenu.vue` 中的 `<icon-mdi-chevron-right />`，替换为 `@vicons/tabler` 的 `IconChevronRight`。

### 4. 全局未捕获异常防御拦截器 (Defensive Error Interception)
- 在 `src/main.ts` 中挂载 `app.config.errorHandler`：
  ```ts
  app.config.errorHandler = (err, instance, info) => {
    console.error('[Global Error Guard]:', err, info);
    if (window.$message) {
      window.$message.error('工具运行发生异常，已为您隔离保护上下文', { keepAliveOnHover: true });
    }
    if (window.$loadingBar) {
      window.$loadingBar.error();
    }
  };
  ```
- 保持客户端离线隐私安全原则，严禁向外部第三方或未经授权的服务端上传任何错误堆栈与用户数据。

### 5. PWA Manifest 与设计令牌同源绑定
- 将 `vite.config.ts` 中的 PWA 主题色（`theme_color`）与背景色（`background_color`）与 `src/styles/tokens.ts` 中定义的规范色值（`#2563eb` 与 `#f8fafc`）保持一致。
- 完善中英文双语的应用描述与离线运行元数据。

## 影响与收益
1. **消除崩溃盲区**：全站任意模块调用 `useDialog()` 与 `useLoadingBar()` 均有安全提供者支撑，不再抛错。
2. **切页交互自然流畅**：SPA 路由切换具备顶部轻盈进度动效与自动顶置复位，彻底消除长页面切页停留在半山腰的视觉瑕疵。
3. **资产标准 100% 统一**：全域组件彻底淘汰遗留 MDI 伪类图标，全面统一为 `@vicons/tabler`，减少不必要的打包冗余。
4. **异常容错韧性跃升**：应用层具备统一的防御性异常拦截与中文友好提示，保护用户界面不因局部未受控异常直接白屏崩溃。
