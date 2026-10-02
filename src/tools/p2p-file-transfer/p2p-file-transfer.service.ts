/**
 * P2P 局域网快传纯函数业务服务层
 *
 * @author Ateng
 * @since 2026-10-01
 */

import { deflateSync, inflateSync, zip } from 'fflate';
import { Base64 } from 'js-base64';
import jsQR from 'jsqr';
import type {
  DeviceType,
  FileAckPayload,
  FileChunkPayload,
  FileMetaPayload,
  PeerDeviceInfo,
  ProtocolMessage,
  ProtocolMessageType,
  TextPayload,
} from './p2p-file-transfer.types';

/**
 * 生成随机短房间取件码
 *
 * @param length 房间码字符长度，默认为 6
 * @return 纯小写字母与数字组成的唯一房间短码
 */
export function generateRoomId(length = 6): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  return result;
}

/**
 * 识别并提取当前设备指纹与运行环境信息
 *
 * @param peerId 当前端分配的 Peer ID
 * @param customUa 可选的用户代理字符串，默认读取浏览器 navigator.userAgent
 * @return 规范化的设备信息对象
 */
export function detectCurrentDeviceInfo(peerId = '', customUa?: string): PeerDeviceInfo {
  const ua =
    customUa ||
    (typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : '');

  let deviceType: DeviceType = 'desktop';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (!ua) {
    return { peerId, deviceType: 'unknown', os, browser };
  }

  // 1. 判断操作系统与设备类型
  if (/iPad|Tablet/i.test(ua)) {
    deviceType = 'tablet';
    os = 'iPadOS';
  } else if (/iPhone|iPod/i.test(ua)) {
    deviceType = 'mobile';
    os = 'iOS';
  } else if (/Android/i.test(ua)) {
    deviceType = /Mobile/i.test(ua) ? 'mobile' : 'tablet';
    os = 'Android';
  } else if (/Windows NT/i.test(ua)) {
    deviceType = 'desktop';
    os = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'desktop';
    os = 'macOS';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'desktop';
    os = 'Linux';
  } else {
    deviceType = 'unknown';
  }

  // 2. 判断浏览器类型
  if (/Edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/Chrome/i.test(ua) && !/Chromium|Edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome|Edg|Android/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Opera|OPR/i.test(ua)) {
    browser = 'Opera';
  }

  return {
    peerId,
    deviceType,
    os,
    browser,
  };
}

/**
 * 构建用于手机扫码直达的房间链接
 *
 * @param baseUrl 当前页面的完整基础 URL
 * @param roomId 目标房间号
 * @return 拼接了 ?room=xxx 参数的直达 URL
 */
export function buildRoomShareUrl(baseUrl: string, roomId: string): string {
  if (!baseUrl) {
    return '';
  }

  const cleanBase = baseUrl.trim();
  const hasHash = cleanBase.includes('#');

  if (hasHash) {
    const [beforeHash, hashPart] = cleanBase.split('#');
    const [pathPart, queryPart] = hashPart.split('?');
    const params = new URLSearchParams(queryPart || '');
    params.set('room', roomId);
    return `${beforeHash}#${pathPart}?${params.toString()}`;
  }

  try {
    const url = new URL(cleanBase);
    url.searchParams.set('room', roomId);
    return url.toString();
  } catch {
    const separator = cleanBase.includes('?') ? '&' : '?';
    return `${cleanBase}${separator}room=${encodeURIComponent(roomId)}`;
  }
}

/**
 * 封装带时戳的标准格式协议消息帧
 *
 * @param type 协议帧类型
 * @param payload 承载数据
 * @return 包装后的协议消息对象
 */
export function createProtocolMessage<T = unknown>(
  type: ProtocolMessageType,
  payload?: T,
): ProtocolMessage<T> {
  return {
    type,
    payload,
    timestamp: Date.now(),
  };
}

/**
 * 解析并校验来自 DataChannel 的原始输入消息
 *
 * @param raw 原始反序列化或未解析的数据对象/字符串
 * @return 校验通过的协议消息帧，若格式非法则返回 null
 */
export function parseProtocolMessage(raw: unknown): ProtocolMessage | null {
  if (!raw) {
    return null;
  }

  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (typeof data === 'object' && data !== null && 'type' in data) {
    const msg = data as ProtocolMessage;
    if (typeof msg.type === 'string') {
      return msg;
    }
  }

  return null;
}

/**
 * 格式化网络延迟呈现
 *
 * @param ms 延迟毫秒数值
 * @return 带有单位的格式化文本
 */
export function formatLatency(ms: number): string {
  if (typeof ms !== 'number' || Number.isNaN(ms) || ms < 0) {
    return '-- ms';
  }
  return `${Math.round(ms)} ms`;
}

/**
 * 创建标准化文本便签协议帧
 *
 * @param text 文本正文内容
 * @param senderPeerId 发送端 Peer ID
 * @param senderDeviceName 发送端设备标识
 * @return 带有唯一 ID 与时间戳的协议消息
 */
export function createTextMessage(
  text: string,
  senderPeerId: string,
  senderDeviceName: string,
): ProtocolMessage<TextPayload> {
  const content = text ? text.trim() : '';
  if (!content) {
    throw new Error('文本消息内容不能为空');
  }

  const id = `txt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    type: 'text',
    payload: {
      id,
      text,
      senderPeerId,
      senderDeviceName,
    },
    timestamp: Date.now(),
  };
}

/**
 * 校验并解析文本便签有效载荷
 *
 * @param payload 待解析的载荷对象
 * @return 合法的 TextPayload 或 null
 */
export function parseTextMessagePayload(payload: unknown): TextPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const p = payload as Record<string, unknown>;
  if (
    typeof p.id === 'string' &&
    typeof p.text === 'string' &&
    typeof p.senderPeerId === 'string' &&
    typeof p.senderDeviceName === 'string'
  ) {
    return {
      id: p.id,
      text: p.text,
      senderPeerId: p.senderPeerId,
      senderDeviceName: p.senderDeviceName,
    };
  }

  return null;
}

/**
 * 默认 WebRTC 切片尺寸（16KB，跨浏览器 SCTP 最安全尺寸）
 */
export const DEFAULT_CHUNK_SIZE = 16384;

/**
 * 背压流控高水位阈值（1MB，超过时暂停推流）
 */
export const BUFFER_HIGH_WATER_MARK = 1024 * 1024;

/**
 * 背压流控低水位阈值（64KB，低于此值恢复推流）
 */
export const BUFFER_LOW_WATER_MARK = 64 * 1024;

/**
 * 计算文件分块总数
 *
 * @param fileSize 文件总字节大小
 * @param chunkSize 单块字节尺寸
 * @return 块总数
 */
export function calculateChunkCount(fileSize: number, chunkSize = DEFAULT_CHUNK_SIZE): number {
  if (fileSize <= 0) return 0;
  return Math.ceil(fileSize / chunkSize);
}

/**
 * 创建文件传输元信息广播帧
 *
 * @param fileName 文件名
 * @param fileSize 文件总大小
 * @param fileType MIME 类型
 * @param chunkSize 切片大小
 * @return 标准元数据消息帧
 */
export function createFileMetaMessage(
  fileName: string,
  fileSize: number,
  fileType: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
): ProtocolMessage<FileMetaPayload> {
  const cleanName = fileName ? fileName.trim() : '';
  if (!cleanName) {
    throw new Error('文件名不能为空');
  }

  const transferId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const totalChunks = calculateChunkCount(fileSize, chunkSize);

  return {
    type: 'file-meta',
    payload: {
      transferId,
      fileName: cleanName,
      fileSize: Math.max(0, fileSize),
      fileType: fileType || 'application/octet-stream',
      totalChunks,
      chunkSize,
    },
    timestamp: Date.now(),
  };
}

/**
 * 校验并解析文件元数据载荷
 *
 * @param payload 待解析对象
 * @return FileMetaPayload 或 null
 */
export function parseFileMetaPayload(payload: unknown): FileMetaPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const p = payload as Record<string, unknown>;
  if (
    typeof p.transferId === 'string' &&
    typeof p.fileName === 'string' &&
    typeof p.fileSize === 'number' &&
    typeof p.fileType === 'string' &&
    typeof p.totalChunks === 'number' &&
    typeof p.chunkSize === 'number'
  ) {
    return {
      transferId: p.transferId,
      fileName: p.fileName,
      fileSize: p.fileSize,
      fileType: p.fileType,
      totalChunks: p.totalChunks,
      chunkSize: p.chunkSize,
    };
  }

  return null;
}

/**
 * 创建文件数据切片传输帧
 *
 * @param transferId 关联传输任务 ID
 * @param chunkIndex 切片序号索引
 * @param data 二进制数据
 * @return 切片消息帧
 */
export function createFileChunkMessage(
  transferId: string,
  chunkIndex: number,
  data: ArrayBuffer | Uint8Array,
): ProtocolMessage<FileChunkPayload> {
  return {
    type: 'file-chunk',
    payload: {
      transferId,
      chunkIndex,
      data,
    },
    timestamp: Date.now(),
  };
}

/**
 * 校验并解析文件切片数据载荷
 *
 * @param payload 待解析对象
 * @return FileChunkPayload 或 null
 */
export function parseFileChunkPayload(payload: unknown): FileChunkPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const p = payload as Record<string, unknown>;
  if (typeof p.transferId === 'string' && typeof p.chunkIndex === 'number' && p.chunkIndex >= 0) {
    if (p.data instanceof ArrayBuffer || p.data instanceof Uint8Array || ArrayBuffer.isView(p.data)) {
      return {
        transferId: p.transferId,
        chunkIndex: p.chunkIndex,
        data: p.data as ArrayBuffer | Uint8Array,
      };
    }
    if (typeof p.data === 'string') {
      try {
        const u8 = Base64.toUint8Array(p.data);
        return {
          transferId: p.transferId,
          chunkIndex: p.chunkIndex,
          data: u8,
        };
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * 创建文件传输确认帧
 *
 * @param transferId 传输任务 ID
 * @param receivedChunks 已收到的分块数
 * @param completed 是否传输完毕
 * @return 确认协议消息
 */
export function createFileAckMessage(
  transferId: string,
  receivedChunks: number,
  completed: boolean,
): ProtocolMessage<FileAckPayload> {
  return {
    type: 'file-ack',
    payload: {
      transferId,
      receivedChunks,
      completed,
    },
    timestamp: Date.now(),
  };
}

/**
 * 校验并解析文件传输确认载荷
 *
 * @param payload 待解析对象
 * @return FileAckPayload 或 null
 */
export function parseFileAckPayload(payload: unknown): FileAckPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const p = payload as Record<string, unknown>;
  if (
    typeof p.transferId === 'string' &&
    typeof p.receivedChunks === 'number' &&
    typeof p.completed === 'boolean'
  ) {
    return {
      transferId: p.transferId,
      receivedChunks: p.receivedChunks,
      completed: p.completed,
    };
  }

  return null;
}

/**
 * 规范化格式化字节大小呈现
 *
 * @param bytes 字节数
 * @return 人类可读的大小文本
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0 || Number.isNaN(bytes)) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const clampedIndex = Math.min(i, units.length - 1);
  if (clampedIndex === 0) {
    return `${bytes} B`;
  }
  const val = bytes / Math.pow(1024, clampedIndex);
  return `${val.toFixed(1)} ${units[clampedIndex]}`;
}

/**
 * 规范化格式化网络传输速率
 *
 * @param bytesPerSec 每秒字节数
 * @return 速率字符串
 */
export function formatTransferSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0 || Number.isNaN(bytesPerSec)) {
    return '0 KB/s';
  }

  if (bytesPerSec < 1024 * 1024) {
    return `${Math.round(bytesPerSec / 1024)} KB/s`;
  }
  const mb = bytesPerSec / (1024 * 1024);
  return `${mb.toFixed(1)} MB/s`;
}

/**
 * 将离散切片数组有序合成为浏览器 Blob 对象
 *
 * @param chunks 二进制切片数组
 * @param mimeType 文件 MIME 类型
 * @return 合成后的 Blob
 */
export function assembleFileBlob(
  chunks: (ArrayBuffer | Uint8Array)[],
  mimeType = 'application/octet-stream',
): Blob {
  return new Blob(chunks, { type: mimeType || 'application/octet-stream' });
}

/**
 * 消除文件名重复，并在冲突时自动追加 (1), (2) 序号后缀
 *
 * @param fileNames 原始文件名列表
 * @return 重命名后的无冲突文件名列表
 */
export function deduplicateFileNames(fileNames: string[]): string[] {
  const counts = new Map<string, number>();
  return fileNames.map((fullName) => {
    const lastDotIndex = fullName.lastIndexOf('.');
    let baseName = fullName;
    let ext = '';

    if (lastDotIndex > 0) {
      baseName = fullName.slice(0, lastDotIndex);
      ext = fullName.slice(lastDotIndex);
    }

    const currentCount = counts.get(fullName) || 0;
    counts.set(fullName, currentCount + 1);

    if (currentCount === 0) {
      return fullName;
    }
    return `${baseName} (${currentCount})${ext}`;
  });
}

/**
 * 判断给定 MIME 类型或文件名是否为可直接预览的图片
 *
 * @param fileType MIME 类型字符串
 * @param fileName 文件名
 * @return 是否支持图片轻量预览
 */
export function isPreviewableImage(fileType = '', fileName = ''): boolean {
  if (fileType && fileType.startsWith('image/')) {
    return true;
  }
  return /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(fileName);
}

/**
 * 判断给定 MIME 类型或文件名是否为可直接预览的纯文本/代码
 *
 * @param fileType MIME 类型字符串
 * @param fileName 文件名
 * @return 是否支持文本预览
 */
export function isPreviewableText(fileType = '', fileName = ''): boolean {
  if (
    fileType &&
    (fileType.startsWith('text/') ||
      fileType === 'application/json' ||
      fileType === 'application/javascript' ||
      fileType === 'application/xml')
  ) {
    return true;
  }
  return /\.(txt|md|json|js|ts|jsx|tsx|html|css|xml|yml|yaml|log|csv|sql)$/i.test(fileName);
}

/**
 * 在内存中批量将二进制文件集合打包为 ZIP 字节数组
 *
 * @param files 文件对象数组包含原始文件名与数据流
 * @return ZIP 归档二进制字节数组
 */
export function createBatchZip(
  files: { name: string; data: Uint8Array }[],
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    if (!files || files.length === 0) {
      reject(new Error('归档文件列表为空，无法创建 ZIP 压缩包'));
      return;
    }

    const uniqueNames = deduplicateFileNames(files.map((f) => f.name));
    const zipRecord: Record<string, Uint8Array> = {};

    uniqueNames.forEach((name, idx) => {
      zipRecord[name] = files[idx].data;
    });

    zip(zipRecord, { level: 0 }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * 紧凑压缩原始 WebRTC SDP 文本并编码为 URL 安全的 Base64 字符串
 *
 * @param sdp 原始 SDP 字符串
 * @return 压缩后的紧凑 URL-safe Base64 文本
 */
export function compressSdp(sdp: string): string {
  if (!sdp || !sdp.trim()) {
    return '';
  }
  const normalizedSdp = sdp.replace(/\r?\n/g, '\r\n').trim();
  const textBytes = new TextEncoder().encode(normalizedSdp);
  const compressed = deflateSync(textBytes);
  return Base64.fromUint8Array(compressed, true);
}

/**
 * 解压 Base64 编码的 SDP 紧凑数据恢复为原始 SDP 文本
 * 具备高度容错：兼容 URL-safe Base64、标准 Base64、原始 SDP、JSON 载荷、空格换行与 URL 转义
 *
 * @param compressed 压缩后的 Base64 文本或原始 SDP
 * @return 还原并规范化换行符的原始 SDP 字符串
 */
export function decompressSdp(compressed: string): string {
  if (!compressed || !compressed.trim()) {
    return '';
  }

  let str = compressed.trim();

  // 1. URL 解码（防止被浏览器或聊天应用转义）
  if (str.includes('%')) {
    try {
      str = decodeURIComponent(str);
    } catch {
      // 保持原样
    }
  }

  // 2. 如果输入直接是 JSON 结构（如 {"type":"offer","sdp":"..."}）
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      if (typeof obj.sdp === 'string') {
        return `${obj.sdp.replace(/\r?\n/g, '\r\n').trim()}\r\n`;
      }
    } catch {
      // 保持原样
    }
  }

  // 3. 如果已经是原始 SDP 文本（包含 v=0 与 m=）
  if (str.includes('v=0') && (str.includes('m=') || str.includes('c='))) {
    return `${str.replace(/\r?\n/g, '\r\n').trim()}\r\n`;
  }

  // 4. 清理所有换行符、制表符与空格
  str = str.replace(/[\r\n\t\s]/g, '');

  try {
    const bytes = Base64.toUint8Array(str);
    const decompressed = inflateSync(bytes);
    const sdp = new TextDecoder().decode(decompressed);
    return `${sdp.replace(/\r?\n/g, '\r\n').trim()}\r\n`;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`无效的 SDP 压缩数据: ${errorMsg}`);
  }
}

/**
 * 默认高可用公网 STUN 穿透服务器集群（包含全球与中国大陆高速节点，解决非同 WiFi 跨网穿透问题）
 */
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.miwifi.com:3478' },
  { urls: 'stun:stun.qq.com:3478' },
  { urls: 'stun:stun.chat.bilibili.com:3478' },
  { urls: 'stun:stun.sipgate.net:3478' },
];

/**
 * 组装 PeerJS / WebRTC ICE 服务器列表
 *
 * @param customServer 用户自定义的单个或多个 STUN/TURN URL
 * @return 组装后的 RTCIceServer 数组
 */
export function buildPeerIceServers(customServer?: string): RTCIceServer[] {
  const result: RTCIceServer[] = [...DEFAULT_ICE_SERVERS];
  if (customServer && customServer.trim()) {
    const urls = customServer
      .split(/[\n,;]/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length > 0) {
      result.unshift({ urls });
    }
  }
  return result;
}

/**
 * 从图像的原始像素数据中检测并解析二维码内容
 *
 * @param data RGBA 像素数组
 * @param width 图像宽度
 * @param height 图像高度
 * @return 解析到的文本字符串，未识别到则返回 null
 */
export function decodeQrFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string | null {
  if (!data || width <= 0 || height <= 0) {
    return null;
  }
  try {
    const code = jsQR(data, width, height, {
      inversionAttempts: 'dontInvert',
    });
    return code ? code.data : null;
  } catch {
    return null;
  }
}




