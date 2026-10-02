/**
 * 中国居民身份证透视分析与校验纯函数服务
 *
 * @author Ateng
 * @since 2026-10-02
 */

import type {
  IdCardDetails,
  IdCardInspectionReport,
  IdCardMockOptions,
  IdCardValidationResult,
} from './chinese-id-card-inspector.types';

/**
 * ISO 7064:1983.MOD 11-2 加权因子常数表
 */
const MOD_11_2_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];

/**
 * MOD 11-2 余数对应校验码字典
 */
const MOD_11_2_CHECKSUM_MAP = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

/**
 * 省级行政区划代码表（GB/T 2260）
 */
export const PROVINCE_MAP: Record<string, string> = {
  11: '北京市',
  12: '天津市',
  13: '河北省',
  14: '山西省',
  15: '内蒙古自治区',
  21: '辽宁省',
  22: '吉林省',
  23: '黑龙江省',
  31: '上海市',
  32: '江苏省',
  33: '浙江省',
  34: '安徽省',
  35: '福建省',
  36: '江西省',
  37: '山东省',
  41: '河南省',
  42: '湖北省',
  43: '湖南省',
  44: '广东省',
  45: '广西壮族自治区',
  46: '海南省',
  50: '重庆市',
  51: '四川省',
  52: '贵州省',
  53: '云南省',
  54: '西藏自治区',
  61: '陕西省',
  62: '甘肃省',
  63: '青海省',
  64: '宁夏回族自治区',
  65: '新疆维吾尔自治区',
  71: '台湾省',
  81: '香港特别行政区',
  82: '澳门特别行政区',
};

/**
 * 紧凑地级市行政区划代码表（前4位）
 */
export const CITY_MAP: Record<string, string> = {
  // 直辖市
  1101: '市辖区',
  1201: '市辖区',
  3101: '市辖区',
  5001: '市辖区',
  5002: '郊县',
  // 河北
  1301: '石家庄市',
  1302: '唐山市',
  1303: '秦皇岛市',
  1304: '邯郸市',
  1305: '邢台市',
  1306: '保定市',
  1307: '张家口市',
  1308: '承德市',
  1309: '沧州市',
  1310: '廊坊市',
  1311: '衡水市',
  // 山西
  1401: '太原市',
  1402: '大同市',
  1403: '阳泉市',
  1404: '长治市',
  1405: '晋城市',
  1406: '朔州市',
  1407: '晋中市',
  1408: '运城市',
  1409: '忻州市',
  1410: '临汾市',
  1411: '吕梁市',
  // 内蒙古
  1501: '呼和浩特市',
  1502: '包头市',
  1503: '乌海市',
  1504: '赤峰市',
  1505: '通辽市',
  1506: '鄂尔多斯市',
  1507: '呼伦贝尔市',
  1508: '巴彦淖尔市',
  1509: '乌兰察布市',
  1522: '兴安盟',
  1525: '锡林郭勒盟',
  1529: '阿拉善盟',
  // 辽宁
  2101: '沈阳市',
  2102: '大连市',
  2103: '鞍山市',
  2104: '抚顺市',
  2105: '本溪市',
  2106: '丹东市',
  2107: '锦州市',
  2108: '营口市',
  2109: '阜新市',
  2110: '辽阳市',
  2111: '盘锦市',
  2112: '铁岭市',
  2113: '朝阳市',
  2114: '葫芦岛市',
  // 吉林
  2201: '长春市',
  2202: '吉林市',
  2203: '四平市',
  2204: '辽源市',
  2205: '通化市',
  2206: '白山市',
  2207: '松原市',
  2208: '白城市',
  2224: '延边朝鲜族自治州',
  // 黑龙江
  2301: '哈尔滨市',
  2302: '齐齐哈尔市',
  2303: '鸡西市',
  2304: '鹤岗市',
  2305: '双鸭山市',
  2306: '大庆市',
  2307: '伊春市',
  2308: '佳木斯市',
  2309: '七台河市',
  2310: '牡丹江市',
  2311: '黑河市',
  2312: '绥化市',
  2327: '大兴安岭地区',
  // 江苏
  3201: '南京市',
  3202: '无锡市',
  3203: '徐州市',
  3204: '常州市',
  3205: '苏州市',
  3206: '南通市',
  3207: '连云港市',
  3208: '淮安市',
  3209: '盐城市',
  3210: '扬州市',
  3211: '镇江市',
  3212: '泰州市',
  3213: '宿迁市',
  // 浙江
  3301: '杭州市',
  3302: '宁波市',
  3303: '温州市',
  3304: '嘉兴市',
  3305: '湖州市',
  3306: '绍兴市',
  3307: '金华市',
  3308: '衢州市',
  3309: '舟山市',
  3310: '台州市',
  3311: '丽水市',
  // 安徽
  3401: '合肥市',
  3402: '芜湖市',
  3403: '蚌埠市',
  3404: '淮南市',
  3405: '马鞍山市',
  3406: '淮北市',
  3407: '铜陵市',
  3408: '安庆市',
  3409: '黄山市',
  3410: '滁州市',
  3411: '阜阳市',
  3412: '宿州市',
  3413: '六安市',
  3414: '亳州市',
  3415: '池州市',
  3416: '宣城市',
  // 福建
  3501: '福州市',
  3502: '厦门市',
  3503: '莆田市',
  3504: '三明市',
  3505: '泉州市',
  3506: '漳州市',
  3507: '南平市',
  3508: '龙岩市',
  3509: '宁德市',
  // 江西
  3601: '南昌市',
  3602: '景德镇市',
  3603: '萍乡市',
  3604: '九江市',
  3605: '新余市',
  3606: '鹰潭市',
  3607: '赣州市',
  3608: '吉安市',
  3609: '宜春市',
  3610: '抚州市',
  3611: '上饶市',
  // 山东
  3701: '济南市',
  3702: '青岛市',
  3703: '淄博市',
  3704: '枣庄市',
  3705: '东营市',
  3706: '烟台市',
  3707: '潍坊市',
  3708: '济宁市',
  3709: '泰安市',
  3710: '威海市',
  3711: '日照市',
  3713: '临沂市',
  3714: '德州市',
  3715: '聊城市',
  3716: '滨州市',
  3717: '菏泽市',
  // 河南
  4101: '郑州市',
  4102: '开封市',
  4103: '洛阳市',
  4104: '平顶山市',
  4105: '安阳市',
  4106: '鹤壁市',
  4107: '新乡市',
  4108: '焦作市',
  4109: '濮阳市',
  4110: '许昌市',
  4111: '漯河市',
  4112: '三门峡市',
  4113: '南阳市',
  4114: '商丘市',
  4115: '信阳市',
  4116: '周口市',
  4117: '驻马店市',
  // 湖北
  4201: '武汉市',
  4202: '黄石市',
  4203: '十堰市',
  4205: '宜昌市',
  4206: '襄阳市',
  4207: '鄂州市',
  4208: '荆门市',
  4209: '孝感市',
  4210: '荆州市',
  4211: '黄冈市',
  4212: '咸宁市',
  4213: '随州市',
  4228: '恩施土家族苗族自治州',
  // 湖南
  4301: '长沙市',
  4302: '株洲市',
  4303: '湘潭市',
  4304: '衡阳市',
  4305: '邵阳市',
  4306: '岳阳市',
  4307: '常德市',
  4308: '张家界市',
  4309: '益阳市',
  4310: '郴州市',
  4311: '永州市',
  4312: '怀化市',
  4313: '娄底市',
  4331: '湘西土家族苗族自治州',
  // 广东
  4401: '广州市',
  4402: '韶关市',
  4403: '深圳市',
  4404: '珠海市',
  4405: '汕头市',
  4406: '佛山市',
  4407: '江门市',
  4408: '湛江市',
  4409: '茂名市',
  4412: '肇庆市',
  4413: '惠州市',
  4414: '梅州市',
  4415: '汕尾市',
  4416: '河源市',
  4417: '阳江市',
  4418: '清远市',
  4419: '东莞市',
  4420: '中山市',
  4451: '潮州市',
  4452: '揭阳市',
  4453: '云浮市',
  // 广西
  4501: '南宁市',
  4502: '柳州市',
  4503: '桂林市',
  4504: '梧州市',
  4505: '北海市',
  4506: '防城港市',
  4507: '钦州市',
  4508: '贵港市',
  4509: '玉林市',
  4510: '百色市',
  4511: '贺州市',
  4512: '河池市',
  4513: '来宾市',
  4514: '崇左市',
  // 海南
  4601: '海口市',
  4602: '三亚市',
  4603: '三沙市',
  4604: '儋州市',
  // 四川
  5101: '成都市',
  5103: '自贡市',
  5104: '攀枝花市',
  5105: '泸州市',
  5106: '德阳市',
  5107: '绵阳市',
  5108: '广元市',
  5109: '遂宁市',
  5110: '内江市',
  5111: '乐山市',
  5113: '南充市',
  5114: '眉山市',
  5115: '宜宾市',
  5116: '广安市',
  5117: '达州市',
  5118: '雅安市',
  5119: '巴中市',
  5120: '资阳市',
  5132: '阿坝藏族羌族自治州',
  5133: '甘孜藏族自治州',
  5134: '凉山彝族自治州',
  // 贵州
  5201: '贵阳市',
  5202: '六盘水市',
  5203: '遵义市',
  5204: '安顺市',
  5205: '毕节市',
  5206: '铜仁市',
  5223: '黔西南布依族苗族自治州',
  5226: '黔东南苗族侗族自治州',
  5227: '黔南布依族苗族自治州',
  // 云南
  5301: '昆明市',
  5303: '曲靖市',
  5304: '玉溪市',
  5305: '保山市',
  5306: '昭通市',
  5307: '丽江市',
  5308: '普洱市',
  5309: '临沧市',
  5323: '楚雄彝族自治州',
  5325: '红河哈尼族彝族自治州',
  5326: '文山壮族苗族自治州',
  5328: '西双版纳傣族自治州',
  5329: '大理白族自治州',
  5331: '德宏傣族景颇族自治州',
  5333: '怒江傈僳族自治州',
  5334: '迪庆藏族自治州',
  // 西藏
  5401: '拉萨市',
  5402: '日喀则市',
  5403: '昌都市',
  5404: '林芝市',
  5405: '山南市',
  5406: '那曲市',
  5425: '阿里地区',
  // 陕西
  6101: '西安市',
  6102: '铜川市',
  6103: '宝鸡市',
  6104: '咸阳市',
  6105: '渭南市',
  6106: '延安市',
  6107: '汉中市',
  6108: '榆林市',
  6109: '安康市',
  6110: '商洛市',
  // 甘肃
  6201: '兰州市',
  6202: '嘉峪关市',
  6203: '金昌市',
  6204: '白银市',
  6205: '天水市',
  6206: '武威市',
  6207: '张掖市',
  6208: '平凉市',
  6209: '酒泉市',
  6210: '庆阳市',
  6211: '定西市',
  6212: '陇南市',
  6229: '临夏回族自治州',
  6230: '甘南藏族自治州',
  // 青海
  6301: '西宁市',
  6302: '海东市',
  6321: '海东地区',
  6322: '海北藏族自治州',
  6323: '黄南藏族自治州',
  6325: '海南藏族自治州',
  6326: '果洛藏族自治州',
  6327: '玉树藏族自治州',
  6328: '海西蒙古族藏族自治州',
  // 宁夏
  6401: '银川市',
  6402: '石嘴山市',
  6403: '吴忠市',
  6404: '固原市',
  6405: '中卫市',
  // 新疆
  6501: '乌鲁木齐市',
  6502: '克拉玛依市',
  6504: '吐鲁番市',
  6505: '哈密市',
  6523: '昌吉回族自治州',
  6527: '博尔塔拉蒙古自治州',
  6528: '巴音郭楞蒙古自治州',
  6529: '阿克苏地区',
  6530: '克孜勒苏柯尔克孜自治州',
  6531: '喀什地区',
  6532: '和田地区',
  6540: '伊犁哈萨克自治州',
  6542: '塔城地区',
  6543: '阿勒泰地区',
};

const ZODIAC_LIST = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

/**
 * 计算 17 位数字基于 ISO 7064:1983.MOD 11-2 的理论校验位
 *
 * @param first17Digits 前 17 位纯数字字符串
 * @returns 理论校验码字符（'0'~'9' 或 'X'）
 */
export function calculateMod112Checksum(first17Digits: string): string {
  if (!/^\d{17}$/.test(first17Digits)) {
    throw new Error('计算校验码需要精确 17 位数字');
  }

  let weightedSum = 0;
  for (let i = 0; i < 17; i++) {
    weightedSum += Number.parseInt(first17Digits[i], 10) * MOD_11_2_WEIGHTS[i];
  }

  const remainder = weightedSum % 11;
  return MOD_11_2_CHECKSUM_MAP[remainder];
}

/**
 * 升级 15 位一代身份证至 18 位标准身份证
 *
 * @param id15 15 位身份证号
 * @returns 升级后的 18 位身份证号
 */
export function convert15To18(id15: string): string {
  if (!/^\d{15}$/.test(id15)) {
    throw new Error('无效的 15 位身份证号码');
  }

  // 前 6 位 + 插入 "19" + 后 9 位
  const first17 = id15.substring(0, 6) + '19' + id15.substring(6);
  const checksum = calculateMod112Checksum(first17);
  return first17 + checksum;
}

/**
 * 校验生日合法性（支持平闰年判定、不能为未来时间、不能早于 1900 年）
 *
 * @param year 出生年份
 * @param month 出生月份 (1~12)
 * @param day 出生日期 (1~31)
 * @returns 是否为真实有效日期
 */
export function isValidBirthDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const daysInMonth = [
    31,
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (day > daysInMonth[month - 1]) {
    return false;
  }

  const birth = new Date(year, month - 1, day);
  const now = new Date();

  // 严禁未来出生日期
  if (birth.getTime() > now.getTime()) {
    return false;
  }

  return true;
}

/**
 * 根据生日推算所属生肖
 *
 * @param year 出生年份
 * @returns 生肖中文名
 */
export function getChineseZodiac(year: number): string {
  // 1900 年为鼠年，(1900 - 4) % 12 === 0
  const index = Math.abs((year - 4) % 12);
  return ZODIAC_LIST[index];
}

/**
 * 根据月份与日期推算黄道十二星座
 *
 * @param month 月份 (1~12)
 * @param day 日期 (1~31)
 * @returns 星座中文名
 */
export function getConstellation(month: number, day: number): string {
  const dates = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22];
  const constellations = [
    '摩羯座',
    '水瓶座',
    '双鱼座',
    '白羊座',
    '金牛座',
    '双子座',
    '巨蟹座',
    '狮子座',
    '处女座',
    '天秤座',
    '天蝎座',
    '射手座',
    '摩羯座',
  ];
  return day < dates[month - 1] ? constellations[month - 1] : constellations[month];
}

/**
 * 计算周岁年龄与虚岁年龄
 *
 * @param year 出生年份
 * @param month 出生月份 (1~12)
 * @param day 出生日期 (1~31)
 * @returns { age: 周岁, nominalAge: 虚岁 }
 */
export function calculateAge(
  year: number,
  month: number,
  day: number,
): { age: number; nominalAge: number } {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const nowDay = now.getDate();

  let age = nowYear - year;
  if (nowMonth < month || (nowMonth === month && nowDay < day)) {
    age--;
  }

  const nominalAge = nowYear - year + 1;
  return { age: Math.max(0, age), nominalAge: Math.max(1, nominalAge) };
}

/**
 * 身份证号码脱敏处理
 *
 * @param id 18 位身份证号码
 * @param mode 脱敏模式
 * @returns 脱敏后的字符串
 */
export function maskIdCard(
  id: string,
  mode: 'front6Back4' | 'hideBirthday' | 'hideRegion' = 'front6Back4',
): string {
  if (id.length !== 18) {
    return id;
  }
  if (mode === 'hideRegion') {
    return '******' + id.substring(6);
  }
  // 隐藏生日与前6后4相同：前6位 + 8位星号 + 后4位
  return id.substring(0, 6) + '********' + id.substring(14);
}

/**
 * 完整透视与合规校验身份证号码
 *
 * @param rawInput 用户输入的身份证字符串
 * @returns 透视检验报告
 */
export function inspectIdCard(rawInput: string): IdCardInspectionReport {
  const cleanId = String(rawInput || '')
    .trim()
    .toUpperCase();

  // 1. 基础格式检查
  if (!cleanId) {
    return {
      validation: {
        isValid: false,
        is15Digit: false,
        normalizedId: '',
        checksumMatches: false,
        expectedChecksum: '',
        actualChecksum: '',
        errorMessage: '身份证号码不能为空',
      },
    };
  }

  const is15 = /^\d{15}$/.test(cleanId);
  const is18 = /^\d{17}[\dX]$/.test(cleanId);

  if (!is15 && !is18) {
    return {
      validation: {
        isValid: false,
        is15Digit: false,
        normalizedId: cleanId,
        checksumMatches: false,
        expectedChecksum: '',
        actualChecksum: '',
        errorMessage: '身份证格式错误（必须为 15 位数字或 18 位带校验码）',
      },
    };
  }

  // 2. 标准化为 18 位并判定校验位
  let standard18 = cleanId;
  let expectedChecksum = '';
  let actualChecksum = '';
  let checksumMatches = true;

  if (is15) {
    standard18 = convert15To18(cleanId);
    expectedChecksum = standard18[17];
    actualChecksum = '—';
  } else {
    expectedChecksum = calculateMod112Checksum(cleanId.substring(0, 17));
    actualChecksum = cleanId[17];
    checksumMatches = expectedChecksum === actualChecksum;
  }

  // 3. 提取行政区划
  const provinceCode = standard18.substring(0, 2);
  const cityCode = standard18.substring(0, 4);

  const province = PROVINCE_MAP[provinceCode];
  if (!province) {
    return {
      validation: {
        isValid: false,
        is15Digit: is15,
        normalizedId: standard18,
        checksumMatches,
        expectedChecksum,
        actualChecksum,
        errorMessage: `无效的行政区划代码（前两位省份代码 ${provinceCode} 不存在）`,
      },
    };
  }

  const city = CITY_MAP[cityCode] || '其他地区/直管县';
  const fullRegion = `${province} ${city}`;

  // 4. 提取出生日期并校验
  const birthYear = Number.parseInt(standard18.substring(6, 10), 10);
  const birthMonth = Number.parseInt(standard18.substring(10, 12), 10);
  const birthDay = Number.parseInt(standard18.substring(12, 14), 10);

  if (!isValidBirthDate(birthYear, birthMonth, birthDay)) {
    return {
      validation: {
        isValid: false,
        is15Digit: is15,
        normalizedId: standard18,
        checksumMatches,
        expectedChecksum,
        actualChecksum,
        errorMessage: `无效的出生日期（${birthYear}年${birthMonth}月${birthDay}日 不合法或为未来时间）`,
      },
    };
  }

  // 5. 校验码最终核验
  if (!is15 && !checksumMatches) {
    return {
      validation: {
        isValid: false,
        is15Digit: false,
        normalizedId: standard18,
        checksumMatches: false,
        expectedChecksum,
        actualChecksum,
        errorMessage: `MOD 11-2 校验码不匹配（输入为 ${actualChecksum}，按算法计算应为 ${expectedChecksum}）`,
      },
    };
  }

  // 6. 提取年龄、性别、生肖、星座
  const { age, nominalAge } = calculateAge(birthYear, birthMonth, birthDay);
  const genderCode = Number.parseInt(standard18[16], 10);
  const gender: 'male' | 'female' = genderCode % 2 !== 0 ? 'male' : 'female';
  const genderText: '男' | '女' = gender === 'male' ? '男' : '女';

  const chineseZodiac = getChineseZodiac(birthYear);
  const constellation = getConstellation(birthMonth, birthDay);

  const birthDateFormatted = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

  const details: IdCardDetails = {
    rawNumber: cleanId,
    standardNumber: standard18,
    province,
    city,
    fullRegion,
    birthDate: birthDateFormatted,
    birthYear,
    birthMonth,
    birthDay,
    age,
    nominalAge,
    gender,
    genderText,
    chineseZodiac,
    constellation,
    sequenceCode: standard18.substring(14, 17),
    checksum: standard18[17],
    is15Digit: is15,
    masks: {
      front6Back4: maskIdCard(standard18, 'front6Back4'),
      hideBirthday: maskIdCard(standard18, 'hideBirthday'),
      hideRegion: maskIdCard(standard18, 'hideRegion'),
    },
  };

  return {
    validation: {
      isValid: true,
      is15Digit: is15,
      normalizedId: standard18,
      checksumMatches: true,
      expectedChecksum,
      actualChecksum,
    },
    details,
  };
}

/**
 * 随机生成用于开发测试的合法虚拟身份证号码
 *
 * @param options 生成选项
 * @returns 虚拟身份证列表
 */
export function generateMockIdCards(options: IdCardMockOptions = {}): string[] {
  const {
    provinceCode,
    gender,
    minAge = 18,
    maxAge = 65,
    count = 5,
  } = options;

  const results: string[] = [];
  const nowYear = new Date().getFullYear();

  const provinceKeys = Object.keys(PROVINCE_MAP).filter(
    (k) => k !== '71' && k !== '81' && k !== '82', // 优先大陆常用地市
  );

  const cityKeys = Object.keys(CITY_MAP);

  const targetCount = Math.min(Math.max(1, count), 50);

  for (let c = 0; c < targetCount; c++) {
    // 1. 确定前 4 位城市
    let chosenCity = '';
    if (provinceCode && PROVINCE_MAP[provinceCode]) {
      const matchCities = cityKeys.filter((k) => k.startsWith(provinceCode));
      chosenCity = matchCities.length > 0
        ? matchCities[Math.floor(Math.random() * matchCities.length)]
        : `${provinceCode}01`;
    } else {
      const randomProvince = provinceKeys[Math.floor(Math.random() * provinceKeys.length)];
      const matchCities = cityKeys.filter((k) => k.startsWith(randomProvince));
      chosenCity = matchCities.length > 0
        ? matchCities[Math.floor(Math.random() * matchCities.length)]
        : `${randomProvince}01`;
    }

    // 后两位县区随机 (01~30)
    const district = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const regionCode = chosenCity + district;

    // 2. 年龄与生日
    const targetAge = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
    const birthYear = nowYear - targetAge;
    const birthMonth = Math.floor(Math.random() * 12) + 1;
    const maxDays = birthMonth === 2 ? 28 : [4, 6, 9, 11].includes(birthMonth) ? 30 : 31;
    const birthDay = Math.floor(Math.random() * maxDays) + 1;

    const birthStr = `${birthYear}${String(birthMonth).padStart(2, '0')}${String(birthDay).padStart(2, '0')}`;

    // 3. 顺序码 (3位)，根据性别调整最后一位奇偶
    let seq12 = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
    let seqGender = Math.floor(Math.random() * 9);
    if (gender === 'male' && seqGender % 2 === 0) {
      seqGender = (seqGender + 1) % 10;
    } else if (gender === 'female' && seqGender % 2 !== 0) {
      seqGender = (seqGender + 1) % 10;
    }

    const first17 = regionCode + birthStr + seq12 + seqGender;
    const checksum = calculateMod112Checksum(first17);
    results.push(first17 + checksum);
  }

  return results;
}
