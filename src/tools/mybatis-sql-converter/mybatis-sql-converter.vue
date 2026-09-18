<!-- MyBatis SQL Log Converter Tool Component -->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useClipboard } from '@vueuse/core';
import TextareaCopyable from '@/components/TextareaCopyable.vue';
import CInputText from '@/ui/c-input-text/c-input-text.vue';
import { useStyleStore } from '@/stores/style.store';
import {
  DEFAULT_RESTORE_OPTIONS,
  type MyBatisRestoreOptions,
  type SqlDialect,
} from './mybatis-sql-converter.models';
import { parseAndRestoreMyBatisLogs } from './mybatis-sql-converter.service';

const { t } = useI18n();
const styleStore = useStyleStore();
const { copy } = useClipboard();

// 1. Reactive state & options
const options = reactive<MyBatisRestoreOptions>({
  ...DEFAULT_RESTORE_OPTIONS,
});

const sampleLogs = `2026-09-18 14:30:00.102 [main] DEBUG c.a.mapper.UserMapper.selectList - ==>  Preparing: SELECT id, username, email, age, is_active, created_time FROM t_user WHERE status = ? AND age >= ? AND is_active = ? AND remark IS NOT NULL ORDER BY created_time DESC
2026-09-18 14:30:00.105 [main] DEBUG c.a.mapper.UserMapper.selectList - ==> Parameters: 1(Integer), 18(Integer), true(Boolean)
2026-09-18 14:30:00.108 [main] DEBUG c.a.mapper.UserMapper.selectList - <==      Total: 5
2026-09-18 14:30:01.215 [main] DEBUG c.a.mapper.UserMapper.updateById - ==>  Preparing: UPDATE t_user SET email = ?, updated_time = ? WHERE id = ?
2026-09-18 14:30:01.216 [main] DEBUG c.a.mapper.UserMapper.updateById - ==> Parameters: admin@example.com(String), 2026-09-18 14:30:00(Timestamp), 1001(Long)
2026-09-18 14:30:01.220 [main] DEBUG c.a.mapper.UserMapper.updateById - <==    Updates: 1`;

const rawLogs = ref(sampleLogs);

// 2. Computed restored result
const restoreResult = computed(() => {
  return parseAndRestoreMyBatisLogs(rawLogs.value, options);
});

// 3. Dialect & format options
const dialectOptions: { label: string; value: SqlDialect }[] = [
  { label: 'MySQL / MariaDB', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'Oracle PL/SQL', value: 'plsql' },
  { label: 'Standard SQL', value: 'sql' },
  { label: 'SQLite', value: 'sqlite' },
  { label: 'SQL Server (T-SQL)', value: 'tsql' },
];

const booleanFormatOptions = [
  { label: '0 / 1', value: 'numeric' },
  { label: 'FALSE / TRUE', value: 'keyword' },
];

// 4. Helper actions
function loadSample() {
  rawLogs.value = sampleLogs;
}

function clearLogs() {
  rawLogs.value = '';
}

async function pasteLogs() {
  if (navigator?.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        rawLogs.value = text;
      }
    } catch {
      // Graceful fallback if permission is blocked
    }
  }
}
</script>

<template>
  <div style="flex: 0 0 100%" class="mybatis-sql-converter">
    <!-- Top Settings & Controls -->
    <c-card mb-4>
      <div flex flex-wrap items-center justify-between gap-4>
        <!-- Left: Quick Actions -->
        <div flex flex-wrap items-center gap-2>
          <c-button size="small" @click="loadSample">
            {{ t('tools.mybatis-sql-converter.loadSample', 'Load Sample') }}
          </c-button>
          <c-button size="small" @click="pasteLogs">
            {{ t('tools.mybatis-sql-converter.paste', 'Paste') }}
          </c-button>
          <c-button size="small" @click="clearLogs">
            {{ t('tools.mybatis-sql-converter.clear', 'Clear') }}
          </c-button>
        </div>

        <!-- Right: SQL Configuration -->
        <div flex flex-wrap items-center gap-4>
          <div flex items-center gap-2>
            <span text-13px text-gray-500>
              {{ t('tools.mybatis-sql-converter.booleanFormat', 'Boolean:') }}
            </span>
            <c-buttons-select
              v-model:value="options.booleanFormat"
              size="small"
              :options="booleanFormatOptions"
            />
          </div>

          <div flex items-center gap-2>
            <span text-13px text-gray-500>
              {{ t('tools.mybatis-sql-converter.dialect', 'Dialect:') }}
            </span>
            <c-select
              v-model:value="options.dialect"
              size="small"
              style="width: 150px"
              :options="dialectOptions"
            />
          </div>

          <div flex items-center gap-2>
            <span text-13px text-gray-500>
              {{ t('tools.mybatis-sql-converter.prettify', 'Prettify SQL:') }}
            </span>
            <n-switch v-model:value="options.prettify" size="medium" />
          </div>
        </div>
      </div>
    </c-card>

    <!-- Main Workspace: Split Input & Output -->
    <div
      class="grid gap-4"
      :class="styleStore.isSmallScreen ? 'grid-cols-1' : 'grid-cols-2'"
    >
      <!-- Left Panel: Raw Log Input -->
      <div flex flex-col gap-2>
        <div flex items-center justify-between>
          <span font-medium text-gray-700 dark:text-gray-300>
            {{ t('tools.mybatis-sql-converter.inputLabel', 'Raw MyBatis Logs') }}
          </span>
        </div>
        <c-input-text
          v-model:value="rawLogs"
          :placeholder="t('tools.mybatis-sql-converter.inputPlaceholder', 'Paste your MyBatis logs with Preparing and Parameters lines here...')"
          rows="22"
          autosize
          raw-text
          multiline
          monospace
          test-id="mybatis-logs-input"
        />
      </div>

      <!-- Right Panel: Restored SQL Output -->
      <div flex flex-col gap-3>
        <!-- Header status and batch copy -->
        <div flex items-center justify-between>
          <div flex items-center gap-2>
            <span font-medium text-gray-700 dark:text-gray-300>
              {{ t('tools.mybatis-sql-converter.outputLabel', 'Executable SQL') }}
            </span>
            <n-tag v-if="restoreResult.statements.length > 0" type="success" size="small" round>
              {{ restoreResult.statements.length }} {{ restoreResult.statements.length === 1 ? 'statement' : 'statements' }}
            </n-tag>
          </div>
        </div>

        <!-- Warning Alert if any statement has placeholder-parameter count mismatch -->
        <div
          v-for="stmt in restoreResult.statements.filter(s => s.hasMismatch)"
          :key="stmt.id"
        >
          <c-alert type="warning" :title="`${t('tools.mybatis-sql-converter.warningTitle', 'Warning on Statement')} #${stmt.id}`">
            {{ stmt.warningMessage }}
          </c-alert>
        </div>

        <!-- Primary Combined SQL View with Copy Action -->
        <textarea-copyable
          :value="restoreResult.combinedSql"
          language="sql"
          :copy-message="t('tools.mybatis-sql-converter.copyAll', 'Copy All SQL')"
        />

        <!-- Secondary: Individual statement cards when multiple queries exist -->
        <div v-if="restoreResult.statements.length > 1" mt-2 flex flex-col gap-3>
          <div text-13px font-semibold text-gray-500>
            {{ t('tools.mybatis-sql-converter.individualStatements', 'Individual Statements') }} ({{ restoreResult.statements.length }})
          </div>

          <c-card
            v-for="stmt in restoreResult.statements"
            :key="stmt.id"
            size="small"
          >
            <div mb-2 flex items-center justify-between>
              <div flex items-center gap-2>
                <n-tag size="tiny" type="info">#{{ stmt.id }}</n-tag>
                <span text-12px text-gray-500>
                  {{ stmt.paramCount }} {{ t('tools.mybatis-sql-converter.params', 'params') }}
                </span>
                <n-tag v-if="stmt.hasMismatch" size="tiny" type="warning">
                  {{ t('tools.mybatis-sql-converter.mismatchTag', 'Mismatch') }}
                </n-tag>
              </div>
              <c-button size="small" @click="copy(options.prettify && stmt.prettifiedSql ? stmt.prettifiedSql : stmt.restoredSql)">
                {{ t('tools.mybatis-sql-converter.copy', 'Copy') }}
              </c-button>
            </div>
            <n-code
              :code="options.prettify && stmt.prettifiedSql ? stmt.prettifiedSql : stmt.restoredSql"
              language="sql"
              :trim="false"
            />
          </c-card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mybatis-sql-converter {
  width: 100%;
}
</style>
