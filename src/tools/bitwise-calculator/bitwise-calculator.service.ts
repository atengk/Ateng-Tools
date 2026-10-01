/**
 * 位运算与字节透视计算器核心纯函数服务
 *
 * @author Ateng
 * @since 2026-10-01
 */
import type {
  BitWidth,
  BitwiseOperator,
  FormattedValues,
  NumberBase,
} from './bitwise-calculator.types';

/**
 * 将数值规范化为对应位宽的无符号 BigInt
 *
 * @param val 输入数值
 * @param width 位宽 (8, 16, 32, 64)
 * @returns 截断并归一化的无符号 BigInt
 */
export function clampToWidth(val: bigint, width: BitWidth): bigint {
  return BigInt.asUintN(width, val);
}

/**
 * 解析用户输入的字符串为对应位宽的无符号 BigInt
 *
 * @param input 原始文本输入
 * @param base 进制基数 (2, 8, 10, 16)
 * @param width 目标位宽
 * @returns 解析后的无符号 BigInt，非法输入时返回 0n
 */
export function parseInput(input: string, base: NumberBase, width: BitWidth): bigint {
  if (!input || !input.trim()) {
    return 0n;
  }

  const clean = input.trim();

  try {
    let parsed: bigint;
    if (base === 16) {
      const sanitized = clean.replace(/^0x/i, '').replace(/[\s_]/g, '');
      if (!sanitized) {
        return 0n;
      }
      parsed = BigInt(`0x${sanitized}`);
    }
    else if (base === 2) {
      const sanitized = clean.replace(/^0b/i, '').replace(/[\s_]/g, '');
      if (!sanitized) {
        return 0n;
      }
      parsed = BigInt(`0b${sanitized}`);
    }
    else if (base === 8) {
      const sanitized = clean.replace(/^0o/i, '').replace(/[\s_]/g, '');
      if (!sanitized) {
        return 0n;
      }
      parsed = BigInt(`0o${sanitized}`);
    }
    else {
      // 10 进制支持负数解析 (如 -1 转换为 0xFF / 0xFFFF 等)
      const sanitized = clean.replace(/[\s_]/g, '');
      if (!sanitized || sanitized === '-') {
        return 0n;
      }
      parsed = BigInt(sanitized);
    }

    return clampToWidth(parsed, width);
  }
  catch {
    return 0n;
  }
}

/**
 * 格式化输出为各进制字符串与位布尔数组
 *
 * @param val 无符号数值
 * @param width 当前位宽
 * @param signed 是否采用有符号十进制展示
 * @returns 包含各进制文本与二进制位布尔列表的对象
 */
export function formatValue(val: bigint, width: BitWidth, signed = false): FormattedValues {
  const unsigned = clampToWidth(val, width);

  // 1. 基础进制字符串
  const hexPadLength = width / 4;
  const hex = unsigned.toString(16).toUpperCase().padStart(hexPadLength, '0');
  const bin = unsigned.toString(2).padStart(width, '0');
  const oct = unsigned.toString(8);

  // 2. 十进制（区分有符号与无符号）
  const dec = signed
    ? BigInt.asIntN(width, unsigned).toString(10)
    : unsigned.toString(10);

  // 3. 构建位布尔列表 (从第 0 位 LSB 到第 width-1 位 MSB)
  const bits: boolean[] = [];
  for (let i = 0; i < width; i++) {
    const isSet = ((unsigned >> BigInt(i)) & 1n) === 1n;
    bits.push(isSet);
  }

  return {
    hex,
    bin,
    oct,
    dec,
    bits,
  };
}

/**
 * 翻转指定索引位置的单一二进制位 (0 -> 1 或 1 -> 0)
 *
 * @param val 当前无符号数值
 * @param bitIndex 位索引 (0 为最低位 LSB)
 * @param width 当前位宽
 * @returns 翻转后的无符号 BigInt
 */
export function toggleBit(val: bigint, bitIndex: number, width: BitWidth): bigint {
  if (bitIndex < 0 || bitIndex >= width) {
    return clampToWidth(val, width);
  }

  // 1. 构造目标位的位掩码
  const mask = 1n << BigInt(bitIndex);

  // 2. 异或运算并截断
  return clampToWidth(val ^ mask, width);
}

/**
 * 执行两个数值间的位逻辑运算
 *
 * @param op 运算符 (AND, OR, XOR, NOT, LSHIFT, RSHIFT, URSHIFT)
 * @param a 操作数 A
 * @param b 操作数 B (对单目运算符 NOT 忽略)
 * @param width 当前位宽
 * @param signed 是否按有符号模式执行算术右移
 * @returns 运算后的结果无符号 BigInt
 */
export function evaluateBitwise(
  op: BitwiseOperator,
  a: bigint,
  b: bigint,
  width: BitWidth,
  signed = false,
): bigint {
  const normA = clampToWidth(a, width);
  const normB = clampToWidth(b, width);

  switch (op) {
    case 'AND':
      return clampToWidth(normA & normB, width);
    case 'OR':
      return clampToWidth(normA | normB, width);
    case 'XOR':
      return clampToWidth(normA ^ normB, width);
    case 'NOT':
      return clampToWidth(~normA, width);
    case 'LSHIFT':
      return clampToWidth(normA << normB, width);
    case 'RSHIFT':
      if (signed) {
        // 算术右移保留符号位
        const signedA = BigInt.asIntN(width, normA);
        return clampToWidth(signedA >> normB, width);
      }
      return clampToWidth(normA >> normB, width);
    case 'URSHIFT':
      // 逻辑右移高位补零
      return clampToWidth(normA >> normB, width);
    default:
      return normA;
  }
}
