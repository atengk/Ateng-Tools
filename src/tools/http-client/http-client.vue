<!--
 * HTTP 客户端视图组件
 *
 * @author Ateng
 * @since 2026-10-02
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useDialog, useMessage } from 'naive-ui';
import { useStorage } from '@vueuse/core';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Clock,
  Copy,
  FileImport,
  FileText,
  History,
  Plus,
  Search,
  Send,
  Terminal2,
  Trash,
  Upload,
  Wand,
  X,
} from '@vicons/tabler';
import {
  COMMON_HTTP_HEADERS,
  HTTP_METHODS,
  addHistoryRecord,
  buildRequestBodyAndHeaders,
  classifyStatus,
  compileRequestHeaders,
  createHistoryRecord,
  diagnoseFetchError,
  executeHttpRequest,
  exportToCurlCommand,
  filterHistoryRecords,
  formatBytes,
  getStatusTagType,
  importFromCurlCommand,
  mergeUrlAndQuery,
  serializeRequestSpec,
  splitUrlAndQuery,
  validateJson,
} from './http-client.service';
import type {
  AuthConfig,
  CorsDiagnosticResult,
  FormDataItem,
  HistoryRecord,
  HistoryResponseMeta,
  HttpMethod,
  HttpResponseSnapshot,
  KeyValuePair,
  RequestBodyConfig,
  SentRequestRecord,
} from './http-client.types';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const { copy } = useCopy({ createToast: false });

// 示例配置与当前状态
const DEFAULT_URL = 'https://httpbin.org/get?page=1&limit=20';
const method = ref<HttpMethod>('GET');
const url = ref<string>(DEFAULT_URL);
const timeoutMs = ref<number>(30000);

// 请求配置选项卡 (params, headers, auth, body)
const activeRequestTab = ref<'params' | 'headers' | 'auth' | 'body'>('params');

// Query 参数列表与双向响应式同步守卫
const queryParams = ref<KeyValuePair[]>([]);
let isSyncing = false;

// 1. URL -> QueryParams 同步
watch(
  url,
  (newUrl) => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      const { queryParams: parsed } = splitUrlAndQuery(newUrl || '');
      queryParams.value = parsed;
    } finally {
      isSyncing = false;
    }
  },
  { immediate: true },
);

// 2. QueryParams -> URL 同步
watch(
  queryParams,
  (newParams) => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      const { baseUrl, hash } = splitUrlAndQuery(url.value || '');
      url.value = mergeUrlAndQuery(baseUrl, newParams, hash);
    } finally {
      isSyncing = false;
    }
  },
  { deep: true },
);

// 自定义请求头列表
const customHeaders = ref<KeyValuePair[]>([
  { key: 'Accept', value: 'application/json', enabled: true },
]);

// 鉴权配置
const authConfig = reactive<AuthConfig>({
  type: 'none',
  bearerToken: '',
  basicUsername: '',
  basicPassword: '',
});

// 请求体配置
const bodyConfig = reactive<RequestBodyConfig>({
  type: 'none',
  rawText: '{\n  "name": "Ateng",\n  "active": true\n}',
  formData: [
    { key: 'title', type: 'text', value: 'Test Title', file: null, enabled: true },
  ],
  urlEncoded: [
    { key: 'category', value: 'developer', enabled: true },
  ],
});

// 鉴权类型单选/下拉选项
const authTypeOptions = [
  { label: 'None (无鉴权)', value: 'none' },
  { label: 'Bearer Token', value: 'bearer' },
  { label: 'Basic Auth', value: 'basic' },
];

// 请求体类型选项
const bodyTypeOptions = [
  { label: 'none', value: 'none' },
  { label: 'json', value: 'json' },
  { label: 'form-data', value: 'form-data' },
  { label: 'x-www-form-urlencoded', value: 'x-www-form-urlencoded' },
  { label: 'raw', value: 'raw' },
];

// 请求头名称自动补全数据源
const headerAutoCompleteOptions = computed(() =>
  COMMON_HTTP_HEADERS.map(h => ({
    label: h,
    value: h,
  })),
);

// 超时时间选项
const timeoutOptions = [
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
  { label: '60s', value: 60000 },
];

// 请求方法下拉选项
const methodOptions = HTTP_METHODS.map(m => ({
  label: m,
  value: m,
}));

// 执行态
const isLoading = ref<boolean>(false);
const currentAbortController = ref<AbortController | null>(null);
const errorMessage = ref<string | null>(null);
const responseSnapshot = ref<HttpResponseSnapshot | null>(null);

// 智能 CORS 异常诊断结果
const corsDiagnostic = ref<CorsDiagnosticResult | null>(null);

// cURL 命令导入弹窗与输入
const showImportCurlModal = ref<boolean>(false);
const curlInputText = ref<string>('');

// 本地请求历史记录 (严格限制最大 20 条，不存 response body 防 LocalStorage 配额溢出)
const history = useStorage<HistoryRecord[]>('ateng:tools:http-client:history', []);
const showHistoryDrawer = ref<boolean>(false);
const historySearchQuery = ref<string>('');

// 过滤后的历史记录
const filteredHistory = computed(() =>
  filterHistoryRecords(history.value, historySearchQuery.value),
);

// 最近一次实际发出的请求回显记录
const lastSentRequest = ref<SentRequestRecord | null>(null);

// 响应选项卡与展示模式
const activeResponseTab = ref<'body' | 'headers' | 'sent'>('body');
const bodyViewMode = ref<'pretty' | 'raw'>('pretty');

// 计算用于高亮/展示的响应体
const displayBody = computed(() => {
  if (!responseSnapshot.value) {
    return '';
  }
  if (bodyViewMode.value === 'pretty' && responseSnapshot.value.formattedJson) {
    return responseSnapshot.value.formattedJson;
  }
  return responseSnapshot.value.body;
});

// 计算状态标签类型
const statusTagType = computed(() => {
  if (!responseSnapshot.value) {
    return 'default';
  }
  return getStatusTagType(classifyStatus(responseSnapshot.value.status));
});

// 计算 Query 参数激活计数
const activeParamsCount = computed(() =>
  queryParams.value.filter(p => p.enabled !== false && p.key.trim()).length,
);

// 计算自定义 Headers 激活计数
const activeHeadersCount = computed(() =>
  customHeaders.value.filter(h => h.enabled !== false && h.key.trim()).length,
);

// 实时校验 JSON 语法
const jsonSyntaxValidation = computed(() => {
  if (bodyConfig.type !== 'json') {
    return { valid: true };
  }
  return validateJson(bodyConfig.rawText || '');
});

/**
 * 添加一条空 Query 参数
 */
function addQueryParam() {
  queryParams.value.push({ key: '', value: '', enabled: true });
}

/**
 * 删除一条 Query 参数
 */
function removeQueryParam(index: number) {
  queryParams.value.splice(index, 1);
}

/**
 * 添加一条自定义请求头
 */
function addCustomHeader() {
  customHeaders.value.push({ key: '', value: '', enabled: true });
}

/**
 * 删除一条自定义请求头
 */
function removeCustomHeader(index: number) {
  customHeaders.value.splice(index, 1);
}

/**
 * 格式化美化 JSON 请求体
 */
function handlePrettifyJson() {
  if (!bodyConfig.rawText?.trim()) return;
  const validation = validateJson(bodyConfig.rawText);
  if (!validation.valid) {
    message.error(`${t('tools.http-client.prettifyInvalid')}: ${validation.error}`);
    return;
  }
  try {
    const parsed = JSON.parse(bodyConfig.rawText);
    bodyConfig.rawText = JSON.stringify(parsed, null, 2);
    message.success(t('tools.http-client.prettifySuccess'));
  } catch {
    message.error(t('tools.http-client.prettifyInvalid'));
  }
}

/**
 * 添加一条 FormData 字段
 */
function addFormDataField() {
  if (!bodyConfig.formData) {
    bodyConfig.formData = [];
  }
  bodyConfig.formData.push({ key: '', type: 'text', value: '', file: null, enabled: true });
}

/**
 * 删除一条 FormData 字段
 */
function removeFormDataField(index: number) {
  bodyConfig.formData?.splice(index, 1);
}

/**
 * 触发本地文件选择
 */
function handleFileInputChange(event: Event, item: FormDataItem) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    item.file = target.files[0];
    item.value = target.files[0].name;
  } else {
    item.file = null;
    item.value = '';
  }
}

/**
 * 添加一条 UrlEncoded 字段
 */
function addUrlEncodedField() {
  if (!bodyConfig.urlEncoded) {
    bodyConfig.urlEncoded = [];
  }
  bodyConfig.urlEncoded.push({ key: '', value: '', enabled: true });
}

/**
 * 删除一条 UrlEncoded 字段
 */
function removeUrlEncodedField(index: number) {
  bodyConfig.urlEncoded?.splice(index, 1);
}

/**
 * 发送 HTTP 请求
 */
async function handleSend() {
  if (!url.value || !url.value.trim()) {
    message.warning(t('tools.http-client.urlPlaceholder'));
    return;
  }

  // 1. 重置状态与初始化控制器
  isLoading.value = true;
  errorMessage.value = null;
  corsDiagnostic.value = null;
  const controller = new AbortController();
  currentAbortController.value = controller;

  // 2. 编译请求头 (合并自定义 Headers 与 Auth 凭据)
  const baseHeaders = compileRequestHeaders(customHeaders.value, authConfig);

  // 3. 构建 Body 载荷与最终 Headers (包含 Content-Type 处理)
  const { body: compiledBody, headers: finalHeaders, summaryText: bodySummary } =
    buildRequestBodyAndHeaders(bodyConfig, baseHeaders);

  // 4. 记录本次实际发送要素快照
  const finalHeadersList = Object.entries(finalHeaders).map(([key, value]) => ({ key, value }));
  lastSentRequest.value = {
    method: method.value,
    fullUrl: url.value.trim(),
    headers: finalHeaders,
    headersList: finalHeadersList,
    bodyType: bodyConfig.type,
    bodySummary,
    timestamp: Date.now(),
  };

  // 生成当前请求序列化快照 (用于历史持久化，排除了不可持久化的 File 实例)
  const reqSpec = serializeRequestSpec(
    method.value,
    url.value.trim(),
    queryParams.value,
    customHeaders.value,
    authConfig,
    bodyConfig,
  );

  try {
    // 5. 调度执行
    const snapshot = await executeHttpRequest({
      method: method.value,
      url: url.value.trim(),
      timeoutMs: timeoutMs.value,
      headers: finalHeaders,
      body: compiledBody,
      signal: controller.signal,
    });
    responseSnapshot.value = snapshot;

    // 记录成功历史 (仅保留关键元数据，坚决不持久化 response.body 防 LocalStorage 配额溢出)
    const resMeta: HistoryResponseMeta = {
      status: snapshot.status,
      statusText: snapshot.statusText,
      ok: snapshot.ok,
      durationMs: snapshot.durationMs,
      sizeBytes: snapshot.sizeBytes,
    };
    const record = createHistoryRecord({ request: reqSpec, response: resMeta });
    history.value = addHistoryRecord(history.value, record, 20);
  } catch (err: any) {
    // 记录异常历史
    const record = createHistoryRecord({ request: reqSpec, response: undefined });
    history.value = addHistoryRecord(history.value, record, 20);

    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      errorMessage.value = t('tools.http-client.abortedError');
      message.info(t('tools.http-client.abortedError'));
    } else if (err.message?.includes('timed out')) {
      errorMessage.value = t('tools.http-client.timeoutError');
      message.error(t('tools.http-client.timeoutError'));
    } else {
      const diag = diagnoseFetchError(err, url.value);
      corsDiagnostic.value = diag;
      const errMsg = diag.message || err.message || t('tools.http-client.requestFailed');
      errorMessage.value = errMsg;
      message.error(diag.title || t('tools.http-client.requestFailed'));
    }
  } finally {
    isLoading.value = false;
    currentAbortController.value = null;
  }
}

/**
 * 主动取消正在进行的请求
 */
function handleCancel() {
  if (currentAbortController.value) {
    currentAbortController.value.abort();
    currentAbortController.value = null;
    isLoading.value = false;
  }
}

/**
 * 导出当前请求为 cURL 命令并复制至剪贴板
 */
async function handleCopyAsCurl() {
  const baseHeaders = compileRequestHeaders(customHeaders.value, authConfig);
  const { body: compiledBody, headers: finalHeaders } =
    buildRequestBodyAndHeaders(bodyConfig, baseHeaders);

  const curlCmd = exportToCurlCommand({
    method: method.value,
    url: url.value.trim(),
    headers: finalHeaders,
    body: typeof compiledBody === 'string' ? compiledBody : undefined,
  });

  await copy(curlCmd);
  message.success(t('tools.http-client.copyAsCurlSuccess'));
}

/**
 * 确认从 cURL 解析导入
 */
function handleConfirmImportCurl() {
  if (!curlInputText.value || !curlInputText.value.trim()) {
    message.warning(t('tools.http-client.importCurlPlaceholder'));
    return;
  }

  try {
    const imported = importFromCurlCommand(curlInputText.value);
    method.value = imported.method;
    url.value = imported.url;
    queryParams.value = imported.queryParams;
    customHeaders.value = imported.headers;
    authConfig.type = imported.auth.type;
    authConfig.bearerToken = imported.auth.bearerToken || '';
    authConfig.basicUsername = imported.auth.basicUsername || '';
    authConfig.basicPassword = imported.auth.basicPassword || '';
    bodyConfig.type = imported.bodyConfig.type;
    bodyConfig.rawText = imported.bodyConfig.rawText || '';
    bodyConfig.formData = imported.bodyConfig.formData || [];
    bodyConfig.urlEncoded = imported.bodyConfig.urlEncoded || [];

    showImportCurlModal.value = false;
    curlInputText.value = '';
    message.success(t('tools.http-client.importCurlSuccess'));
  } catch (err: any) {
    message.error(`${t('tools.http-client.importCurlError')}: ${err.message || ''}`);
  }
}

/**
 * 在 cURL 转换器中打开
 */
async function handleOpenInCurlConverter() {
  const baseHeaders = compileRequestHeaders(customHeaders.value, authConfig);
  const { body: compiledBody, headers: finalHeaders } =
    buildRequestBodyAndHeaders(bodyConfig, baseHeaders);

  const curlCmd = exportToCurlCommand({
    method: method.value,
    url: url.value.trim(),
    headers: finalHeaders,
    body: typeof compiledBody === 'string' ? compiledBody : undefined,
  });

  await copy(curlCmd);
  message.info(t('tools.http-client.copyAsCurlSuccess'));
  router.push('/curl-converter');
}

/**
 * 从历史记录中恢复请求配置
 */
function restoreFromHistory(item: HistoryRecord) {
  method.value = item.request.method;
  url.value = item.request.url;
  queryParams.value = (item.request.queryParams || []).map(p => ({ ...p }));
  customHeaders.value = (item.request.headers || []).map(h => ({ ...h }));

  authConfig.type = item.request.auth?.type || 'none';
  authConfig.bearerToken = item.request.auth?.bearerToken || '';
  authConfig.basicUsername = item.request.auth?.basicUsername || '';
  authConfig.basicPassword = item.request.auth?.basicPassword || '';

  bodyConfig.type = item.request.bodyConfig?.type || 'none';
  bodyConfig.rawText = item.request.bodyConfig?.rawText || '';
  bodyConfig.formData = (item.request.bodyConfig?.formData || []).map(f => ({
    key: f.key,
    type: f.type,
    value: f.value,
    file: null,
    enabled: f.enabled ?? true,
  }));
  bodyConfig.urlEncoded = (item.request.bodyConfig?.urlEncoded || []).map(u => ({ ...u }));

  showHistoryDrawer.value = false;
  message.success(t('tools.http-client.restoreSuccess'));
}

/**
 * 清空历史记录
 */
function handleClearHistory() {
  dialog.warning({
    title: t('tools.http-client.clearHistory'),
    content: t('tools.http-client.clearHistoryConfirm'),
    positiveText: t('tools.curl-converter.clear', '清空'),
    negativeText: t('tools.http-client.cancel', '取消'),
    onPositiveClick: () => {
      history.value = [];
      message.info(t('tools.http-client.emptyHistory'));
    },
  });
}

/**
 * 格式化历史条目的时间戳
 */
function formatHistoryDate(timestamp: number): string {
  try {
    return format(timestamp, 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return String(timestamp);
  }
}

/**
 * 获取请求方法在历史列表中对应的徽章色彩
 */
function getMethodTagType(m: HttpMethod): 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error' {
  switch (m) {
    case 'GET':
      return 'success';
    case 'POST':
      return 'info';
    case 'PUT':
    case 'PATCH':
      return 'warning';
    case 'DELETE':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * 载入默认示例
 */
function loadSample() {
  method.value = 'POST';
  url.value = 'https://httpbin.org/post';
  timeoutMs.value = 30000;
  customHeaders.value = [
    { key: 'Accept', value: 'application/json', enabled: true },
  ];
  authConfig.type = 'bearer';
  authConfig.bearerToken = 'sample_demo_token_12345';
  bodyConfig.type = 'json';
  bodyConfig.rawText = JSON.stringify({ userId: 10086, role: 'admin', debug: true }, null, 2);
  errorMessage.value = null;
  message.success(t('tools.http-client.copySuccess', '已载入示例'));
}

/**
 * 清空输入与结果
 */
function clearAll() {
  handleCancel();
  url.value = '';
  queryParams.value = [];
  customHeaders.value = [];
  authConfig.type = 'none';
  authConfig.bearerToken = '';
  authConfig.basicUsername = '';
  authConfig.basicPassword = '';
  bodyConfig.type = 'none';
  bodyConfig.rawText = '';
  responseSnapshot.value = null;
  lastSentRequest.value = null;
  errorMessage.value = null;
  corsDiagnostic.value = null;
  message.info('已清空请求与响应结果');
}

/**
 * 复制响应体
 */
async function handleCopyBody() {
  if (!displayBody.value) {
    return;
  }
  await copy(displayBody.value);
  message.success(t('tools.http-client.copySuccess'));
}

/**
 * 复制全部响应头
 */
async function handleCopyHeaders() {
  if (!responseSnapshot.value?.headersList.length) {
    return;
  }
  const headersText = responseSnapshot.value.headersList
    .map(h => `${h.key}: ${h.value}`)
    .join('\n');
  await copy(headersText);
  message.success(t('tools.http-client.copySuccess'));
}

onBeforeUnmount(() => {
  handleCancel();
});
</script>

<template>
  <div class="http-client flex flex-col gap-4 w-full min-w-0" style="flex: 0 0 100%">
    <!-- 顶部操作与请求输入栏 -->
    <n-card class="shadow-sm rounded-12px" size="small">
      <!-- 快捷工具按钮 -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {{ t('tools.http-client.request') }}
          </span>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <!-- 复制 cURL -->
          <n-button size="tiny" quaternary @click="handleCopyAsCurl">
            <template #icon>
              <n-icon :component="Copy" />
            </template>
            {{ t('tools.http-client.copyAsCurl') }}
          </n-button>

          <!-- 从 cURL 导入 -->
          <n-button size="tiny" quaternary @click="showImportCurlModal = true">
            <template #icon>
              <n-icon :component="FileImport" />
            </template>
            {{ t('tools.http-client.importCurl') }}
          </n-button>

          <!-- 在 cURL 转换器中打开 -->
          <n-button size="tiny" quaternary @click="handleOpenInCurlConverter">
            <template #icon>
              <n-icon :component="Terminal2" />
            </template>
            {{ t('tools.http-client.openInCurlConverter') }}
          </n-button>

          <!-- 历史记录抽屉入口 -->
          <n-button size="tiny" quaternary @click="showHistoryDrawer = true">
            <template #icon>
              <n-icon :component="History" />
            </template>
            {{ t('tools.http-client.history') }} ({{ history.length }})
          </n-button>

          <n-button size="tiny" quaternary @click="loadSample">
            {{ t('tools.curl-converter.loadSample', '载入示例') }}
          </n-button>
          <n-button size="tiny" quaternary @click="clearAll">
            <template #icon>
              <n-icon :component="Trash" />
            </template>
            {{ t('tools.curl-converter.clear', '清空') }}
          </n-button>
        </div>
      </div>

      <!-- 请求主栏：Method + URL + 超时 + 发送/取消按钮 -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0 mb-3">
        <!-- 请求方法选择 -->
        <n-select
          v-model:value="method"
          :options="methodOptions"
          class="w-full sm:w-120px shrink-0"
          size="medium"
        />

        <!-- URL 输入框 -->
        <n-input
          v-model:value="url"
          class="flex-1 min-w-0"
          size="medium"
          clearable
          :placeholder="t('tools.http-client.urlPlaceholder')"
          @keyup.enter="handleSend"
        />

        <!-- 超时选择 -->
        <n-select
          v-model:value="timeoutMs"
          :options="timeoutOptions"
          class="w-full sm:w-90px shrink-0"
          size="medium"
        />

        <!-- 发送 / 取消 动态按钮 -->
        <n-button
          v-if="!isLoading"
          type="primary"
          size="medium"
          class="shrink-0"
          @click="handleSend"
        >
          <template #icon>
            <n-icon :component="Send" />
          </template>
          {{ t('tools.http-client.send') }}
        </n-button>

        <n-button
          v-else
          type="error"
          size="medium"
          class="shrink-0"
          @click="handleCancel"
        >
          <template #icon>
            <n-icon :component="X" />
          </template>
          {{ t('tools.http-client.cancel') }}
        </n-button>
      </div>

      <!-- 请求选项配置 Tabs (Params, Headers, Auth, Body) -->
      <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
        <n-tabs v-model:value="activeRequestTab" type="line" size="small">
          <!-- 1. Query Params 选项卡 -->
          <n-tab-pane name="params">
            <template #tab>
              <span>{{ t('tools.http-client.tabParams') }}</span>
              <span
                v-if="activeParamsCount > 0"
                class="ml-1 px-1.5 py-0.5 rounded-full text-xs font-mono bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {{ activeParamsCount }}
              </span>
            </template>

            <div class="flex flex-col gap-2 mt-2">
              <div v-if="queryParams.length > 0" class="overflow-x-auto max-w-full min-w-0">
                <table class="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr class="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800 pb-1">
                      <th style="width: 40px; padding: 4px"></th>
                      <th style="width: 40%; padding: 4px">{{ t('tools.http-client.paramKey') }}</th>
                      <th style="padding: 4px">{{ t('tools.http-client.paramValue') }}</th>
                      <th style="width: 40px; padding: 4px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(param, index) in queryParams" :key="index" class="border-b border-gray-50 dark:border-gray-850">
                      <td style="padding: 4px; text-align: center">
                        <n-checkbox v-model:checked="param.enabled" />
                      </td>
                      <td style="padding: 4px">
                        <n-input
                          v-model:value="param.key"
                          size="tiny"
                          :placeholder="t('tools.http-client.paramKey')"
                        />
                      </td>
                      <td style="padding: 4px">
                        <n-input
                          v-model:value="param.value"
                          size="tiny"
                          :placeholder="t('tools.http-client.paramValue')"
                        />
                      </td>
                      <td style="padding: 4px; text-align: center">
                        <n-button
                          size="tiny"
                          quaternary
                          circle
                          type="error"
                          @click="removeQueryParam(index)"
                        >
                          <template #icon>
                            <n-icon :component="Trash" />
                          </template>
                        </n-button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-xs text-gray-400 py-3 text-center">
                {{ t('tools.http-client.noParams') }}
              </div>

              <div>
                <n-button size="tiny" dashed @click="addQueryParam">
                  <template #icon>
                    <n-icon :component="Plus" />
                  </template>
                  {{ t('tools.http-client.addParam') }}
                </n-button>
              </div>
            </div>
          </n-tab-pane>

          <!-- 2. Headers 选项卡 -->
          <n-tab-pane name="headers">
            <template #tab>
              <span>{{ t('tools.http-client.tabHeaders') }}</span>
              <span
                v-if="activeHeadersCount > 0"
                class="ml-1 px-1.5 py-0.5 rounded-full text-xs font-mono bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {{ activeHeadersCount }}
              </span>
            </template>

            <div class="flex flex-col gap-2 mt-2">
              <div v-if="customHeaders.length > 0" class="overflow-x-auto max-w-full min-w-0">
                <table class="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr class="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800 pb-1">
                      <th style="width: 40px; padding: 4px"></th>
                      <th style="width: 40%; padding: 4px">{{ t('tools.http-client.headerKey') }}</th>
                      <th style="padding: 4px">{{ t('tools.http-client.headerValue') }}</th>
                      <th style="width: 40px; padding: 4px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(header, index) in customHeaders" :key="index" class="border-b border-gray-50 dark:border-gray-850">
                      <td style="padding: 4px; text-align: center">
                        <n-checkbox v-model:checked="header.enabled" />
                      </td>
                      <td style="padding: 4px">
                        <n-auto-complete
                          v-model:value="header.key"
                          :options="headerAutoCompleteOptions"
                          size="tiny"
                          clearable
                          :placeholder="t('tools.http-client.headerKeyPlaceholder')"
                        />
                      </td>
                      <td style="padding: 4px">
                        <n-input
                          v-model:value="header.value"
                          size="tiny"
                          :placeholder="t('tools.http-client.headerValuePlaceholder')"
                        />
                      </td>
                      <td style="padding: 4px; text-align: center">
                        <n-button
                          size="tiny"
                          quaternary
                          circle
                          type="error"
                          @click="removeCustomHeader(index)"
                        >
                          <template #icon>
                            <n-icon :component="Trash" />
                          </template>
                        </n-button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-xs text-gray-400 py-3 text-center">
                {{ t('tools.http-client.noCustomHeaders') }}
              </div>

              <div>
                <n-button size="tiny" dashed @click="addCustomHeader">
                  <template #icon>
                    <n-icon :component="Plus" />
                  </template>
                  {{ t('tools.http-client.addHeader') }}
                </n-button>
              </div>
            </div>
          </n-tab-pane>

          <!-- 3. Auth 鉴权选项卡 -->
          <n-tab-pane name="auth" :tab="t('tools.http-client.tabAuth')">
            <div class="flex flex-col gap-3 mt-2 max-w-500px">
              <div class="flex items-center gap-3">
                <span class="text-xs text-gray-500 w-70px shrink-0">
                  {{ t('tools.http-client.authType') }}:
                </span>
                <n-select
                  v-model:value="authConfig.type"
                  :options="authTypeOptions"
                  size="small"
                  class="flex-1"
                />
              </div>

              <!-- Bearer Token -->
              <div v-if="authConfig.type === 'bearer'" class="flex flex-col gap-1.5 pl-70px">
                <n-input
                  v-model:value="authConfig.bearerToken"
                  type="password"
                  show-password-on="click"
                  size="small"
                  :placeholder="t('tools.http-client.tokenPlaceholder')"
                />
                <span class="text-xs text-gray-400">
                  {{ t('tools.http-client.authHintBearer') }}
                </span>
              </div>

              <!-- Basic Auth -->
              <div v-else-if="authConfig.type === 'basic'" class="flex flex-col gap-2 pl-70px">
                <n-input
                  v-model:value="authConfig.basicUsername"
                  size="small"
                  :placeholder="t('tools.http-client.usernamePlaceholder')"
                />
                <n-input
                  v-model:value="authConfig.basicPassword"
                  type="password"
                  show-password-on="click"
                  size="small"
                  :placeholder="t('tools.http-client.passwordPlaceholder')"
                />
                <span class="text-xs text-gray-400">
                  {{ t('tools.http-client.authHintBasic') }}
                </span>
              </div>
            </div>
          </n-tab-pane>

          <!-- 4. Body 请求体选项卡 -->
          <n-tab-pane name="body">
            <template #tab>
              <span>{{ t('tools.http-client.tabBody') }}</span>
              <span
                v-if="bodyConfig.type !== 'none'"
                class="ml-1 px-1.5 py-0.5 rounded-full text-xs font-mono bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {{ bodyConfig.type }}
              </span>
            </template>

            <div class="flex flex-col gap-3 mt-2">
              <!-- Body 类型单选 -->
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs text-gray-500 mr-2">{{ t('tools.http-client.bodyType') }}:</span>
                <n-radio-group v-model:value="bodyConfig.type" size="small">
                  <n-radio-button
                    v-for="opt in bodyTypeOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </n-radio-button>
                </n-radio-group>

                <!-- JSON 美化快捷按钮 -->
                <n-button
                  v-if="bodyConfig.type === 'json'"
                  size="tiny"
                  secondary
                  class="ml-auto"
                  @click="handlePrettifyJson"
                >
                  <template #icon>
                    <n-icon :component="Wand" />
                  </template>
                  {{ t('tools.http-client.prettify') }}
                </n-button>
              </div>

              <!-- 4.1 无 Body -->
              <div v-if="bodyConfig.type === 'none'" class="text-xs text-gray-400 py-6 text-center">
                {{ t('tools.http-client.noSentBody') }}
              </div>

              <!-- 4.2 JSON Body -->
              <div v-else-if="bodyConfig.type === 'json'" class="flex flex-col gap-2">
                <n-input
                  v-model:value="bodyConfig.rawText"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 12 }"
                  class="font-mono text-xs"
                  placeholder="{\n  &quot;key&quot;: &quot;value&quot;\n}"
                />
                <span
                  v-if="!jsonSyntaxValidation.valid"
                  class="text-xs text-red-500 font-mono"
                >
                  {{ t('tools.http-client.jsonSyntaxError') }}: {{ jsonSyntaxValidation.error }}
                </span>
              </div>

              <!-- 4.3 Form-Data Body -->
              <div v-else-if="bodyConfig.type === 'form-data'" class="flex flex-col gap-2">
                <div v-if="bodyConfig.formData && bodyConfig.formData.length > 0" class="overflow-x-auto max-w-full min-w-0">
                  <table class="w-full text-xs font-mono border-collapse">
                    <thead>
                      <tr class="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800 pb-1">
                        <th style="width: 40px; padding: 4px"></th>
                        <th style="width: 30%; padding: 4px">{{ t('tools.http-client.paramKey') }}</th>
                        <th style="width: 90px; padding: 4px"></th>
                        <th style="padding: 4px">{{ t('tools.http-client.paramValue') }}</th>
                        <th style="width: 40px; padding: 4px"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(item, index) in bodyConfig.formData"
                        :key="index"
                        class="border-b border-gray-50 dark:border-gray-850"
                      >
                        <td style="padding: 4px; text-align: center">
                          <n-checkbox v-model:checked="item.enabled" />
                        </td>
                        <td style="padding: 4px">
                          <n-input
                            v-model:value="item.key"
                            size="tiny"
                            :placeholder="t('tools.http-client.paramKey')"
                          />
                        </td>
                        <td style="padding: 4px">
                          <n-select
                            v-model:value="item.type"
                            size="tiny"
                            :options="[
                              { label: t('tools.http-client.fieldTypeText'), value: 'text' },
                              { label: t('tools.http-client.fieldTypeFile'), value: 'file' },
                            ]"
                          />
                        </td>
                        <td style="padding: 4px">
                          <div v-if="item.type === 'file'" class="flex items-center gap-2">
                            <label class="cursor-pointer inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-xs">
                              <n-icon :component="Upload" />
                              <span>{{ t('tools.http-client.chooseFile') }}</span>
                              <input
                                type="file"
                                class="hidden"
                                @change="handleFileInputChange($event, item)"
                              />
                            </label>
                            <span class="text-xs truncate max-w-200px text-gray-600 dark:text-gray-300">
                              {{ item.value || t('tools.http-client.noFileChosen') }}
                            </span>
                          </div>
                          <n-input
                            v-else
                            v-model:value="item.value"
                            size="tiny"
                            :placeholder="t('tools.http-client.paramValue')"
                          />
                        </td>
                        <td style="padding: 4px; text-align: center">
                          <n-button
                            size="tiny"
                            quaternary
                            circle
                            type="error"
                            @click="removeFormDataField(index)"
                          >
                            <template #icon>
                              <n-icon :component="Trash" />
                            </template>
                          </n-button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <n-button size="tiny" dashed @click="addFormDataField">
                    <template #icon>
                      <n-icon :component="Plus" />
                    </template>
                    {{ t('tools.http-client.addFormDataField') }}
                  </n-button>
                </div>
              </div>

              <!-- 4.4 x-www-form-urlencoded Body -->
              <div v-else-if="bodyConfig.type === 'x-www-form-urlencoded'" class="flex flex-col gap-2">
                <div v-if="bodyConfig.urlEncoded && bodyConfig.urlEncoded.length > 0" class="overflow-x-auto max-w-full min-w-0">
                  <table class="w-full text-xs font-mono border-collapse">
                    <thead>
                      <tr class="text-left text-gray-500 border-b border-gray-100 dark:border-gray-800 pb-1">
                        <th style="width: 40px; padding: 4px"></th>
                        <th style="width: 40%; padding: 4px">{{ t('tools.http-client.paramKey') }}</th>
                        <th style="padding: 4px">{{ t('tools.http-client.paramValue') }}</th>
                        <th style="width: 40px; padding: 4px"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(item, index) in bodyConfig.urlEncoded"
                        :key="index"
                        class="border-b border-gray-50 dark:border-gray-850"
                      >
                        <td style="padding: 4px; text-align: center">
                          <n-checkbox v-model:checked="item.enabled" />
                        </td>
                        <td style="padding: 4px">
                          <n-input
                            v-model:value="item.key"
                            size="tiny"
                            :placeholder="t('tools.http-client.paramKey')"
                          />
                        </td>
                        <td style="padding: 4px">
                          <n-input
                            v-model:value="item.value"
                            size="tiny"
                            :placeholder="t('tools.http-client.paramValue')"
                          />
                        </td>
                        <td style="padding: 4px; text-align: center">
                          <n-button
                            size="tiny"
                            quaternary
                            circle
                            type="error"
                            @click="removeUrlEncodedField(index)"
                          >
                            <template #icon>
                              <n-icon :component="Trash" />
                            </template>
                          </n-button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <n-button size="tiny" dashed @click="addUrlEncodedField">
                    <template #icon>
                      <n-icon :component="Plus" />
                    </template>
                    {{ t('tools.http-client.addUrlEncodedField') }}
                  </n-button>
                </div>
              </div>

              <!-- 4.5 Raw Body -->
              <div v-else-if="bodyConfig.type === 'raw'" class="flex flex-col gap-2">
                <n-input
                  v-model:value="bodyConfig.rawText"
                  type="textarea"
                  :autosize="{ minRows: 4, maxRows: 12 }"
                  class="font-mono text-xs"
                  placeholder="Plain text, XML, HTML..."
                />
              </div>
            </div>
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-card>

    <!-- 响应呈现卡片 -->
    <n-card class="shadow-sm rounded-12px min-w-0" size="small">
      <!-- 响应头部状态栏 -->
      <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-2 flex-wrap min-w-0">
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {{ t('tools.http-client.response') }}
          </span>

          <template v-if="responseSnapshot">
            <!-- 状态码徽章 -->
            <n-tag :type="statusTagType" round :bordered="false" size="small" class="font-mono font-bold">
              {{ responseSnapshot.status }} {{ responseSnapshot.statusText }}
            </n-tag>

            <!-- 耗时徽章 -->
            <n-tag :bordered="false" size="small" type="default" class="font-mono">
              <template #icon>
                <n-icon :component="Clock" />
              </template>
              {{ responseSnapshot.durationMs }} ms
            </n-tag>

            <!-- 体积徽章 -->
            <n-tag :bordered="false" size="small" type="default" class="font-mono">
              {{ formatBytes(responseSnapshot.sizeBytes) }}
            </n-tag>
          </template>
        </div>

        <!-- 响应操作按钮 -->
        <div v-if="responseSnapshot" class="flex items-center gap-2">
          <n-button
            v-if="activeResponseTab === 'body'"
            size="tiny"
            secondary
            @click="handleCopyBody"
          >
            <template #icon>
              <n-icon :component="Copy" />
            </template>
            {{ t('tools.http-client.copyBody') }}
          </n-button>

          <n-button
            v-else-if="activeResponseTab === 'headers'"
            size="tiny"
            secondary
            @click="handleCopyHeaders"
          >
            <template #icon>
              <n-icon :component="Copy" />
            </template>
            {{ t('tools.http-client.copyHeaders') }}
          </n-button>
        </div>
      </div>

      <!-- 智能 CORS 异常诊断分析卡片 (CORS Diagnostic Guard) -->
      <n-alert
        v-if="errorMessage && corsDiagnostic && corsDiagnostic.isLikelyCors"
        type="warning"
        class="my-3 rounded-8px"
        :title="t('tools.http-client.corsGuardTitle')"
      >
        <template #icon>
          <n-icon :component="AlertTriangle" />
        </template>
        <div class="flex flex-col gap-2 mt-1">
          <div class="text-xs text-gray-700 dark:text-gray-200">
            {{ corsDiagnostic.message }}
          </div>

          <div v-if="corsDiagnostic.suggestions.length > 0" class="mt-1">
            <div class="font-semibold text-xs text-gray-700 dark:text-gray-300">
              {{ t('tools.http-client.corsRemedies') }}:
            </div>
            <ul class="list-disc pl-4 space-y-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
              <li v-for="(suggestion, idx) in corsDiagnostic.suggestions" :key="idx">
                {{ suggestion }}
              </li>
            </ul>
          </div>

          <!-- 一键复制为 cURL 在终端直接执行以绕过浏览器跨域限制 -->
          <div class="mt-2 flex items-center gap-2">
            <n-button
              size="small"
              type="primary"
              secondary
              @click="handleCopyAsCurl"
            >
              <template #icon>
                <n-icon :component="Terminal2" />
              </template>
              {{ t('tools.http-client.runInTerminal') }}
            </n-button>
          </div>
        </div>
      </n-alert>

      <!-- 普通请求异常提示 -->
      <n-alert
        v-else-if="errorMessage"
        type="error"
        class="my-3 rounded-8px"
        :title="corsDiagnostic?.title || t('tools.http-client.requestFailed')"
      >
        {{ errorMessage }}
      </n-alert>

      <!-- 响应内容展示区 -->
      <div class="mt-3 min-w-0">
        <!-- 加载中态 -->
        <div
          v-if="isLoading"
          class="py-16 flex flex-col items-center justify-center gap-3 text-gray-400"
        >
          <n-spin size="large" />
          <span class="text-sm">{{ t('tools.http-client.sending') }}</span>
        </div>

        <!-- 结果详情 Tab -->
        <template v-else-if="responseSnapshot">
          <n-tabs v-model:value="activeResponseTab" type="line" size="small">
            <!-- 1. 响应体 Tab -->
            <n-tab-pane name="body" :tab="t('tools.http-client.body')">
              <div class="flex items-center justify-end mb-2 gap-2">
                <n-button-group size="tiny">
                  <n-button
                    :type="bodyViewMode === 'pretty' ? 'primary' : 'default'"
                    @click="bodyViewMode = 'pretty'"
                  >
                    {{ t('tools.http-client.pretty') }}
                  </n-button>
                  <n-button
                    :type="bodyViewMode === 'raw' ? 'primary' : 'default'"
                    @click="bodyViewMode = 'raw'"
                  >
                    {{ t('tools.http-client.raw') }}
                  </n-button>
                </n-button-group>
              </div>

              <!-- 抗溢出自适应代码折行容器 -->
              <div class="overflow-x-auto max-w-full min-w-0 rounded-8px border border-gray-100 dark:border-gray-800 p-2 bg-gray-50 dark:bg-gray-900">
                <n-code
                  v-if="displayBody"
                  :code="displayBody"
                  :language="responseSnapshot.isJson && bodyViewMode === 'pretty' ? 'json' : 'plaintext'"
                  word-wrap
                  class="font-mono text-xs leading-relaxed"
                />
                <span v-else class="text-xs text-gray-400 italic">
                  (Empty Body)
                </span>
              </div>
            </n-tab-pane>

            <!-- 2. 响应头 Tab -->
            <n-tab-pane name="headers" :tab="t('tools.http-client.headers')">
              <div v-if="responseSnapshot.headersList.length > 0" class="overflow-x-auto max-w-full min-w-0">
                <n-table :bordered="false" :single-line="false" size="small" class="text-xs font-mono">
                  <thead>
                    <tr>
                      <th style="width: 35%">
                        {{ t('tools.http-client.headerKey') }}
                      </th>
                      <th>{{ t('tools.http-client.headerValue') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in responseSnapshot.headersList" :key="item.key">
                      <td class="font-semibold text-gray-700 dark:text-gray-300 break-all">
                        {{ item.key }}
                      </td>
                      <td class="text-gray-600 dark:text-gray-400 break-all select-text">
                        {{ item.value }}
                      </td>
                    </tr>
                  </tbody>
                </n-table>
              </div>
              <div v-else class="text-xs text-gray-400 py-6 text-center">
                {{ t('tools.http-client.noHeaders') }}
              </div>
            </n-tab-pane>

            <!-- 3. 已发要素审查 Tab -->
            <n-tab-pane v-if="lastSentRequest" name="sent" :tab="t('tools.http-client.tabRequestSent')">
              <div class="flex flex-col gap-3 py-1 font-mono text-xs">
                <!-- 实际目标 URL -->
                <div>
                  <span class="text-gray-500 font-semibold">{{ t('tools.http-client.sentUrl') }}:</span>
                  <div class="mt-1 p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 break-all">
                    <span class="text-blue-600 font-bold mr-2">{{ lastSentRequest.method }}</span>
                    <span>{{ lastSentRequest.fullUrl }}</span>
                  </div>
                </div>

                <!-- 实际请求 Headers -->
                <div>
                  <span class="text-gray-500 font-semibold">{{ t('tools.http-client.sentHeaders') }}:</span>
                  <div class="mt-1 overflow-x-auto max-w-full min-w-0">
                    <n-table :bordered="false" size="small" class="text-xs">
                      <tbody>
                        <tr v-for="h in lastSentRequest.headersList" :key="h.key">
                          <td style="width: 35%" class="font-semibold text-gray-700 dark:text-gray-300">{{ h.key }}</td>
                          <td class="text-gray-600 dark:text-gray-400 break-all select-text">{{ h.value }}</td>
                        </tr>
                      </tbody>
                    </n-table>
                  </div>
                </div>

                <!-- 实际请求 Body 载荷概要 -->
                <div>
                  <span class="text-gray-500 font-semibold">{{ t('tools.http-client.sentBody') }} ({{ lastSentRequest.bodyType }}):</span>
                  <div class="mt-1 p-2 rounded bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-x-auto max-w-full min-w-0">
                    <n-code
                      v-if="lastSentRequest.bodySummary"
                      :code="lastSentRequest.bodySummary"
                      :language="lastSentRequest.bodyType === 'json' ? 'json' : 'plaintext'"
                      word-wrap
                      class="text-xs"
                    />
                    <span v-else class="text-gray-400 italic">
                      {{ t('tools.http-client.noSentBody') }}
                    </span>
                  </div>
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </template>

        <!-- 空状态提示 -->
        <n-empty
          v-else-if="!errorMessage"
          class="py-16"
          :description="t('tools.http-client.emptyResponse')"
        >
          <template #icon>
            <n-icon :component="FileText" class="text-gray-300 dark:text-gray-600" />
          </template>
        </n-empty>
      </div>
    </n-card>

    <!-- 从 cURL 导入弹窗 -->
    <n-modal
      v-model:show="showImportCurlModal"
      preset="card"
      :title="t('tools.http-client.importCurlTitle')"
      class="max-w-650px rounded-12px"
    >
      <div class="flex flex-col gap-3">
        <n-input
          v-model:value="curlInputText"
          type="textarea"
          :rows="8"
          class="font-mono text-xs"
          :placeholder="t('tools.http-client.importCurlPlaceholder')"
        />
        <div class="flex justify-end gap-2">
          <n-button size="small" @click="showImportCurlModal = false">
            {{ t('tools.http-client.cancel') }}
          </n-button>
          <n-button size="small" type="primary" @click="handleConfirmImportCurl">
            {{ t('tools.http-client.importCurlConfirm') }}
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- 请求历史记录抽屉 (LocalStorage 持久化与配额防御) -->
    <n-drawer v-model:show="showHistoryDrawer" :width="460" placement="right">
      <n-drawer-content :title="t('tools.http-client.historyTitle')" closable>
        <div class="flex flex-col gap-3 h-full min-w-0">
          <!-- 抽屉头部搜索与统计栏 -->
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-gray-500">
              {{ t('tools.http-client.historyCount', { count: history.length }) }}
            </span>
            <n-button
              v-if="history.length > 0"
              size="tiny"
              quaternary
              type="error"
              @click="handleClearHistory"
            >
              <template #icon>
                <n-icon :component="Trash" />
              </template>
              {{ t('tools.http-client.clearHistory') }}
            </n-button>
          </div>

          <!-- 搜索过滤框 -->
          <n-input
            v-if="history.length > 0"
            v-model:value="historySearchQuery"
            size="small"
            clearable
            :placeholder="t('tools.http-client.filterHistoryPlaceholder')"
          >
            <template #prefix>
              <n-icon :component="Search" class="text-gray-400" />
            </template>
          </n-input>

          <!-- 历史记录列表 -->
          <div v-if="filteredHistory.length > 0" class="flex flex-col gap-2 overflow-y-auto flex-1 pr-1 min-w-0">
            <div
              v-for="item in filteredHistory"
              :key="item.id"
              class="p-2.5 rounded-8px border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-850 hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex flex-col gap-1.5 min-w-0"
            >
              <!-- 顶部状态栏：Method + URL + 响应状态 -->
              <div class="flex items-center justify-between gap-2 min-w-0">
                <div class="flex items-center gap-1.5 min-w-0 flex-1">
                  <n-tag
                    :type="getMethodTagType(item.request.method)"
                    size="tiny"
                    round
                    :bordered="false"
                    class="font-mono font-bold shrink-0"
                  >
                    {{ item.request.method }}
                  </n-tag>
                  <span
                    class="font-mono text-xs truncate text-gray-700 dark:text-gray-200"
                    :title="item.request.url"
                  >
                    {{ item.request.url }}
                  </span>
                </div>

                <!-- 响应结果徽章 (若有) -->
                <n-tag
                  v-if="item.response"
                  :type="getStatusTagType(classifyStatus(item.response.status))"
                  size="tiny"
                  :bordered="false"
                  class="font-mono shrink-0"
                >
                  {{ item.response.status }}
                </n-tag>
              </div>

              <!-- 底部详情栏：时间 + 耗时/大小 + 恢复按钮 -->
              <div class="flex items-center justify-between text-11px text-gray-400 mt-1">
                <div class="flex items-center gap-2">
                  <span>{{ formatHistoryDate(item.timestamp) }}</span>
                  <span v-if="item.response">
                    {{ item.response.durationMs }}ms · {{ formatBytes(item.response.sizeBytes) }}
                  </span>
                </div>

                <n-button
                  size="tiny"
                  secondary
                  type="primary"
                  @click="restoreFromHistory(item)"
                >
                  {{ t('tools.http-client.restoreRequest') }}
                </n-button>
              </div>
            </div>
          </div>

          <!-- 空历史提示 -->
          <div
            v-else
            class="flex-1 flex flex-col items-center justify-center text-gray-400 py-12 gap-2 text-xs"
          >
            <n-icon :component="History" size="32" class="text-gray-300 dark:text-gray-600" />
            <span>{{ t('tools.http-client.emptyHistory') }}</span>
          </div>
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.http-client {
  /* 确保响应式卡片不会横向撑开 */
  max-width: 100%;
}
</style>
