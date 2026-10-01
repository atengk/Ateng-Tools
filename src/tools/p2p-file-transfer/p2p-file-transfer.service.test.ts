/**
 * P2P 局域网快传服务单元测试
 *
 * @author Ateng
 * @since 2026-10-01
 */

import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import {
  assembleFileBlob,
  buildRoomShareUrl,
  calculateChunkCount,
  compressSdp,
  createBatchZip,
  createFileAckMessage,
  createFileChunkMessage,
  createFileMetaMessage,
  createProtocolMessage,
  createTextMessage,
  decompressSdp,
  deduplicateFileNames,
  detectCurrentDeviceInfo,
  formatFileSize,
  formatLatency,
  formatTransferSpeed,
  generateRoomId,
  isPreviewableImage,
  isPreviewableText,
  parseFileAckPayload,
  parseFileChunkPayload,
  parseFileMetaPayload,
  parseProtocolMessage,
  parseTextMessagePayload,
} from './p2p-file-transfer.service';

describe('p2p-file-transfer service', () => {
  describe('generateRoomId', () => {
    it('应生成指定长度的字母与数字组合房间号', () => {
      const id1 = generateRoomId(6);
      const id2 = generateRoomId(6);

      expect(id1).toHaveLength(6);
      expect(id2).toHaveLength(6);
      expect(id1).toMatch(/^[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('默认长度应为 6 位', () => {
      const id = generateRoomId();
      expect(id).toHaveLength(6);
    });
  });

  describe('detectCurrentDeviceInfo', () => {
    it('应正确识别 Windows Chrome 桌面端环境', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const info = detectCurrentDeviceInfo('peer-123', ua);

      expect(info.peerId).toBe('peer-123');
      expect(info.deviceType).toBe('desktop');
      expect(info.os).toContain('Windows');
      expect(info.browser).toBe('Chrome');
    });

    it('应正确识别 iPhone Safari 移动端环境', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const info = detectCurrentDeviceInfo('peer-456', ua);

      expect(info.deviceType).toBe('mobile');
      expect(info.os).toBe('iOS');
      expect(info.browser).toBe('Safari');
    });

    it('应正确识别 Android 手机移动端环境', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36';
      const info = detectCurrentDeviceInfo('peer-789', ua);

      expect(info.deviceType).toBe('mobile');
      expect(info.os).toBe('Android');
      expect(info.browser).toBe('Chrome');
    });

    it('在无法识别的 UA 下应安全兜底', () => {
      const info = detectCurrentDeviceInfo('peer-000', 'CustomUnknownBot/1.0');
      expect(info.deviceType).toBe('unknown');
      expect(info.os).toBe('Unknown OS');
      expect(info.browser).toBe('Unknown Browser');
    });
  });

  describe('buildRoomShareUrl', () => {
    it('针对 Hash 路由模式正确拼接 room 查询参数', () => {
      const base = 'https://tools.ateng.top/#/p2p-file-transfer';
      const url = buildRoomShareUrl(base, 'room888');

      expect(url).toBe('https://tools.ateng.top/#/p2p-file-transfer?room=room888');
    });

    it('针对已带有查询参数的 URL 正确追加或替换 room 参数', () => {
      const base = 'https://tools.ateng.top/#/p2p-file-transfer?foo=bar';
      const url = buildRoomShareUrl(base, 'room888');

      expect(url).toContain('room=room888');
    });
  });

  describe('createProtocolMessage & parseProtocolMessage', () => {
    it('应正确打包并解析合法的协议消息帧', () => {
      const msg = createProtocolMessage('ping', { text: 'hello' });
      expect(msg.type).toBe('ping');
      expect(msg.payload).toEqual({ text: 'hello' });
      expect(msg.timestamp).toBeGreaterThan(0);

      const parsed = parseProtocolMessage(JSON.stringify(msg));
      expect(parsed).toEqual(msg);
    });

    it('直接传入结构化对象时应正确解析', () => {
      const raw = { type: 'connect-accept', timestamp: 123456789 };
      const parsed = parseProtocolMessage(raw);
      expect(parsed).toEqual(raw);
    });

    it('解析非 JSON 或缺少 type 属性的非法消息时应返回 null 兜底', () => {
      expect(parseProtocolMessage('not a json')).toBeNull();
      expect(parseProtocolMessage({ foo: 'bar' })).toBeNull();
      expect(parseProtocolMessage(null)).toBeNull();
      expect(parseProtocolMessage(12345)).toBeNull();
    });
  });

  describe('formatLatency', () => {
    it('应格式化正数毫秒', () => {
      expect(formatLatency(15)).toBe('15 ms');
      expect(formatLatency(0)).toBe('0 ms');
    });

    it('针对无效值应返回占位符', () => {
      expect(formatLatency(-1)).toBe('-- ms');
      expect(formatLatency(Number.NaN)).toBe('-- ms');
    });
  });

  describe('createTextMessage & parseTextMessagePayload', () => {
    it('应正确创建文本消息帧', () => {
      const msg = createTextMessage('Hello World! 🚀', 'peer-1', 'iPhone 15');
      expect(msg.type).toBe('text');
      expect(msg.payload?.text).toBe('Hello World! 🚀');
      expect(msg.payload?.senderPeerId).toBe('peer-1');
      expect(msg.payload?.senderDeviceName).toBe('iPhone 15');
      expect(msg.payload?.id).toBeDefined();
    });

    it('空文本应抛出错误或安全拒绝', () => {
      expect(() => createTextMessage('', 'peer-1', 'PC')).toThrow();
      expect(() => createTextMessage('   ', 'peer-1', 'PC')).toThrow();
    });

    it('应正确解析合法文本有效载荷', () => {
      const payload = {
        id: 'msg-123',
        text: 'Multi-line\nText',
        senderPeerId: 'peer-1',
        senderDeviceName: 'Chrome',
      };
      const parsed = parseTextMessagePayload(payload);
      expect(parsed).toEqual(payload);
    });

    it('非法载荷应返回 null', () => {
      expect(parseTextMessagePayload(null)).toBeNull();
      expect(parseTextMessagePayload('string')).toBeNull();
      expect(parseTextMessagePayload({ text: 123 })).toBeNull();
      expect(parseTextMessagePayload({})).toBeNull();
    });
  });

  describe('calculateChunkCount', () => {
    it('应计算正确的分块总数', () => {
      expect(calculateChunkCount(1000, 500)).toBe(2);
      expect(calculateChunkCount(1001, 500)).toBe(3);
      expect(calculateChunkCount(0, 500)).toBe(0);
      expect(calculateChunkCount(-10, 500)).toBe(0);
    });
  });

  describe('createFileMetaMessage & parseFileMetaPayload', () => {
    it('应封装标准文件元信息帧', () => {
      const msg = createFileMetaMessage('demo.png', 32000, 'image/png', 16000);
      expect(msg.type).toBe('file-meta');
      expect(msg.payload?.fileName).toBe('demo.png');
      expect(msg.payload?.fileSize).toBe(32000);
      expect(msg.payload?.totalChunks).toBe(2);
      expect(msg.payload?.transferId).toBeDefined();

      const parsed = parseFileMetaPayload(msg.payload);
      expect(parsed).toEqual(msg.payload);
    });

    it('空文件名应抛出错误', () => {
      expect(() => createFileMetaMessage('', 100, 'text/plain')).toThrow();
    });

    it('非法元数据应返回 null', () => {
      expect(parseFileMetaPayload(null)).toBeNull();
      expect(parseFileMetaPayload({})).toBeNull();
      expect(parseFileMetaPayload({ fileName: 'a.txt' })).toBeNull();
    });
  });

  describe('createFileChunkMessage & parseFileChunkPayload', () => {
    it('应封装切片数据帧并能正常校验解析', () => {
      const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
      const msg = createFileChunkMessage('trans-1', 0, buffer);

      expect(msg.type).toBe('file-chunk');
      expect(msg.payload?.transferId).toBe('trans-1');
      expect(msg.payload?.chunkIndex).toBe(0);

      const parsed = parseFileChunkPayload(msg.payload);
      expect(parsed?.transferId).toBe('trans-1');
      expect(parsed?.chunkIndex).toBe(0);
    });

    it('能正确解析来自 JSON 序列化的 Base64 字符串切片', () => {
      const parsed = parseFileChunkPayload({
        transferId: 'trans-2',
        chunkIndex: 1,
        data: 'AQIDBA==',
      });
      expect(parsed?.transferId).toBe('trans-2');
      expect(parsed?.chunkIndex).toBe(1);
      expect(parsed?.data).toBeInstanceOf(Uint8Array);
      expect(Array.from(parsed!.data as Uint8Array)).toEqual([1, 2, 3, 4]);
    });

    it('非法切片应返回 null', () => {
      expect(parseFileChunkPayload(null)).toBeNull();
      expect(parseFileChunkPayload({ chunkIndex: -1 })).toBeNull();
      expect(parseFileChunkPayload({ transferId: 't1', chunkIndex: 0 })).toBeNull();
    });
  });

  describe('createFileAckMessage & parseFileAckPayload', () => {
    it('应封装确认帧并校验解析', () => {
      const msg = createFileAckMessage('trans-1', 5, false);
      expect(msg.type).toBe('file-ack');
      expect(msg.payload?.transferId).toBe('trans-1');
      expect(msg.payload?.receivedChunks).toBe(5);
      expect(msg.payload?.completed).toBe(false);

      const parsed = parseFileAckPayload(msg.payload);
      expect(parsed).toEqual(msg.payload);
    });

    it('非法确认帧应返回 null', () => {
      expect(parseFileAckPayload(null)).toBeNull();
      expect(parseFileAckPayload({})).toBeNull();
    });
  });

  describe('formatFileSize & formatTransferSpeed', () => {
    it('应规范格式化字节大小', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
      expect(formatFileSize(1024 * 1024 * 1024 * 3.2)).toBe('3.2 GB');
      expect(formatFileSize(-1)).toBe('0 B');
    });

    it('应规范格式化传输速率', () => {
      expect(formatTransferSpeed(0)).toBe('0 KB/s');
      expect(formatTransferSpeed(512 * 1024)).toBe('512 KB/s');
      expect(formatTransferSpeed(1024 * 1024 * 3.5)).toBe('3.5 MB/s');
    });
  });

  describe('assembleFileBlob', () => {
    it('应将多个二进制切片成功拼装为 Blob', () => {
      const chunk1 = new Uint8Array([1, 2]);
      const chunk2 = new Uint8Array([3, 4]);
      const blob = assembleFileBlob([chunk1.buffer, chunk2.buffer], 'application/octet-stream');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(4);
      expect(blob.type).toBe('application/octet-stream');
    });
  });

  describe('deduplicateFileNames', () => {
    it('对于不重复的文件名数组应原样保留', () => {
      const names = ['doc.pdf', 'photo.png', 'notes.txt'];
      expect(deduplicateFileNames(names)).toEqual(['doc.pdf', 'photo.png', 'notes.txt']);
    });

    it('对于重复的文件名应在拓展名前追加 (1), (2) 序号', () => {
      const names = ['photo.png', 'photo.png', 'doc.pdf', 'photo.png'];
      expect(deduplicateFileNames(names)).toEqual([
        'photo.png',
        'photo (1).png',
        'doc.pdf',
        'photo (2).png',
      ]);
    });

    it('无后缀名的文件也能正确追加序号', () => {
      const names = ['README', 'README'];
      expect(deduplicateFileNames(names)).toEqual(['README', 'README (1)']);
    });
  });

  describe('isPreviewableImage & isPreviewableText', () => {
    it('正确识别可预览的图片类型与扩展名', () => {
      expect(isPreviewableImage('image/png', 'test.bin')).toBe(true);
      expect(isPreviewableImage('image/jpeg', 'test.jpg')).toBe(true);
      expect(isPreviewableImage('', 'photo.webp')).toBe(true);
      expect(isPreviewableImage('', 'icon.svg')).toBe(true);
      expect(isPreviewableImage('application/pdf', 'file.pdf')).toBe(false);
    });

    it('正确识别可预览的纯文本与代码文件', () => {
      expect(isPreviewableText('text/plain', 'notes.txt')).toBe(true);
      expect(isPreviewableText('application/json', 'data.bin')).toBe(true);
      expect(isPreviewableText('', 'script.js')).toBe(true);
      expect(isPreviewableText('', 'config.yml')).toBe(true);
      expect(isPreviewableText('', 'query.sql')).toBe(true);
      expect(isPreviewableText('image/png', 'img.png')).toBe(false);
      expect(isPreviewableText('video/mp4', 'clip.mp4')).toBe(false);
    });
  });

  describe('createBatchZip', () => {
    it('空列表应抛出拒绝错误', async () => {
      await expect(createBatchZip([])).rejects.toThrow('归档文件列表为空');
    });

    it('能将多个二进制文件在内存中打包为标准 ZIP 字节流并可解压还原', async () => {
      const textEncoder = new TextEncoder();
      const files = [
        { name: 'hello.txt', data: textEncoder.encode('Hello World') },
        { name: 'hello.txt', data: textEncoder.encode('Duplicate Name File') },
        { name: 'data.bin', data: new Uint8Array([10, 20, 30]) },
      ];

      const zipBytes = await createBatchZip(files);
      expect(zipBytes).toBeInstanceOf(Uint8Array);
      expect(zipBytes.length).toBeGreaterThan(0);

      const unzipped = unzipSync(zipBytes);
      expect(unzipped['hello.txt']).toBeDefined();
      expect(unzipped['hello (1).txt']).toBeDefined();
      expect(unzipped['data.bin']).toBeDefined();

      const textDecoder = new TextDecoder();
      expect(textDecoder.decode(unzipped['hello.txt'])).toBe('Hello World');
      expect(textDecoder.decode(unzipped['hello (1).txt'])).toBe('Duplicate Name File');
    });
  });

  describe('compressSdp & decompressSdp', () => {
    it('空字符串或全空白字符输入时返回空字符串', () => {
      expect(compressSdp('')).toBe('');
      expect(compressSdp('   ')).toBe('');
      expect(decompressSdp('')).toBe('');
      expect(decompressSdp('   ')).toBe('');
    });

    it('能无损压缩标准 WebRTC SDP 并正确解压还原', () => {
      const mockSdp =
        'v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=candidate:1 1 UDP 2122252543 192.168.1.100 54321 typ host\r\na=candidate:2 1 UDP 2122252542 10.0.0.5 54322 typ host\r\na=ice-ufrag:xyz12345\r\na=ice-pwd:password12345678901234567890\r\na=fingerprint:sha-256 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF\r\na=setup:actpass\r\na=mid:0\r\na=sctp-port:5000\r\na=max-message-size:262144\r\n'.repeat(
          2,
        );

      const compressed = compressSdp(mockSdp);
      expect(typeof compressed).toBe('string');
      expect(compressed.length).toBeGreaterThan(0);
      expect(compressed.length).toBeLessThan(mockSdp.length);

      const decompressed = decompressSdp(compressed);
      expect(decompressed).toBe(`${mockSdp.trim()}\r\n`);
    });

    it('生成的压缩串应使用 URL-safe 字符集不含加号与斜杠', () => {
      const mockSdp = 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n';
      const compressed = compressSdp(mockSdp);
      expect(/[+/=]/.test(compressed)).toBe(false);
    });

    it('能兼容带内部换行、空格与制表符的 Base64 凭证', () => {
      const mockSdp = 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n';
      const compressed = compressSdp(mockSdp);
      const withWhitespaces = `  \n${compressed.slice(0, 20)} \n ${compressed.slice(20, 40)}\t\r\n${compressed.slice(40)}  `;
      expect(decompressSdp(withWhitespaces)).toBe(`${mockSdp.trim()}\r\n`);
    });

    it('能直接兼容原始未压缩的 SDP 文本输入', () => {
      const mockSdp = 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel';
      expect(decompressSdp(mockSdp)).toBe(`${mockSdp.trim()}\r\n`);
    });

    it('能直接兼容包含 sdp 字段的 JSON 载荷', () => {
      const mockSdp = 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=-\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel';
      const json = JSON.stringify({ type: 'offer', sdp: mockSdp });
      expect(decompressSdp(json)).toBe(`${mockSdp.trim()}\r\n`);
    });

    it('输入非法或损坏的压缩字符串时应抛出错误', () => {
      expect(() => decompressSdp('invalid-corrupted-base64-content!')).toThrow('无效的 SDP 压缩数据');
    });
  });
});




