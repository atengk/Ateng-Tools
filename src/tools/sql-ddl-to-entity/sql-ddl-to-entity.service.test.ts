import { describe, expect, it } from 'vitest';
import { DEFAULT_SQL_DDL_OPTIONS } from './sql-ddl-to-entity.models';
import {
  generateCodeFromDdl,
  generateJavaFromTable,
  generateTsFromTable,
  parseMySqlDdl,
} from './sql-ddl-to-entity.service';

describe('SQL DDL to Entity Service', () => {
  const sampleDdl = `
CREATE TABLE \`t_user_order\` (
  \`id\` bigint NOT NULL COMMENT '主键订单ID',
  \`order_no\` varchar(64) NOT NULL COMMENT '订单编号',
  \`user_id\` bigint NOT NULL COMMENT '下单用户ID',
  \`pay_amount\` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT '实付金额',
  \`status\` tinyint NOT NULL DEFAULT '0' COMMENT '订单状态: 0-待支付, 1-已支付, 2-已取消',
  \`deleted\` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除: 0-未删除, 1-已删除',
  \`created_time\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_time\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_order_no\` (\`order_no\`),
  KEY \`idx_user_id\` (\`user_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户订单主表';
`;

  it('1. should accurately parse table name, comment, and columns', () => {
    const table = parseMySqlDdl(sampleDdl, DEFAULT_SQL_DDL_OPTIONS);

    expect(table.tableName).toBe('t_user_order');
    expect(table.entityName).toBe('UserOrderEntity');
    expect(table.tableComment).toBe('用户订单主表');
    expect(table.primaryKeyColumn).toBe('id');
    expect(table.columns.length).toBe(8);
  });

  it('2. should correctly map MySQL types to Java and TypeScript types', () => {
    const table = parseMySqlDdl(sampleDdl, DEFAULT_SQL_DDL_OPTIONS);

    const idCol = table.columns.find(c => c.columnName === 'id');
    expect(idCol?.javaType).toBe('Long');
    expect(idCol?.isPrimaryKey).toBe(true);

    const amountCol = table.columns.find(c => c.columnName === 'pay_amount');
    expect(amountCol?.javaType).toBe('BigDecimal');
    expect(amountCol?.fieldName).toBe('payAmount');

    const statusCol = table.columns.find(c => c.columnName === 'status');
    expect(statusCol?.javaType).toBe('Integer');

    const createdCol = table.columns.find(c => c.columnName === 'created_time');
    expect(createdCol?.javaType).toBe('LocalDateTime');

    const deletedCol = table.columns.find(c => c.columnName === 'deleted');
    expect(deletedCol?.isLogicDelete).toBe(true);
  });

  it('3. should generate valid Java Entity with MyBatis-Plus and Lombok annotations', () => {
    const table = parseMySqlDdl(sampleDdl, DEFAULT_SQL_DDL_OPTIONS);
    const code = generateJavaFromTable(table, DEFAULT_SQL_DDL_OPTIONS);

    expect(code).toContain('@TableName("t_user_order")');
    expect(code).toContain('@TableId(type = IdType.ASSIGN_ID)');
    expect(code).toContain('@TableLogic');
    expect(code).toContain('public class UserOrderEntity implements Serializable');
    expect(code).toContain('import com.baomidou.mybatisplus.annotation.TableName;');
    expect(code).toContain('import java.time.LocalDateTime;');
    expect(code).toContain('import java.math.BigDecimal;');
    expect(code).toContain('* 用户订单主表');
    expect(code).toContain('* 实付金额');
  });

  it('4. should generate corresponding TypeScript interface', () => {
    const table = parseMySqlDdl(sampleDdl, DEFAULT_SQL_DDL_OPTIONS);
    const tsCode = generateTsFromTable(table);

    expect(tsCode).toContain('export interface UserOrderEntity {');
    expect(tsCode).toContain('payAmount?: number;');
    expect(tsCode).toContain('createdTime?: string;');
    expect(tsCode).toContain('orderNo?: string;');
  });

  it('5. should work seamlessly through generateCodeFromDdl entrypoint', () => {
    const javaCode = generateCodeFromDdl(sampleDdl, DEFAULT_SQL_DDL_OPTIONS);
    expect(javaCode).toContain('public class UserOrderEntity');

    const tsCode = generateCodeFromDdl(sampleDdl, {
      ...DEFAULT_SQL_DDL_OPTIONS,
      targetLanguage: 'typescript',
    });
    expect(tsCode).toContain('export interface UserOrderEntity');
  });
});
