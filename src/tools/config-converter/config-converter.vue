<!-- Spring 配置与环境变量四合一互转器组件 -->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Copy, Download } from '@vicons/tabler';
import { useClipboard } from '@vueuse/core';
import TextareaCopyable from '@/components/TextareaCopyable.vue';
import {
  CONFIG_SAMPLES,
  type ConfigFormat,
  type ConfigSample,
  DEFAULT_CONFIG_CONVERTER_OPTIONS,
} from './config-converter.models';
import { convertConfig, detectConfigFormat } from './config-converter.service';

const { t } = useI18n();
const { copy } = useClipboard();

const inputContent = ref(CONFIG_SAMPLES[0].content);
const selectedInputFormat = ref<'auto' | ConfigFormat>('auto');
const targetFormat = ref<ConfigFormat>('env');

const options = reactive({
  ...DEFAULT_CONFIG_CONVERTER_OPTIONS,
});

// 1. 动态嗅探与计算源格式
const actualInputFormat = computed<ConfigFormat>(() => {
  if (selectedInputFormat.value === 'auto') {
    return detectConfigFormat(inputContent.value);
  }
  return selectedInputFormat.value;
});

// 2. 核心转换结果计算
const result = computed(() => {
  return convertConfig(
    inputContent.value,
    actualInputFormat.value,
    targetFormat.value,
    options,
  );
});

// 3. 语言高亮映射
const outputLanguageMap: Record<ConfigFormat, string> = {
  yaml: 'yaml',
  json: 'json',
  properties: 'toml', // highlight.js ini/toml 解析器兼容 properties
  env: 'toml',
};

// 4. 多示例下拉菜单选项与选择处理
const sampleDropdownOptions = CONFIG_SAMPLES.map(sample => ({
  label: sample.label,
  key: sample.key,
}));

function handleSelectSample(key: string | number) {
  const sample = CONFIG_SAMPLES.find(s => s.key === key);
  if (!sample) return;
  inputContent.value = sample.content;
  selectedInputFormat.value = sample.format;
  targetFormat.value = sample.suggestedTarget;
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

  const extensionMap: Record<ConfigFormat, string> = {
    yaml: 'application.yml',
    properties: 'application.properties',
    env: '.env',
    json: 'config.json',
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
  <div style="flex: 0 0 100%" class="config-converter">
    <!-- 顶部操作与设置栏 -->
    <c-card mb-4>
      <div flex flex-col gap-3>
        <!-- 第一行：快捷操作与模式切换 -->
        <div flex flex-wrap items-center justify-between gap-4>
          <div flex items-center gap-2>
            <n-dropdown :options="sampleDropdownOptions" trigger="click" @select="handleSelectSample">
              <c-button size="small">
                {{ t('tools.config-converter.loadSample', '载入示例') }} ▾
              </c-button>
            </n-dropdown>
            <c-button size="small" @click="pasteInput">
              {{ t('tools.config-converter.paste', '粘贴') }}
            </c-button>
            <c-button size="small" @click="clearInput">
              {{ t('tools.config-converter.clear', '清空') }}
            </c-button>
          </div>

          <div flex flex-wrap items-center gap-4>
            <div flex items-center gap-2>
              <span text-12px text-gray-500>{{ t('tools.config-converter.sourceFormat', '源格式:') }}</span>
              <n-radio-group v-model:value="selectedInputFormat" size="small">
                <n-radio-button value="auto">{{ t('tools.config-converter.autoDetect', { format: actualInputFormat.toUpperCase() }) }}</n-radio-button>
                <n-radio-button value="yaml">YAML</n-radio-button>
                <n-radio-button value="properties">Properties</n-radio-button>
                <n-radio-button value="env">ENV</n-radio-button>
                <n-radio-button value="json">JSON</n-radio-button>
              </n-radio-group>
            </div>
          </div>
        </div>

        <!-- 第二行：Spring 转换高级选项 -->
        <div flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-zinc-700>
          <div flex items-center gap-5 text-12px>
            <n-checkbox v-model:checked="options.relaxedBinding">
              {{ t('tools.config-converter.relaxedBinding', 'Spring 宽松绑定 (连字符转下划线、大写转义)') }}
            </n-checkbox>
            <n-checkbox v-model:checked="options.sortKeys">
              {{ t('tools.config-converter.sortKeys', '按键名字典序排序') }}
            </n-checkbox>
          </div>

          <div flex items-center gap-2>
            <n-tag size="small" type="info" round>
              {{ t('tools.config-converter.parsedCount', { count: result.entryCount }) }}
            </n-tag>
          </div>
        </div>
      </div>
    </c-card>

    <!-- 左右分栏对照 -->
    <div grid grid-cols-1 lg:grid-cols-2 gap-4>
      <!-- 左侧：源输入卡片 -->
      <c-card :title="t('tools.config-converter.inputCardTitle', '配置源输入 (Source)')">
        <n-input
          v-model:value="inputContent"
          type="textarea"
          :rows="22"
          :placeholder="t('tools.config-converter.inputPlaceholder', '在此粘贴任意 YAML、Properties、ENV 或 JSON 内容...')"
          font-mono
        />
      </c-card>

      <!-- 右侧：目标输出卡片 -->
      <c-card>
        <template #header>
          <div flex items-center justify-between w-full>
            <!-- 目标格式 Tab 切换 -->
            <n-tabs v-model:value="targetFormat" type="segment" size="small" style="max-width: 380px">
              <n-tab name="env">{{ t('tools.config-converter.envTab', 'ENV 环境变量') }}</n-tab>
              <n-tab name="properties">Properties</n-tab>
              <n-tab name="yaml">YAML</n-tab>
              <n-tab name="json">JSON</n-tab>
            </n-tabs>

            <!-- 右侧下载操作 -->
            <div flex items-center gap-2>
              <c-tooltip :tooltip="t('tools.config-converter.downloadTooltip', '下载导出配置文件')" position="left">
                <c-button size="small" circle @click="downloadOutput">
                  <n-icon size="18" :component="Download" />
                </c-button>
              </c-tooltip>
            </div>
          </div>
        </template>

        <!-- 异常报错提示 -->
        <n-alert v-if="!result.success" type="error" mb-3 :title="t('tools.config-converter.syntaxError', '语法解析异常')">
          {{ result.error }}
        </n-alert>

        <!-- 转换代码展示与一键复制 -->
        <TextareaCopyable
          :value="result.output"
          :language="outputLanguageMap[targetFormat]"
          :copy-message="t('tools.config-converter.copied', '已复制转换结果至剪贴板')"
        />
      </c-card>
    </div>
  </div>
</template>

<style lang="less" scoped>
.config-converter {
  width: 100%;
}
</style>
