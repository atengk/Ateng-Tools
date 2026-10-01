<script setup lang="ts">
/**
 * HAR 网络抓包日志离线分析器视图层组件
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { computed, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  ChartBar,
  ClearAll,
  Clock,
  Copy,
  Download,
  Eye,
  FileCode,
  Filter,
  Search,
  Upload,
  Wand,
  World,
} from '@vicons/tabler';
import type {
  HarFilterOptions,
  HarResourceType,
  ParsedHarEntry,
} from './har-analyzer.types';
import {
  filterHarEntries,
  formatBytes,
  formatDurationMs,
  parseHarJson,
} from './har-analyzer.service';
import { useCopy } from '@/composable/copy';

const message = useMessage();

// 1. 响应式状态
const rawHarJson = ref<string>('');
const isDragOver = ref(false);
const fileInputRef = ref<HTMLInputElement>();
const selectedEntry = ref<ParsedHarEntry | null>(null);
const showDetailDrawer = ref(false);

// 过滤控制状态
const filterOptions = ref<HarFilterOptions>({
  keyword: '',
  resourceType: 'all',
  statusGroup: 'all',
  method: 'ALL',
});

// 2. 内置典型 HAR 模拟数据 (供用户一键尝鲜)
function generateSampleHarJson(): string {
  const baseTime = new Date('2026-10-01T09:30:00.000Z').getTime();
  return JSON.stringify({
    log: {
      version: '1.2',
      creator: { name: 'Ateng-Tools HAR Generator', version: '1.0.0' },
      pages: [{ startedDateTime: new Date(baseTime).toISOString(), id: 'page_1', title: 'Ateng-Tools Home' }],
      entries: [
        {
          startedDateTime: new Date(baseTime).toISOString(),
          time: 120,
          request: {
            method: 'GET',
            url: 'https://tools.ateng.local/',
            headers: [
              { name: 'Host', value: 'tools.ateng.local' },
              { name: 'User-Agent', value: 'Mozilla/5.0 Chrome/128.0' },
              { name: 'Accept', value: 'text/html,application/xhtml+xml' },
            ],
          },
          response: {
            status: 200,
            statusText: 'OK',
            headers: [
              { name: 'Content-Type', value: 'text/html; charset=utf-8' },
              { name: 'Cache-Control', value: 'max-age=3600' },
            ],
            content: { size: 14200, mimeType: 'text/html', text: '<!DOCTYPE html><html><head><title>Ateng-Tools</title></head><body><h1>Ateng-Tools 开发者工具箱</h1></body></html>' },
            bodySize: 14200,
          },
          timings: { blocked: 5, dns: 15, connect: 25, ssl: 20, send: 5, wait: 35, receive: 15 },
        },
        {
          startedDateTime: new Date(baseTime + 60).toISOString(),
          time: 85,
          request: {
            method: 'GET',
            url: 'https://tools.ateng.local/assets/main.js',
            headers: [{ name: 'Accept', value: '*/*' }],
          },
          response: {
            status: 200,
            statusText: 'OK',
            headers: [{ name: 'Content-Type', value: 'application/javascript' }],
            content: { size: 124500, mimeType: 'application/javascript', text: '// Ateng-Tools Application Bundle\nconsole.log("Loaded");' },
            bodySize: 45000,
            _transferSize: 45000,
          },
          timings: { blocked: 2, dns: 0, connect: 0, send: 3, wait: 20, receive: 60 },
        },
        {
          startedDateTime: new Date(baseTime + 90).toISOString(),
          time: 45,
          request: {
            method: 'GET',
            url: 'https://tools.ateng.local/assets/style.css',
            headers: [{ name: 'Accept', value: 'text/css' }],
          },
          response: {
            status: 200,
            statusText: 'OK',
            headers: [{ name: 'Content-Type', value: 'text/css' }],
            content: { size: 32000, mimeType: 'text/css', text: ':root { --primary-color: #2563eb; }' },
            bodySize: 12000,
          },
          timings: { blocked: 1, dns: 0, connect: 0, send: 2, wait: 12, receive: 30 },
        },
        {
          startedDateTime: new Date(baseTime + 180).toISOString(),
          time: 210,
          request: {
            method: 'POST',
            url: 'https://api.ateng.local/v1/auth/login',
            headers: [
              { name: 'Content-Type', value: 'application/json' },
              { name: 'Accept', value: 'application/json' },
            ],
            postData: {
              mimeType: 'application/json',
              text: JSON.stringify({ username: 'developer@ateng.local', grantType: 'password' }),
            },
          },
          response: {
            status: 200,
            statusText: 'OK',
            headers: [{ name: 'Content-Type', value: 'application/json' }],
            content: {
              size: 512,
              mimeType: 'application/json',
              text: JSON.stringify({ code: 0, message: 'success', data: { token: 'jwt-header.payload.signature', expiresIn: 7200 } }, null, 2),
            },
            bodySize: 512,
          },
          timings: { blocked: 10, dns: 20, connect: 40, ssl: 35, send: 5, wait: 90, receive: 10 },
        },
        {
          startedDateTime: new Date(baseTime + 220).toISOString(),
          time: 320,
          request: {
            method: 'GET',
            url: 'https://api.ateng.local/v1/user/profile?fields=id,name,role',
            queryString: [
              { name: 'fields', value: 'id,name,role' },
            ],
            headers: [
              { name: 'Authorization', value: 'Bearer jwt-header.payload.signature' },
            ],
          },
          response: {
            status: 401,
            statusText: 'Unauthorized',
            headers: [{ name: 'Content-Type', value: 'application/json' }],
            content: { size: 128, mimeType: 'application/json', text: '{"code": 401, "error": "Token has expired"}' },
            bodySize: 128,
          },
          timings: { blocked: 5, dns: 0, connect: 0, send: 5, wait: 300, receive: 10 },
        },
        {
          startedDateTime: new Date(baseTime + 280).toISOString(),
          time: 75,
          request: {
            method: 'GET',
            url: 'https://tools.ateng.local/logo.svg',
            headers: [],
          },
          response: {
            status: 304,
            statusText: 'Not Modified',
            headers: [{ name: 'ETag', value: '"w/392019"' }],
            content: { size: 0, mimeType: 'image/svg+xml' },
            bodySize: 0,
          },
          timings: { blocked: 1, wait: 70, receive: 4 },
        },
        {
          startedDateTime: new Date(baseTime + 320).toISOString(),
          time: 480,
          request: {
            method: 'POST',
            url: 'https://api.ateng.local/v1/analytics/report',
            headers: [{ name: 'Content-Type', value: 'application/json' }],
            postData: { mimeType: 'application/json', text: '{"events":[{"type":"pageview"}]}' },
          },
          response: {
            status: 500,
            statusText: 'Internal Server Error',
            headers: [{ name: 'Content-Type', value: 'application/json' }],
            content: { size: 210, mimeType: 'application/json', text: '{"error": "Database connection timeout"}' },
            bodySize: 210,
          },
          timings: { blocked: 2, send: 8, wait: 460, receive: 10 },
        },
      ],
    },
  });
}

// 3. 解析模型与汇总
const parseResult = computed(() => {
  if (!rawHarJson.value.trim()) return null;
  try {
    return parseHarJson(rawHarJson.value);
  } catch (err: any) {
    return { error: err.message || '解析 HAR 文件失败' };
  }
});

const isParsedSuccess = computed(() => {
  return parseResult.value && !('error' in parseResult.value);
});

const summary = computed(() => {
  if (!isParsedSuccess.value || !parseResult.value || 'error' in parseResult.value) return null;
  return parseResult.value.summary;
});

const allEntries = computed<ParsedHarEntry[]>(() => {
  if (!isParsedSuccess.value || !parseResult.value || 'error' in parseResult.value) return [];
  return parseResult.value.entries;
});

// 过滤后的请求列表
const filteredEntries = computed(() => {
  return filterHarEntries(allEntries.value, filterOptions.value);
});

// 4. 事件交互与文件读取
function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    rawHarJson.value = String(e.target?.result || '');
    message.success(`已成功加载抓包日志：${file.name}`);
  };
  reader.onerror = () => {
    message.error('读取文件失败');
  };
  reader.readAsText(file);
}

function handleDrop(event: DragEvent) {
  isDragOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    rawHarJson.value = String(e.target?.result || '');
    message.success(`已解析拖拽抓包文件：${file.name}`);
  };
  reader.readAsText(file);
}

function handleLoadSample() {
  rawHarJson.value = generateSampleHarJson();
  message.info('已加载典型 HAR 示例抓包数据');
}

function handleClear() {
  rawHarJson.value = '';
  selectedEntry.value = null;
  showDetailDrawer.value = false;
  filterOptions.value = {
    keyword: '',
    resourceType: 'all',
    statusGroup: 'all',
    method: 'ALL',
  };
}

function openDetail(entry: ParsedHarEntry) {
  selectedEntry.value = entry;
  showDetailDrawer.value = true;
}

function handleCopyText(text: string, tip: string) {
  const { copy } = useCopy({ source: ref(text), createToast: false });
  copy();
  message.success(tip);
}

// 辅助样式类
function getStatusTagType(status: number): 'success' | 'info' | 'warning' | 'error' | 'default' {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'info';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500) return 'error';
  return 'default';
}

function getMethodTagType(method: string): 'primary' | 'info' | 'success' | 'warning' | 'error' | 'default' {
  switch (method.toUpperCase()) {
    case 'GET': return 'info';
    case 'POST': return 'primary';
    case 'PUT': return 'warning';
    case 'DELETE': return 'error';
    case 'PATCH': return 'warning';
    default: return 'default';
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 1. 文件导入区域 (当尚未加载 HAR 时或折叠上传) -->
    <div
      v-if="!rawHarJson"
      class="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer bg-neutral-50/60 dark:bg-neutral-800/30"
      :class="isDragOver ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/10' : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-400'"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="handleDrop"
      @click="fileInputRef?.click()"
    >
      <input
        ref="fileInputRef"
        type="file"
        accept=".har,.json"
        class="hidden"
        @change="handleFileChange"
      />
      <div class="flex flex-col items-center justify-center gap-3">
        <div class="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
          <n-icon size="28" :component="Upload" />
        </div>
        <div>
          <div class="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            拖拽或点击上传浏览器导出的 .har 抓包归档文件
          </div>
          <div class="text-xs text-neutral-400 mt-1">
            支持 Chrome、Firefox、Edge 等浏览器 DevTools 导出的 HTTP Archive (HAR 1.2) 日志
          </div>
        </div>
        <div class="pt-2 flex items-center gap-3" @click.stop>
          <n-button type="primary" size="small" @click="fileInputRef?.click()">
            <template #icon>
              <n-icon :component="Upload" />
            </template>
            选择本地 HAR 文件
          </n-button>
          <n-button quaternary size="small" type="info" @click="handleLoadSample">
            <template #icon>
              <n-icon :component="Wand" />
            </template>
            体验示例抓包数据
          </n-button>
        </div>
      </div>
    </div>

    <!-- 解析错误提示 -->
    <n-alert v-else-if="parseResult && 'error' in parseResult" type="error" title="HAR 文件解析异常">
      {{ parseResult.error }}
      <div class="mt-3">
        <n-button size="small" @click="handleClear">重新选择文件</n-button>
      </div>
    </n-alert>

    <!-- 2. 已成功解析的主工作台 -->
    <template v-else-if="summary">
      <!-- 顶部控制条与统计仪表 -->
      <n-card size="small">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <n-icon size="20" class="text-blue-600" :component="World" />
            <span class="font-bold text-base text-neutral-800 dark:text-neutral-100">网络请求日志概览</span>
            <n-tag type="info" size="small" round>共 {{ summary.totalRequests }} 项请求</n-tag>
          </div>

          <div class="flex items-center gap-2">
            <n-button size="small" quaternary @click="fileInputRef?.click()">
              <template #icon><n-icon :component="Upload" /></template>
              切换文件
            </n-button>
            <input ref="fileInputRef" type="file" accept=".har,.json" class="hidden" @change="handleFileChange" />
            <n-button size="small" quaternary type="error" @click="handleClear">
              <template #icon><n-icon :component="ClearAll" /></template>
              清空
            </n-button>
          </div>
        </div>

        <n-divider class="!my-3" />

        <!-- 核心统计指标卡片 -->
        <n-grid cols="2 s:4" :x-gap="12" :y-gap="8">
          <n-gi>
            <div class="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 text-center border border-neutral-100 dark:border-neutral-700/50">
              <div class="text-xs text-neutral-400">总网络请求</div>
              <div class="text-lg font-bold text-neutral-700 dark:text-neutral-200 mt-0.5">
                {{ summary.totalRequests }}
              </div>
            </div>
          </n-gi>
          <n-gi>
            <div class="p-2.5 rounded-lg bg-blue-50/40 dark:bg-blue-900/10 text-center border border-blue-100 dark:border-blue-800/30">
              <div class="text-xs text-blue-600 dark:text-blue-400">传输传输体积</div>
              <div class="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {{ formatBytes(summary.totalTransferredBytes) }}
              </div>
            </div>
          </n-gi>
          <n-gi>
            <div class="p-2.5 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/20 text-center border border-indigo-100 dark:border-indigo-900/30">
              <div class="text-xs text-indigo-600 dark:text-indigo-400">解压资源总尺寸</div>
              <div class="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {{ formatBytes(summary.totalResourceBytes) }}
              </div>
            </div>
          </n-gi>
          <n-gi>
            <div class="p-2.5 rounded-lg bg-emerald-50/40 dark:bg-emerald-900/10 text-center border border-emerald-100 dark:border-emerald-800/30">
              <div class="text-xs text-emerald-600 dark:text-emerald-400">网络总耗时跨度</div>
              <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {{ formatDurationMs(summary.totalDurationMs) }}
              </div>
            </div>
          </n-gi>
        </n-grid>
      </n-card>

      <!-- 筛选与控制面板 -->
      <n-card size="small">
        <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <!-- 搜索输入 -->
          <n-input
            v-model:value="filterOptions.keyword"
            clearable
            placeholder="按 URL、路径、域名或状态码过滤..."
            class="md:w-80"
            size="small"
          >
            <template #prefix>
              <n-icon :component="Search" class="text-neutral-400" />
            </template>
          </n-input>

          <!-- 状态分组选择 -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs text-neutral-400">状态：</span>
            <n-radio-group v-model:value="filterOptions.statusGroup" size="small">
              <n-radio-button value="all">全部</n-radio-button>
              <n-radio-button value="2xx">
                2xx ({{ summary.statusCounts.success }})
              </n-radio-button>
              <n-radio-button value="3xx">
                3xx ({{ summary.statusCounts.redirect }})
              </n-radio-button>
              <n-radio-button value="4xx">
                4xx ({{ summary.statusCounts.clientError }})
              </n-radio-button>
              <n-radio-button value="5xx">
                5xx ({{ summary.statusCounts.serverError }})
              </n-radio-button>
            </n-radio-group>
          </div>
        </div>

        <!-- 资源类型 Tab 过滤 -->
        <div class="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700/60 flex flex-wrap items-center gap-1.5">
          <n-button
            size="tiny"
            :type="filterOptions.resourceType === 'all' ? 'primary' : 'default'"
            :secondary="filterOptions.resourceType !== 'all'"
            @click="filterOptions.resourceType = 'all'"
          >
            全部 ({{ summary.totalRequests }})
          </n-button>
          <n-button
            size="tiny"
            :type="filterOptions.resourceType === 'fetch' ? 'primary' : 'default'"
            :secondary="filterOptions.resourceType !== 'fetch'"
            @click="filterOptions.resourceType = 'fetch'"
          >
            Fetch/XHR ({{ summary.resourceTypeCounts.fetch }})
          </n-button>
          <n-button
            size="tiny"
            :type="filterOptions.resourceType === 'js' ? 'primary' : 'default'"
            :secondary="filterOptions.resourceType !== 'js'"
            @click="filterOptions.resourceType = 'js'"
          >
            JS ({{ summary.resourceTypeCounts.js }})
          </n-button>
          <n-button
            size="tiny"
            :type="filterOptions.resourceType === 'css' ? 'primary' : 'default'"
            :secondary="filterOptions.resourceType !== 'css'"
            @click="filterOptions.resourceType = 'css'"
          >
            CSS ({{ summary.resourceTypeCounts.css }})
          </n-button>
          <n-button
            size="tiny"
            :type="filterOptions.resourceType === 'img' ? 'primary' : 'default'"
            :secondary="filterOptions.resourceType !== 'img'"
            @click="filterOptions.resourceType = 'img'"
          >
            图片 ({{ summary.resourceTypeCounts.img }})
          </n-button>
          <n-button
            size="tiny"
            :type="filterOptions.resourceType === 'doc' ? 'primary' : 'default'"
            :secondary="filterOptions.resourceType !== 'doc'"
            @click="filterOptions.resourceType = 'doc'"
          >
            文档 ({{ summary.resourceTypeCounts.doc }})
          </n-button>
          <n-button
            size="tiny"
            :type="filterOptions.resourceType === 'other' ? 'primary' : 'default'"
            :secondary="filterOptions.resourceType !== 'other'"
            @click="filterOptions.resourceType = 'other'"
          >
            其他 ({{ summary.resourceTypeCounts.other }})
          </n-button>
        </div>
      </n-card>

      <!-- 3. 请求列表与甘特瀑布流 -->
      <n-card size="small" content-style="padding: 0;">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700 text-neutral-500 select-none">
              <tr>
                <th class="p-2.5 w-16 text-center">状态</th>
                <th class="p-2.5 w-16 text-center">方法</th>
                <th class="p-2.5 min-w-[200px]">名称 / 路径</th>
                <th class="p-2.5 min-w-[120px]">域名</th>
                <th class="p-2.5 w-20 text-right">类型</th>
                <th class="p-2.5 w-24 text-right">大小</th>
                <th class="p-2.5 w-24 text-right">耗时</th>
                <th class="p-2.5 min-w-[220px]">时序甘特瀑布流 (Waterfall)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
              <tr
                v-for="entry in filteredEntries"
                :key="entry.id"
                class="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                @click="openDetail(entry)"
              >
                <!-- 状态码 -->
                <td class="p-2.5 text-center">
                  <n-tag :type="getStatusTagType(entry.status)" size="tiny">
                    {{ entry.status }}
                  </n-tag>
                </td>

                <!-- 方法 -->
                <td class="p-2.5 text-center font-bold">
                  <span
                    class="text-[11px] px-1.5 py-0.5 rounded"
                    :class="{
                      'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300': entry.method === 'GET',
                      'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300': entry.method === 'POST',
                      'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300': entry.method === 'PUT' || entry.method === 'PATCH',
                      'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300': entry.method === 'DELETE',
                    }"
                  >
                    {{ entry.method }}
                  </span>
                </td>

                <!-- 名称 / URL 路径 -->
                <td class="p-2.5 max-w-[260px] truncate" :title="entry.url">
                  <span class="font-sans font-medium text-neutral-800 dark:text-neutral-200">
                    {{ entry.urlPath }}
                  </span>
                </td>

                <!-- 域名 -->
                <td class="p-2.5 text-neutral-400 truncate max-w-[140px]" :title="entry.domain">
                  {{ entry.domain }}
                </td>

                <!-- 资源类型 -->
                <td class="p-2.5 text-right font-sans text-neutral-500 uppercase text-[11px]">
                  {{ entry.resourceType }}
                </td>

                <!-- 体积 -->
                <td class="p-2.5 text-right text-neutral-500">
                  {{ formatBytes(entry.transferSize) }}
                </td>

                <!-- 总耗时 -->
                <td class="p-2.5 text-right font-semibold text-neutral-700 dark:text-neutral-300">
                  {{ formatDurationMs(entry.time) }}
                </td>

                <!-- 甘特瀑布图 -->
                <td class="p-2.5">
                  <div class="w-full bg-neutral-100 dark:bg-neutral-800 rounded h-3.5 relative overflow-hidden flex items-center">
                    <div
                      class="absolute h-full flex rounded-sm overflow-hidden"
                      :style="{
                        left: `${entry.offsetPercent}%`,
                        width: `${Math.max(entry.widthPercent, 1.5)}%`,
                      }"
                    >
                      <div
                        v-for="(seg, sIdx) in entry.timingSegments"
                        :key="sIdx"
                        class="h-full"
                        :style="{
                          width: `${seg.widthPercent}%`,
                          backgroundColor: seg.color,
                        }"
                        :title="`${seg.name}: ${formatDurationMs(seg.durationMs)}`"
                      />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="filteredEntries.length === 0" class="py-12 text-center text-neutral-400">
            暂无匹配筛选条件的网络请求
          </div>
        </div>
      </n-card>
    </template>

    <!-- 4. 单条请求详情抽屉 Drawer -->
    <n-drawer v-model:show="showDetailDrawer" :width="680" placement="right">
      <n-drawer-content v-if="selectedEntry" closable>
        <template #header>
          <div class="flex items-center gap-2">
            <n-tag :type="getStatusTagType(selectedEntry.status)" size="small">
              {{ selectedEntry.status }} {{ selectedEntry.statusText }}
            </n-tag>
            <span class="font-mono font-bold">{{ selectedEntry.method }}</span>
            <span class="truncate max-w-sm text-xs font-mono text-neutral-500" :title="selectedEntry.url">
              {{ selectedEntry.url }}
            </span>
          </div>
        </template>

        <n-tabs type="line" animated>
          <!-- 常规与标头 (Headers) -->
          <n-tab-pane name="headers" tab="标头 (Headers)">
            <div class="space-y-4 text-xs font-mono">
              <!-- General 常规信息 -->
              <div>
                <div class="font-bold font-sans text-sm text-neutral-700 dark:text-neutral-200 mb-2">常规 (General)</div>
                <div class="p-2.5 rounded bg-neutral-50 dark:bg-neutral-800/60 space-y-1.5 border border-neutral-100 dark:border-neutral-700/50">
                  <div><span class="text-neutral-400">Request URL:</span> {{ selectedEntry.url }}</div>
                  <div><span class="text-neutral-400">Request Method:</span> {{ selectedEntry.method }}</div>
                  <div><span class="text-neutral-400">Status Code:</span> {{ selectedEntry.status }} {{ selectedEntry.statusText }}</div>
                  <div><span class="text-neutral-400">Started Time:</span> {{ selectedEntry.startedDateTime }}</div>
                  <div><span class="text-neutral-400">Duration:</span> {{ formatDurationMs(selectedEntry.time) }}</div>
                </div>
              </div>

              <!-- 响应标头 -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold font-sans text-sm text-neutral-700 dark:text-neutral-200">
                    响应标头 (Response Headers, {{ selectedEntry.response.headers.length }})
                  </span>
                  <n-button size="tiny" text type="primary" @click="handleCopyText(JSON.stringify(selectedEntry.response.headers, null, 2), '已复制响应标头')">
                    复制
                  </n-button>
                </div>
                <div class="p-2.5 rounded bg-neutral-50 dark:bg-neutral-800/60 space-y-1 border border-neutral-100 dark:border-neutral-700/50 max-h-48 overflow-y-auto">
                  <div v-for="h in selectedEntry.response.headers" :key="h.name" class="break-all">
                    <span class="text-blue-600 dark:text-blue-400 font-semibold">{{ h.name }}:</span> {{ h.value }}
                  </div>
                </div>
              </div>

              <!-- 请求标头 -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold font-sans text-sm text-neutral-700 dark:text-neutral-200">
                    请求标头 (Request Headers, {{ selectedEntry.request.headers.length }})
                  </span>
                  <n-button size="tiny" text type="primary" @click="handleCopyText(JSON.stringify(selectedEntry.request.headers, null, 2), '已复制请求标头')">
                    复制
                  </n-button>
                </div>
                <div class="p-2.5 rounded bg-neutral-50 dark:bg-neutral-800/60 space-y-1 border border-neutral-100 dark:border-neutral-700/50 max-h-48 overflow-y-auto">
                  <div v-for="h in selectedEntry.request.headers" :key="h.name" class="break-all">
                    <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ h.name }}:</span> {{ h.value }}
                  </div>
                </div>
              </div>
            </div>
          </n-tab-pane>

          <!-- 载荷 Payload (PostData / QueryString) -->
          <n-tab-pane name="payload" tab="载荷 (Payload)">
            <div class="space-y-4 text-xs font-mono">
              <div v-if="selectedEntry.request.queryString && selectedEntry.request.queryString.length > 0">
                <div class="font-bold font-sans text-sm mb-2 text-neutral-700 dark:text-neutral-200">查询参数 (Query String)</div>
                <div class="p-2.5 rounded bg-neutral-50 dark:bg-neutral-800/60 space-y-1 border border-neutral-100 dark:border-neutral-700/50">
                  <div v-for="q in selectedEntry.request.queryString" :key="q.name">
                    <span class="text-purple-600 dark:text-purple-400 font-semibold">{{ q.name }}:</span> {{ q.value }}
                  </div>
                </div>
              </div>

              <div v-if="selectedEntry.request.postData">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold font-sans text-sm text-neutral-700 dark:text-neutral-200">请求体 (Request Body)</span>
                  <n-button
                    v-if="selectedEntry.request.postData.text"
                    size="tiny"
                    text
                    type="primary"
                    @click="handleCopyText(selectedEntry.request.postData.text || '', '已复制请求体')"
                  >
                    复制
                  </n-button>
                </div>
                <div class="p-2.5 rounded bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/50 max-h-72 overflow-y-auto whitespace-pre-wrap break-all">
                  {{ selectedEntry.request.postData.text || '(无纯文本正文内容)' }}
                </div>
              </div>

              <div v-if="(!selectedEntry.request.queryString || selectedEntry.request.queryString.length === 0) && !selectedEntry.request.postData" class="py-8 text-center text-neutral-400 font-sans">
                该请求未携带查询参数与请求体
              </div>
            </div>
          </n-tab-pane>

          <!-- 响应体预览 (Response Body) -->
          <n-tab-pane name="response" tab="响应预览 (Response)">
            <div class="text-xs font-mono">
              <div class="flex items-center justify-between mb-2">
                <span class="text-neutral-500 font-sans">
                  MIME: {{ selectedEntry.mimeType || '未知' }} | 尺寸: {{ formatBytes(selectedEntry.resourceSize) }}
                </span>
                <n-button
                  v-if="selectedEntry.response.content.text"
                  size="tiny"
                  text
                  type="primary"
                  @click="handleCopyText(selectedEntry.response.content.text || '', '已复制响应内容')"
                >
                  复制响应体
                </n-button>
              </div>

              <div
                v-if="selectedEntry.response.content.text"
                class="p-3 rounded bg-neutral-900 text-neutral-100 max-h-96 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed"
              >
                {{ selectedEntry.response.content.text }}
              </div>
              <div v-else class="py-12 text-center text-neutral-400 font-sans">
                未记录响应体内容或内容为空
              </div>
            </div>
          </n-tab-pane>

          <!-- 时序明细 (Timing Breakdown) -->
          <n-tab-pane name="timing" tab="时序明细 (Timing)">
            <div class="space-y-3 font-mono text-xs">
              <div class="font-bold font-sans text-sm text-neutral-700 dark:text-neutral-200 mb-1">各阶段耗时分布明细</div>
              <div class="p-3 rounded bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/50 space-y-2">
                <div v-for="seg in selectedEntry.timingSegments" :key="seg.name" class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-sm" :style="{ backgroundColor: seg.color }" />
                    <span class="font-sans text-neutral-700 dark:text-neutral-300">{{ seg.name }}</span>
                  </div>
                  <span class="font-bold">{{ formatDurationMs(seg.durationMs) }}</span>
                </div>
                <n-divider class="!my-2" />
                <div class="flex items-center justify-between font-bold text-sm font-sans pt-1">
                  <span>总响应周期</span>
                  <span class="text-blue-600 dark:text-blue-400">{{ formatDurationMs(selectedEntry.time) }}</span>
                </div>
              </div>
            </div>
          </n-tab-pane>
        </n-tabs>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>
