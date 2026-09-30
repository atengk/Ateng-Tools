<script setup lang="ts">
/**
 * PDF Studio (PDF 工坊) 视图组件
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { useMessage } from 'naive-ui';
import Draggable from 'vuedraggable';
import { markRaw, shallowRef, toRaw } from 'vue';
import {
  Download,
  FileText,
  GripVertical,
  History,
  Refresh,
  Rotate,
  RotateClockwise,
  Trash,
} from '@vicons/tabler';
import {
  createVirtualDeck,
  exportPdfFromDeck,
  getPdfjs,
  recoverAllDeletedPages,
  renderThumbnailCanvas,
  rotateAllPages,
  rotatePage,
  toggleDeletePage,
} from './pdf-studio.service';
import type { SourceDocumentItem, VirtualPageItem } from './pdf-studio.types';
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

// 视口观察器集合
let intersectionObserver: IntersectionObserver | null = null;
const cardElementRefs = new Map<string, HTMLElement>();

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
 * 光栅化渲染单张缩略图
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
 * 文件上传解析流程
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
    const bytes = new Uint8Array(buffer);

    const loadingTask = pdfjs.getDocument({ data: bytes });
    const docProxy = await loadingTask.promise;

    const docId = `doc_${Date.now()}`;
    const newDocItem: SourceDocumentItem = {
      id: docId,
      name: uploadedFile.name,
      size: uploadedFile.size,
      bytes,
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
    });

    const blob = new Blob([result.bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.fileName;
    anchor.click();
    URL.revokeObjectURL(url);

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
  handleResetAll();
});
</script>

<template>
  <div style="flex: 0 0 100%" class="pdf-studio-wrapper" flex flex-col gap-4>
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
      <n-spin size="large" description="正在载入 PDF 文档并构建虚拟页面甲板，请稍候..." />
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
              <span font-bold text-sm truncate max-w-320px>{{ sourceDocs[0]?.name }}</span>
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
              <n-tag size="small" round :bordered="false">
                {{ formatBytes(sourceDocs[0]?.size || 0) }}
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
        <div flex items-center justify-center gap-3>
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
          <span text-xs class="text-gray-400">（支持自由拖拽卡片调整页面先后顺序）</span>
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
              <div flex items-center gap-1.5>
                <div class="drag-handle" title="按住拖拽以重新排序">
                  <n-icon size="16" :component="GripVertical" />
                </div>
                <span font-bold text-xs>第 {{ index + 1 }} 页</span>
              </div>
              <span text-11px class="text-gray-400">原第 {{ page.originalPageIndex + 1 }} 页</span>
            </div>

            <!-- 缩略图容器 (支持 CSS 顺滑旋转) -->
            <div class="card-thumb-container">
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

              <!-- 逻辑删除遮罩覆盖 -->
              <div v-if="page.isDeleted" class="deleted-overlay" @click="handleToggleDelete(page.id)">
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
</style>
