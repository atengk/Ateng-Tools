/**
 * 随机决策转盘纯函数业务逻辑
 *
 * @author Ateng
 * @since 2026-10-02
 */

import type {
  WheelOption,
  WheelPreset,
} from './decision-wheel.types';

/**
 * 优质明快的转盘配色盘
 */
export const WHEEL_PALETTE = [
  '#3b82f6', // 蓝
  '#10b981', // 绿
  '#f59e0b', // 橙黄
  '#ef4444', // 红
  '#8b5cf6', // 紫
  '#ec4899', // 粉
  '#06b6d4', // 青
  '#84cc16', // 青绿
  '#f97316', // 橙
  '#6366f1', // 靛蓝
  '#14b8a6', // 墨绿
  '#a855f7', // 亮紫
];

/**
 * 经典预设列表
 */
export const WHEEL_PRESETS: WheelPreset[] = [
  {
    id: 'food',
    nameKey: 'tools.decision-wheel.presets.food',
    options: [
      { label: '黄焖鸡米饭' },
      { label: '麻辣烫' },
      { label: '汉堡快餐' },
      { label: '牛肉面' },
      { label: '轻食沙拉' },
      { label: '日式简餐' },
      { label: '火锅' },
      { label: '自己做饭' },
    ],
  },
  {
    id: 'pay',
    nameKey: 'tools.decision-wheel.presets.pay',
    options: [
      { label: '我来买单！' },
      { label: '左边第一位' },
      { label: '右边第一位' },
      { label: '全员 AA 制' },
      { label: '掷骰子再定' },
    ],
  },
  {
    id: 'meeting',
    nameKey: 'tools.decision-wheel.presets.meeting',
    options: [
      { label: '架构师' },
      { label: '前端代表' },
      { label: '后端代表' },
      { label: '测试代表' },
      { label: '产品经理' },
      { label: '项目经理' },
    ],
  },
  {
    id: 'truth_dare',
    nameKey: 'tools.decision-wheel.presets.truth_dare',
    options: [
      { label: '真心话' },
      { label: '大冒险' },
      { label: '喝杯水/饮料' },
      { label: '免除一次' },
    ],
  },
  {
    id: 'coin',
    nameKey: 'tools.decision-wheel.presets.coin',
    options: [
      { label: '正面 (Heads)' },
      { label: '反面 (Tails)' },
    ],
  },
  {
    id: 'dice',
    nameKey: 'tools.decision-wheel.presets.dice',
    options: [
      { label: '点数 1' },
      { label: '点数 2' },
      { label: '点数 3' },
      { label: '点数 4' },
      { label: '点数 5' },
      { label: '点数 6' },
    ],
  },
];

/**
 * 为选项赋予颜色
 */
export function assignColors(options: { label: string; weight?: number; color?: string }[]): WheelOption[] {
  return options.map((opt, index) => ({
    id: `opt_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
    label: opt.label,
    weight: Math.max(1, opt.weight ?? 1),
    color: opt.color || WHEEL_PALETTE[index % WHEEL_PALETTE.length],
  }));
}

/**
 * 计算各选项的概率分布百分比
 */
export function calculateProbabilities(options: WheelOption[]): { id: string; percentage: number }[] {
  const totalWeight = options.reduce((sum, opt) => sum + (Number(opt.weight) || 1), 0);
  if (totalWeight <= 0) {
    return options.map(o => ({ id: o.id, percentage: 0 }));
  }

  return options.map(opt => ({
    id: opt.id,
    percentage: Number((((Number(opt.weight) || 1) / totalWeight) * 100).toFixed(1)),
  }));
}

/**
 * 计算各扇区的起始与终止弧度
 *
 * 假定以 0 弧度为起点，顺时针分布总共 2 * PI
 */
export function calculateSectorAngles(options: WheelOption[]): {
  id: string;
  label: string;
  startAngle: number;
  endAngle: number;
  centerAngle: number;
}[] {
  const totalWeight = options.reduce((sum, opt) => sum + (Number(opt.weight) || 1), 0);
  if (totalWeight <= 0) {
    return [];
  }

  let currentAngle = 0;
  return options.map(opt => {
    const sweep = ((Number(opt.weight) || 1) / totalWeight) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    const centerAngle = startAngle + sweep / 2;
    currentAngle = endAngle;

    return {
      id: opt.id,
      label: opt.label,
      startAngle,
      endAngle,
      centerAngle,
    };
  });
}

/**
 * 加权随机抽取一个选项索引
 */
export function pickWeightedRandomIndex(options: WheelOption[]): number {
  const totalWeight = options.reduce((sum, opt) => sum + (Number(opt.weight) || 1), 0);
  if (totalWeight <= 0 || options.length === 0) {
    return 0;
  }

  let randomVal = Math.random() * totalWeight;
  for (let i = 0; i < options.length; i++) {
    const w = Number(options[i].weight) || 1;
    if (randomVal <= w) {
      return i;
    }
    randomVal -= w;
  }

  return options.length - 1;
}

/**
 * 计算缓动到达所选中扇区所需的最终累积旋转弧度
 *
 * 约定：指针固定在顶部正上方（即 270度，对应 1.5 * PI 弧度，或 -0.5 * PI 弧度）。
 * 当转盘顺时针旋转角度 theta 时，原本在 angle 处的扇区顺时针移动至 angle + theta。
 * 指针固定在顶部 1.5 * PI，因此落在该扇区需要：
 * (targetSectorCenter + theta) % (2 * PI) === 1.5 * PI
 * 即 theta = 1.5 * PI - targetSectorCenter + 2 * PI * k
 *
 * @param currentRotation 当前转盘已有累积弧度
 * @param options 所有选项
 * @param selectedIndex 被选中的目标选项索引
 * @param minRounds 最小额外旋转圈数（默认 6 圈，产生充足悬念）
 */
export function calculateTargetRotation(
  currentRotation: number,
  options: WheelOption[],
  selectedIndex: number,
  minRounds = 6,
): { targetRotation: number; selectedOption: WheelOption } {
  const sectors = calculateSectorAngles(options);
  const targetSector = sectors[selectedIndex] || sectors[0];
  const selectedOption = options[selectedIndex] || options[0];

  const pointerAngle = 1.5 * Math.PI; // 顶部 270度
  // 扇区中心对应的旋转补角
  const center = targetSector.centerAngle;

  // 使得旋转后 (center + theta) = pointerAngle
  // 即 theta = pointerAngle - center
  let diff = pointerAngle - (center % (2 * Math.PI));
  if (diff < 0) {
    diff += 2 * Math.PI;
  }

  // 计算当前旋转弧度在单圈内的余数
  const currentMod = currentRotation % (2 * Math.PI);
  let forwardRotation = diff - currentMod;
  if (forwardRotation < 0) {
    forwardRotation += 2 * Math.PI;
  }

  // 叠加额外圈数
  const extraRoundsAngle = minRounds * 2 * Math.PI;
  const targetRotation = currentRotation + forwardRotation + extraRoundsAngle;

  return { targetRotation, selectedOption };
}

/**
 * 三次贝塞尔减速缓动函数 (ease-out-cubic)
 *
 * @param t 进度 0 ~ 1
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
