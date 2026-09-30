<script setup lang="ts">
/**
 * PDF 转图片与 ZIP 归档视图组件
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { useMessage } from 'naive-ui';
import { markRaw, shallowRef, toRaw } from 'vue';
import {
  Archive,
  Download,
  FileText,
  Photo,
  Refresh,
} from '@vicons/tabler';
import {
  buildImageFileName,
  canvasToBlob,
  createZipArchive,
  getPdfjs,
  renderPdfPageToCanvas,
} from './pdf-to-image.service';
import type { ImageFormat, PdfPageImageItem, ResolutionScale } from './pdf-to-image.types';
import { formatBytes } from '@/utils/convert';

const message = useMessage();

const file = ref<File | null>(null);
const pdfDocProxy = shallowRef<any>(null);
const totalPages = ref(0);

// 全局转换配置
const imageFormat = ref<ImageFormat>('png');
const resolutionScale = ref<ResolutionScale>(2);
const imageQuality = ref(92);
const customZipName = ref('');

// 渲染状态与产物
const isRendering = ref(false);
const isZipping = ref(false);
const renderProgress = ref(0);
const renderedPages = ref<PdfPageImageItem[]>([]);

/**
 * 格式选项列表
 */
const formatOptions = [
  { label: 'PNG 格式 (无损高清推荐)', value: 'png' },
  { label: 'JPEG 格式 (色彩丰富体积适中)', value: 'jpeg' },
  { label: 'WebP 格式 (现代化高压缩率)', value: 'webp' },
];

/**
 * 分辨率选项列表
 */
const scaleOptions = [
  { label: '1x 分辨率 (72 DPI 标准速度最快)', value: 1 },
  { label: '2x 分辨率 (144 DPI 高清推荐)', value: 2 },
  { label: '3x 分辨率 (216 DPI 超高清打印级)', value: 3 },
];

/**
 * 清除并释放此前所有页面的本地预览 ObjectURL
 */
function cleanRenderedPages() {
  for (const item of renderedPages.value) {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }
  renderedPages.value = [];
}

/**
 * 上传 PDF 文档并启动解析
 */
async function onPdfUpload(uploadedFile: File) {
  cleanRenderedPages();
  file.value = uploadedFile;
  isRendering.value = true;
  renderProgress.value = 0;

  try {
    const pdfjs = await getPdfjs();
    const buffer = await uploadedFile.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const doc = await loadingTask.promise;

    pdfDocProxy.value = markRaw(doc);
    totalPages.value = doc.numPages;

    message.success(`PDF 解析成功，共 ${doc.numPages} 页，开始光栅化渲染...`);
    await renderAllPages();
  }
  catch (error: any) {
    pdfDocProxy.value = null;
    totalPages.value = 0;
    message.error(`文档解析失败：${error?.message || '文件损坏或格式不受支持'}`);
  }
  finally {
    isRendering.value = false;
  }
}

/**
 * 渲染全部页面至图片列表
 */
async function renderAllPages() {
  if (!pdfDocProxy.value || !file.value) {
    return;
  }

  isRendering.value = true;
  renderProgress.value = 0;
  cleanRenderedPages();

  const offscreenCanvas = document.createElement('canvas');
  const count = totalPages.value;
  const pagesResult: PdfPageImageItem[] = [];
  const rawDoc = toRaw(pdfDocProxy.value);

  try {
    for (let pageNum = 1; pageNum <= count; pageNum++) {
      const { width, height } = await renderPdfPageToCanvas(
        rawDoc,
        pageNum,
        resolutionScale.value,
        offscreenCanvas,
      );

      const blob = await canvasToBlob(
        offscreenCanvas,
        imageFormat.value,
        imageQuality.value / 100,
      );

      const fileName = buildImageFileName(
        file.value.name,
        pageNum,
        count,
        imageFormat.value,
      );

      const previewUrl = URL.createObjectURL(blob);

      pagesResult.push({
        pageNumber: pageNum,
        width,
        height,
        blob,
        previewUrl,
        fileName,
        fileSize: blob.size,
      });

      renderProgress.value = Math.floor((pageNum / count) * 100);
    }

    renderedPages.value = pagesResult;
    message.success(`已全部渲染完成！共生成 ${pagesResult.length} 张图片`);
  }
  catch (err: any) {
    message.error(`页面渲染出错：${err?.message || '未知错误'}`);
  }
  finally {
    isRendering.value = false;
  }
}

/**
 * 下载单页图片
 */
function downloadSinglePage(pageItem: PdfPageImageItem) {
  const url = URL.createObjectURL(pageItem.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = pageItem.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  message.success(`第 ${pageItem.pageNumber} 页图片已开始下载`);
}

/**
 * 纯内存 ZIP 打包并触发单文件下载
 */
async function downloadAllAsZip() {
  if (renderedPages.value.length === 0 || !file.value) {
    message.warning('请先等待页面渲染完成');
    return;
  }

  isZipping.value = true;
  try {
    const filesToZip: Record<string, Uint8Array> = {};

    for (const page of renderedPages.value) {
      const arrayBuffer = await page.blob.arrayBuffer();
      filesToZip[page.fileName] = new Uint8Array(arrayBuffer);
    }

    const zipBytes = await createZipArchive(filesToZip);
    const zipBlob = new Blob([zipBytes], { type: 'application/zip' });
    const zipUrl = URL.createObjectURL(zipBlob);

    const baseName = file.value.name.replace(/\.[^/.]+$/, '');
    const outZipName = customZipName.value.trim()
      ? (customZipName.value.endsWith('.zip') ? customZipName.value : `${customZipName.value}.zip`)
      : `${baseName}_图片归档.zip`;

    const anchor = document.createElement('a');
    anchor.href = zipUrl;
    anchor.download = outZipName;
    anchor.click();
    URL.revokeObjectURL(zipUrl);

    message.success(`ZIP 压缩包打包完成！已包含 ${renderedPages.value.length} 张高清图片`);
  }
  catch (err: any) {
    message.error(`ZIP 打包失败：${err?.message || '压缩处理异常'}`);
  }
  finally {
    isZipping.value = false;
  }
}

/**
 * 清空重选
 */
function onReset() {
  cleanRenderedPages();
  file.value = null;
  pdfDocProxy.value = null;
  totalPages.value = 0;
  customZipName.value = '';
}

onUnmounted(() => {
  cleanRenderedPages();
});
</script>

<template>
  <div class="pdf-to-image-container" flex flex-col gap-4>
    <!-- 上传区域 -->
    <div v-if="!file" mx-auto w-full max-w-650px py-2>
      <c-file-upload
        :title="$t('tools.pdf-to-image.uploadTitle', '将 PDF 文件拖拽至此处，或点击浏览选择')"
        :button-text="$t('tools.pdf-to-image.browseFiles', '浏览选择 PDF')"
        accept=".pdf"
        @file-upload="onPdfUpload"
      />
    </div>

    <!-- 渲染处理中遮罩 -->
    <div v-if="isRendering" py-12 text-center>
      <n-spin size="large">
        <template #description>
          <div flex flex-col items-center gap-2>
            <span>正在将 PDF 光栅化渲染为高清图片，已完成 {{ renderProgress }}%...</span>
            <div style="width: 240px">
              <n-progress
                type="line"
                :percentage="renderProgress"
                :show-indicator="false"
                status="info"
              />
            </div>
          </div>
        </template>
      </n-spin>
    </div>

    <!-- 已加载文件工作台区 -->
    <div v-if="file && !isRendering" flex flex-col gap-4>
      <!-- 顶栏快捷操作与概要卡片 (严格水平居中) -->
      <n-card :bordered="true" size="small">
        <div flex flex-col gap-2.5>
          <!-- 第一行：文件名与统计标签 (居中) -->
          <div flex flex-wrap items-center justify-center gap-2.5 text-center>
            <div flex items-center gap-1.5 overflow-hidden>
              <n-icon size="18" class="text-primary flex-shrink-0" :component="FileText" />
              <span font-bold text-sm truncate max-w-320px>{{ file.name }}</span>
            </div>

            <div flex items-center gap-2 flex-shrink-0>
              <n-tag size="small" type="info" round :bordered="false">
                共 {{ totalPages }} 页
              </n-tag>
              <n-tag size="small" type="success" round :bordered="false">
                {{ formatBytes(file.size) }}
              </n-tag>
              <n-tag size="small" type="warning" round :bordered="false">
                {{ imageFormat.toUpperCase() }} · {{ resolutionScale }}x
              </n-tag>
            </div>
          </div>

          <!-- 第二行：操作按钮组 (严格水平居中) -->
          <div flex flex-wrap items-center justify-center gap-2.5 pt-1>
            <n-button
              type="primary"
              secondary
              :loading="isZipping"
              :disabled="renderedPages.length === 0"
              @click="downloadAllAsZip"
            >
              <template #icon>
                <n-icon :component="Archive" />
              </template>
              一键打包下载全部 ZIP
            </n-button>

            <n-button
              secondary
              type="info"
              @click="renderAllPages"
            >
              <template #icon>
                <n-icon :component="Refresh" />
              </template>
              按新参数重新渲染
            </n-button>

            <n-button
              secondary
              type="error"
              @click="onReset"
            >
              <template #icon>
                <n-icon :component="Refresh" />
              </template>
              重新选择
            </n-button>
          </div>
        </div>
      </n-card>

      <!-- 渲染与输出配置面板 -->
      <n-card title="图片导出与清晰度配置" size="small" :bordered="true">
        <n-grid cols="1 m:3" :x-gap="16" :y-gap="12">
          <n-grid-item>
            <div class="config-label">
              输出图片格式
            </div>
            <n-select v-model:value="imageFormat" size="small" :options="formatOptions" />
          </n-grid-item>

          <n-grid-item>
            <div class="config-label">
              渲染分辨率清晰度
            </div>
            <n-select v-model:value="resolutionScale" size="small" :options="scaleOptions" />
          </n-grid-item>

          <n-grid-item v-if="imageFormat !== 'png'">
            <div class="config-label">
              图片输出质量 ({{ imageQuality }}%)
            </div>
            <n-slider v-model:value="imageQuality" :min="30" :max="100" :step="1" />
          </n-grid-item>
        </n-grid>

        <div mt-3 flex items-center gap-3>
          <span text-xs class="text-gray-500 whitespace-nowrap">自定义 ZIP 归档文件名：</span>
          <n-input
            v-model:value="customZipName"
            placeholder="留空默认：文件名_图片归档.zip"
            size="small"
            clearable
            style="max-width: 320px"
          >
            <template #prefix>
              <n-icon :component="Archive" class="text-gray-400" />
            </template>
          </n-input>
        </div>
      </n-card>

      <!-- 页面图片网格视图 -->
      <n-card title="页面预览与单页导出" size="small" :bordered="true">
        <n-grid cols="1 s:2 m:3" :x-gap="16" :y-gap="16">
          <n-grid-item v-for="page in renderedPages" :key="page.pageNumber">
            <n-card size="small" embedded :bordered="true" class="page-preview-card">
              <!-- 头部页码与大小 -->
              <div flex items-center justify-between pb-2 text-xs>
                <span font-bold>第 {{ page.pageNumber }} 页</span>
                <span class="text-gray-400">{{ formatBytes(page.fileSize) }}</span>
              </div>

              <!-- 缩略图视窗 -->
              <div class="image-wrapper">
                <img
                  :src="page.previewUrl"
                  :alt="page.fileName"
                  class="preview-img"
                  loading="lazy"
                >
              </div>

              <!-- 底部单页操作按钮 (水平居中) -->
              <div flex items-center justify-center pt-3>
                <n-button
                  size="small"
                  secondary
                  type="primary"
                  @click="downloadSinglePage(page)"
                >
                  <template #icon>
                    <n-icon :component="Download" />
                  </template>
                  下载此页 ({{ page.width }}×{{ page.height }})
                </n-button>
              </div>
            </n-card>
          </n-grid-item>
        </n-grid>
      </n-card>
    </div>
  </div>
</template>

<style scoped>
.config-label {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin-bottom: 4px;
}

.page-preview-card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.page-preview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.image-wrapper {
  width: 100%;
  height: 240px;
  background-color: var(--n-color-embedded);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--n-border-color);
}

.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
