/**
 * JWT 签名与验签工坊单元测试
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { describe, expect, it } from 'vitest';
import {
  base64UrlDecode,
  base64UrlDecodeToString,
  base64UrlEncode,
  decodeJwtWithoutVerify,
  signJwt,
  verifyJwt,
} from './jwt-signer.service';
import type { JwtHeader, JwtPayload } from './jwt-signer.types';

describe('jwt-signer.service', () => {
  it('Base64URL 编解码往返无损', () => {
    const raw = 'Hello Ateng-Tools! 这是一个测试 12345?#';
    const encoded = base64UrlEncode(raw);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');

    const decoded = base64UrlDecodeToString(encoded);
    expect(decoded).toBe(raw);
  });

  it('HS256 签名与合法验签', async () => {
    const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
    const payload: JwtPayload = { sub: '1234567890', name: 'John Doe', admin: true };
    const secret = 'my-super-secret-key-123';

    const token = await signJwt(header, payload, secret);
    expect(token.split('.')).toHaveLength(3);

    const verifyRes = await verifyJwt(token, secret);
    expect(verifyRes.isValidFormat).toBe(true);
    expect(verifyRes.isSignatureValid).toBe(true);
    expect(verifyRes.payload?.name).toBe('John Doe');
    expect(verifyRes.payload?.admin).toBe(true);
  });

  it('HS384 与 HS512 签名与验签', async () => {
    const header384: JwtHeader = { alg: 'HS384', typ: 'JWT' };
    const payload: JwtPayload = { role: 'tester' };
    const secret = 'secret-key-for-sha384';

    const token384 = await signJwt(header384, payload, secret);
    const res384 = await verifyJwt(token384, secret);
    expect(res384.isSignatureValid).toBe(true);

    const header512: JwtHeader = { alg: 'HS512', typ: 'JWT' };
    const token512 = await signJwt(header512, payload, secret);
    const res512 = await verifyJwt(token512, secret);
    expect(res512.isSignatureValid).toBe(true);
  });

  it('Payload 被篡改时验签应失败', async () => {
    const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
    const payload: JwtPayload = { user: 'alice', amount: 100 };
    const secret = 'safe-key';

    const token = await signJwt(header, payload, secret);
    const parts = token.split('.');

    // 伪造修改 payload 为 amount: 99999
    const tamperedPayload = base64UrlEncode(JSON.stringify({ user: 'alice', amount: 99999 }));
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const verifyRes = await verifyJwt(tamperedToken, secret);
    expect(verifyRes.isValidFormat).toBe(true);
    expect(verifyRes.isSignatureValid).toBe(false);
    expect(verifyRes.errorMessage).toContain('签名验证不匹配');
  });

  it('密钥错误时验签应失败', async () => {
    const token = await signJwt(
      { alg: 'HS256', typ: 'JWT' },
      { test: true },
      'correct-secret',
    );
    const verifyRes = await verifyJwt(token, 'wrong-secret');
    expect(verifyRes.isSignatureValid).toBe(false);
  });

  it('时间状态审计：已过期与未生效检测', async () => {
    const now = Math.floor(Date.now() / 1000);

    // 已过期 (exp 为过去 1 小时)
    const expiredToken = await signJwt(
      { alg: 'HS256', typ: 'JWT' },
      { exp: now - 3600 },
      'secret',
    );
    const resExpired = await verifyJwt(expiredToken, 'secret');
    expect(resExpired.timeStatus.isExpired).toBe(true);
    expect(resExpired.timeStatus.isNotYetValid).toBe(false);

    // 尚未生效 (nbf 为未来 1 小时)
    const futureToken = await signJwt(
      { alg: 'HS256', typ: 'JWT' },
      { nbf: now + 3600 },
      'secret',
    );
    const resFuture = await verifyJwt(futureToken, 'secret');
    expect(resFuture.timeStatus.isNotYetValid).toBe(true);
  });

  it('非标准或畸变 Token 边界校验', async () => {
    const malformed = 'abc.def';
    const decoded = decodeJwtWithoutVerify(malformed);
    expect(decoded.isValidFormat).toBe(false);

    const verifyRes = await verifyJwt(malformed);
    expect(verifyRes.isValidFormat).toBe(false);
  });
});
