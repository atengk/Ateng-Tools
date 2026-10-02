/**
 * 中国居民身份证透视器核心类型定义与契约
 *
 * @author Ateng
 * @since 2026-10-02
 */

export interface IdCardValidationResult {
  /** 身份证是否完全合法有效（格式、生日与校验位均通过） */
  isValid: boolean;

  /** 是否为15位第一代身份证 */
  is15Digit: boolean;

  /** 标准化后的18位号码（若输入15位，则为升级转换后的18位） */
  normalizedId: string;

  /** 格式与校验错误原因（如无则为空） */
  errorMessage?: string;

  /** 校验码是否匹配（仅18位） */
  checksumMatches: boolean;

  /** 期望的校验位字符（18位根据MOD 11-2推导） */
  expectedChecksum: string;

  /** 实际提供的校验位字符 */
  actualChecksum: string;
}

export interface IdCardDetails {
  /** 身份证号码（原始格式） */
  rawNumber: string;

  /** 标准化18位号码 */
  standardNumber: string;

  /** 所属省级行政区名称 */
  province: string;

  /** 所属地级市行政区名称 */
  city: string;

  /** 完整行政区划名称描述 */
  fullRegion: string;

  /** 出生日期格式化（YYYY-MM-DD） */
  birthDate: string;

  /** 出生年份 */
  birthYear: number;

  /** 出生月份 */
  birthMonth: number;

  /** 出生日期 */
  birthDay: number;

  /** 周岁年龄 */
  age: number;

  /** 虚岁年龄 */
  nominalAge: number;

  /** 生理性别枚举 */
  gender: 'male' | 'female';

  /** 中文性别标签（男/女） */
  genderText: '男' | '女';

  /** 中文生肖（鼠、牛、虎、兔...） */
  chineseZodiac: string;

  /** 西方十二星座 */
  constellation: string;

  /** 顺序码（第15-17位） */
  sequenceCode: string;

  /** 校验码（第18位） */
  checksum: string;

  /** 是否为15位一代证 */
  is15Digit: boolean;

  /** 脱敏掩码格式推荐 */
  masks: {
    /** 常用前6后4掩码（110101********1234） */
    front6Back4: string;
    /** 掩盖出生年月日（110101********1234） */
    hideBirthday: string;
    /** 掩盖前6位地域信息（******199001011234） */
    hideRegion: string;
  };
}

export interface IdCardInspectionReport {
  validation: IdCardValidationResult;
  details?: IdCardDetails;
}

export interface IdCardMockOptions {
  /** 指定省份代码（前2位，如 '11' 为北京），不传则随机 */
  provinceCode?: string;

  /** 指定性别，不传则随机 */
  gender?: 'male' | 'female';

  /** 最小年龄，默认 18 */
  minAge?: number;

  /** 最大年龄，默认 65 */
  maxAge?: number;

  /** 生成数量，默认 5，上限 50 */
  count?: number;
}
