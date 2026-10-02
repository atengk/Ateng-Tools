/**
 * 随机决策转盘单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { describe, expect, it } from 'vitest';
import {
  WHEEL_PRESETS,
  assignColors,
  calculateProbabilities,
  calculateSectorAngles,
  calculateTargetRotation,
  easeOutCubic,
  pickWeightedRandomIndex,
} from './decision-wheel.service';

describe('decision-wheel.service', () => {
  it('应包含标准决策预设', () => {
    expect(WHEEL_PRESETS.length).toBeGreaterThanOrEqual(5);
    const ids = WHEEL_PRESETS.map(p => p.id);
    expect(ids).toContain('food');
    expect(ids).toContain('pay');
    expect(ids).toContain('meeting');
    expect(ids).toContain('truth_dare');
  });

  it('assignColors 为选项分配有效属性与色彩', () => {
    const raw = [{ label: 'A' }, { label: 'B' }];
    const options = assignColors(raw);

    expect(options).toHaveLength(2);
    expect(options[0].label).toBe('A');
    expect(options[0].color).toBeDefined();
    expect(options[0].weight).toBe(1);
    expect(options[1].color).not.toBe(options[0].color);
  });

  it('概率分布计算正确且权重比例一致', () => {
    const options = assignColors([
      { label: 'A', weight: 1 },
      { label: 'B', weight: 3 },
    ]);
    const probs = calculateProbabilities(options);

    expect(probs).toHaveLength(2);
    expect(probs[0].percentage).toBe(25);
    expect(probs[1].percentage).toBe(75);
  });

  it('扇区角度计算总和应正好为 2 * PI', () => {
    const options = assignColors([
      { label: '1', weight: 2 },
      { label: '2', weight: 3 },
      { label: '3', weight: 5 },
    ]);
    const sectors = calculateSectorAngles(options);

    expect(sectors).toHaveLength(3);
    expect(sectors[0].startAngle).toBe(0);
    expect(sectors[2].endAngle).toBeCloseTo(2 * Math.PI, 6);
  });

  it('加权随机抽取索引在合法范围内', () => {
    const options = assignColors([
      { label: 'X', weight: 1 },
      { label: 'Y', weight: 1 },
    ]);
    for (let i = 0; i < 50; i++) {
      const idx = pickWeightedRandomIndex(options);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(options.length);
    }
  });

  it('目标旋转弧度计算应精准停留在所选扇区并在当前弧度上正向增加', () => {
    const options = assignColors([
      { label: 'A', weight: 1 },
      { label: 'B', weight: 1 },
      { label: 'C', weight: 1 },
      { label: 'D', weight: 1 },
    ]);

    const currentRotation = 1.2;
    const selectedIndex = 2; // 选项 C
    const { targetRotation, selectedOption } = calculateTargetRotation(
      currentRotation,
      options,
      selectedIndex,
      6,
    );

    expect(selectedOption.label).toBe('C');
    expect(targetRotation).toBeGreaterThan(currentRotation);

    // 验证旋转后所选扇区中心与顶部 (1.5 * PI) 对齐
    const sectors = calculateSectorAngles(options);
    const center = sectors[selectedIndex].centerAngle;
    const finalPointer = (center + targetRotation) % (2 * Math.PI);
    expect(finalPointer).toBeCloseTo(1.5 * Math.PI, 4);
  });

  it('easeOutCubic 缓动特性验证', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5); // 减速曲线在前半程进度大于 0.5
  });
});
