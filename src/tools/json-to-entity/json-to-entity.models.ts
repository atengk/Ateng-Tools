/**
 * JSON 转实体类相关数据模型
 * @author Ateng
 */

/**
 * 转换选项配置
 */
export interface JsonToEntityOptions {
  /** 根类名称 */
  rootClassName: string;
  /** 包名声明 (用于 Java) */
  packageName: string;
  /** 目标语言 */
  targetLanguage: 'java' | 'typescript';
  /** 是否启用 Lombok 注解 (@Data, @Builder 等) */
  useLombok: boolean;
  /** 是否启用 Jackson 注解 (@JsonProperty) */
  useJackson: boolean;
  /** 嵌套对象是否生成为静态内部类 (static inner class) */
  innerClassMode: boolean;
  /** 是否自动将下划线命名转换为小驼峰命名 */
  autoCamelCase: boolean;
}

/**
 * 默认转换配置
 */
export const DEFAULT_JSON_TO_ENTITY_OPTIONS: JsonToEntityOptions = {
  rootClassName: 'RootDTO',
  packageName: 'com.ateng.model.dto',
  targetLanguage: 'java',
  useLombok: true,
  useJackson: true,
  innerClassMode: true,
  autoCamelCase: true,
};

/**
 * 字段描述定义
 */
export interface FieldDefinition {
  /** 原始 JSON 键名 */
  rawName: string;
  /** 转换后的属性名 (小驼峰) */
  fieldName: string;
  /** Java 类型 (如 Long, String, LocalDateTime, List<ItemDTO>) */
  javaType: string;
  /** TypeScript 类型 (如 number, string, ItemDTO[]) */
  tsType: string;
  /** 是否为日期时间类型 */
  isDateTime: boolean;
  /** 是否需要引入相关特定类型包 */
  requiredImport?: string;
  /** 子类名称 (若为嵌套对象或嵌套对象数组) */
  childClassName?: string;
}

/**
 * 实体类结构定义
 */
export interface ClassDefinition {
  /** 类名称 (PascalCase) */
  className: string;
  /** 字段列表 */
  fields: FieldDefinition[];
  /** 嵌套的子类列表 */
  nestedClasses: ClassDefinition[];
}
