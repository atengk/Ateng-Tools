/**
 * Mock 随机业务数据生成服务单元测试
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { describe, expect, it } from 'vitest';
import {
  PRESET_ORDER_FIELDS,
  PRESET_USER_FIELDS,
  generateFieldValue,
  generateMockRows,
  generateUuidV4,
  rowsToCsv,
  rowsToJson,
  rowsToSqlInsert,
} from './mock-data-generator.service';
import type { MockField } from './mock-data-generator.types';

describe('mock-data-generator.service', () => {
  it('正确生成标准 UUID v4', () => {
    const uuid = generateUuidV4();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('针对不同字段类型生成合规业务数据', () => {
    const idField: MockField = { id: '1', name: 'id', type: 'id', options: { startId: 100 } };
    expect(generateFieldValue(idField, 0)).toBe(100);
    expect(generateFieldValue(idField, 5)).toBe(105);

    const phoneField: MockField = { id: '2', name: 'phone', type: 'phone' };
    const phone = generateFieldValue(phoneField, 0);
    expect(phone).toMatch(/^1[35789]\d{9}$/);

    const emailField: MockField = { id: '3', name: 'email', type: 'email' };
    const email = generateFieldValue(emailField, 0);
    expect(email).toContain('@');

    const amountField: MockField = { id: '4', name: 'amount', type: 'amount', options: { minAmount: 10, maxAmount: 20, decimals: 2 } };
    const amt = generateFieldValue(amountField, 0);
    expect(amt).toBeGreaterThanOrEqual(10);
    expect(amt).toBeLessThanOrEqual(20);

    const enumField: MockField = { id: '5', name: 'status', type: 'enum', options: { enumList: ['A', 'B'] } };
    expect(['A', 'B']).toContain(generateFieldValue(enumField, 0));
  });

  it('批量生成记录行并输出为合法 JSON', () => {
    const rows = generateMockRows(PRESET_USER_FIELDS, 5);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveProperty('username');
    expect(rows[0]).toHaveProperty('mobile');

    const json = rowsToJson(rows);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(5);
    expect(parsed[0].id).toBe(1001);
  });

  it('导出为合法 SQL 批量 INSERT 脚本', () => {
    const rows = [
      { id: 1, name: "Alice's Book", active: true },
      { id: 2, name: 'Bob', active: false },
    ];
    const fields: MockField[] = [
      { id: '1', name: 'id', type: 'id' },
      { id: '2', name: 'name', type: 'cname' },
      { id: '3', name: 'active', type: 'boolean' },
    ];

    const sql = rowsToSqlInsert('t_user', fields, rows);
    expect(sql).toContain('INSERT INTO `t_user` (`id`, `name`, `active`) VALUES');
    expect(sql).toContain("'Alice''s Book'");
    expect(sql).toContain('(1,');
    expect(sql).toContain('(2,');
  });

  it('导出为标准 CSV 纯文本', () => {
    const rows = [
      { code: '001', title: 'Hello, World' },
      { code: '002', title: 'Line\nBreak' },
    ];
    const fields: MockField[] = [
      { id: '1', name: 'code', type: 'id' },
      { id: '2', name: 'title', type: 'cname' },
    ];

    const csv = rowsToCsv(fields, rows);
    expect(csv).toContain('"code","title"');
    expect(csv).toContain('"001","Hello, World"');
  });

  it('支持预设订单数据结构', () => {
    const rows = generateMockRows(PRESET_ORDER_FIELDS, 3);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveProperty('order_no');
    expect(rows[0]).toHaveProperty('order_amount');
  });
});
