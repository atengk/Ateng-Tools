/**
 * cURL 转换器相关数据模型
 * @author Ateng
 */

/**
 * 目标代码生成类型
 */
export type CurlTargetLanguage = 'axios' | 'fetch' | 'javaHttpClient';

/**
 * HTTP 请求参数键值对
 */
export interface KeyValuePair {
  key: string;
  value: string;
}

/**
 * 认证信息模型
 */
export interface CurlAuthInfo {
  type: 'basic' | 'bearer' | 'none';
  username?: string;
  password?: string;
  token?: string;
}

/**
 * 解析后的结构化 cURL 请求对象
 */
export interface ParsedCurlRequest {
  /** HTTP 请求方法 (GET, POST, PUT, DELETE 等) */
  method: string;
  /** 完整请求目标 URL */
  url: string;
  /** 去除 Query 参数的基础 URL */
  baseUrl: string;
  /** Query 查询参数列表 */
  queryParams: KeyValuePair[];
  /** 请求头字典 */
  headers: Record<string, string>;
  /** 请求头列表 (便于表格渲染) */
  headersList: KeyValuePair[];
  /** 请求体原始字符串 */
  body: string | null;
  /** 请求体格式推断 */
  bodyType: 'json' | 'form' | 'raw' | 'none';
  /** 认证信息 */
  auth: CurlAuthInfo;
}
