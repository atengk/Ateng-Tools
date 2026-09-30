<script setup lang="ts">
/**
 * PDF 加密与解密视图组件
 *
 * @author Ateng
 * @since 2026-09-30
 */
import { useMessage } from 'naive-ui';
import {
  Download,
  FileText,
  Key,
  Lock,
  LockOpen,
  Refresh,
  ShieldCheck,
} from '@vicons/tabler';
import { decryptPdf, encryptPdf, isPdfEncrypted } from './pdf-encrypt-decrypt.service';
import type { PdfPermissions } from './pdf-encrypt-decrypt.types';
import { formatBytes } from '@/utils/convert';

const message = useMessage();

// 当前主选项卡：'encrypt' 加密 | 'decrypt' 解密
const activeTab = ref<'encrypt' | 'decrypt'>('encrypt');

// --- 加密模式状态 ---
const encryptFile = ref<File | null>(null);
const encryptLoading = ref(false);
const userPassword = ref('');
const ownerPassword = ref('');
const showAdvancedPermissions = ref(false);

const permissions = reactive<PdfPermissions>({
  printing: 'highResolution',
  modifying: false,
  copying: true,
  annotating: false,
  fillingForms: true,
  contentAccessibility: true,
  documentAssembly: false,
});

// --- 解密模式状态 ---
const decryptFile = ref<File | null>(null);
const decryptLoading = ref(false);
const decryptPassword = ref('');
const isFileProtected = ref<boolean | null>(null);

/**
 * 触发浏览器本地文件下载
 */
function triggerFileDownload(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ----------------- 加密逻辑 -----------------
async function onEncryptFileUpload(file: File) {
  encryptFile.value = file;
  userPassword.value = '';
  ownerPassword.value = '';
}

function clearEncrypt() {
  encryptFile.value = null;
  userPassword.value = '';
  ownerPassword.value = '';
  showAdvancedPermissions.value = false;
}

async function handleStartEncrypt() {
  if (!encryptFile.value) {
    message.warning('请先选择待加密的 PDF 文件');
    return;
  }
  if (!userPassword.value || userPassword.value.trim() === '') {
    message.warning('请输入用户查看密码');
    return;
  }

  encryptLoading.value = true;
  try {
    const buffer = await encryptFile.value.arrayBuffer();
    const result = await encryptPdf(buffer, {
      userPassword: userPassword.value.trim(),
      ownerPassword: ownerPassword.value.trim() || undefined,
      permissions,
    });

    const baseName = encryptFile.value.name.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}_已加密.pdf`;
    triggerFileDownload(result.bytes, outName);
    message.success(`加密成功！已生成 ${result.pageCount} 页受保护的 PDF 文档`);
  }
  catch (err: any) {
    message.error(err?.message || '加密处理失败，请重试');
  }
  finally {
    encryptLoading.value = false;
  }
}

// ----------------- 解密逻辑 -----------------
async function onDecryptFileUpload(file: File) {
  decryptFile.value = file;
  decryptPassword.value = '';
  decryptLoading.value = true;
  isFileProtected.value = null;

  try {
    const buffer = await file.arrayBuffer();
    const encrypted = await isPdfEncrypted(buffer);
    isFileProtected.value = encrypted;

    if (!encrypted) {
      message.info('检测到该 PDF 文档未设置密码保护，可直接解密导出');
    }
  }
  catch (err: any) {
    message.warning(`文档检测提示：${err?.message || '请直接输入密码尝试解密'}`);
  }
  finally {
    decryptLoading.value = false;
  }
}

function clearDecrypt() {
  decryptFile.value = null;
  decryptPassword.value = '';
  isFileProtected.value = null;
}

async function handleStartDecrypt() {
  if (!decryptFile.value) {
    message.warning('请先选择待解密的 PDF 文件');
    return;
  }
  if (!decryptPassword.value || decryptPassword.value.trim() === '') {
    message.warning('请输入解密所需的口令密码');
    return;
  }

  decryptLoading.value = true;
  try {
    const buffer = await decryptFile.value.arrayBuffer();
    const result = await decryptPdf(buffer, {
      password: decryptPassword.value.trim(),
    });

    const baseName = decryptFile.value.name.replace(/\.[^/.]+$/, '');
    const outName = `${baseName}_已解密.pdf`;
    triggerFileDownload(result.bytes, outName);
    message.success(`解密成功！已成功解除密码保护并导出 ${result.pageCount} 页无限制文档`);
  }
  catch (err: any) {
    message.error(err?.message || '解密失败，请检查密码是否正确');
  }
  finally {
    decryptLoading.value = false;
  }
}
</script>

<template>
  <div class="pdf-encrypt-decrypt-wrapper" flex flex-col gap-4>
    <!-- 顶层主操作选项卡 -->
    <n-tabs v-model:value="activeTab" type="segment" animated justify-content="center">
      <n-tab-pane name="encrypt" tab="PDF 加密 (添加密码保护)">
        <!-- 加密上传区 -->
        <div v-if="!encryptFile && !encryptLoading" mx-auto w-full max-w-650px py-2>
          <c-file-upload
            :title="$t('tools.pdf-encrypt-decrypt.uploadEncryptTitle', '将待加密的 PDF 拖拽至此处，或点击浏览选择')"
            :button-text="$t('tools.pdf-encrypt-decrypt.browseEncryptFiles', '浏览选择 PDF')"
            accept=".pdf"
            @file-upload="onEncryptFileUpload"
          />
        </div>

        <!-- 加密处理中动画 -->
        <div v-if="encryptLoading" py-12 text-center>
          <n-spin size="large" description="正在为 PDF 施加密码保护与安全策略，请稍候..." />
        </div>

        <!-- 加密配置面板 -->
        <div v-if="encryptFile && !encryptLoading" flex flex-col gap-4>
          <!-- 文件概要概览卡片 (居中) -->
          <n-card :bordered="true" size="small">
            <div flex flex-wrap items-center justify-center gap-3 text-center>
              <div flex items-center gap-2 overflow-hidden>
                <n-icon size="20" class="text-primary flex-shrink-0" :component="FileText" />
                <span font-bold text-sm truncate max-w-360px>{{ encryptFile.name }}</span>
              </div>
              <div flex items-center gap-2 flex-shrink-0>
                <n-tag size="small" type="info" round :bordered="false">
                  {{ formatBytes(encryptFile.size) }}
                </n-tag>
              </div>
            </div>
          </n-card>

          <!-- 密码与安全策略表单卡片 -->
          <n-card title="设置加密与安全访问策略" size="small" :bordered="true">
            <n-form label-placement="left" label-width="120">
              <n-form-item label="查看密码 (必填)" required>
                <n-input
                  v-model:value="userPassword"
                  type="password"
                  show-password-on="click"
                  placeholder="请输入打开文档时必需的查看密码"
                  clearable
                >
                  <template #prefix>
                    <n-icon :component="Key" class="text-gray-400" />
                  </template>
                </n-input>
              </n-form-item>

              <n-form-item label="管理密码 (选填)">
                <n-input
                  v-model:value="ownerPassword"
                  type="password"
                  show-password-on="click"
                  placeholder="选填，用于权限管控的所有者管理密码"
                  clearable
                >
                  <template #prefix>
                    <n-icon :component="ShieldCheck" class="text-gray-400" />
                  </template>
                </n-input>
              </n-form-item>

              <!-- 高级权限控制折叠项 -->
              <div mb-3>
                <n-button
                  size="tiny"
                  quaternary
                  @click="showAdvancedPermissions = !showAdvancedPermissions"
                >
                  {{ showAdvancedPermissions ? '收起细粒度权限控制' : '展开细粒度权限控制 (可选)' }}
                </n-button>
              </div>

              <n-collapse-transition :show="showAdvancedPermissions">
                <n-card size="small" embedded :bordered="false" class="mb-3">
                  <n-grid cols="1 s:2" :x-gap="16" :y-gap="12">
                    <n-grid-item>
                      <div class="permission-item">
                        <span class="label">允许打印文档</span>
                        <n-select
                          v-model:value="permissions.printing"
                          size="small"
                          :options="[
                            { label: '允许高质量打印', value: 'highResolution' },
                            { label: '允许低分辨率打印', value: 'lowResolution' },
                            { label: '禁止打印文档', value: false },
                          ]"
                        />
                      </div>
                    </n-grid-item>

                    <n-grid-item>
                      <div class="permission-item">
                        <span class="label">允许复制文本与图像</span>
                        <n-switch v-model:value="permissions.copying" size="small" />
                      </div>
                    </n-grid-item>

                    <n-grid-item>
                      <div class="permission-item">
                        <span class="label">允许修改文档内容</span>
                        <n-switch v-model:value="permissions.modifying" size="small" />
                      </div>
                    </n-grid-item>

                    <n-grid-item>
                      <div class="permission-item">
                        <span class="label">允许填写交互表单</span>
                        <n-switch v-model:value="permissions.fillingForms" size="small" />
                      </div>
                    </n-grid-item>

                    <n-grid-item>
                      <div class="permission-item">
                        <span class="label">允许添加批注标注</span>
                        <n-switch v-model:value="permissions.annotating" size="small" />
                      </div>
                    </n-grid-item>

                    <n-grid-item>
                      <div class="permission-item">
                        <span class="label">支持屏幕阅读辅助</span>
                        <n-switch v-model:value="permissions.contentAccessibility" size="small" />
                      </div>
                    </n-grid-item>
                  </n-grid>
                </n-card>
              </n-collapse-transition>
            </n-form>

            <!-- 操作按钮组 (严格水平居中) -->
            <div flex flex-wrap items-center justify-center gap-3 pt-3>
              <n-button
                type="primary"
                secondary
                :disabled="!userPassword"
                @click="handleStartEncrypt"
              >
                <template #icon>
                  <n-icon :component="Lock" />
                </template>
                开始加密并下载
              </n-button>

              <n-button
                secondary
                type="error"
                @click="clearEncrypt"
              >
                <template #icon>
                  <n-icon :component="Refresh" />
                </template>
                重新选择
              </n-button>
            </div>
          </n-card>
        </div>
      </n-tab-pane>

      <n-tab-pane name="decrypt" tab="PDF 解密 (解除密码限制)">
        <!-- 解密上传区 -->
        <div v-if="!decryptFile && !decryptLoading" mx-auto w-full max-w-650px py-2>
          <c-file-upload
            :title="$t('tools.pdf-encrypt-decrypt.uploadDecryptTitle', '将受密码保护的 PDF 拖拽至此处，或点击浏览选择')"
            :button-text="$t('tools.pdf-encrypt-decrypt.browseDecryptFiles', '浏览选择加密 PDF')"
            accept=".pdf"
            @file-upload="onDecryptFileUpload"
          />
        </div>

        <!-- 解密处理中动画 -->
        <div v-if="decryptLoading" py-12 text-center>
          <n-spin size="large" description="正在验证口令并剥离加密限制，请稍候..." />
        </div>

        <!-- 解密操作面板 -->
        <div v-if="decryptFile && !decryptLoading" flex flex-col gap-4>
          <!-- 文件概要概览卡片 (居中) -->
          <n-card :bordered="true" size="small">
            <div flex flex-wrap items-center justify-center gap-3 text-center>
              <div flex items-center gap-2 overflow-hidden>
                <n-icon size="20" class="text-primary flex-shrink-0" :component="FileText" />
                <span font-bold text-sm truncate max-w-360px>{{ decryptFile.name }}</span>
              </div>
              <div flex items-center gap-2 flex-shrink-0>
                <n-tag size="small" type="info" round :bordered="false">
                  {{ formatBytes(decryptFile.size) }}
                </n-tag>
                <n-tag
                  v-if="isFileProtected !== null"
                  size="small"
                  :type="isFileProtected ? 'warning' : 'success'"
                  round
                  :bordered="false"
                >
                  {{ isFileProtected ? '已受保护' : '未设密码' }}
                </n-tag>
              </div>
            </div>
          </n-card>

          <!-- 解密口令输入卡片 -->
          <n-card title="输入解密口令" size="small" :bordered="true">
            <n-form label-placement="left" label-width="100">
              <n-form-item label="解密口令" required>
                <n-input
                  v-model:value="decryptPassword"
                  type="password"
                  show-password-on="click"
                  placeholder="请输入该 PDF 文档的访问或管理口令"
                  clearable
                  @keydown.enter="handleStartDecrypt"
                >
                  <template #prefix>
                    <n-icon :component="Key" class="text-gray-400" />
                  </template>
                </n-input>
              </n-form-item>
            </n-form>

            <!-- 操作按钮组 (严格水平居中) -->
            <div flex flex-wrap items-center justify-center gap-3 pt-2>
              <n-button
                type="primary"
                secondary
                :disabled="!decryptPassword"
                @click="handleStartDecrypt"
              >
                <template #icon>
                  <n-icon :component="LockOpen" />
                </template>
                立即解密并下载
              </n-button>

              <n-button
                secondary
                type="error"
                @click="clearDecrypt"
              >
                <template #icon>
                  <n-icon :component="Refresh" />
                </template>
                重新选择
              </n-button>
            </div>
          </n-card>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<style scoped>
.permission-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.permission-item .label {
  font-size: 13px;
  color: var(--n-text-color);
}
</style>
