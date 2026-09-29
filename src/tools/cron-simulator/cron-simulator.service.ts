/**
 * Cron 表达式解析与未来执行时间模拟器核心服务
 *
 * @author Ateng
 * @since 2026-09-29
 */

import cronstrue from 'cronstrue';
import 'cronstrue/locales/zh_CN';
import {
  type CronDialect,
  type CronExecutionItem,
  type CronFieldInfo,
  type CronSimulateOptions,
  type CronSimulateResult,
  DEFAULT_CRON_SIMULATE_OPTIONS,
} from './cron-simulator.models';

const MONTH_NAMES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const DAY_NAMES: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

const WEEKDAY_ZH = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

/**
 * 格式化日期为 YYYY-MM-DD HH:mm:ss 字符串
 *
 * @param date 日期对象
 * @returns 格式化字符串
 */
export function formatDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 计算目标时间相对基准时间的友好中文描述
 *
 * @param target 目标时间
 * @param base 基准时间
 * @returns 相对时间文本（如 5分钟后、2天后）
 */
export function formatRelativeTime(target: Date, base: Date): string {
  const diffSec = Math.floor((target.getTime() - base.getTime()) / 1000);
  if (diffSec <= 0) {
    return '即将执行';
  }
  if (diffSec < 60) {
    return `${diffSec} 秒后`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} 分钟后`;
  }
  const diffHour = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  if (diffHour < 24) {
    return remMin > 0 ? `${diffHour} 小时 ${remMin} 分钟后` : `${diffHour} 小时后`;
  }
  const diffDay = Math.floor(diffHour / 24);
  const remHour = diffHour % 24;
  return remHour > 0 ? `${diffDay} 天 ${remHour} 小时后` : `${diffDay} 天后`;
}

/**
 * 智能探测 Cron 表达式的方言体系与字段数量
 *
 * @param expression Cron 表达式
 * @returns 方言和分词段
 */
export function detectCronDialect(expression: string): { dialect: CronDialect; tokens: string[] } {
  const trimmed = expression.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  if (tokens.length === 5) {
    return { dialect: 'linux', tokens };
  }
  if (tokens.length === 6) {
    return { dialect: 'spring', tokens };
  }
  return { dialect: 'quartz', tokens };
}

/**
 * 解析并构建字段拆解信息详情列表
 *
 * @param tokens 分词段
 * @param dialect 方言
 * @returns 字段信息列表
 */
export function buildFieldInfoList(tokens: string[], dialect: CronDialect): CronFieldInfo[] {
  if (dialect === 'linux' || tokens.length === 5) {
    return [
      { name: '分钟', key: 'minute', value: tokens[0] || '*', allowedRange: '0 - 59' },
      { name: '小时', key: 'hour', value: tokens[1] || '*', allowedRange: '0 - 23' },
      { name: '日期', key: 'dayOfMonth', value: tokens[2] || '*', allowedRange: '1 - 31' },
      { name: '月份', key: 'month', value: tokens[3] || '*', allowedRange: '1 - 12 或 JAN-DEC' },
      { name: '星期', key: 'dayOfWeek', value: tokens[4] || '*', allowedRange: '0 - 7 (0/7=周日) 或 SUN-SAT' },
    ];
  }

  const fields: CronFieldInfo[] = [
    { name: '秒', key: 'second', value: tokens[0] || '0', allowedRange: '0 - 59' },
    { name: '分钟', key: 'minute', value: tokens[1] || '*', allowedRange: '0 - 59' },
    { name: '小时', key: 'hour', value: tokens[2] || '*', allowedRange: '0 - 23' },
    { name: '日期', key: 'dayOfMonth', value: tokens[3] || '*', allowedRange: '1 - 31, ?, L, W' },
    { name: '月份', key: 'month', value: tokens[4] || '*', allowedRange: '1 - 12 或 JAN-DEC' },
    { name: '星期', key: 'dayOfWeek', value: tokens[5] || '*', allowedRange: '1 - 7 (1=周日) 或 SUN-SAT, ?, L, #' },
  ];

  if (tokens.length >= 7) {
    fields.push({
      name: '年份',
      key: 'year',
      value: tokens[6] || '*',
      allowedRange: '1970 - 2099',
    });
  }

  return fields;
}

/**
 * 解析单个数值子段，支持别名与数字转换
 *
 * @param val 字符值
 * @param namesMap 英文名称映射字典
 * @returns 数值
 */
function parseTokenVal(val: string, namesMap?: Record<string, number>): number {
  const upper = val.toUpperCase();
  if (namesMap && namesMap[upper] !== undefined) {
    return namesMap[upper];
  }
  const n = Number.parseInt(val, 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * 创建通用数字/范围匹配器函数
 *
 * @param pattern 单个字段的表达式模式
 * @param min 允许最小值
 * @param max 允许最大值
 * @param namesMap 别名字典
 * @returns 匹配测试函数
 */
function createNumberMatcher(
  pattern: string,
  min: number,
  max: number,
  namesMap?: Record<string, number>,
): (val: number) => boolean {
  if (pattern === '*' || pattern === '?') {
    return () => true;
  }

  const parts = pattern.split(',');
  const matchers = parts.map((part) => {
    // 1. 步进形式 */5 或 10-20/2
    if (part.includes('/')) {
      const [rangePart, stepStr] = part.split('/');
      const step = Number.parseInt(stepStr, 10) || 1;
      let start = min;
      let end = max;

      if (rangePart && rangePart !== '*') {
        if (rangePart.includes('-')) {
          const [rStart, rEnd] = rangePart.split('-');
          start = parseTokenVal(rStart, namesMap);
          end = parseTokenVal(rEnd, namesMap);
        } else {
          start = parseTokenVal(rangePart, namesMap);
        }
      }
      return (val: number) => val >= start && val <= end && (val - start) % step === 0;
    }

    // 2. 范围形式 10-20
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseTokenVal(startStr, namesMap);
      const end = parseTokenVal(endStr, namesMap);
      return (val: number) => val >= start && val <= end;
    }

    // 3. 精确数值
    const exact = parseTokenVal(part, namesMap);
    return (val: number) => val === exact;
  });

  return (val: number) => matchers.some(m => m(val));
}

/**
 * 校验并推演 Cron 表达式未来执行时间序列
 *
 * @param expression 待模拟的 Cron 表达式
 * @param customOptions 模拟选项配置
 * @returns 综合分析与推演结果
 */
export function simulateCron(
  expression: string,
  customOptions: Partial<CronSimulateOptions> = {},
): CronSimulateResult {
  const options: CronSimulateOptions = {
    ...DEFAULT_CRON_SIMULATE_OPTIONS,
    ...customOptions,
  };

  const trimmed = expression.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: '请输入 Cron 表达式',
      dialect: 'spring',
      fieldCount: 0,
      explanationZh: '',
      explanationEn: '',
      fields: [],
      nextExecutions: [],
    };
  }

  const { dialect, tokens } = detectCronDialect(trimmed);
  const fieldCount = tokens.length;

  if (fieldCount < 5 || fieldCount > 7) {
    return {
      valid: false,
      error: `Cron 表达式分段数异常（当前为 ${fieldCount} 段，标准格式为 5、6 或 7 段）`,
      dialect,
      fieldCount,
      explanationZh: '',
      explanationEn: '',
      fields: [],
      nextExecutions: [],
    };
  }

  // 1. 中英文自然语言直译
  let explanationZh = '';
  let explanationEn = '';

  try {
    explanationZh = cronstrue.toString(trimmed, {
      locale: 'zh_CN',
      use24HourTimeFormat: true,
      dayOfWeekStartIndexZero: dialect === 'linux',
      throwExceptionOnParseError: true,
    });
  } catch (err: any) {
    explanationZh = '表达式语法有效，但包含复杂规则无法直译为简明中文';
  }

  try {
    explanationEn = cronstrue.toString(trimmed, {
      use24HourTimeFormat: true,
      dayOfWeekStartIndexZero: dialect === 'linux',
    });
  } catch {
    explanationEn = '';
  }

  const fields = buildFieldInfoList(tokens, dialect);

  // 2. 字段模式标准化为 7 字段结构：秒 分 时 日 月 周 年
  let secPat = '0';
  let minPat = '*';
  let hourPat = '*';
  let domPat = '*';
  let monPat = '*';
  let dowPat = '*';
  let yearPat = '*';

  if (dialect === 'linux' || fieldCount === 5) {
    secPat = '0';
    minPat = tokens[0];
    hourPat = tokens[1];
    domPat = tokens[2];
    monPat = tokens[3];
    dowPat = tokens[4];
    yearPat = '*';
  } else {
    secPat = tokens[0];
    minPat = tokens[1];
    hourPat = tokens[2];
    domPat = tokens[3];
    monPat = tokens[4];
    dowPat = tokens[5];
    yearPat = tokens[6] || '*';
  }

  // 3. 构建各个字段的基础匹配测试器
  const matchSec = createNumberMatcher(secPat, 0, 59);
  const matchMin = createNumberMatcher(minPat, 0, 59);
  const matchHour = createNumberMatcher(hourPat, 0, 23);
  const matchMon = createNumberMatcher(monPat, 1, 12, MONTH_NAMES);
  const matchYear = createNumberMatcher(yearPat, 1970, 2099);

  // 日期与星期匹配器
  const isDomWildcard = domPat === '*' || domPat === '?';
  const isDowWildcard = dowPat === '*' || dowPat === '?';

  function matchDom(day: number, year: number, monthIndex: number): boolean {
    if (domPat === '*' || domPat === '?') return true;
    if (domPat === 'L') {
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      return day === lastDay;
    }
    const standardMatcher = createNumberMatcher(domPat, 1, 31);
    return standardMatcher(day);
  }

  function matchDow(dayOfWeek: number, year: number, monthIndex: number, dayOfMonth: number): boolean {
    if (dowPat === '*' || dowPat === '?') return true;

    // 处理 Spring/Quartz 中 1=SUN, 2=MON... 与 0-6 的映射
    const normalizedDow = dialect === 'linux' ? dayOfWeek : (dayOfWeek === 0 ? 7 : dayOfWeek);

    // 处理 L (周最后一天)
    if (dowPat.endsWith('L')) {
      const targetDow = Number.parseInt(dowPat.slice(0, -1), 10);
      const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
      const isWithinLastWeek = dayOfMonth > lastDayOfMonth - 7;
      return isWithinLastWeek && (dayOfWeek === targetDow || normalizedDow === targetDow);
    }

    // 处理 # (第 N 个星期几，如 2#1 为第一个周一)
    if (dowPat.includes('#')) {
      const [dStr, nStr] = dowPat.split('#');
      const targetDow = parseTokenVal(dStr, DAY_NAMES);
      const targetN = Number.parseInt(nStr, 10);
      const currentN = Math.floor((dayOfMonth - 1) / 7) + 1;
      return currentN === targetN && (dayOfWeek === targetDow || normalizedDow === targetDow);
    }

    const matcher = createNumberMatcher(dowPat, 0, 7, DAY_NAMES);
    return matcher(dayOfWeek) || matcher(normalizedDow);
  }

  // 4. 执行时间推演主循环（带跳步加速与安全熔断）
  const baseDate = options.baseTime ? new Date(options.baseTime) : new Date();
  const nextExecutions: CronExecutionItem[] = [];

  const current = new Date(baseDate.getTime());
  current.setMilliseconds(0);

  // 如果是 5 字段 Linux，秒强制对齐到 0，并前进一步
  if (dialect === 'linux' || fieldCount === 5) {
    current.setSeconds(0);
    current.setMinutes(current.getMinutes() + 1);
  } else {
    current.setSeconds(current.getSeconds() + 1);
  }

  const maxYear = 2099;
  let iterations = 0;
  const maxIterations = 20000;

  while (nextExecutions.length < options.executionCount && iterations < maxIterations) {
    iterations++;

    // 1) 校验年份
    const curYear = current.getFullYear();
    if (curYear > maxYear) {
      break;
    }
    if (!matchYear(curYear)) {
      current.setFullYear(curYear + 1, 0, 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    // 2) 校验月份 (1 - 12)
    const curMon = current.getMonth() + 1;
    if (!matchMon(curMon)) {
      current.setMonth(current.getMonth() + 1, 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    // 3) 校验日期与星期
    const curDayOfMonth = current.getDate();
    const curDayOfWeek = current.getDay();

    let dayMatches = false;
    if (isDomWildcard && isDowWildcard) {
      dayMatches = true;
    } else if (isDomWildcard) {
      dayMatches = matchDow(curDayOfWeek, curYear, current.getMonth(), curDayOfMonth);
    } else if (isDowWildcard) {
      dayMatches = matchDom(curDayOfMonth, curYear, current.getMonth());
    } else {
      // 双方均指定时：在 Linux 下取并集，在 Quartz 下通常取交集
      dayMatches = matchDom(curDayOfMonth, curYear, current.getMonth()) && matchDow(curDayOfWeek, curYear, current.getMonth(), curDayOfMonth);
    }

    if (!dayMatches) {
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    // 4) 校验小时
    const curHour = current.getHours();
    if (!matchHour(curHour)) {
      current.setHours(curHour + 1, 0, 0, 0);
      continue;
    }

    // 5) 校验分钟
    const curMin = current.getMinutes();
    if (!matchMin(curMin)) {
      current.setMinutes(curMin + 1, 0, 0);
      continue;
    }

    // 6) 校验秒
    const curSec = current.getSeconds();
    if (!matchSec(curSec)) {
      current.setSeconds(curSec + 1, 0);
      continue;
    }

    // 匹配命中！录入结果序列
    const hitDate = new Date(current.getTime());
    nextExecutions.push({
      index: nextExecutions.length + 1,
      date: hitDate,
      formatted: formatDateTime(hitDate),
      dayOfWeek: WEEKDAY_ZH[hitDate.getDay()],
      relativeTime: formatRelativeTime(hitDate, baseDate),
    });

    // 推进基准步长准备查找下一个时刻
    if (dialect === 'linux' || fieldCount === 5) {
      current.setMinutes(current.getMinutes() + 1);
    } else {
      current.setSeconds(current.getSeconds() + 1);
    }
  }

  return {
    valid: true,
    dialect,
    fieldCount,
    explanationZh,
    explanationEn,
    fields,
    nextExecutions,
  };
}
