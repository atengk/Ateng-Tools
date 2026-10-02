/**
 * 人民币大写金额转换器单元测试套件
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { describe, expect, it } from 'vitest';
import {
  formatAmountWithCommas,
  numberToRmbWords,
  rmbWordsToNumber,
} from './rmb-amount-converter.service';

describe('rmb-amount-converter.service', () => {
  describe('formatAmountWithCommas', () => {
    it('格式化普通正数与小数', () => {
      expect(formatAmountWithCommas(12345.67)).toBe('12,345.67');
      expect(formatAmountWithCommas('1000000')).toBe('1,000,000.00');
    });

    it('格式化零和负数', () => {
      expect(formatAmountWithCommas(0)).toBe('0.00');
      expect(formatAmountWithCommas(-9876.5)).toBe('-9,876.50');
    });
  });

  describe('numberToRmbWords', () => {
    it('处理零元', () => {
      const res = numberToRmbWords(0);
      expect(res.words).toBe('零元整');
      expect(res.formattedNumber).toBe('0.00');
    });

    it('处理基础整数', () => {
      expect(numberToRmbWords(1).words).toBe('壹元整');
      expect(numberToRmbWords(10).words).toBe('壹拾元整');
      expect(numberToRmbWords(100).words).toBe('壹佰元整');
      expect(numberToRmbWords(1000).words).toBe('壹仟元整');
      expect(numberToRmbWords(10000).words).toBe('壹万元整');
      expect(numberToRmbWords(100000000).words).toBe('壹亿元整');
    });

    it('处理跨位连续零', () => {
      expect(numberToRmbWords(105).words).toBe('壹佰零伍元整');
      expect(numberToRmbWords(1005).words).toBe('壹仟零伍元整');
      expect(numberToRmbWords(10005).words).toBe('壹万零伍元整');
      expect(numberToRmbWords(100005).words).toBe('壹拾万零伍元整');
      expect(numberToRmbWords(100010).words).toBe('壹拾万零壹拾元整');
      expect(numberToRmbWords(100000001).words).toBe('壹亿零壹元整');
    });

    it('处理角分小数', () => {
      expect(numberToRmbWords(0.5).words).toBe('伍角整');
      expect(numberToRmbWords(0.05).words).toBe('伍分');
      expect(numberToRmbWords(12345.67).words).toBe('壹万贰仟叁佰肆拾伍元陆角柒分');
      expect(numberToRmbWords(100010.01).words).toBe('壹拾万零壹拾元零壹分');
    });

    it('处理负数', () => {
      const res = numberToRmbWords(-1234.56);
      expect(res.isNegative).toBe(true);
      expect(res.words).toBe('负壹仟贰佰叁拾肆元伍角陆分');
    });

    it('支持前缀配置与发票合同模板', () => {
      const res = numberToRmbWords(8888.88, { showPrefix: true });
      expect(res.prefixedWords).toBe('人民币捌仟捌佰捌拾捌元捌角捌分');
      expect(res.standardTemplate).toContain('人民币（大写）：捌仟捌佰捌拾捌元捌角捌分');
      expect(res.standardTemplate).toContain('¥8,888.88');
    });

    it('防御异常输入', () => {
      expect(() => numberToRmbWords('abc')).toThrow();
      expect(() => numberToRmbWords(1e20)).toThrow();
    });
  });

  describe('rmbWordsToNumber 反向解析', () => {
    it('反向还原标准整数与小数', () => {
      expect(rmbWordsToNumber('零元整').amount).toBe(0);
      expect(rmbWordsToNumber('壹元整').amount).toBe(1);
      expect(rmbWordsToNumber('壹拾元整').amount).toBe(10);
      expect(rmbWordsToNumber('壹佰元整').amount).toBe(100);
      expect(rmbWordsToNumber('壹万元整').amount).toBe(10000);
      expect(rmbWordsToNumber('壹亿元整').amount).toBe(100000000);
      expect(rmbWordsToNumber('壹万贰仟叁佰肆拾伍元陆角柒分').amount).toBe(12345.67);
    });

    it('支持带前缀和模板的反向解析', () => {
      expect(rmbWordsToNumber('人民币壹万贰仟元整').amount).toBe(12000);
      expect(rmbWordsToNumber('负壹佰伍拾元伍角整').amount).toBe(-150.5);
    });

    it('防御空值和异常输入', () => {
      expect(rmbWordsToNumber('').success).toBe(false);
      expect(rmbWordsToNumber('   ').success).toBe(false);
    });
  });
});
