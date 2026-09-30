<!-- 表格与多格式数据互转器组件 -->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Download } from '@vicons/tabler';
import TextareaCopyable from '@/components/TextareaCopyable.vue';
import {
  DEFAULT_TABLE_CONVERTER_OPTIONS,
  TABLE_SAMPLES,
  type TableConverterOptions,
  type TableInputFormat,
  type TableOutputFormat,
  type TableSample,
} from './table-converter.models';
import { convertTabularData } from './table-converter.service';

const { t } = useI18n();

const inputContent = ref<string>(TABLE_SAMPLES[0].content);
const inputFormat = ref<TableInputFormat>('auto');
const targetFormat = ref<TableOutputFormat>('sql');

const options = reactive<TableConverterOptions>({
  ...DEFAULT_TABLE_CONVERTER_OPTIONS,
  tableName: TABLE_SAMPLES[0].suggestedTableName,
});

// 1. 核心转换结果
const result = computed(() => {
  return convertTabularData(
    inputContent.value,
    inputFormat.value,
    targetFormat.value,
    options,
  );
});

// 2. 目标格式高亮映射
const outputLanguageMap: Record<TableOutputFormat, string> = {
  sql: 'sql',
  markdown: 'markdown',
  json: 'json',
  csv: 'txt',
};

// 3. 示例下拉菜单与快捷选择
const sampleDropdownOptions = TABLE_SAMPLES.map(sample => ({
  label: sample.label,
  key: sample.key,
}));

function handleSelectSample(key: string | number) {
  const sample = TABLE_SAMPLES.find(s => s.key === key);
  if (!sample) return;
  inputContent.value = sample.content;
  inputFormat.value = sample.format;
  targetFormat.value = sample.suggestedTarget;
  options.tableName = sample.suggestedTableName;
}

function clearInput() {
  inputContent.value = '';
}

async function pasteInput() {
  if (navigator?.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        inputContent.value = text;
      }
    } catch {
      // 容错降级
    }
  }
}

function downloadOutput() {
  if (!result.value.output) return;

  const extensionMap: Record<TableOutputFormat, string> = {
    sql: 'insert_statements.sql',
    markdown: 'table.md',
    json: 'table_data.json',
    csv: 'export.csv',
  };

  const filename = extensionMap[targetFormat.value];
  const blob = new Blob([result.value.output], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div style="flex: 0 0 100%" class="table-converter">
    <!-- 顶部操作与设置栏 -->
    <c-card mb-4>
      <div flex flex-col gap-3>
        <!-- 第一行：快捷操作与源格式 -->
        <div flex flex-wrap items-center justify-between gap-4>
          <div flex items-center gap-2>
            <n-dropdown :options="sampleDropdownOptions" trigger="click" @select="handleSelectSample">
              <c-button size="small">
                {{ t('tools.table-converter.loadSample', '载入示例') }} ▾
              </c-button>
            </n-dropdown>
            <c-button size="small" @click="pasteInput">
              {{ t('tools.table-converter.paste', '粘贴') }}
            </c-button>
            <c-button size="small" @click="clearInput">
              {{ t('tools.table-converter.clear', '清空') }}
            </c-button>
          </div>

          <div flex flex-wrap items-center gap-4>
            <div flex items-center gap-2>
              <span text-12px text-gray-500>{{ t('tools.table-converter.inputFormat', '输入格式:') }}</span>
              <n-radio-group v-model:value="inputFormat" size="small">
                <n-radio-button value="auto">{{ t('tools.table-converter.autoDetect', { format: result.detectedFormat.toUpperCase() }) }}</n-radio-button>
                <n-radio-button value="tsv">{{ t('tools.table-converter.tsvClipboard', 'TSV / Excel 剪贴板') }}</n-radio-button>
                <n-radio-button value="csv">CSV</n-radio-button>
                <n-radio-button value="markdown">Markdown</n-radio-button>
                <n-radio-button value="json">JSON</n-radio-button>
              </n-radio-group>
            </div>
          </div>
        </div>

        <!-- 第二行：SQL 生成器高级定制与统计 -->
        <div flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-zinc-700>
          <div flex flex-wrap items-center gap-4 text-12px>
            <n-checkbox v-model:checked="options.hasHeader">
              {{ t('tools.table-converter.hasHeader', '首行作为表头列名') }}
            </n-checkbox>

            <template v-if="targetFormat === 'sql'">
              <div flex items-center gap-1.5>
                <span text-gray-500>{{ t('tools.table-converter.tableName', '目标表名:') }}</span>
                <n-input
                  v-model:value="options.tableName"
                  size="small"
                  placeholder="t_order"
                  style="width: 140px"
                />
              </div>

              <div flex items-center gap-1.5>
                <span text-gray-500>{{ t('tools.table-converter.batchSize', '分批大小:') }}</span>
                <n-input-number
                  v-model:value="options.batchSize"
                  size="small"
                  :min="1"
                  :max="1000"
                  style="width: 110px"
                />
              </div>

              <div flex items-center gap-1.5>
                <span text-gray-500>{{ t('tools.table-converter.quoteIdentifier', '字段引号:') }}</span>
                <n-radio-group v-model:value="options.quoteIdentifier" size="small">
                  <n-radio-button value="backtick">`col`</n-radio-button>
                  <n-radio-button value="double">"col"</n-radio-button>
                  <n-radio-button value="none">{{ t('tools.table-converter.quoteNone', '无') }}</n-radio-button>
                </n-radio-group>
              </div>
            </template>
          </div>

          <div flex items-center gap-2>
            <n-tag size="small" type="info" round>
              {{ t('tools.table-converter.recognizedStats', { rows: result.rowCount, cols: result.columnCount }) }}
            </n-tag>
          </div>
        </div>
      </div>
    </c-card>

    <!-- 左右分栏对照 -->
    <div grid grid-cols-1 lg:grid-cols-2 gap-4>
      <!-- 左侧：源输入卡片 -->
      <c-card :title="t('tools.table-converter.inputCardTitle', '表格源数据输入 (Source Table Data)')">
        <n-input
          v-model:value="inputContent"
          type="textarea"
          :rows="22"
          :placeholder="t('tools.table-converter.inputPlaceholder', '在此直接粘贴 Excel / 飞书表格复制的文本、CSV、Markdown 表格或 JSON 数组...')"
          font-mono
        />
      </c-card>

      <!-- 右侧：目标输出卡片 -->
      <c-card>
        <template #header>
          <div flex items-center justify-between w-full>
            <!-- 目标格式 Tab 切换 -->
            <n-tabs v-model:value="targetFormat" type="segment" size="small" style="max-width: 420px">
              <n-tab name="sql">{{ t('tools.table-converter.tabSql', '批量 SQL INSERT') }}</n-tab>
              <n-tab name="markdown">{{ t('tools.table-converter.tabMarkdown', 'Markdown 表格') }}</n-tab>
              <n-tab name="json">{{ t('tools.table-converter.tabJson', 'JSON 数组') }}</n-tab>
              <n-tab name="csv">{{ t('tools.table-converter.tabCsv', 'CSV 格式') }}</n-tab>
            </n-tabs>

            <!-- 右侧下载操作 -->
            <div flex items-center gap-2>
              <c-tooltip :tooltip="t('tools.table-converter.downloadTooltip', '导出下载文件')" position="left">
                <c-button size="small" circle @click="downloadOutput">
                  <n-icon size="18" :component="Download" />
                </c-button>
              </c-tooltip>
            </div>
          </div>
        </template>

        <!-- 异常报错提示 -->
        <n-alert v-if="!result.success" type="error" mb-3 :title="t('tools.table-converter.parseError', '表格数据解析异常')">
          {{ result.error }}
        </n-alert>

        <!-- 转换代码展示与一键复制 -->
        <TextareaCopyable
          :value="result.output"
          :language="outputLanguageMap[targetFormat]"
          :copy-message="t('tools.table-converter.copied', '已复制转换结果至剪贴板')"
        />
      </c-card>
    </div>
  </div>
</template>

<style lang="less" scoped>
.table-converter {
  width: 100%;
}
</style>
