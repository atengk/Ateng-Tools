<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useThemeVars } from 'naive-ui';

import InputCopyable from '../../components/InputCopyable.vue';
import { computeChmodOctalRepresentation, computeChmodSymbolicRepresentation } from './chmod-calculator.service';

import type { Group, Scope } from './chmod-calculator.types';

const themeVars = useThemeVars();
const { t } = useI18n();

const scopes = computed<{ scope: Scope; title: string }[]>(() => [
  { scope: 'read', title: t('tools.chmod-calculator.read', '读取 (4)') },
  { scope: 'write', title: t('tools.chmod-calculator.write', '写入 (2)') },
  { scope: 'execute', title: t('tools.chmod-calculator.execute', '执行 (1)') },
]);
const groups: Group[] = ['owner', 'group', 'public'];
const groupTitles = computed<Record<Group, string>>(() => ({
  owner: t('tools.chmod-calculator.owner', '所有者 (u)'),
  group: t('tools.chmod-calculator.group', '所属组 (g)'),
  public: t('tools.chmod-calculator.public', '其他用户 (o)'),
}));

const permissions = ref({
  owner: { read: false, write: false, execute: false },
  group: { read: false, write: false, execute: false },
  public: { read: false, write: false, execute: false },
});

const octal = computed(() => computeChmodOctalRepresentation({ permissions: permissions.value }));
const symbolic = computed(() => computeChmodSymbolicRepresentation({ permissions: permissions.value }));
</script>

<template>
  <div>
    <n-table :bordered="false" :bottom-bordered="false" single-column class="permission-table">
      <thead>
        <tr>
          <th class="text-center" scope="col" />
          <th class="text-center" scope="col">
            {{ groupTitles.owner }}
          </th>
          <th class="text-center" scope="col">
            {{ groupTitles.group }}
          </th>
          <th class="text-center" scope="col">
            {{ groupTitles.public }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="{ scope, title } of scopes" :key="scope">
          <td class="line-header">
            {{ title }}
          </td>
          <td v-for="group of groups" :key="group" class="text-center">
            <!-- <n-switch v-model:value="permissions[group][scope]" /> -->
            <n-checkbox v-model:checked="permissions[group][scope]" size="large" />
          </td>
        </tr>
      </tbody>
    </n-table>

    <div class="octal-result">
      {{ octal }}
    </div>
    <div class="octal-result">
      {{ symbolic }}
    </div>

    <InputCopyable :value="`chmod ${octal} path`" readonly />
  </div>
</template>

<style lang="less" scoped>
.octal-result {
  text-align: center;
  font-size: 50px;
  font-family: monospace;
  color: v-bind('themeVars.primaryColor');
  margin: 20px 0;
}
.permission-table {
  td,
  th {
    padding: 15px;

    @media screen and (max-width: 600px) {
      padding: 5px;
    }
  }
}
.line-header {
  font-weight: bold;
  text-align: right;
  max-width: 80px;
}
.text-center {
  text-align: center;
}
</style>
