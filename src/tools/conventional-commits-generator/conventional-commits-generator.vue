<!--
  规范化 Git 提交生成器视图层
  @author Ateng
  @since 2026-10-02
-->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import {
  AlertTriangle,
  Check,
  Code,
  Copy,
  GitCommit,
  Rotate,
  Terminal,
  Trash,
} from '@vicons/tabler';
import { useCopy } from '@/composable/copy';
import {
  COMMIT_TYPES,
  generateCommitMessage,
} from './conventional-commits-generator.service';
import type {
  CommitMessageSpec,
  CommitType,
} from './conventional-commits-generator.types';

const { t } = useI18n();
const message = useMessage();
const { copy } = useCopy({ createToast: false });

const spec = reactive<CommitMessageSpec>({
  type: 'feat',
  scope: 'auth',
  isBreaking: false,
  breakingDescription: '',
  subject: '支持用户微信扫码快捷登录与多因子认证',
  body: '引入微信开放平台 OAuth2 授权链路，在认证中心统一颁发用户 JWT 会话。',
  issuesClosed: '102, #108',
  footer: '',
});

const recentScopes = ref<string[]>(['auth', 'ui', 'api', 'core', 'router', 'deps', 'config']);

const generated = computed(() => {
  return generateCommitMessage(spec);
});

function selectType(t: CommitType) {
  spec.type = t;
}

function selectScope(s: string) {
  spec.scope = s;
}

function handleCopy(text: string) {
  if (!text) return;
  copy(text);
  message.success(t('tools.conventional-commits-generator.copySuccess'));
}

function loadSample() {
  spec.type = 'feat';
  spec.scope = 'auth';
  spec.isBreaking = false;
  spec.breakingDescription = '';
  spec.subject = '支持用户微信扫码快捷登录与多因子认证';
  spec.body = '引入微信开放平台 OAuth2 授权链路，在认证中心统一颁发用户 JWT 会话。';
  spec.issuesClosed = '102, #108';
}

function resetForm() {
  spec.type = 'feat';
  spec.scope = '';
  spec.isBreaking = false;
  spec.breakingDescription = '';
  spec.subject = '';
  spec.body = '';
  spec.issuesClosed = '';
  spec.footer = '';
}
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <!-- 左侧：表单配置区 -->
      <div class="lg:col-span-7 space-y-4 min-w-0">
        <n-card size="small" :title="t('tools.conventional-commits-generator.cardBuilder')" class="bg-surface shadow-sm">
          <template #header-extra>
            <div class="flex items-center space-x-2">
              <n-button text size="tiny" type="primary" @click="loadSample">
                {{ t('tools.conventional-commits-generator.sampleFill') }}
              </n-button>
              <n-button text size="tiny" type="error" @click="resetForm">
                <template #icon>
                  <n-icon :component="Trash" />
                </template>
                {{ t('tools.conventional-commits-generator.resetForm') }}
              </n-button>
            </div>
          </template>

          <div class="space-y-4">
            <!-- 1. 提交类型 (Type) 选择 -->
            <div>
              <div class="text-xs text-gray-400 mb-1.5 font-medium">
                {{ t('tools.conventional-commits-generator.typeLabel') }}
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                <div
                  v-for="item in COMMIT_TYPES"
                  :key="item.type"
                  class="p-2 border rounded-lg cursor-pointer transition-colors text-left flex flex-col justify-between"
                  :class="spec.type === item.type
                    ? 'border-primary bg-primary/10 shadow-xs'
                    : 'border-base hover:bg-gray-500/5'"
                  @click="selectType(item.type)"
                >
                  <div class="flex items-center space-x-1.5 font-medium text-xs">
                    <span>{{ item.emoji }}</span>
                    <span class="font-mono">{{ item.type }}</span>
                  </div>
                  <div class="text-xs text-gray-400 mt-1 truncate" :title="item.description">
                    {{ item.title }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. 影响范围 (Scope) 与常用预设 -->
            <div>
              <div class="text-xs text-gray-400 mb-1 font-medium">
                {{ t('tools.conventional-commits-generator.scopeLabel') }}
              </div>
              <n-input
                v-model:value="spec.scope"
                size="medium"
                :placeholder="t('tools.conventional-commits-generator.scopePlaceholder')"
                clearable
              />
              <div class="flex items-center flex-wrap gap-1.5 mt-1.5">
                <span class="text-xs text-gray-400 mr-1">{{ t('tools.conventional-commits-generator.scopeRecent') }}</span>
                <n-tag
                  v-for="s in recentScopes"
                  :key="s"
                  size="tiny"
                  round
                  checkable
                  :checked="spec.scope === s"
                  class="cursor-pointer"
                  @click="selectScope(s)"
                >
                  {{ s }}
                </n-tag>
              </div>
            </div>

            <!-- 3. 重大破坏性变更 (Breaking Change) 开关 -->
            <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <n-icon :component="AlertTriangle" />
                  <span>{{ t('tools.conventional-commits-generator.breakingLabel') }}</span>
                </div>
                <n-switch v-model:value="spec.isBreaking" size="small" />
              </div>
              <div v-if="spec.isBreaking">
                <n-input
                  v-model:value="spec.breakingDescription"
                  size="small"
                  :placeholder="t('tools.conventional-commits-generator.breakingDescPlaceholder')"
                  clearable
                />
              </div>
            </div>

            <!-- 4. 简要摘要 (Subject) -->
            <div>
              <div class="flex items-center justify-between text-xs text-gray-400 mb-1 font-medium">
                <span>{{ t('tools.conventional-commits-generator.subjectLabel') }}</span>
                <span
                  class="font-mono"
                  :class="{
                    'text-red-500 font-bold': generated.isSubjectExcessive,
                    'text-amber-500': generated.isSubjectWarning && !generated.isSubjectExcessive,
                    'text-gray-400': !generated.isSubjectWarning,
                  }"
                >
                  {{ generated.subjectLength }}/50
                </span>
              </div>
              <n-input
                v-model:value="spec.subject"
                size="large"
                :placeholder="t('tools.conventional-commits-generator.subjectPlaceholder')"
                clearable
              />
              <div v-if="generated.isSubjectWarning" class="text-xs text-amber-500 mt-1">
                {{ t('tools.conventional-commits-generator.subjectWarning', { count: generated.subjectLength }) }}
              </div>
            </div>

            <!-- 5. 详细正文 (Body) -->
            <div>
              <div class="text-xs text-gray-400 mb-1 font-medium">
                {{ t('tools.conventional-commits-generator.bodyLabel') }}
              </div>
              <n-input
                v-model:value="spec.body"
                type="textarea"
                :rows="3"
                :placeholder="t('tools.conventional-commits-generator.bodyPlaceholder')"
                clearable
              />
            </div>

            <!-- 6. 关联 Issue 编号 (Footer) -->
            <div>
              <div class="text-xs text-gray-400 mb-1 font-medium">
                {{ t('tools.conventional-commits-generator.issuesLabel') }}
              </div>
              <n-input
                v-model:value="spec.issuesClosed"
                size="medium"
                :placeholder="t('tools.conventional-commits-generator.issuesPlaceholder')"
                clearable
              />
            </div>
          </div>
        </n-card>
      </div>

      <!-- 右侧：实时预览与命令生成区 -->
      <div class="lg:col-span-5 space-y-4 min-w-0">
        <n-card size="small" :title="t('tools.conventional-commits-generator.cardPreview')" class="bg-surface shadow-sm">
          <div class="space-y-4">
            <!-- 首行高亮 Header 预览 -->
            <div>
              <div class="text-xs text-gray-400 mb-1">提交首行 (Header)：</div>
              <div class="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded font-mono font-bold text-primary break-all text-sm">
                {{ generated.header }}
              </div>
            </div>

            <!-- 完整多行提交文本展示 -->
            <div>
              <div class="text-xs text-gray-400 mb-1 flex items-center justify-between">
                <span>完整提交文本 (Commit Message)：</span>
                <n-button size="tiny" secondary type="primary" @click="handleCopy(generated.rawMessage)">
                  <template #icon>
                    <n-icon :component="Copy" />
                  </template>
                  {{ t('tools.conventional-commits-generator.copyMessage') }}
                </n-button>
              </div>
              <div class="p-3 bg-gray-500/5 border border-base rounded font-mono text-xs whitespace-pre-wrap break-all leading-relaxed max-h-56 overflow-y-auto">
                {{ generated.rawMessage }}
              </div>
            </div>

            <!-- 终端命令卡片 -->
            <div class="space-y-3 pt-2 border-t border-base">
              <!-- Bash / Zsh 命令 -->
              <div>
                <div class="text-xs text-gray-400 mb-1 flex items-center justify-between">
                  <span>Bash / Zsh 终端命令：</span>
                  <n-button size="tiny" secondary @click="handleCopy(generated.bashCommand)">
                    <template #icon>
                      <n-icon :component="Terminal" />
                    </template>
                    {{ t('tools.conventional-commits-generator.copyBash') }}
                  </n-button>
                </div>
                <div class="p-2 bg-gray-500/5 border border-base rounded font-mono text-xs text-gray-600 dark:text-gray-300 break-all select-all">
                  {{ generated.bashCommand }}
                </div>
              </div>

              <!-- PowerShell 命令 -->
              <div>
                <div class="text-xs text-gray-400 mb-1 flex items-center justify-between">
                  <span>PowerShell 命令：</span>
                  <n-button size="tiny" secondary @click="handleCopy(generated.powerShellCommand)">
                    <template #icon>
                      <n-icon :component="Terminal" />
                    </template>
                    {{ t('tools.conventional-commits-generator.copyPowerShell') }}
                  </n-button>
                </div>
                <div class="p-2 bg-gray-500/5 border border-base rounded font-mono text-xs text-gray-600 dark:text-gray-300 break-all select-all">
                  {{ generated.powerShellCommand }}
                </div>
              </div>
            </div>

            <!-- 规范指南小贴士 -->
            <div class="p-3 bg-gray-500/5 rounded-lg text-xs text-gray-500 space-y-1">
              <div class="font-semibold text-gray-700 dark:text-gray-300">💡 Conventional Commits 格式规范：</div>
              <div>• <strong>Header</strong>: &lt;type&gt;(&lt;scope&gt;)?: &lt;subject&gt;</div>
              <div>• <strong>Body</strong>: 与 Header 空一行，说明原因与上下文</div>
              <div>• <strong>Footer</strong>: BREAKING CHANGE 或 Closes #Issue</div>
            </div>
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>
