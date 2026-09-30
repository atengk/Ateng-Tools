/**
 * 图片转 PDF 核心纯函数服务
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { PDFDocument } from '@cantoo/pdf-lib';
import type { ImageSourceItem, ImageToPdfOptions, ImageToPdfResult, PageFormat, PageMargin, PageOrientation } from './image-to-pdf.types';

/**
 * 标准纸张基准尺寸（单位：PDF 点，1 inch = 72 pt）
 */
export const PAGE_SIZES_PT: Record<Exclude<PageFormat, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89], // 210 × 297 mm
  a3: [841.89, 1190.55], // 297 × 420 mm
  letter: [612.00, 792.00], // 8.5 × 11 inch
};

/**
 * 页边距尺寸映射（单位：PDF 点，1 mm ≈ 2.835 pt）
 */
export const MARGIN_SIZES_PT: Record<PageMargin, number> = {
  none: 0,
  small: 28.35, // 10 mm
  normal: 56.69, // 20 mm
};

/**
 * 判断指定字节流是否为 JPEG 格式（通过魔数 0xFF 0xD8 0xFF 判定）
 */
export function isJpegBytes(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 3) {
    return false;
  }
  return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
}

/**
 * 计算目标页面的纸张宽高、图片缩放比率以及居中坐标
 *
 * @param imageWidth 图片实际宽度
 * @param imageHeight 图片实际高度
 * @param format 纸张格式
 * @param orientation 页面方向
 * @param marginPreset 边距预设
 */
export function calculatePageLayout(
  imageWidth: number,
  imageHeight: number,
  format: PageFormat,
  orientation: PageOrientation,
  marginPreset: PageMargin,
): {
  pageWidth: number;
  pageHeight: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
} {
  const margin = MARGIN_SIZES_PT[marginPreset] ?? 0;

  // 1. 确定基准页面尺寸
  let baseWidth: number;
  let baseHeight: number;

  if (format === 'fit') {
    baseWidth = imageWidth + margin * 2;
    baseHeight = imageHeight + margin * 2;
  }
  else {
    const stdSize = PAGE_SIZES_PT[format] || PAGE_SIZES_PT.a4;
    const shortSide = Math.min(stdSize[0], stdSize[1]);
    const longSide = Math.max(stdSize[0], stdSize[1]);

    // 2. 根据方向策略决策最终纸张朝向
    if (orientation === 'landscape') {
      baseWidth = longSide;
      baseHeight = shortSide;
    }
    else if (orientation === 'portrait') {
      baseWidth = shortSide;
      baseHeight = longSide;
    }
    else {
      // 自动适应：若图片为横版，页面采用横向，否则纵向
      const isImageLandscape = imageWidth > imageHeight;
      baseWidth = isImageLandscape ? longSide : shortSide;
      baseHeight = isImageLandscape ? shortSide : longSide;
    }
  }

  // 3. 计算图片在可用打印区域内的等比缩放与居中位置
  const availWidth = Math.max(1, baseWidth - margin * 2);
  const availHeight = Math.max(1, baseHeight - margin * 2);

  const scale = Math.min(availWidth / imageWidth, availHeight / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;

  const drawX = margin + (availWidth - drawWidth) / 2;
  const drawY = margin + (availHeight - drawHeight) / 2;

  return {
    pageWidth: baseWidth,
    pageHeight: baseHeight,
    drawX,
    drawY,
    drawWidth,
    drawHeight,
  };
}

/**
 * 将多张图片合成并序列化为标准 PDF 文档
 *
 * @param images 图片数据列表
 * @param options 排版与输出配置
 */
export async function convertImagesToPdf(
  images: ImageSourceItem[],
  options: ImageToPdfOptions,
): Promise<ImageToPdfResult> {
  // 1. 防御校验
  if (!images || images.length === 0) {
    throw new Error('请至少选择一张图片以合成 PDF');
  }

  // 2. 初始化 PDF 文档
  const pdfDoc = await PDFDocument.create();

  // 3. 逐张嵌入图片并绘制页面
  for (const item of images) {
    const isJpeg = isJpegBytes(item.bytes) || item.type.includes('jpeg') || item.type.includes('jpg');

    let embeddedImage;
    try {
      if (isJpeg) {
        embeddedImage = await pdfDoc.embedJpg(item.bytes);
      }
      else {
        embeddedImage = await pdfDoc.embedPng(item.bytes);
      }
    }
    catch (err: any) {
      // 若按特定格式嵌入失败，尝试反向回退尝试另一种格式
      try {
        if (isJpeg) {
          embeddedImage = await pdfDoc.embedPng(item.bytes);
        }
        else {
          embeddedImage = await pdfDoc.embedJpg(item.bytes);
        }
      }
      catch {
        throw new Error(`图片 “${item.name}” 解析失败，请确认是否为有效的 JPG 或 PNG 格式图片`);
      }
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    const layout = calculatePageLayout(
      imgWidth,
      imgHeight,
      options.format,
      options.orientation,
      options.margin,
    );

    const page = pdfDoc.addPage([layout.pageWidth, layout.pageHeight]);
    page.drawImage(embeddedImage, {
      x: layout.drawX,
      y: layout.drawY,
      width: layout.drawWidth,
      height: layout.drawHeight,
    });
  }

  // 4. 序列化生成 PDF 字节
  const pdfBytes = await pdfDoc.save();
  const pageCount = pdfDoc.getPageCount();

  const exportBaseName = options.customFileName?.trim() || '图片合成文档';
  const outFileName = exportBaseName.endsWith('.pdf') ? exportBaseName : `${exportBaseName}.pdf`;

  return {
    bytes: pdfBytes,
    fileName: outFileName,
    pageCount,
    fileSize: pdfBytes.length,
  };
}
