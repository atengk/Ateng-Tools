<!-- JSON to Entity Converter Tool Component -->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import TextareaCopyable from '@/components/TextareaCopyable.vue';
import {
  DEFAULT_JSON_TO_ENTITY_OPTIONS,
  type JsonToEntityOptions,
} from './json-to-entity.models';
import { generateCodeFromJson } from './json-to-entity.service';

const { t } = useI18n();

const options = reactive<JsonToEntityOptions>({
  ...DEFAULT_JSON_TO_ENTITY_OPTIONS,
});

const sampleJson = JSON.stringify(
  {
    order_id: 1702983748293849088,
    order_no: 'ORD20260918001',
    is_paid: true,
    total_amount: 299.5,
    created_time: '2026-09-18 14:30:00',
    buyer_info: {
      buyer_id: 8801,
      nickname: 'Ateng',
      phone: '13800138000',
    },
    items: [
      {
        item_id: 101,
        product_name: 'Wireless Mechanical Keyboard',
        price: 199.5,
        quantity: 1,
      },
      {
        item_id: 102,
        product_name: 'Gaming Mouse',
        price: 100.0,
        quantity: 1,
      },
    ],
  },
  null,
  2,
);

const rawJsonInput = ref<string>(sampleJson);

const generatedCode = computed(() => {
  return generateCodeFromJson(rawJsonInput.value, options);
});

function loadSample() {
  rawJsonInput.value = sampleJson;
}

function clearInput() {
  rawJsonInput.value = '';
}

async function pasteInput() {
  if (navigator?.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        rawJsonInput.value = text;
      }
    } catch {
      // 容错降级
    }
  }
}
</script>

<template>
  <div class="json-to-entity" style="flex: 0 0 100%">
    <!-- 顶部配置面板 -->
    <c-card mb-4>
      <div flex flex-col gap-3>
        <!-- 第一行：基础操作与语言切换 -->
        <div flex flex-wrap items-center justify-between gap-4>
          <div flex items-center gap-2>
            <c-button size="small" @click="loadSample">
              {{ t('tools.json-to-entity.loadSample', '载入示例') }}
            </c-button>
            <c-button size="small" @click="pasteInput">
              {{ t('tools.json-to-entity.paste', '粘贴') }}
            </c-button>
            <c-button size="small" @click="clearInput">
              {{ t('tools.json-to-entity.clear', '清空') }}
            </c-button>
          </div>

          <div flex items-center gap-2>
            <span text-13px font-semibold>生成目标:</span>
            <n-radio-group v-model:value="options.targetLanguage" size="small">
              <n-radio-button value="java">Java (Lombok/Jackson)</n-radio-button>
              <n-radio-button value="typescript">TypeScript Interface</n-radio-button>
            </n-radio-group>
          </div>
        </div>

        <!-- 第二行：Java 特定选项与命名 -->
        <div flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100 dark:border-zinc-700>
          <div flex items-center gap-2>
            <span text-12px text-gray-500>根类名:</span>
            <n-input
              v-model:value="options.rootClassName"
              size="small"
              placeholder="RootDTO"
              style="width: 140px"
            />
          </div>

          <div v-if="options.targetLanguage === 'java'" flex items-center gap-2>
            <span text-12px text-gray-500>包名:</span>
            <n-input
              v-model:value="options.packageName"
              size="small"
              placeholder="com.ateng.model.dto"
              style="width: 200px"
            />
          </div>

          <div flex items-center gap-4 text-12px>
            <n-checkbox v-model:checked="options.autoCamelCase">
              下划线转驼峰
            </n-checkbox>

            <template v-if="options.targetLanguage === 'java'">
              <n-checkbox v-model:checked="options.useLombok">
                Lombok 注解
              </n-checkbox>
              <n-checkbox v-model:checked="options.useJackson">
                Jackson @JsonProperty
              </n-checkbox>
              <n-checkbox v-model:checked="options.innerClassMode">
                静态内部类
              </n-checkbox>
            </template>
          </div>
        </div>
      </div>
    </c-card>

    <!-- 左右分栏对照 -->
    <div grid grid-cols-1 lg:grid-cols-2 gap-4>
      <!-- 左侧：JSON 输入 -->
      <c-card title="JSON 数据源输入 (JSON Source)">
        <n-input
          v-model:value="rawJsonInput"
          type="textarea"
          :rows="20"
          placeholder="在此粘贴任意 JSON 对象或数组..."
          font-mono
        />
      </c-card>

      <!-- 右侧：生成代码预览 -->
      <c-card :title="options.targetLanguage === 'java' ? 'Java 实体类输出 (Java Class)' : 'TypeScript 接口输出 (TS Interface)'">
        <TextareaCopyable
          :value="generatedCode"
          :language="options.targetLanguage === 'java' ? 'java' : 'typescript'"
        />
      </c-card>
    </div>
  </div>
</template>
