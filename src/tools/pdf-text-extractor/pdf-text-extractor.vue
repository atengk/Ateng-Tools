<script setup lang="ts">
/**
 * PDF 文本与元数据提取器视图组件
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { useMessage } from 'naive-ui';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  Refresh,
  Search,
} from '@vicons/tabler';
import { useCopy } from '@/composable/copy';
import { extractPdfTextAndMetadata } from './pdf-text-extractor.service';
import type { PdfExtractResult, PdfPageTextItem } from './pdf-text-extractor.types';

const message = useMessage();
const { copy } = useCopy({ createToast: false });

const file = ref<File | null>(null);
const isLoading = ref(false);
const extractResult = ref<PdfExtractResult | null>(null);
const searchQuery = ref('');
const currentPage = ref(1);
const viewMode = ref<'tabs' | 'all'>('tabs');
const showMetadata = ref(true);

/**
 * 处理文件上传解析流程
 */
async function onFileUpload(uploadedFile: File) {
  file.value = uploadedFile;
  isLoading.value = true;
  searchQuery.value = '';
  currentPage.value = 1;

  try {
    const buffer = await uploadedFile.arrayBuffer();
    const res = await extractPdfTextAndMetadata(buffer);
    extractResult.value = res;
    message.success('PDF 文档解析成功！');
  }
  catch (error: any) {
    extractResult.value = null;
    message.error(`解析失败：${error?.message || '文件损坏或格式不受支持'}`);
  }
  finally {
    isLoading.value = false;
  }
}

/**
 * 清除当前文档状态
 */
function onClear() {
  file.value = null;
  extractResult.value = null;
  searchQuery.value = '';
  currentPage.value = 1;
}

/**
 * 复制全部文本至剪贴板
 */
function copyAllText() {
  if (!extractResult.value) {
    return;
  }
  copy(extractResult.value.allText);
  message.success('全文已成功复制至剪贴板');
}

/**
 * 复制指定单页文本
 */
function copyPageText(page: PdfPageTextItem) {
  copy(page.text);
  message.success(`第 ${page.pageNumber} 页内容已复制至剪贴板`);
}

/**
 * 将提取出的文本下载为 UTF-8 编码的 .txt 文件
 */
function downloadTextFile() {
  if (!extractResult.value || !file.value) {
    return;
  }
  const blob = new Blob([extractResult.value.allText], { type: 'text/plain;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const baseName = file.value.name.replace(/\.[^/.]+$/, '');
  anchor.href = downloadUrl;
  anchor.download = `${baseName}_提取文本.txt`;
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
  message.success('文本文件已开始下载');
}

/**
 * 根据搜索关键字过滤分页文本
 */
const filteredPages = computed(() => {
  if (!extractResult.value) {
    return [];
  }
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return extractResult.value.pages;
  }
  return extractResult.value.pages.filter(page =>
    page.text.toLowerCase().includes(query) || page.pageNumber.toString() === query,
  );
});

/**
 * 当前选项卡模式下选中的页面
 */
const activePageItem = computed(() => {
  if (!filteredPages.value || filteredPages.value.length === 0) {
    return null;
  }
  const found = filteredPages.value.find(p => p.pageNumber === currentPage.value);
  return found || filteredPages.value[0];
});
</script>

<template>
  <div class="pdf-text-extractor-container" flex flex-col gap-5>
    <!-- 上传区域 -->
    <div v-if="!extractResult && !isLoading" mx-auto w-full max-w-700px>
      <c-file-upload
        :title="$t('tools.pdf-text-extractor.uploadTitle', '将 PDF 文件拖拽至此处，或点击浏览选择')"
        :button-text="$t('tools.pdf-text-extractor.browseFiles', '浏览选择 PDF')"
        accept=".pdf"
        @file-upload="onFileUpload"
      />
    </div>

    <!-- 解析加载中动画 -->
    <div v-if="isLoading" py-12 text-center>
      <n-spin size="large" description="正在提取 PDF 纯文本与元数据信息，请稍候..." />
    </div>

    <!-- 解析结果展示区 -->
    <div v-if="extractResult" flex flex-col gap-4>
      <!-- 顶栏快捷操作与概要 -->
      <n-card :bordered="true" size="small" class="action-card">
        <div flex flex-col gap-2.5>
          <!-- 第一行：文件名与统计标签，水平居中对齐 -->
          <div flex flex-wrap items-center justify-center gap-2.5>
            <div flex items-center gap-1.5 overflow-hidden>
              <n-icon size="18" class="text-primary flex-shrink-0" :component="FileText" />
              <span font-bold text-sm truncate max-w-320px>{{ file?.name }}</span>
            </div>

            <div flex items-center gap-2 flex-shrink-0>
              <n-tag size="small" type="info" round :bordered="false">
                {{ extractResult.metadata.pageCount }} 页
              </n-tag>
              <n-tag size="small" type="success" round :bordered="false">
                {{ extractResult.totalChars }} 字符
              </n-tag>
              <n-tag size="small" type="warning" round :bordered="false">
                {{ extractResult.totalWords }} 词
              </n-tag>
            </div>
          </div>

          <!-- 第二行：操作按钮组，整行水平居中对齐 -->
          <div flex flex-wrap items-center justify-center gap-2 pt-1 class="action-buttons-bar">
            <n-button size="small" secondary @click="showMetadata = !showMetadata">
              <template #icon>
                <n-icon :component="showMetadata ? ChevronUp : ChevronDown" />
              </template>
              {{ showMetadata ? '收起文档元数据' : '展开文档元数据' }}
            </n-button>
            <n-button size="small" type="primary" secondary @click="copyAllText">
              <template #icon>
                <n-icon :component="Copy" />
              </template>
              复制全文
            </n-button>
            <n-button size="small" type="info" secondary @click="downloadTextFile">
              <template #icon>
                <n-icon :component="Download" />
              </template>
              导出纯文本
            </n-button>
            <n-button size="small" secondary type="error" @click="onClear">
              <template #icon>
                <n-icon :component="Refresh" />
              </template>
              重新选择
            </n-button>
          </div>
        </div>
      </n-card>

      <!-- 文档元数据面板 -->
      <n-collapse-transition :show="showMetadata">
        <n-card title="文档属性与元数据信息" size="small" :bordered="true">
          <n-grid cols="1 s:2 m:3 l:4" :x-gap="16" :y-gap="12">
            <n-grid-item>
              <div class="meta-label">
                文档标题
              </div>
              <div class="meta-value">
                {{ extractResult.metadata.title }}
              </div>
            </n-grid-item>
            <n-grid-item>
              <div class="meta-label">
                文档作者
              </div>
              <div class="meta-value">
                {{ extractResult.metadata.author }}
              </div>
            </n-grid-item>
            <n-grid-item>
              <div class="meta-label">
                文档主题
              </div>
              <div class="meta-value">
                {{ extractResult.metadata.subject }}
              </div>
            </n-grid-item>
            <n-grid-item>
              <div class="meta-label">
                规范格式版本
              </div>
              <div class="meta-value">
                {{ extractResult.metadata.pdfVersion }}
              </div>
            </n-grid-item>
            <n-grid-item>
              <div class="meta-label">
                创建程序
              </div>
              <div class="meta-value">
                {{ extractResult.metadata.creator }}
              </div>
            </n-grid-item>
            <n-grid-item>
              <div class="meta-label">
                制作工具
              </div>
              <div class="meta-value">
                {{ extractResult.metadata.producer }}
              </div>
            </n-grid-item>
            <n-grid-item>
              <div class="meta-label">
                创建时间
              </div>
              <div class="meta-value">
                {{ extractResult.metadata.creationDate }}
              </div>
            </n-grid-item>
            <n-grid-item>
              <div class="meta-label">
                修改时间
              </div>
              <div class="meta-value">
                {{ extractResult.metadata.modificationDate }}
              </div>
            </n-grid-item>
            <n-grid-item>
              <div class="meta-label">
                页面规格尺寸
              </div>
              <div class="meta-value">
                {{ extractResult.metadata.pageDimensions }}
              </div>
            </n-grid-item>
            <n-grid-item>
              <div class="meta-label">
                文档关键字
              </div>
              <div class="meta-value">
                {{ extractResult.metadata.keywords }}
              </div>
            </n-grid-item>
          </n-grid>
        </n-card>
      </n-collapse-transition>

      <!-- 搜索与浏览视图控制 -->
      <n-card size="small" :bordered="true">
        <div flex flex-wrap items-center justify-between gap-3>
          <div flex flex-1 items-center gap-3 style="min-width: 240px; max-width: 480px">
            <n-input
              v-model:value="searchQuery"
              placeholder="搜索页面关键字或输入页码..."
              clearable
              size="small"
            >
              <template #prefix>
                <n-icon :component="Search" class="text-gray-400" />
              </template>
            </n-input>
            <span v-if="searchQuery" class="text-xs text-gray-500 whitespace-nowrap">
              匹配 {{ filteredPages.length }} / {{ extractResult.pages.length }} 页
            </span>
          </div>

          <div flex items-center gap-2>
            <n-radio-group v-model:value="viewMode" size="small">
              <n-radio-button value="tabs">
                单页聚焦
              </n-radio-button>
              <n-radio-button value="all">
                平铺全文
              </n-radio-button>
            </n-radio-group>
          </div>
        </div>
      </n-card>

      <!-- 单页聚焦视图 -->
      <div v-if="viewMode === 'tabs' && activePageItem" flex flex-col gap-3>
        <!-- 分页控制按钮组 -->
        <div flex flex-wrap items-center justify-between gap-2>
          <n-pagination
            v-model:page="currentPage"
            :page-count="filteredPages.length"
            size="small"
            show-quick-jumper
          />
          <n-button size="small" secondary type="primary" @click="copyPageText(activePageItem)">
            <template #icon>
              <n-icon :component="Copy" />
            </template>
            复制本页文本 (第 {{ activePageItem.pageNumber }} 页)
          </n-button>
        </div>

        <n-card size="small" :bordered="true" class="page-content-card">
          <div mb-2 flex items-center justify-between text-xs text-gray-400>
            <span>页面规格尺寸：{{ activePageItem.width }} × {{ activePageItem.height }} 点</span>
            <span>字符数：{{ activePageItem.charCount }} 字 · 词数：{{ activePageItem.wordCount }} 词</span>
          </div>
          <n-input
            :value="activePageItem.text"
            type="textarea"
            :rows="18"
            readonly
            class="text-content-box"
            placeholder="本页无文本内容（可能为纯图像扫描页）"
          />
        </n-card>
      </div>

      <!-- 平铺全文模式 -->
      <div v-else-if="viewMode === 'all'" flex flex-col gap-4>
        <div v-for="page of filteredPages" :key="page.pageNumber">
          <n-card size="small" :bordered="true" class="page-content-card">
            <template #header>
              <div flex items-center justify-between>
                <span font-bold>第 {{ page.pageNumber }} 页</span>
                <div flex items-center gap-3>
                  <span text-xs text-gray-400>{{ page.charCount }} 字符 · {{ page.wordCount }} 词</span>
                  <n-button size="tiny" secondary type="primary" @click="copyPageText(page)">
                    <template #icon>
                      <n-icon :component="Copy" />
                    </template>
                    复制此页
                  </n-button>
                </div>
              </div>
            </template>
            <n-input
              :value="page.text"
              type="textarea"
              :autosize="{ minRows: 4, maxRows: 16 }"
              readonly
              class="text-content-box"
              placeholder="本页无文本内容"
            />
          </n-card>
        </div>
      </div>

      <!-- 无搜索匹配结果 -->
      <div v-if="filteredPages.length === 0" py-12 text-center text-gray-400>
        <n-icon size="48" class="mx-auto mb-2 text-gray-400" :component="Search" />
        <div>未找到包含 “{{ searchQuery }}” 的页面内容</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.meta-label {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin-bottom: 2px;
}

.meta-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--n-text-color);
  word-break: break-all;
}

.text-content-box :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.65;
}
</style>
