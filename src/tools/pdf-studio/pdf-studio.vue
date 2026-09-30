<script setup lang="ts">
/**
 * PDF Studio (PDF 工坊) 视图组件
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { useMessage } from 'naive-ui';
import Draggable from 'vuedraggable';
import { computed, markRaw, nextTick, onMounted, onUnmounted, ref, shallowRef, toRaw, watch } from 'vue';
import {
  ArrowLeft,
  ArrowRight,
  Certificate,
  Download,
  FilePlus,
  FileText,
  GripVertical,
  History,
  Photo,
  Refresh,
  Rotate,
  RotateClockwise,
  Scissors,
  Trash,
  ZoomIn,
} from '@vicons/tabler';
import {
  createVirtualDeck,
  createVirtualDeckForDoc,
  exportPdfFromDeck,
  getPdfjs,
  parsePageRange,
  recoverAllDeletedPages,
  renderPageHighResCanvas,
  renderThumbnailCanvas,
  renderWatermarkCanvas,
  rotateAllPages,
  rotatePage,
  toggleDeletePage,
} from './pdf-studio.service';
import type {
  ExportPdfResult,
  SourceDocumentItem,
  VirtualPageItem,
  WatermarkConfig,
} from './pdf-studio.types';
import { formatBytes } from '@/utils/convert';

const message = useMessage();

// 来源文档列表（使用 shallowRef 规避 Proxy 带来的深层开销）
const sourceDocs = shallowRef<SourceDocumentItem[]>([]);
// 存储每个文档的底层原始 PDFDocProxy 实例 (使用 markRaw 规避私有字段冲突)
const pdfDocProxies = shallowRef<Map<string, any>>(new Map());

// 虚拟页面甲板 (Virtual Page Deck)
const pageDeck = ref<VirtualPageItem[]>([]);

const isInitialLoading = ref(false);
const isExporting = ref(false);
const customExportName = ref('');
const appendFileInputRef = ref<HTMLInputElement | null>(null);
const logoFileInputRef = ref<HTMLInputElement | null>(null);

// 视口观察器集合
let intersectionObserver: IntersectionObserver | null = null;
const cardElementRefs = new Map<string, HTMLElement>();

/**
 * 范围拆分模态框状态
 */
const showRangeModal = ref(false);
const rangeExpression = ref('');
const parsedRangePages = computed(() => {
  return parsePageRange(rangeExpression.value, pageDeck.value.length);
});

/**
 * 水印与印章模态框状态
 */
const showWatermarkModal = ref(false);
const watermarkConfig = ref<WatermarkConfig>({
  type: 'none',
  text: '内部保密 · 绝密文件',
  fontSize: 32,
  color: '#999999',
  opacity: 0.3,
  rotation: -30,
  layout: 'tile',
  tileGap: 140,
  imageDataUrl: '',
  imageScale: 0.4,
});

const isWatermarkActive = computed(() => {
  return watermarkConfig.value.type !== 'none'
    && ((watermarkConfig.value.type === 'text' && Boolean(watermarkConfig.value.text?.trim()))
      || (watermarkConfig.value.type === 'image' && Boolean(watermarkConfig.value.imageDataUrl)));
});

// 水印微缩预览画布
const watermarkPreviewCanvasRef = ref<HTMLCanvasElement | null>(null);

/**
 * 高分辨率模态预览状态
 */
const showPreviewModal = ref(false);
const previewPageIndex = ref(0);
const isPreviewLoading = ref(false);
const previewCanvasRef = ref<HTMLCanvasElement | null>(null);

const currentPreviewPage = computed<VirtualPageItem | undefined>(() => {
  return pageDeck.value[previewPageIndex.value];
});

const previewModalTitle = computed(() => {
  if (!currentPreviewPage.value) return '页面高精度全屏预览';
  const page = currentPreviewPage.value;
  return `页面预览 · 当前编排第 ${previewPageIndex.value + 1} 页 / 共 ${pageDeck.value.length} 页（原第 ${page.originalPageIndex + 1} 页 · ${page.sourceDocName || '原始文档'}）`;
});

/**
 * 有效页面数与删除页面数计算
 */
const activePageCount = computed(() => pageDeck.value.filter(p => !p.isDeleted).length);
const deletedPageCount = computed(() => pageDeck.value.filter(p => p.isDeleted).length);

/**
 * 关联卡片 DOM 节点以供视口延迟渲染观察
 */
function setCardRef(id: string, el: any) {
  if (el && el.$el) {
    cardElementRefs.set(id, el.$el);
  }
  else if (el instanceof HTMLElement) {
    cardElementRefs.set(id, el);
  }
  else {
    cardElementRefs.delete(id);
  }
}

/**
 * 初始化视口交叉观察器 (Deferred Rasterizer)
 */
function setupIntersectionObserver() {
  if (typeof window === 'undefined' || !window.IntersectionObserver) {
    return;
  }

  if (intersectionObserver) {
    intersectionObserver.disconnect();
  }

  intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const pageId = (entry.target as HTMLElement).dataset.pageId;
        if (pageId) {
          const page = pageDeck.value.find(p => p.id === pageId);
          if (page && !page.thumbnailUrl && !page.isRendering) {
            renderPageThumbnail(page);
          }
        }
      }
    }
  }, {
    rootMargin: '120px 0px',
    threshold: 0.05,
  });

  nextTick(() => {
    cardElementRefs.forEach((el) => {
      intersectionObserver?.observe(el);
    });
  });
}

/**
 * 光栅化渲染单张微缩缩略图
 */
async function renderPageThumbnail(page: VirtualPageItem) {
  const docProxy = pdfDocProxies.value.get(page.sourceDocId);
  if (!docProxy) {
    return;
  }

  page.isRendering = true;
  try {
    const rawDoc = toRaw(docProxy);
    const canvas = document.createElement('canvas');
    const { blob } = await renderThumbnailCanvas(
      rawDoc,
      page.originalPageIndex + 1,
      canvas,
      240,
    );

    page.thumbnailUrl = URL.createObjectURL(blob);
  }
  catch {
    // 渲染失败时保持占位底色
  }
  finally {
    page.isRendering = false;
  }
}

/**
 * 释放缩略图的内存占用
 */
function revokeAllThumbnails() {
  for (const page of pageDeck.value) {
    if (page.thumbnailUrl) {
      URL.revokeObjectURL(page.thumbnailUrl);
    }
  }
}

/**
 * 首次主文档上传解析流程
 */
async function onFileUpload(uploadedFile: File) {
  isInitialLoading.value = true;
  revokeAllThumbnails();
  pageDeck.value = [];
  sourceDocs.value = [];
  pdfDocProxies.value.clear();

  try {
    const pdfjs = await getPdfjs();
    const buffer = await uploadedFile.arrayBuffer();
    // 创建独立克隆字节，防止 pdf.js worker transfer 转移导致主线程 ArrayBuffer 被分离 (detached) 为 0 字节
    const bytes = new Uint8Array(buffer);
    const pdfjsData = bytes.slice();

    const loadingTask = pdfjs.getDocument({ data: pdfjsData });
    const docProxy = await loadingTask.promise;

    const docId = `doc_${Date.now()}`;
    const newDocItem: SourceDocumentItem = {
      id: docId,
      name: uploadedFile.name,
      size: uploadedFile.size,
      bytes: bytes.slice(),
      pageCount: docProxy.numPages,
    };

    sourceDocs.value = [newDocItem];
    pdfDocProxies.value.set(docId, markRaw(docProxy));

    // 构建页面甲板
    const newDeck = createVirtualDeck(sourceDocs.value);
    pageDeck.value = newDeck;

    message.success(`成功载入文档 “${uploadedFile.name}”，共解析出 ${newDeck.length} 页`);
    setupIntersectionObserver();
  }
  catch (err: any) {
    message.error(`PDF 文档解析失败：${err?.message || '文件损坏或格式不受支持'}`);
  }
  finally {
    isInitialLoading.value = false;
  }
}

/**
 * 触发追加文件选择
 */
function triggerAppendFileInput() {
  appendFileInputRef.value?.click();
}

/**
 * 追加多个 PDF 文档并合并至当前甲板
 */
async function onAppendFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) {
    return;
  }

  isInitialLoading.value = true;
  try {
    const pdfjs = await getPdfjs();
    let addedPagesCount = 0;
    let addedDocsCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        continue;
      }

      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const pdfjsData = bytes.slice();

        const loadingTask = pdfjs.getDocument({ data: pdfjsData });
        const docProxy = await loadingTask.promise;

        const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newDocItem: SourceDocumentItem = {
          id: docId,
          name: file.name,
          size: file.size,
          bytes: bytes.slice(),
          pageCount: docProxy.numPages,
        };

        sourceDocs.value = [...sourceDocs.value, newDocItem];
        pdfDocProxies.value.set(docId, markRaw(docProxy));

        const newPages = createVirtualDeckForDoc(newDocItem);
        pageDeck.value = [...pageDeck.value, ...newPages];

        addedPagesCount += newPages.length;
        addedDocsCount++;
      }
      catch (fileErr: any) {
        message.error(`追加 “${file.name}” 失败：${fileErr?.message || '解析错误'}`);
      }
    }

    if (addedDocsCount > 0) {
      message.success(`成功追加 ${addedDocsCount} 个 PDF 文档，新增 ${addedPagesCount} 页`);
      setupIntersectionObserver();
    }
  }
  finally {
    input.value = '';
    isInitialLoading.value = false;
  }
}

/**
 * 单页旋转
 */
function handleRotatePage(pageId: string, delta: number) {
  pageDeck.value = rotatePage(pageDeck.value, pageId, delta);
}

/**
 * 全部有效页面批量旋转
 */
function handleRotateAll(delta: number) {
  pageDeck.value = rotateAllPages(pageDeck.value, delta);
  message.info(`已将全部未删除页面旋转 ${delta > 0 ? '顺时针 90°' : '逆时针 90°'}`);
}

/**
 * 切换删除状态
 */
function handleToggleDelete(pageId: string) {
  pageDeck.value = toggleDeletePage(pageDeck.value, pageId);
}

/**
 * 恢复所有已删页面
 */
function handleRecoverAll() {
  pageDeck.value = recoverAllDeletedPages(pageDeck.value);
  message.success('已恢复全部已标记删除的页面');
}

/**
 * 触发结果下载
 */
function downloadPdfResult(result: ExportPdfResult) {
  const blob = new Blob([result.bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * 导出编排后的 PDF 并触发下载
 */
async function handleExportPdf() {
  if (activePageCount.value === 0) {
    message.warning('当前有效页面数量为 0，无法导出文档');
    return;
  }

  isExporting.value = true;
  try {
    const result = await exportPdfFromDeck(pageDeck.value, sourceDocs.value, {
      customFileName: customExportName.value.trim() || undefined,
      watermark: isWatermarkActive.value ? watermarkConfig.value : undefined,
    });

    downloadPdfResult(result);
    message.success(`PDF 导出成功！共导出 ${result.pageCount} 页无损编排文档`);
  }
  catch (err: any) {
    message.error(err?.message || '导出处理失败，请重试');
  }
  finally {
    isExporting.value = false;
  }
}

/**
 * 范围拆分动作 1：仅保留选定页
 */
function handleApplyRangeSelection() {
  if (parsedRangePages.value.length === 0) {
    message.warning('请输入有效的页码范围（例如 1-3, 5）');
    return;
  }

  const targetSet = new Set(parsedRangePages.value);
  pageDeck.value = pageDeck.value.map((page, idx) => {
    const pageNum = idx + 1; // 1-indexed
    return {
      ...page,
      isDeleted: !targetSet.has(pageNum),
    };
  });

  showRangeModal.value = false;
  message.success(`已应用范围筛选：保留 ${targetSet.size} 页，其余已标记删除`);
}

/**
 * 范围拆分动作 2：直接导出选定范围
 */
async function handleExportRangePdf() {
  if (parsedRangePages.value.length === 0) {
    message.warning('请输入有效的页码范围（例如 1-3, 5）');
    return;
  }

  const targetSet = new Set(parsedRangePages.value);
  const rangePages = pageDeck.value
    .filter((_, idx) => targetSet.has(idx + 1))
    .map(p => ({ ...p, isDeleted: false }));

  if (rangePages.length === 0) {
    message.warning('当前范围内无有效页面可供导出');
    return;
  }

  isExporting.value = true;
  try {
    const safeExpr = rangeExpression.value.replace(/[^0-9,-]/g, '');
    const defaultName = `范围拆分_${safeExpr || '选定页'}`;
    const result = await exportPdfFromDeck(rangePages, sourceDocs.value, {
      customFileName: customExportName.value.trim() || defaultName,
      watermark: isWatermarkActive.value ? watermarkConfig.value : undefined,
    });

    downloadPdfResult(result);
    showRangeModal.value = false;
    message.success(`范围拆分导出成功！已提取 ${result.pageCount} 页独立文档`);
  }
  catch (err: any) {
    message.error(err?.message || '范围拆分导出失败');
  }
  finally {
    isExporting.value = false;
  }
}

/**
 * 水印图片选择
 */
function triggerLogoFileInput() {
  logoFileInputRef.value?.click();
}

function onLogoFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    watermarkConfig.value.imageDataUrl = e.target?.result as string;
    message.success(`已载入图片水印 “${file.name}”`);
    renderWatermarkPreview();
  };
  reader.readAsDataURL(file);
  input.value = '';
}

/**
 * 刷新水印微缩预览效果
 */
async function renderWatermarkPreview() {
  await nextTick();
  const canvas = watermarkPreviewCanvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = 320;
  canvas.height = 180;

  // 绘制模拟文档纸张白色底底色
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#e2e8f0';
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  // 模拟几行灰色文字示意原文档内容
  ctx.fillStyle = '#cbd5e1';
  for (let i = 24; i < 160; i += 20) {
    ctx.fillRect(20, i, 280, 8);
  }

  if (!isWatermarkActive.value) {
    return;
  }

  try {
    const stampCanvas = await renderWatermarkCanvas(canvas.width, canvas.height, watermarkConfig.value);
    if (stampCanvas) {
      ctx.drawImage(stampCanvas, 0, 0, canvas.width, canvas.height);
    }
  }
  catch {
    // 预览异常静默
  }
}

watch(
  () => [
    watermarkConfig.value.type,
    watermarkConfig.value.text,
    watermarkConfig.value.fontSize,
    watermarkConfig.value.color,
    watermarkConfig.value.opacity,
    watermarkConfig.value.rotation,
    watermarkConfig.value.layout,
    watermarkConfig.value.tileGap,
    watermarkConfig.value.imageDataUrl,
    watermarkConfig.value.imageScale,
  ],
  () => {
    if (showWatermarkModal.value) {
      renderWatermarkPreview();
    }
  },
);

/**
 * 开启高分辨率模态预览
 */
async function openHighResPreview(index: number) {
  previewPageIndex.value = index;
  showPreviewModal.value = true;
  await nextTick();
  renderCurrentPreviewPage();
}

/**
 * 渲染当前全屏大图预览
 */
async function renderCurrentPreviewPage() {
  const page = currentPreviewPage.value;
  if (!page || !previewCanvasRef.value) return;

  const docProxy = pdfDocProxies.value.get(page.sourceDocId);
  if (!docProxy) return;

  isPreviewLoading.value = true;
  try {
    const rawDoc = toRaw(docProxy);
    await renderPageHighResCanvas(
      rawDoc,
      page.originalPageIndex + 1,
      previewCanvasRef.value,
      1.8,
    );
  }
  catch (err: any) {
    message.error(`高分辨率页面渲染出错：${err?.message || '未知错误'}`);
  }
  finally {
    isPreviewLoading.value = false;
  }
}

function handlePrevPreview() {
  if (previewPageIndex.value > 0) {
    previewPageIndex.value--;
    renderCurrentPreviewPage();
  }
}

function handleNextPreview() {
  if (previewPageIndex.value < pageDeck.value.length - 1) {
    previewPageIndex.value++;
    renderCurrentPreviewPage();
  }
}

/**
 * 键盘快捷键监听
 */
function handleKeyDown(event: KeyboardEvent) {
  if (!showPreviewModal.value) return;
  if (event.key === 'ArrowLeft') {
    handlePrevPreview();
  }
  else if (event.key === 'ArrowRight') {
    handleNextPreview();
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }
});

/**
 * 重置工作台
 */
function handleResetAll() {
  revokeAllThumbnails();
  if (intersectionObserver) {
    intersectionObserver.disconnect();
  }
  cardElementRefs.clear();
  sourceDocs.value = [];
  pdfDocProxies.value.clear();
  pageDeck.value = [];
  customExportName.value = '';
}

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
  }
  handleResetAll();
});
</script>

<template>
  <div style="flex: 0 0 100%" class="pdf-studio-wrapper" flex flex-col gap-4>
    <!-- 隐藏的文件选择输入框（用于多文档追加与水印 Logo） -->
    <input
      ref="appendFileInputRef"
      type="file"
      multiple
      accept=".pdf"
      style="display: none"
      @change="onAppendFilesSelected"
    >
    <input
      ref="logoFileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/svg+xml"
      style="display: none"
      @change="onLogoFileChange"
    >

    <!-- 上传区域 -->
    <div v-if="sourceDocs.length === 0 && !isInitialLoading" mx-auto w-full max-w-650px py-2>
      <c-file-upload
        :title="$t('tools.pdf-studio.uploadTitle', '将 PDF 文档拖拽至此处，开启可视化编排工作台')"
        :button-text="$t('tools.pdf-studio.browseFiles', '浏览选择 PDF 文档')"
        accept=".pdf"
        @file-upload="onFileUpload"
      />
    </div>

    <!-- 加载中遮罩 -->
    <div v-if="isInitialLoading" py-12 text-center>
      <n-spin size="large" description="正在载入并解析 PDF 文档，构建虚拟页面甲板，请稍候..." />
    </div>

    <!-- 工作台操作区域 -->
    <div v-if="sourceDocs.length > 0 && !isInitialLoading" flex flex-col gap-4>
      <!-- 顶栏快捷操作与概要卡片 (严格水平居中) -->
      <n-card :bordered="true" size="small">
        <div flex flex-col gap-2.5>
          <!-- 第一行：来源文件名与统计标签 (水平居中) -->
          <div flex flex-wrap items-center justify-center gap-2.5 text-center>
            <div flex items-center gap-1.5 overflow-hidden>
              <n-icon size="18" class="text-primary flex-shrink-0" :component="FileText" />
              <span font-bold text-sm truncate max-w-320px>
                {{ sourceDocs.length === 1 ? sourceDocs[0]?.name : `已合并 ${sourceDocs.length} 个来源文档` }}
              </span>
            </div>

            <div flex items-center gap-2 flex-shrink-0>
              <n-tag size="small" type="info" round :bordered="false">
                总计 {{ pageDeck.length }} 页
              </n-tag>
              <n-tag size="small" type="success" round :bordered="false">
                有效 {{ activePageCount }} 页
              </n-tag>
              <n-tag v-if="deletedPageCount > 0" size="small" type="error" round :bordered="false">
                已删 {{ deletedPageCount }} 页
              </n-tag>
              <n-tag v-if="isWatermarkActive" size="small" type="warning" round :bordered="false">
                已启用印章水印
              </n-tag>
              <n-tag size="small" round :bordered="false">
                {{ formatBytes(sourceDocs.reduce((acc, d) => acc + d.size, 0)) }}
              </n-tag>
            </div>
          </div>

          <!-- 第二行：操作按钮组 (严格水平居中) -->
          <div flex flex-wrap items-center justify-center gap-2.5 pt-1>
            <n-button
              type="primary"
              secondary
              :loading="isExporting"
              :disabled="activePageCount === 0"
              @click="handleExportPdf"
            >
              <template #icon>
                <n-icon :component="Download" />
              </template>
              导出编排后的 PDF
            </n-button>

            <n-button
              secondary
              type="primary"
              title="追加额外的 PDF 文档合并到当前工作台"
              @click="triggerAppendFileInput"
            >
              <template #icon>
                <n-icon :component="FilePlus" />
              </template>
              追加合并 PDF
            </n-button>

            <n-button
              secondary
              type="info"
              title="通过页码范围表达式筛选或快速拆分"
              @click="showRangeModal = true"
            >
              <template #icon>
                <n-icon :component="Scissors" />
              </template>
              范围拆分
            </n-button>

            <n-button
              secondary
              :type="isWatermarkActive ? 'warning' : 'default'"
              title="配置免字库透明中文字印与图片水印"
              @click="showWatermarkModal = true; renderWatermarkPreview()"
            >
              <template #icon>
                <n-icon :component="Certificate" />
              </template>
              {{ isWatermarkActive ? '水印印章 (已开启)' : '水印印章' }}
            </n-button>

            <n-button
              secondary
              type="info"
              @click="handleRotateAll(90)"
            >
              <template #icon>
                <n-icon :component="RotateClockwise" />
              </template>
              全页顺转 90°
            </n-button>

            <n-button
              secondary
              type="info"
              @click="handleRotateAll(-90)"
            >
              <template #icon>
                <n-icon :component="Rotate" />
              </template>
              全页逆转 90°
            </n-button>

            <n-button
              v-if="deletedPageCount > 0"
              secondary
              type="warning"
              @click="handleRecoverAll"
            >
              <template #icon>
                <n-icon :component="History" />
              </template>
              恢复全部删除 ({{ deletedPageCount }})
            </n-button>

            <n-button
              secondary
              type="error"
              @click="handleResetAll"
            >
              <template #icon>
                <n-icon :component="Refresh" />
              </template>
              重新选择
            </n-button>
          </div>
        </div>
      </n-card>

      <!-- 导出选项卡片 (紧凑) -->
      <n-card size="small" :bordered="true">
        <div flex flex-wrap items-center justify-center gap-3>
          <span text-xs class="text-gray-500 whitespace-nowrap">自定义导出文件名：</span>
          <n-input
            v-model:value="customExportName"
            placeholder="留空默认：原文件名_编排整理.pdf"
            size="small"
            clearable
            style="max-width: 360px"
          >
            <template #prefix>
              <n-icon :component="FileText" class="text-gray-400" />
            </template>
          </n-input>
          <span text-xs class="text-gray-400">（按住卡片左上角手柄拖拽可任意调整页面先后次序，点击卡片可高精全屏预览）</span>
        </div>
      </n-card>

      <!-- 虚拟页面甲板拖拽网格 (Virtual Page Deck) -->
      <Draggable
        v-model="pageDeck"
        item-key="id"
        ghost-class="deck-drag-ghost"
        handle=".drag-handle"
        class="deck-grid"
      >
        <template #item="{ element: page, index }">
          <div
            :ref="(el) => setCardRef(page.id, el)"
            :data-page-id="page.id"
            class="deck-card-item"
            :class="{ 'is-deleted': page.isDeleted }"
          >
            <!-- 卡片顶栏：页码与拖拽手柄 -->
            <div class="card-header">
              <div flex items-center gap-1.5 overflow-hidden>
                <div class="drag-handle" title="按住拖拽以重新排序">
                  <n-icon size="16" :component="GripVertical" />
                </div>
                <span font-bold text-xs flex-shrink-0>第 {{ index + 1 }} 页</span>
                <span v-if="sourceDocs.length > 1 && page.sourceDocName" text-10px class="text-primary truncate max-w-110px">
                  ({{ page.sourceDocName }})
                </span>
              </div>
              <span text-11px class="text-gray-400 flex-shrink-0">原第 {{ page.originalPageIndex + 1 }} 页</span>
            </div>

            <!-- 缩略图容器 (支持 CSS 顺滑旋转与点击高精大图模态预览) -->
            <div class="card-thumb-container" @click="openHighResPreview(index)">
              <div
                class="thumb-rotator"
                :style="{ transform: `rotate(${page.rotation}deg)` }"
              >
                <img
                  v-if="page.thumbnailUrl"
                  :src="page.thumbnailUrl"
                  alt="page-thumbnail"
                  class="thumb-image"
                >
                <div v-else class="thumb-skeleton">
                  <n-spin size="small" />
                  <span text-10px text-gray-400 mt-1>加载缩略图中...</span>
                </div>
              </div>

              <!-- 悬浮快速全屏预览按钮 -->
              <div class="preview-btn-overlay" title="高精度全屏大图预览">
                <n-icon size="18" :component="ZoomIn" />
              </div>

              <!-- 逻辑删除遮罩覆盖 -->
              <div
                v-if="page.isDeleted"
                class="deleted-overlay"
                @click.stop="handleToggleDelete(page.id)"
              >
                <div flex flex-col items-center gap-1>
                  <n-icon size="24" :component="History" />
                  <span text-xs font-bold>已标记删除</span>
                  <span text-10px class="opacity-80">点击即可撤销恢复</span>
                </div>
              </div>
            </div>

            <!-- 底部单页控制按钮组 (水平居中) -->
            <div class="card-footer">
              <n-button
                size="tiny"
                quaternary
                :disabled="page.isDeleted"
                title="逆时针旋转 90°"
                @click="handleRotatePage(page.id, -90)"
              >
                <template #icon>
                  <n-icon :component="Rotate" />
                </template>
                -90°
              </n-button>

              <n-button
                size="tiny"
                quaternary
                :disabled="page.isDeleted"
                title="顺时针旋转 90°"
                @click="handleRotatePage(page.id, 90)"
              >
                <template #icon>
                  <n-icon :component="RotateClockwise" />
                </template>
                +90°
              </n-button>

              <n-button
                size="tiny"
                quaternary
                :type="page.isDeleted ? 'primary' : 'error'"
                :title="page.isDeleted ? '恢复此页' : '删除此页'"
                @click="handleToggleDelete(page.id)"
              >
                <template #icon>
                  <n-icon :component="page.isDeleted ? History : Trash" />
                </template>
                {{ page.isDeleted ? '恢复' : '删除' }}
              </n-button>
            </div>
          </div>
        </template>
      </Draggable>
    </div>

    <!-- 模态框 1：页面范围拆分与提取 (Page Range Splitting) -->
    <n-modal
      v-model:show="showRangeModal"
      preset="card"
      title="页面范围拆分与提取"
      style="width: 520px; max-width: 95vw"
    >
      <div flex flex-col gap-3.5>
        <div text-xs class="text-gray-500">
          支持使用连续区间和离散页码表达式（例如：<code>1-3, 5, 8-10</code> 或 <code>1~5</code>）。页码基于当前编排后的先后顺序（共 {{ pageDeck.length }} 页）。
        </div>

        <div>
          <n-input
            v-model:value="rangeExpression"
            placeholder="例如：1-3, 5, 8-12"
            clearable
          >
            <template #prefix>
              <n-icon :component="Scissors" class="text-gray-400" />
            </template>
          </n-input>
        </div>

        <!-- 匹配提示 -->
        <div class="bg-gray-50 dark:bg-gray-800 p-2.5 rounded text-xs flex flex-col gap-1">
          <div flex items-center justify-between>
            <span font-medium>已识别选定页面：</span>
            <span class="text-primary font-bold">{{ parsedRangePages.length }} 页</span>
          </div>
          <div class="text-gray-400 truncate max-w-full">
            {{ parsedRangePages.length > 0 ? parsedRangePages.join(', ') : '暂无匹配的有效页码' }}
          </div>
        </div>

        <div flex items-center justify-center gap-3 pt-2>
          <n-button
            secondary
            type="info"
            :disabled="parsedRangePages.length === 0"
            @click="handleApplyRangeSelection"
          >
            仅保留选定页 (其余标记删除)
          </n-button>

          <n-button
            type="primary"
            :loading="isExporting"
            :disabled="parsedRangePages.length === 0"
            @click="handleExportRangePdf"
          >
            <template #icon>
              <n-icon :component="Download" />
            </template>
            导出选定范围 PDF
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 模态框 2：免字库透明中文字印与图片水印 (Transparent Stamp Rasterizer) -->
    <n-modal
      v-model:show="showWatermarkModal"
      preset="card"
      title="免字库透明中文字印与图片水印设置"
      style="width: 620px; max-width: 95vw"
    >
      <div flex flex-col gap-4>
        <!-- 核心说明 -->
        <div text-xs class="text-gray-500">
          基于浏览器原生高精度 Canvas 离屏光栅化，100% 离线运行，无需下载昂贵的外部字体库，即可完美呈现任意汉字、标点与 Emoji 水印。
        </div>

        <!-- 水印类型选择 -->
        <div flex items-center gap-3>
          <span text-xs font-bold class="text-gray-600 dark:text-gray-300">水印模式：</span>
          <n-radio-group v-model:value="watermarkConfig.type" name="watermarkTypeGroup">
            <n-radio-button value="none">
              不添加水印
            </n-radio-button>
            <n-radio-button value="text">
              中文字印 (文本)
            </n-radio-button>
            <n-radio-button value="image">
              图片印章 (LOGO)
            </n-radio-button>
          </n-radio-group>
        </div>

        <!-- 文本水印设置项 -->
        <div v-if="watermarkConfig.type === 'text'" flex flex-col gap-3>
          <n-form-item label="水印文字内容：" :show-feedback="false">
            <n-input
              v-model:value="watermarkConfig.text"
              placeholder="输入印章水印文本（支持汉字、英文、Emoji）"
              clearable
            />
          </n-form-item>

          <div grid grid-cols-2 gap-3>
            <n-form-item label="字体大小 (pt)：" :show-feedback="false">
              <n-input-number
                v-model:value="watermarkConfig.fontSize"
                :min="12"
                :max="96"
                :step="2"
                w-full
              />
            </n-form-item>

            <n-form-item label="文字颜色：" :show-feedback="false">
              <n-color-picker
                v-model:value="watermarkConfig.color"
                :show-alpha="false"
                w-full
              />
            </n-form-item>
          </div>

          <div grid grid-cols-2 gap-3>
            <n-form-item :label="`不透明度：${Math.round((watermarkConfig.opacity || 0.3) * 100)}%`" :show-feedback="false">
              <n-slider
                v-model:value="watermarkConfig.opacity"
                :min="0.05"
                :max="1.0"
                :step="0.05"
              />
            </n-form-item>

            <n-form-item :label="`倾斜角度：${watermarkConfig.rotation || 0}°`" :show-feedback="false">
              <n-slider
                v-model:value="watermarkConfig.rotation"
                :min="-90"
                :max="90"
                :step="5"
              />
            </n-form-item>
          </div>

          <div grid grid-cols-2 gap-3 items-center>
            <n-form-item label="平铺布局方式：" :show-feedback="false">
              <n-radio-group v-model:value="watermarkConfig.layout">
                <n-radio value="center">
                  居中单印
                </n-radio>
                <n-radio value="tile">
                  全页网格平铺
                </n-radio>
              </n-radio-group>
            </n-form-item>

            <n-form-item
              v-if="watermarkConfig.layout === 'tile'"
              :label="`平铺网格间距：${watermarkConfig.tileGap || 140} pt`"
              :show-feedback="false"
            >
              <n-slider
                v-model:value="watermarkConfig.tileGap"
                :min="80"
                :max="240"
                :step="10"
              />
            </n-form-item>
          </div>
        </div>

        <!-- 图片水印设置项 -->
        <div v-if="watermarkConfig.type === 'image'" flex flex-col gap-3>
          <div flex items-center gap-3>
            <n-button secondary type="primary" @click="triggerLogoFileInput">
              <template #icon>
                <n-icon :component="Photo" />
              </template>
              {{ watermarkConfig.imageDataUrl ? '更换图片文件' : '选择图片/LOGO (PNG/JPG)' }}
            </n-button>
            <span v-if="watermarkConfig.imageDataUrl" text-xs class="text-green-600">已载入印章图片</span>
            <span v-else text-xs class="text-gray-400">建议使用透明背景 PNG 图</span>
          </div>

          <div grid grid-cols-2 gap-3>
            <n-form-item :label="`缩放比例：${Math.round((watermarkConfig.imageScale || 0.4) * 100)}%`" :show-feedback="false">
              <n-slider
                v-model:value="watermarkConfig.imageScale"
                :min="0.1"
                :max="1.5"
                :step="0.05"
              />
            </n-form-item>

            <n-form-item :label="`不透明度：${Math.round((watermarkConfig.opacity || 0.3) * 100)}%`" :show-feedback="false">
              <n-slider
                v-model:value="watermarkConfig.opacity"
                :min="0.05"
                :max="1.0"
                :step="0.05"
              />
            </n-form-item>
          </div>

          <div grid grid-cols-2 gap-3 items-center>
            <n-form-item label="布局方式：" :show-feedback="false">
              <n-radio-group v-model:value="watermarkConfig.layout">
                <n-radio value="center">
                  居中印章
                </n-radio>
                <n-radio value="tile">
                  全页网格平铺
                </n-radio>
              </n-radio-group>
            </n-form-item>

            <n-form-item :label="`倾斜角度：${watermarkConfig.rotation || 0}°`" :show-feedback="false">
              <n-slider
                v-model:value="watermarkConfig.rotation"
                :min="-90"
                :max="90"
                :step="5"
              />
            </n-form-item>
          </div>
        </div>

        <!-- 实时印章效果微缩示意画布 -->
        <div v-if="watermarkConfig.type !== 'none'" flex flex-col items-center gap-1.5 pt-1>
          <span text-11px class="text-gray-400">印章覆盖效果实时模拟：</span>
          <div class="watermark-preview-box">
            <canvas ref="watermarkPreviewCanvasRef" class="watermark-canvas" />
          </div>
        </div>

        <div flex items-center justify-center pt-2>
          <n-button type="primary" @click="showWatermarkModal = false">
            完成印章配置并应用
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 模态框 3：高分辨率全屏大图预览 (High-Resolution Modal Preview) -->
    <n-modal
      v-model:show="showPreviewModal"
      preset="card"
      :title="previewModalTitle"
      style="width: 86vw; max-width: 920px"
    >
      <div flex flex-col items-center gap-3>
        <!-- 核心预览视口 -->
        <div class="modal-preview-viewport">
          <div v-if="isPreviewLoading" class="preview-spinner-overlay">
            <n-spin size="large" description="正在高分辨率光栅化渲染页面..." />
          </div>

          <div
            class="modal-preview-rotator"
            :style="{ transform: `rotate(${currentPreviewPage?.rotation || 0}deg)` }"
          >
            <canvas ref="previewCanvasRef" class="high-res-canvas" />
          </div>
        </div>

        <!-- 快捷翻页与旋转删减工具栏 (严格水平居中) -->
        <div flex flex-wrap items-center justify-center gap-2.5 pt-2>
          <n-button
            secondary
            size="small"
            :disabled="previewPageIndex <= 0"
            @click="handlePrevPreview"
          >
            <template #icon>
              <n-icon :component="ArrowLeft" />
            </template>
            上一页 (←)
          </n-button>

          <n-button
            secondary
            size="small"
            type="info"
            @click="handlePreviewRotate(-90)"
          >
            <template #icon>
              <n-icon :component="Rotate" />
            </template>
            逆时针 90°
          </n-button>

          <n-button
            secondary
            size="small"
            type="info"
            @click="handlePreviewRotate(90)"
          >
            <template #icon>
              <n-icon :component="RotateClockwise" />
            </template>
            顺时针 90°
          </n-button>

          <n-button
            secondary
            size="small"
            :type="currentPreviewPage?.isDeleted ? 'primary' : 'error'"
            @click="handlePreviewToggleDelete"
          >
            <template #icon>
              <n-icon :component="currentPreviewPage?.isDeleted ? History : Trash" />
            </template>
            {{ currentPreviewPage?.isDeleted ? '恢复此页' : '删除此页' }}
          </n-button>

          <n-button
            secondary
            size="small"
            :disabled="previewPageIndex >= pageDeck.length - 1"
            @click="handleNextPreview"
          >
            下一页 (→)
            <template #icon>
              <n-icon :component="ArrowRight" />
            </template>
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.deck-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  width: 100%;
}

.deck-card-item {
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.deck-card-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--n-primary-color);
}

.deck-card-item.is-deleted {
  opacity: 0.65;
  border-style: dashed;
  border-color: #ef4444;
}

.deck-drag-ghost {
  opacity: 0.4;
  border: 2px dashed var(--n-primary-color) !important;
  background-color: var(--n-color-embedded) !important;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid var(--n-border-color);
  background-color: var(--n-color-embedded);
}

.drag-handle {
  cursor: grab;
  display: inline-flex;
  align-items: center;
  color: var(--n-text-color-3);
  padding: 2px;
}

.drag-handle:active {
  cursor: grabbing;
}

.card-thumb-container {
  position: relative;
  width: 100%;
  height: 240px;
  background-color: var(--n-color-embedded);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 8px;
  box-sizing: border-box;
  cursor: pointer;
}

.thumb-rotator {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.thumb-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  border-radius: 2px;
}

.thumb-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.preview-btn-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.55);
  color: #ffffff;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
}

.card-thumb-container:hover .preview-btn-overlay {
  opacity: 1;
  transform: scale(1.05);
}

.deleted-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(239, 68, 68, 0.85);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  transition: background-color 0.2s;
}

.deleted-overlay:hover {
  background-color: rgba(220, 38, 38, 0.95);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 8px;
  border-top: 1px solid var(--n-border-color);
  background-color: var(--n-color);
}

.modal-preview-viewport {
  position: relative;
  width: 100%;
  max-height: 65vh;
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--n-color-embedded);
  border-radius: 6px;
  overflow: auto;
  padding: 16px;
}

.preview-spinner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.modal-preview-rotator {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.25s ease;
}

.high-res-canvas {
  max-width: 100%;
  max-height: 60vh;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

.watermark-preview-box {
  width: 320px;
  height: 180px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.watermark-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
