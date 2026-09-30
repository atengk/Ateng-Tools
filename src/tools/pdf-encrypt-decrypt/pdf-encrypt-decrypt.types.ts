/**
 * PDF 加密与解密类型定义
 *
 * @author Ateng
 * @since 2026-09-30
 */

/**
 * PDF 权限控制项定义
 */
export interface PdfPermissions {
  /** 允许打印权限：'highResolution' 高清打印 | 'lowResolution' 低清打印 | false 禁止打印 */
  printing?: 'highResolution' | 'lowResolution' | false;
  /** 允许修改文档内容 */
  modifying?: boolean;
  /** 允许复制文本与图元内容 */
  copying?: boolean;
  /** 允许添加文本注释与表单标注 */
  annotating?: boolean;
  /** 允许填写表单字段 */
  fillingForms?: boolean;
  /** 允许屏幕阅读器辅助功能访问内容 */
  contentAccessibility?: boolean;
  /** 允许装配与重组文档页面 */
  documentAssembly?: boolean;
}

/**
 * PDF 加密参数配置
 */
export interface PdfEncryptOptions {
  /** 用户查看密码（打开文档所必需） */
  userPassword: string;
  /** 所有者管理密码（可选，权限控制锁） */
  ownerPassword?: string;
  /** 细粒度权限控制配置 */
  permissions?: PdfPermissions;
}

/**
 * PDF 解密参数配置
 */
export interface PdfDecryptOptions {
  /** 解密所需口令密码（可为用户密码或所有者密码） */
  password: string;
}

/**
 * 处理结果元数据与输出文件封装
 */
export interface PdfProcessResult {
  /** 处理生成的文件二进制 Blob */
  blob: Blob;
  /** 导出的建议文件名 */
  fileName: string;
  /** 输出文件体积大小（字节） */
  fileSize: number;
  /** 包含的总页数 */
  pageCount: number;
}
