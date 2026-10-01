/**
 * Favicon 网站图标纯函数服务
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { zipSync } from 'fflate';
import { Base64 } from 'js-base64';
import type {
  FaviconSpec,
  WebManifestOptions,
} from './favicon-generator.types';
import { removePotentialDataAndMimePrefix } from '@/utils/base64';

/** 官方标准与跨平台推荐的 Favicon 规格集合 */
export const FAVICON_SPECS: FaviconSpec[] = [
  {
    fileName: 'favicon-16x16.png',
    width: 16,
    height: 16,
    description: '经典浏览器标签页小图标',
    includeInIco: true,
  },
  {
    fileName: 'favicon-32x32.png',
    width: 32,
    height: 32,
    description: '标准桌面标签页与快捷方式',
    includeInIco: true,
  },
  {
    fileName: 'favicon-48x48.png',
    width: 48,
    height: 48,
    description: 'Windows 桌面与任务栏快捷图标',
    includeInIco: true,
  },
  {
    fileName: 'apple-touch-icon.png',
    width: 180,
    height: 180,
    description: 'iOS / iPadOS Safari 主屏幕书签',
    includeInIco: false,
  },
  {
    fileName: 'android-chrome-192x192.png',
    width: 192,
    height: 192,
    description: 'Android / Chrome PWA 标准图标',
    includeInIco: false,
  },
  {
    fileName: 'android-chrome-512x512.png',
    width: 512,
    height: 512,
    description: 'PWA 高清启动画面与应用商店',
    includeInIco: false,
  },
];

/**
 * 将 DataURL 字符串转换为 Uint8Array 字节数组
 *
 * @param dataUrl Base64 编码的 DataURL
 * @returns 二进制 Uint8Array
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const clean = removePotentialDataAndMimePrefix(dataUrl);
  return Base64.toUint8Array(clean);
}

/**
 * 将多张 PNG 格式的图标在内存中二进制拼接封装为标准多层 .ico 文件
 *
 * @param images PNG 图像清单，包含宽高与 PNG 二进制数据
 * @returns 标准 Windows / 浏览器 .ico 格式的 Uint8Array 字节流
 */
export function createIcoFile(images: { width: number; height: number; pngBytes: Uint8Array }[]): Uint8Array {
  if (!images || images.length === 0) {
    throw new Error('图标列表为空，无法构建 ICO 文件');
  }

  const count = images.length;
  // 1. 计算文件总字节数
  // ICONDIR 头部 6 字节 + 每个图片条目 16 字节
  const headerAndEntriesSize = 6 + count * 16;
  const totalDataSize = images.reduce((acc, img) => acc + img.pngBytes.length, 0);
  const totalSize = headerAndEntriesSize + totalDataSize;

  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);

  // 2. 写入 ICONDIR 头部 (6 字节)
  view.setUint16(0, 0, true); // 保留字段，必须为 0
  view.setUint16(2, 1, true); // 类型码：1 为图标 (.ico)
  view.setUint16(4, count, true); // 包含的图标总数量

  // 3. 写入 ICONDIRENTRY 目录条目与图像数据
  let currentDataOffset = headerAndEntriesSize;

  for (let i = 0; i < count; i++) {
    const img = images[i];
    const entryOffset = 6 + i * 16;

    // 图像宽度 (1-255，>=256 时为 0)
    view.setUint8(entryOffset + 0, img.width >= 256 ? 0 : img.width);
    // 图像高度 (1-255，>=256 时为 0)
    view.setUint8(entryOffset + 1, img.height >= 256 ? 0 : img.height);
    // 调色板颜色数 (PNG 真彩色为 0)
    view.setUint8(entryOffset + 2, 0);
    // 保留字段，必须为 0
    view.setUint8(entryOffset + 3, 0);
    // 颜色平面数 (通常为 1)
    view.setUint16(entryOffset + 4, 1, true);
    // 每像素位数 (PNG 32 位 RGBA)
    view.setUint16(entryOffset + 6, 32, true);
    // 图像数据总字节数
    view.setUint32(entryOffset + 8, img.pngBytes.length, true);
    // 图像数据在文件中的绝对偏移量
    view.setUint32(entryOffset + 12, currentDataOffset, true);

    // 将 PNG 实际字节写入对应偏移位置
    buffer.set(img.pngBytes, currentDataOffset);
    currentDataOffset += img.pngBytes.length;
  }

  return buffer;
}

/**
 * 生成引入 Favicon 所需的 HTML <head> 标签代码片段
 *
 * @returns 规范的 HTML 字符串
 */
export function generateHtmlHeadSnippet(): string {
  return [
    '<!-- 标准浏览器与搜索引擎 Favicon -->',
    '<link rel="icon" type="image/x-icon" href="/favicon.ico">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '',
    '<!-- Apple iOS / Safari 主屏幕书签图标 -->',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '',
    '<!-- Android Chrome 与 PWA 应用清单 -->',
    '<link rel="manifest" href="/site.webmanifest">',
  ].join('\n');
}

/**
 * 生成符合 W3C 标准的 site.webmanifest 清单内容
 *
 * @param options 清单配置参数
 * @returns 格式化后的 JSON 字符串
 */
export function generateWebManifest(options: Partial<WebManifestOptions> = {}): string {
  const manifest = {
    name: options.appName || '我的应用',
    short_name: options.shortName || '应用',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    theme_color: options.themeColor || '#ffffff',
    background_color: options.backgroundColor || '#ffffff',
    display: 'standalone',
  };

  return JSON.stringify(manifest, null, 2);
}

/**
 * 将整套 Favicon 图标包打包为单一 ZIP 压缩文件
 *
 * @param files 文件名字典 { [fileName]: Uint8Array }
 * @returns ZIP 压缩包 Uint8Array 字节数组
 */
export function createFaviconZipArchive(files: Record<string, Uint8Array>): Uint8Array {
  if (!files || Object.keys(files).length === 0) {
    throw new Error('打包文件列表为空，无法创建 ZIP');
  }
  return zipSync(files, { level: 6 });
}
