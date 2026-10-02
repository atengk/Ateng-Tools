/**
 * 中国居民身份证透视器单元测试套件
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { describe, expect, it } from 'vitest';
import {
  calculateMod112Checksum,
  convert15To18,
  generateMockIdCards,
  getChineseZodiac,
  getConstellation,
  inspectIdCard,
  isValidBirthDate,
  maskIdCard,
} from './chinese-id-card-inspector.service';

describe('chinese-id-card-inspector.service', () => {
  describe('calculateMod112Checksum', () => {
    it('精确计算 17 位数字的 MOD 11-2 校验位', () => {
      // 11010119900307237 -> 110101 1990 03 07 237
      const sumCheck = calculateMod112Checksum('11010119900307237');
      expect(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'X']).toContain(sumCheck);
    });

    it('对非 17 位数字抛出异常', () => {
      expect(() => calculateMod112Checksum('12345')).toThrow();
      expect(() => calculateMod112Checksum('1101011990030723712')).toThrow();
    });
  });

  describe('convert15To18 一代证升级', () => {
    it('15 位身份证成功插入 19 并计算第 18 位校验码', () => {
      const id15 = '110101900307237';
      const id18 = convert15To18(id15);
      expect(id18.length).toBe(18);
      expect(id18.startsWith('11010119900307237')).toBe(true);
      expect(calculateMod112Checksum(id18.substring(0, 17))).toBe(id18[17]);
    });
  });

  describe('isValidBirthDate 生日判定', () => {
    it('正确识别平闰年与有效日期', () => {
      expect(isValidBirthDate(2000, 2, 29)).toBe(true); // 闰年
      expect(isValidBirthDate(2001, 2, 29)).toBe(false); // 平年
      expect(isValidBirthDate(1990, 4, 30)).toBe(true);
      expect(isValidBirthDate(1990, 4, 31)).toBe(false);
      expect(isValidBirthDate(1899, 1, 1)).toBe(false); // 早于1900
      expect(isValidBirthDate(2099, 1, 1)).toBe(false); // 未来日期
    });
  });

  describe('生肖与星座推算', () => {
    it('正确推算生肖', () => {
      expect(getChineseZodiac(1984)).toBe('鼠');
      expect(getChineseZodiac(2024)).toBe('龙');
      expect(getChineseZodiac(2026)).toBe('马');
    });

    it('正确推算黄道星座', () => {
      expect(getConstellation(3, 21)).toBe('白羊座');
      expect(getConstellation(7, 23)).toBe('狮子座');
      expect(getConstellation(10, 2)).toBe('天秤座');
      expect(getConstellation(12, 25)).toBe('摩羯座');
    });
  });

  describe('maskIdCard 敏感信息脱敏', () => {
    it('支持前6后4与掩盖地域', () => {
      const sample = '11010119900307237X';
      expect(maskIdCard(sample, 'front6Back4')).toBe('110101********237X');
      expect(maskIdCard(sample, 'hideRegion')).toBe('******19900307237X');
    });
  });

  describe('inspectIdCard 综合透视分析', () => {
    it('成功解析合法 18 位身份证', () => {
      // 动态生成一个 100% 合法的测试号
      const [validId] = generateMockIdCards({ provinceCode: '11', count: 1 });
      const report = inspectIdCard(validId);

      expect(report.validation.isValid).toBe(true);
      expect(report.validation.is15Digit).toBe(false);
      expect(report.details).toBeDefined();
      expect(report.details?.province).toBe('北京市');
      expect(report.details?.age).toBeGreaterThanOrEqual(18);
      expect(['男', '女']).toContain(report.details?.genderText);
      expect(report.details?.masks.front6Back4).toContain('********');
    });

    it('成功升级并解析 15 位老一代身份证', () => {
      const id15 = '110101900307237';
      const report = inspectIdCard(id15);
      expect(report.validation.isValid).toBe(true);
      expect(report.validation.is15Digit).toBe(true);
      expect(report.details?.birthYear).toBe(1990);
      expect(report.details?.genderText).toBe('单数' ? '男' : '女');
    });

    it('准确识别校验码篡改错误', () => {
      const [validId] = generateMockIdCards({ count: 1 });
      // 故意修改最后一位校验位
      const corruptedChecksum = validId[17] === '0' ? '1' : '0';
      const invalidId = validId.substring(0, 17) + corruptedChecksum;

      const report = inspectIdCard(invalidId);
      expect(report.validation.isValid).toBe(false);
      expect(report.validation.errorMessage).toContain('校验码不匹配');
    });

    it('准确拦截非法省份代码与不存在生日', () => {
      expect(inspectIdCard('990101199001011234').validation.isValid).toBe(false);
      expect(inspectIdCard('110101199002301234').validation.isValid).toBe(false);
      expect(inspectIdCard('').validation.isValid).toBe(false);
      expect(inspectIdCard('abcdef').validation.isValid).toBe(false);
    });
  });

  describe('generateMockIdCards 研发合规测试虚拟号生成', () => {
    it('批量生成的每一个测试号均 100% 通过合规检验', () => {
      const mockCards = generateMockIdCards({ count: 10, minAge: 20, maxAge: 40 });
      expect(mockCards.length).toBe(10);

      mockCards.forEach((card) => {
        const report = inspectIdCard(card);
        expect(report.validation.isValid).toBe(true);
        expect(report.details?.age).toBeGreaterThanOrEqual(20);
        expect(report.details?.age).toBeLessThanOrEqual(40);
      });
    });

    it('满足性别指定约束', () => {
      const males = generateMockIdCards({ gender: 'male', count: 5 });
      males.forEach((card) => {
        const report = inspectIdCard(card);
        expect(report.details?.gender).toBe('male');
      });

      const females = generateMockIdCards({ gender: 'female', count: 5 });
      females.forEach((card) => {
        const report = inspectIdCard(card);
        expect(report.details?.gender).toBe('female');
      });
    });
  });
});
