/**
 * Mock 随机业务数据生成纯函数服务
 *
 * @author Ateng
 * @since 2026-10-01
 */
import type { MockField, MockGenerateOptions } from './mock-data-generator.types';

// 1. 中文离线随机语料库
const CHINESE_SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙', '马', '朱', '胡', '林', '郭', '何', '高', '罗'];
const CHINESE_GIVEN_NAMES = ['伟', '芳', '娜', '敏', '静', '秀英', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '浩', '宇', '欣', '晨', '子轩', '梓涵', '欣怡'];
const ENGLISH_FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Sarah', 'Alex', 'Emily', 'Daniel', 'Emma'];
const ENGLISH_LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore'];
const CITIES = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '南京市', '苏州市', '西安市', '重庆市', '长沙市', '青岛市', '厦门市'];
const COMPANY_PREFIXES = ['华盛', '云图', '智联', '极光', '未来', '天启', '领航', '拓维', '中联', '恒信', '启迪', '创元'];
const COMPANY_SUFFIXES = ['科技有限公司', '网络技术有限公司', '数据服务有限公司', '智能软件有限公司', '信息安全技术有限公司'];
const EMAIL_DOMAINS = ['gmail.com', 'qq.com', '163.com', 'outlook.com', 'foxmail.com', 'hotmail.com'];
const PHONE_PREFIXES = ['138', '139', '150', '158', '177', '180', '186', '188', '199', '198'];

/** 随机选取数组单项 */
function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 生成区间内随机整数 [min, max] */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 生成符合 RFC 4122 v4 标准的 UUID */
export function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 依据字段配置生成单条随机值
 *
 * @param field 字段配置契约
 * @param rowIndex 当前行索引 (从 0 开始)
 * @returns 随机业务数据值
 */
export function generateFieldValue(field: MockField, rowIndex: number): any {
  const opt = field.options || {};

  switch (field.type) {
    case 'id':
      return (opt.startId ?? 1) + rowIndex;

    case 'uuid':
      return generateUuidV4();

    case 'cname':
      return `${sample(CHINESE_SURNAMES)}${sample(CHINESE_GIVEN_NAMES)}`;

    case 'ename':
      return `${sample(ENGLISH_FIRST_NAMES)} ${sample(ENGLISH_LAST_NAMES)}`;

    case 'phone': {
      const prefix = sample(PHONE_PREFIXES);
      const suffix = String(randomInt(10000000, 99999999));
      return `${prefix}${suffix}`;
    }

    case 'email': {
      const user = `${sample(ENGLISH_FIRST_NAMES).toLowerCase()}${randomInt(10, 999)}`;
      return `${user}@${sample(EMAIL_DOMAINS)}`;
    }

    case 'avatar':
      return `https://api.dicebear.com/7.x/identicon/svg?seed=${generateUuidV4().slice(0, 8)}`;

    case 'gender':
      return Math.random() > 0.5 ? '男' : '女';

    case 'age': {
      const min = opt.minAge ?? 18;
      const max = opt.maxAge ?? 60;
      return randomInt(min, max);
    }

    case 'city':
      return sample(CITIES);

    case 'company':
      return `${sample(COMPANY_PREFIXES)}${sample(COMPANY_SUFFIXES)}`;

    case 'amount': {
      const min = opt.minAmount ?? 10;
      const max = opt.maxAmount ?? 9999;
      const dec = opt.decimals ?? 2;
      const val = min + Math.random() * (max - min);
      return Number(val.toFixed(dec));
    }

    case 'datetime': {
      // 默认过去 90 天到未来的随机时间
      const now = Date.now();
      const past = now - 90 * 24 * 3600 * 1000;
      const randTime = randomInt(past, now);
      const d = new Date(randTime);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    }

    case 'boolean':
      return Math.random() > 0.5;

    case 'enum': {
      const list = opt.enumList && opt.enumList.length > 0
        ? opt.enumList
        : ['ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'];
      return sample(list);
    }

    case 'ip':
      return `${randomInt(1, 223)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;

    default:
      return `val_${rowIndex + 1}`;
  }
}

/**
 * 批量生成纯数据行列表
 *
 * @param fields 字段清单
 * @param count 记录行数
 * @returns 键值对对象数组
 */
export function generateMockRows(fields: MockField[], count: number): Record<string, any>[] {
  const rows: Record<string, any>[] = [];
  const safeCount = Math.max(1, Math.min(count, 10000));

  for (let i = 0; i < safeCount; i++) {
    const row: Record<string, any> = {};
    for (const f of fields) {
      row[f.name] = generateFieldValue(f, i);
    }
    rows.push(row);
  }

  return rows;
}

/**
 * 将数据行转换为格式化的 JSON 字符串
 */
export function rowsToJson(rows: Record<string, any>[]): string {
  return JSON.stringify(rows, null, 2);
}

/**
 * 将数据行转换为 CSV 纯文本
 */
export function rowsToCsv(fields: MockField[], rows: Record<string, any>[]): string {
  if (fields.length === 0 || rows.length === 0) return '';

  const headers = fields.map(f => `"${f.name.replace(/"/g, '""')}"`).join(',');
  const lines = rows.map((r) => {
    return fields
      .map((f) => {
        const val = r[f.name];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',');
  });

  return [headers, ...lines].join('\n');
}

/**
 * 将数据行转换为批量 SQL INSERT INTO 语句
 */
export function rowsToSqlInsert(
  tableName: string,
  fields: MockField[],
  rows: Record<string, any>[],
): string {
  if (fields.length === 0 || rows.length === 0) return '';

  const safeTable = tableName.trim() || 'mock_data';
  const fieldNames = fields.map(f => `\`${f.name}\``).join(', ');

  const valuesClauses = rows.map((r) => {
    const vals = fields.map((f) => {
      const val = r[f.name];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return String(val);
      if (typeof val === 'boolean') return val ? '1' : '0';
      const escaped = String(val).replace(/'/g, "''");
      return `'${escaped}'`;
    });
    return `  (${vals.join(', ')})`;
  });

  return `INSERT INTO \`${safeTable}\` (${fieldNames}) VALUES\n${valuesClauses.join(',\n')};`;
}

/**
 * 默认预设：用户业务数据表
 */
export const PRESET_USER_FIELDS: MockField[] = [
  { id: '1', name: 'id', type: 'id', comment: '自增主键', options: { startId: 1001 } },
  { id: '2', name: 'username', type: 'cname', comment: '用户姓名' },
  { id: '3', name: 'gender', type: 'gender', comment: '性别' },
  { id: '4', name: 'age', type: 'age', comment: '年龄', options: { minAge: 20, maxAge: 55 } },
  { id: '5', name: 'mobile', type: 'phone', comment: '联系电话' },
  { id: '6', name: 'email', type: 'email', comment: '电子邮箱' },
  { id: '7', name: 'city', type: 'city', comment: '常驻城市' },
  { id: '8', name: 'status', type: 'enum', comment: '账号状态', options: { enumList: ['NORMAL', 'LOCKED', 'EXPIRED'] } },
  { id: '9', name: 'created_at', type: 'datetime', comment: '注册时间' },
];

/**
 * 默认预设：订单交易业务表
 */
export const PRESET_ORDER_FIELDS: MockField[] = [
  { id: '1', name: 'order_no', type: 'uuid', comment: '全局唯一订单号' },
  { id: '2', name: 'customer_name', type: 'cname', comment: '下单客户姓名' },
  { id: '3', name: 'company', type: 'company', comment: '归属企业' },
  { id: '4', name: 'order_amount', type: 'amount', comment: '交易金额', options: { minAmount: 100, maxAmount: 50000, decimals: 2 } },
  { id: '5', name: 'pay_status', type: 'enum', comment: '支付状态', options: { enumList: ['PAID', 'UNPAID', 'REFUNDED'] } },
  { id: '6', name: 'client_ip', type: 'ip', comment: '下单客户端 IP' },
  { id: '7', name: 'order_time', type: 'datetime', comment: '下单时间' },
];
