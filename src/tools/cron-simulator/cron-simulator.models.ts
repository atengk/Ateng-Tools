/**
 * Cron 表达式解析与未来执行时间模拟器数据模型
 *
 * @author Ateng
 * @since 2026-09-29
 */

export type CronDialect = 'linux' | 'spring' | 'quartz';

export interface CronFieldInfo {
  /**
   * 字段名称（如 秒、分、时、日、月、周、年）
   */
  name: string
  /**
   * 英文标识符
   */
  key: string
  /**
   * 表达式中对应的分段值
   */
  value: string
  /**
   * 允许的合法取值范围
   */
  allowedRange: string
}

export interface CronExecutionItem {
  /**
   * 执行序列索引 (1, 2, 3...)
   */
  index: number
  /**
   * 匹配出的确切执行时刻
   */
  date: Date
  /**
   * 格式化时间字符串 (YYYY-MM-DD HH:mm:ss)
   */
  formatted: string
  /**
   * 星期几描述 (如 星期三)
   */
  dayOfWeek: string
  /**
   * 相对时间描述 (如 2 小时后、5 分钟后)
   */
  relativeTime: string
}

export interface CronPreset {
  /**
   * 预设名称
   */
  label: string
  /**
   * Cron 表达式
   */
  expression: string
  /**
   * 预设说明
   */
  description: string
  /**
   * 对应方言
   */
  dialect: CronDialect
}

export interface CronSimulateOptions {
  /**
   * 推演生成未来执行次数（默认 10 次）
   */
  executionCount: number
  /**
   * 基准时间（默认为当前客户端时间）
   */
  baseTime?: Date
  /**
   * 时区偏好（如 'local' 或时区偏移分钟数）
   */
  timeZone?: string
}

export interface CronSimulateResult {
  /**
   * 表达式是否合法有效
   */
  valid: boolean
  /**
   * 校验失败时的错误信息
   */
  error?: string
  /**
   * 自动探测出的方言体系
   */
  dialect: CronDialect
  /**
   * 表达式分段段数 (5 / 6 / 7)
   */
  fieldCount: number
  /**
   * 中文自然语言语义直译
   */
  explanationZh: string
  /**
   * 英文自然语言直译
   */
  explanationEn: string
  /**
   * 分段字段解析详情列表
   */
  fields: CronFieldInfo[]
  /**
   * 推演出的未来执行时间序列
   */
  nextExecutions: CronExecutionItem[]
}

export const DEFAULT_CRON_SIMULATE_OPTIONS: CronSimulateOptions = {
  executionCount: 10,
};

export const COMMON_CRON_PRESETS: CronPreset[] = [
  {
    label: '每分钟执行一次',
    expression: '0 * * * * ?',
    description: '每分钟的第 0 秒触发',
    dialect: 'spring',
  },
  {
    label: '每 5 分钟执行一次',
    expression: '0 */5 * * * ?',
    description: '从第 0 分钟开始，每隔 5 分钟触发一次',
    dialect: 'spring',
  },
  {
    label: '每小时整点执行',
    expression: '0 0 * * * ?',
    description: '每个小时的 00 分 00 秒触发',
    dialect: 'spring',
  },
  {
    label: '每天凌晨 00:00 执行',
    expression: '0 0 0 * * ?',
    description: '每天午夜 00:00:00 准时触发',
    dialect: 'spring',
  },
  {
    label: '每个工作日早 09:00',
    expression: '0 0 9 ? * MON-FRI',
    description: '周一至周五每天上午 09:00:00 触发',
    dialect: 'spring',
  },
  {
    label: '每周一凌晨 01:00',
    expression: '0 0 1 ? * MON',
    description: '每周一凌晨 01:00:00 触发',
    dialect: 'spring',
  },
  {
    label: '每月最后一天中午 12:00',
    expression: '0 0 12 L * ?',
    description: '当月最后一天的 12:00:00 触发',
    dialect: 'spring',
  },
  {
    label: 'Linux 每 15 分钟',
    expression: '*/15 * * * *',
    description: 'Linux crontab 标准 5 位表达式',
    dialect: 'linux',
  },
  {
    label: 'Linux 每天凌晨 02:30',
    expression: '30 2 * * *',
    description: 'Linux crontab 每天 02:30 触发',
    dialect: 'linux',
  },
];
