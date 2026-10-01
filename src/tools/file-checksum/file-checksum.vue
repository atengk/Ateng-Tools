<script setup lang="ts">
/**
 * 本地大文件校验与哈希比对视图组件
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { computed, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  Check,
  Copy,
  FileCheck,
  FileDiff,
  Refresh,
  X,
} from '@vicons/tabler';
import type {
  ChunkProgress,
  FileChecksumResult,
  HashAlgorithm,
} from './file-checksum.types';
import {
  compareHash,
  compareTwoFileResults,
  computeChunkedFileHash,
  formatFileSize,
  formatSpeed,
} from './file-checksum.service';
import { useCopy } from '@/composable/copy';

const message = useMessage();
const { copy } = useCopy({ createToast: false });

// 1. 模式与配置
const activeMode = ref<'single' | 'dual'>('single');
const selectedAlgorithms = ref<HashAlgorithm[]>(['MD5', 'SHA-1', 'SHA-256']);
const algorithmOptions: { label: string; value: HashAlgorithm }[] = [
  { label: 'MD5', value: 'MD5' },
  { label: 'SHA-1', value: 'SHA-1' },
  { label: 'SHA-256', value: 'SHA-256' },
  { label: 'SHA-384', value: 'SHA-384' },
  { label: 'SHA-512', value: 'SHA-512' },
];

// 2. 单文件状态
const singleFile = ref<File | null>(null);
const isCalculatingSingle = ref(false);
const singleProgress = ref<ChunkProgress | null>(null);
const singleResult = ref<FileChecksumResult | null>(null);
const expectedHash = ref('');
const singleAbort = ref<{ aborted: boolean }>({ aborted: false });

// 3. 双文件比对状态
const fileA = ref<File | null>(null);
const fileB = ref<File | null>(null);
const isCalculatingDual = ref(false);
const dualResultA = ref<FileChecksumResult | null>(null);
const dualResultB = ref<FileChecksumResult | null>(null);
const dualProgressA = ref<ChunkProgress | null>(null);
const dualProgressB = ref<ChunkProgress | null>(null);
const dualAbort = ref<{ aborted: boolean }>({ aborted: false });

// 4. 计算单文件哈希
async function startCalculateSingle(file: File) {
  singleFile.value = file;
  singleResult.value = null;
  singleProgress.value = null;
  isCalculatingSingle.value = true;
  singleAbort.value = { aborted: false };

  const startTime = Date.now();

  try {
    const hashes = await computeChunkedFileHash(
      file,
      selectedAlgorithms.value,
      (p) => {
        singleProgress.value = p;
      },
      singleAbort.value,
    );

    singleResult.value = {
      fileName: file.name,
      fileSize: file.size,
      hashes,
      elapsedMs: Date.now() - startTime,
    };
    message.success(`文件 ${file.name} 哈希校验完成`);
  }
  catch (err: any) {
    if (singleAbort.value.aborted) {
      message.info('已取消当前文件哈希计算');
    }
    else {
      message.error(`计算失败: ${err.message || '未知错误'}`);
    }
  }
  finally {
    isCalculatingSingle.value = false;
  }
}

function handleCancelSingle() {
  singleAbort.value.aborted = true;
}

// 5. 参考哈希比对结果计算
const comparisonResult = computed(() => {
  if (!singleResult.value || !expectedHash.value.trim()) {
    return null;
  }
  return compareHash(expectedHash.value, singleResult.value.hashes);
});

function handleSelectFileA(file: File) {
  fileA.value = file;
}

function handleSelectFileB(file: File) {
  fileB.value = file;
}

// 6. 双文件比对执行
async function startCalculateDual() {
  if (!fileA.value || !fileB.value) {
    message.warning('请先选择两个待比对的文件');
    return;
  }

  isCalculatingDual.value = true;
  dualResultA.value = null;
  dualResultB.value = null;
  dualProgressA.value = null;
  dualProgressB.value = null;
  dualAbort.value = { aborted: false };

  try {
    // 依次计算两个文件
    const startA = Date.now();
    const hashesA = await computeChunkedFileHash(
      fileA.value,
      selectedAlgorithms.value,
      p => dualProgressA.value = p,
      dualAbort.value,
    );
    dualResultA.value = {
      fileName: fileA.value.name,
      fileSize: fileA.value.size,
      hashes: hashesA,
      elapsedMs: Date.now() - startA,
    };

    const startB = Date.now();
    const hashesB = await computeChunkedFileHash(
      fileB.value,
      selectedAlgorithms.value,
      p => dualProgressB.value = p,
      dualAbort.value,
    );
    dualResultB.value = {
      fileName: fileB.value.name,
      fileSize: fileB.value.size,
      hashes: hashesB,
      elapsedMs: Date.now() - startB,
    };

    message.success('双文件哈希比对完成');
  }
  catch (err: any) {
    if (dualAbort.value.aborted) {
      message.info('已取消双文件计算');
    }
    else {
      message.error(`比对失败: ${err.message || '未知错误'}`);
    }
  }
  finally {
    isCalculatingDual.value = false;
  }
}

function handleCancelDual() {
  dualAbort.value.aborted = true;
}

const dualComparison = computed(() => {
  if (!dualResultA.value || !dualResultB.value) return null;
  return compareTwoFileResults(dualResultA.value, dualResultB.value);
});

// 7. 复制辅助
function copySingleHash(alg: string, val: string) {
  copy(val);
  message.success(`已复制 ${alg} 摘要值`);
}

function copyAllHashes() {
  if (!singleResult.value) return;
  const lines = Object.entries(singleResult.value.hashes).map(
    ([alg, h]) => `${alg}: ${h}`,
  );
  lines.unshift(`文件名: ${singleResult.value.fileName}`);
  lines.unshift(`文件大小: ${formatFileSize(singleResult.value.fileSize)}`);
  copy(lines.join('\n'));
  message.success('已复制完整校验报告');
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶部模式切换与算法选择 -->
    <n-card size="small">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <n-tabs v-model:value="activeMode" type="segment" class="w-72">
          <n-tab name="single">
            <template #default>
              <div class="flex items-center gap-1.5">
                <n-icon :component="FileCheck" />
                <span>单文件校验与比对</span>
              </div>
            </template>
          </n-tab>
          <n-tab name="dual">
            <template #default>
              <div class="flex items-center gap-1.5">
                <n-icon :component="FileDiff" />
                <span>双文件一致性比对</span>
              </div>
            </template>
          </n-tab>
        </n-tabs>

        <!-- 启用的算法勾选 -->
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-500 font-medium">校验算法:</span>
          <n-checkbox-group v-model:value="selectedAlgorithms">
            <n-space size="small">
              <n-checkbox
                v-for="opt in algorithmOptions"
                :key="opt.value"
                :value="opt.value"
                :disabled="isCalculatingSingle || isCalculatingDual"
              >
                {{ opt.label }}
              </n-checkbox>
            </n-space>
          </n-checkbox-group>
        </div>
      </div>
    </n-card>

    <!-- 模式 1：单文件校验与参考哈希比对 -->
    <template v-if="activeMode === 'single'">
      <!-- 上传区域 -->
      <n-card size="small">
        <c-file-upload
          title="将待校验大文件拖拽至此处，或点击浏览本地文件 (支持 GB 级大文件分块流式计算)"
          button-text="选择本地文件"
          @file-upload="startCalculateSingle"
        />
      </n-card>

      <!-- 流式计算进度 -->
      <n-card v-if="isCalculatingSingle && singleProgress" size="small" title="正在流式分块计算哈希...">
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>{{ singleFile?.name }} ({{ formatFileSize(singleFile?.size || 0) }})</span>
            <span>
              已读取: {{ formatFileSize(singleProgress.bytesProcessed) }}
              &nbsp;|&nbsp; 速率: {{ formatSpeed(singleProgress.speedBytesPerSec) }}
            </span>
          </div>
          <n-progress
            type="line"
            :percentage="Number(singleProgress.percent.toFixed(1))"
            :indicator-placement="'inside'"
            processing
          />
          <div class="flex justify-center pt-2">
            <n-button size="small" type="warning" secondary @click="handleCancelSingle">
              取消计算
            </n-button>
          </div>
        </div>
      </n-card>

      <!-- 校验结果与参考比对卡片 -->
      <template v-if="singleResult">
        <!-- 参考哈希即时匹配比对框 -->
        <n-card title="官方/预期哈希值即时比对" size="small">
          <div class="space-y-3">
            <n-input-group>
              <n-input
                v-model:value="expectedHash"
                placeholder="粘贴发布页面提供的参考校验值 (自动去除首尾空格、忽略大小写)..."
                clearable
              />
              <n-button secondary @click="expectedHash = ''">
                清空
              </n-button>
            </n-input-group>

            <!-- 比对反馈提醒 -->
            <div v-if="comparisonResult">
              <n-alert
                v-if="comparisonResult.isMatched"
                type="success"
                title="哈希校验通过！文件未被篡改"
              >
                <div class="flex items-center gap-2">
                  <n-icon :component="Check" class="text-green-600 text-lg" />
                  <span>与 <strong>{{ comparisonResult.matchedAlgorithm }}</strong> 摘要完全匹配：</span>
                  <code class="font-mono text-xs bg-green-50 dark:bg-green-950/40 px-1 py-0.5 rounded">
                    {{ comparisonResult.calculatedHash }}
                  </code>
                </div>
              </n-alert>
              <n-alert
                v-else
                type="error"
                title="哈希校验不匹配！请警惕文件损坏或被篡改"
              >
                <div class="flex items-center gap-2 text-xs">
                  <n-icon :component="X" class="text-red-500 text-lg" />
                  <span>所填写的参考哈希未在当前已选算法计算出的结果中找到匹配项。</span>
                </div>
              </n-alert>
            </div>
            <div v-else class="text-xs text-gray-400">
              提示：可直接粘贴任意标准 MD5、SHA-1 或 SHA-256 哈希值，系统将自动识别对应算法并校验一致性。
            </div>
          </div>
        </n-card>

        <!-- 详细哈希清单 -->
        <n-card title="文件校验详细指纹" size="small">
          <template #header-extra>
            <div class="text-xs text-gray-500">
              文件大小: <span class="font-semibold text-gray-700 dark:text-gray-300">{{ formatFileSize(singleResult.fileSize) }}</span>
              &nbsp;|&nbsp; 耗时: {{ (singleResult.elapsedMs / 1000).toFixed(2) }} 秒
            </div>
          </template>

          <div class="space-y-3">
            <div
              v-for="(hashVal, alg) in singleResult.hashes"
              :key="alg"
              class="p-2.5 rounded border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex flex-wrap items-center justify-between gap-2"
            >
              <div class="flex items-center gap-3 flex-1 min-w-[280px]">
                <span class="w-16 font-semibold text-xs font-mono text-primary">{{ alg }}</span>
                <span class="font-mono text-xs text-gray-700 dark:text-gray-300 break-all select-all">{{ hashVal }}</span>
              </div>
              <n-button size="tiny" secondary @click="copySingleHash(String(alg), String(hashVal))">
                <template #icon>
                  <n-icon :component="Copy" />
                </template>
                复制
              </n-button>
            </div>
          </div>

          <!-- 操作栏按钮组统一居中排布 -->
          <div class="mt-4 flex justify-center gap-3">
            <n-button secondary type="primary" @click="copyAllHashes">
              <template #icon>
                <n-icon :component="Copy" />
              </template>
              复制完整校验报告
            </n-button>
          </div>
        </n-card>
      </template>
    </template>

    <!-- 模式 2：双文件一致性比对 -->
    <template v-else>
      <n-grid cols="1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
        <!-- 文件 A -->
        <n-gi>
          <n-card title="源文件 A" size="small">
            <c-file-upload
              title="选择或拖入基准文件 A"
              button-text="选择文件 A"
              @file-upload="handleSelectFileA"
            />
            <div v-if="fileA" class="mt-2 text-xs text-gray-500">
              已选: <span class="font-medium text-gray-700 dark:text-gray-300">{{ fileA.name }}</span> ({{ formatFileSize(fileA.size) }})
            </div>
            <div v-if="isCalculatingDual && dualProgressA" class="mt-2 space-y-1">
              <div class="text-[11px] text-gray-400">正在计算文件 A: {{ dualProgressA.percent.toFixed(0) }}%</div>
              <n-progress type="line" :percentage="Number(dualProgressA.percent.toFixed(0))" />
            </div>
          </n-card>
        </n-gi>

        <!-- 文件 B -->
        <n-gi>
          <n-card title="对比文件 B" size="small">
            <c-file-upload
              title="选择或拖入对比文件 B"
              button-text="选择文件 B"
              @file-upload="handleSelectFileB"
            />
            <div v-if="fileB" class="mt-2 text-xs text-gray-500">
              已选: <span class="font-medium text-gray-700 dark:text-gray-300">{{ fileB.name }}</span> ({{ formatFileSize(fileB.size) }})
            </div>
            <div v-if="isCalculatingDual && dualProgressB" class="mt-2 space-y-1">
              <div class="text-[11px] text-gray-400">正在计算文件 B: {{ dualProgressB.percent.toFixed(0) }}%</div>
              <n-progress type="line" :percentage="Number(dualProgressB.percent.toFixed(0))" />
            </div>
          </n-card>
        </n-gi>
      </n-grid>

      <!-- 操作栏按钮组统一居中排布 -->
      <div class="flex justify-center gap-3 py-2">
        <n-button
          type="primary"
          size="medium"
          :disabled="!fileA || !fileB || isCalculatingDual"
          @click="startCalculateDual"
        >
          <template #icon>
            <n-icon :component="FileDiff" />
          </template>
          开始比对双文件哈希
        </n-button>
        <n-button
          v-if="isCalculatingDual"
          type="warning"
          secondary
          size="medium"
          @click="handleCancelDual"
        >
          取消计算
        </n-button>
      </div>

      <!-- 双文件比对结果报告 -->
      <n-card v-if="dualComparison && dualResultA && dualResultB" title="双文件比对结论" size="small">
        <n-alert
          :type="dualComparison.isIdentical ? 'success' : 'error'"
          :title="dualComparison.isIdentical ? '两个文件指纹完全一致 (未被修改)' : '两个文件哈希存在差异 (已被篡改或内容不同)'"
          class="mb-4"
        >
          <div class="text-xs">
            文件 A ({{ formatFileSize(dualResultA.fileSize) }}) 与 文件 B ({{ formatFileSize(dualResultB.fileSize) }})
            {{ dualComparison.isIdentical ? '在所有已计算摘要算法下均严格吻合。' : '在比对中发现了不一致的摘要项。' }}
          </div>
        </n-alert>

        <n-table size="small" striped>
          <thead>
            <tr>
              <th class="w-24">算法</th>
              <th>文件 A ({{ dualResultA.fileName }})</th>
              <th>文件 B ({{ dualResultB.fileName }})</th>
              <th class="w-20 text-center">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="alg in selectedAlgorithms" :key="alg">
              <td class="font-mono font-semibold text-xs">{{ alg }}</td>
              <td class="font-mono text-xs break-all">{{ dualResultA.hashes[alg] || '-' }}</td>
              <td class="font-mono text-xs break-all">{{ dualResultB.hashes[alg] || '-' }}</td>
              <td class="text-center">
                <n-tag
                  v-if="dualResultA.hashes[alg] && dualResultB.hashes[alg]"
                  :type="dualResultA.hashes[alg] === dualResultB.hashes[alg] ? 'success' : 'error'"
                  size="small"
                >
                  {{ dualResultA.hashes[alg] === dualResultB.hashes[alg] ? '一致' : '差异' }}
                </n-tag>
              </td>
            </tr>
          </tbody>
        </n-table>
      </n-card>
    </template>
  </div>
</template>
