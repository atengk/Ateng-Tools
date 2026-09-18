/**
 * 雪花 ID 分析器相关数据模型定义
 * @author Ateng
 */

/**
 * 机器位分配模式
 * standard: 5位数据中心ID + 5位机器工作ID (Twitter 原生规范)
 * workerOnly: 10位机器工作ID (百度 UidGenerator / 简化实现常用)
 */
export type SnowflakeBitMode = 'standard' | 'workerOnly';

/**
 * 常用雪花 ID 预设纪元 (Epoch)
 */
export interface SnowflakeEpochPreset {
  label: string;
  epoch: number;
  description: string;
}

/**
 * 默认预设纪元列表
 */
export const SNOWFLAKE_EPOCH_PRESETS: SnowflakeEpochPreset[] = [
  {
    label: 'Twitter 原生纪元 (2010-11-04)',
    epoch: 1288834974657,
    description: 'Twitter Snowflake 官方算法起始时间戳',
  },
  {
    label: '美团 Leaf 纪元 (2017-01-01)',
    epoch: 1483200000000,
    description: '美团分布式 ID 生成服务基准时间',
  },
  {
    label: '自定义纪元 (Custom Epoch)',
    epoch: 0,
    description: '用户自定义系统上线时间戳 (毫秒)',
  },
];

/**
 * 解析选项
 */
export interface SnowflakeParseOptions {
  /** 纪元基准毫秒时间戳，默认为 Twitter 纪元 1288834974657L */
  epoch: number;
  /** 位分配模式 */
  mode: SnowflakeBitMode;
}

/**
 * 单条雪花 ID 解析结果
 */
export interface ParsedSnowflakeId {
  /** 原始 ID 字符串 */
  rawId: string;
  /** 64 位完整二进制字符串 (补齐前导 0) */
  binary: string;
  /** 符号位 (1位，正常应为 '0') */
  signBit: string;
  /** 时间戳二进制位 (41位) */
  timestampBits: string;
  /** 数据中心 ID 二进制位 (5位，若 workerOnly 模式则为空) */
  datacenterBits: string;
  /** 机器工作节点二进制位 (5位 或 10位) */
  workerBits: string;
  /** 递增序列号二进制位 (12位) */
  sequenceBits: string;
  /** 相对纪元经过的毫秒数 */
  relativeTimestamp: number;
  /** 纪元时间戳 (毫秒) */
  epoch: number;
  /** 还原出的绝对时间戳 (毫秒) */
  absoluteTimestamp: number;
  /** 格式化日期时间 (yyyy-MM-dd HH:mm:ss.SSS) */
  formattedDateTime: string;
  /** 数据中心 ID (0~31，在 workerOnly 模式下为 null) */
  datacenterId: number | null;
  /** 机器工作节点 ID (0~31 或 0~1023) */
  workerId: number;
  /** 序列号 (0~4095) */
  sequence: number;
}

/**
 * 批量解析结果单行数据
 */
export interface BatchSnowflakeRow {
  key: string;
  rawId: string;
  formattedDateTime: string;
  datacenterId: string;
  workerId: number;
  sequence: number;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * ID 生成参数
 */
export interface SnowflakeGenerateParams {
  /** 指定绝对时间戳 (毫秒，默认为当前时间) */
  absoluteTimestamp?: number;
  /** 数据中心 ID (0~31) */
  datacenterId?: number;
  /** 机器工作节点 ID */
  workerId: number;
  /** 序列号 (0~4095) */
  sequence: number;
}
