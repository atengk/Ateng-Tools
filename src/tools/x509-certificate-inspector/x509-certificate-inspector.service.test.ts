/**
 * X.509 证书与 CSR 解析服务单元测试
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { describe, expect, it } from 'vitest';
import forge from 'node-forge';
import {
  analyzeValidity,
  formatFingerprint,
  generateSampleCertificatePem,
  parseCertificateOrCsr,
} from './x509-certificate-inspector.service';

describe('x509-certificate-inspector.service', () => {
  describe('formatFingerprint', () => {
    it('正确将无分隔符十六进制转换为冒号分隔的大写格式', () => {
      expect(formatFingerprint('d51bcf6476a0')).toBe('D5:1B:CF:64:76:A0');
      expect(formatFingerprint('')).toBe('');
    });
  });

  describe('analyzeValidity', () => {
    it('当前有效证书应正确计算剩余天数', () => {
      const now = new Date();
      const notBefore = new Date(now.getTime() - 24 * 3600 * 1000); // 昨天
      const notAfter = new Date(now.getTime() + 30 * 24 * 3600 * 1000); // 30天后

      const info = analyzeValidity(notBefore, notAfter);
      expect(info.isValidNow).toBe(true);
      expect(info.isExpired).toBe(false);
      expect(info.remainingDays).toBeGreaterThanOrEqual(29);
      expect(info.expiredDays).toBe(0);
    });

    it('已过期的证书应正确计算过期天数', () => {
      const now = new Date();
      const notBefore = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
      const notAfter = new Date(now.getTime() - 10 * 24 * 3600 * 1000);

      const info = analyzeValidity(notBefore, notAfter);
      expect(info.isValidNow).toBe(false);
      expect(info.isExpired).toBe(true);
      expect(info.remainingDays).toBe(0);
      expect(info.expiredDays).toBeGreaterThanOrEqual(10);
    });
  });

  describe('parseCertificateOrCsr', () => {
    it('输入空字符串应抛出友好提示', () => {
      expect(() => parseCertificateOrCsr('')).toThrow('请输入待解析的 X.509 证书或 CSR 文本');
    });

    it('成功解析自签名示范 X.509 证书', () => {
      const pem = generateSampleCertificatePem();
      const result = parseCertificateOrCsr(pem);

      expect(result.type).toBe('X509_CERT');
      expect(result.subjectCommonName).toBe('ateng-tools.github.io');
      expect(result.issuerCommonName).toBe('Global Secure Trust CA G3');
      expect(result.sans).toContain('ateng-tools.github.io');
      expect(result.sans).toContain('*.ateng-tools.github.io');
      expect(result.sans).toContain('tools.atengk.me');
      expect(result.validity?.isValidNow).toBe(true);
      expect(result.publicKey.algorithm).toBe('RSA');
      expect(result.fingerprintSha256).toMatch(/^[0-9a-fA-F]{64}$/);
      expect(result.fingerprintSha1).toMatch(/^[0-9a-fA-F]{40}$/);
    });

    it('成功解析 CSR 证书签名请求', () => {
      // 生成临时 CSR
      const keys = forge.pki.rsa.generateKeyPair(1024);
      const csr = forge.pki.createCertificationRequest();
      csr.publicKey = keys.publicKey;
      csr.setSubject([{ name: 'commonName', value: 'req.my-server.com' }]);
      csr.sign(keys.privateKey);
      const csrPem = forge.pki.certificationRequestToPem(csr);

      const result = parseCertificateOrCsr(csrPem);
      expect(result.type).toBe('CSR');
      expect(result.subjectCommonName).toBe('req.my-server.com');
      expect(result.issuerCommonName).toContain('尚未由 CA 机构签发');
    });

    it('损坏或非法 PEM 内容应抛出解析失败异常', () => {
      expect(() => parseCertificateOrCsr('-----BEGIN CERTIFICATE-----\nINVALID_DATA\n-----END CERTIFICATE-----')).toThrow('解析失败');
    });
  });
});
