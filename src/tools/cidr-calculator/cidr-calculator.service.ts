/**
 * CIDR 聚合与无类子网合并器纯函数服务
 *
 * @author Ateng
 * @since 2026-10-01
 */
import type {
  CidrBlock,
  CidrCalculationResult,
  CidrConflict,
} from './cidr-calculator.types';

/**
 * 将 IPv4 点分十进制字符串转换为无符号 32 位整型数值
 *
 * @param ip IPv4 地址字符串 (如 192.168.1.1)
 * @returns 32 位无符号整型数值
 */
export function ipv4ToInt(ip: string): number {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) {
    throw new Error(`非法的 IPv4 地址格式: ${ip}`);
  }
  let result = 0;
  for (let i = 0; i < 4; i++) {
    const octet = Number(parts[i]);
    if (isNaN(octet) || octet < 0 || octet > 255 || !Number.isInteger(octet)) {
      throw new Error(`非法的 IPv4 八位位组: ${parts[i]}`);
    }
    result = (result << 8) | octet;
  }
  return result >>> 0;
}

/**
 * 将无符号 32 位整型数值转换为 IPv4 点分十进制字符串
 *
 * @param int 32 位无符号整型数值
 * @returns IPv4 地址字符串
 */
export function intToIpv4(int: number): string {
  const unsigned = int >>> 0;
  return [
    (unsigned >>> 24) & 255,
    (unsigned >>> 16) & 255,
    (unsigned >>> 8) & 255,
    unsigned & 255,
  ].join('.');
}

/**
 * 依据网络前缀长度获取子网掩码的无符号整型数值
 *
 * @param prefix 网络前缀长度 (0 ~ 32)
 * @returns 32 位掩码整型
 */
export function prefixToMaskInt(prefix: number): number {
  if (prefix === 0) return 0;
  return ((0xffffffff << (32 - prefix)) >>> 0);
}

/**
 * 解析并构建单个 CIDR 结构块对象
 *
 * @param input 输入字符串 (如 192.168.1.0/24 或单 IP 192.168.1.1)
 * @returns CidrBlock 结构体或在格式非法时返回 null
 */
export function parseCidr(input: string): CidrBlock | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. 拆分 IP 地址与前缀长度
  const slashIdx = trimmed.indexOf('/');
  let ipStr = trimmed;
  let prefix = 32;

  if (slashIdx !== -1) {
    ipStr = trimmed.slice(0, slashIdx).trim();
    const prefixStr = trimmed.slice(slashIdx + 1).trim();
    const p = Number(prefixStr);
    if (isNaN(p) || p < 0 || p > 32 || !Number.isInteger(p)) {
      return null;
    }
    prefix = p;
  }

  let ipInt: number;
  try {
    ipInt = ipv4ToInt(ipStr);
  } catch {
    return null;
  }

  // 2. 计算掩码、网络地址与广播地址
  const maskInt = prefixToMaskInt(prefix);
  const wildcardInt = (~maskInt) >>> 0;
  const startInt = (ipInt & maskInt) >>> 0;
  const endInt = (startInt | wildcardInt) >>> 0;

  const networkAddress = intToIpv4(startInt);
  const broadcastAddress = intToIpv4(endInt);
  const subnetMask = intToIpv4(maskInt);
  const wildcardMask = intToIpv4(wildcardInt);

  // 3. 计算可用主机与主机 IP 范围
  const totalIps = prefix === 0 ? 4294967296 : Math.pow(2, 32 - prefix);
  let usableHosts = 0;
  let firstUsableIp = networkAddress;
  let lastUsableIp = broadcastAddress;

  if (prefix === 32) {
    usableHosts = 1;
    firstUsableIp = networkAddress;
    lastUsableIp = networkAddress;
  } else if (prefix === 31) {
    usableHosts = 2; // RFC 3021 点对点链路
    firstUsableIp = networkAddress;
    lastUsableIp = broadcastAddress;
  } else {
    usableHosts = Math.max(totalIps - 2, 0);
    firstUsableIp = intToIpv4(startInt + 1);
    lastUsableIp = intToIpv4(endInt - 1);
  }

  return {
    cidr: `${networkAddress}/${prefix}`,
    networkAddress,
    prefix,
    subnetMask,
    wildcardMask,
    broadcastAddress,
    firstUsableIp,
    lastUsableIp,
    totalIps,
    usableHosts,
    startInt,
    endInt,
  };
}

/**
 * 探测输入网段列表中的包含、重复与重叠冲突
 *
 * @param blocks 已解析的 CIDR 网段列表
 * @returns 冲突描述列表
 */
export function detectCidrConflicts(blocks: CidrBlock[]): CidrConflict[] {
  const conflicts: CidrConflict[] = [];

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];

      // 完全相同
      if (a.startInt === b.startInt && a.endInt === b.endInt) {
        conflicts.push({
          cidrA: a.cidr,
          cidrB: b.cidr,
          type: 'exact',
          description: `网段 ${a.cidr} 与 ${b.cidr} 完全相同重复`,
        });
      } else if (a.startInt <= b.startInt && a.endInt >= b.endInt) {
        // a 包含 b
        conflicts.push({
          cidrA: a.cidr,
          cidrB: b.cidr,
          type: 'contains',
          description: `网段 ${a.cidr} 完整包含了子网 ${b.cidr}`,
        });
      } else if (b.startInt <= a.startInt && b.endInt >= a.endInt) {
        // b 包含 a
        conflicts.push({
          cidrA: a.cidr,
          cidrB: b.cidr,
          type: 'contained_by',
          description: `网段 ${a.cidr} 被大网段 ${b.cidr} 所包含`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * 将任意闭区间 [start, end] 分解为数量最少的标准合法 CIDR 网段
 *
 * @param start 起始无符号整型 IP
 * @param end 结束无符号整型 IP
 * @returns 构成的标准 CIDR 块列表
 */
export function rangeToCidrs(start: number, end: number): CidrBlock[] {
  const result: CidrBlock[] = [];
  let current = start >>> 0;
  const targetEnd = end >>> 0;

  while (current <= targetEnd) {
    // 找出当前 IP 能够支持的最大块大小 (受低位 0 约束)
    let maxBits = 0;
    while (maxBits < 32) {
      if ((current & (1 << maxBits)) !== 0) break;
      maxBits++;
    }

    // 检查这个块是否超过 targetEnd
    let currentBits = maxBits;
    while (currentBits > 0) {
      const blockSize = Math.pow(2, currentBits);
      if (current + blockSize - 1 <= targetEnd) {
        break;
      }
      currentBits--;
    }

    const prefix = 32 - currentBits;
    const block = parseCidr(`${intToIpv4(current)}/${prefix}`);
    if (block) {
      result.push(block);
    }

    const blockSize = Math.pow(2, currentBits);
    if (current + blockSize > targetEnd) {
      break;
    }
    current = (current + blockSize) >>> 0;
  }

  return result;
}

/**
 * 对多个 CIDR 网段执行无类超网聚合 (Route Summarization / Supernetting)
 *
 * @param blocks 输入的待聚合 CIDR 列表
 * @returns 精确聚合覆盖后的最小 CIDR 块集合
 */
export function aggregateCidrs(blocks: CidrBlock[]): CidrBlock[] {
  if (blocks.length === 0) return [];

  // 1. 将所有网段转换为 IP 区间并按起始地址排序
  const ranges = blocks
    .map(b => ({ start: b.startInt, end: b.endInt }))
    .sort((a, b) => a.start - b.start);

  // 2. 合并重叠与相邻的连续区间
  const mergedRanges: { start: number; end: number }[] = [];
  let curr = ranges[0];

  for (let i = 1; i < ranges.length; i++) {
    const next = ranges[i];
    // 相邻 (curr.end + 1 >= next.start) 或重叠
    if (curr.end + 1 >= next.start) {
      curr.end = Math.max(curr.end, next.end);
    } else {
      mergedRanges.push(curr);
      curr = next;
    }
  }
  mergedRanges.push(curr);

  // 3. 将合并后的每个连续 IP 范围分解为最优 CIDR 块
  const result: CidrBlock[] = [];
  for (const range of mergedRanges) {
    const cidrs = rangeToCidrs(range.start, range.end);
    result.push(...cidrs);
  }

  return result;
}

/**
 * 计算能够同时覆盖所有输入网段的单一最小总超网 (Minimal Supernet)
 *
 * @param blocks 输入网段集合
 * @returns 最小总超网 CidrBlock 或在无有效输入时返回 null
 */
export function computeMinimalSupernet(blocks: CidrBlock[]): CidrBlock | null {
  if (blocks.length === 0) return null;
  if (blocks.length === 1) return blocks[0];

  // 1. 查找全体网段的全局最小值与最大值
  let minIp = blocks[0].startInt;
  let maxIp = blocks[0].endInt;

  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i].startInt < minIp) minIp = blocks[i].startInt;
    if (blocks[i].endInt > maxIp) maxIp = blocks[i].endInt;
  }

  // 2. 计算覆盖从 minIp 到 maxIp 所需的最长公共前缀
  const diff = (minIp ^ maxIp) >>> 0;
  let prefix = 32;

  if (diff !== 0) {
    // 找出最高差异位
    prefix = 32 - Math.floor(Math.log2(diff) + 1);
  }

  // 3. 基于公共前缀构造总超网
  const mask = prefixToMaskInt(prefix);
  const supernetStart = (minIp & mask) >>> 0;

  return parseCidr(`${intToIpv4(supernetStart)}/${prefix}`);
}

/**
 * 完整解析并汇总计算多行 CIDR 输入
 *
 * @param rawText 用户输入的原始文本 (支持换行、逗号或分号分隔)
 * @returns 全量分析与聚合计算结果实体
 */
export function calculateCidrSummary(rawText: string): CidrCalculationResult {
  const lines = rawText
    .split(/[\r\n,;]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const validInputs: CidrBlock[] = [];
  const invalidInputs: string[] = [];

  for (const line of lines) {
    const block = parseCidr(line);
    if (block) {
      validInputs.push(block);
    } else {
      invalidInputs.push(line);
    }
  }

  // 计算网段冲突
  const conflicts = detectCidrConflicts(validInputs);

  // 计算超网聚合列表
  const aggregatedBlocks = aggregateCidrs(validInputs);

  // 计算单一最小总超网
  const minimalSupernet = computeMinimalSupernet(validInputs);

  // 统计覆盖的独立去重 IP 数量
  let uniqueIpCount = 0;
  for (const block of aggregatedBlocks) {
    uniqueIpCount += block.totalIps;
  }

  return {
    validInputs,
    invalidInputs,
    aggregatedBlocks,
    minimalSupernet,
    conflicts,
    uniqueIpCount,
  };
}
