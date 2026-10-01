/**
 * 数据存储与网络速率换算核心纯函数服务
 *
 * @author Ateng
 * @since 2026-10-01
 */
import type {
  BandwidthConversionResult,
  BandwidthUnit,
  StorageConversionResult,
  StorageUnit,
  TransferTimeResult,
} from './data-storage-converter.types';

/** 数据存储各单位相较于字节 (Byte) 的换算系数表 */
export const STORAGE_FACTORS: Record<StorageUnit, number> = {
  bit: 1 / 8,
  B: 1,
  KB: 1e3,
  MB: 1e6,
  GB: 1e9,
  TB: 1e12,
  PB: 1e15,
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4,
  PiB: 1024 ** 5,
  Kbit: 1e3 / 8,
  Mbit: 1e6 / 8,
  Gbit: 1e9 / 8,
  Tbit: 1e12 / 8,
};

/** 网络带宽各单位相较于字节每秒 (B/s) 的换算系数表 */
export const BANDWIDTH_FACTORS: Record<BandwidthUnit, number> = {
  'bps': 1 / 8,
  'Kbps': 1e3 / 8,
  'Mbps': 1e6 / 8,
  'Gbps': 1e9 / 8,
  'Tbps': 1e12 / 8,
  'B/s': 1,
  'KB/s': 1e3,
  'MB/s': 1e6,
  'GB/s': 1e9,
  'TB/s': 1e12,
  'KiB/s': 1024,
  'MiB/s': 1024 ** 2,
  'GiB/s': 1024 ** 3,
};

/**
 * 将输入的数据存储大小换算为全部支持的单位
 *
 * @param value 输入的数值大小
 * @param fromUnit 输入的源单位
 * @returns 包含所有单位对应数值的换算结果字典
 */
export function convertStorage(value: number, fromUnit: StorageUnit): StorageConversionResult {
  if (!Number.isFinite(value) || value < 0) {
    const emptyResult = {} as StorageConversionResult;
    for (const key of Object.keys(STORAGE_FACTORS) as StorageUnit[]) {
      emptyResult[key] = 0;
    }
    return emptyResult;
  }

  // 1. 统一步骤：将源单位换算为基准字节数 (Bytes)
  const baseBytes = value * STORAGE_FACTORS[fromUnit];

  // 2. 映射步骤：由基准字节数推算其余所有单位对应的数值
  const result = {} as StorageConversionResult;
  for (const [unit, factor] of Object.entries(STORAGE_FACTORS) as [StorageUnit, number][]) {
    result[unit] = baseBytes / factor;
  }

  return result;
}

/**
 * 将输入的网络速率换算为全部支持的带宽单位
 *
 * @param value 输入的速率大小
 * @param fromUnit 输入的源速率单位
 * @returns 包含所有带宽速率对应数值的换算结果字典
 */
export function convertBandwidth(value: number, fromUnit: BandwidthUnit): BandwidthConversionResult {
  if (!Number.isFinite(value) || value < 0) {
    const emptyResult = {} as BandwidthConversionResult;
    for (const key of Object.keys(BANDWIDTH_FACTORS) as BandwidthUnit[]) {
      emptyResult[key] = 0;
    }
    return emptyResult;
  }

  // 1. 统一步骤：将源带宽换算为基准速率字节每秒 (B/s)
  const baseBytesPerSec = value * BANDWIDTH_FACTORS[fromUnit];

  // 2. 映射步骤：由基准速率推算其余所有单位数值
  const result = {} as BandwidthConversionResult;
  for (const [unit, factor] of Object.entries(BANDWIDTH_FACTORS) as [BandwidthUnit, number][]) {
    result[unit] = baseBytesPerSec / factor;
  }

  return result;
}

/**
 * 根据指定的文件大小与传输速率测算理论耗时
 *
 * @param size 文件大小数值
 * @param sizeUnit 文件大小单位
 * @param speed 传输速率数值
 * @param speedUnit 传输速率单位
 * @returns 结构化的耗时结果与人类易读字符串
 */
export function calculateTransferTime(
  size: number,
  sizeUnit: StorageUnit,
  speed: number,
  speedUnit: BandwidthUnit,
): TransferTimeResult {
  if (!Number.isFinite(size) || size <= 0 || !Number.isFinite(speed) || speed <= 0) {
    return {
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
      formattedZh: '0 秒',
      formattedEn: '0 seconds',
    };
  }

  // 1. 规整输入为基准单位：总字节数 (Bytes) 与每秒字节数 (B/s)
  const totalBytes = size * STORAGE_FACTORS[sizeUnit];
  const bytesPerSec = speed * BANDWIDTH_FACTORS[speedUnit];

  // 2. 计算浮点总秒数并拆解为天、时、分、秒、毫秒
  const totalSeconds = totalBytes / bytesPerSec;

  const totalMs = Math.round(totalSeconds * 1000);
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const remAfterDays = totalMs % (1000 * 60 * 60 * 24);
  const hours = Math.floor(remAfterDays / (1000 * 60 * 60));
  const remAfterHours = remAfterDays % (1000 * 60 * 60);
  const minutes = Math.floor(remAfterHours / (1000 * 60));
  const remAfterMinutes = remAfterHours % (1000 * 60);
  const seconds = Math.floor(remAfterMinutes / 1000);
  const milliseconds = remAfterMinutes % 1000;

  // 3. 构建中英双语格式化表达
  const zhParts: string[] = [];
  const enParts: string[] = [];

  if (days > 0) {
    zhParts.push(`${days} 天`);
    enParts.push(`${days} day${days > 1 ? 's' : ''}`);
  }
  if (hours > 0) {
    zhParts.push(`${hours} 小时`);
    enParts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  }
  if (minutes > 0) {
    zhParts.push(`${minutes} 分`);
    enParts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
  }
  if (seconds > 0 || (days === 0 && hours === 0 && minutes === 0)) {
    const secWithMs = milliseconds > 0 && days === 0 && hours === 0 && minutes === 0
      ? `${(seconds + milliseconds / 1000).toFixed(2)}`
      : `${seconds}`;
    zhParts.push(`${secWithMs} 秒`);
    enParts.push(`${secWithMs} sec${Number(secWithMs) > 1 ? 's' : ''}`);
  }

  return {
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    formattedZh: zhParts.join(' '),
    formattedEn: enParts.join(' '),
  };
}

/**
 * 格式化数值展示，去除无意义冗余尾随零并限制小数位
 *
 * @param val 原始浮点数值
 * @param maxDecimals 最大保留小数位数，默认为 4
 * @returns 规整字符串
 */
export function formatUnitNumber(val: number, maxDecimals = 4): string {
  if (!Number.isFinite(val)) {
    return '0';
  }
  if (val === 0) {
    return '0';
  }

  // 针对极小数值使用科学计数法或高精度
  if (Math.abs(val) < 0.0001 && val > 0) {
    return val.toExponential(3);
  }

  const rounded = Number(val.toFixed(maxDecimals));
  return String(rounded);
}
