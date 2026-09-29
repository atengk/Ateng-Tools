/**
 * 表格与多格式数据互转器数据模型定义
 *
 * @author Ateng
 * @since 2026-09-29
 */

export type TableInputFormat = 'auto' | 'tsv' | 'csv' | 'markdown' | 'json';
export type TableOutputFormat = 'sql' | 'markdown' | 'json' | 'csv';
export type ColumnType = 'number' | 'boolean' | 'string' | 'null';
export type SqlDialectQuote = 'backtick' | 'double' | 'none';

export interface TableConverterOptions {
  /**
   * 首行是否作为列名表头
   */
  hasHeader: boolean
  /**
   * 生成 SQL 时的目标表名
   */
  tableName: string
  /**
   * 批量插入每批包含的最大记录行数 (Batch Size)
   */
  batchSize: number
  /**
   * 字段标识符引用方式（反引号 `col`、双引号 "col"、不加引号）
   */
  quoteIdentifier: SqlDialectQuote
  /**
   * 空值输出字面量
   */
  nullPlaceholder: string
}

export interface TableData {
  headers: string[]
  rows: any[][]
  inferredTypes: ColumnType[]
  rowCount: number
  columnCount: number
}

export interface TableConversionResult {
  success: boolean
  output: string
  error?: string
  detectedFormat: TableInputFormat
  rowCount: number
  columnCount: number
}

export const DEFAULT_TABLE_CONVERTER_OPTIONS: TableConverterOptions = {
  hasHeader: true,
  tableName: 'my_table',
  batchSize: 100,
  quoteIdentifier: 'backtick',
  nullPlaceholder: 'NULL',
};

export interface TableSample {
  key: string
  label: string
  format: TableInputFormat
  suggestedTarget: TableOutputFormat
  suggestedTableName: string
  description: string
  content: string
}

export const TABLE_SAMPLES: TableSample[] = [
  {
    key: 'ecommerce-orders-tsv',
    label: '电商订单交易表 (TSV / Excel 剪贴板)',
    format: 'tsv',
    suggestedTarget: 'sql',
    suggestedTableName: 't_order',
    description: '制表符分隔，模拟从 Excel 或飞书表格选区直接复制的内容',
    content: `order_id\tuser_name\tamount\tis_paid\tcreated_at\tnotes
1001\tAteng\t199.50\ttrue\t2026-09-29 10:00:00\tVIP Member
1002\tJohn\t49.00\tfalse\t2026-09-29 10:05:00\tFirst Order's Special
1003\tAlice\t99.90\ttrue\t2026-09-29 10:15:00\t
1004\tBob\t599.00\ttrue\t2026-09-29 10:20:00\tOverseas Shipping`,
  },
  {
    key: 'employee-salary-csv',
    label: '员工考勤薪资表 (CSV 复杂引用与转义)',
    format: 'csv',
    suggestedTarget: 'sql',
    suggestedTableName: 't_employee',
    description: '标准 CSV 逗号分隔，包含双引号包裹、单元格内逗号与单引号转义',
    content: `emp_id,full_name,department,salary,status,remarks
201,"Zhang, San",Engineering,18500.50,active,"Specialist, Tier 2"
202,"Li, Si",Marketing,12000.00,active,"Manager's Assistant"
203,"Wang, Wu",Human Resources,9500.00,on_leave,"Leave till Oct 1st"
204,"Zhao, Liu",Finance,15000.00,active,""`,
  },
  {
    key: 'api-definition-markdown',
    label: '接口数据字典定义 (Markdown 表格)',
    format: 'markdown',
    suggestedTarget: 'json',
    suggestedTableName: 'sys_field_meta',
    description: '技术文档常用 Markdown 表格，一键转换为 JSON 或 SQL',
    content: `| field_name | data_type | is_required | default_value | description |
| :--- | :---: | :---: | :--- | :--- |
| user_id | BIGINT | true | NULL | 全局唯一用户主键 ID |
| username | VARCHAR(64) | true | NULL | 登录账号名称 |
| score | DECIMAL(5,2) | false | 0.00 | 综合积分评价 |
| is_active | TINYINT(1) | true | 1 | 是否启用状态 (0/1) |
| created_time | DATETIME | true | CURRENT_TIMESTAMP | 记录创建时间戳 |`,
  },
  {
    key: 'product-inventory-json',
    label: '商品库存分类清单 (JSON 对象数组)',
    format: 'json',
    suggestedTarget: 'sql',
    suggestedTableName: 't_product_inventory',
    description: '标准前端 JSON 数组，一键转换为批量 SQL INSERT 与 Markdown 表格',
    content: `[
  {
    "sku_code": "SKU-2026-001",
    "product_name": "Mechanical Keyboard RGB",
    "category": "Peripherals",
    "stock": 150,
    "price": 299.00,
    "is_available": true
  },
  {
    "sku_code": "SKU-2026-002",
    "product_name": "Wireless Gaming Mouse",
    "category": "Peripherals",
    "stock": 80,
    "price": 129.50,
    "is_available": true
  },
  {
    "sku_code": "SKU-2026-003",
    "product_name": "4K Ultra-wide Monitor",
    "category": "Displays",
    "stock": 0,
    "price": 1899.00,
    "is_available": false
  }
]`,
  },
];
