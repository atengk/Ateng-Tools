/**
 * CIDR 聚合与无类子网合并器单元测试
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { describe, expect, it } from 'vitest';
import {
  aggregateCidrs,
  calculateCidrSummary,
  computeMinimalSupernet,
  detectCidrConflicts,
  intToIpv4,
  ipv4ToInt,
  parseCidr,
  prefixToMaskInt,
  rangeToCidrs,
} from './cidr-calculator.service';

describe('cidr-calculator.service', () => {
  describe('ipv4ToInt & intToIpv4', () => {
    it('正确双向转换点分十进制与无符号整型', () => {
      expect(ipv4ToInt('0.0.0.0')).toBe(0);
      expect(intToIpv4(0)).toBe('0.0.0.0');

      expect(ipv4ToInt('255.255.255.255')).toBe(4294967295);
      expect(intToIpv4(4294967295)).toBe('255.255.255.255');

      expect(ipv4ToInt('192.168.1.1')).toBe(3232235777);
      expect(intToIpv4(3232235777)).toBe('192.168.1.1');
    });

    it('非法 IP 格式抛出异常', () => {
      expect(() => ipv4ToInt('256.0.0.1')).toThrow();
      expect(() => ipv4ToInt('192.168.1')).toThrow();
      expect(() => ipv4ToInt('abc.def.ghi.jkl')).toThrow();
      expect(() => ipv4ToInt('192.168.1.-1')).toThrow();
    });
  });

  describe('prefixToMaskInt', () => {
    it('正确生成对应前缀的掩码', () => {
      expect(prefixToMaskInt(0)).toBe(0);
      expect(intToIpv4(prefixToMaskInt(24))).toBe('255.255.255.0');
      expect(intToIpv4(prefixToMaskInt(16))).toBe('255.255.0.0');
      expect(intToIpv4(prefixToMaskInt(8))).toBe('255.0.0.0');
      expect(intToIpv4(prefixToMaskInt(32))).toBe('255.255.255.255');
    });
  });

  describe('parseCidr', () => {
    it('解析标准 /24 子网', () => {
      const block = parseCidr('192.168.1.100/24');
      expect(block).not.toBeNull();
      expect(block?.networkAddress).toBe('192.168.1.0');
      expect(block?.broadcastAddress).toBe('192.168.1.255');
      expect(block?.firstUsableIp).toBe('192.168.1.1');
      expect(block?.lastUsableIp).toBe('192.168.1.254');
      expect(block?.subnetMask).toBe('255.255.255.0');
      expect(block?.wildcardMask).toBe('0.0.0.255');
      expect(block?.totalIps).toBe(256);
      expect(block?.usableHosts).toBe(254);
    });

    it('支持单个 IP 默认按 /32 解析', () => {
      const block = parseCidr('10.0.0.5');
      expect(block).not.toBeNull();
      expect(block?.prefix).toBe(32);
      expect(block?.networkAddress).toBe('10.0.0.5');
      expect(block?.broadcastAddress).toBe('10.0.0.5');
      expect(block?.usableHosts).toBe(1);
    });

    it('解析点对点 /31 子网 (RFC 3021)', () => {
      const block = parseCidr('10.0.0.0/31');
      expect(block).not.toBeNull();
      expect(block?.usableHosts).toBe(2);
      expect(block?.firstUsableIp).toBe('10.0.0.0');
      expect(block?.lastUsableIp).toBe('10.0.0.1');
    });

    it('对非法 CIDR 格式容错返回 null', () => {
      expect(parseCidr('')).toBeNull();
      expect(parseCidr('192.168.1.1/33')).toBeNull();
      expect(parseCidr('192.168.1.1/-1')).toBeNull();
      expect(parseCidr('invalid-ip/24')).toBeNull();
    });
  });

  describe('detectCidrConflicts', () => {
    it('正确检测完全重复与大网包含小网', () => {
      const b1 = parseCidr('192.168.1.0/24')!;
      const b2 = parseCidr('192.168.1.0/24')!;
      const b3 = parseCidr('192.168.0.0/16')!;

      const conflicts = detectCidrConflicts([b1, b2, b3]);
      expect(conflicts.length).toBe(3);
      expect(conflicts.some(c => c.type === 'exact')).toBe(true);
      expect(conflicts.some(c => c.type === 'contained_by')).toBe(true);
    });

    it('互不重叠的网段不报告冲突', () => {
      const b1 = parseCidr('192.168.1.0/24')!;
      const b2 = parseCidr('192.168.2.0/24')!;
      const conflicts = detectCidrConflicts([b1, b2]);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('aggregateCidrs', () => {
    it('将两个相邻且偶数边界对齐的 /24 聚合为 /23', () => {
      const b1 = parseCidr('192.168.0.0/24')!;
      const b2 = parseCidr('192.168.1.0/24')!;

      const aggregated = aggregateCidrs([b1, b2]);
      expect(aggregated).toHaveLength(1);
      expect(aggregated[0].cidr).toBe('192.168.0.0/23');
      expect(aggregated[0].totalIps).toBe(512);
    });

    it('将四个连续的 /24 聚合为单一 /22', () => {
      const blocks = [
        parseCidr('10.0.0.0/24')!,
        parseCidr('10.0.1.0/24')!,
        parseCidr('10.0.2.0/24')!,
        parseCidr('10.0.3.0/24')!,
      ];

      const aggregated = aggregateCidrs(blocks);
      expect(aggregated).toHaveLength(1);
      expect(aggregated[0].cidr).toBe('10.0.0.0/22');
      expect(aggregated[0].totalIps).toBe(1024);
    });

    it('能够自动消除重叠并合并子网', () => {
      const b1 = parseCidr('172.16.0.0/24')!;
      const b2 = parseCidr('172.16.0.128/25')!; // 位于 b1 内部

      const aggregated = aggregateCidrs([b1, b2]);
      expect(aggregated).toHaveLength(1);
      expect(aggregated[0].cidr).toBe('172.16.0.0/24');
    });

    it('不相邻的网段保持独立', () => {
      const b1 = parseCidr('192.168.1.0/24')!;
      const b2 = parseCidr('192.168.3.0/24')!;

      const aggregated = aggregateCidrs([b1, b2]);
      expect(aggregated).toHaveLength(2);
      expect(aggregated.map(a => a.cidr)).toEqual(['192.168.1.0/24', '192.168.3.0/24']);
    });
  });

  describe('computeMinimalSupernet', () => {
    it('计算能够完全包裹所有输入网段的最小单一超网', () => {
      const b1 = parseCidr('192.168.1.0/24')!;
      const b2 = parseCidr('192.168.3.0/24')!;

      const supernet = computeMinimalSupernet([b1, b2]);
      expect(supernet).not.toBeNull();
      expect(supernet?.cidr).toBe('192.168.0.0/22');
      expect(supernet?.networkAddress).toBe('192.168.0.0');
    });

    it('跨越大范围网段计算全局最小总超网', () => {
      const b1 = parseCidr('10.1.0.0/16')!;
      const b2 = parseCidr('10.2.0.0/16')!;

      const supernet = computeMinimalSupernet([b1, b2]);
      expect(supernet?.cidr).toBe('10.0.0.0/14');
    });
  });

  describe('calculateCidrSummary', () => {
    it('端到端多行输入解析与指标统计', () => {
      const raw = `
        192.168.0.0/24
        192.168.1.0/24
        invalid-line
        192.168.0.100/32
      `;

      const summary = calculateCidrSummary(raw);
      expect(summary.validInputs).toHaveLength(3);
      expect(summary.invalidInputs).toEqual(['invalid-line']);
      expect(summary.conflicts.length).toBeGreaterThan(0);
      expect(summary.aggregatedBlocks).toHaveLength(1);
      expect(summary.aggregatedBlocks[0].cidr).toBe('192.168.0.0/23');
      expect(summary.uniqueIpCount).toBe(512);
    });
  });
});
