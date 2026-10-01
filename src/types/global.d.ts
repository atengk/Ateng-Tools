/**
 * 全局类型声明扩展
 * 注入 Naive UI 挂载至 window 的受管上下文实例接口
 *
 * @author Ateng
 * @since 2026-10-01
 */
import type { DialogApi, LoadingBarApi, MessageApi, NotificationApi } from 'naive-ui';

declare global {
  interface Window {
    $message?: MessageApi;
    $dialog?: DialogApi;
    $notification?: NotificationApi;
    $loadingBar?: LoadingBarApi;
  }
}

export {};
