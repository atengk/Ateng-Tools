/**
 * 位运算与字节透视计算器类型定义
 *
 * @author Ateng
 * @since 2026-10-01
 */

/** 支持的位宽类型 */
export type BitWidth = 8 | 16 | 32 | 64;

/** 支持的位逻辑操作符 */
export type BitwiseOperator =
  | 'AND'
  | 'OR'
  | 'XOR'
  | 'NOT'
  | 'LSHIFT'
  | 'RSHIFT'
  | 'URSHIFT';

/** 进制类型 */
export type NumberBase = 2 | 8 | 10 | 16;

/** 各进制格式化输出结果 */
export interface FormattedValues {
  /** 二进制字符串（含前导零） */
  bin: string
  /** 八进制字符串 */
  oct: string
  /** 十进制字符串（根据符号模式） */
  dec: string
  /** 十六进制大写字符串（含前导零） */
  hex: string
  /** 位布尔数组，索引 0 为最高位 (MSB) 还是最低位 (LSB) */
  bits: boolean[]
}
