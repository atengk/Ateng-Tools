<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import { convert } from './list-converter.models';
import type { ConvertOptions } from './list-converter.types';

const { t } = useI18n();

const sortOrderOptions = computed(() => [
  {
    label: t('tools.list-converter.sortAsc', '按升序排序'),
    value: 'asc',
    disabled: false,
  },
  {
    label: t('tools.list-converter.sortDesc', '按降序排序'),
    value: 'desc',
    disabled: false,
  },
]);

const conversionConfig = useStorage<ConvertOptions>('list-converter:conversionConfig', {
  lowerCase: false,
  trimItems: true,
  removeDuplicates: true,
  keepLineBreaks: false,
  itemPrefix: '',
  itemSuffix: '',
  listPrefix: '',
  listSuffix: '',
  reverseList: false,
  sortList: null,
  separator: ', ',
});

function transformer(value: string) {
  return convert(value, conversionConfig.value);
}
</script>

<template>
  <div style="flex: 0 0 100%">
    <div style="margin: 0 auto; max-width: 600px">
      <c-card>
        <div flex>
          <div>
            <n-form-item :label="t('tools.list-converter.trimItems', '去除项首尾空格')" label-placement="left" label-width="150" :show-feedback="false" mb-2>
              <n-switch v-model:value="conversionConfig.trimItems" />
            </n-form-item>
            <n-form-item :label="t('tools.list-converter.removeDuplicates', '去除重复项')" label-placement="left" label-width="150" :show-feedback="false" mb-2>
              <n-switch v-model:value="conversionConfig.removeDuplicates" data-test-id="removeDuplicates" />
            </n-form-item>
            <n-form-item
              :label="t('tools.list-converter.lowerCase', '转换为小写')"
              label-placement="left"
              label-width="150"
              :show-feedback="false"
              mb-2
            >
              <n-switch v-model:value="conversionConfig.lowerCase" />
            </n-form-item>
            <n-form-item :label="t('tools.list-converter.keepLineBreaks', '保留换行符')" label-placement="left" label-width="150" :show-feedback="false" mb-2>
              <n-switch v-model:value="conversionConfig.keepLineBreaks" />
            </n-form-item>
          </div>
          <div flex-1>
            <c-select
              v-model:value="conversionConfig.sortList"
              :label="t('tools.list-converter.sortList', '列表排序')"
              label-position="left"
              label-width="120px"
              label-align="right"
              mb-2
              :options="sortOrderOptions"
              w-full
              :disabled="conversionConfig.reverseList"
              data-test-id="sortList"
              :placeholder="t('tools.list-converter.sortPlaceholder', '字母排序')"
            />

            <c-input-text
              v-model:value="conversionConfig.separator"
              :label="t('tools.list-converter.separator', '分隔符')"
              label-position="left"
              label-width="120px"
              label-align="right"
              mb-2
              placeholder=","
            />

            <n-form-item :label="t('tools.list-converter.wrapItem', '每项包裹')" label-placement="left" label-width="120" :show-feedback="false" mb-2>
              <c-input-text
                v-model:value="conversionConfig.itemPrefix"
                :placeholder="t('tools.list-converter.itemPrefix', '项前缀')"
                test-id="itemPrefix"
              />
              <c-input-text
                v-model:value="conversionConfig.itemSuffix"
                :placeholder="t('tools.list-converter.itemSuffix', '项后缀')"
                test-id="itemSuffix"
              />
            </n-form-item>
            <n-form-item :label="t('tools.list-converter.wrapList', '列表包裹')" label-placement="left" label-width="120" :show-feedback="false" mb-2>
              <c-input-text
                v-model:value="conversionConfig.listPrefix"
                :placeholder="t('tools.list-converter.listPrefix', '列表前缀')"
                test-id="listPrefix"
              />
              <c-input-text
                v-model:value="conversionConfig.listSuffix"
                :placeholder="t('tools.list-converter.listSuffix', '列表后缀')"
                test-id="listSuffix"
              />
            </n-form-item>
          </div>
        </div>
      </c-card>
    </div>
  </div>
  <format-transformer
    :input-label="t('tools.list-converter.inputLabel', '输入数据')"
    :input-placeholder="t('tools.list-converter.inputPlaceholder', '在此粘贴待转换的列表数据...')"
    :output-label="t('tools.list-converter.outputLabel', '转换后的结果')"
    :transformer="transformer"
  />
</template>
