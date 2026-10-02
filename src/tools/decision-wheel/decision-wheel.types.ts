/**
 * 随机决策转盘类型契约
 *
 * @author Ateng
 * @since 2026-10-02
 */

export interface WheelOption {
  id: string;
  label: string;
  weight: number; // 相对权重，默认 1
  color: string;
}

export interface WheelSpinHistoryItem {
  id: string;
  label: string;
  timestamp: number;
}

export interface WheelPreset {
  id: string;
  nameKey: string;
  options: { label: string; weight?: number; color?: string }[];
}
