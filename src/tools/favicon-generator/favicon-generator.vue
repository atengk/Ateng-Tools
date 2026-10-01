<script setup lang="ts">
/**
 * Favicon 网站图标全套打包器视图组件
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { strToU8 } from 'fflate';
import {
  AppWindow,
  Copy,
  Download,
  FileZip,
  Photo,
  Wand,
} from '@vicons/tabler';
import type { GeneratedIconItem } from './favicon-generator.types';
import {
  FAVICON_SPECS,
  createFaviconZipArchive,
  createIcoFile,
  dataUrlToUint8Array,
  generateHtmlHeadSnippet,
  generateWebManifest,
} from './favicon-generator.service';
import { useCopy } from '@/composable/copy';

const message = useMessage();
const { copy } = useCopy({ createToast: false });

// 1. 响应式表单状态
const appName = ref('我的应用');
const shortName = ref('应用');
const themeColor = ref('#18a058');
const backgroundColor = ref('#ffffff');
const fillAppleBackground = ref(false);

const sourceImageSrc = ref<string>('');
const isProcessing = ref(false);
const icons = ref<GeneratedIconItem[]>([]);
const icoBytes = ref<Uint8Array | null>(null);

// 2. 生成 HTML 标签代码与 Manifest 清单文本
const htmlSnippet = computed(() => generateHtmlHeadSnippet());
const webManifestContent = computed(() =>
  generateWebManifest({
    appName: appName.value,
    shortName: shortName.value,
    themeColor: themeColor.value,
    backgroundColor: backgroundColor.value,
  }),
);

// 3. 处理图片重采样与切图生成
function processImage(dataUrl: string) {
  isProcessing.value = true;
  const img = new Image();

  img.onload = () => {
    try {
      const generatedList: GeneratedIconItem[] = [];

      for (const spec of FAVICON_SPECS) {
        const canvas = document.createElement('canvas');
        canvas.width = spec.width;
        canvas.height = spec.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Apple Touch Icon 填充可选背景色（iOS 默认黑色底）
        if (spec.fileName === 'apple-touch-icon.png' && fillAppleBackground.value) {
          ctx.fillStyle = backgroundColor.value;
          ctx.fillRect(0, 0, spec.width, spec.height);
        }

        // 保持比例居中绘制
        const scale = Math.min(spec.width / img.width, spec.height / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const drawX = (spec.width - drawW) / 2;
        const drawY = (spec.height - drawH) / 2;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        const outDataUrl = canvas.toDataURL('image/png');
        const bytes = dataUrlToUint8Array(outDataUrl);

        generatedList.push({
          fileName: spec.fileName,
          width: spec.width,
          height: spec.height,
          description: spec.description,
          dataUrl: outDataUrl,
          bytes,
        });
      }

      icons.value = generatedList;

      // 封装 16x16, 32x32, 48x48 多层 ICO 文件
      const icoImages = generatedList
        .filter(item => [16, 32, 48].includes(item.width))
        .map(item => ({ width: item.width, height: item.height, pngBytes: item.bytes }));

      if (icoImages.length > 0) {
        icoBytes.value = createIcoFile(icoImages);
      }
    }
    catch (err: any) {
      message.error(`生成图标失败: ${err.message || '未知错误'}`);
    }
    finally {
      isProcessing.value = false;
    }
  };

  img.onerror = () => {
    isProcessing.value = false;
    message.error('无法解析所选图片文件，请重试');
  };

  img.src = dataUrl;
}

// 4. 上传与示例加载
function handleFileUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    message.error('请上传有效的图像文件 (PNG / JPG / SVG / WebP 等)');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    sourceImageSrc.value = dataUrl;
    processImage(dataUrl);
    message.success(`已载入图片: ${file.name}`);
  };
  reader.readAsDataURL(file);
}

// 自动生成一张精美的品牌矢量示例图
function loadSampleImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. 渐变圆角底图
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#10b981');
  grad.addColorStop(1, '#0284c7');
  ctx.fillStyle = grad;

  // 绘制圆角矩形
  const r = 96;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(512 - r, 0);
  ctx.quadraticCurveTo(512, 0, 512, r);
  ctx.lineTo(512, 512 - r);
  ctx.quadraticCurveTo(512, 512, 512 - r, 512);
  ctx.lineTo(r, 512);
  ctx.quadraticCurveTo(0, 512, 0, 512 - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // 2. 居中字母标志
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 240px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', 256, 266);

  const sampleUrl = canvas.toDataURL('image/png');
  sourceImageSrc.value = sampleUrl;
  processImage(sampleUrl);
  message.success('已载入预设示例图标');
}

// 切换背景填充选项时重新生成
watch(fillAppleBackground, () => {
  if (sourceImageSrc.value) {
    processImage(sourceImageSrc.value);
  }
});

onMounted(() => {
  loadSampleImage();
});

// 5. 下载动作处理
function downloadIcon(item: GeneratedIconItem) {
  const a = document.createElement('a');
  a.download = item.fileName;
  a.href = item.dataUrl;
  a.click();
  message.success(`已开始下载 ${item.fileName}`);
}

function downloadIco() {
  if (!icoBytes.value) {
    message.warning('请先上传图片生成图标');
    return;
  }
  const blob = new Blob([icoBytes.value], { type: 'image/x-icon' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = 'favicon.ico';
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
  message.success('多分辨率 favicon.ico 已开始下载');
}

function downloadAllZip() {
  if (icons.value.length === 0 || !icoBytes.value) {
    message.warning('尚未生成图标，请先上传图片');
    return;
  }

  // 1. 收集所有图标二进制数据
  const files: Record<string, Uint8Array> = {};
  files['favicon.ico'] = icoBytes.value;

  for (const item of icons.value) {
    files[item.fileName] = item.bytes;
  }

  // 2. 组装 Web Manifest 与使用说明
  files['site.webmanifest'] = strToU8(webManifestContent.value);

  const readme = [
    '=== Ateng-Tools Favicon 网站图标全套资源包 ===',
    '',
    '【目录包含文件】',
    '1. favicon.ico: 多分辨率 Windows/桌面浏览器图标 (包含 16x16, 32x32, 48x48)',
    '2. favicon-16x16.png / favicon-32x32.png / favicon-48x48.png: 浏览器标签与任务栏高清 PNG',
    '3. apple-touch-icon.png (180x180): iOS/iPadOS Safari 桌面书签图标',
    '4. android-chrome-192x192.png / android-chrome-512x512.png: PWA 移动端与应用商店图标',
    '5. site.webmanifest: PWA 渐进式应用清单文件',
    '',
    '【部署指引】',
    '1. 将解压出的所有文件上传至网站部署根目录 (与 index.html 同级)。',
    '2. 在网站 HTML <head> 区域粘贴以下引入代码：',
    '',
    htmlSnippet.value,
    '',
  ].join('\n');

  files['README.txt'] = strToU8(readme);

  // 3. 打包并触发下载
  const zipBytes = createFaviconZipArchive(files);
  const blob = new Blob([zipBytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = 'favicon-package.zip';
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
  message.success('Favicon 全套打包资源已开始下载 (ZIP)');
}

function handleCopyHtml() {
  copy(htmlSnippet.value);
  message.success('已复制 HTML <head> 引用代码');
}

function handleCopyManifest() {
  copy(webManifestContent.value);
  message.success('已复制 site.webmanifest 清单内容');
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶部上传与参数设置区 -->
    <n-grid cols="1 s:1 m:3" responsive="screen" :x-gap="16" :y-gap="16">
      <!-- 图像上传卡片 -->
      <n-gi :span="2">
        <n-card title="选择原始图标源文件" size="small" hoverable class="h-full">
          <c-file-upload
            accept="image/*"
            title="将图标图片拖拽至此处，或点击浏览本地文件"
            button-text="选择图片文件"
            @file-upload="handleFileUpload"
          />
          <div class="mt-3 flex items-center justify-between">
            <span class="text-xs text-gray-500">
              推荐上传至少 512×512 像素的清晰方形图片 (PNG、JPG、SVG 或 WebP)
            </span>
            <n-button secondary size="small" @click="loadSampleImage">
              <template #icon>
                <n-icon :component="Wand" />
              </template>
              重置示例图片
            </n-button>
          </div>
        </n-card>
      </n-gi>

      <!-- PWA 与配置参数 -->
      <n-gi>
        <n-card title="网站与清单配置" size="small" hoverable>
          <n-form label-placement="left" label-width="90" :show-feedback="false" class="space-y-2">
            <n-form-item label="应用全称">
              <n-input v-model:value="appName" placeholder="例如：我的应用" />
            </n-form-item>
            <n-form-item label="应用简称">
              <n-input v-model:value="shortName" placeholder="例如：应用" />
            </n-form-item>
            <n-form-item label="主题色">
              <n-color-picker v-model:value="themeColor" :modes="['hex']" :show-alpha="false" />
            </n-form-item>
            <n-form-item label="背景色">
              <n-color-picker v-model:value="backgroundColor" :modes="['hex']" :show-alpha="false" />
            </n-form-item>
            <n-form-item label="Apple 图标">
              <n-checkbox v-model:checked="fillAppleBackground">
                填充实体背景色 (防 iOS 黑底)
              </n-checkbox>
            </n-form-item>
          </n-form>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 核心操作按钮栏统一居中排布 -->
    <div class="flex flex-wrap items-center justify-center gap-4 py-2">
      <n-button
        type="primary"
        size="large"
        :disabled="icons.length === 0 || isProcessing"
        @click="downloadAllZip"
      >
        <template #icon>
          <n-icon :component="FileZip" />
        </template>
        打包下载全套 Favicon 资源包 (.zip)
      </n-button>

      <n-button
        secondary
        type="info"
        size="large"
        :disabled="!icoBytes || isProcessing"
        @click="downloadIco"
      >
        <template #icon>
          <n-icon :component="AppWindow" />
        </template>
        仅下载 favicon.ico (多尺寸集成)
      </n-button>
    </div>

    <!-- 图标规格实时渲染画廊 -->
    <n-card title="多平台规格预览与单图提取" size="small">
      <div v-if="isProcessing" class="py-12 text-center text-gray-500">
        正在重采样并生成各尺寸图标...
      </div>
      <n-grid v-else cols="2 s:3 m:6" responsive="screen" :x-gap="12" :y-gap="12">
        <n-gi v-for="item in icons" :key="item.fileName">
          <div class="p-3 border rounded-lg border-gray-200 dark:border-gray-800 flex flex-col items-center justify-between h-full bg-gray-50/50 dark:bg-gray-900/50">
            <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center mb-2">
              {{ item.width }} × {{ item.height }}
            </div>

            <!-- 图标棋盘格背景展示 -->
            <div
              class="w-20 h-20 flex items-center justify-center rounded border border-gray-300 dark:border-gray-700 p-1 mb-2"
              :style="{ background: 'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%) 50% / 12px 12px' }"
            >
              <img
                :src="item.dataUrl"
                :alt="item.fileName"
                class="max-w-full max-h-full object-contain"
              >
            </div>

            <div class="text-center w-full mb-3">
              <div class="text-[11px] font-mono text-gray-600 dark:text-gray-400 truncate" :title="item.fileName">
                {{ item.fileName }}
              </div>
              <div class="text-[11px] text-gray-400 truncate mt-0.5" :title="item.description">
                {{ item.description }}
              </div>
            </div>

            <n-button size="tiny" secondary block @click="downloadIcon(item)">
              <template #icon>
                <n-icon :component="Download" />
              </template>
              下载单图
            </n-button>
          </div>
        </n-gi>
      </n-grid>
    </n-card>

    <!-- 部署代码与 Manifest 清单导出 -->
    <n-grid cols="1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
      <n-gi>
        <n-card title="HTML 引入代码 (<head>)" size="small" class="h-full">
          <template #header-extra>
            <n-button text type="primary" size="small" @click="handleCopyHtml">
              <template #icon>
                <n-icon :component="Copy" />
              </template>
              复制代码
            </n-button>
          </template>
          <pre class="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed text-gray-800 dark:text-gray-200">{{ htmlSnippet }}</pre>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card title="PWA 清单 (site.webmanifest)" size="small" class="h-full">
          <template #header-extra>
            <n-button text type="primary" size="small" @click="handleCopyManifest">
              <template #icon>
                <n-icon :component="Copy" />
              </template>
              复制清单
            </n-button>
          </template>
          <pre class="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed text-gray-800 dark:text-gray-200">{{ webManifestContent }}</pre>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>
