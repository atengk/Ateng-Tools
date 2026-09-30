<script setup lang="ts">
/**
 * 图片转 PDF 工具视图组件
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { useMessage } from 'naive-ui';
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileText,
  Photo,
  Plus,
  Refresh,
  Trash,
} from '@vicons/tabler';
import { convertImagesToPdf, isJpegBytes } from './image-to-pdf.service';
import type { ImageSourceItem, ImageToPdfOptions, PageFormat, PageMargin, PageOrientation } from './image-to-pdf.types';
import { formatBytes } from '@/utils/convert';

const message = useMessage();

const imageList = ref<ImageSourceItem[]>([]);
const isProcessing = ref(false);
const customFileName = ref('');

// 排版参数配置
const pageFormat = ref<PageFormat>('a4');
const pageOrientation = ref<PageOrientation>('auto');
const pageMargin = ref<PageMargin>('none');

const appendFileInputRef = ref<HTMLInputElement | null>(null);

/**
 * 纸张规格选项
 */
const formatOptions = [
  { label: 'A4 标准纸张 (210 × 297 mm)', value: 'a4' },
  { label: 'A3 大型纸张 (297 × 420 mm)', value: 'a3' },
  { label: 'Letter 美规信纸 (8.5 × 11 inch)', value: 'letter' },
  { label: '自适应单图原始尺寸 (Fit to Image)', value: 'fit' },
];

/**
 * 纸张方向选项
 */
const orientationOptions = [
  { label: '自动识别 (根据图片宽高比)', value: 'auto' },
  { label: '纵向排版 (Portrait)', value: 'portrait' },
  { label: '横向排版 (Landscape)', value: 'landscape' },
];

/**
 * 页边距选项
 */
const marginOptions = [
  { label: '无边距 (0 mm 铺满页面)', value: 'none' },
  { label: '窄边距 (10 mm 留白)', value: 'small' },
  { label: '适中边距 (20 mm 呼吸感)', value: 'normal' },
];

/**
 * 辅助：通过离屏 Canvas 将非 JPG/PNG 图片转为 PNG 字节
 */
function convertToPngBytes(file: File): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 渲染上下文初始化失败'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('图片格式转换失败'));
          return;
        }
        blob.arrayBuffer().then((buf) => {
          resolve({
            bytes: new Uint8Array(buf),
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        });
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`无法解码图片：${file.name}`));
    };
    img.src = url;
  });
}

/**
 * 获取图片像素宽高
 */
function getImageDimensions(bytes: Uint8Array, mimeType: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 800, height: 600 });
    };
    img.src = url;
  });
}

/**
 * 解析并封装单张文件
 */
async function processSingleFile(file: File): Promise<ImageSourceItem> {
  const buffer = await file.arrayBuffer();
  let bytes = new Uint8Array(buffer);
  let type = file.type;
  let width = 0;
  let height = 0;

  const isJpeg = isJpegBytes(bytes);
  const isPng = type === 'image/png' || (!isJpeg && file.name.toLowerCase().endsWith('.png'));

  if (!isJpeg && !isPng) {
    // 转换为 PNG 字节
    const converted = await convertToPngBytes(file);
    bytes = converted.bytes;
    type = 'image/png';
    width = converted.width;
    height = converted.height;
  }
  else {
    const dim = await getImageDimensions(bytes, type || 'image/png');
    width = dim.width;
    height = dim.height;
  }

  const previewBlob = new Blob([bytes], { type });
  const previewUrl = URL.createObjectURL(previewBlob);

  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    bytes,
    name: file.name,
    type,
    previewUrl,
    size: file.size,
    width,
    height,
  };
}

/**
 * 批量添加图片文件列表
 */
async function addFiles(files: FileList | File[]) {
  const fileArray = Array.from(files).filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name));
  if (fileArray.length === 0) {
    message.warning('请选择受支持的图片文件（JPG, PNG, WebP, GIF 等）');
    return;
  }

  isProcessing.value = true;
  try {
    const parsedList: ImageSourceItem[] = [];
    for (const f of fileArray) {
      const item = await processSingleFile(f);
      parsedList.push(item);
    }
    imageList.value.push(...parsedList);
    message.success(`成功载入 ${parsedList.length} 张图片`);
  }
  catch (err: any) {
    message.error(err?.message || '图片载入失败');
  }
  finally {
    isProcessing.value = false;
  }
}

/**
 * 文件拖拽或选择器触发
 */
function onInitialFilesUpload(file: File) {
  addFiles([file]);
}

/**
 * 追加图片输入变更
 */
function onAppendInputChanged(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    addFiles(target.files);
    target.value = '';
  }
}

function triggerAppendFileDialog() {
  appendFileInputRef.value?.click();
}

/**
 * 图片项排序：上移
 */
function moveUp(index: number) {
  if (index <= 0) {
    return;
  }
  const temp = imageList.value[index];
  imageList.value[index] = imageList.value[index - 1];
  imageList.value[index - 1] = temp;
}

/**
 * 图片项排序：下移
 */
function moveDown(index: number) {
  if (index >= imageList.value.length - 1) {
    return;
  }
  const temp = imageList.value[index];
  imageList.value[index] = imageList.value[index + 1];
  imageList.value[index + 1] = temp;
}

/**
 * 移除指定图片
 */
function removeItem(index: number) {
  const item = imageList.value[index];
  if (item?.previewUrl) {
    URL.revokeObjectURL(item.previewUrl);
  }
  imageList.value.splice(index, 1);
}

/**
 * 清空全部图片
 */
function clearAll() {
  for (const item of imageList.value) {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }
  imageList.value = [];
}

/**
 * 开始合成并下载 PDF
 */
async function handleGeneratePdf() {
  if (imageList.value.length === 0) {
    message.warning('请先添加至少一张图片');
    return;
  }

  isProcessing.value = true;
  try {
    const options: ImageToPdfOptions = {
      format: pageFormat.value,
      orientation: pageOrientation.value,
      margin: pageMargin.value,
      customFileName: customFileName.value.trim() || '图片合成文档',
    };

    const result = await convertImagesToPdf(imageList.value, options);

    // 触发下载
    const blob = new Blob([result.bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.fileName;
    anchor.click();
    URL.revokeObjectURL(url);

    message.success(`PDF 合成成功！共生成 ${result.pageCount} 页文档，已开始自动下载`);
  }
  catch (err: any) {
    message.error(err?.message || 'PDF 合成失败，请检查图片内容');
  }
  finally {
    isProcessing.value = false;
  }
}

onUnmounted(() => {
  clearAll();
});
</script>

<template>
  <div class="image-to-pdf-container" flex flex-col gap-4>
    <!-- 隐藏的文件追加输入框 -->
    <input
      ref="appendFileInputRef"
      type="file"
      multiple
      accept="image/*"
      style="display: none"
      @change="onAppendInputChanged"
    >

    <!-- 初始上传区域 -->
    <div v-if="imageList.length === 0 && !isProcessing" mx-auto w-full max-w-650px py-2>
      <c-file-upload
        title="将单张或多张图片拖拽至此处，或点击浏览选择"
        button-text="选择待合成的图片"
        accept="image/*"
        @file-upload="onInitialFilesUpload"
      />
    </div>

    <!-- 处理中等待遮罩 -->
    <div v-if="isProcessing" py-12 text-center>
      <n-spin size="large" description="正在处理并合成多页 PDF 文档，请稍候..." />
    </div>

    <!-- 图片工作台内容区 -->
    <div v-if="imageList.length > 0 && !isProcessing" flex flex-col gap-4>
      <!-- 顶栏概览与操作卡片 (严格水平居中) -->
      <n-card :bordered="true" size="small">
        <div flex flex-col gap-2.5>
          <!-- 第一行：状态统计标签与概览 -->
          <div flex flex-wrap items-center justify-center gap-3 text-center>
            <div flex items-center gap-1.5>
              <n-icon size="18" class="text-primary flex-shrink-0" :component="Photo" />
              <span font-bold text-sm>已载入图片队列</span>
            </div>

            <div flex items-center gap-2 flex-shrink-0>
              <n-tag size="small" type="info" round :bordered="false">
                共 {{ imageList.length }} 张图片
              </n-tag>
              <n-tag size="small" type="success" round :bordered="false">
                预估 {{ imageList.length }} 页文档
              </n-tag>
            </div>
          </div>

          <!-- 第二行：操作快捷按钮组 (水平居中) -->
          <div flex flex-wrap items-center justify-center gap-2.5 pt-1>
            <n-button type="primary" secondary @click="handleGeneratePdf">
              <template #icon>
                <n-icon :component="Download" />
              </template>
              开始合成并下载 PDF
            </n-button>

            <n-button secondary type="info" @click="triggerAppendFileDialog">
              <template #icon>
                <n-icon :component="Plus" />
              </template>
              追加添加图片
            </n-button>

            <n-button secondary type="error" @click="clearAll">
              <template #icon>
                <n-icon :component="Refresh" />
              </template>
              清空全部
            </n-button>
          </div>
        </div>
      </n-card>

      <!-- 排版规格配置面板 -->
      <n-card title="页面排版规格配置" size="small" :bordered="true">
        <n-grid cols="1 m:3" :x-gap="16" :y-gap="12">
          <n-grid-item>
            <div class="config-label">
              纸张规格尺寸
            </div>
            <n-select v-model:value="pageFormat" size="small" :options="formatOptions" />
          </n-grid-item>

          <n-grid-item>
            <div class="config-label">
              页面纸张方向
            </div>
            <n-select v-model:value="pageOrientation" size="small" :options="orientationOptions" />
          </n-grid-item>

          <n-grid-item>
            <div class="config-label">
              页面边距留白
            </div>
            <n-select v-model:value="pageMargin" size="small" :options="marginOptions" />
          </n-grid-item>
        </n-grid>

        <div mt-3 flex items-center gap-3>
          <span text-xs class="text-gray-500 whitespace-nowrap">自定义导出文件名：</span>
          <n-input
            v-model:value="customFileName"
            placeholder="留空默认：图片合成文档.pdf"
            size="small"
            clearable
            style="max-width: 320px"
          >
            <template #prefix>
              <n-icon :component="FileText" class="text-gray-400" />
            </template>
          </n-input>
        </div>
      </n-card>

      <!-- 图片顺序排列与管理列表 -->
      <n-card title="已选图片排序与顺序编排" size="small" :bordered="true">
        <div flex flex-col gap-2.5>
          <div
            v-for="(item, index) in imageList"
            :key="item.id"
            class="image-item-row"
            flex
            items-center
            justify-between
            p-2
            rounded
            border
            border-gray-200
            dark:border-gray-700
          >
            <!-- 缩略图与序号信息 -->
            <div flex items-center gap-3 overflow-hidden>
              <div class="page-index-badge">
                {{ index + 1 }}
              </div>
              <img
                :src="item.previewUrl"
                alt="thumbnail"
                class="thumb-img"
              >
              <div flex flex-col overflow-hidden>
                <span font-bold text-xs truncate max-w-260px>{{ item.name }}</span>
                <span text-11px class="text-gray-400">
                  {{ item.width }} × {{ item.height }} 像素 · {{ formatBytes(item.size || 0) }}
                </span>
              </div>
            </div>

            <!-- 排序与管理操作组 (图标按钮居中) -->
            <div flex items-center gap-1 flex-shrink-0>
              <n-button
                size="tiny"
                quaternary
                :disabled="index === 0"
                @click="moveUp(index)"
              >
                <template #icon>
                  <n-icon :component="ArrowUp" />
                </template>
                上移
              </n-button>

              <n-button
                size="tiny"
                quaternary
                :disabled="index === imageList.length - 1"
                @click="moveDown(index)"
              >
                <template #icon>
                  <n-icon :component="ArrowDown" />
                </template>
                下移
              </n-button>

              <n-button
                size="tiny"
                quaternary
                type="error"
                @click="removeItem(index)"
              >
                <template #icon>
                  <n-icon :component="Trash" />
                </template>
                删除
              </n-button>
            </div>
          </div>
        </div>
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

.image-item-row {
  background-color: var(--n-color);
  transition: background-color 0.2s;
}

.page-index-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: bold;
  background-color: var(--n-color-embedded);
  color: var(--n-text-color-2);
  flex-shrink: 0;
}

.thumb-img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--n-border-color);
  flex-shrink: 0;
}
</style>
