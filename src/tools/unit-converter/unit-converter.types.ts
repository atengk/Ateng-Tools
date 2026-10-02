/**
 * 物理单位换算器类型契约
 *
 * @author Ateng
 * @since 2026-10-02
 */

export type DimensionId =
  | 'length'
  | 'area'
  | 'mass'
  | 'volume'
  | 'velocity'
  | 'pressure'
  | 'power'
  | 'energy';

export type UnitSystem = 'metric' | 'imperial' | 'chinese' | 'other';

export interface UnitDefinition {
  id: string;
  nameKey: string;
  symbol: string;
  system: UnitSystem;
  ratio: number; // 换算到基准单位的倍数: 1 unit = ratio * base_unit
}

export interface DimensionDefinition {
  id: DimensionId;
  nameKey: string;
  baseUnitId: string;
  units: UnitDefinition[];
}

export interface ConversionResultItem {
  id: string;
  symbol: string;
  name: string;
  system: UnitSystem;
  value: number;
  formatted: string;
  scientific: string;
}

export interface ConversionOptions {
  precision?: number; // 小数位数 0-10，默认 6
  removeTrailingZeros?: boolean;
}
