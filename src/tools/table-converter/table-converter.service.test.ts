/**
 * 表格与多格式数据互转服务单元测试
 *
 * @author Ateng
 * @since 2026-09-29
 */

import { describe, expect, it } from 'vitest';
import {
  convertTabularData,
  detectTableFormat,
  parseDelimitedText,
  parseMarkdownTable,
} from './table-converter.service';

describe('表格与多格式数据互转服务 (table-converter.service)', () => {
  const sampleTsv = [
    'id\tname\tage\tis_active\tremark',
    '101\tAlice\t25\ttrue\tEngineer',
    '102\tBob\t30\tfalse\tManager\'s Desk',
    '103\tCharlie\t28\ttrue\t',
  ].join('\n');

  describe('格式智能探测 (detectTableFormat)', () => {
    it('正确探测 JSON 数组', () => {
      expect(detectTableFormat('[{"id": 1, "name": "test"}]')).toBe('json');
    });

    it('正确探测 Markdown 表格', () => {
      const md = '| id | name |\n| --- | --- |\n| 1 | foo |';
      expect(detectTableFormat(md)).toBe('markdown');
    });

    it('正确探测 TSV 制表符格式', () => {
      expect(detectTableFormat('a\tb\tc\n1\t2\t3')).toBe('tsv');
    });

    it('正确探测 CSV 逗号格式', () => {
      expect(detectTableFormat('id,name,age\n1,Alice,20')).toBe('csv');
    });
  });

  describe('TSV 转换为各格式', () => {
    it('TSV 转换为批量 SQL INSERT', () => {
      const result = convertTabularData(sampleTsv, 'tsv', 'sql', {
        tableName: 't_user',
        batchSize: 2,
        quoteIdentifier: 'backtick',
      });

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(3);
      expect(result.columnCount).toBe(5);
      expect(result.output).toContain('INSERT INTO `t_user` (`id`, `name`, `age`, `is_active`, `remark`) VALUES');
      // 数字不带引号
      expect(result.output).toContain('(101, \'Alice\', 25, 1, \'Engineer\')');
      // 单引号防注入转义
      expect(result.output).toContain('\'Manager\'\'s Desk\'');
      // 批次拆分：3条记录，batchSize=2 会拆分为 2 个 INSERT INTO 语句
      const insertCount = (result.output.match(/INSERT INTO/g) || []).length;
      expect(insertCount).toBe(2);
    });

    it('TSV 转换为 Markdown 表格', () => {
      const result = convertTabularData(sampleTsv, 'tsv', 'markdown');
      expect(result.success).toBe(true);
      expect(result.output).toContain('| id  | name');
      expect(result.output).toContain('| ---');
      expect(result.output).toContain('| 101 | Alice');
    });

    it('TSV 转换为 JSON 数组', () => {
      const result = convertTabularData(sampleTsv, 'tsv', 'json');
      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.output);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].id).toBe(101);
      expect(parsed[0].name).toBe('Alice');
      expect(parsed[0].is_active).toBe(true);
    });
  });

  describe('Markdown 表格解析与反向转换', () => {
    const sampleMarkdown = `
| user_id | username | score |
| :--- | :---: | ---: |
| 1001 | Lucy | 98.5 |
| 1002 | David | 89.0 |
`.trim();

    it('Markdown 表格转换为 SQL', () => {
      const result = convertTabularData(sampleMarkdown, 'markdown', 'sql', {
        tableName: 'exam_record',
      });
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(2);
      expect(result.output).toContain('INSERT INTO `exam_record` (`user_id`, `username`, `score`) VALUES');
      expect(result.output).toContain('(1001, \'Lucy\', 98.5)');
    });

    it('Markdown 表格转换为 CSV', () => {
      const result = convertTabularData(sampleMarkdown, 'markdown', 'csv');
      expect(result.success).toBe(true);
      expect(result.output).toContain('user_id,username,score');
      expect(result.output).toContain('1001,Lucy,98.5');
    });
  });

  describe('复杂 CSV 引号与特殊符号解析', () => {
    it('正确解析包含逗号与双引号转义的单元格', () => {
      const csv = 'id,quote_text\n1,"He said ""Hello"", world"';
      const rows = parseDelimitedText(csv, ',');
      expect(rows).toHaveLength(2);
      expect(rows[1][1]).toBe('He said "Hello", world');
    });
  });

  describe('JSON 转换为 SQL 与 Markdown', () => {
    const sampleJson = JSON.stringify([
      { code: 'A01', count: 10, valid: true },
      { code: 'A02', count: 20, valid: false },
    ]);

    it('JSON 转换为批量 SQL', () => {
      const result = convertTabularData(sampleJson, 'json', 'sql', {
        tableName: 't_inventory',
      });
      expect(result.success).toBe(true);
      expect(result.output).toContain('INSERT INTO `t_inventory` (`code`, `count`, `valid`) VALUES');
      expect(result.output).toContain('(\'A01\', 10, 1)');
      expect(result.output).toContain('(\'A02\', 20, 0)');
    });
  });
});
