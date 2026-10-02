/**
 * 证件照制作工坊 (ID Photo Maker) 业务服务与核心算法层
 * 纯函数实现，严禁依赖 DOM 或 Vue 响应式上下文
 *
 * @author Ateng
 * @since 2026-10-02
 */

import {
  type CustomSpecConfig,
  type DimensionUnit,
  type MattingConfig,
  PHOTO_SPEC_PRESETS,
  PRINT_PAPER_DIMENSIONS,
  type PhotoSpec,
  type PrintLayoutResult,
  type PrintPaperConfig,
} from './id-photo-maker.types';

/**
 * 物理毫米 (mm) 转屏幕像素 (px)
 * 换算公式: px = (mm / 25.4) * DPI
 *
 * @param mm 毫米数
 * @param dpi 分辨率 (默认 300)
 */
export function mmToPx(mm: number, dpi = 300): number {
  if (mm <= 0 || dpi <= 0) return 0;
  return Math.round((mm / 25.4) * dpi);
}

/**
 * 屏幕像素 (px) 转物理毫米 (mm)
 * 换算公式: mm = (px / DPI) * 25.4
 *
 * @param px 像素数
 * @param dpi 分辨率 (默认 300)
 */
export function pxToMm(px: number, dpi = 300): number {
  if (px <= 0 || dpi <= 0) return 0;
  return Number(((px / dpi) * 25.4).toFixed(1));
}

/**
 * 根据 ID 检索内置规格预设
 */
export function getPhotoSpecById(id: string): PhotoSpec | undefined {
  return PHOTO_SPEC_PRESETS.find((item) => item.id === id);
}

/**
 * 自定义规格换算为统一像素与毫米尺寸
 */
export function resolveCustomDimensions(config: CustomSpecConfig): {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  dpi: number;
} {
  const dpi = Math.max(72, Math.min(1200, config.dpi || 300));
  if (config.unit === 'mm') {
    const widthMm = Math.max(5, config.width);
    const heightMm = Math.max(5, config.height);
    return {
      widthMm,
      heightMm,
      widthPx: mmToPx(widthMm, dpi),
      heightPx: mmToPx(heightMm, dpi),
      dpi,
    };
  } else {
    const widthPx = Math.max(10, Math.round(config.width));
    const heightPx = Math.max(10, Math.round(config.height));
    return {
      widthMm: pxToMm(widthPx, dpi),
      heightMm: pxToMm(heightPx, dpi),
      widthPx,
      heightPx,
      dpi,
    };
  }
}

/**
 * 十六进制颜色转 RGB 结构
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.trim().replace(/^#/, '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

/**
 * RGB 转十六进制颜色
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * 欧几里得色彩距离归一化百分比 (0 ~ 100)
 * 最大距离为 sqrt(255^2 * 3) ≈ 441.67
 */
export function calculateColorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);
  return (distance / 441.67295593) * 100;
}

/**
 * 图像四角背景基准色智能采样
 */
export function sampleImageCorners(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): { r: number; g: number; b: number } {
  if (width <= 0 || height <= 0 || pixels.length === 0) {
    return { r: 255, g: 255, b: 255 };
  }

  // 采样 4 个角各 3x3 像素区域均值
  const cornerCoords = [
    { x: 0, y: 0 },
    { x: Math.max(0, width - 3), y: 0 },
    { x: 0, y: Math.max(0, height - 3) },
    { x: Math.max(0, width - 3), y: Math.max(0, height - 3) },
  ];

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  for (const corner of cornerCoords) {
    for (let dx = 0; dx < 3; dx++) {
      for (let dy = 0; dy < 3; dy++) {
        const cx = corner.x + dx;
        const cy = corner.y + dy;
        if (cx < width && cy < height) {
          const idx = (cy * width + cx) * 4;
          totalR += pixels[idx];
          totalG += pixels[idx + 1];
          totalB += pixels[idx + 2];
          count++;
        }
      }
    }
  }

  if (count === 0) return { r: 255, g: 255, b: 255 };

  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };
}

/**
 * 基于色彩容差生成 Alpha 蒙版 (0 为背景透明，255 为前景人像保留)
 */
export function generateToleranceMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  baseColor: { r: number; g: number; b: number },
  tolerance: number,
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const tol = Math.max(0, Math.min(100, tolerance));
  // 容差软过渡缓冲区 (占容差的 20%)
  const softBand = Math.max(1, tol * 0.2);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const originalAlpha = pixels[idx + 3];

    // 如果原图本身透明度很低，则直接置为背景
    if (originalAlpha < 10) {
      mask[i] = 0;
      continue;
    }

    const dist = calculateColorDistance({ r, g, b }, baseColor);

    if (dist <= tol - softBand) {
      // 距离在容差阈值内，判定为纯背景
      mask[i] = 0;
    } else if (dist >= tol + softBand) {
      // 距离超出阈值，判定为前景人像
      mask[i] = originalAlpha;
    } else {
      // 软边缘线性过渡
      const t = (dist - (tol - softBand)) / (softBand * 2);
      mask[i] = Math.round(t * originalAlpha);
    }
  }

  return mask;
}

/**
 * 快速可分离箱式边缘羽化核算法 (Box Blur Feathering)
 */
export function applyFeathering(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const r = Math.max(0, Math.min(10, Math.round(radius)));
  if (r === 0 || width <= 1 || height <= 1) {
    return new Uint8Array(mask);
  }

  const output = new Uint8Array(width * height);
  const temp = new Float32Array(width * height);

  // 1. 水平通道模糊
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    let windowSum = 0;
    const windowSize = 2 * r + 1;

    // 初始化窗口
    for (let i = -r; i <= r; i++) {
      const x = Math.max(0, Math.min(width - 1, i));
      windowSum += mask[rowOffset + x];
    }
    temp[rowOffset] = windowSum / windowSize;

    // 滑动窗口
    for (let x = 1; x < width; x++) {
      const prevX = Math.max(0, x - r - 1);
      const nextX = Math.min(width - 1, x + r);
      windowSum += mask[rowOffset + nextX] - mask[rowOffset + prevX];
      temp[rowOffset + x] = windowSum / windowSize;
    }
  }

  // 2. 垂直通道模糊
  for (let x = 0; x < width; x++) {
    let windowSum = 0;
    const windowSize = 2 * r + 1;

    // 初始化窗口
    for (let i = -r; i <= r; i++) {
      const y = Math.max(0, Math.min(height - 1, i));
      windowSum += temp[y * width + x];
    }
    output[x] = Math.round(windowSum / windowSize);

    // 滑动窗口
    for (let y = 1; y < height; y++) {
      const prevY = Math.max(0, y - r - 1);
      const nextY = Math.min(height - 1, y + r);
      windowSum += temp[nextY * width + x] - temp[prevY * width + x];
      output[y * width + x] = Math.round(windowSum / windowSize);
    }
  }

  return output;
}

/**
 * 手动画笔涂抹修改蒙版 (Erase / Restore)
 *
 * @param mask 现有蒙版
 * @param width 蒙版宽度
 * @param height 蒙版高度
 * @param centerX 画笔落点 X
 * @param centerY 画笔落点 Y
 * @param brushRadius 画笔半径
 * @param hardness 硬度 (0.1 ~ 1.0)
 * @param mode 'erase' (置为 0) 或 'restore' (置为 255)
 */
export function applyBrushToMask(
  mask: Uint8Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  brushRadius: number,
  hardness: number,
  mode: 'erase' | 'restore',
): Uint8Array {
  const result = new Uint8Array(mask);
  const r = Math.max(1, brushRadius);
  const h = Math.max(0.1, Math.min(1.0, hardness));
  const innerR = r * h;
  const targetAlpha = mode === 'erase' ? 0 : 255;

  const minX = Math.max(0, Math.floor(centerX - r));
  const maxX = Math.min(width - 1, Math.ceil(centerX + r));
  const minY = Math.max(0, Math.floor(centerY - r));
  const maxY = Math.min(height - 1, Math.ceil(centerY + r));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= innerR) {
        result[y * width + x] = targetAlpha;
      } else if (dist <= r) {
        // 软边缘羽化过渡
        const factor = (r - dist) / (r - innerR);
        const current = result[y * width + x];
        if (mode === 'erase') {
          result[y * width + x] = Math.round(current * (1 - factor));
        } else {
          result[y * width + x] = Math.round(current + (255 - current) * factor);
        }
      }
    }
  }

  return result;
}

/**
 * 冲印相纸几何最优排版行列与裁切线计算
 */
export function calculatePrintLayout(
  photoWidthPx: number,
  photoHeightPx: number,
  config: PrintPaperConfig,
): PrintLayoutResult {
  const dpi = config.dpi || 300;
  const paperDim = PRINT_PAPER_DIMENSIONS[config.paperType];

  let rawWidthMm = paperDim.widthMm;
  let rawHeightMm = paperDim.heightMm;

  if (config.orientation === 'landscape') {
    rawWidthMm = Math.max(paperDim.widthMm, paperDim.heightMm);
    rawHeightMm = Math.min(paperDim.widthMm, paperDim.heightMm);
  } else {
    rawWidthMm = Math.min(paperDim.widthMm, paperDim.heightMm);
    rawHeightMm = Math.max(paperDim.widthMm, paperDim.heightMm);
  }

  const paperWidthPx = mmToPx(rawWidthMm, dpi);
  const paperHeightPx = mmToPx(rawHeightMm, dpi);
  const gapPx = mmToPx(config.gapMm, dpi);
  const marginPx = mmToPx(config.marginMm, dpi);

  const usableWidth = paperWidthPx - 2 * marginPx;
  const usableHeight = paperHeightPx - 2 * marginPx;

  if (photoWidthPx <= 0 || photoHeightPx <= 0 || usableWidth < photoWidthPx || usableHeight < photoHeightPx) {
    return {
      paperWidthPx,
      paperHeightPx,
      cols: 0,
      rows: 0,
      totalCount: 0,
      itemWidthPx: photoWidthPx,
      itemHeightPx: photoHeightPx,
      items: [],
      cutLines: [],
    };
  }

  const cols = Math.max(1, Math.floor((usableWidth + gapPx) / (photoWidthPx + gapPx)));
  const rows = Math.max(1, Math.floor((usableHeight + gapPx) / (photoHeightPx + gapPx)));
  const totalCount = cols * rows;

  const contentWidth = cols * photoWidthPx + (cols - 1) * gapPx;
  const contentHeight = rows * photoHeightPx + (rows - 1) * gapPx;

  const startOffsetX = Math.max(0, Math.floor((paperWidthPx - contentWidth) / 2));
  const startOffsetY = Math.max(0, Math.floor((paperHeightPx - contentHeight) / 2));

  const items: Array<{ x: number; y: number; width: number; height: number }> = [];
  const cutLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const cutMarkLength = mmToPx(3, dpi); // 十字外延标尺线长度为 3mm

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startOffsetX + c * (photoWidthPx + gapPx);
      const y = startOffsetY + r * (photoHeightPx + gapPx);
      items.push({ x, y, width: photoWidthPx, height: photoHeightPx });

      if (config.showCutMarks) {
        // 四个角十字定位裁切标记
        // 左上角
        cutLines.push({ x1: x - cutMarkLength, y1: y, x2: x, y2: y });
        cutLines.push({ x1: x, y1: y - cutMarkLength, x2: x, y2: y });
        // 右上角
        cutLines.push({ x1: x + photoWidthPx, y1: y, x2: x + photoWidthPx + cutMarkLength, y2: y });
        cutLines.push({ x1: x + photoWidthPx, y1: y - cutMarkLength, x2: x + photoWidthPx, y2: y });
        // 左下角
        cutLines.push({ x1: x - cutMarkLength, y1: y + photoHeightPx, x2: x, y2: y + photoHeightPx });
        cutLines.push({ x1: x, y1: y + photoHeightPx, x2: x, y2: y + photoHeightPx + cutMarkLength });
        // 右下角
        cutLines.push({
          x1: x + photoWidthPx,
          y1: y + photoHeightPx,
          x2: x + photoWidthPx + cutMarkLength,
          y2: y + photoHeightPx,
        });
        cutLines.push({
          x1: x + photoWidthPx,
          y1: y + photoHeightPx,
          x2: x + photoWidthPx,
          y2: y + photoHeightPx + cutMarkLength,
        });
      }
    }
  }

  return {
    paperWidthPx,
    paperHeightPx,
    cols,
    rows,
    totalCount,
    itemWidthPx: photoWidthPx,
    itemHeightPx: photoHeightPx,
    items,
    cutLines,
  };
}

/**
 * 目标文件体积二分搜索质量迭代算法
 *
 * @param evaluateFn 传入质量因子返回文件字节数的求值函数
 * @param targetBytes 目标文件大小上限 (字节)
 * @param minQuality 最小质量 (默认 0.05)
 * @param maxQuality 最大质量 (默认 0.98)
 * @param maxIterations 最大迭代轮次 (默认 8)
 */
export async function searchOptimalQuality(
  evaluateFn: (quality: number) => Promise<number> | number,
  targetBytes: number,
  minQuality = 0.05,
  maxQuality = 0.98,
  maxIterations = 8,
): Promise<{ quality: number; finalBytes: number; iterations: number }> {
  let low = minQuality;
  let high = maxQuality;
  let bestQuality = low;
  let bestBytes = await evaluateFn(low);
  let iterations = 0;

  for (let i = 0; i < maxIterations; i++) {
    iterations++;
    const mid = Number(((low + high) / 2).toFixed(3));
    const bytes = await evaluateFn(mid);

    if (bytes <= targetBytes) {
      bestQuality = mid;
      bestBytes = bytes;
      // 尝试向更高画质逼近
      low = mid;
    } else {
      high = mid;
    }

    // 精度收敛阈值 (区间小于 0.02)
    if (high - low < 0.02) {
      break;
    }
  }

  return {
    quality: bestQuality,
    finalBytes: bestBytes,
    iterations,
  };
}

/**
 * 等比下采样比例建议 (当最小画质仍超出目标体积时)
 */
export function calculateDownscaleFactor(currentBytes: number, targetBytes: number): number {
  if (currentBytes <= targetBytes || currentBytes <= 0 || targetBytes <= 0) {
    return 1.0;
  }
  // 图像面积与字节大小大致成线性正比，边长比约为平方根关系
  const ratio = Math.sqrt(targetBytes / currentBytes);
  // 保留安全余量 95%
  return Math.max(0.2, Math.min(0.95, Number((ratio * 0.95).toFixed(2))));
}
