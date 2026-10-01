/**
 * 条形码编码与矢量渲染纯函数服务
 *
 * @author Ateng
 * @since 2026-10-01
 */
import type {
  BarcodeFormat,
  BarcodeRenderOptions,
  BarcodeResult,
} from './barcode-generator.types';

// ======================== 1. CODE 128 编码映射表 ========================
// Code 128 标准 107 个符号的条宽宽度序列 (3 根条 + 3 根空，总和为 11；终止符总和为 13)
const CODE128_WIDTHS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112', // 106 为终止符号
];

function widthsToPattern(widths: string): string {
  let pattern = '';
  for (let i = 0; i < widths.length; i++) {
    const w = Number(widths[i]);
    const char = i % 2 === 0 ? '1' : '0';
    pattern += char.repeat(w);
  }
  return pattern;
}

// ======================== 2. EAN / UPC 编码映射表 ========================
// EAN-13 L 编码 (奇校验)
const EAN_L: string[] = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
];

// EAN-13 G 编码 (偶校验)
const EAN_G: string[] = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
];

// EAN-13 R 编码
const EAN_R: string[] = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
];

// EAN-13 首位数字对应的左侧 6 位模式组合 ('L' 或 'G')
const EAN_PARITY_MAP: string[] = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
];

// ======================== 3. CODE 39 映射表 ========================
const CODE39_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
const CODE39_PATTERNS: string[] = [
  '100100001', '001100001', '000110001', '000100101', '100010001',
  '001010001', '000011001', '100000101', '001000101', '000010101',
  '100100000', '001100000', '000110000', '100010000', '001010000',
  '000011000', '100000100', '001000100', '000010100', '000000110',
  '110000000', '011000000', '010010000', '110010000', '010001000',
  '110001000', '010000100', '110000100', '010000010', '110000010',
  '101000000', '001000000', '000001000', '000000010', '100000010',
  '000010000', '001000010', '000100010', '000001010', '000000100',
  '010101000', '010100010', '010001010', '000101010',
];
const CODE39_START_STOP = '010010100'; // '*'

/**
 * 校验指定条形码文本的格式合法性并补充校验码
 *
 * @param text 输入文本
 * @param format 编码标准
 * @returns 校验结果与规范化后的编码文本
 */
export function validateAndNormalizeText(
  text: string,
  format: BarcodeFormat,
): { isValid: boolean; error?: string; normalizedText: string } {
  if (!text || !text.trim()) {
    return { isValid: false, error: '请输入待编码内容', normalizedText: '' };
  }

  const raw = text.trim();

  switch (format) {
    case 'CODE128': {
      // Code 128B 支持 ASCII 32 ~ 126
      for (let i = 0; i < raw.length; i++) {
        const code = raw.charCodeAt(i);
        if (code < 32 || code > 126) {
          return { isValid: false, error: 'Code 128 仅支持标准 ASCII 字符 (32~126)', normalizedText: '' };
        }
      }
      return { isValid: true, normalizedText: raw };
    }

    case 'EAN13': {
      const digitsOnly = raw.replace(/\D/g, '');
      if (digitsOnly.length !== 12 && digitsOnly.length !== 13) {
        return { isValid: false, error: 'EAN-13 必须由 12 位或 13 位纯数字构成', normalizedText: '' };
      }
      const data12 = digitsOnly.slice(0, 12);
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const d = Number(data12[i]);
        sum += i % 2 === 0 ? d : d * 3;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      if (digitsOnly.length === 13 && Number(digitsOnly[12]) !== checkDigit) {
        return { isValid: false, error: `EAN-13 校验位错误（输入为 ${digitsOnly[12]}，预期为 ${checkDigit}）`, normalizedText: '' };
      }
      return { isValid: true, normalizedText: `${data12}${checkDigit}` };
    }

    case 'EAN8': {
      const digitsOnly = raw.replace(/\D/g, '');
      if (digitsOnly.length !== 7 && digitsOnly.length !== 8) {
        return { isValid: false, error: 'EAN-8 必须由 7 位或 8 位纯数字构成', normalizedText: '' };
      }
      const data7 = digitsOnly.slice(0, 7);
      let sum = 0;
      for (let i = 0; i < 7; i++) {
        const d = Number(data7[i]);
        sum += i % 2 === 0 ? d * 3 : d;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      if (digitsOnly.length === 8 && Number(digitsOnly[7]) !== checkDigit) {
        return { isValid: false, error: `EAN-8 校验位错误（输入为 ${digitsOnly[7]}，预期为 ${checkDigit}）`, normalizedText: '' };
      }
      return { isValid: true, normalizedText: `${data7}${checkDigit}` };
    }

    case 'UPCA': {
      const digitsOnly = raw.replace(/\D/g, '');
      if (digitsOnly.length !== 11 && digitsOnly.length !== 12) {
        return { isValid: false, error: 'UPC-A 必须由 11 位或 12 位纯数字构成', normalizedText: '' };
      }
      const data11 = digitsOnly.slice(0, 11);
      let sum = 0;
      for (let i = 0; i < 11; i++) {
        const d = Number(data11[i]);
        sum += i % 2 === 0 ? d * 3 : d;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      if (digitsOnly.length === 12 && Number(digitsOnly[11]) !== checkDigit) {
        return { isValid: false, error: `UPC-A 校验位错误（输入为 ${digitsOnly[11]}，预期为 ${checkDigit}）`, normalizedText: '' };
      }
      return { isValid: true, normalizedText: `${data11}${checkDigit}` };
    }

    case 'CODE39': {
      const upper = raw.toUpperCase();
      for (let i = 0; i < upper.length; i++) {
        if (!CODE39_CHARS.includes(upper[i])) {
          return { isValid: false, error: `Code 39 包含非法字符 '${upper[i]}'，支持 0-9、A-Z、空格及 -. $/+%`, normalizedText: '' };
        }
      }
      return { isValid: true, normalizedText: upper };
    }

    case 'ITF14': {
      const digitsOnly = raw.replace(/\D/g, '');
      if (digitsOnly.length !== 13 && digitsOnly.length !== 14) {
        return { isValid: false, error: 'ITF-14 必须由 13 位或 14 位纯数字构成', normalizedText: '' };
      }
      const data13 = digitsOnly.slice(0, 13);
      let sum = 0;
      for (let i = 0; i < 13; i++) {
        const d = Number(data13[i]);
        sum += i % 2 === 0 ? d * 3 : d;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      return { isValid: true, normalizedText: `${data13}${checkDigit}` };
    }

    default:
      return { isValid: false, error: '不支持的条形码格式', normalizedText: '' };
  }
}

/**
 * 将规范化后的文本编译为二进制条空位序列 ('1' 代表条黑柱，'0' 代表空白槽)
 *
 * @param text 规范文本
 * @param format 目标编码格式
 * @returns 二进制条序列
 */
export function encodeToBinaryPattern(text: string, format: BarcodeFormat): string {
  switch (format) {
    case 'CODE128': {
      // 1. 起始符 Start B (值 104)
      let pattern = widthsToPattern(CODE128_WIDTHS[104]);
      let checksum = 104;

      // 2. 依次编译字符并累加校验和
      for (let i = 0; i < text.length; i++) {
        const val = text.charCodeAt(i) - 32;
        pattern += widthsToPattern(CODE128_WIDTHS[val]);
        checksum += (i + 1) * val;
      }

      // 3. 计算 Mod 103 校验码并拼装终止符号 (值 106)
      const checkVal = checksum % 103;
      pattern += widthsToPattern(CODE128_WIDTHS[checkVal]);
      pattern += widthsToPattern(CODE128_WIDTHS[106]);
      return pattern;
    }

    case 'EAN13': {
      const first = Number(text[0]);
      const leftParity = EAN_PARITY_MAP[first];
      let pattern = '101'; // 起始保护符

      // 左侧 6 位
      for (let i = 1; i <= 6; i++) {
        const d = Number(text[i]);
        pattern += leftParity[i - 1] === 'L' ? EAN_L[d] : EAN_G[d];
      }

      pattern += '01010'; // 分隔符

      // 右侧 6 位
      for (let i = 7; i <= 12; i++) {
        const d = Number(text[i]);
        pattern += EAN_R[d];
      }

      pattern += '101'; // 终止保护符
      return pattern;
    }

    case 'EAN8': {
      let pattern = '101';
      for (let i = 0; i < 4; i++) {
        const d = Number(text[i]);
        pattern += EAN_L[d];
      }
      pattern += '01010';
      for (let i = 4; i < 8; i++) {
        const d = Number(text[i]);
        pattern += EAN_R[d];
      }
      pattern += '101';
      return pattern;
    }

    case 'UPCA': {
      // UPC-A 12 位可直接作为 0 + 12 位的 EAN-13 编码
      return encodeToBinaryPattern(`0${text}`, 'EAN13');
    }

    case 'CODE39': {
      // 辅助函数：将 9 位宽窄序列映射为 3:1 比例的条空模式
      function mapCode39(rawPattern: string): string {
        let p = '';
        for (let i = 0; i < 9; i++) {
          const isWide = rawPattern[i] === '1';
          const isBar = i % 2 === 0;
          const char = isBar ? '1' : '0';
          p += isWide ? char.repeat(3) : char;
        }
        return p;
      }

      let pattern = mapCode39(CODE39_START_STOP) + '0';
      for (let i = 0; i < text.length; i++) {
        const idx = CODE39_CHARS.indexOf(text[i]);
        pattern += mapCode39(CODE39_PATTERNS[idx]) + '0';
      }
      pattern += mapCode39(CODE39_START_STOP);
      return pattern;
    }

    case 'ITF14': {
      // 5 种宽窄组合 (2 宽 3 窄)
      const itfWeights = [
        '00110', '10001', '01001', '11000', '00101',
        '10100', '01100', '00011', '10010', '01010',
      ];
      let pattern = '1010'; // 开始码
      for (let i = 0; i < text.length; i += 2) {
        const bChar = itfWeights[Number(text[i])];
        const sChar = itfWeights[Number(text[i + 1])];
        for (let j = 0; j < 5; j++) {
          pattern += (bChar[j] === '1' ? '111' : '1');
          pattern += (sChar[j] === '1' ? '000' : '0');
        }
      }
      pattern += '1101'; // 停止码
      return pattern;
    }
  }
}

/**
 * 完整生成条形码矢量 SVG 与元数据
 *
 * @param text 输入文本
 * @param options 渲染配置
 * @returns 完整的生成结果对象
 */
export function generateBarcodeSvg(
  text: string,
  options: BarcodeRenderOptions,
): BarcodeResult {
  // 1. 验证格式与补齐校验位
  const validation = validateAndNormalizeText(text, options.format);
  if (!validation.isValid) {
    return {
      isValid: false,
      error: validation.error,
      rawText: text,
      encodedText: '',
      svg: '',
      totalWidth: 0,
      totalHeight: 0,
    };
  }

  // 2. 编译为二进制条位
  const binary = encodeToBinaryPattern(validation.normalizedText, options.format);

  // 3. 计算画板尺寸
  const {
    barWidth,
    height: barHeight,
    color,
    background,
    margin,
    showText,
    fontSize,
  } = options;

  const codeWidth = binary.length * barWidth;
  const textHeight = showText ? fontSize + 8 : 0;
  const totalWidth = codeWidth + margin * 2;
  const totalHeight = barHeight + margin * 2 + textHeight;

  // 4. 生成条形码连续矩形路径
  let rects = '';
  let inBar = false;
  let startX = 0;

  for (let i = 0; i < binary.length; i++) {
    const isOne = binary[i] === '1';
    if (isOne && !inBar) {
      inBar = true;
      startX = margin + i * barWidth;
    }
    else if (!isOne && inBar) {
      inBar = false;
      const w = margin + i * barWidth - startX;
      rects += `<rect x="${startX}" y="${margin}" width="${w}" height="${barHeight}" fill="${color}" />`;
    }
  }
  if (inBar) {
    const w = margin + binary.length * barWidth - startX;
    rects += `<rect x="${startX}" y="${margin}" width="${w}" height="${barHeight}" fill="${color}" />`;
  }

  // 5. 生成底部明文文字
  let textElement = '';
  if (showText) {
    const textY = margin + barHeight + fontSize + 2;
    const textX = totalWidth / 2;
    textElement = `<text x="${textX}" y="${textY}" fill="${color}" font-family="monospace, monospace" font-size="${fontSize}" font-weight="600" text-anchor="middle">${validation.normalizedText}</text>`;
  }

  // 6. 拼装为标准 SVG
  const bgRect = background && background !== 'transparent'
    ? `<rect width="${totalWidth}" height="${totalHeight}" fill="${background}" />`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">${bgRect}${rects}${textElement}</svg>`;

  return {
    isValid: true,
    rawText: text,
    encodedText: validation.normalizedText,
    svg,
    totalWidth,
    totalHeight,
  };
}
