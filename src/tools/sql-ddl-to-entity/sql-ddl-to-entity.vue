<!-- SQL DDL to Entity Converter Tool Component -->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TextareaCopyable from '@/components/TextareaCopyable.vue';
import {
  DEFAULT_SQL_DDL_OPTIONS,
  type MyBatisPlusIdType,
  type SqlDdlOptions,
} from './sql-ddl-to-entity.models';
import { generateCodeFromDdl } from './sql-ddl-to-entity.service';

const { t } = useI18n();

const options = reactive<SqlDdlOptions>({
  ...DEFAULT_SQL_DDL_OPTIONS,
});

const idTypeOptions: { label: string; value: MyBatisPlusIdType }[] = [
  { label: 'ASSIGN_ID (雪花算法 ID)', value: 'ASSIGN_ID' },
  { label: 'AUTO (数据库自增)', value: 'AUTO' },
  { label: 'INPUT (用户手动输入)', value: 'INPUT' },
  { label: 'NONE (无主键策略)', value: 'NONE' },
];

const sampleDdl = `CREATE TABLE \`t_user_order\` (
  \`id\` bigint NOT NULL COMMENT '主键订单ID',
  \`order_no\` varchar(64) NOT NULL COMMENT '订单全局唯一编号',
  \`user_id\` bigint NOT NULL COMMENT '下单用户唯一ID',
  \`pay_amount\` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT '订单实际支付金额',
  \`order_status\` tinyint NOT NULL DEFAULT '0' COMMENT '订单状态: 0-待支付, 1-已支付, 2-已发货, 3-已完成, 4-已取消',
  \`pay_time\` datetime DEFAULT NULL COMMENT '支付时间',
  \`remark\` varchar(255) DEFAULT NULL COMMENT '用户订单备注',
  \`deleted\` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除标记: 0-未删除, 1-已删除',
  \`created_time\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  \`updated_time\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_order_no\` (\`order_no\`),
  KEY \`idx_user_id\` (\`user_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户交易订单主表';`;

const rawDdlInput = ref<string>(sampleDdl);

const generatedCode = computed(() => {
  return generateCodeFromDdl(rawDdlInput.value, options);
});

function loadSample() {
  rawDdlInput.value = sampleDdl;
}

function clearInput() {
  rawDdlInput.value = '';
}

async function pasteInput() {
  if (navigator?.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        rawDdlInput.value = text;
      }
    } catch {
      // 容错降级
    }
  }
}
</script>

<template>
  <div class="sql-ddl-to-entity" style="flex: 0 0 100%">
    <!-- 顶部配置面板 -->
    <c-card mb-4>
      <div flex flex-col gap-3>
        <!-- 第一行：快捷操作与目标语言 -->
        <div flex flex-wrap items-center justify-between gap-4>
          <div flex items-center gap-2>
            <c-button size="small" @click="loadSample">
              {{ t('tools.sql-ddl-to-entity.loadSample', '载入示例') }}
            </c-button>
            <c-button size="small" @click="pasteInput">
              {{ t('tools.sql-ddl-to-entity.paste', '粘贴') }}
            </c-button>
            <c-button size="small" @click="clearInput">
              {{ t('tools.sql-ddl-to-entity.clear', '清空') }}
            </c-button>
          </div>

          <div flex items-center gap-2>
            <span text-13px font-semibold>生成目标:</span>
            <n-radio-group v-model:value="options.targetLanguage" size="small">
              <n-radio-button value="java">Java (MyBatis-Plus + Lombok)</n-radio-button>
              <n-radio-button value="typescript">TypeScript Interface</n-radio-button>
            </n-radio-group>
          </div>
        </div>

        <!-- 第二行：Java / 数据库配置项 -->
        <div flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100 dark:border-zinc-700>
          <div v-if="options.targetLanguage === 'java'" flex items-center gap-2>
            <span text-12px text-gray-500>包名:</span>
            <n-input
              v-model:value="options.packageName"
              size="small"
              placeholder="com.ateng.entity"
              style="width: 180px"
            />
          </div>

          <div flex items-center gap-2>
            <span text-12px text-gray-500>类名后缀:</span>
            <n-input
              v-model:value="options.entityNameSuffix"
              size="small"
              placeholder="Entity"
              style="width: 100px"
            />
          </div>

          <div v-if="options.targetLanguage === 'java'" flex items-center gap-2>
            <span text-12px text-gray-500>主键策略:</span>
            <n-select
              v-model:value="options.idType"
              :options="idTypeOptions"
              size="small"
              style="width: 220px"
            />
          </div>

          <div flex items-center gap-4 text-12px>
            <n-checkbox v-model:checked="options.removeTablePrefix">
              剥离 t_ 表前缀
            </n-checkbox>

            <template v-if="options.targetLanguage === 'java'">
              <n-checkbox v-model:checked="options.useLombok">
                Lombok 注解
              </n-checkbox>
              <n-checkbox v-model:checked="options.useMyBatisPlus">
                MyBatis-Plus 注解
              </n-checkbox>
            </template>
          </div>
        </div>
      </div>
    </c-card>

    <!-- 左右分栏对照 -->
    <div grid grid-cols-1 lg:grid-cols-2 gap-4>
      <!-- 左侧：DDL 输入 -->
      <c-card title="MySQL DDL 建表语句 (SQL DDL)">
        <n-input
          v-model:value="rawDdlInput"
          type="textarea"
          :rows="20"
          placeholder="在此粘贴 MySQL CREATE TABLE 语句..."
          font-mono
        />
      </c-card>

      <!-- 右侧：生成代码预览 -->
      <c-card :title="options.targetLanguage === 'java' ? 'Java Entity 实体类代码' : 'TypeScript Interface 接口代码'">
        <TextareaCopyable
          :value="generatedCode"
          :language="options.targetLanguage === 'java' ? 'java' : 'typescript'"
        />
      </c-card>
    </div>
  </div>
</template>
