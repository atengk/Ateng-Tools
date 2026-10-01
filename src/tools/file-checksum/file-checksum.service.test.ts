/**
 * 本地大文件哈希校验服务单元测试
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { describe, expect, it, vi } from 'vitest';
import {
  compareHash,
  compareTwoFileResults,
  computeBufferHash,
  computeChunkedFileHash,
  formatFileSize,
  formatSpeed,
  uint8ArrayToWordArray,
} from './file-checksum.service';
import type { FileChecksumResult } from './file-checksum.types';

describe('file-checksum.service', () => {
  const helloBytes = new TextEncoder().encode('Hello World');

  describe('uint8ArrayToWordArray', () => {
    it('正确将 Uint8Array 转换为 WordArray', () => {
      const wa = uint8ArrayToWordArray(helloBytes);
      expect(wa.sigBytes).toBe(11);
      expect(wa.words.length).toBe(3);
    });
  });

  describe('computeBufferHash', () => {
    it('精确计算各算法的已知标准哈希摘要', () => {
      const hashes = computeBufferHash(helloBytes, ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']);

      expect(hashes.MD5).toBe('b10a8db164e0754105b7a99be72e3fe5');
      expect(hashes['SHA-1']).toBe('0a4d55a8d778e5022fab701977c5d840bbc486d0');
      expect(hashes['SHA-256']).toBe('a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e');
      expect(hashes['SHA-384']).toBe('99514329186b2f6ae4a1329e7ee6c610a729636335174ac6b740f9028396fcc803d0e93863a7c3d90f86beee782f4f3f');
      expect(hashes['SHA-512']).toBe('2c74fd17edafd80e8447b0d46741ee243b7eb74dd2149a0ab1b9246fb30382f27e853d8585719e0e67cbda0daa8f51671064615d645ae27acb15bfb1447f459b');
    });
  });

  describe('computeChunkedFileHash', () => {
    it('分块流式计算结果应与全量计算完全一致', async () => {
      const text = 'Ateng-Tools: 纯客户端离线开发者工具箱，保护隐私零数据泄漏。'.repeat(10);
      const blob = new Blob([text]);

      const onProgress = vi.fn();
      // 使用极小的分块大小 (32 字节) 模拟大文件切片流
      const hashes = await computeChunkedFileHash(
        blob,
        ['MD5', 'SHA-256'],
        onProgress,
        undefined,
        32,
      );

      const standard = computeBufferHash(new TextEncoder().encode(text), ['MD5', 'SHA-256']);
      expect(hashes.MD5).toBe(standard.MD5);
      expect(hashes['SHA-256']).toBe(standard['SHA-256']);
      expect(onProgress).toHaveBeenCalled();
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1][0];
      expect(lastCall.percent).toBe(100);
      expect(lastCall.bytesProcessed).toBe(blob.size);
    });

    it('响应中断标志并抛出取消异常', async () => {
      const blob = new Blob(['A'.repeat(1024)]);
      const abortSignal = { aborted: true };

      await expect(
        computeChunkedFileHash(blob, ['MD5'], undefined, abortSignal, 16),
      ).rejects.toThrow('计算已被用户主动取消');
    });
  });

  describe('compareHash', () => {
    const computed = {
      MD5: 'b10a8db164e0754105b7a99be72e3fe5',
      'SHA-256': 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    };

    it('支持大写及带空格的哈希匹配', () => {
      const res = compareHash('  B10A8DB164E0754105B7A99BE72E3FE5  ', computed);
      expect(res.isMatched).toBe(true);
      expect(res.matchedAlgorithm).toBe('MD5');
    });

    it('输入不匹配时返回 isMatched=false', () => {
      const res = compareHash('1234567890abcdef', computed);
      expect(res.isMatched).toBe(false);
      expect(res.matchedAlgorithm).toBeUndefined();
    });

    it('空输入返回未匹配', () => {
      const res = compareHash('', computed);
      expect(res.isMatched).toBe(false);
    });
  });

  describe('compareTwoFileResults', () => {
    it('哈希与大小一致时判定为完全相同', () => {
      const fileA: FileChecksumResult = {
        fileName: 'a.iso',
        fileSize: 1024,
        hashes: { MD5: 'hash1', 'SHA-256': 'hash2' },
        elapsedMs: 100,
      };
      const fileB: FileChecksumResult = {
        fileName: 'b.iso',
        fileSize: 1024,
        hashes: { MD5: 'hash1', 'SHA-256': 'hash2' },
        elapsedMs: 105,
      };

      const cmp = compareTwoFileResults(fileA, fileB);
      expect(cmp.isIdentical).toBe(true);
      expect(cmp.matchedAlgorithms).toEqual(['MD5', 'SHA-256']);
      expect(cmp.mismatchedAlgorithms).toHaveLength(0);
    });

    it('存在哈希不一致时判定为不同', () => {
      const fileA: FileChecksumResult = {
        fileName: 'a.iso',
        fileSize: 1024,
        hashes: { MD5: 'hash1', 'SHA-256': 'hash2' },
        elapsedMs: 100,
      };
      const fileB: FileChecksumResult = {
        fileName: 'b.iso',
        fileSize: 1024,
        hashes: { MD5: 'hash1', 'SHA-256': 'DIFFERENT' },
        elapsedMs: 105,
      };

      const cmp = compareTwoFileResults(fileA, fileB);
      expect(cmp.isIdentical).toBe(false);
      expect(cmp.mismatchedAlgorithms).toContain('SHA-256');
    });
  });

  describe('formatFileSize & formatSpeed', () => {
    it('正确格式化各种尺寸', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512.0 B');
      expect(formatFileSize(2048)).toBe('2.00 KB');
      expect(formatFileSize(10 * 1024 * 1024)).toBe('10.0 MB');
    });

    it('正确格式化传输速度', () => {
      expect(formatSpeed(0)).toBe('0 KB/s');
      expect(formatSpeed(500 * 1024)).toBe('500.0 KB/s');
      expect(formatSpeed(25 * 1024 * 1024)).toBe('25.0 MB/s');
    });
  });
});
