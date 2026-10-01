/**
 * Mock 随机业务数据生成器类型契约
 *
 * @author Ateng
 * @since 2026-10-01
 */

/** 支持的 Mock 字段数据类型 */
export type MockFieldType =
  | 'id'
  | 'uuid'
  | 'cname'
  | 'ename'
  | 'phone'
  | 'email'
  | 'avatar'
  | 'gender'
  | 'age'
  | 'city'
  | 'company'
  | 'amount'
  | 'datetime'
  | 'boolean'
  | 'enum'
  | 'ip';

/** 单个字段定义配置 */
export interface MockField {
  id: string;
  name: string; // 字段名称 (如 user_id, user_name)
  type: MockFieldType; // 字段数据类型
  comment?: string; // 字段备注
  // 额外类型参数
  options?: {
    startId?: number; // 自增起始值
    minAge?: number;
    maxAge?: number;
    minAmount?: number;
    maxAmount?: number;
    decimals?: number;
    enumList?: string[]; // 枚举池选项
    dateStart?: string;
    dateEnd?: string;
  };
}

/** 导出格式选项 */
export type MockExportFormat = 'json' | 'sql' | 'csv';

/** 批量生成选项配置 */
export interface MockGenerateOptions {
  count: number; // 生成行数 (1 ~ 5000)
  tableName: string; // SQL 导出表名
  fields: MockField[];
}
