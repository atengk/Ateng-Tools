<!-- cURL Converter Tool Component -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TextareaCopyable from '@/components/TextareaCopyable.vue';
import {
  generateAxiosCode,
  generateFetchCode,
  generateJavaHttpClientCode,
  parseCurlCommand,
} from './curl-converter.service';

const { t } = useI18n();

const sampleCurl = `curl 'https://api.example.com/v1/orders?page=1&limit=20' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample' \\
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)' \\
  --data-raw '{"productId": 10086, "quantity": 2, "notes": "Urgent order"}'`;

const rawCurlInput = ref<string>(sampleCurl);
const activeTab = ref<string>('axios');

// 解析结果
const parsedRequest = computed(() => {
  if (!rawCurlInput.value.trim()) {
    return null;
  }
  try {
    return parseCurlCommand(rawCurlInput.value);
  } catch (err: any) {
    return null;
  }
});

// 生成的代码
const axiosCode = computed(() => {
  return parsedRequest.value ? generateAxiosCode(parsedRequest.value) : '';
});

const fetchCode = computed(() => {
  return parsedRequest.value ? generateFetchCode(parsedRequest.value) : '';
});

const javaCode = computed(() => {
  return parsedRequest.value ? generateJavaHttpClientCode(parsedRequest.value) : '';
});

function loadSample() {
  rawCurlInput.value = sampleCurl;
}

function clearInput() {
  rawCurlInput.value = '';
}

async function pasteInput() {
  if (navigator?.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        rawCurlInput.value = text;
      }
    } catch {
      // 容错降级
    }
  }
}
</script>

<template>
  <div class="curl-converter" style="flex: 0 0 100%">
    <!-- 顶部操作栏 -->
    <c-card mb-4>
      <div flex flex-wrap items-center justify-between gap-4>
        <div flex items-center gap-2>
          <c-button size="small" @click="loadSample">
            {{ t('tools.curl-converter.loadSample', '载入示例') }}
          </c-button>
          <c-button size="small" @click="pasteInput">
            {{ t('tools.curl-converter.paste', '粘贴') }}
          </c-button>
          <c-button size="small" @click="clearInput">
            {{ t('tools.curl-converter.clear', '清空') }}
          </c-button>
        </div>

        <div v-if="parsedRequest" flex items-center gap-2 text-13px text-gray-500>
          <n-tag type="info" size="small">
            {{ parsedRequest.method }}
          </n-tag>
          <span font-mono truncate max-w-400px :title="parsedRequest.url">
            {{ parsedRequest.url }}
          </span>
        </div>
      </div>
    </c-card>

    <!-- 左右分栏对照 -->
    <div grid grid-cols-1 lg:grid-cols-2 gap-4>
      <!-- 左侧：cURL 命令输入 -->
      <c-card title="cURL 命令输入 (cURL Command)">
        <n-input
          v-model:value="rawCurlInput"
          type="textarea"
          :rows="18"
          placeholder="在此粘贴 curl 命令..."
          font-mono
        />
      </c-card>

      <!-- 右侧：生成代码与参数拆解视图 -->
      <c-card title="转换产物与解析拆解">
        <n-tabs v-model:value="activeTab" type="line" animated>
          <!-- Axios -->
          <n-tab-pane name="axios" tab="JavaScript Axios">
            <TextareaCopyable :value="axiosCode" language="javascript" />
          </n-tab-pane>

          <!-- Fetch -->
          <n-tab-pane name="fetch" tab="JavaScript Fetch">
            <TextareaCopyable :value="fetchCode" language="javascript" />
          </n-tab-pane>

          <!-- Java HttpClient -->
          <n-tab-pane name="java" tab="Java 11/21 HttpClient">
            <TextareaCopyable :value="javaCode" language="java" />
          </n-tab-pane>

          <!-- 请求参数拆解视图 -->
          <n-tab-pane name="inspect" tab="请求参数拆解 (Inspection)">
            <div v-if="parsedRequest" flex flex-col gap-4 max-h-500px overflow-y-auto p-1>
              <!-- 基础信息 -->
              <div p-3 bg-gray-50 dark:bg-zinc-800 rounded flex flex-col gap-2>
                <div flex items-center gap-2>
                  <n-tag type="primary" size="small">方法</n-tag>
                  <span font-bold>{{ parsedRequest.method }}</span>
                </div>
                <div flex items-center gap-2>
                  <n-tag type="info" size="small">基础 URL</n-tag>
                  <span font-mono text-12px break-all>{{ parsedRequest.baseUrl }}</span>
                </div>
                <div v-if="parsedRequest.auth.type !== 'none'" flex items-center gap-2>
                  <n-tag type="warning" size="small">认证 (Auth)</n-tag>
                  <span text-12px>
                    类型: {{ parsedRequest.auth.type }}
                    {{ parsedRequest.auth.username ? `(用户: ${parsedRequest.auth.username})` : '' }}
                  </span>
                </div>
              </div>

              <!-- Query 参数 -->
              <div v-if="parsedRequest.queryParams.length > 0">
                <div font-semibold text-13px mb-1>Query 查询参数:</div>
                <table w-full text-12px border-collapse>
                  <thead>
                    <tr bg-gray-100 dark:bg-zinc-700 text-left>
                      <th p-2>参数名</th>
                      <th p-2>参数值</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, idx) in parsedRequest.queryParams"
                      :key="idx"
                      border-b
                      border-gray-200
                      dark:border-zinc-700
                    >
                      <td p-2 font-mono font-medium>{{ item.key }}</td>
                      <td p-2 font-mono break-all>{{ item.value }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Headers 请求头 -->
              <div v-if="parsedRequest.headersList.length > 0">
                <div font-semibold text-13px mb-1>Headers 请求头:</div>
                <table w-full text-12px border-collapse>
                  <thead>
                    <tr bg-gray-100 dark:bg-zinc-700 text-left>
                      <th p-2>Header 键</th>
                      <th p-2>Header 值</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(item, idx) in parsedRequest.headersList"
                      :key="idx"
                      border-b
                      border-gray-200
                      dark:border-zinc-700
                    >
                      <td p-2 font-mono font-medium>{{ item.key }}</td>
                      <td p-2 font-mono break-all>{{ item.value }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- 请求体 Body -->
              <div v-if="parsedRequest.body">
                <div font-semibold text-13px mb-1>
                  请求体 Body ({{ parsedRequest.bodyType }}):
                </div>
                <pre
                  p-3
                  bg-gray-100
                  dark:bg-zinc-800
                  rounded
                  font-mono
                  text-12px
                  whitespace-pre-wrap
                  break-all
                >{{ parsedRequest.body }}</pre>
              </div>
            </div>
            <div v-else text-gray-400 text-center py-8>
              暂无有效的 cURL 请求可拆解
            </div>
          </n-tab-pane>
        </n-tabs>
      </c-card>
    </div>
  </div>
</template>
