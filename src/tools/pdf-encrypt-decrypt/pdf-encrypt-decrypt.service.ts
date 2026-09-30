/**
 * PDF 加密与解密纯函数服务
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { PDFDocument } from '@cantoo/pdf-lib';
import type { PdfDecryptOptions, PdfEncryptOptions } from './pdf-encrypt-decrypt.types';

/**
 * 探测指定 PDF 文件流是否受密码保护加密
 *
 * @param pdfData PDF 文件二进制流
 * @returns 是否受加密保护
 */
export async function isPdfEncrypted(pdfData: ArrayBuffer | Uint8Array): Promise<boolean> {
  try {
    const bytes = pdfData instanceof Uint8Array ? pdfData : new Uint8Array(pdfData);
    await PDFDocument.load(bytes);
    return false;
  }
  catch (error: any) {
    const message = String(error?.message || '');
    if (message.toLowerCase().includes('encrypt')) {
      return true;
    }
    throw new Error(`PDF 文档解析失败：${message}`);
  }
}

/**
 * 为普通 PDF 文档添加密码保护与权限控制
 *
 * @param pdfData 待加密的 PDF 原始文件流
 * @param options 加密配置项（用户密码、所有者密码、细粒度权限）
 * @returns 加密后的 PDF 二进制字节数组
 */
export async function encryptPdf(
  pdfData: ArrayBuffer | Uint8Array,
  options: PdfEncryptOptions,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  // 1. 参数防御校验
  if (!options.userPassword || options.userPassword.trim() === '') {
    throw new Error('请设置有效的用户查看密码（不能为空）');
  }

  const bytes = pdfData instanceof Uint8Array ? pdfData : new Uint8Array(pdfData);

  // 2. 加载文档并检查原状态
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(bytes);
  }
  catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('encrypt')) {
      throw new Error('该文档已被密码保护，请勿重复加密；如需修改密码请先解密');
    }
    throw new Error(`文档加载失败：${err?.message || '未知错误'}`);
  }

  // 3. 配置加密与权限参数
  pdfDoc.encrypt({
    userPassword: options.userPassword,
    ownerPassword: options.ownerPassword?.trim() ? options.ownerPassword : options.userPassword,
    permissions: {
      printing: options.permissions?.printing ?? 'highResolution',
      modifying: options.permissions?.modifying ?? false,
      copying: options.permissions?.copying ?? false,
      annotating: options.permissions?.annotating ?? false,
      fillingForms: options.permissions?.fillingForms ?? true,
      contentAccessibility: options.permissions?.contentAccessibility ?? true,
      documentAssembly: options.permissions?.documentAssembly ?? false,
    },
  });

  const encryptedBytes = await pdfDoc.save();
  return {
    bytes: encryptedBytes,
    pageCount: pdfDoc.getPageCount(),
  };
}

/**
 * 解锁并剥离受保护 PDF 的全部密码与权限限制
 *
 * @param pdfData 受保护的 PDF 二进制字节流
 * @param options 解密配置项（包含访问口令）
 * @returns 彻底剥离密码限制的纯净 PDF 字节数组
 */
export async function decryptPdf(
  pdfData: ArrayBuffer | Uint8Array,
  options: PdfDecryptOptions,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  // 1. 参数防御校验
  if (!options.password || options.password.trim() === '') {
    throw new Error('请输入解密所需的口令密码');
  }

  const bytes = pdfData instanceof Uint8Array ? pdfData : new Uint8Array(pdfData);

  // 2. 尝试使用密码解锁并加载文档
  let encryptedDoc: PDFDocument;
  try {
    encryptedDoc = await PDFDocument.load(bytes, { password: options.password });
  }
  catch (err: any) {
    const errorMsg = String(err?.message || '');
    if (errorMsg.includes('Password') || errorMsg.includes('password') || errorMsg.includes('encrypt') || errorMsg.includes('Unsupported')) {
      throw new Error('密码错误或无效，无法解密该 PDF 文档');
    }
    throw new Error(`文档解锁失败：${errorMsg}`);
  }

  const pageCount = encryptedDoc.getPageCount();
  if (pageCount === 0) {
    throw new Error('该 PDF 文档不包含有效页面');
  }

  // 3. 将页面提取并迁移至全新的无密码空文档中，彻底剥离加密标记
  const unencryptedDoc = await PDFDocument.create();
  const pageIndices = encryptedDoc.getPageIndices();
  const copiedPages = await unencryptedDoc.copyPages(encryptedDoc, pageIndices);

  for (const page of copiedPages) {
    unencryptedDoc.addPage(page);
  }

  // 4. 迁移元数据（标题、作者、主题等）
  try {
    const title = encryptedDoc.getTitle();
    if (title) {
      unencryptedDoc.setTitle(title);
    }
    const author = encryptedDoc.getAuthor();
    if (author) {
      unencryptedDoc.setAuthor(author);
    }
    const subject = encryptedDoc.getSubject();
    if (subject) {
      unencryptedDoc.setSubject(subject);
    }
  }
  catch {
    // 忽略元数据复制的非致命警告
  }

  const unencryptedBytes = await unencryptedDoc.save();
  return {
    bytes: unencryptedBytes,
    pageCount,
  };
}
