/**
 * 位运算与字节透视计算器纯函数单元测试
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { describe, expect, it } from 'vitest';
import {
  clampToWidth,
  evaluateBitwise,
  formatValue,
  parseInput,
  toggleBit,
} from './bitwise-calculator.service';

describe('bitwise-calculator.service', () => {
  describe('clampToWidth & parseInput', () => {
    it('正确解析各进制输入并截断至指定位宽', () => {
      expect(parseInput('FF', 16, 8)).toBe(255n);
      expect(parseInput('100', 16, 8)).toBe(0n); // 0x100 溢出截断为 0x00
      expect(parseInput('1111', 2, 8)).toBe(15n);
      expect(parseInput('77', 8, 8)).toBe(63n);
      expect(parseInput('255', 10, 8)).toBe(255n);
    });

    it('十进制有符号负数解析为补码', () => {
      expect(parseInput('-1', 10, 8)).toBe(255n);
      expect(parseInput('-1', 10, 16)).toBe(65535n);
      expect(parseInput('-1', 10, 32)).toBe(4294967295n);
    });

    it('非法与空字符串返回 0n', () => {
      expect(parseInput('', 10, 8)).toBe(0n);
      expect(parseInput('abc_invalid', 10, 8)).toBe(0n);
      expect(parseInput('   ', 16, 8)).toBe(0n);
    });
  });

  describe('formatValue', () => {
    it('8 位无符号与有符号格式化', () => {
      const resUnsigned = formatValue(255n, 8, false);
      expect(resUnsigned.hex).toBe('FF');
      expect(resUnsigned.bin).toBe('11111111');
      expect(resUnsigned.dec).toBe('255');
      expect(resUnsigned.bits).toHaveLength(8);
      expect(resUnsigned.bits.every(Boolean)).toBe(true);

      const resSigned = formatValue(255n, 8, true);
      expect(resSigned.dec).toBe('-1');
    });

    it('16 位与 64 位大整数格式化精度与前导零', () => {
      const res16 = formatValue(15n, 16, false);
      expect(res16.hex).toBe('000F');
      expect(res16.bin).toBe('0000000000001111');
      expect(res16.dec).toBe('15');

      const max64 = 0xFFFFFFFFFFFFFFFFn;
      const res64 = formatValue(max64, 64, true);
      expect(res64.hex).toBe('FFFFFFFFFFFFFFFF');
      expect(res64.dec).toBe('-1');
      expect(res64.bits).toHaveLength(64);
    });
  });

  describe('toggleBit', () => {
    it('能够精确翻转单一比特位 (0 <-> 1)', () => {
      let val = 0n;
      val = toggleBit(val, 0, 8); // 翻转第 0 位
      expect(val).toBe(1n);

      val = toggleBit(val, 0, 8); // 再次翻转归 0
      expect(val).toBe(0n);

      val = toggleBit(val, 7, 8); // 翻转第 7 位 (MSB)
      expect(val).toBe(128n);
    });

    it('支持 64 位宽下最高位翻转', () => {
      const val = toggleBit(0n, 63, 64);
      expect(val).toBe(0x8000000000000000n);
    });

    it('越界索引防御', () => {
      expect(toggleBit(10n, -1, 8)).toBe(10n);
      expect(toggleBit(10n, 8, 8)).toBe(10n);
    });
  });

  describe('evaluateBitwise', () => {
    it('执行 AND、OR、XOR、NOT 运算', () => {
      expect(evaluateBitwise('AND', 0b1100n, 0b1010n, 8)).toBe(0b1000n);
      expect(evaluateBitwise('OR', 0b1100n, 0b1010n, 8)).toBe(0b1110n);
      expect(evaluateBitwise('XOR', 0b1100n, 0b1010n, 8)).toBe(0b0110n);
      expect(evaluateBitwise('NOT', 0n, 0n, 8)).toBe(255n);
    });

    it('执行左移与算术/逻辑右移', () => {
      expect(evaluateBitwise('LSHIFT', 1n, 3n, 8)).toBe(8n);
      expect(evaluateBitwise('LSHIFT', 128n, 1n, 8)).toBe(0n); // 溢出截断

      // 无符号右移与逻辑右移
      expect(evaluateBitwise('URSHIFT', 8n, 2n, 8)).toBe(2n);

      // 算术右移 (0x80 = -128 in 8-bit, >> 1 = -64 = 0xC0)
      const resArith = evaluateBitwise('RSHIFT', 0x80n, 1n, 8, true);
      expect(resArith).toBe(0xC0n);
    });
  });
});
