/**
 * CIDR 聚合与无类子网合并器类型契约
 *
 * @author Ateng
 * @since 2026-10-01
 */

/**
 * 单个 CIDR 网段的详细解析属性
 */
export interface CidrBlock {
  /** 原始 CIDR 字符串 (如 192.168.1.0/24) */
  cidr: string;
  /** 网络地址 IP (如 192.168.1.0) */
  networkAddress: string;
  /** 网络前缀长度 (0 ~ 32) */
  prefix: number;
  /** 子网掩码点分十进制 (如 255.255.255.0) */
  subnetMask: string;
  /** 通配符掩码 (Wildcard Mask, 如 0.0.0.255) */
  wildcardMask: string;
  /** 广播地址 (如 192.168.1.255) */
  broadcastAddress: string;
  /** 第一个可用主机 IP (如 192.168.1.1) */
  firstUsableIp: string;
  /** 最后一个可用主机 IP (如 192.168.1.254) */
  lastUsableIp: string;
  /** 总 IP 地址数 (2^(32-prefix)) */
  totalIps: number;
  /** 可用主机数 (根据 prefix 扣除网络号和广播号) */
  usableHosts: number;
  /** 网络起始 IP 的无符号整型数值 */
  startInt: number;
  /** 网络广播 IP 的无符号整型数值 */
  endInt: number;
}

/**
 * 网段重叠与冲突类型
 */
export type CidrConflictType = 'exact' | 'contains' | 'contained_by';

/**
 * 网段重叠与冲突详情
 */
export interface CidrConflict {
  /** 第一个网段 */
  cidrA: string;
  /** 第二个网段 */
  cidrB: string;
  /** 冲突关系类型 */
  type: CidrConflictType;
  /** 冲突中文描述说明 */
  description: string;
}

/**
 * CIDR 聚合与分析完整计算结果
 */
export interface CidrCalculationResult {
  /** 有效的输入 CIDR 列表 */
  validInputs: CidrBlock[];
  /** 解析失败的输入行 */
  invalidInputs: string[];
  /** 最小聚合后的超网 CIDR 列表 */
  aggregatedBlocks: CidrBlock[];
  /** 能够覆盖所有输入网段的单一最小总超网 (Minimal Supernet) */
  minimalSupernet: CidrBlock | null;
  /** 检测到的网段冲突与重叠列表 */
  conflicts: CidrConflict[];
  /** 去重后的实际总覆盖独立 IP 数量 */
  uniqueIpCount: number;
}
