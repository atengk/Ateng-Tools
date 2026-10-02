/**
 * 物理单位换算器单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { describe, expect, it } from 'vitest';
import {
  convertDimension,
  formatUnitValue,
  getAllDimensions,
  getDimension,
} from './unit-converter.service';

describe('unit-converter.service', () => {
  it('应正确加载 8 大维度定义', () => {
    const dimensions = getAllDimensions();
    expect(dimensions).toHaveLength(8);
    const ids = dimensions.map(d => d.id);
    expect(ids).toContain('length');
    expect(ids).toContain('area');
    expect(ids).toContain('mass');
    expect(ids).toContain('volume');
    expect(ids).toContain('velocity');
    expect(ids).toContain('pressure');
    expect(ids).toContain('power');
    expect(ids).toContain('energy');
  });

  it('获取指定维度应返回正确单位列表', () => {
    const len = getDimension('length');
    expect(len).toBeDefined();
    expect(len?.baseUnitId).toBe('m');
    expect(len?.units.some(u => u.id === 'km')).toBe(true);
    expect(len?.units.some(u => u.id === 'chi')).toBe(true);
  });

  it('长度换算：1 米应等于 100 厘米、3 尺、0.001 千米', () => {
    const results = convertDimension('length', 'm', 1, { precision: 4 });
    const cm = results.find(r => r.id === 'cm');
    const km = results.find(r => r.id === 'km');
    const chi = results.find(r => r.id === 'chi');
    const mm = results.find(r => r.id === 'mm');

    expect(cm?.value).toBe(100);
    expect(cm?.formatted).toBe('100');
    expect(km?.value).toBe(0.001);
    expect(km?.formatted).toBe('0.001');
    expect(chi?.value).toBeCloseTo(3, 4);
    expect(mm?.value).toBe(1000);
  });

  it('质量换算：1 千克应等于 2 斤、1000 克、约 2.20462 磅', () => {
    const results = convertDimension('mass', 'kg', 1, { precision: 5 });
    const jin = results.find(r => r.id === 'jin');
    const g = results.find(r => r.id === 'g');
    const lb = results.find(r => r.id === 'lb');

    expect(jin?.value).toBe(2);
    expect(jin?.formatted).toBe('2');
    expect(g?.value).toBe(1000);
    expect(lb?.value).toBeCloseTo(2.20462, 4);
  });

  it('面积换算：1 公顷等于 10000 平方米、15 亩', () => {
    const results = convertDimension('area', 'ha', 1, { precision: 4 });
    const m2 = results.find(r => r.id === 'm2');
    const mu = results.find(r => r.id === 'mu');

    expect(m2?.value).toBe(10000);
    expect(mu?.value).toBe(15);
  });

  it('速度换算：100 km/h 应等于约 27.7778 m/s', () => {
    const results = convertDimension('velocity', 'km_h', 100, { precision: 4 });
    const ms = results.find(r => r.id === 'm_s');
    expect(ms?.value).toBeCloseTo(27.7778, 3);
  });

  it('压力换算：1 标准大气压应等于 101325 Pa、101.325 kPa、1.01325 bar', () => {
    const results = convertDimension('pressure', 'atm', 1, { precision: 5 });
    const pa = results.find(r => r.id === 'pa');
    const kpa = results.find(r => r.id === 'kpa');
    const bar = results.find(r => r.id === 'bar');

    expect(pa?.value).toBe(101325);
    expect(kpa?.value).toBe(101.325);
    expect(bar?.value).toBeCloseTo(1.01325, 4);
  });

  it('能量换算：1 度电 (kW·h) 应等于 3600000 焦耳 (J)', () => {
    const results = convertDimension('energy', 'kwh', 1);
    const j = results.find(r => r.id === 'j');
    expect(j?.value).toBe(3600000);
  });

  it('异常输入与边界防御：无效维度或无效单位应返回空数组', () => {
    // @ts-expect-error 测试非法维度
    expect(convertDimension('non_exist', 'm', 1)).toEqual([]);
    expect(convertDimension('length', 'non_exist_unit', 1)).toEqual([]);
  });

  it('formatUnitValue 格式化边界处理', () => {
    expect(formatUnitValue(NaN).formatted).toBe('0');
    expect(formatUnitValue(Infinity).formatted).toBe('0');
    expect(formatUnitValue(0).formatted).toBe('0');
    expect(formatUnitValue(12.34500, 4, true).formatted).toBe('12.345');
    expect(formatUnitValue(12.34500, 4, false).formatted).toBe('12.3450');
  });
});
