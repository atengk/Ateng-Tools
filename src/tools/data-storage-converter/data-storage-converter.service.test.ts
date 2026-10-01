/**
 * 数据存储与网络速率换算纯函数单元测试
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { describe, expect, it } from 'vitest';
import {
  calculateTransferTime,
  convertBandwidth,
  convertStorage,
  formatUnitNumber,
} from './data-storage-converter.service';

describe('data-storage-converter.service', () => {
  describe('convertStorage', () => {
    it('能够精确将 1 GiB 换算为字节、MiB 与十进制 GB', () => {
      const res = convertStorage(1, 'GiB');
      expect(res.B).toBe(1073741824);
      expect(res.MiB).toBe(1024);
      expect(res.KiB).toBe(1048576);
      expect(res.GiB).toBe(1);
      expect(res.GB).toBeCloseTo(1.073741824, 6);
    });

    it('能够精确将 1 GB 换算为十进制与二进制单位', () => {
      const res = convertStorage(1, 'GB');
      expect(res.B).toBe(1000000000);
      expect(res.MB).toBe(1000);
      expect(res.KB).toBe(1000000);
      expect(res.GiB).toBeCloseTo(1000000000 / (1024 ** 3), 6);
    });

    it('能够处理 bit 与字节的 8 进制换算', () => {
      const res = convertStorage(8, 'bit');
      expect(res.B).toBe(1);

      const resByte = convertStorage(1, 'B');
      expect(resByte.bit).toBe(8);
    });

    it('对 0、负数或非有限数值进行防御性归零', () => {
      const zero = convertStorage(0, 'MB');
      expect(zero.B).toBe(0);

      const neg = convertStorage(-50, 'GB');
      expect(neg.B).toBe(0);

      const nan = convertStorage(NaN, 'MB');
      expect(nan.B).toBe(0);
    });
  });

  describe('convertBandwidth', () => {
    it('能够验证经典的百兆宽带 100 Mbps 等于 12.5 MB/s', () => {
      const res = convertBandwidth(100, 'Mbps');
      expect(res['MB/s']).toBe(12.5);
      expect(res['KB/s']).toBe(12500);
      expect(res['bps']).toBe(100000000);
      expect(res['Gbps']).toBe(0.1);
    });

    it('能够将 1 Gbps 千兆带宽换算为 125 MB/s', () => {
      const res = convertBandwidth(1, 'Gbps');
      expect(res['MB/s']).toBe(125);
      expect(res['Mbps']).toBe(1000);
    });

    it('能够由字节速率反推比特速率 (10 MB/s = 80 Mbps)', () => {
      const res = convertBandwidth(10, 'MB/s');
      expect(res.Mbps).toBe(80);
      expect(res.Kbps).toBe(80000);
    });

    it('对异常负数或非数值输入防御归零', () => {
      const res = convertBandwidth(-10, 'Mbps');
      expect(res['MB/s']).toBe(0);
    });
  });

  describe('calculateTransferTime', () => {
    it('能够正确推算 100 MB 文件在 12.5 MB/s (100 Mbps) 下耗时为 8 秒', () => {
      const time = calculateTransferTime(100, 'MB', 100, 'Mbps');
      expect(time.totalSeconds).toBe(8);
      expect(time.days).toBe(0);
      expect(time.hours).toBe(0);
      expect(time.minutes).toBe(0);
      expect(time.seconds).toBe(8);
      expect(time.formattedZh).toContain('8 秒');
      expect(time.formattedEn).toContain('8 secs');
    });

    it('能够推算大文件跨分钟/小时的复合耗时 (4.7 GB 在 5 MB/s 速度下)', () => {
      // 4.7 GB = 4,700,000,000 bytes. 5 MB/s = 5,000,000 B/s. 4700 / 5 = 940s = 15min 40s
      const time = calculateTransferTime(4.7, 'GB', 5, 'MB/s');
      expect(time.totalSeconds).toBe(940);
      expect(time.minutes).toBe(15);
      expect(time.seconds).toBe(40);
      expect(time.formattedZh).toBe('15 分 40 秒');
      expect(time.formattedEn).toBe('15 mins 40 secs');
    });

    it('能够处理跨天耗时 (100 TB 在 100 Mbps 速度下)', () => {
      // 100 TB = 1e14 B. 100 Mbps = 1.25e7 B/s. totalSeconds = 8,000,000s = 92.59 days
      const time = calculateTransferTime(100, 'TB', 100, 'Mbps');
      expect(time.days).toBeGreaterThan(90);
      expect(time.formattedZh).toContain('天');
    });

    it('对 0 大小或 0 速率防御性输出 0 秒', () => {
      const time = calculateTransferTime(0, 'MB', 100, 'Mbps');
      expect(time.totalSeconds).toBe(0);
      expect(time.formattedZh).toBe('0 秒');
    });
  });

  describe('formatUnitNumber', () => {
    it('去除冗余尾随零', () => {
      expect(formatUnitNumber(12.5000)).toBe('12.5');
      expect(formatUnitNumber(100.0)).toBe('100');
      expect(formatUnitNumber(0)).toBe('0');
    });

    it('正确保留有效小数位', () => {
      expect(formatUnitNumber(1.234567, 3)).toBe('1.235');
    });
  });
});
