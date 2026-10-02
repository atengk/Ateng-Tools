<template>
  <div class="space-y-4">
    <!-- 顶部工作模式切换 -->
    <n-card size="small" class="shadow-sm">
      <n-tabs v-model:value="activeMode" type="segment" animated>
        <n-tab-pane name="sign" :tab="t('tools.jwt-signer.tabSign')" />
        <n-tab-pane name="verify" :tab="t('tools.jwt-signer.tabVerify')" />
      </n-tabs>
    </n-card>

    <!-- 模式 1：离线生成签名 JWT -->
    <div v-if="activeMode === 'sign'" class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <!-- 左栏：Header / Payload / Secret 输入 (7 列) -->
      <div class="lg:col-span-7 min-w-0 space-y-4">
        <!-- 头部与算法配置 -->
        <n-card :title="t('tools.jwt-signer.headerCardTitle')" size="small">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <div class="text-xs text-neutral-500 mb-1">
                {{ t('tools.jwt-signer.algorithmLabel') }}
              </div>
              <n-select
                v-model:value="signAlgorithm"
                :options="algorithmOptions"
                size="small"
                @update:value="syncHeaderAlg"
              />
            </div>
            <div>
              <div class="text-xs text-neutral-500 mb-1">
                {{ t('tools.jwt-signer.tokenTypeLabel') }}
              </div>
              <n-input value="JWT" size="small" readonly />
            </div>
          </div>
          <n-input
            v-model:value="signHeaderJson"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 5 }"
            class="font-mono text-xs"
          />
        </n-card>

        <!-- 载荷 Payload 编辑 -->
        <n-card :title="t('tools.jwt-signer.payloadCardTitle')" size="small">
          <template #header-extra>
            <div class="flex flex-wrap gap-1">
              <n-button size="tiny" quaternary @click="addExpiration(3600)">
                +1h
              </n-button>
              <n-button size="tiny" quaternary @click="addExpiration(86400)">
                +1d
              </n-button>
              <n-button size="tiny" quaternary @click="addExpiration(604800)">
                +7d
              </n-button>
              <n-button size="tiny" quaternary @click="formatSignPayload">
                {{ t('tools.jwt-signer.formatJson') }}
              </n-button>
            </div>
          </template>

          <n-input
            v-model:value="signPayloadJson"
            type="textarea"
            :autosize="{ minRows: 6, maxRows: 12 }"
            class="font-mono text-xs"
          />
        </n-card>

        <!-- 密钥 Secret -->
        <n-card :title="t('tools.jwt-signer.secretCardTitle')" size="small">
          <template #header-extra>
            <div class="flex items-center gap-2">
              <span class="text-xs text-neutral-500">{{ t('tools.jwt-signer.isBase64Secret') }}</span>
              <n-switch v-model:value="signSecretIsBase64" size="small" />
            </div>
          </template>
          <n-input
            v-model:value="signSecret"
            type="password"
            show-password-on="click"
            placeholder="your-256-bit-secret"
            size="small"
            class="font-mono"
          />
        </n-card>

        <!-- 居中操作栏 -->
        <div class="flex justify-center">
          <n-button type="primary" size="medium" @click="handleGenerateJwt">
            <template #icon><n-icon :component="KeyIcon" /></template>
            {{ t('tools.jwt-signer.btnSign') }}
          </n-button>
        </div>
      </div>

      <!-- 右栏：生成结果与三段解析 (5 列) -->
      <div class="lg:col-span-5 min-w-0 space-y-4">
        <n-card :title="t('tools.jwt-signer.generatedJwtTitle')" size="small">
          <template #header-extra>
            <n-button size="tiny" secondary type="primary" @click="handleCopy(generatedToken)">
              {{ t('tools.jwt-signer.copyToken') }}
            </n-button>
          </template>

          <div class="p-2.5 rounded bg-neutral-900 font-mono text-xs break-all leading-relaxed select-all">
            <template v-if="generatedToken">
              <span class="text-red-400">{{ generatedTokenParts[0] }}</span>
              <span class="text-neutral-500">.</span>
              <span class="text-purple-400">{{ generatedTokenParts[1] }}</span>
              <span class="text-neutral-500">.</span>
              <span class="text-cyan-400">{{ generatedTokenParts[2] }}</span>
            </template>
            <span v-else class="text-neutral-500">
              {{ t('tools.jwt-signer.clickToGeneratePrompt') }}
            </span>
          </div>

          <div class="flex items-center justify-between mt-3 text-xs text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              <span>Header</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
              <span>Payload</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              <span>Signature</span>
            </div>
          </div>
        </n-card>

        <!-- 纯离线安全提示 -->
        <n-alert type="success" :title="t('tools.jwt-signer.offlineNoticeTitle')">
          {{ t('tools.jwt-signer.offlineNoticeDesc') }}
        </n-alert>
      </div>
    </div>

    <!-- 模式 2：离线验签与诊断 -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <!-- 左栏：输入待验 Token 与 Secret (6 列) -->
      <div class="lg:col-span-6 min-w-0 space-y-4">
        <n-card :title="t('tools.jwt-signer.verifyInputTitle')" size="small">
          <template #header-extra>
            <div class="flex items-center gap-2">
              <n-button size="tiny" quaternary @click="fillSampleValidToken">
                {{ t('tools.jwt-signer.sampleValid') }}
              </n-button>
              <n-button size="tiny" quaternary @click="fillSampleTamperedToken">
                {{ t('tools.jwt-signer.sampleTampered') }}
              </n-button>
            </div>
          </template>

          <n-input
            v-model:value="verifyInputToken"
            type="textarea"
            :placeholder="t('tools.jwt-signer.verifyTokenPlaceholder')"
            :autosize="{ minRows: 4, maxRows: 8 }"
            class="font-mono text-xs"
          />

          <div class="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs text-neutral-500">{{ t('tools.jwt-signer.verifySecretLabel') }}</span>
              <div class="flex items-center gap-1.5">
                <span class="text-2xs text-neutral-400">Base64</span>
                <n-switch v-model:value="verifySecretIsBase64" size="small" />
              </div>
            </div>
            <n-input
              v-model:value="verifySecret"
              type="password"
              show-password-on="click"
              placeholder="输入签名密钥以验证有效性..."
              size="small"
              class="font-mono"
            />
          </div>
        </n-card>

        <!-- 验签诊断报告状态卡片 -->
        <n-card :title="t('tools.jwt-signer.diagnosticTitle')" size="small">
          <div class="space-y-3">
            <!-- 签名合法性状态 -->
            <div class="flex items-center justify-between p-2.5 rounded bg-surface border border-neutral-200 dark:border-neutral-800">
              <span class="text-xs font-medium">{{ t('tools.jwt-signer.signatureStatus') }}</span>
              <div v-if="!verifySecret">
                <n-tag size="small" type="warning" round>
                  {{ t('tools.jwt-signer.statusNeedSecret') }}
                </n-tag>
              </div>
              <div v-else-if="verifyResult.isSignatureValid">
                <n-tag size="small" type="success" round>
                  {{ t('tools.jwt-signer.statusSignatureValid') }}
                </n-tag>
              </div>
              <div v-else>
                <n-tag size="small" type="error" round>
                  {{ t('tools.jwt-signer.statusSignatureInvalid') }}
                </n-tag>
              </div>
            </div>

            <!-- 时效状态 -->
            <div class="p-2.5 rounded bg-surface border border-neutral-200 dark:border-neutral-800 space-y-1.5 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-neutral-500">{{ t('tools.jwt-signer.timeValidity') }}</span>
                <n-tag
                  v-if="verifyResult.timeStatus.isExpired"
                  size="tiny"
                  type="error"
                  round
                >
                  {{ t('tools.jwt-signer.statusExpired') }}
                </n-tag>
                <n-tag
                  v-else-if="verifyResult.timeStatus.isNotYetValid"
                  size="tiny"
                  type="warning"
                  round
                >
                  {{ t('tools.jwt-signer.statusNotYetValid') }}
                </n-tag>
                <n-tag
                  v-else-if="verifyResult.payload?.exp"
                  size="tiny"
                  type="success"
                  round
                >
                  {{ t('tools.jwt-signer.statusValidTime') }}
                </n-tag>
                <span v-else class="text-neutral-400">-</span>
              </div>

              <div v-if="verifyResult.timeStatus.issuedAtStr" class="flex justify-between text-neutral-400">
                <span>{{ t('tools.jwt-signer.issuedAt') }}</span>
                <span class="font-mono">{{ verifyResult.timeStatus.issuedAtStr }}</span>
              </div>
              <div v-if="verifyResult.timeStatus.expiresAtStr" class="flex justify-between text-neutral-400">
                <span>{{ t('tools.jwt-signer.expiresAt') }}</span>
                <span class="font-mono">{{ verifyResult.timeStatus.expiresAtStr }}</span>
              </div>
            </div>

            <!-- 错误信息提示 -->
            <n-alert
              v-if="verifyResult.errorMessage"
              type="error"
              size="small"
              class="mt-2"
            >
              {{ verifyResult.errorMessage }}
            </n-alert>
          </div>
        </n-card>
      </div>

      <!-- 右栏：解码内容透视 (6 列) -->
      <div class="lg:col-span-6 min-w-0 space-y-4">
        <!-- Header 透视 -->
        <n-card :title="t('tools.jwt-signer.decodedHeaderTitle')" size="small">
          <div class="overflow-x-auto max-w-full rounded bg-neutral-900 p-2 font-mono text-xs">
            <n-code
              :code="JSON.stringify(verifyResult.header || {}, null, 2)"
              language="json"
              word-wrap
            />
          </div>
        </n-card>

        <!-- Payload 透视 -->
        <n-card :title="t('tools.jwt-signer.decodedPayloadTitle')" size="small">
          <template #header-extra>
            <n-button
              size="tiny"
              quaternary
              @click="handleCopy(JSON.stringify(verifyResult.payload || {}, null, 2))"
            >
              {{ t('tools.jwt-signer.copy') }}
            </n-button>
          </template>
          <div class="overflow-x-auto max-w-full rounded bg-neutral-900 p-2 font-mono text-xs">
            <n-code
              :code="JSON.stringify(verifyResult.payload || {}, null, 2)"
              language="json"
              word-wrap
            />
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * JWT 签名与验签工坊视图组件
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { Key as KeyIcon } from '@vicons/tabler';
import { useCopy } from '@/composable/copy';
import type {
  HmacAlgorithm,
  JwtHeader,
  JwtPayload,
  JwtVerificationResult,
} from './jwt-signer.types';
import { signJwt, verifyJwt } from './jwt-signer.service';

const { t } = useI18n();
const message = useMessage();
const { copy } = useCopy({ createToast: false });

const activeMode = ref<'sign' | 'verify'>('sign');

// 算法选择
const signAlgorithm = ref<HmacAlgorithm>('HS256');
const algorithmOptions = [
  { label: 'HS256 (HMAC-SHA256)', value: 'HS256' },
  { label: 'HS384 (HMAC-SHA384)', value: 'HS384' },
  { label: 'HS512 (HMAC-SHA512)', value: 'HS512' },
];

// 签名输入状态
const signHeaderJson = ref<string>(
  JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2),
);
const defaultPayload = {
  sub: '1234567890',
  name: 'Ateng Developer',
  admin: true,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};
const signPayloadJson = ref<string>(JSON.stringify(defaultPayload, null, 2));
const signSecret = ref<string>('ateng-super-secret-key-2026');
const signSecretIsBase64 = ref<boolean>(false);
const generatedToken = ref<string>('');

// 生成的 Token 分段展示
const generatedTokenParts = computed(() => {
  if (!generatedToken.value) return ['', '', ''];
  return generatedToken.value.split('.');
});

// 同步下拉框算法到 Header JSON
function syncHeaderAlg(val: HmacAlgorithm) {
  try {
    const obj = JSON.parse(signHeaderJson.value);
    obj.alg = val;
    signHeaderJson.value = JSON.stringify(obj, null, 2);
  } catch {
    // 忽略格式错误
  }
}

// 格式化 Payload JSON
function formatSignPayload() {
  try {
    const obj = JSON.parse(signPayloadJson.value);
    signPayloadJson.value = JSON.stringify(obj, null, 2);
  } catch {
    message.warning(t('tools.jwt-signer.invalidJson'));
  }
}

// 快速增加过期时间
function addExpiration(seconds: number) {
  try {
    const obj = JSON.parse(signPayloadJson.value);
    const now = Math.floor(Date.now() / 1000);
    obj.iat = now;
    obj.exp = now + seconds;
    signPayloadJson.value = JSON.stringify(obj, null, 2);
    message.success(t('tools.jwt-signer.expAddedSuccess'));
  } catch {
    message.warning(t('tools.jwt-signer.invalidJson'));
  }
}

// 触发签名生成
async function handleGenerateJwt() {
  try {
    const header = JSON.parse(signHeaderJson.value) as JwtHeader;
    const payload = JSON.parse(signPayloadJson.value) as JwtPayload;

    const token = await signJwt(
      header,
      payload,
      signSecret.value,
      signSecretIsBase64.value,
    );
    generatedToken.value = token;
    message.success(t('tools.jwt-signer.signSuccess'));
  } catch (err: any) {
    message.error(`${t('tools.jwt-signer.signError')}: ${err?.message || err}`);
  }
}

// 验签状态
const verifyInputToken = ref<string>('');
const verifySecret = ref<string>('ateng-super-secret-key-2026');
const verifySecretIsBase64 = ref<boolean>(false);
const verifyResult = ref<JwtVerificationResult>({
  isValidFormat: false,
  isSignatureValid: false,
  header: null,
  payload: null,
  signature: '',
  timeStatus: { isExpired: false, isNotYetValid: false },
});

// 监听验签输入自动更新
async function runVerify() {
  if (!verifyInputToken.value.trim()) {
    verifyResult.value = {
      isValidFormat: false,
      isSignatureValid: false,
      header: null,
      payload: null,
      signature: '',
      timeStatus: { isExpired: false, isNotYetValid: false },
    };
    return;
  }

  verifyResult.value = await verifyJwt(
    verifyInputToken.value,
    verifySecret.value,
    verifySecretIsBase64.value,
  );
}

watch([verifyInputToken, verifySecret, verifySecretIsBase64], () => {
  runVerify();
});

// 填充合法示例 Token
async function fillSampleValidToken() {
  const secret = 'ateng-super-secret-key-2026';
  verifySecret.value = secret;
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: 'user_888',
    role: 'administrator',
    iat: now,
    exp: now + 7200,
  };
  const token = await signJwt(header, payload, secret);
  verifyInputToken.value = token;
}

// 填充被篡改示例 Token
async function fillSampleTamperedToken() {
  const secret = 'ateng-super-secret-key-2026';
  verifySecret.value = secret;
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: 'user_888',
    role: 'guest',
    iat: now,
    exp: now + 7200,
  };
  const token = await signJwt(header, payload, secret);
  // 伪造修改 payload 部分
  const parts = token.split('.');
  const forgedPayload = btoa(JSON.stringify({ sub: 'user_888', role: 'administrator_HACKED', exp: now + 7200 }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  verifyInputToken.value = `${parts[0]}.${forgedPayload}.${parts[2]}`;
}

// 复制工具
async function handleCopy(text: string) {
  if (!text) return;
  const ok = await copy(text);
  if (ok) {
    message.success(t('tools.jwt-signer.copySuccess'));
  }
}

// 初始化生成一次
handleGenerateJwt();
</script>
