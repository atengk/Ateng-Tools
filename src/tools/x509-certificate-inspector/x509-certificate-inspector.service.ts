/**
 * X.509 SSL 证书与 CSR 解析纯函数服务
 *
 * @author Ateng
 * @since 2026-10-01
 */
import forge from 'node-forge';
import type {
  CertAttributeItem,
  CertExtensionItem,
  CertPublicKeyInfo,
  CertValidityInfo,
  ParsedCertificateResult,
} from './x509-certificate-inspector.types';

/** 常见 X.500 属性名到中文含义的映射字典 */
const ATTR_LABEL_MAP: Record<string, string> = {
  CN: '通用名称 (CN)',
  commonName: '通用名称 (CN)',
  O: '组织名称 (O)',
  organizationName: '组织名称 (O)',
  OU: '部门单位 (OU)',
  organizationalUnitName: '部门单位 (OU)',
  C: '国家/地区 (C)',
  countryName: '国家/地区 (C)',
  ST: '省/州 (ST)',
  stateOrProvinceName: '省/州 (ST)',
  L: '城市/地区 (L)',
  localityName: '城市/地区 (L)',
  emailAddress: '联系邮箱',
};

/**
 * 将十六进制指纹字符串格式化为冒号分隔大写 (如 AA:BB:CC:DD...)
 *
 * @param hex 原始十六进制字符串
 * @returns 冒号分隔的格式化指纹
 */
export function formatFingerprint(hex: string): string {
  if (!hex) return '';
  const clean = hex.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  const parts: string[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    parts.push(clean.slice(i, i + 2));
  }
  return parts.join(':');
}

/**
 * 转换 forge 属性数组为标准结构
 *
 * @param attributes 原始属性列表
 * @returns 规范属性清单
 */
function mapAttributes(attributes: any[]): CertAttributeItem[] {
  if (!Array.isArray(attributes)) return [];
  return attributes.map(attr => ({
    name: attr.shortName || attr.name || 'Unknown',
    label: ATTR_LABEL_MAP[attr.shortName] || ATTR_LABEL_MAP[attr.name] || attr.name || '未知属性',
    value: String(attr.value ?? ''),
  }));
}

/**
 * 分析证书有效期限状态
 *
 * @param notBefore 生效时间
 * @param notAfter 过期时间
 * @returns 有效期模型
 */
export function analyzeValidity(notBefore: Date, notAfter: Date): CertValidityInfo {
  const now = Date.now();
  const nbTime = notBefore.getTime();
  const naTime = notAfter.getTime();

  const isValidNow = now >= nbTime && now <= naTime;
  const isExpired = now > naTime;

  const msPerDay = 1000 * 60 * 60 * 24;
  const remainingDays = isExpired ? 0 : Math.max(0, Math.ceil((naTime - now) / msPerDay));
  const expiredDays = isExpired ? Math.max(1, Math.ceil((now - naTime) / msPerDay)) : 0;

  return {
    notBefore: notBefore.toISOString(),
    notAfter: notAfter.toISOString(),
    isValidNow,
    isExpired,
    remainingDays,
    expiredDays,
  };
}

/**
 * 解析 PEM 文本格式的 X.509 证书或 CSR 请求
 *
 * @param pemText PEM 格式文本字符串
 * @returns 证书或 CSR 解析输出实体
 */
export function parseCertificateOrCsr(pemText: string): ParsedCertificateResult {
  if (!pemText || !pemText.trim()) {
    throw new Error('请输入待解析的 X.509 证书或 CSR 文本');
  }

  const raw = pemText.trim();

  // 1. 判断是否为 CSR 证书签名请求
  if (
    raw.includes('-----BEGIN CERTIFICATE REQUEST-----')
    || raw.includes('-----BEGIN NEW CERTIFICATE REQUEST-----')
  ) {
    try {
      const csr = forge.pki.certificationRequestFromPem(raw);
      const subjectAttrs = mapAttributes(csr.subject.attributes);
      const cnAttr = csr.subject.getField('CN');

      let bitLength: number | undefined;
      if ((csr.publicKey as any)?.n?.bitLength) {
        bitLength = (csr.publicKey as any).n.bitLength();
      }

      // 计算 CSR 签名请求 DER 指纹
      const derBytes = forge.asn1.toDer(forge.pki.certificationRequestToAsn1(csr)).getBytes();
      const fpSha256 = forge.md.sha256.create().update(derBytes).digest().toHex();
      const fpSha1 = forge.md.sha1.create().update(derBytes).digest().toHex();

      return {
        type: 'CSR',
        version: csr.version + 1,
        serialNumber: 'N/A (CSR 请求尚未签发)',
        subject: subjectAttrs,
        issuer: [],
        subjectCommonName: cnAttr ? String(cnAttr.value) : '未知主题',
        issuerCommonName: '尚未由 CA 机构签发',
        sans: [],
        publicKey: {
          algorithm: 'RSA',
          bitLength,
          fingerprintSha256: fpSha256,
        },
        signatureAlgorithm: csr.siginfo?.algorithmOid || 'sha256WithRSAEncryption',
        fingerprintSha256: fpSha256,
        fingerprintSha1: fpSha1,
        extensions: [],
        rawPem: raw,
      };
    }
    catch (err: any) {
      throw new Error(`CSR 证书签名请求解析失败: ${err.message || '格式错误'}`);
    }
  }

  // 2. 解析标准 X.509 证书 (支持自动补齐标头)
  let certPem = raw;
  if (!certPem.includes('-----BEGIN CERTIFICATE-----')) {
    // 若用户仅粘贴了纯 Base64，自动尝试拼装 PEM 边界
    certPem = `-----BEGIN CERTIFICATE-----\n${certPem}\n-----END CERTIFICATE-----`;
  }

  try {
    const cert = forge.pki.certificateFromPem(certPem);

    // 提取使用者与签发者
    const subjectAttrs = mapAttributes(cert.subject.attributes);
    const issuerAttrs = mapAttributes(cert.issuer.attributes);
    const subCn = cert.subject.getField('CN');
    const issCn = cert.issuer.getField('CN') || cert.issuer.getField('O');

    // 提取有效期限
    const validity = analyzeValidity(cert.validity.notBefore, cert.validity.notAfter);

    // 提取主题备用名称 (SAN)
    const sans: string[] = [];
    const sanExt = cert.getExtension('subjectAltName') as any;
    if (sanExt && Array.isArray(sanExt.altNames)) {
      for (const item of sanExt.altNames) {
        if (item.value) {
          sans.push(String(item.value));
        }
        else if (item.ip) {
          sans.push(String(item.ip));
        }
      }
    }

    // 提取公钥参数
    const pubKey: CertPublicKeyInfo = {
      algorithm: 'RSA',
      bitLength: (cert.publicKey as any)?.n?.bitLength
        ? (cert.publicKey as any).n.bitLength()
        : undefined,
    };

    // 提取扩展项
    const extensions: CertExtensionItem[] = (cert.extensions || []).map((ext: any) => ({
      name: ext.name || '未知扩展',
      critical: Boolean(ext.critical),
      value: typeof ext.value === 'string' ? ext.value : (ext.name || ''),
    }));

    // 计算证书指纹
    const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const fpSha256 = forge.md.sha256.create().update(derBytes).digest().toHex();
    const fpSha1 = forge.md.sha1.create().update(derBytes).digest().toHex();

    return {
      type: 'X509_CERT',
      version: cert.version + 1,
      serialNumber: cert.serialNumber || '',
      subject: subjectAttrs,
      issuer: issuerAttrs,
      subjectCommonName: subCn ? String(subCn.value) : (sans[0] || '未知名称'),
      issuerCommonName: issCn ? String(issCn.value) : '未知颁发机构',
      validity,
      sans,
      publicKey: pubKey,
      signatureAlgorithm: cert.signatureOid || 'sha256WithRSAEncryption',
      fingerprintSha256: fpSha256,
      fingerprintSha1: fpSha1,
      extensions,
      rawPem: certPem,
    };
  }
  catch (err: any) {
    throw new Error(`X.509 证书解析失败: ${err.message || '不是有效的 PEM 证书'}`);
  }
}

/**
 * 快速生成测试用的自签名示范 SSL 证书 PEM 文本
 *
 * @returns 预设证书 PEM 文本
 */
export function generateSampleCertificatePem(): string {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '0123456789ABCDEF';

  // 1 年有效期
  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const subject = [
    { name: 'commonName', value: 'ateng-tools.github.io' },
    { name: 'organizationName', value: 'Ateng Developer Studio' },
    { name: 'organizationalUnitName', value: 'Security Team' },
    { name: 'countryName', value: 'CN' },
    { name: 'stateOrProvinceName', value: 'Beijing' },
    { name: 'localityName', value: 'Haidian' },
  ];
  cert.setSubject(subject);

  const issuer = [
    { name: 'commonName', value: 'Global Secure Trust CA G3' },
    { name: 'organizationName', value: 'Global Trust Certificate Authority' },
    { name: 'countryName', value: 'US' },
  ];
  cert.setIssuer(issuer);

  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false,
    },
    {
      name: 'keyUsage',
      digitalSignature: true,
      keyEncipherment: true,
    },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'ateng-tools.github.io' },
        { type: 2, value: '*.ateng-tools.github.io' },
        { type: 2, value: 'tools.atengk.me' },
      ],
    },
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());
  return forge.pki.certificateToPem(cert);
}
