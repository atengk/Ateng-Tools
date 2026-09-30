/**
 * PDF 加密与解密纯函数服务单元测试
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { describe, expect, it } from 'vitest';
import { PDFDocument } from '@cantoo/pdf-lib';
import { decryptPdf, encryptPdf, isPdfEncrypted } from './pdf-encrypt-decrypt.service';

/**
 * 辅助函数：快速生成简单的测试用 PDF 二进制流
 */
async function createSamplePdfBytes(text = '测试文档样例内容'): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 200]);
  page.drawText(text);
  doc.setTitle('测试标题');
  doc.setAuthor('测试作者');
  return doc.save();
}

describe('pdf-encrypt-decrypt.service', () => {
  describe('isPdfEncrypted', () => {
    it('对于普通未加密的 PDF 应返回 false', async () => {
      const sampleBytes = await createSamplePdfBytes();
      const isEncrypted = await isPdfEncrypted(sampleBytes);
      expect(isEncrypted).toBe(false);
    });

    it('对于已加密的 PDF 应返回 true', async () => {
      const sampleBytes = await createSamplePdfBytes();
      const { bytes: encryptedBytes } = await encryptPdf(sampleBytes, {
        userPassword: 'secret-password-123',
      });
      const isEncrypted = await isPdfEncrypted(encryptedBytes);
      expect(isEncrypted).toBe(true);
    });
  });

  describe('encryptPdf', () => {
    it('当未提供用户查看密码时应抛出提示异常', async () => {
      const sampleBytes = await createSamplePdfBytes();
      await expect(encryptPdf(sampleBytes, { userPassword: '' })).rejects.toThrow('请设置有效的用户查看密码');
    });

    it('成功加密 PDF 文档并生成有效密文字节流', async () => {
      const sampleBytes = await createSamplePdfBytes();
      const res = await encryptPdf(sampleBytes, {
        userPassword: 'mypassword',
        ownerPassword: 'adminpassword',
        permissions: {
          printing: 'highResolution',
          copying: false,
        },
      });

      expect(res.bytes).toBeInstanceOf(Uint8Array);
      expect(res.bytes.length).toBeGreaterThan(0);
      expect(res.pageCount).toBe(1);

      // 加密后的文档在无密码情况下加载应抛出加密错误
      await expect(PDFDocument.load(res.bytes)).rejects.toThrow();
    });

    it('尝试对已加密的文档重复加密应抛出拦截提示', async () => {
      const sampleBytes = await createSamplePdfBytes();
      const { bytes: encryptedBytes } = await encryptPdf(sampleBytes, {
        userPassword: 'password1',
      });

      await expect(
        encryptPdf(encryptedBytes, { userPassword: 'password2' }),
      ).rejects.toThrow('该文档已被密码保护');
    });
  });

  describe('decryptPdf', () => {
    it('未输入密码时应抛出拦截异常', async () => {
      const sampleBytes = await createSamplePdfBytes();
      await expect(decryptPdf(sampleBytes, { password: '' })).rejects.toThrow('请输入解密所需的口令密码');
    });

    it('输入错误密码时应抛出友好的中文密码错误提示', async () => {
      const sampleBytes = await createSamplePdfBytes();
      const { bytes: encryptedBytes } = await encryptPdf(sampleBytes, {
        userPassword: 'correct-password',
      });

      await expect(
        decryptPdf(encryptedBytes, { password: 'wrong-password' }),
      ).rejects.toThrow('密码错误或无效，无法解密该 PDF 文档');
    });

    it('输入正确密码时应成功解密并可无需密码直接打开', async () => {
      const sampleBytes = await createSamplePdfBytes('绝密合同核心条款');
      const { bytes: encryptedBytes } = await encryptPdf(sampleBytes, {
        userPassword: 'open-sesame',
      });

      const decryptRes = await decryptPdf(encryptedBytes, {
        password: 'open-sesame',
      });

      expect(decryptRes.pageCount).toBe(1);
      expect(decryptRes.bytes.length).toBeGreaterThan(0);

      // 验证解密后的字节流可以直接无密码加载且页数完整
      const reopenedDoc = await PDFDocument.load(decryptRes.bytes);
      expect(reopenedDoc.getPageCount()).toBe(1);
      expect(reopenedDoc.getPages().length).toBe(1);
    });
  });
});
