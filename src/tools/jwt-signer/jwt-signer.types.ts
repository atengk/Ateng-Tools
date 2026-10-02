/**
 * JWT 签名与验签工坊类型契约
 *
 * @author Ateng
 * @since 2026-10-02
 */

export type HmacAlgorithm = 'HS256' | 'HS384' | 'HS512';

export interface JwtHeader {
  alg: HmacAlgorithm;
  typ: string;
  [key: string]: any;
}

export interface JwtPayload {
  sub?: string;
  name?: string;
  iat?: number;
  exp?: number;
  nbf?: number;
  jti?: string;
  iss?: string;
  aud?: string;
  [key: string]: any;
}

export interface JwtVerificationResult {
  isValidFormat: boolean;
  isSignatureValid: boolean;
  header: JwtHeader | null;
  payload: JwtPayload | null;
  signature: string;
  errorMessage?: string;
  timeStatus: {
    isExpired: boolean;
    isNotYetValid: boolean;
    issuedAtStr?: string;
    expiresAtStr?: string;
    notBeforeStr?: string;
  };
}
