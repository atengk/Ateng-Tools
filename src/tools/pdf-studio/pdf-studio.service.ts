/**
 * PDF Studio (PDF 工坊) 纯函数服务
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { PDFDocument, degrees } from '@cantoo/pdf-lib';
import type { ExportPdfOptions, ExportPdfResult, SourceDocumentItem, VirtualPageItem } from './pdf-studio.types';

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
 * 根据注册的来源文档构建虚拟页面甲板 (Virtual Page Deck)
 *
 * @param sourceDocs 来源文档列表
 * @returns 扁平化的虚拟页面列表
 */
export function createVirtualDeck(sourceDocs: SourceDocumentItem[]): VirtualPageItem[] {
  const deck: VirtualPageItem[] = [];

  for (const doc of sourceDocs) {
    for (let i = 0; i < doc.pageCount; i++) {
      deck.push({
        id: `page_${doc.id}_${i}`,
        sourceDocId: doc.id,
        originalPageIndex: i,
        rotation: 0,
        isDeleted: false,
      });
    }
  }

  return deck;
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
    if (!bytes) {
      throw new Error(`未找到来源文档数据 (ID: ${srcId})`);
    }
    const pdfDoc = await PDFDocument.load(bytes);
    loadedPdfMap.set(srcId, pdfDoc);
  }

  // 4. 创建目标文档并逐页拷贝编排
  const targetDoc = await PDFDocument.create();

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
