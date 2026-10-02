/**
 * 物理单位换算器纯函数业务逻辑
 *
 * @author Ateng
 * @since 2026-10-02
 */

import type {
  ConversionOptions,
  ConversionResultItem,
  DimensionDefinition,
  DimensionId,
  UnitDefinition,
} from './unit-converter.types';

/**
 * 8 大物理维度矩阵定义 (以 SI 基准单位为换算标尺)
 */
export const DIMENSIONS: DimensionDefinition[] = [
  {
    id: 'length',
    nameKey: 'tools.unit-converter.dimensions.length',
    baseUnitId: 'm',
    units: [
      { id: 'km', nameKey: 'tools.unit-converter.units.km', symbol: 'km', system: 'metric', ratio: 1000 },
      { id: 'm', nameKey: 'tools.unit-converter.units.m', symbol: 'm', system: 'metric', ratio: 1 },
      { id: 'dm', nameKey: 'tools.unit-converter.units.dm', symbol: 'dm', system: 'metric', ratio: 0.1 },
      { id: 'cm', nameKey: 'tools.unit-converter.units.cm', symbol: 'cm', system: 'metric', ratio: 0.01 },
      { id: 'mm', nameKey: 'tools.unit-converter.units.mm', symbol: 'mm', system: 'metric', ratio: 0.001 },
      { id: 'um', nameKey: 'tools.unit-converter.units.um', symbol: 'μm', system: 'metric', ratio: 1e-6 },
      { id: 'nm', nameKey: 'tools.unit-converter.units.nm', symbol: 'nm', system: 'metric', ratio: 1e-9 },
      { id: 'nmi', nameKey: 'tools.unit-converter.units.nmi', symbol: 'nmi', system: 'other', ratio: 1852 },
      { id: 'mi', nameKey: 'tools.unit-converter.units.mi', symbol: 'mi', system: 'imperial', ratio: 1609.344 },
      { id: 'yd', nameKey: 'tools.unit-converter.units.yd', symbol: 'yd', system: 'imperial', ratio: 0.9144 },
      { id: 'ft', nameKey: 'tools.unit-converter.units.ft', symbol: 'ft', system: 'imperial', ratio: 0.3048 },
      { id: 'in', nameKey: 'tools.unit-converter.units.in', symbol: 'in', system: 'imperial', ratio: 0.0254 },
      { id: 'li', nameKey: 'tools.unit-converter.units.li', symbol: '市里', system: 'chinese', ratio: 500 },
      { id: 'zhang', nameKey: 'tools.unit-converter.units.zhang', symbol: '丈', system: 'chinese', ratio: 10 / 3 },
      { id: 'chi', nameKey: 'tools.unit-converter.units.chi', symbol: '尺', system: 'chinese', ratio: 1 / 3 },
      { id: 'cun', nameKey: 'tools.unit-converter.units.cun', symbol: '寸', system: 'chinese', ratio: 1 / 30 },
    ],
  },
  {
    id: 'area',
    nameKey: 'tools.unit-converter.dimensions.area',
    baseUnitId: 'm2',
    units: [
      { id: 'km2', nameKey: 'tools.unit-converter.units.km2', symbol: 'km²', system: 'metric', ratio: 1e6 },
      { id: 'ha', nameKey: 'tools.unit-converter.units.ha', symbol: 'ha', system: 'metric', ratio: 10000 },
      { id: 'm2', nameKey: 'tools.unit-converter.units.m2', symbol: 'm²', system: 'metric', ratio: 1 },
      { id: 'dm2', nameKey: 'tools.unit-converter.units.dm2', symbol: 'dm²', system: 'metric', ratio: 0.01 },
      { id: 'cm2', nameKey: 'tools.unit-converter.units.cm2', symbol: 'cm²', system: 'metric', ratio: 1e-4 },
      { id: 'mm2', nameKey: 'tools.unit-converter.units.mm2', symbol: 'mm²', system: 'metric', ratio: 1e-6 },
      { id: 'sq_mi', nameKey: 'tools.unit-converter.units.sq_mi', symbol: 'sq mi', system: 'imperial', ratio: 2589988.110336 },
      { id: 'acre', nameKey: 'tools.unit-converter.units.acre', symbol: 'acre', system: 'imperial', ratio: 4046.8564224 },
      { id: 'sq_yd', nameKey: 'tools.unit-converter.units.sq_yd', symbol: 'sq yd', system: 'imperial', ratio: 0.83612736 },
      { id: 'sq_ft', nameKey: 'tools.unit-converter.units.sq_ft', symbol: 'sq ft', system: 'imperial', ratio: 0.09290304 },
      { id: 'sq_in', nameKey: 'tools.unit-converter.units.sq_in', symbol: 'sq in', system: 'imperial', ratio: 0.00064516 },
      { id: 'qing', nameKey: 'tools.unit-converter.units.qing', symbol: '顷', system: 'chinese', ratio: 66666.66666666667 },
      { id: 'mu', nameKey: 'tools.unit-converter.units.mu', symbol: '亩', system: 'chinese', ratio: 2000 / 3 },
      { id: 'sq_chi', nameKey: 'tools.unit-converter.units.sq_chi', symbol: '平方尺', system: 'chinese', ratio: 1 / 9 },
    ],
  },
  {
    id: 'mass',
    nameKey: 'tools.unit-converter.dimensions.mass',
    baseUnitId: 'kg',
    units: [
      { id: 't', nameKey: 'tools.unit-converter.units.t', symbol: 't', system: 'metric', ratio: 1000 },
      { id: 'kg', nameKey: 'tools.unit-converter.units.kg', symbol: 'kg', system: 'metric', ratio: 1 },
      { id: 'g', nameKey: 'tools.unit-converter.units.g', symbol: 'g', system: 'metric', ratio: 0.001 },
      { id: 'mg', nameKey: 'tools.unit-converter.units.mg', symbol: 'mg', system: 'metric', ratio: 1e-6 },
      { id: 'ug', nameKey: 'tools.unit-converter.units.ug', symbol: 'μg', system: 'metric', ratio: 1e-9 },
      { id: 'lb', nameKey: 'tools.unit-converter.units.lb', symbol: 'lb', system: 'imperial', ratio: 0.45359237 },
      { id: 'oz', nameKey: 'tools.unit-converter.units.oz', symbol: 'oz', system: 'imperial', ratio: 0.028349523125 },
      { id: 'gr', nameKey: 'tools.unit-converter.units.gr', symbol: 'gr', system: 'imperial', ratio: 0.00006479891 },
      { id: 'dan', nameKey: 'tools.unit-converter.units.dan', symbol: '担', system: 'chinese', ratio: 50 },
      { id: 'jin', nameKey: 'tools.unit-converter.units.jin', symbol: '斤', system: 'chinese', ratio: 0.5 },
      { id: 'liang', nameKey: 'tools.unit-converter.units.liang', symbol: '两', system: 'chinese', ratio: 0.05 },
      { id: 'qian', nameKey: 'tools.unit-converter.units.qian', symbol: '钱', system: 'chinese', ratio: 0.005 },
    ],
  },
  {
    id: 'volume',
    nameKey: 'tools.unit-converter.dimensions.volume',
    baseUnitId: 'l',
    units: [
      { id: 'm3', nameKey: 'tools.unit-converter.units.m3', symbol: 'm³', system: 'metric', ratio: 1000 },
      { id: 'l', nameKey: 'tools.unit-converter.units.l', symbol: 'L', system: 'metric', ratio: 1 },
      { id: 'dl', nameKey: 'tools.unit-converter.units.dl', symbol: 'dL', system: 'metric', ratio: 0.1 },
      { id: 'cl', nameKey: 'tools.unit-converter.units.cl', symbol: 'cL', system: 'metric', ratio: 0.01 },
      { id: 'ml', nameKey: 'tools.unit-converter.units.ml', symbol: 'mL', system: 'metric', ratio: 0.001 },
      { id: 'cu_ft', nameKey: 'tools.unit-converter.units.cu_ft', symbol: 'cu ft', system: 'imperial', ratio: 28.316846592 },
      { id: 'cu_in', nameKey: 'tools.unit-converter.units.cu_in', symbol: 'cu in', system: 'imperial', ratio: 0.016387064 },
      { id: 'gal_us', nameKey: 'tools.unit-converter.units.gal_us', symbol: 'gal (US)', system: 'imperial', ratio: 3.785411784 },
      { id: 'gal_uk', nameKey: 'tools.unit-converter.units.gal_uk', symbol: 'gal (UK)', system: 'imperial', ratio: 4.54609 },
      { id: 'pt_us', nameKey: 'tools.unit-converter.units.pt_us', symbol: 'pt (US)', system: 'imperial', ratio: 0.473176473 },
      { id: 'bbl_us', nameKey: 'tools.unit-converter.units.bbl_us', symbol: 'bbl (油桶)', system: 'other', ratio: 158.987294928 },
    ],
  },
  {
    id: 'velocity',
    nameKey: 'tools.unit-converter.dimensions.velocity',
    baseUnitId: 'm_s',
    units: [
      { id: 'm_s', nameKey: 'tools.unit-converter.units.m_s', symbol: 'm/s', system: 'metric', ratio: 1 },
      { id: 'km_h', nameKey: 'tools.unit-converter.units.km_h', symbol: 'km/h', system: 'metric', ratio: 1 / 3.6 },
      { id: 'mph', nameKey: 'tools.unit-converter.units.mph', symbol: 'mph', system: 'imperial', ratio: 0.44704 },
      { id: 'knot', nameKey: 'tools.unit-converter.units.knot', symbol: 'kn (节)', system: 'other', ratio: 1852 / 3600 },
      { id: 'ft_s', nameKey: 'tools.unit-converter.units.ft_s', symbol: 'ft/s', system: 'imperial', ratio: 0.3048 },
      { id: 'mach', nameKey: 'tools.unit-converter.units.mach', symbol: 'Mach (马赫)', system: 'other', ratio: 340.29 },
      { id: 'c', nameKey: 'tools.unit-converter.units.c', symbol: 'c (光速)', system: 'other', ratio: 299792458 },
    ],
  },
  {
    id: 'pressure',
    nameKey: 'tools.unit-converter.dimensions.pressure',
    baseUnitId: 'pa',
    units: [
      { id: 'mpa', nameKey: 'tools.unit-converter.units.mpa', symbol: 'MPa', system: 'metric', ratio: 1e6 },
      { id: 'kpa', nameKey: 'tools.unit-converter.units.kpa', symbol: 'kPa', system: 'metric', ratio: 1000 },
      { id: 'hpa', nameKey: 'tools.unit-converter.units.hpa', symbol: 'hPa', system: 'metric', ratio: 100 },
      { id: 'pa', nameKey: 'tools.unit-converter.units.pa', symbol: 'Pa', system: 'metric', ratio: 1 },
      { id: 'bar', nameKey: 'tools.unit-converter.units.bar', symbol: 'bar', system: 'other', ratio: 1e5 },
      { id: 'atm', nameKey: 'tools.unit-converter.units.atm', symbol: 'atm', system: 'other', ratio: 101325 },
      { id: 'mmhg', nameKey: 'tools.unit-converter.units.mmhg', symbol: 'mmHg', system: 'other', ratio: 133.322387415 },
      { id: 'psi', nameKey: 'tools.unit-converter.units.psi', symbol: 'psi', system: 'imperial', ratio: 6894.757293168 },
    ],
  },
  {
    id: 'power',
    nameKey: 'tools.unit-converter.dimensions.power',
    baseUnitId: 'w',
    units: [
      { id: 'mw', nameKey: 'tools.unit-converter.units.mw', symbol: 'MW', system: 'metric', ratio: 1e6 },
      { id: 'kw', nameKey: 'tools.unit-converter.units.kw', symbol: 'kW', system: 'metric', ratio: 1000 },
      { id: 'w', nameKey: 'tools.unit-converter.units.w', symbol: 'W', system: 'metric', ratio: 1 },
      { id: 'milliw', nameKey: 'tools.unit-converter.units.milliw', symbol: 'mW', system: 'metric', ratio: 0.001 },
      { id: 'hp_metric', nameKey: 'tools.unit-converter.units.hp_metric', symbol: 'ps (公制马力)', system: 'metric', ratio: 735.49875 },
      { id: 'hp_imperial', nameKey: 'tools.unit-converter.units.hp_imperial', symbol: 'hp (英制马力)', system: 'imperial', ratio: 745.69987158227022 },
      { id: 'btu_h', nameKey: 'tools.unit-converter.units.btu_h', symbol: 'BTU/h', system: 'imperial', ratio: 0.29307107 },
    ],
  },
  {
    id: 'energy',
    nameKey: 'tools.unit-converter.dimensions.energy',
    baseUnitId: 'j',
    units: [
      { id: 'kwh', nameKey: 'tools.unit-converter.units.kwh', symbol: 'kW·h (度)', system: 'metric', ratio: 3.6e6 },
      { id: 'mj', nameKey: 'tools.unit-converter.units.mj', symbol: 'MJ', system: 'metric', ratio: 1e6 },
      { id: 'kj', nameKey: 'tools.unit-converter.units.kj', symbol: 'kJ', system: 'metric', ratio: 1000 },
      { id: 'j', nameKey: 'tools.unit-converter.units.j', symbol: 'J', system: 'metric', ratio: 1 },
      { id: 'cal', nameKey: 'tools.unit-converter.units.cal', symbol: 'cal', system: 'metric', ratio: 4.184 },
      { id: 'kcal', nameKey: 'tools.unit-converter.units.kcal', symbol: 'kcal (大卡)', system: 'metric', ratio: 4184 },
      { id: 'ev', nameKey: 'tools.unit-converter.units.ev', symbol: 'eV', system: 'other', ratio: 1.602176634e-19 },
      { id: 'btu', nameKey: 'tools.unit-converter.units.btu', symbol: 'BTU', system: 'imperial', ratio: 1055.05585262 },
      { id: 'ft_lbf', nameKey: 'tools.unit-converter.units.ft_lbf', symbol: 'ft·lbf', system: 'imperial', ratio: 1.3558179483314004 },
    ],
  },
];

/**
 * 获取所有支持的物理维度
 */
export function getAllDimensions(): DimensionDefinition[] {
  return DIMENSIONS;
}

/**
 * 根据维度 ID 获取维度定义
 *
 * @param dimensionId 维度 ID
 */
export function getDimension(dimensionId: DimensionId): DimensionDefinition | undefined {
  return DIMENSIONS.find(d => d.id === dimensionId);
}

/**
 * 格式化数值展示
 *
 * @param val 数值
 * @param precision 保留小数位数
 * @param removeTrailingZeros 是否抹去末尾冗余 0
 */
export function formatUnitValue(
  val: number,
  precision = 6,
  removeTrailingZeros = true,
): { formatted: string; scientific: string } {
  if (isNaN(val) || !isFinite(val)) {
    return { formatted: '0', scientific: '0' };
  }

  const scientific = val.toExponential(4);

  // 若数值为 0
  if (val === 0) {
    return { formatted: '0', scientific: '0' };
  }

  const abs = Math.abs(val);

  // 极大或极小数值自动转为科学计数法呈现
  if (abs >= 1e15 || (abs < 1e-6 && abs > 0)) {
    return {
      formatted: val.toExponential(Math.min(precision, 6)),
      scientific,
    };
  }

  let formatted = val.toFixed(precision);
  if (removeTrailingZeros && formatted.includes('.')) {
    formatted = formatted.replace(/\.?0+$/, '');
  }

  return { formatted, scientific };
}

/**
 * 核心换算函数：给定某一维度的某一单位及数值，计算同维度下所有其他单位的值
 *
 * @param dimensionId 物理维度 ID
 * @param fromUnitId 来源单位 ID
 * @param value 输入数值
 * @param options 换算选项（精度与尾部零控制）
 */
export function convertDimension(
  dimensionId: DimensionId,
  fromUnitId: string,
  value: number,
  options: ConversionOptions = {},
): ConversionResultItem[] {
  const dimension = getDimension(dimensionId);
  if (!dimension) {
    return [];
  }

  const sourceUnit = dimension.units.find(u => u.id === fromUnitId);
  if (!sourceUnit) {
    return [];
  }

  // 1. 换算到基准 SI 单位: baseValue = value * sourceUnit.ratio
  const baseValue = value * sourceUnit.ratio;

  const precision = options.precision ?? 6;
  const removeTrailingZeros = options.removeTrailingZeros ?? true;

  // 2. 将基准单位折算到每个目标单位: targetValue = baseValue / targetUnit.ratio
  return dimension.units.map(targetUnit => {
    let targetVal = 0;
    if (targetUnit.id === fromUnitId) {
      targetVal = value;
    } else {
      targetVal = baseValue / targetUnit.ratio;
    }

    const { formatted, scientific } = formatUnitValue(targetVal, precision, removeTrailingZeros);

    return {
      id: targetUnit.id,
      symbol: targetUnit.symbol,
      name: targetUnit.nameKey,
      system: targetUnit.system,
      value: targetVal,
      formatted,
      scientific,
    };
  });
}
