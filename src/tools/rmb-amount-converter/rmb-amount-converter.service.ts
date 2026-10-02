/**
 * 人民币大写金额转换与反向解析纯函数服务
 *
 * @author Ateng
 * @since 2026-10-02
 */

import type {
  RmbConvertOptions,
  RmbConvertResult,
  RmbParseResult,
} from './rmb-amount-converter.types';

const CHINESE_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const SECTION_UNITS = ['', '万', '亿', '兆'];
const SMALL_UNITS = ['', '拾', '佰', '仟'];

const MAX_SUPPORTED_AMOUNT = 999999999999999.99; // 999万亿

/**
 * 格式化数值为标准千分位字符串（两位小数）
 *
 * @param amount 数值或数字字符串
 * @returns 格式化后的千分位字符串
 */
export function formatAmountWithCommas(amount: number | string): string {
  const num = typeof amount === 'number' ? amount : Number.parseFloat(String(amount).replace(/,/g, ''));
  if (Number.isNaN(num)) {
    return '0.00';
  }
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${isNeg ? '-' : ''}${formattedInt}.${decPart}`;
}

/**
 * 将 4 位以内的节字符串（如 "2345", "5", "100"）转为大写中文
 *
 * @param chunk 1~4 位的数字字符串
 * @returns 节内大写中文
 */
function convertChunkToWords(chunk: string): string {
  const len = chunk.length;
  let result = '';
  let prevZero = false;

  for (let i = 0; i < len; i++) {
    const digit = Number.parseInt(chunk[i], 10);
    const unit = SMALL_UNITS[len - 1 - i];

    if (digit === 0) {
      if (!prevZero && result.length > 0) {
        result += '零';
      }
      prevZero = true;
    } else {
      result += CHINESE_DIGITS[digit] + unit;
      prevZero = false;
    }
  }

  // 移除节末尾的“零”
  return result.replace(/零$/, '');
}

/**
 * 阿拉伯数字金额转换为中文金融大写金额
 *
 * @param input 输入的金额数值或字符串
 * @param options 转换选项配置
 * @returns 转换结果模型
 */
export function numberToRmbWords(
  input: number | string,
  options: RmbConvertOptions = {},
): RmbConvertResult {
  const { showPrefix = false, integerSuffix = '整', roundMode = 'round' } = options;

  const rawStr = String(input).trim().replace(/,/g, '').replace(/￥/g, '').replace(/¥/g, '');
  const parsedNum = Number.parseFloat(rawStr);

  if (Number.isNaN(parsedNum)) {
    throw new Error('请输入有效的数字金额');
  }

  if (Math.abs(parsedNum) > MAX_SUPPORTED_AMOUNT) {
    throw new Error('超出支持的最大金额范围（支持千亿与万亿级）');
  }

  const isNegative = parsedNum < 0;
  const absNum = Math.abs(parsedNum);

  // 分以下小数处理
  let totalFen = 0;
  if (roundMode === 'truncate') {
    totalFen = Math.floor(Math.round(absNum * 1000) / 10);
  } else {
    totalFen = Math.round(absNum * 100);
  }

  const integerAmount = Math.floor(totalFen / 100);
  const jiaoDigit = Math.floor((totalFen % 100) / 10);
  const fenDigit = totalFen % 10;

  // 1. 零元特殊处理
  if (totalFen === 0) {
    const baseZero = `零元${integerSuffix}`;
    const words = isNegative ? `负${baseZero}` : baseZero;
    const formatted = formatAmountWithCommas(parsedNum);
    return {
      words,
      prefixedWords: `${showPrefix ? '人民币' : ''}${words}`,
      standardTemplate: `人民币（大写）：${words}（¥${formatted}）`,
      numericValue: parsedNum,
      formattedNumber: formatted,
      isNegative,
      breakdown: { integerPart: '零元', jiao: '', fen: '' },
    };
  }

  // 2. 整数部分按 4 位分组切分
  let integerWords = '';
  if (integerAmount > 0) {
    const intStr = String(integerAmount);
    // 从低位到高位每 4 位切一块
    const chunks: string[] = [];
    let end = intStr.length;
    while (end > 0) {
      const start = Math.max(0, end - 4);
      chunks.push(intStr.substring(start, end));
      end = start;
    }

    // chunks[0]: 个级, chunks[1]: 万级, chunks[2]: 亿级, chunks[3]: 兆级
    let zeroPending = false;

    for (let i = chunks.length - 1; i >= 0; i--) {
      const chunk = chunks[i];
      const chunkNum = Number.parseInt(chunk, 10);
      const sectionUnit = SECTION_UNITS[i];

      if (chunkNum === 0) {
        // 全零节（如万位全为 0）
        if (i === 2 && chunks.length > 2) {
          // 亿节为 0 但有更高节时，需保留“亿”
          integerWords += '亿';
        }
        zeroPending = true;
      } else {
        const chunkWords = convertChunkToWords(chunk);
        // 如果前面有全零节或当前节有前导零（小于1000且非最高节），需要补“零”
        const hasLeadingZero = chunk.length === 4 && chunk.startsWith('0');
        if ((zeroPending || hasLeadingZero) && integerWords.length > 0 && !integerWords.endsWith('零')) {
          integerWords += '零';
        }

        integerWords += chunkWords + sectionUnit;
        zeroPending = chunk.endsWith('0');
      }
    }

    integerWords = integerWords.replace(/零+/g, '零').replace(/零$/, '');
    if (integerWords) {
      integerWords += '元';
    }
  }

  // 3. 小数角分部分转换
  let fractionWords = '';
  let jiaoStr = '';
  let fenStr = '';

  if (jiaoDigit === 0 && fenDigit === 0) {
    fractionWords = integerSuffix;
  } else {
    if (jiaoDigit > 0) {
      jiaoStr = CHINESE_DIGITS[jiaoDigit] + '角';
    } else if (integerAmount > 0 && fenDigit > 0) {
      jiaoStr = '零';
    }

    if (fenDigit > 0) {
      fenStr = CHINESE_DIGITS[fenDigit] + '分';
    } else if (jiaoDigit > 0 && integerSuffix) {
      fractionWords += integerSuffix;
    }

    fractionWords = jiaoStr + fenStr + fractionWords;
  }

  let finalWords = integerWords + fractionWords;
  if (!integerWords && fractionWords) {
    finalWords = fractionWords;
  }

  finalWords = finalWords.replace(/零+/g, '零');

  if (isNegative) {
    finalWords = '负' + finalWords;
  }

  const prefixedWords = (showPrefix ? '人民币' : '') + finalWords;
  const formattedNumber = formatAmountWithCommas(parsedNum);

  return {
    words: finalWords,
    prefixedWords,
    standardTemplate: `人民币（大写）：${finalWords}（¥${formattedNumber}）`,
    numericValue: parsedNum,
    formattedNumber,
    isNegative,
    breakdown: {
      integerPart: integerWords || '零元',
      jiao: jiaoStr,
      fen: fenStr,
    },
  };
}

/**
 * 将大写中文字符转换为对应数字
 */
const DIGIT_MAP: Record<string, number> = {
  零: 0,
  壹: 1,
  一: 1,
  贰: 2,
  二: 2,
  叁: 3,
  三: 3,
  肆: 4,
  四: 4,
  伍: 5,
  五: 5,
  陆: 6,
  六: 6,
  柒: 7,
  七: 7,
  捌: 8,
  八: 8,
  玖: 9,
  九: 9,
};

/**
 * 解析节内部中文（如“壹仟贰佰叁拾肆”）
 */
function parseSmallSection(text: string): number {
  let sectionVal = 0;
  let currentNum = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (DIGIT_MAP[char] !== undefined) {
      currentNum = DIGIT_MAP[char];
    } else if (char === '拾' || char === '十') {
      sectionVal += (currentNum === 0 ? 1 : currentNum) * 10;
      currentNum = 0;
    } else if (char === '佰' || char === '百') {
      sectionVal += currentNum * 100;
      currentNum = 0;
    } else if (char === '仟' || char === '千') {
      sectionVal += currentNum * 1000;
      currentNum = 0;
    }
  }
  sectionVal += currentNum;
  return sectionVal;
}

/**
 * 中文金融大写金额反向解析为阿拉伯数字
 *
 * @param words 中文大写金额字符串
 * @returns 解析结果
 */
export function rmbWordsToNumber(words: string): RmbParseResult {
  if (!words || typeof words !== 'string' || !words.trim()) {
    return {
      success: false,
      amount: 0,
      formattedNumber: '0.00',
      errorMessage: '输入不能为空',
    };
  }

  let cleanStr = words
    .trim()
    .replace(/\s+/g, '')
    .replace(/^人民币/g, '')
    .replace(/[（(].*?[)）]/g, '')
    .replace(/整$/g, '')
    .replace(/正$/g, '');

  let isNegative = false;
  if (cleanStr.startsWith('负')) {
    isNegative = true;
    cleanStr = cleanStr.substring(1);
  }

  if (cleanStr === '零' || cleanStr === '零元') {
    return {
      success: true,
      amount: 0,
      formattedNumber: '0.00',
    };
  }

  try {
    let intPartStr = cleanStr;
    let decPartStr = '';

    if (cleanStr.includes('元')) {
      const parts = cleanStr.split('元');
      intPartStr = parts[0];
      decPartStr = parts[1] || '';
    } else if (cleanStr.includes('角') || cleanStr.includes('分')) {
      intPartStr = '';
      decPartStr = cleanStr;
    }

    // 1. 计算整数部分
    let totalInt = 0;
    if (intPartStr) {
      let remaining = intPartStr;

      if (remaining.includes('兆')) {
        const [zhaoPart, rest] = remaining.split('兆');
        totalInt += parseSmallSection(zhaoPart) * 1000000000000;
        remaining = rest || '';
      }

      if (remaining.includes('亿')) {
        const [yiPart, rest] = remaining.split('亿');
        totalInt += parseSmallSection(yiPart) * 100000000;
        remaining = rest || '';
      }

      if (remaining.includes('万')) {
        const [wanPart, rest] = remaining.split('万');
        totalInt += parseSmallSection(wanPart) * 10000;
        remaining = rest || '';
      }

      if (remaining) {
        totalInt += parseSmallSection(remaining);
      }
    }

    // 2. 计算小数部分
    let totalDec = 0;
    if (decPartStr) {
      let currentVal = 0;
      for (let i = 0; i < decPartStr.length; i++) {
        const char = decPartStr[i];
        if (DIGIT_MAP[char] !== undefined) {
          currentVal = DIGIT_MAP[char];
        } else if (char === '角') {
          totalDec += currentVal * 0.1;
          currentVal = 0;
        } else if (char === '分') {
          totalDec += currentVal * 0.01;
          currentVal = 0;
        }
      }
    }

    const finalAmount = Math.round((totalInt + totalDec) * 100) / 100;
    const signedAmount = isNegative ? -finalAmount : finalAmount;

    return {
      success: true,
      amount: signedAmount,
      formattedNumber: formatAmountWithCommas(signedAmount),
    };
  } catch (err) {
    return {
      success: false,
      amount: 0,
      formattedNumber: '0.00',
      errorMessage: err instanceof Error ? err.message : '解析大写金额失败，请检查格式',
    };
  }
}
