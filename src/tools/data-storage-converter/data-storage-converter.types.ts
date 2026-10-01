/**
 * 数据存储与网络速率换算器类型契约定义
 *
 * @author Ateng
 * @since 2026-10-01
 */

/** 十进制与二进制数据存储单位类型 */
export type StorageUnit =
  | 'B'
  | 'KB'
  | 'MB'
  | 'GB'
  | 'TB'
  | 'PB'
  | 'KiB'
  | 'MiB'
  | 'GiB'
  | 'TiB'
  | 'PiB'
  | 'bit'
  | 'Kbit'
  | 'Mbit'
  | 'Gbit'
  | 'Tbit';

/** 网络传输带宽速率单位类型 */
export type BandwidthUnit =
  | 'bps'
  | 'Kbps'
  | 'Mbps'
  | 'Gbps'
  | 'Tbps'
  | 'B/s'
  | 'KB/s'
  | 'MB/s'
  | 'GB/s'
  | 'TB/s'
  | 'KiB/s'
  | 'MiB/s'
  | 'GiB/s';

/** 数据存储换算结果映射 */
export type StorageConversionResult = Record<StorageUnit, number>;

/** 网络带宽换算结果映射 */
export type BandwidthConversionResult = Record<BandwidthUnit, number>;

/** 数据传输耗时计算结果 */
export interface TransferTimeResult {
  /** 总耗时（秒） */
  totalSeconds: number
  /** 天数 */
  days: number
  /** 小时 */
  hours: number
  /** 分钟 */
  minutes: number
  /** 秒数 */
  seconds: number
  /** 毫秒数 */
  milliseconds: number
  /** 格式化人类易读文本（中文） */
  formattedZh: string
  /** 格式化人类易读文本（英文） */
  formattedEn: string
}
