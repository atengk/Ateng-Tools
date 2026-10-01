/**
 * 全站设计令牌单一真理源 (Design Tokens Single Source of Truth)
 * 集中管理品牌色、语义状态色、Slate 灰阶、三层表面、圆角与字体栈规范
 *
 * @author Ateng
 * @since 2026-10-01
 */

/**
 * 品牌核心识别色与交互状态
 */
export const brandTokens = {
  primary: '#2563eb', // Tailwind Blue-600
  primaryHover: '#3b82f6', // Tailwind Blue-500
  primaryPressed: '#1d4ed8', // Tailwind Blue-700
  primarySuppl: '#3b82f6',
  primaryFaded: 'rgba(37, 99, 235, 0.12)',
  primaryLightBg: 'rgba(37, 99, 235, 0.08)',
  focusRing: '0 0 0 2px rgba(37, 99, 235, 0.2)',
} as const;

/**
 * 状态语义色令牌
 */
export const statusTokens = {
  success: '#10b981', // Emerald-500
  successHover: '#34d399',
  successPressed: '#059669',
  successFaded: 'rgba(16, 185, 129, 0.12)',

  warning: '#f59e0b', // Amber-500
  warningHover: '#fbbf24',
  warningPressed: '#d97706',
  warningFaded: 'rgba(245, 158, 11, 0.12)',

  error: '#ef4444', // Red-500
  errorHover: '#f87171',
  errorPressed: '#dc2626',
  errorFaded: 'rgba(239, 68, 68, 0.12)',

  info: '#3b82f6', // Blue-500
  infoHover: '#60a5fa',
  infoPressed: '#2563eb',
  infoFaded: 'rgba(59, 130, 246, 0.12)',
} as const;

/**
 * Slate 现代化阶梯灰阶板
 */
export const slatePalette = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
} as const;

/**
 * 三层表面深度分级 (Surface Elevation Hierarchy)
 */
export const surfaceTokens = {
  light: {
    surface0: slatePalette[50], // 底板背景 #f8fafc
    surface1: '#ffffff', // 主卡片 / 导航栏 / 侧边栏
    surface2: slatePalette[100], // 输入框 / 次级区块 #f1f5f9
    surfacePopover: '#ffffff',
    border: slatePalette[200], // 通用边框 #e2e8f0
    borderSecondary: slatePalette[100],
    textBase: '#0f172a', // Slate-900
    textMuted: slatePalette[500], // Slate-500
    textDisabled: slatePalette[400],
  },
  dark: {
    surface0: slatePalette[900], // 底板背景 #0f172a
    surface1: slatePalette[800], // 主卡片 / 导航栏 / 侧边栏 #1e293b
    surface2: slatePalette[700], // 输入框 / 次级区块 #334155
    surfacePopover: slatePalette[800],
    border: slatePalette[700], // 通用边框 #334155
    borderSecondary: slatePalette[800],
    textBase: 'rgba(255, 255, 255, 0.92)',
    textMuted: slatePalette[400], // Slate-400
    textDisabled: slatePalette[600],
  },
} as const;

/**
 * 全局排版与字体栈规范 (Chinese Typography Stack)
 */
export const typographyTokens = {
  fontSans: `system-ui, -apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif`,
  fontMono: `'JetBrains Mono', 'Fira Code', ui-monospace, Menlo, Monaco, Consolas, 'PingFang SC', monospace`,
  lineHeightBase: 1.6,
  lineHeightHeading: 1.25,
} as const;

/**
 * 几何圆角尺度规范 (Component Geometry Rhythm)
 */
export const geometryTokens = {
  radiusControl: '8px', // Button, Input, Select, AutoComplete
  radiusContainer: '12px', // Card, Modal, Drawer, Hero
  radiusBadge: '6px',
  radiusPill: '9999px',
} as const;

/**
 * 微动效与过渡
 */
export const motionTokens = {
  transitionTheme: 'background-color 0.25s ease, border-color 0.25s ease',
  transitionFast: 'all 0.15s ease',
} as const;
