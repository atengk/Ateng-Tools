<script setup lang="ts">
/**
 * Mock 随机业务数据生成器视图层组件
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { computed, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  Copy,
  Database,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Plus,
  Refresh,
  Table,
  Trash,
  Wand,
} from '@vicons/tabler';
import type { MockExportFormat, MockField, MockFieldType } from './mock-data-generator.types';
import {
  PRESET_ORDER_FIELDS,
  PRESET_USER_FIELDS,
  generateMockRows,
  rowsToCsv,
  rowsToJson,
  rowsToSqlInsert,
} from './mock-data-generator.service';
import { useCopy } from '@/composable/copy';

const message = useMessage();

// 1. 字段类型选项清单
const fieldTypeOptions: { label: string; value: MockFieldType }[] = [
  { label: '自增主键 (ID)', value: 'id' },
  { label: '通用唯一识别码 (UUID v4)', value: 'uuid' },
  { label: '中文姓名 (Chinese Name)', value: 'cname' },
  { label: '英文姓名 (English Name)', value: 'ename' },
  { label: '11位手机号码 (Mobile)', value: 'phone' },
  { label: '电子邮箱 (Email)', value: 'email' },
  { label: '随机头像 URL (Avatar)', value: 'avatar' },
  { label: '性别 (男 / 女)', value: 'gender' },
  { label: '年龄数值 (Age)', value: 'age' },
  { label: '城市省市 (City)', value: 'city' },
  { label: '企业公司名称 (Company)', value: 'company' },
  { label: '金额数值 (Amount)', value: 'amount' },
  { label: '日期时间 (Datetime)', value: 'datetime' },
  { label: '布尔真假值 (Boolean)', value: 'boolean' },
  { label: '自定义枚举池 (Enum List)', value: 'enum' },
  { label: 'IPv4 地址 (IP)', value: 'ip' },
];

// 2. 响应式表单配置
const tableName = ref('sys_user');
const rowCount = ref(50);
const fields = ref<MockField[]>(JSON.parse(JSON.stringify(PRESET_USER_FIELDS)));
const activeTab = ref<string>('table');

// 3. 数据生成
const generatedRows = ref<Record<string, any>[]>(generateMockRows(fields.value, rowCount.value));

function handleRegenerate() {
  generatedRows.value = generateMockRows(fields.value, rowCount.value);
  message.success(`已重新生成 ${generatedRows.value.length} 条模拟数据`);
}

// 4. 各格式输出文本
const jsonOutput = computed(() => rowsToJson(generatedRows.value));
const sqlOutput = computed(() => rowsToSqlInsert(tableName.value, fields.value, generatedRows.value));
const csvOutput = computed(() => rowsToCsv(fields.value, generatedRows.value));

// 表格列定义 (用于 Naive UI n-data-table)
const tableColumns = computed(() => {
  return fields.value.map(f => ({
    title: f.comment ? `${f.name} (${f.comment})` : f.name,
    key: f.name,
    ellipsis: { tooltip: true },
  }));
});

// 5. 快速预设应用
function handleApplyPreset(type: 'user' | 'order') {
  if (type === 'user') {
    tableName.value = 'sys_user';
    fields.value = JSON.parse(JSON.stringify(PRESET_USER_FIELDS));
  } else {
    tableName.value = 'biz_order';
    fields.value = JSON.parse(JSON.stringify(PRESET_ORDER_FIELDS));
  }
  handleRegenerate();
  message.info('已加载预设字段模型');
}

// 6. 字段操作增删
function handleAddField() {
  const newId = String(Date.now());
  fields.value.push({
    id: newId,
    name: `field_${fields.value.length + 1}`,
    type: 'cname',
    comment: '新增字段',
  });
}

function handleRemoveField(index: number) {
  if (fields.value.length <= 1) {
    message.warning('至少需要保留 1 个数据字段');
    return;
  }
  fields.value.splice(index, 1);
}

// 7. 一键复制与下载
function handleCopyCurrent(content: string, typeName: string) {
  const { copy } = useCopy({ source: ref(content), createToast: false });
  copy();
  message.success(`${typeName} 内容已成功复制至剪贴板`);
}

function handleDownloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  message.success(`已开始下载 ${filename}`);
}
</script>

<template>
  <div class="space-y-4">
    <!-- 主栅格：左侧配置表单，右侧数据预览与导出 -->
    <n-grid cols="1 s:1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
      <!-- 左侧：字段与参数定义 -->
      <n-gi>
        <n-card title="Mock 字段结构与规则定义" size="small">
          <!-- 预设模板 -->
          <div class="mb-4">
            <div class="text-xs text-neutral-500 mb-1.5 flex items-center gap-1">
              <n-icon size="14" :component="Wand" />
              <span>快速载入标准业务模型：</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <n-button size="tiny" type="primary" quaternary @click="handleApplyPreset('user')">
                用户信息表模板 (sys_user)
              </n-button>
              <n-button size="tiny" type="primary" quaternary @click="handleApplyPreset('order')">
                电商订单表模板 (biz_order)
              </n-button>
            </div>
          </div>

          <!-- 生成控制参数 -->
          <n-grid cols="2" :x-gap="12" class="mb-3">
            <n-gi>
              <n-form-item label="生成条数 (1 ~ 5000)" :show-feedback="false">
                <n-input-number v-model:value="rowCount" :min="1" :max="5000" class="w-full" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="SQL 导出数据表名" :show-feedback="false">
                <n-input v-model:value="tableName" placeholder="sys_user" />
              </n-form-item>
            </n-gi>
          </n-grid>

          <!-- 字段动态定义列表 -->
          <div class="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 flex items-center justify-between">
            <span>字段列定义 (当前包含 {{ fields.length }} 个字段)</span>
            <n-button size="tiny" dashed type="primary" @click="handleAddField">
              <template #icon><n-icon :component="Plus" /></template>
              添加字段
            </n-button>
          </div>

          <div class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            <div
              v-for="(f, idx) in fields"
              :key="f.id"
              class="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 space-y-2"
            >
              <div class="flex items-center gap-2">
                <span class="w-5 text-center text-xs text-neutral-400 font-mono">#{{ idx + 1 }}</span>
                <n-input
                  v-model:value="f.name"
                  placeholder="字段英文标识"
                  size="small"
                  class="font-mono flex-1"
                />
                <n-select
                  v-model:value="f.type"
                  :options="fieldTypeOptions"
                  size="small"
                  class="w-44"
                />
                <n-button size="tiny" quaternary type="error" @click="handleRemoveField(idx)">
                  <template #icon><n-icon :component="Trash" /></template>
                </n-button>
              </div>

              <!-- 字段附加配置项 -->
              <div class="flex items-center gap-2 pl-7">
                <n-input
                  v-model:value="f.comment"
                  placeholder="字段中文备注 (可选)"
                  size="tiny"
                  class="flex-1"
                />
                <div v-if="f.type === 'id'" class="flex items-center gap-1 text-xs">
                  <span class="text-neutral-400">起始值:</span>
                  <n-input-number
                    v-model:value="f.options!.startId"
                    :min="1"
                    size="tiny"
                    style="width: 90px"
                  />
                </div>
                <div v-if="f.type === 'amount'" class="flex items-center gap-1 text-xs">
                  <span class="text-neutral-400">范围:</span>
                  <n-input-number v-model:value="f.options!.minAmount" size="tiny" style="width: 75px" />
                  <span>~</span>
                  <n-input-number v-model:value="f.options!.maxAmount" size="tiny" style="width: 75px" />
                </div>
              </div>
            </div>
          </div>

          <!-- 生成与刷新操作栏，居中对齐 -->
          <div class="mt-4 flex justify-center items-center gap-3">
            <n-button type="primary" size="small" @click="handleRegenerate">
              <template #icon><n-icon :component="Refresh" /></template>
              立即重新随机生成数据
            </n-button>
          </div>
        </n-card>
      </n-gi>

      <!-- 右侧：生成结果与导出预览 -->
      <n-gi>
        <n-card title="数据生成结果与全格式导出" size="small">
          <n-tabs v-model:value="activeTab" type="line" animated>
            <!-- 表格视图 -->
            <n-tab-pane name="table" tab="表格视图 (Table)">
              <div class="space-y-3">
                <div class="flex items-center justify-between text-xs text-neutral-400">
                  <span>仅展示前 {{ Math.min(generatedRows.length, 50) }} 行（共生成 {{ generatedRows.length }} 行）</span>
                  <n-tag type="success" size="tiny" round>内存瞬时渲染</n-tag>
                </div>

                <div class="max-h-[460px] overflow-auto">
                  <n-data-table
                    :columns="tableColumns"
                    :data="generatedRows.slice(0, 50)"
                    :bordered="true"
                    :single-line="false"
                    size="small"
                    striped
                  />
                </div>
              </div>
            </n-tab-pane>

            <!-- JSON 格式视图 -->
            <n-tab-pane name="json" tab="JSON 格式">
              <div class="space-y-2">
                <div class="flex justify-end gap-2">
                  <n-button size="tiny" type="primary" secondary @click="handleCopyCurrent(jsonOutput, 'JSON')">
                    <template #icon><n-icon :component="Copy" /></template>
                    复制 JSON
                  </n-button>
                  <n-button size="tiny" type="info" secondary @click="handleDownloadFile(jsonOutput, `${tableName}.json`, 'application/json')">
                    <template #icon><n-icon :component="Download" /></template>
                    下载 JSON
                  </n-button>
                </div>
                <n-input
                  :value="jsonOutput"
                  type="textarea"
                  readonly
                  :rows="21"
                  class="font-mono text-xs"
                />
              </div>
            </n-tab-pane>

            <!-- SQL 脚本视图 -->
            <n-tab-pane name="sql" tab="SQL 批量插入 (INSERT)">
              <div class="space-y-2">
                <div class="flex justify-end gap-2">
                  <n-button size="tiny" type="primary" secondary @click="handleCopyCurrent(sqlOutput, 'SQL 脚本')">
                    <template #icon><n-icon :component="Copy" /></template>
                    复制 SQL
                  </n-button>
                  <n-button size="tiny" type="info" secondary @click="handleDownloadFile(sqlOutput, `${tableName}.sql`, 'text/plain')">
                    <template #icon><n-icon :component="Download" /></template>
                    下载 .sql
                  </n-button>
                </div>
                <n-input
                  :value="sqlOutput"
                  type="textarea"
                  readonly
                  :rows="21"
                  class="font-mono text-xs"
                />
              </div>
            </n-tab-pane>

            <!-- CSV 视图 -->
            <n-tab-pane name="csv" tab="CSV 表格文件">
              <div class="space-y-2">
                <div class="flex justify-end gap-2">
                  <n-button size="tiny" type="primary" secondary @click="handleCopyCurrent(csvOutput, 'CSV')">
                    <template #icon><n-icon :component="Copy" /></template>
                    复制 CSV
                  </n-button>
                  <n-button size="tiny" type="info" secondary @click="handleDownloadFile(csvOutput, `${tableName}.csv`, 'text/csv')">
                    <template #icon><n-icon :component="Download" /></template>
                    下载 .csv
                  </n-button>
                </div>
                <n-input
                  :value="csvOutput"
                  type="textarea"
                  readonly
                  :rows="21"
                  class="font-mono text-xs"
                />
              </div>
            </n-tab-pane>
          </n-tabs>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>
