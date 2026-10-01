<script setup lang="ts">
/**
 * X.509 SSL 证书与 CSR 解析器视图组件
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { computed, onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  Calendar,
  Certificate,
  Copy,
  Key,
  Lock,
  ShieldCheck,
  Wand,
} from '@vicons/tabler';
import type { ParsedCertificateResult } from './x509-certificate-inspector.types';
import {
  formatFingerprint,
  generateSampleCertificatePem,
  parseCertificateOrCsr,
} from './x509-certificate-inspector.service';
import { useCopy } from '@/composable/copy';

const message = useMessage();
const { copy } = useCopy({ createToast: false });

const pemInput = ref('');
const parsedResult = ref<ParsedCertificateResult | null>(null);
const parseError = ref<string | null>(null);

function doParse(text: string) {
  if (!text || !text.trim()) {
    parsedResult.value = null;
    parseError.value = null;
    return;
  }

  try {
    parsedResult.value = parseCertificateOrCsr(text);
    parseError.value = null;
  }
  catch (err: any) {
    parsedResult.value = null;
    parseError.value = err.message || '证书解析失败，请检查格式';
  }
}

function handleFillSample() {
  const sample = generateSampleCertificatePem();
  pemInput.value = sample;
  doParse(sample);
  message.success('已载入示范自签名 SSL 证书');
}

function handleClear() {
  pemInput.value = '';
  parsedResult.value = null;
  parseError.value = null;
}

function handleFileUpload(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    pemInput.value = content;
    doParse(content);
    message.success(`已载入证书文件: ${file.name}`);
  };
  reader.readAsText(file);
}

function handleCopy(text: string, label: string) {
  copy(text);
  message.success(`已复制 ${label}`);
}

const formattedSha256 = computed(() =>
  parsedResult.value ? formatFingerprint(parsedResult.value.fingerprintSha256) : '',
);
const formattedSha1 = computed(() =>
  parsedResult.value ? formatFingerprint(parsedResult.value.fingerprintSha1) : '',
);

onMounted(() => {
  handleFillSample();
});
</script>

<template>
  <div class="space-y-4">
    <!-- 证书输入与文件上传区 -->
    <n-grid cols="1 s:1 m:3" responsive="screen" :x-gap="16" :y-gap="16">
      <!-- PEM 文本输入 -->
      <n-gi :span="2">
        <n-card title="粘贴 X.509 证书或 CSR 请求 (PEM 格式)" size="small">
          <n-input
            v-model:value="pemInput"
            type="textarea"
            :rows="6"
            placeholder="粘贴形如 -----BEGIN CERTIFICATE----- 或 -----BEGIN CERTIFICATE REQUEST----- 的内容..."
            @update:value="doParse"
          />
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs text-gray-500">
              数据 100% 在本地浏览器内存中解析，零数据外泄
            </span>
            <div class="flex items-center gap-2">
              <n-button secondary size="small" @click="handleFillSample">
                <template #icon>
                  <n-icon :component="Wand" />
                </template>
                示范证书
              </n-button>
              <n-button secondary size="small" @click="handleClear">
                清空
              </n-button>
            </div>
          </div>
        </n-card>
      </n-gi>

      <!-- 文件拖拽上传 -->
      <n-gi>
        <n-card title="从本地上传证书文件" size="small" class="h-full flex flex-col justify-between">
          <c-file-upload
            accept=".crt,.cer,.pem,.csr,.der,text/plain"
            title="拖拽 .crt / .cer / .pem / .csr 证书文件至此"
            button-text="浏览证书文件"
            @file-upload="handleFileUpload"
          />
          <div class="mt-2 text-xs text-gray-400">
            支持标准 Base64 编码的 SSL 证书与签名请求文件。
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 解析错误提醒 -->
    <n-alert v-if="parseError" type="error" title="证书解析失败">
      {{ parseError }}
    </n-alert>

    <!-- 解析结果展示看板 -->
    <template v-if="parsedResult">
      <!-- 核心指标摘要胶囊 -->
      <n-card size="small">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <n-avatar round size="large" class="bg-primary/10 text-primary">
              <n-icon size="24" :component="Certificate" />
            </n-avatar>
            <div>
              <div class="text-base font-bold flex items-center gap-2">
                <span>{{ parsedResult.subjectCommonName }}</span>
                <n-tag v-if="parsedResult.type === 'CSR'" type="info" size="small">
                  CSR 证书申请
                </n-tag>
                <template v-else-if="parsedResult.validity">
                  <n-tag v-if="parsedResult.validity.isExpired" type="error" size="small">
                    已过期 {{ parsedResult.validity.expiredDays }} 天
                  </n-tag>
                  <n-tag v-else-if="parsedResult.validity.isValidNow" type="success" size="small">
                    生效中 (剩余 {{ parsedResult.validity.remainingDays }} 天)
                  </n-tag>
                  <n-tag v-else type="warning" size="small">
                    尚未生效
                  </n-tag>
                </template>
              </div>
              <div class="text-xs text-gray-500 mt-0.5">
                颁发机构: {{ parsedResult.issuerCommonName }}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <n-button secondary size="small" @click="handleCopy(parsedResult.rawPem, '原始 PEM')">
              <template #icon>
                <n-icon :component="Copy" />
              </template>
              复制 PEM
            </n-button>
          </div>
        </div>
      </n-card>

      <!-- 详细卡片信息网格 -->
      <n-grid cols="1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
        <!-- 使用者信息 (Subject) -->
        <n-gi>
          <n-card title="使用者信息 (Subject)" size="small">
            <template #header-extra>
              <n-icon :component="ShieldCheck" class="text-primary text-base" />
            </template>
            <n-descriptions :column="1" label-placement="left" size="small" bordered>
              <n-descriptions-item
                v-for="attr in parsedResult.subject"
                :key="attr.name"
                :label="attr.label"
              >
                <span class="font-mono text-xs select-all">{{ attr.value }}</span>
              </n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-gi>

        <!-- 颁发者信息 (Issuer) -->
        <n-gi>
          <n-card title="颁发者信息 (Issuer / CA)" size="small">
            <template #header-extra>
              <n-icon :component="Lock" class="text-primary text-base" />
            </template>
            <div v-if="parsedResult.type === 'CSR'" class="text-xs text-gray-400 py-4 text-center">
              CSR 属于待签发请求，尚未由 CA 签名生成证书
            </div>
            <n-descriptions v-else :column="1" label-placement="left" size="small" bordered>
              <n-descriptions-item
                v-for="attr in parsedResult.issuer"
                :key="attr.name"
                :label="attr.label"
              >
                <span class="font-mono text-xs select-all">{{ attr.value }}</span>
              </n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-gi>

        <!-- 有效期限与备用域名 (SAN) -->
        <n-gi>
          <n-card title="有效期限与域名备用名称 (SAN)" size="small">
            <template #header-extra>
              <n-icon :component="Calendar" class="text-primary text-base" />
            </template>
            <div class="space-y-3">
              <template v-if="parsedResult.validity">
                <div class="p-2.5 rounded border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 space-y-1.5 text-xs">
                  <div class="flex justify-between">
                    <span class="text-gray-500">生效日期 (Not Before):</span>
                    <span class="font-mono font-medium">{{ parsedResult.validity.notBefore }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-500">失效日期 (Not After):</span>
                    <span class="font-mono font-medium">{{ parsedResult.validity.notAfter }}</span>
                  </div>
                </div>
              </template>

              <!-- SAN 域名列表 -->
              <div>
                <div class="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  备用名称集合 (SAN: {{ parsedResult.sans.length }} 项):
                </div>
                <div v-if="parsedResult.sans.length === 0" class="text-xs text-gray-400">
                  无扩展备用域名定义
                </div>
                <div v-else class="flex flex-wrap gap-1.5">
                  <n-tag
                    v-for="san in parsedResult.sans"
                    :key="san"
                    size="small"
                    round
                    class="font-mono text-xs"
                  >
                    {{ san }}
                  </n-tag>
                </div>
              </div>
            </div>
          </n-card>
        </n-gi>

        <!-- 密钥与指纹算法 (Key & Fingerprints) -->
        <n-gi>
          <n-card title="公钥参数与证书指纹" size="small">
            <template #header-extra>
              <n-icon :component="Key" class="text-primary text-base" />
            </template>
            <div class="space-y-2.5 text-xs">
              <div class="flex items-center justify-between border-b pb-2 dark:border-gray-800">
                <span class="text-gray-500">公钥算法与位宽:</span>
                <span class="font-mono font-semibold">
                  {{ parsedResult.publicKey.algorithm }}
                  <span v-if="parsedResult.publicKey.bitLength"> ({{ parsedResult.publicKey.bitLength }} bits)</span>
                </span>
              </div>
              <div class="flex items-center justify-between border-b pb-2 dark:border-gray-800">
                <span class="text-gray-500">签名算法:</span>
                <span class="font-mono">{{ parsedResult.signatureAlgorithm }}</span>
              </div>
              <div class="flex items-center justify-between border-b pb-2 dark:border-gray-800">
                <span class="text-gray-500">序列号 (Serial):</span>
                <span class="font-mono truncate max-w-[200px]" :title="parsedResult.serialNumber">{{ parsedResult.serialNumber }}</span>
              </div>

              <!-- 指纹 -->
              <div class="space-y-1 pt-1">
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">SHA-256 指纹:</span>
                  <n-button text size="tiny" type="primary" @click="handleCopy(formattedSha256, 'SHA-256 指纹')">
                    复制
                  </n-button>
                </div>
                <div class="font-mono text-[11px] bg-gray-100 dark:bg-gray-900 p-1.5 rounded break-all select-all">
                  {{ formattedSha256 }}
                </div>
              </div>

              <div class="space-y-1 pt-1">
                <div class="flex items-center justify-between">
                  <span class="text-gray-500">SHA-1 指纹:</span>
                  <n-button text size="tiny" type="primary" @click="handleCopy(formattedSha1, 'SHA-1 指纹')">
                    复制
                  </n-button>
                </div>
                <div class="font-mono text-[11px] bg-gray-100 dark:bg-gray-900 p-1.5 rounded break-all select-all">
                  {{ formattedSha1 }}
                </div>
              </div>
            </div>
          </n-card>
        </n-gi>
      </n-grid>
    </template>
  </div>
</template>
