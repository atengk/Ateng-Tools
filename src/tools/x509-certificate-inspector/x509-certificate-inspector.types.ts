/**
 * X.509 SSL 证书与 CSR 解析器类型契约定义
 *
 * @author Ateng
 * @since 2026-10-01
 */

/** 证书或 CSR 实体类型 */
export type CertificateType = 'X509_CERT' | 'CSR';

/** 证书属性键值对项 */
export interface CertAttributeItem {
  name: string
  label: string
  value: string
}

/** 扩展字段信息 */
export interface CertExtensionItem {
  name: string
  critical?: boolean
  value: string
}

/** 证书有效期限分析 */
export interface CertValidityInfo {
  notBefore: string
  notAfter: string
  isValidNow: boolean
  isExpired: boolean
  remainingDays: number
  expiredDays: number
}

/** 证书公钥信息 */
export interface CertPublicKeyInfo {
  algorithm: string
  bitLength?: number
  fingerprintSha256?: string
}

/** X.509 完整证书/CSR 解析实体 */
export interface ParsedCertificateResult {
  type: CertificateType
  version: number
  serialNumber: string
  subject: CertAttributeItem[]
  issuer: CertAttributeItem[]
  subjectCommonName: string
  issuerCommonName: string
  validity?: CertValidityInfo
  sans: string[]
  publicKey: CertPublicKeyInfo
  signatureAlgorithm: string
  fingerprintSha256: string
  fingerprintSha1: string
  extensions: CertExtensionItem[]
  rawPem: string
}
