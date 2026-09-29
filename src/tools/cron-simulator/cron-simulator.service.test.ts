/**
 * Cron 表达式解析与未来执行时间模拟服务单元测试
 *
 * @author Ateng
 * @since 2026-09-29
 */

import { describe, expect, it } from 'vitest';
import {
  detectCronDialect,
  formatDateTime,
  formatRelativeTime,
  simulateCron,
} from './cron-simulator.service';

describe('Cron 表达式模拟器服务 (cron-simulator.service)', () => {
  const baseTime = new Date('2026-09-29T10:00:00');

  describe('方言与字段数自适应检测 (detectCronDialect)', () => {
    it('正确识别 5 字段 Linux Crontab', () => {
      const res = detectCronDialect('*/15 * * * *');
      expect(res.dialect).toBe('linux');
      expect(res.tokens).toHaveLength(5);
    });

    it('正确识别 6 字段 Spring/Quartz', () => {
      const res = detectCronDialect('0 0 12 * * ?');
      expect(res.dialect).toBe('spring');
      expect(res.tokens).toHaveLength(6);
    });

    it('正确识别 7 字段带年份 Quartz', () => {
      const res = detectCronDialect('0 0 0 1 1 ? 2027');
      expect(res.dialect).toBe('quartz');
      expect(res.tokens).toHaveLength(7);
    });
  });

  describe('未来执行时间推演 (simulateCron)', () => {
    it('推演 Linux 5 字段表达式执行序列 (*/15 * * * *)', () => {
      const res = simulateCron('*/15 * * * *', {
        baseTime,
        executionCount: 4,
      });

      expect(res.valid).toBe(true);
      expect(res.dialect).toBe('linux');
      expect(res.nextExecutions).toHaveLength(4);
      expect(res.nextExecutions[0].formatted).toBe('2026-09-29 10:15:00');
      expect(res.nextExecutions[1].formatted).toBe('2026-09-29 10:30:00');
      expect(res.nextExecutions[2].formatted).toBe('2026-09-29 10:45:00');
      expect(res.nextExecutions[3].formatted).toBe('2026-09-29 11:00:00');
    });

    it('推演 Spring 6 字段表达式 (0 0 12 * * ?)', () => {
      const res = simulateCron('0 0 12 * * ?', {
        baseTime,
        executionCount: 3,
      });

      expect(res.valid).toBe(true);
      expect(res.dialect).toBe('spring');
      expect(res.nextExecutions).toHaveLength(3);
      expect(res.nextExecutions[0].formatted).toBe('2026-09-29 12:00:00');
      expect(res.nextExecutions[1].formatted).toBe('2026-09-30 12:00:00');
      expect(res.nextExecutions[2].formatted).toBe('2026-10-01 12:00:00');
    });

    it('推演工作日过滤 (0 0 9 ? * MON-FRI)', () => {
      // 2026-10-02 是周五，接下来的 10-03/04 是周末，下一个工作日是 10-05 周一
      const friday = new Date('2026-10-02T10:00:00');
      const res = simulateCron('0 0 9 ? * MON-FRI', {
        baseTime: friday,
        executionCount: 2,
      });

      expect(res.valid).toBe(true);
      expect(res.nextExecutions[0].formatted).toBe('2026-10-05 09:00:00');
      expect(res.nextExecutions[0].dayOfWeek).toBe('星期一');
      expect(res.nextExecutions[1].formatted).toBe('2026-10-06 09:00:00');
    });

    it('推演月末最后一天 L 修饰符 (0 0 12 L * ?)', () => {
      const res = simulateCron('0 0 12 L * ?', {
        baseTime,
        executionCount: 2,
      });

      expect(res.valid).toBe(true);
      // 9月有30天，10月有31天
      expect(res.nextExecutions[0].formatted).toBe('2026-09-30 12:00:00');
      expect(res.nextExecutions[1].formatted).toBe('2026-10-31 12:00:00');
    });

    it('推演 7 字段年份约束 (0 0 0 1 1 ? 2027)', () => {
      const res = simulateCron('0 0 0 1 1 ? 2027', {
        baseTime,
        executionCount: 1,
      });

      expect(res.valid).toBe(true);
      expect(res.dialect).toBe('quartz');
      expect(res.nextExecutions[0].formatted).toBe('2027-01-01 00:00:00');
    });
  });

  describe('自然语言翻译与辅助计算', () => {
    it('正确生成中文自然语言解释', () => {
      const res = simulateCron('0 0 12 * * ?');
      expect(res.explanationZh).toBeTruthy();
      expect(res.explanationZh).toContain('12:00');
    });

    it('计算相对时间', () => {
      const now = new Date('2026-09-29T10:00:00');
      const tenMinLater = new Date('2026-09-29T10:10:00');
      const twoHoursLater = new Date('2026-09-29T12:00:00');

      expect(formatRelativeTime(tenMinLater, now)).toBe('10 分钟后');
      expect(formatRelativeTime(twoHoursLater, now)).toBe('2 小时后');
    });

    it('格式化日期时间字符串', () => {
      expect(formatDateTime(new Date('2026-09-29T08:05:09'))).toBe('2026-09-29 08:05:09');
    });
  });

  describe('异常边界与熔断防护', () => {
    it('空表达式安全处理', () => {
      const res = simulateCron('');
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('分段数不足或过多时安全报错', () => {
      const res = simulateCron('* * *');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('分段数异常');
    });
  });
});
