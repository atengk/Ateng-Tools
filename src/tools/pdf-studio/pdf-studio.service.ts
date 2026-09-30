/**
 * PDF Studio (PDF 工坊) 纯函数服务
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { PDFDocument, degrees } from '@cantoo/pdf-lib';
import type {
  ExportPdfOptions,
  ExportPdfResult,
  SourceDocumentItem,
  VirtualPageItem,
  WatermarkConfig,
} from './pdf-studio.types';

let pdfjsPromise: Promise<any> | null = null;

/**
 * 惰性获取 pdfjs 实例并初始化 worker
 */
export async function getPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      const resolved = (pdfjs as any).default ?? pdfjs;
      if (typeof window !== 'undefined' && resolved.GlobalWorkerOptions) {
        resolved.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.js',
          import.meta.url,
        ).toString();
      }
      return resolved;
    })();
  }
  return pdfjsPromise;
}

/**
 * 将角度规范化为 [0, 90, 180, 270] 标准象限角度
 */
export function normalizeAngle(angle: number): number {
  return ((Math.round(angle) % 360) + 360) % 360;
}

/**
 * 为单个来源文档生成虚拟页面列表
 *
 * @param doc 来源文档信息
 * @returns 该文档对应的虚拟页面列表
 */
export function createVirtualDeckForDoc(doc: SourceDocumentItem): VirtualPageItem[] {
  const pages: VirtualPageItem[] = [];
  for (let i = 0; i < doc.pageCount; i++) {
    pages.push({
      id: `page_${doc.id}_${i}`,
      sourceDocId: doc.id,
      sourceDocName: doc.name,
      originalPageIndex: i,
      rotation: 0,
      isDeleted: false,
    });
  }
  return pages;
}

/**
 * 根据注册的来源文档构建虚拟页面甲板 (Virtual Page Deck)
 *
 * @param sourceDocs 来源文档列表
 * @returns 扁平化的虚拟页面列表
 */
export function createVirtualDeck(sourceDocs: SourceDocumentItem[]): VirtualPageItem[] {
  const deck: VirtualPageItem[] = [];

  for (const doc of sourceDocs) {
    deck.push(...createVirtualDeckForDoc(doc));
  }

  return deck;
}

/**
 * 解析页面范围表达式字符串 (例如 "1-3, 5, 8-10")
 *
 * @param rangeStr 用户输入的表达式
 * @param totalPages 当前页面总数上限
 * @returns 去重并按升序排列的有效页码列表 (1-indexed)
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || totalPages <= 0) {
    return [];
  }

  // 1. 标准化分隔符：支持中文逗号、分号、波浪线
  const normalized = rangeStr
    .replace(/[，；;]/g, ',')
    .replace(/[~～]/g, '-')
    .trim();

  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(',').map(s => s.trim()).filter(Boolean);
  const matchedPages = new Set<number>();

  for (const token of tokens) {
    if (token.includes('-')) {
      const parts = token.split('-').map(s => s.trim());
      if (parts.length === 2) {
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.max(1, Math.min(start, end));
          const max = Math.min(totalPages, Math.max(start, end));
          for (let p = min; p <= max; p++) {
            matchedPages.add(p);
          }
        }
      }
    }
    else {
      const pageNum = parseInt(token, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        matchedPages.add(pageNum);
      }
    }
  }

  return Array.from(matchedPages).sort((a, b) => a - b);
}

/**
 * 旋转单个虚拟页面
 *
 * @param deck 页面甲板
 * @param pageId 页面唯一标识
 * @param deltaAngle 旋转变化量（如 +90 或 -90）
 */
export function rotatePage(
  deck: VirtualPageItem[],
  pageId: string,
  deltaAngle: number,
): VirtualPageItem[] {
  return deck.map((page) => {
    if (page.id === pageId) {
      return {
        ...page,
        rotation: normalizeAngle(page.rotation + deltaAngle),
      };
    }
    return page;
  });
}

/**
 * 批量旋转甲板中所有未被删除的有效页面
 *
 * @param deck 页面甲板
 * @param deltaAngle 旋转变化量
 */
export function rotateAllPages(
  deck: VirtualPageItem[],
  deltaAngle: number,
): VirtualPageItem[] {
  return deck.map((page) => {
    if (!page.isDeleted) {
      return {
        ...page,
        rotation: normalizeAngle(page.rotation + deltaAngle),
      };
    }
    return page;
  });
}

/**
 * 切换单页的逻辑删除/恢复状态
 *
 * @param deck 页面甲板
 * @param pageId 页面唯一标识
 */
export function toggleDeletePage(
  deck: VirtualPageItem[],
  pageId: string,
): VirtualPageItem[] {
  return deck.map((page) => {
    if (page.id === pageId) {
      return {
        ...page,
        isDeleted: !page.isDeleted,
      };
    }
    return page;
  });
}

/**
 * 恢复甲板中所有被删除的页面
 *
 * @param deck 页面甲板
 */
export function recoverAllDeletedPages(deck: VirtualPageItem[]): VirtualPageItem[] {
  return deck.map(page => ({
    ...page,
    isDeleted: false,
  }));
}

/**
 * 根据虚拟页面甲板导出全新的目标 PDF 文档
 *
 * @param deck 页面甲板（包含顺序、旋转、删减状态）
 * @param sourceDocs 来源文档列表或字典
 * @param options 导出配置项
 */
export async function exportPdfFromDeck(
  deck: VirtualPageItem[],
  sourceDocs: SourceDocumentItem[] | Record<string, Uint8Array>,
  options?: ExportPdfOptions,
): Promise<ExportPdfResult> {
  // 1. 过滤有效页面
  const activePages = deck.filter(p => !p.isDeleted);
  if (activePages.length === 0) {
    throw new Error('当前有效页面数量为 0，请至少保留一页以导出 PDF');
  }

  // 2. 构建来源文档二进制字典映射
  const docsByteMap = new Map<string, Uint8Array>();
  let primaryName = 'PDF工坊导出版';

  if (Array.isArray(sourceDocs)) {
    for (const doc of sourceDocs) {
      docsByteMap.set(doc.id, doc.bytes);
      if (doc.name && primaryName === 'PDF工坊导出版') {
        primaryName = doc.name.replace(/\.[^/.]+$/, '');
      }
    }
  }
  else {
    for (const [key, bytes] of Object.entries(sourceDocs)) {
      docsByteMap.set(key, bytes);
    }
  }

  // 3. 预加载所有使用到的源 PDFDocument 实例
  const loadedPdfMap = new Map<string, PDFDocument>();
  const usedSourceIds = new Set(activePages.map(p => p.sourceDocId));

  for (const srcId of usedSourceIds) {
    const bytes = docsByteMap.get(srcId);
    if (!bytes || bytes.length === 0) {
      throw new Error(`未找到来源文档数据或文件字节已被分离清空 (ID: ${srcId})`);
    }
    const pdfDoc = await PDFDocument.load(bytes.slice());
    loadedPdfMap.set(srcId, pdfDoc);
  }

  // 4. 创建目标文档并逐页拷贝编排
  const targetDoc = await PDFDocument.create();
  const watermarkConfig = options?.watermark;
  const isWatermarkActive = watermarkConfig && watermarkConfig.type !== 'none'
    && ((watermarkConfig.type === 'text' && Boolean(watermarkConfig.text?.trim()))
      || (watermarkConfig.type === 'image' && Boolean(watermarkConfig.imageDataUrl)));
  const watermarkImageCache = new Map<string, any>();

  for (const item of activePages) {
    const srcDoc = loadedPdfMap.get(item.sourceDocId);
    if (!srcDoc) {
      continue;
    }

    const [copiedPage] = await targetDoc.copyPages(srcDoc, [item.originalPageIndex]);

    // 叠加页面原本的角度与虚拟甲板中的旋转角度
    const originalRotation = copiedPage.getRotation().angle;
    const finalRotation = normalizeAngle(originalRotation + item.rotation);
    copiedPage.setRotation(degrees(finalRotation));

    // 嵌入水印图章 (若配置了有效水印)
    if (isWatermarkActive) {
      const pageWidth = copiedPage.getWidth();
      const pageHeight = copiedPage.getHeight();
      const cacheKey = `${Math.round(pageWidth)}_${Math.round(pageHeight)}`;

      let watermarkImage = watermarkImageCache.get(cacheKey);
      if (!watermarkImage) {
        try {
          const stampCanvas = await renderWatermarkCanvas(pageWidth, pageHeight, watermarkConfig);
          if (stampCanvas) {
            const pngBytes = await canvasToPngBytes(stampCanvas);
            watermarkImage = await targetDoc.embedPng(pngBytes);
            watermarkImageCache.set(cacheKey, watermarkImage);
          }
        }
        catch (err) {
          // 水印光栅化异常降级
          console.warn('水印光栅化嵌入失败，已自动降级：', err);
        }
      }

      if (watermarkImage) {
        copiedPage.drawImage(watermarkImage, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      }
    }

    targetDoc.addPage(copiedPage);
  }

  // 5. 序列化并封装导出结果
  const resultBytes = await targetDoc.save();
  const pageCount = targetDoc.getPageCount();

  const customBase = options?.customFileName?.trim();
  const outBaseName = customBase || `${primaryName}_编排整理`;
  const fileName = outBaseName.endsWith('.pdf') ? outBaseName : `${outBaseName}.pdf`;

  return {
    bytes: resultBytes,
    fileName,
    pageCount,
    fileSize: resultBytes.length,
  };
}

/**
 * 离屏渲染透明中文字印与图片水印画布 (2x 超采样高清抗锯齿)
 *
 * @param width 目标页面逻辑宽度 (pt)
 * @param height 目标页面逻辑高度 (pt)
 * @param config 水印配置项
 * @returns 离屏 HTMLCanvasElement，若无可用 Canvas 环境则返回 null
 */
export async function renderWatermarkCanvas(
  width: number,
  height: number,
  config: WatermarkConfig,
): Promise<HTMLCanvasElement | null> {
  if (typeof document === 'undefined' || !document.createElement) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const dpr = 2.0; // 2x 超采样确保文字和图形边缘绝对清晰
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  // 100% 透明背景
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const opacity = Math.max(0.01, Math.min(1.0, config.opacity ?? 0.3));
  const rotationDeg = config.rotation ?? -30;
  const rotationRad = (rotationDeg * Math.PI) / 180;
  const layout = config.layout || 'center';

  if (config.type === 'text') {
    const text = config.text?.trim();
    if (!text) {
      return null;
    }

    const fontSize = (config.fontSize || 36) * dpr;
    ctx.save();
    ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`;
    ctx.fillStyle = config.color || '#999999';
    ctx.globalAlpha = opacity;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (layout === 'center') {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rotationRad);
      ctx.fillText(text, 0, 0);
    }
    else {
      // 全页网格对角平铺
      const gap = Math.max(60, config.tileGap || 140) * dpr;
      const bound = Math.max(canvas.width, canvas.height) * 1.5;
      for (let y = -bound; y < canvas.height + bound; y += gap) {
        for (let x = -bound; x < canvas.width + bound; x += gap * 1.5) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotationRad);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }
  else if (config.type === 'image' && config.imageDataUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('水印图片载入失败'));
      img.src = config.imageDataUrl!;
    });

    const scale = (config.imageScale ?? 0.5) * dpr;
    const imgW = img.width * scale;
    const imgH = img.height * scale;

    ctx.save();
    ctx.globalAlpha = opacity;

    if (layout === 'center') {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rotationRad);
      ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
    }
    else {
      const gap = Math.max(80, config.tileGap || 160) * dpr;
      const bound = Math.max(canvas.width, canvas.height) * 1.5;
      for (let y = -bound; y < canvas.height + bound; y += gap) {
        for (let x = -bound; x < canvas.width + bound; x += gap * 1.5) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotationRad);
          ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }
  else {
    return null;
  }

  return canvas;
}

/**
 * 将 Canvas 画布内容导出为 PNG 二进制字节流
 */
export async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) {
        resolve(b);
      }
      else {
        reject(new Error('Canvas 导出 PNG 失败'));
      }
    }, 'image/png');
  });

  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * 视口延迟光栅化：渲染指定页面为高质微缩缩略图
 *
 * @param pdfDocProxy PDF.js 文档代理实例（注意使用未代理的原始对象）
 * @param pageNumber 页码（从 1 开始）
 * @param targetCanvas 离屏绘制画布
 * @param targetWidth 期望的缩略图宽度（像素，默认 240）
 */
export async function renderThumbnailCanvas(
  pdfDocProxy: any,
  pageNumber: number,
  targetCanvas: HTMLCanvasElement,
  targetWidth = 240,
): Promise<{ width: number; height: number; blob: Blob }> {
  const page = await pdfDocProxy.getPage(pageNumber);
  const unscaledViewport = page.getViewport({ scale: 1.0 });

  const scale = targetWidth / unscaledViewport.width;
  const viewport = page.getViewport({ scale });

  targetCanvas.width = Math.floor(viewport.width);
  targetCanvas.height = Math.floor(viewport.height);

  const context = targetCanvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 渲染环境初始化失败');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  const blob: Blob = await new Promise((resolve, reject) => {
    targetCanvas.toBlob((b) => {
      if (b) {
        resolve(b);
      }
      else {
        reject(new Error('缩略图导出失败'));
      }
    }, 'image/jpeg', 0.85);
  });

  return {
    width: targetCanvas.width,
    height: targetCanvas.height,
    blob,
  };
}

/**
 * 高分辨率页面光栅化预览
 *
 * @param pdfDocProxy PDF.js 文档代理
 * @param pageNumber 原始页码 (从 1 开始)
 * @param targetCanvas 离屏或目标 Canvas
 * @param scale 放大系数 (默认 1.8)
 */
export async function renderPageHighResCanvas(
  pdfDocProxy: any,
  pageNumber: number,
  targetCanvas: HTMLCanvasElement,
  scale = 1.8,
): Promise<{ width: number; height: number; blob: Blob }> {
  const page = await pdfDocProxy.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  targetCanvas.width = Math.floor(viewport.width);
  targetCanvas.height = Math.floor(viewport.height);

  const context = targetCanvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 渲染环境初始化失败');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  const blob: Blob = await new Promise((resolve, reject) => {
    targetCanvas.toBlob((b) => {
      if (b) {
        resolve(b);
      }
      else {
        reject(new Error('高分辨率页面渲染导出失败'));
      }
    }, 'image/jpeg', 0.92);
  });

  return {
    width: targetCanvas.width,
    height: targetCanvas.height,
    blob,
  };
}

