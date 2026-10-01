/**
 * 本地大文件校验与哈希比对纯函数服务
 *
 * @author Ateng
 * @since 2026-10-01
 */
import CryptoJS from 'crypto-js';
import type {
  ChunkProgress,
  FileChecksumResult,
  HashAlgorithm,
  HashComparisonResult,
} from './file-checksum.types';

/** 默认分块读取大小 (2MB) */
export const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * 将 Uint8Array 二进制字节数组高效转换为 CryptoJS WordArray 结构
 *
 * @param u8 输入二进制字节
 * @returns CryptoJS WordArray 实例
 */
export function uint8ArrayToWordArray(u8: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < u8.length; i += 4) {
    words.push(
      (u8[i] << 24)
      | ((u8[i + 1] || 0) << 16)
      | ((u8[i + 2] || 0) << 8)
      | (u8[i + 3] || 0),
    );
  }
  return CryptoJS.lib.WordArray.create(words, u8.length);
}

/**
 * 创建对应算法的渐进式哈希计算器实例
 *
 * @param algorithm 目标算法
 * @returns CryptoJS 渐进哈希对象
 */
function createHasher(algorithm: HashAlgorithm) {
  switch (algorithm) {
    case 'MD5':
      return CryptoJS.algo.MD5.create();
    case 'SHA-1':
      return CryptoJS.algo.SHA1.create();
    case 'SHA-256':
      return CryptoJS.algo.SHA256.create();
    case 'SHA-384':
      return CryptoJS.algo.SHA384.create();
    case 'SHA-512':
      return CryptoJS.algo.SHA512.create();
  }
}

/**
 * 一次性计算小内存 Buffer 的多种摘要哈希
 *
 * @param data 输入二进制字节数据
 * @param algorithms 需要计算的算法集合
 * @returns 计算生成的哈希字典 (小写 Hex)
 */
export function computeBufferHash(
  data: Uint8Array,
  algorithms: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256'],
): Record<HashAlgorithm, string> {
  const wa = uint8ArrayToWordArray(data);
  const result: Partial<Record<HashAlgorithm, string>> = {};

  for (const alg of algorithms) {
    const hasher = createHasher(alg);
    hasher.update(wa);
    result[alg] = hasher.finalize().toString();
  }

  return result as Record<HashAlgorithm, string>;
}

/**
 * 安全读取 Blob/File 切片为 ArrayBuffer (优先原生 arrayBuffer，降级 FileReader)
 *
 * @param blob 二进制 Blob 切片
 * @returns ArrayBuffer 实例
 */
export async function readBlobChunkAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return await blob.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('读取数据切片失败'));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * 基于 HTML5 Blob 分块流式计算哈希摘要，防止大文件溢出主内存
 *
 * @param file 待校验文件对象
 * @param algorithms 启用的算法列表
 * @param onProgress 进度回调函数
 * @param abortSignal 中断控制标志
 * @param chunkSize 分块尺寸 (默认 2MB)
 * @returns 最终哈希计算字典 (小写 Hex)
 */
export async function computeChunkedFileHash(
  file: Blob,
  algorithms: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256'],
  onProgress?: (progress: ChunkProgress) => void,
  abortSignal?: { aborted: boolean },
  chunkSize = DEFAULT_CHUNK_SIZE,
): Promise<Record<HashAlgorithm, string>> {
  if (algorithms.length === 0) {
    throw new Error('未选择任何哈希算法');
  }

  // 1. 初始化各算法实例与时间戳
  const hashers = algorithms.map(alg => ({
    name: alg,
    instance: createHasher(alg),
  }));

  const totalBytes = file.size;
  let offset = 0;
  const startTime = Date.now();

  // 2. 依次切片读取并更新哈希状态
  while (offset < totalBytes) {
    if (abortSignal?.aborted) {
      throw new Error('计算已被用户主动取消');
    }

    const end = Math.min(offset + chunkSize, totalBytes);
    const slice = file.slice(offset, end);
    const arrayBuffer = await readBlobChunkAsArrayBuffer(slice);
    const u8 = new Uint8Array(arrayBuffer);
    const wa = uint8ArrayToWordArray(u8);

    for (const h of hashers) {
      h.instance.update(wa);
    }

    offset = end;
    const now = Date.now();
    const elapsedSeconds = Math.max((now - startTime) / 1000, 0.001);
    const speed = offset / elapsedSeconds;
    const percent = totalBytes > 0 ? (offset / totalBytes) * 100 : 100;

    if (onProgress) {
      onProgress({
        bytesProcessed: offset,
        totalBytes,
        percent: Math.min(percent, 100),
        speedBytesPerSec: speed,
      });
    }
  }

  // 3. 最终收束结算生成十六进制字符串
  const result: Partial<Record<HashAlgorithm, string>> = {};
  for (const h of hashers) {
    result[h.name] = h.instance.finalize().toString();
  }

  return result as Record<HashAlgorithm, string>;
}

/**
 * 比对用户输入的参考期望哈希值与计算出的哈希集
 *
 * @param expected 用户填写的参考哈希
 * @param computedHashes 当前计算得出的哈希值集合
 * @returns 匹配校验结果
 */
export function compareHash(
  expected: string,
  computedHashes: Partial<Record<HashAlgorithm, string>>,
): HashComparisonResult {
  const cleanExpected = expected.trim().toLowerCase();
  if (!cleanExpected) {
    return { isMatched: false, expectedHash: '' };
  }

  for (const [alg, hashVal] of Object.entries(computedHashes)) {
    if (hashVal && hashVal.toLowerCase() === cleanExpected) {
      return {
        isMatched: true,
        matchedAlgorithm: alg as HashAlgorithm,
        expectedHash: cleanExpected,
        calculatedHash: hashVal,
      };
    }
  }

  return {
    isMatched: false,
    expectedHash: cleanExpected,
  };
}

/**
 * 对比两个文件的哈希结果是否完全一致
 *
 * @param resA 文件 A 的计算结果
 * @param resB 文件 B 的计算结果
 * @returns 一致性校验及详情
 */
export function compareTwoFileResults(
  resA: FileChecksumResult,
  resB: FileChecksumResult,
): {
  isIdentical: boolean
  matchedAlgorithms: HashAlgorithm[]
  mismatchedAlgorithms: HashAlgorithm[]
} {
  const matched: HashAlgorithm[] = [];
  const mismatched: HashAlgorithm[] = [];

  const allKeys = Array.from(
    new Set([
      ...Object.keys(resA.hashes),
      ...Object.keys(resB.hashes),
    ]),
  ) as HashAlgorithm[];

  for (const key of allKeys) {
    const valA = resA.hashes[key]?.toLowerCase();
    const valB = resB.hashes[key]?.toLowerCase();
    if (valA && valB) {
      if (valA === valB) {
        matched.push(key);
      }
      else {
        mismatched.push(key);
      }
    }
  }

  const isIdentical = matched.length > 0 && mismatched.length === 0 && resA.fileSize === resB.fileSize;

  return {
    isIdentical,
    matchedAlgorithms: matched,
    mismatchedAlgorithms: mismatched,
  };
}

/**
 * 将字节大小格式化为易读的文本单位 (B, KB, MB, GB)
 *
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / 1024 ** i;
  return `${val.toFixed(val < 10 && i > 0 ? 2 : 1)} ${units[i]}`;
}

/**
 * 将传输速率格式化为易读的文本单位 (KB/s, MB/s)
 *
 * @param bytesPerSec 每秒字节数
 * @returns 格式化后的速度文本
 */
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0 KB/s';
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}
