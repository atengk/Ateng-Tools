/**
 * 本地大文件校验与哈希比对器类型契约定义
 *
 * @author Ateng
 * @since 2026-10-01
 */

/** 支持的哈希算法 */
export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

/** 单文件哈希计算输出结果 */
export interface FileChecksumResult {
  fileName: string
  fileSize: number
  hashes: Partial<Record<HashAlgorithm, string>>
  elapsedMs: number
}

/** 参考哈希比对匹配结果 */
export interface HashComparisonResult {
  isMatched: boolean
  matchedAlgorithm?: HashAlgorithm
  expectedHash: string
  calculatedHash?: string
}

/** 分块流式计算实时进度反馈 */
export interface ChunkProgress {
  bytesProcessed: number
  totalBytes: number
  percent: number
  speedBytesPerSec: number
}
