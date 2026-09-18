import { describe, expect, it } from 'vitest';
import { parseAndRestoreMyBatisLogs } from './mybatis-sql-converter.service';

describe('mybatis-sql-converter.service', () => {
  it('should restore simple single statement with mixed types (String, Integer, Timestamp, Null)', () => {
    const input = `
==>  Preparing: SELECT id, username, age, birthday, remark FROM sys_user WHERE id = ? AND age > ? AND birthday <= ? AND remark = ?
==> Parameters: 1001(Long), 18(Integer), 2026-09-18 12:00:00(Timestamp), null
<==      Total: 1
    `;

    const result = parseAndRestoreMyBatisLogs(input);
    expect(result.statements).toHaveLength(1);
    const stmt = result.statements[0];
    expect(stmt.sqlTemplate).toBe(
      'SELECT id, username, age, birthday, remark FROM sys_user WHERE id = ? AND age > ? AND birthday <= ? AND remark = ?',
    );
    expect(stmt.paramCount).toBe(4);
    expect(stmt.placeholderCount).toBe(4);
    expect(stmt.hasMismatch).toBe(false);
    expect(stmt.restoredSql).toBe(
      "SELECT id, username, age, birthday, remark FROM sys_user WHERE id = 1001 AND age > 18 AND birthday <= '2026-09-18 12:00:00' AND remark = NULL;",
    );
  });

  it('should extract SQL from noisy logs with timestamps, levels, and logger names', () => {
    const input = `
2026-09-18 14:00:01.123 [http-nio-8080-exec-1] DEBUG c.a.mapper.UserMapper.selectList - ==>  Preparing: SELECT * FROM t_user WHERE status = ? AND is_deleted = ?
2026-09-18 14:00:01.125 [http-nio-8080-exec-1] DEBUG c.a.mapper.UserMapper.selectList - ==> Parameters: 1(Integer), 0(Integer)
2026-09-18 14:00:01.128 [http-nio-8080-exec-1] DEBUG c.a.mapper.UserMapper.selectList - <==      Total: 15
    `;

    const result = parseAndRestoreMyBatisLogs(input);
    expect(result.statements).toHaveLength(1);
    expect(result.statements[0].restoredSql).toBe(
      'SELECT * FROM t_user WHERE status = 1 AND is_deleted = 0;',
    );
  });

  it('should handle zero-parameter queries without Parameters line', () => {
    const input = `
==>  Preparing: SELECT id, config_key, config_value FROM sys_config
<==      Total: 5
    `;

    const result = parseAndRestoreMyBatisLogs(input);
    expect(result.statements).toHaveLength(1);
    expect(result.statements[0].placeholderCount).toBe(0);
    expect(result.statements[0].paramCount).toBe(0);
    expect(result.statements[0].hasMismatch).toBe(false);
    expect(result.statements[0].restoredSql).toBe(
      'SELECT id, config_key, config_value FROM sys_config;',
    );
  });

  it('should handle complex string parameters with commas and parentheses in JSON values', () => {
    const input = `
==>  Preparing: UPDATE t_setting SET extra_info = ?, updated_by = ? WHERE id = ?
==> Parameters: {"tags":["a,b","c(d)"],"flag":true}(String), admin(String), 123(Long)
    `;

    const result = parseAndRestoreMyBatisLogs(input);
    expect(result.statements).toHaveLength(1);
    const stmt = result.statements[0];
    expect(stmt.paramCount).toBe(3);
    expect(stmt.placeholderCount).toBe(3);
    expect(stmt.hasMismatch).toBe(false);
    expect(stmt.restoredSql).toBe(
      "UPDATE t_setting SET extra_info = '{\"tags\":[\"a,b\",\"c(d)\"],\"flag\":true}', updated_by = 'admin' WHERE id = 123;",
    );
  });

  it('should escape internal single quotes in string parameters', () => {
    const input = `
==>  Preparing: INSERT INTO t_article (title, content) VALUES (?, ?)
==> Parameters: It's a sunny day(String), O'Reilly's Book(String)
    `;

    const result = parseAndRestoreMyBatisLogs(input);
    expect(result.statements[0].restoredSql).toBe(
      "INSERT INTO t_article (title, content) VALUES ('It\\'s a sunny day', 'O\\'Reilly\\'s Book');",
    );
  });

  it('should handle pre-quoted values and commas within quoted strings', () => {
    const input = `
==>  Preparing: INSERT INTO t_test (name, tags) VALUES (?, ?)
==> Parameters: 'John Doe'(String), 'tag1,tag2'(String)
    `;

    const result = parseAndRestoreMyBatisLogs(input);
    expect(result.statements[0].restoredSql).toBe(
      "INSERT INTO t_test (name, tags) VALUES ('John Doe', 'tag1,tag2');",
    );
  });

  it('should handle boolean format option (1/0 vs TRUE/FALSE)', () => {
    const input = `
==>  Preparing: SELECT * FROM t_user WHERE is_active = ? AND is_vip = ?
==> Parameters: true(Boolean), false(Boolean)
    `;

    const resNumeric = parseAndRestoreMyBatisLogs(input, { booleanFormat: 'numeric' });
    expect(resNumeric.statements[0].restoredSql).toBe(
      'SELECT * FROM t_user WHERE is_active = 1 AND is_vip = 0;',
    );

    const resKeyword = parseAndRestoreMyBatisLogs(input, { booleanFormat: 'keyword' });
    expect(resKeyword.statements[0].restoredSql).toBe(
      'SELECT * FROM t_user WHERE is_active = TRUE AND is_vip = FALSE;',
    );
  });

  it('should warn and partially fill when placeholder count does not match parameter count', () => {
    const input = `
==>  Preparing: SELECT * FROM t_user WHERE id = ? AND status = ? AND role_id = ?
==> Parameters: 999(Long), 1(Integer)
    `;

    const result = parseAndRestoreMyBatisLogs(input);
    expect(result.statements).toHaveLength(1);
    const stmt = result.statements[0];
    expect(stmt.placeholderCount).toBe(3);
    expect(stmt.paramCount).toBe(2);
    expect(stmt.hasMismatch).toBe(true);
    expect(stmt.warningMessage).toContain('3');
    expect(stmt.restoredSql).toBe(
      'SELECT * FROM t_user WHERE id = 999 AND status = 1 AND role_id = ?;',
    );
  });

  it('should parse multiple statements in a single batch log', () => {
    const input = `
2026-09-18 10:00:01 DEBUG - ==>  Preparing: UPDATE account SET balance = balance - ? WHERE id = ?
2026-09-18 10:00:01 DEBUG - ==> Parameters: 100(BigDecimal), 1(Long)
2026-09-18 10:00:01 DEBUG - <==    Updates: 1
2026-09-18 10:00:02 DEBUG - ==>  Preparing: INSERT INTO tx_log (acc_id, amount, remark) VALUES (?, ?, ?)
2026-09-18 10:00:02 DEBUG - ==> Parameters: 1(Long), 100(BigDecimal), Transfer out(String)
2026-09-18 10:00:02 DEBUG - <==    Updates: 1
    `;

    const result = parseAndRestoreMyBatisLogs(input);
    expect(result.statements).toHaveLength(2);
    expect(result.statements[0].restoredSql).toBe(
      'UPDATE account SET balance = balance - 100 WHERE id = 1;',
    );
    expect(result.statements[1].restoredSql).toBe(
      "INSERT INTO tx_log (acc_id, amount, remark) VALUES (1, 100, 'Transfer out');",
    );
    expect(result.combinedSql).toBe(
      "UPDATE account SET balance = balance - 100 WHERE id = 1;\n\nINSERT INTO tx_log (acc_id, amount, remark) VALUES (1, 100, 'Transfer out');",
    );
  });

  it('should prettify SQL when prettify option is true', () => {
    const input = `
==>  Preparing: SELECT u.id, u.username, r.role_name FROM t_user u LEFT JOIN t_role r ON u.role_id = r.id WHERE u.status = ? AND u.age > ? ORDER BY u.created_time DESC
==> Parameters: 1(Integer), 18(Integer)
    `;

    const result = parseAndRestoreMyBatisLogs(input, {
      prettify: true,
      dialect: 'mysql',
    });
    expect(result.statements).toHaveLength(1);
    expect(result.statements[0].prettifiedSql).toBeDefined();
    expect(result.statements[0].prettifiedSql).toContain('\n');
    expect(result.combinedSql).toContain('\n');
  });
});
