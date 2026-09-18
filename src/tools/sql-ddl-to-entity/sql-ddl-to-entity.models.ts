/**
 * SQL DDL 转实体类相关数据模型
 * @author Ateng
 */

/**
 * 主键生成策略
 */
export type MyBatisPlusIdType = 'ASSIGN_ID' | 'AUTO' | 'INPUT' | 'NONE';

/**
 * 转换选项配置
 */
export interface SqlDdlOptions {
  /** 包名 */
  packageName: string;
  /** 实体类名称后缀 (例如 Entity 或 DTO，或留空) */
  entityNameSuffix: string;
  /** 是否自动移除表名前缀 (如 t_user -> User) */
  removeTablePrefix: boolean;
  /** 是否使用 Lombok 注解 */
  useLombok: boolean;
  /** 是否使用 MyBatis-Plus 注解 (@TableName, @TableId, @TableLogic) */
  useMyBatisPlus: boolean;
  /** 主键 ID 策略 */
  idType: MyBatisPlusIdType;
  /** 目标生成语言 */
  targetLanguage: 'java' | 'typescript';
}

/**
 * 默认配置
 */
export const DEFAULT_SQL_DDL_OPTIONS: SqlDdlOptions = {
  packageName: 'com.ateng.entity',
  entityNameSuffix: 'Entity',
  removeTablePrefix: true,
  useLombok: true,
  useMyBatisPlus: true,
  idType: 'ASSIGN_ID',
  targetLanguage: 'java',
};

/**
 * 单列字段定义
 */
export interface ColumnDefinition {
  /** 数据库列名 (如 user_name) */
  columnName: string;
  /** 实体属性名 (如 userName) */
  fieldName: string;
  /** 原生 SQL 数据类型 (大写，如 BIGINT, VARCHAR) */
  sqlType: string;
  /** 映射的 Java 类型 (如 Long, String, LocalDateTime) */
  javaType: string;
  /** 映射的 TypeScript 类型 (如 number, string) */
  tsType: string;
  /** 字段中文注释说明 */
  comment: string;
  /** 是否为主键 */
  isPrimaryKey: boolean;
  /** 是否为自增字段 */
  isAutoIncrement: boolean;
  /** 是否为逻辑删除字段 (deleted / is_deleted) */
  isLogicDelete: boolean;
  /** 是否允许为 NULL */
  isNullable: boolean;
}

/**
 * 表结构解析定义
 */
export interface TableDefinition {
  /** 数据库表名 (如 t_user_account) */
  tableName: string;
  /** 实体类名 (如 UserAccountEntity) */
  entityName: string;
  /** 表注释说明 */
  tableComment: string;
  /** 字段列表 */
  columns: ColumnDefinition[];
  /** 主键列名 */
  primaryKeyColumn?: string;
}
