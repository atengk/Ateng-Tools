/**
 * 人民币大写金额转换器核心类型定义与契约
 *
 * @author Ateng
 * @since 2026-10-02
 */

export type RmbIntegerSuffix = '整' | '正' | '';
export type RmbRoundMode = 'round' | 'truncate';

export interface RmbConvertOptions {
  /**
   * 是否添加“人民币”前缀
   * @default false
   */
  showPrefix?: boolean;

  /**
   * 整数元或角分无后续时的结尾词
   * @default '整'
   */
  integerSuffix?: RmbIntegerSuffix;

  /**
   * 分以下小数位处理模式（四舍五入或直接截断）
   * @default 'round'
   */
  roundMode?: RmbRoundMode;
}

export interface RmbConvertResult {
  /** 纯大写金额（如：壹万贰仟叁佰肆拾伍元陆角柒分） */
  words: string;

  /** 带“人民币”前缀的大写金额 */
  prefixedWords: string;

  /** 财务发票/合同规范模板文本 */
  standardTemplate: string;

  /** 解析后的标准化数值 */
  numericValue: number;

  /** 格式化后的千分位金额（如：12,345.67） */
  formattedNumber: string;

  /** 是否为负数 */
  isNegative: boolean;

  /** 拆解结构（整数、角、分） */
  breakdown: {
    integerPart: string;
    jiao: string;
    fen: string;
  };
}

export interface RmbParseResult {
  /** 是否成功解析 */
  success: boolean;

  /** 解析后的数值 */
  amount: number;

  /** 格式化后的千分位金额 */
  formattedNumber: string;

  /** 错误信息 */
  errorMessage?: string;
}
