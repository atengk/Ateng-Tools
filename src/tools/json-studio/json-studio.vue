<!--
 * JSON Studio 核心工作台视图组件
 *
 * @author Ateng
 * @since 2026-10-02
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { useResizeObserver, useStorage } from '@vueuse/core';
import * as monaco from 'monaco-editor';
import hljs from 'highlight.js/lib/core';
import jsonHljs from 'highlight.js/lib/languages/json';
import {
  AlertTriangle,
  ArrowsMinimize,
  Braces,
  ChartBar,
  Check,
  Copy,
  Download,
  Exchange,
  Eye,
  FileCode,
  FileText,
  Hierarchy2,
  Refresh,
  Search,
  Trash,
  Wand,
} from '@vicons/tabler';
import JsonTreeNodeComponent from './components/json-tree-node.vue';
import { useStyleStore } from '@/stores/style.store';
import { useCopy } from '@/composable/copy';
import {
  buildJsonTree,
  calculateBasicMetrics,
  calculateDetailedMetrics,
  collectAllContainerIds,
  collectNodeIdsByDepth,
  escapeJsonString,
  filterJsonTree,
  flattenJson,
  formatBytes,
  formatJson,
  getNodeValueForCopy,
  getSampleJson,
  minifyJson,
  queryJsonPath,
  smartRepairJson,
  transformKeyCase,
  unescapeJsonString,
  unflattenJson,
  validateJson,
} from './json-studio.service';
import type {
  IndentType,
  JsonPathQueryResult,
  JsonTreeNode,
  KeyCaseType,
  SmartRepairResult,
  TransformResult,
} from './json-studio.types';

hljs.registerLanguage('json', jsonHljs);

const { t } = useI18n();
const message = useMessage();
const styleStore = useStyleStore();
const { copy } = useCopy({ createToast: false });

const rawJson = useStorage('json-studio:raw-json', getSampleJson());
const indentType = useStorage<IndentType>('json-studio:indent-type', 2);
const activeTab = useStorage('json-studio:active-tab', 'tree');

// 树形透视状态
const treeSearch = ref('');
const expandedTreeIds = ref<Set<string>>(new Set());

// 智能修复与转义状态
const repairResult = ref<SmartRepairResult | null>(null);
const escapeResult = ref<{ type: 'escape' | 'unescape'; content: string } | null>(null);

// JSONPath 查询状态
const jsonPathExpression = ref('$..author');
const jsonPathResult = ref<JsonPathQueryResult | null>(null);
const jsonPathHighlightedPaths = ref<Set<string>>(new Set());

// 结构与命名转换状态
const selectedKeyCase = ref<KeyCaseType>('camelCase');
const caseTransformResult = ref<TransformResult | null>(null);
const flattenResult = ref<{ type: 'flatten' | 'unflatten'; content: string } | null>(null);

const keyCaseOptions = computed(() => [
  { label: t('tools.json-studio.caseCamel', 'camelCase (小驼峰)'), value: 'camelCase' },
  { label: t('tools.json-studio.caseSnake', 'snake_case (下划线)'), value: 'snake_case' },
  { label: t('tools.json-studio.caseKebab', 'kebab-case (中划线)'), value: 'kebab-case' },
  { label: t('tools.json-studio.casePascal', 'PascalCase (大驼峰)'), value: 'pascalCase' },
]);

const editorContainer = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let isUpdatingFromEditor = false;

// 响应式校验与度量指标
const validation = computed(() => validateJson(rawJson.value));
const metrics = computed(() => calculateDetailedMetrics(rawJson.value));

// 构建树形结构
const parsedJsonTree = computed<JsonTreeNode | null>(() => {
  if (!validation.value.isValid || rawJson.value.trim() === '') {
    return null;
  }
  try {
    const parsed = JSON.parse(rawJson.value);
    return buildJsonTree(parsed);
  } catch {
    return null;
  }
});

// 过滤树形结构与搜索匹配
const filteredTreeResult = computed(() => {
  if (!parsedJsonTree.value) {
    return {
      filteredNode: null,
      matchedCount: 0,
      matchedPaths: new Set<string>(),
      expandedIds: new Set<string>(),
    };
  }
  return filterJsonTree(parsedJsonTree.value, treeSearch.value);
});

// 综合树形图高亮路径集合 (树内搜索高亮 + JSONPath 联动高亮)
const combinedMatchedPaths = computed(() => {
  const paths = new Set<string>(filteredTreeResult.value.matchedPaths);
  for (const p of jsonPathHighlightedPaths.value) {
    paths.add(p);
  }
  return paths;
});


// 初始化默认展开前两层 (根节点 + 第一层)
watch(
  parsedJsonTree,
  newTree => {
    if (newTree && expandedTreeIds.value.size === 0) {
      const initialIds = collectNodeIdsByDepth(newTree, 2);
      expandedTreeIds.value = new Set(initialIds);
    }
  },
  { immediate: true },
);

// 当有搜索词时，自动展开命中的路径
watch(
  () => filteredTreeResult.value.expandedIds,
  searchExpanded => {
    if (treeSearch.value.trim() !== '') {
      expandedTreeIds.value = new Set([...expandedTreeIds.value, ...searchExpanded]);
    }
  },
);

// 缩进选项
const indentOptions = computed(() => [
  { label: t('tools.json-studio.indent2Spaces', '2 空格'), value: 2 },
  { label: t('tools.json-studio.indent4Spaces', '4 空格'), value: 4 },
  { label: t('tools.json-studio.indentTab', 'Tab 制表符'), value: 'tab' },
]);

// 注册 Monaco 主题透明适配
monaco.editor.defineTheme('ateng-tools-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#00000000',
  },
});

monaco.editor.defineTheme('ateng-tools-light', {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#00000000',
  },
});

// 监听暗黑主题实时切换 Monaco
watch(
  () => styleStore.isDarkTheme,
  isDark => monaco.editor.setTheme(isDark ? 'ateng-tools-dark' : 'ateng-tools-light'),
  { immediate: true },
);

// 监听缩进设置调整 Monaco tabSize
watch(
  () => indentType.value,
  val => {
    editor?.updateOptions({
      tabSize: val === 4 ? 4 : 2,
      insertSpaces: val !== 'tab',
    });
  },
);

// 双向监听 rawJson 变更同步至编辑器
watch(
  () => rawJson.value,
  newVal => {
    if (editor && editor.getValue() !== newVal) {
      isUpdatingFromEditor = true;
      const pos = editor.getPosition();
      editor.setValue(newVal);
      if (pos) {
        editor.setPosition(pos);
      }
      isUpdatingFromEditor = false;
    }
  },
);

useResizeObserver(editorContainer, () => {
  editor?.layout();
});

onMounted(() => {
  if (!editorContainer.value) {
    return;
  }

  editor = monaco.editor.create(editorContainer.value, {
    value: rawJson.value,
    language: 'json',
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    folding: true,
    wordWrap: 'on',
    fontSize: 13,
    tabSize: indentType.value === 4 ? 4 : 2,
    insertSpaces: indentType.value !== 'tab',
    theme: styleStore.isDarkTheme ? 'ateng-tools-dark' : 'ateng-tools-light',
  });

  editor.onDidChangeModelContent(() => {
    if (isUpdatingFromEditor) {
      return;
    }
    const val = editor?.getValue() ?? '';
    isUpdatingFromEditor = true;
    rawJson.value = val;
    isUpdatingFromEditor = false;
  });
});

onBeforeUnmount(() => {
  editor?.dispose();
  editor = null;
});

// 操作栏核心动作
function handleFormat() {
  if (rawJson.value.trim() === '') {
    message.warning(t('tools.json-studio.emptyWarningToast', '请先输入 JSON 内容'));
    return;
  }
  const result = formatJson(rawJson.value, { indent: indentType.value });
  if (result.success) {
    rawJson.value = result.output;
    message.success(t('tools.json-studio.formatSuccessToast', 'JSON 格式化排版完成'));
  } else {
    message.error(result.error ?? t('tools.json-studio.statusInvalid', '语法错误'));
  }
}

function handleMinify() {
  if (rawJson.value.trim() === '') {
    message.warning(t('tools.json-studio.emptyWarningToast', '请先输入 JSON 内容'));
    return;
  }
  const result = minifyJson(rawJson.value);
  if (result.success) {
    rawJson.value = result.output;
    message.success(t('tools.json-studio.minifySuccessToast', 'JSON 单行压缩完成'));
  } else {
    message.error(result.error ?? t('tools.json-studio.statusInvalid', '语法错误'));
  }
}

function handleLoadSample() {
  rawJson.value = getSampleJson();
  message.success(t('tools.json-studio.sampleLoadedToast', '已加载示例 JSON 数据'));
}

function handleClear() {
  rawJson.value = '';
  message.info(t('tools.json-studio.clearSuccessToast', '编辑器内容已清空'));
}

function handleCopy() {
  if (rawJson.value.trim() === '') {
    message.warning(t('tools.json-studio.emptyWarningToast', '请先输入 JSON 内容'));
    return;
  }
  copy(rawJson.value);
  message.success(t('tools.json-studio.copySuccessToast', '内容已复制至剪贴板'));
}

function handleDownload() {
  if (rawJson.value.trim() === '') {
    message.warning(t('tools.json-studio.emptyWarningToast', '请先输入 JSON 内容'));
    return;
  }
  const blob = new Blob([rawJson.value], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `data-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  message.success(t('tools.json-studio.downloadSuccessToast', 'JSON 文件已开始下载'));
}

// 树形透视交互动作
function handleToggleExpand(id: string) {
  const next = new Set(expandedTreeIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expandedTreeIds.value = next;
}

function handleExpandAll() {
  if (!parsedJsonTree.value) {
    return;
  }
  const allIds = collectAllContainerIds(parsedJsonTree.value);
  expandedTreeIds.value = new Set(allIds);
}

function handleCollapseAll() {
  expandedTreeIds.value = new Set();
}

function handleExpandDepth(depth: number) {
  if (!parsedJsonTree.value) {
    return;
  }
  const ids = collectNodeIdsByDepth(parsedJsonTree.value, depth);
  expandedTreeIds.value = new Set(ids);
}

function handleCopyPath(path: string) {
  copy(path);
  message.success(t('tools.json-studio.copyPathSuccessToast', { path }));
}

function handleCopyValue(node: JsonTreeNode) {
  const val = getNodeValueForCopy(node);
  copy(val);
  message.success(t('tools.json-studio.copyValueSuccessToast', '节点值已复制至剪贴板'));
}

// 智能修复与转义动作
function handleSmartRepair() {
  if (rawJson.value.trim() === '') {
    message.warning(t('tools.json-studio.emptyWarningToast', '请先输入 JSON 内容'));
    return;
  }
  const result = smartRepairJson(rawJson.value);
  repairResult.value = result;
  const rules = result.repairedRules ?? result.appliedRules ?? [];
  if (result.success) {
    if (rules.length === 0) {
      message.info(t('tools.json-studio.repairValidTip', '当前编辑器中的 JSON 语法严格合法，无需修复。'));
    } else {
      message.success(
        t('tools.json-studio.repairSuccessToast', { count: rules.length }),
      );
    }
  } else {
    message.error(result.error ?? t('tools.json-studio.repairFailedToast', '智能修复未成功，请检查语法结构'));
  }
}

function handleApplyRepaired() {
  const text = repairResult.value?.repairedText ?? repairResult.value?.repairedJson;
  if (!text) {
    return;
  }
  rawJson.value = text;
  message.success(t('tools.json-studio.appliedToEditorToast', '已成功将修复内容应用回编辑器'));
}

function handleCopyRepaired() {
  const text = repairResult.value?.repairedText ?? repairResult.value?.repairedJson;
  if (!text) {
    return;
  }
  copy(text);
  message.success(t('tools.json-studio.copySuccessToast', '内容已复制至剪贴板'));
}

function handleUnescapeAction() {
  if (rawJson.value.trim() === '') {
    message.warning(t('tools.json-studio.emptyWarningToast', '请先输入 JSON 内容'));
    return;
  }
  const result = unescapeJsonString(rawJson.value);
  escapeResult.value = {
    type: 'unescape',
    content: result.output,
  };
  message.success(t('tools.json-studio.unescapeSuccessToast', '反转义还原完成'));
}

function handleEscapeAction() {
  if (rawJson.value.trim() === '') {
    message.warning(t('tools.json-studio.emptyWarningToast', '请先输入 JSON 内容'));
    return;
  }
  const result = escapeJsonString(rawJson.value);
  escapeResult.value = {
    type: 'escape',
    content: result.output,
  };
  message.success(t('tools.json-studio.escapeSuccessToast', '代码字符串转义完成'));
}

function handleApplyEscapeResult() {
  if (!escapeResult.value || !escapeResult.value.content) {
    return;
  }
  rawJson.value = escapeResult.value.content;
  message.success(t('tools.json-studio.appliedToEditorToast', '已成功将修复内容应用回编辑器'));
}

function handleCopyEscapeResult() {
  if (!escapeResult.value || !escapeResult.value.content) {
    return;
  }
  copy(escapeResult.value.content);
  message.success(t('tools.json-studio.copySuccessToast', '内容已复制至剪贴板'));
}

// JSONPath 常用预设表达式
const jsonPathPresets = computed(() => [
  {
    label: t('tools.json-studio.jsonPathPresetAllAuthors', '所有书籍作者 ($..author)'),
    value: '$..author',
  },
  {
    label: t('tools.json-studio.jsonPathPresetAllBooks', '所有书籍对象 ($.store.book[*])'),
    value: '$.store.book[*]',
  },
  {
    label: t('tools.json-studio.jsonPathPresetCheapBooks', '价格小于 10 的书籍 (price < 10)'),
    value: '$.store.book[?(@.price < 10)]',
  },
  {
    label: t('tools.json-studio.jsonPathPresetFirstTwoBooks', '前两本书籍 ($.store.book[0:2])'),
    value: '$.store.book[0:2]',
  },
  {
    label: t('tools.json-studio.jsonPathPresetAllPrices', '全树所有价格属性 ($..price)'),
    value: '$..price',
  },
]);

// 级联展开树形图中所有命中路径的祖先节点
function expandPathsInTree(paths: string[]) {
  const nextExpanded = new Set(expandedTreeIds.value);
  for (const p of paths) {
    const clean = p.startsWith('$') ? p.slice(1) : p;
    let currentPrefix = 'root';
    nextExpanded.add('root');
    const matches = clean.matchAll(/(?:\.([a-zA-Z0-9_$]+)|\[(\d+|'[^']+'|"[^"]+")\])/g);
    for (const m of matches) {
      if (m[1]) {
        currentPrefix += `.${m[1]}`;
      } else if (m[2]) {
        currentPrefix += `[${m[2]}]`;
      }
      nextExpanded.add(currentPrefix);
    }
  }
  expandedTreeIds.value = nextExpanded;
}

// JSONPath 查询控制台动作
function handleRunJsonPath() {
  if (rawJson.value.trim() === '') {
    message.warning(t('tools.json-studio.emptyWarningToast', '请先输入 JSON 内容'));
    return;
  }
  if (jsonPathExpression.value.trim() === '') {
    message.warning(t('tools.json-studio.jsonPathPlaceholder', '请输入 JSONPath 表达式'));
    return;
  }

  const res = queryJsonPath(rawJson.value, jsonPathExpression.value);
  jsonPathResult.value = res;

  if (res.success) {
    jsonPathHighlightedPaths.value = new Set(res.matchedPaths);
    expandPathsInTree(res.matchedPaths);
    if (res.results.length > 0) {
      message.success(
        t('tools.json-studio.jsonPathQuerySuccessToast', { count: res.results.length }),
      );
    } else {
      message.info(t('tools.json-studio.jsonPathNoMatches', '未检索到任何匹配的节点'));
    }
  } else {
    message.error(res.error ?? 'JSONPath 查询失败');
  }
}

function handlePresetSelect(val: string) {
  jsonPathExpression.value = val;
  handleRunJsonPath();
}

function handleCopyJsonPathResults() {
  if (!jsonPathResult.value || jsonPathResult.value.results.length === 0) {
    return;
  }
  const text = JSON.stringify(jsonPathResult.value.results, null, 2);
  copy(text);
  message.success(t('tools.json-studio.copySuccessToast', '内容已复制至剪贴板'));
}

function handleExportJsonPathResults() {
  if (!jsonPathResult.value || jsonPathResult.value.results.length === 0) {
    return;
  }
  const text = JSON.stringify(jsonPathResult.value.results, null, 2);
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `jsonpath-results-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  message.success(t('tools.json-studio.jsonPathExportSuccessToast', '提取结果文件已开始下载'));
}

function handleJumpToTree() {
  activeTab.value = 'tree';
}

function handleClearTreeHighlight() {
  jsonPathHighlightedPaths.value = new Set();
  message.info(t('tools.json-studio.clearTreeHighlightBtn', '已清除树形高亮'));
}

// 结构与命名转换动作
function handleRunCaseTransform() {
  if (rawJson.value.trim() === '') {
    message.warning(t('tools.json-studio.emptyWarningToast', '请先输入 JSON 内容'));
    return;
  }
  const res = transformKeyCase(rawJson.value, selectedKeyCase.value);
  caseTransformResult.value = res;
  if (res.success) {
    message.success(t('tools.json-studio.transformCaseSuccessToast', '键名风格批量转换完成'));
  } else {
    message.error(res.error ?? '键名风格转换失败');
  }
}

function handleApplyCaseTransform() {
  if (!caseTransformResult.value || !caseTransformResult.value.output) {
    return;
  }
  rawJson.value = caseTransformResult.value.output;
  message.success(t('tools.json-studio.appliedToEditorToast', '已成功将转换结果应用回编辑器'));
}

function handleCopyCaseTransform() {
  if (!caseTransformResult.value || !caseTransformResult.value.output) {
    return;
  }
  copy(caseTransformResult.value.output);
  message.success(t('tools.json-studio.copySuccessToast', '内容已复制至剪贴板'));
}

function handleFlatten() {
  if (rawJson.value.trim() === '') {
    message.warning(t('tools.json-studio.emptyWarningToast', '请先输入 JSON 内容'));
    return;
  }
  const res = flattenJson(rawJson.value);
  if (res.success) {
    flattenResult.value = {
      type: 'flatten',
      content: res.output,
    };
    message.success(t('tools.json-studio.flattenSuccessToast', '扁平化转换完成'));
  } else {
    message.error(res.error ?? '扁平化转换失败');
  }
}

function handleUnflatten() {
  if (rawJson.value.trim() === '') {
    message.warning(t('tools.json-studio.emptyWarningToast', '请先输入 JSON 内容'));
    return;
  }
  const res = unflattenJson(rawJson.value);
  if (res.success) {
    flattenResult.value = {
      type: 'unflatten',
      content: res.output,
    };
    message.success(t('tools.json-studio.unflattenSuccessToast', '逆还原嵌套结构完成'));
  } else {
    message.error(res.error ?? '逆还原转换失败');
  }
}

function handleApplyFlattenResult() {
  if (!flattenResult.value || !flattenResult.value.content) {
    return;
  }
  rawJson.value = flattenResult.value.content;
  message.success(t('tools.json-studio.appliedToEditorToast', '已成功将转换结果应用回编辑器'));
}

function handleCopyFlattenResult() {
  if (!flattenResult.value || !flattenResult.value.content) {
    return;
  }
  copy(flattenResult.value.content);
  message.success(t('tools.json-studio.copySuccessToast', '内容已复制至剪贴板'));
}
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <!-- 客户端性能防御门禁预警横幅 -->
    <n-alert
      v-if="metrics.rawBytes > 10 * 1024 * 1024"
      type="error"
      class="shadow-sm"
      :title="t('tools.json-studio.guardExtremeTitle', '⚠️ 巨型数据防御警告 (> 10MB)')"
    >
      {{ t('tools.json-studio.guardExtremeDesc', '当前输入体积已超过 10MB，建议优先使用单行压缩与文件导出，谨慎进行全树全展开或密集搜索以保障浏览器流畅度。') }}
    </n-alert>
    <n-alert
      v-else-if="metrics.rawBytes > 2 * 1024 * 1024"
      type="warning"
      class="shadow-sm"
      :title="t('tools.json-studio.guardLargeTitle', '⚡ 大文本模式已激活 (2MB ~ 10MB)')"
    >
      {{ t('tools.json-studio.guardLargeDesc', '当前数据体积较大，树形透视器已启用按需折叠，推荐优先通过 JSONPath 定向检索目标节点。') }}
    </n-alert>

    <!-- 常驻顶栏操作工具条 -->
    <n-card :bordered="false" class="shadow-sm">
      <div class="flex flex-wrap items-center justify-center gap-3">
        <n-button type="primary" secondary @click="handleFormat">
          <template #icon>
            <n-icon :component="Braces" />
          </template>
          {{ t('tools.json-studio.formatBtn', '格式化排版') }}
        </n-button>

        <n-button secondary @click="handleMinify">
          <template #icon>
            <n-icon :component="ArrowsMinimize" />
          </template>
          {{ t('tools.json-studio.minifyBtn', '单行压缩') }}
        </n-button>

        <n-input-group style="width: auto">
          <n-input-group-label size="small">
            {{ t('tools.json-studio.indentLabel', '缩进设置') }}
          </n-input-group-label>
          <n-select
            v-model:value="indentType"
            size="small"
            style="width: 110px"
            :options="indentOptions"
          />
        </n-input-group>

        <n-button secondary @click="handleLoadSample">
          <template #icon>
            <n-icon :component="Wand" />
          </template>
          {{ t('tools.json-studio.sampleBtn', '示例数据') }}
        </n-button>

        <n-button secondary @click="handleCopy">
          <template #icon>
            <n-icon :component="Copy" />
          </template>
          {{ t('tools.json-studio.copyBtn', '复制内容') }}
        </n-button>

        <n-button secondary @click="handleDownload">
          <template #icon>
            <n-icon :component="Download" />
          </template>
          {{ t('tools.json-studio.downloadBtn', '导出文件') }}
        </n-button>

        <n-button secondary type="error" @click="handleClear">
          <template #icon>
            <n-icon :component="Trash" />
          </template>
          {{ t('tools.json-studio.clearBtn', '清空输入') }}
        </n-button>
      </div>
    </n-card>

    <!-- 双栏响应式抗溢出工作台主体 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start w-full">
      <!-- 左栏：Monaco 代码编辑器工作区 -->
      <div class="flex flex-col gap-2 min-w-0">
        <n-card :bordered="false" class="shadow-sm min-w-0 overflow-hidden">
          <template #header>
            <div class="flex items-center justify-between gap-2 min-w-0">
              <div class="flex items-center gap-2">
                <n-icon size="18" class="text-blue-500" :component="FileCode" />
                <span class="font-medium text-base">
                  {{ t('tools.json-studio.editorTitle', 'JSON 代码编辑器') }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <n-tag
                  :type="validation.isValid ? 'success' : 'error'"
                  size="small"
                  round
                >
                  <template #icon>
                    <n-icon :component="validation.isValid ? Check : AlertTriangle" />
                  </template>
                  {{
                    validation.isValid
                      ? t('tools.json-studio.statusValid', '语法有效')
                      : t('tools.json-studio.statusInvalid', '语法错误')
                  }}
                </n-tag>
                <n-text depth="3" class="text-xs hidden sm:inline-block">
                  {{ metrics.lineCount }} {{ t('tools.json-studio.linesCount', '行') }} ·
                  {{ metrics.charCount }} {{ t('tools.json-studio.charsCount', '字符') }}
                </n-text>
              </div>
            </div>
          </template>

          <div
            ref="editorContainer"
            class="w-full h-580px rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/60"
          />

          <!-- 语法错误提示浮条 -->
          <div
            v-if="!validation.isValid && validation.error"
            class="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-2"
          >
            <n-icon size="16" class="text-red-500 mt-0.5" :component="AlertTriangle" />
            <div class="text-xs text-red-600 dark:text-red-400 font-mono break-all">
              {{ validation.error }}
            </div>
          </div>
        </n-card>
      </div>

      <!-- 右栏：多维透视与功能视窗 -->
      <div class="flex flex-col gap-2 min-w-0">
        <n-card :bordered="false" class="shadow-sm min-w-0">
          <n-tabs v-model:value="activeTab" type="line" animated>
            <!-- Tab 1: 交互式树形图 -->
            <n-tab-pane name="tree" :tab="t('tools.json-studio.tabTreeTitle', '交互式树形图')">
              <div class="flex flex-col gap-3 py-1">
                <!-- 树操作工具栏：搜索与层级控制 -->
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2 flex-1 min-w-180px max-w-260px">
                    <n-input
                      v-model:value="treeSearch"
                      size="small"
                      clearable
                      :placeholder="t('tools.json-studio.treeSearchPlaceholder', '搜索节点键名、数值或 JSONPath...')"
                    >
                      <template #prefix>
                        <n-icon :component="Search" class="text-slate-400" />
                      </template>
                    </n-input>
                    <n-tag
                      v-if="treeSearch.trim() !== ''"
                      type="info"
                      size="small"
                      round
                    >
                      {{ t('tools.json-studio.searchMatchesCount', { count: filteredTreeResult.matchedCount }) }}
                    </n-tag>
                  </div>

                  <div class="flex items-center gap-2">
                    <n-tag
                      v-if="jsonPathHighlightedPaths.size > 0"
                      type="info"
                      size="small"
                      closable
                      round
                      @close="handleClearTreeHighlight"
                    >
                      JSONPath 高亮: {{ jsonPathHighlightedPaths.size }} 项
                    </n-tag>

                    <n-button-group size="small">
                      <n-button secondary @click="handleExpandAll">
                        {{ t('tools.json-studio.expandAll', '全部展开') }}
                      </n-button>
                      <n-button secondary @click="handleCollapseAll">
                        {{ t('tools.json-studio.collapseAll', '全部折叠') }}
                      </n-button>
                      <n-button secondary @click="handleExpandDepth(1)">
                        {{ t('tools.json-studio.expandLevel1', '1 层') }}
                      </n-button>
                      <n-button secondary @click="handleExpandDepth(2)">
                        {{ t('tools.json-studio.expandLevel2', '2 层') }}
                      </n-button>
                      <n-button secondary @click="handleExpandDepth(3)">
                        {{ t('tools.json-studio.expandLevel3', '3 层') }}
                      </n-button>
                    </n-button-group>
                  </div>
                </div>

                <!-- 树形图滚动视窗 -->
                <div class="h-535px overflow-y-auto overflow-x-auto p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                  <n-empty
                    v-if="!parsedJsonTree"
                    :description="t('tools.json-studio.treeEmpty', '请在左侧输入有效 JSON 以生成交互树形图')"
                    class="py-16"
                  />
                  <n-empty
                    v-else-if="treeSearch.trim() !== '' && !filteredTreeResult.filteredNode"
                    :description="t('tools.json-studio.treeSearchNoMatch', { query: treeSearch })"
                    class="py-16"
                  />
                  <json-tree-node-component
                    v-else-if="filteredTreeResult.filteredNode"
                    :node="filteredTreeResult.filteredNode"
                    :expanded-ids="expandedTreeIds"
                    :search-query="treeSearch"
                    :matched-paths="combinedMatchedPaths"
                    :level="0"
                    @toggle-expand="handleToggleExpand"
                    @copy-path="handleCopyPath"
                    @copy-value="handleCopyValue"
                  />
                </div>
              </div>
            </n-tab-pane>

            <!-- Tab 2: 清洗修复与转义 -->
            <n-tab-pane name="repair" :tab="t('tools.json-studio.tabRepairTitle', '清洗修复与转义')">
              <div class="py-2 flex flex-col gap-6">
                <!-- 区域 1：非标语法智能修复 -->
                <div class="p-4 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <n-icon size="18" class="text-amber-500" :component="Wand" />
                      <span class="font-medium text-sm text-slate-800 dark:text-slate-100">
                        {{ t('tools.json-studio.repairSectionTitle', '非标语法智能容错修复') }}
                      </span>
                    </div>
                    <n-tag v-if="validation.isValid" type="success" size="small" round>
                      {{ t('tools.json-studio.statusValid', '语法有效') }}
                    </n-tag>
                    <n-tag v-else type="error" size="small" round>
                      {{ t('tools.json-studio.statusInvalid', '语法错误') }}
                    </n-tag>
                  </div>

                  <n-text depth="3" class="text-xs">
                    {{ t('tools.json-studio.repairSectionDesc', '智能补全未加引号的键名、纠正单引号、清除尾随逗号、剥离代码注释并纠偏 Python 字面量。') }}
                  </n-text>

                  <div class="flex items-center justify-center gap-3 pt-1">
                    <n-button type="warning" secondary @click="handleSmartRepair">
                      <template #icon>
                        <n-icon :component="Wand" />
                      </template>
                      {{ t('tools.json-studio.repairRunBtn', '检测并智能修复') }}
                    </n-button>
                  </div>

                  <!-- 修复结果展示 -->
                  <div v-if="repairResult" class="flex flex-col gap-2 mt-2 pt-3 border-t border-slate-200/80 dark:border-slate-700/60">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div class="flex flex-wrap items-center gap-1.5">
                        <n-tag
                          v-for="(rule, idx) in (repairResult.repairedRules ?? repairResult.appliedRules ?? [])"
                          :key="idx"
                          type="info"
                          size="small"
                          round
                        >
                          {{ rule }}
                        </n-tag>
                        <span v-if="(repairResult.repairedRules ?? repairResult.appliedRules ?? []).length === 0" class="text-xs text-slate-500">
                          {{ t('tools.json-studio.repairValidTip', '当前编辑器中的 JSON 语法严格合法，无需修复。') }}
                        </span>
                      </div>

                      <div v-if="repairResult.repairedText || repairResult.repairedJson" class="flex items-center gap-2">
                        <n-button size="small" type="primary" secondary @click="handleApplyRepaired">
                          <template #icon>
                            <n-icon :component="Check" />
                          </template>
                          {{ t('tools.json-studio.applyToEditorBtn', '应用回左侧编辑器') }}
                        </n-button>
                        <n-button size="small" secondary @click="handleCopyRepaired">
                          <template #icon>
                            <n-icon :component="Copy" />
                          </template>
                          {{ t('tools.json-studio.copyRepairedBtn', '复制修复后内容') }}
                        </n-button>
                      </div>
                    </div>

                    <div
                      v-if="repairResult.repairedText || repairResult.repairedJson"
                      class="max-h-60 overflow-y-auto overflow-x-auto rounded border border-slate-200 dark:border-slate-700 p-2.5 bg-white dark:bg-slate-900 text-xs font-mono"
                    >
                      <n-code :hljs="hljs" :code="repairResult.repairedText || repairResult.repairedJson || ''" language="json" word-wrap />
                    </div>
                    <div v-else-if="!repairResult.success" class="text-xs text-red-500">
                      {{ repairResult.error ?? t('tools.json-studio.repairFailedToast', '智能修复未成功，请检查语法结构') }}
                    </div>
                  </div>
                </div>

                <!-- 区域 2：字符串双向转义与反转义 -->
                <div class="p-4 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-3">
                  <div class="flex items-center gap-2">
                    <n-icon size="18" class="text-blue-500" :component="Exchange" />
                    <span class="font-medium text-sm text-slate-800 dark:text-slate-100">
                      {{ t('tools.json-studio.escapeSectionTitle', '字符串双向转义与反转义') }}
                    </span>
                  </div>

                  <n-text depth="3" class="text-xs">
                    {{ t('tools.json-studio.escapeSectionDesc', '解决从日志中复制出来的转义 JSON 字符串（包含 \\\"）还原，或将 JSON 转义为代码嵌入字面量。') }}
                  </n-text>

                  <div class="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <n-button type="info" secondary @click="handleUnescapeAction">
                      <template #icon>
                        <n-icon :component="FileCode" />
                      </template>
                      {{ t('tools.json-studio.unescapeBtn', '反转义还原 JSON (Unescape)') }}
                    </n-button>

                    <n-button secondary @click="handleEscapeAction">
                      <template #icon>
                        <n-icon :component="FileText" />
                      </template>
                      {{ t('tools.json-studio.escapeBtn', '转义为代码字符串 (Escape)') }}
                    </n-button>
                  </div>

                  <!-- 转义结果展示 -->
                  <div v-if="escapeResult" class="flex flex-col gap-2 mt-2 pt-3 border-t border-slate-200/80 dark:border-slate-700/60">
                    <div class="flex items-center justify-between">
                      <n-tag :type="escapeResult.type === 'unescape' ? 'success' : 'default'" size="small">
                        {{ escapeResult.type === 'unescape' ? '反转义还原结果 (JSON)' : '代码转义字符串 (Escaped String)' }}
                      </n-tag>

                      <div class="flex items-center gap-2">
                        <n-button size="small" type="primary" secondary @click="handleApplyEscapeResult">
                          <template #icon>
                            <n-icon :component="Check" />
                          </template>
                          {{ t('tools.json-studio.applyToEditorBtn', '应用回左侧编辑器') }}
                        </n-button>
                        <n-button size="small" secondary @click="handleCopyEscapeResult">
                          <template #icon>
                            <n-icon :component="Copy" />
                          </template>
                          {{ t('tools.json-studio.copyOutputBtn', '复制结果') }}
                        </n-button>
                      </div>
                    </div>

                    <div
                      class="max-h-60 overflow-y-auto overflow-x-auto rounded border border-slate-200 dark:border-slate-700 p-2.5 bg-white dark:bg-slate-900 text-xs font-mono"
                    >
                      <n-code
                        :hljs="hljs"
                        :code="escapeResult.content"
                        :language="escapeResult.type === 'unescape' ? 'json' : undefined"
                        word-wrap
                      />
                    </div>
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <!-- Tab 3: JSONPath 提取 -->
            <n-tab-pane name="jsonpath" :tab="t('tools.json-studio.tabJsonPathTitle', 'JSONPath 提取')">
              <div class="py-2 flex flex-col gap-4">
                <!-- 顶部查询控制台卡片 -->
                <div class="p-4 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <n-icon size="18" class="text-emerald-500" :component="Search" />
                      <span class="font-medium text-sm text-slate-800 dark:text-slate-100">
                        {{ t('tools.json-studio.jsonPathSectionTitle', 'JSONPath 语法查询与结果提取') }}
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <n-select
                        size="small"
                        style="width: 220px"
                        :placeholder="t('tools.json-studio.jsonPathPresetsLabel', '快速预设示例')"
                        :options="jsonPathPresets"
                        @update:value="handlePresetSelect"
                      />
                    </div>
                  </div>

                  <n-text depth="3" class="text-xs">
                    {{ t('tools.json-studio.jsonPathSectionDesc', '基于标准 JSONPath 语法执行条件过滤、通配抽取或深度递归检索，支持双轨联动与一键导出。') }}
                  </n-text>

                  <!-- 查询输入条 -->
                  <div class="flex items-center gap-2">
                    <n-input
                      v-model:value="jsonPathExpression"
                      clearable
                      size="medium"
                      :placeholder="t('tools.json-studio.jsonPathPlaceholder', '输入 JSONPath 表达式，如 $.store.book[*].author 或 $..price...')"
                      @keydown.enter="handleRunJsonPath"
                    >
                      <template #prefix>
                        <span class="text-xs text-slate-400 font-mono font-bold">$</span>
                      </template>
                    </n-input>
                    <n-button type="primary" secondary @click="handleRunJsonPath">
                      <template #icon>
                        <n-icon :component="Search" />
                      </template>
                      {{ t('tools.json-studio.jsonPathRunBtn', '执行查询') }}
                    </n-button>
                  </div>
                </div>

                <!-- 查询结果卡片 -->
                <div
                  v-if="jsonPathResult"
                  class="p-4 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-3"
                >
                  <!-- 异常状态提示 -->
                  <div v-if="!jsonPathResult.success" class="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400">
                    {{ t('tools.json-studio.jsonPathSyntaxError', { error: jsonPathResult.error }) }}
                  </div>

                  <!-- 成功状态 -->
                  <div v-else class="flex flex-col gap-3">
                    <!-- 结果操作栏 -->
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <n-tag
                          :type="jsonPathResult.results.length > 0 ? 'success' : 'default'"
                          size="small"
                          round
                        >
                          {{ t('tools.json-studio.jsonPathMatchesBadge', { count: jsonPathResult.results.length }) }}
                        </n-tag>
                        <n-button
                          v-if="jsonPathResult.results.length > 0"
                          size="small"
                          secondary
                          type="info"
                          @click="handleJumpToTree"
                        >
                          <template #icon>
                            <n-icon :component="Eye" />
                          </template>
                          {{ t('tools.json-studio.jumpToTreeBtn', '在树形图中透视高亮') }}
                        </n-button>
                        <n-button
                          v-if="jsonPathHighlightedPaths.size > 0"
                          size="small"
                          secondary
                          @click="handleClearTreeHighlight"
                        >
                          {{ t('tools.json-studio.clearTreeHighlightBtn', '清除树形高亮') }}
                        </n-button>
                      </div>

                      <div v-if="jsonPathResult.results.length > 0" class="flex items-center gap-2">
                        <n-button size="small" secondary @click="handleCopyJsonPathResults">
                          <template #icon>
                            <n-icon :component="Copy" />
                          </template>
                          {{ t('tools.json-studio.jsonPathCopyResultsBtn', '复制提取结果') }}
                        </n-button>
                        <n-button size="small" secondary @click="handleExportJsonPathResults">
                          <template #icon>
                            <n-icon :component="Download" />
                          </template>
                          {{ t('tools.json-studio.jsonPathExportResultsBtn', '导出为 JSON') }}
                        </n-button>
                      </div>
                    </div>

                    <!-- 结果代码块或空状态 -->
                    <div
                      v-if="jsonPathResult.results.length > 0"
                      class="max-h-96 overflow-y-auto overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900 text-xs font-mono"
                    >
                      <n-code
                        :hljs="hljs"
                        :code="JSON.stringify(jsonPathResult.results, null, 2)"
                        language="json"
                        word-wrap
                      />
                    </div>
                    <n-empty
                      v-else
                      :description="t('tools.json-studio.jsonPathNoMatches', '未检索到任何匹配的节点')"
                      class="py-12"
                    />
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <!-- Tab 4: 结构与命名转换 -->
            <n-tab-pane name="transform" :tab="t('tools.json-studio.tabTransformTitle', '结构与命名转换')">
              <div class="py-2 flex flex-col gap-6">
                <!-- 区域 1：键名命名风格全递归转换 -->
                <div class="p-4 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-3">
                  <div class="flex items-center gap-2">
                    <n-icon size="18" class="text-purple-500" :component="Exchange" />
                    <span class="font-medium text-sm text-slate-800 dark:text-slate-100">
                      {{ t('tools.json-studio.transformCaseSectionTitle', '键名命名风格全递归转换') }}
                    </span>
                  </div>

                  <n-text depth="3" class="text-xs">
                    {{ t('tools.json-studio.transformCaseSectionDesc', '全递归遍历深层嵌套对象与对象数组，批量统一属性键名格式（值内容保持原样）。') }}
                  </n-text>

                  <div class="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <n-select
                      v-model:value="selectedKeyCase"
                      size="small"
                      style="width: 200px"
                      :options="keyCaseOptions"
                    />
                    <n-button type="primary" secondary @click="handleRunCaseTransform">
                      <template #icon>
                        <n-icon :component="Exchange" />
                      </template>
                      {{ t('tools.json-studio.transformRunBtn', '执行风格转换') }}
                    </n-button>
                  </div>

                  <!-- 风格转换结果展示 -->
                  <div
                    v-if="caseTransformResult"
                    class="flex flex-col gap-2 mt-2 pt-3 border-t border-slate-200/80 dark:border-slate-700/60"
                  >
                    <div class="flex items-center justify-between">
                      <n-tag type="info" size="small" round>
                        已转换为 {{ selectedKeyCase }}
                      </n-tag>

                      <div v-if="caseTransformResult.success" class="flex items-center gap-2">
                        <n-button size="small" type="primary" secondary @click="handleApplyCaseTransform">
                          <template #icon>
                            <n-icon :component="Check" />
                          </template>
                          {{ t('tools.json-studio.applyToEditorBtn', '应用回左侧编辑器') }}
                        </n-button>
                        <n-button size="small" secondary @click="handleCopyCaseTransform">
                          <template #icon>
                            <n-icon :component="Copy" />
                          </template>
                          {{ t('tools.json-studio.copyOutputBtn', '复制结果') }}
                        </n-button>
                      </div>
                    </div>

                    <div
                      v-if="caseTransformResult.success"
                      class="max-h-60 overflow-y-auto overflow-x-auto rounded border border-slate-200 dark:border-slate-700 p-2.5 bg-white dark:bg-slate-900 text-xs font-mono"
                    >
                      <n-code :hljs="hljs" :code="caseTransformResult.output" language="json" word-wrap />
                    </div>
                    <div v-else class="text-xs text-red-500">
                      {{ caseTransformResult.error }}
                    </div>
                  </div>
                </div>

                <!-- 区域 2：点号路径扁平化与逆还原 (Flatten ↔ Unflatten) -->
                <div class="p-4 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-3">
                  <div class="flex items-center gap-2">
                    <n-icon size="18" class="text-indigo-500" :component="FileText" />
                    <span class="font-medium text-sm text-slate-800 dark:text-slate-100">
                      {{ t('tools.json-studio.flattenSectionTitle', '点号路径扁平化与逆还原 (Flatten ↔ Unflatten)') }}
                    </span>
                  </div>

                  <n-text depth="3" class="text-xs">
                    {{ t('tools.json-studio.flattenSectionDesc', '将深层嵌套 JSON 展开为单层点号/方括号路径字典（如 user.name, items[0].id），或 100% 对称无损逆还原。') }}
                  </n-text>

                  <div class="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <n-button type="info" secondary @click="handleFlatten">
                      <template #icon>
                        <n-icon :component="FileText" />
                      </template>
                      {{ t('tools.json-studio.flattenBtn', '扁平化展开 (Flatten)') }}
                    </n-button>

                    <n-button secondary @click="handleUnflatten">
                      <template #icon>
                        <n-icon :component="Braces" />
                      </template>
                      {{ t('tools.json-studio.unflattenBtn', '逆还原嵌套对象 (Unflatten)') }}
                    </n-button>
                  </div>

                  <!-- 扁平化结果展示 -->
                  <div
                    v-if="flattenResult"
                    class="flex flex-col gap-2 mt-2 pt-3 border-t border-slate-200/80 dark:border-slate-700/60"
                  >
                    <div class="flex items-center justify-between">
                      <n-tag :type="flattenResult.type === 'flatten' ? 'info' : 'success'" size="small">
                        {{ flattenResult.type === 'flatten' ? '扁平化结果 (Dot-Notation)' : '逆还原嵌套结构 (Nested JSON)' }}
                      </n-tag>

                      <div class="flex items-center gap-2">
                        <n-button size="small" type="primary" secondary @click="handleApplyFlattenResult">
                          <template #icon>
                            <n-icon :component="Check" />
                          </template>
                          {{ t('tools.json-studio.applyToEditorBtn', '应用回左侧编辑器') }}
                        </n-button>
                        <n-button size="small" secondary @click="handleCopyFlattenResult">
                          <template #icon>
                            <n-icon :component="Copy" />
                          </template>
                          {{ t('tools.json-studio.copyOutputBtn', '复制结果') }}
                        </n-button>
                      </div>
                    </div>

                    <div
                      class="max-h-60 overflow-y-auto overflow-x-auto rounded border border-slate-200 dark:border-slate-700 p-2.5 bg-white dark:bg-slate-900 text-xs font-mono"
                    >
                      <n-code :hljs="hljs" :code="flattenResult.content" language="json" word-wrap />
                    </div>
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <!-- Tab 5: 度量大纲 -->
            <n-tab-pane name="metrics" :tab="t('tools.json-studio.tabMetricsTitle', '度量大纲')">
              <div class="py-2 flex flex-col gap-4">
                <!-- 模块 1：体积开销与压缩分析 -->
                <div class="p-3.5 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-3">
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-xs text-slate-700 dark:text-slate-200">体积与行数概况</span>
                    <n-tag :type="validation.isValid ? 'success' : 'error'" size="small" round>
                      {{ validation.isValid ? t('tools.json-studio.statusValid', '语法有效') : t('tools.json-studio.statusInvalid', '语法错误') }}
                    </n-tag>
                  </div>

                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div class="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col">
                      <n-text depth="3" class="text-xs">{{ t('tools.json-studio.metricRawSize', '原始体积') }}</n-text>
                      <span class="mt-1 font-semibold text-sm">{{ formatBytes(metrics.rawBytes) }}</span>
                    </div>

                    <div class="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col">
                      <n-text depth="3" class="text-xs">{{ t('tools.json-studio.metricMinifiedSize', '压缩后体积') }}</n-text>
                      <div class="mt-1 flex items-baseline gap-1.5">
                        <span class="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
                          {{ formatBytes(metrics.minifiedBytes) }}
                        </span>
                        <span v-if="metrics.compressionRatio > 0" class="text-xs text-emerald-500 font-mono">
                          -{{ metrics.compressionRatio }}%
                        </span>
                      </div>
                    </div>

                    <div class="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col">
                      <n-text depth="3" class="text-xs">{{ t('tools.json-studio.metricFormattedSize', '格式化体积') }}</n-text>
                      <span class="mt-1 font-semibold text-sm">{{ formatBytes(metrics.formattedBytes) }}</span>
                    </div>

                    <div class="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col">
                      <n-text depth="3" class="text-xs">{{ t('tools.json-studio.metricLineCount', '总行数 / 字符') }}</n-text>
                      <span class="mt-1 font-semibold text-sm">{{ metrics.lineCount }} 行 · {{ metrics.charCount }} 字</span>
                    </div>
                  </div>
                </div>

                <!-- 模块 2：结构深度与拓扑指标 -->
                <div class="p-3.5 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-3">
                  <span class="font-medium text-xs text-slate-700 dark:text-slate-200">结构复杂度与拓扑深度</span>

                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div class="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col">
                      <n-text depth="3" class="text-xs">{{ t('tools.json-studio.metricMaxDepth', '最大嵌套深度') }}</n-text>
                      <span class="mt-1 font-semibold text-base text-blue-600 dark:text-blue-400">
                        {{ metrics.maxDepth }} 层
                      </span>
                    </div>

                    <div class="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col">
                      <n-text depth="3" class="text-xs">{{ t('tools.json-studio.metricTotalKeys', '属性键总数') }}</n-text>
                      <span class="mt-1 font-semibold text-base">
                        {{ metrics.totalKeys }}
                      </span>
                    </div>

                    <div class="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col">
                      <n-text depth="3" class="text-xs">{{ t('tools.json-studio.metricTotalArrays', '数组数量') }}</n-text>
                      <span class="mt-1 font-semibold text-base">
                        {{ metrics.totalArrays }}
                      </span>
                    </div>

                    <div class="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col">
                      <n-text depth="3" class="text-xs">{{ t('tools.json-studio.metricMaxArrayLength', '数组最大长度') }}</n-text>
                      <span class="mt-1 font-semibold text-base">
                        {{ metrics.maxArrayLength }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 模块 3：数据类型占比分布 -->
                <div class="p-3.5 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 flex flex-col gap-3">
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-xs text-slate-700 dark:text-slate-200">{{ t('tools.json-studio.metricTypeDistribution', '数据类型分布统计') }}</span>
                    <span class="text-xs text-slate-500 font-mono">共 {{ metrics.leafCount }} 个叶子节点</span>
                  </div>

                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div class="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <span class="text-xs text-slate-600 dark:text-slate-400">{{ t('tools.json-studio.typeString', '字符串') }}</span>
                      <n-tag size="small" type="success" round>{{ metrics.typeDistribution.stringCount }}</n-tag>
                    </div>

                    <div class="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <span class="text-xs text-slate-600 dark:text-slate-400">{{ t('tools.json-studio.typeNumber', '数值') }}</span>
                      <n-tag size="small" type="info" round>{{ metrics.typeDistribution.numberCount }}</n-tag>
                    </div>

                    <div class="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <span class="text-xs text-slate-600 dark:text-slate-400">{{ t('tools.json-studio.typeBoolean', '布尔值') }}</span>
                      <n-tag size="small" type="warning" round>{{ metrics.typeDistribution.booleanCount }}</n-tag>
                    </div>

                    <div class="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <span class="text-xs text-slate-600 dark:text-slate-400">{{ t('tools.json-studio.typeNull', '空值 (null)') }}</span>
                      <n-tag size="small" type="default" round>{{ metrics.typeDistribution.nullCount }}</n-tag>
                    </div>

                    <div class="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <span class="text-xs text-slate-600 dark:text-slate-400">{{ t('tools.json-studio.typeObject', '对象容器') }}</span>
                      <n-tag size="small" type="default" round>{{ metrics.typeDistribution.objectCount }}</n-tag>
                    </div>

                    <div class="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                      <span class="text-xs text-slate-600 dark:text-slate-400">{{ t('tools.json-studio.typeArray', '数组容器') }}</span>
                      <n-tag size="small" type="default" round>{{ metrics.typeDistribution.arrayCount }}</n-tag>
                    </div>
                  </div>
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </n-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 保证 Monaco 容器与子元素抗溢出 */
:deep(.monaco-editor) {
  width: 100% !important;
  max-width: 100% !important;
}
:deep(.monaco-editor .overflow-guard) {
  width: 100% !important;
  max-width: 100% !important;
}
</style>
