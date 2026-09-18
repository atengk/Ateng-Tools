import { format } from 'date-fns';
import type {
  BatchSnowflakeRow,
  ParsedSnowflakeId,
  SnowflakeGenerateParams,
  SnowflakeParseOptions,
} from './snowflake-id-analyzer.models';

/**
 * 解析单个 64 位雪花 ID
 * @param idStr 雪花 ID 数字字符串
 * @param options 解析选项（纪元、位模式）
 * @returns 解析结果对象
 */
export function parseSnowflakeId(
  idStr: string,
  options: SnowflakeParseOptions,
): ParsedSnowflakeId {
  // 1. 基础入参格式校验，防止非数字或负数造成解析异常
  const trimmed = idStr.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error('无效的雪花 ID：必须为纯非负数字字符串');
  }

  // 2. 转换为 BigInt 避免 JS 64 位浮点数精度丢失
  const id = BigInt(trimmed);
  const max64Bit = (1n << 63n) - 1n;
  if (id > max64Bit) {
    throw new Error('雪花 ID 溢出：数值超出了 63 位正整数允许的最大范围');
  }

  // 3. 提取 41 位相对时间戳（右移 22 位）
  const relativeTimestamp = Number(id >> 22n);
  const absoluteTimestamp = relativeTimestamp + options.epoch;

  // 4. 根据位模式提取机器码（数据中心 ID 与工作节点 ID）
  let datacenterId: number | null = null;
  let workerId = 0;
  if (options.mode === 'standard') {
    // 5位数据中心 ID (掩码 0x1F，右移 17 位)
    datacenterId = Number((id >> 17n) & 0x1Fn);
    // 5位工作节点 ID (掩码 0x1F，右移 12 位)
    workerId = Number((id >> 12n) & 0x1Fn);
  } else {
    // 10位工作节点 ID (掩码 0x3FF，右移 12 位)
    workerId = Number((id >> 12n) & 0x3FFn);
  }

  // 5. 提取 12 位自增序列号 (掩码 0xFFF)
  const sequence = Number(id & 0xFFFn);

  // 6. 构造 64 位完整二进制字符串并切片分段
  const fullBinary = id.toString(2).padStart(64, '0');
  const signBit = fullBinary.slice(0, 1);
  const timestampBits = fullBinary.slice(1, 42);
  const datacenterBits =
    options.mode === 'standard' ? fullBinary.slice(42, 47) : '';
  const workerBits =
    options.mode === 'standard'
      ? fullBinary.slice(47, 52)
      : fullBinary.slice(42, 52);
  const sequenceBits = fullBinary.slice(52, 64);

  // 7. 日期格式化
  let formattedDateTime = '';
  try {
    formattedDateTime = format(new Date(absoluteTimestamp), 'yyyy-MM-dd HH:mm:ss.SSS');
  } catch {
    formattedDateTime = '日期超出解析范围';
  }

  return {
    rawId: trimmed,
    binary: fullBinary,
    signBit,
    timestampBits,
    datacenterBits,
    workerBits,
    sequenceBits,
    relativeTimestamp,
    epoch: options.epoch,
    absoluteTimestamp,
    formattedDateTime,
    datacenterId,
    workerId,
    sequence,
  };
}

/**
 * 批量多行解析雪花 ID
 * @param text 多行文本输入
 * @param options 解析配置
 * @returns 批量解析明细表格行列表
 */
export function parseBatchSnowflakeIds(
  text: string,
  options: SnowflakeParseOptions,
): BatchSnowflakeRow[] {
  // 1. 按行拆分并过滤纯空行
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // 2. 逐行尝试解析并捕获异常返回友好错误提示
  return lines.map((line, index) => {
    try {
      const parsed = parseSnowflakeId(line, options);
      return {
        key: `${line}-${index}`,
        rawId: line,
        formattedDateTime: parsed.formattedDateTime,
        datacenterId: parsed.datacenterId !== null ? String(parsed.datacenterId) : '-',
        workerId: parsed.workerId,
        sequence: parsed.sequence,
        isValid: true,
      };
    } catch (err: any) {
      return {
        key: `${line}-${index}`,
        rawId: line,
        formattedDateTime: '-',
        datacenterId: '-',
        workerId: 0,
        sequence: 0,
        isValid: false,
        errorMessage: err?.message || '解析失败',
      };
    }
  });
}

/**
 * 根据指定参数合成生成雪花 ID
 * @param params 生成参数
 * @param options 纪元及模式配置
 * @returns 64位雪花 ID 字符串
 */
export function generateSnowflakeId(
  params: SnowflakeGenerateParams,
  options: SnowflakeParseOptions,
): string {
  // 1. 计算相对时间戳
  const targetTime = params.absoluteTimestamp ?? Date.now();
  const relativeTime = BigInt(targetTime - options.epoch);
  if (relativeTime < 0n) {
    throw new Error('生成失败：目标时间戳小于纪元起始时间');
  }
  if (relativeTime >= (1n << 41n)) {
    throw new Error('生成失败：目标时间戳超出 41 位容纳的最大时限');
  }

  // 2. 序列号与机器位约束
  const seq = BigInt(params.sequence) & 0xFFFn;

  let id = 0n;
  if (options.mode === 'standard') {
    const dc = BigInt(params.datacenterId ?? 0) & 0x1Fn;
    const wk = BigInt(params.workerId) & 0x1Fn;
    id = (relativeTime << 22n) | (dc << 17n) | (wk << 12n) | seq;
  } else {
    const wk = BigInt(params.workerId) & 0x3FFn;
    id = (relativeTime << 22n) | (wk << 12n) | seq;
  }

  return id.toString();
}
