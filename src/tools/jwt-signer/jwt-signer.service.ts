/**
 * JWT 签名与验签纯函数服务 (Web Crypto API 原生离线执行)
 *
 * @author Ateng
 * @since 2026-10-02
 */

import type {
  HmacAlgorithm,
  JwtHeader,
  JwtPayload,
  JwtVerificationResult,
} from './jwt-signer.types';

/**
 * 获取环境中的 Web Crypto Subtle 实例
 */
function getSubtleCrypto(): SubtleCrypto {
  const subtle =
    (typeof window !== 'undefined' && window.crypto?.subtle) ||
    (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle);

  if (!subtle) {
    throw new Error('当前运行环境不支持 Web Crypto API');
  }

  return subtle;
}

/**
 * ArrayBuffer 或 Uint8Array 转 Base64URL 字符串
 */
export function base64UrlEncode(input: ArrayBuffer | Uint8Array | string): string {
  let uint8: Uint8Array;
  if (typeof input === 'string') {
    uint8 = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    uint8 = input;
  } else {
    uint8 = new Uint8Array(input);
  }

  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }

  let base64 = '';
  if (typeof btoa === 'function') {
    base64 = btoa(binary);
  } else if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(binary, 'binary').toString('base64');
  }

  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Base64URL 字符串解码为 Uint8Array
 */
export function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  let binary = '';
  if (typeof atob === 'function') {
    binary = atob(base64);
  } else if (typeof Buffer !== 'undefined') {
    binary = Buffer.from(base64, 'base64').toString('binary');
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Base64URL 字符串解码为 UTF-8 字符串
 */
export function base64UrlDecodeToString(str: string): string {
  const bytes = base64UrlDecode(str);
  return new TextDecoder().decode(bytes);
}

/**
 * 映射 HMAC 算法对应的 SHA 哈希参数
 */
function getAlgorithmHashName(alg: HmacAlgorithm): string {
  switch (alg) {
    case 'HS384':
      return 'SHA-384';
    case 'HS512':
      return 'SHA-512';
    case 'HS256':
    default:
      return 'SHA-256';
  }
}

/**
 * 解析密钥字节数据
 */
function parseKeyData(secret: string, secretIsBase64: boolean): Uint8Array {
  if (secretIsBase64) {
    return base64UrlDecode(secret);
  }
  return new TextEncoder().encode(secret);
}

/**
 * 生成带签名的 JWT
 *
 * @param header 头部对象
 * @param payload 载荷对象
 * @param secret 签名密钥
 * @param secretIsBase64 密钥是否为 Base64 格式
 */
export async function signJwt(
  header: JwtHeader,
  payload: JwtPayload,
  secret: string,
  secretIsBase64 = false,
): Promise<string> {
  const subtle = getSubtleCrypto();
  const hashName = getAlgorithmHashName(header.alg);

  const headerJson = JSON.stringify(header);
  const payloadJson = JSON.stringify(payload);

  const headerB64 = base64UrlEncode(headerJson);
  const payloadB64 = base64UrlEncode(payloadJson);
  const signingInput = `${headerB64}.${payloadB64}`;

  const keyBytes = parseKeyData(secret, secretIsBase64);
  const cryptoKey = await subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: { name: hashName } },
    false,
    ['sign'],
  );

  const signatureBuffer = await subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const signatureB64 = base64UrlEncode(signatureBuffer);
  return `${signingInput}.${signatureB64}`;
}

/**
 * 解析 JWT 结构（不校验签名）
 */
export function decodeJwtWithoutVerify(token: string): {
  header: JwtHeader | null;
  payload: JwtPayload | null;
  signature: string;
  isValidFormat: boolean;
  errorMessage?: string;
} {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return {
      header: null,
      payload: null,
      signature: '',
      isValidFormat: false,
      errorMessage: 'Token 格式非法，必须由点号分隔为 3 个部分',
    };
  }

  try {
    const headerStr = base64UrlDecodeToString(parts[0]);
    const payloadStr = base64UrlDecodeToString(parts[1]);

    const header = JSON.parse(headerStr) as JwtHeader;
    const payload = JSON.parse(payloadStr) as JwtPayload;

    return {
      header,
      payload,
      signature: parts[2],
      isValidFormat: true,
    };
  } catch (err: any) {
    return {
      header: null,
      payload: null,
      signature: parts[2] || '',
      isValidFormat: false,
      errorMessage: `JSON 解码失败: ${err?.message || err}`,
    };
  }
}

/**
 * 完整校验 JWT 格式与签名
 *
 * @param token 完整 JWT 字符串
 * @param secret 校验密钥（留空时仅验证格式与时间有效性）
 * @param secretIsBase64 密钥是否为 Base64 格式
 */
export async function verifyJwt(
  token: string,
  secret = '',
  secretIsBase64 = false,
): Promise<JwtVerificationResult> {
  const decoded = decodeJwtWithoutVerify(token);

  const result: JwtVerificationResult = {
    isValidFormat: decoded.isValidFormat,
    isSignatureValid: false,
    header: decoded.header,
    payload: decoded.payload,
    signature: decoded.signature,
    errorMessage: decoded.errorMessage,
    timeStatus: {
      isExpired: false,
      isNotYetValid: false,
    },
  };

  if (!decoded.isValidFormat || !decoded.header || !decoded.payload) {
    return result;
  }

  // 1. 审计时间声明 (exp, nbf, iat)
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (decoded.payload.exp) {
    result.timeStatus.isExpired = nowInSeconds > decoded.payload.exp;
    result.timeStatus.expiresAtStr = new Date(decoded.payload.exp * 1000).toLocaleString();
  }
  if (decoded.payload.nbf) {
    result.timeStatus.isNotYetValid = nowInSeconds < decoded.payload.nbf;
    result.timeStatus.notBeforeStr = new Date(decoded.payload.nbf * 1000).toLocaleString();
  }
  if (decoded.payload.iat) {
    result.timeStatus.issuedAtStr = new Date(decoded.payload.iat * 1000).toLocaleString();
  }

  // 2. 若输入了密钥，则校验 HMAC 签名
  if (secret) {
    try {
      const subtle = getSubtleCrypto();
      const alg = decoded.header.alg || 'HS256';
      const hashName = getAlgorithmHashName(alg);

      const parts = token.trim().split('.');
      const signingInput = `${parts[0]}.${parts[1]}`;
      const sigBytes = base64UrlDecode(parts[2]);

      const keyBytes = parseKeyData(secret, secretIsBase64);
      const cryptoKey = await subtle.importKey(
        'raw',
        keyBytes,
        { name: 'HMAC', hash: { name: hashName } },
        false,
        ['verify'],
      );

      const isValid = await subtle.verify(
        'HMAC',
        cryptoKey,
        sigBytes,
        new TextEncoder().encode(signingInput),
      );

      result.isSignatureValid = isValid;
      if (!isValid) {
        result.errorMessage = '签名验证不匹配，数据可能已被篡改或密钥错误';
      }
    } catch (err: any) {
      result.isSignatureValid = false;
      result.errorMessage = `验签过程发生异常: ${err?.message || err}`;
    }
  }

  return result;
}
