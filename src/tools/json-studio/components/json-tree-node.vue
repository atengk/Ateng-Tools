<!--
 * JSON Studio 交互式树形节点组件
 *
 * @author Ateng
 * @since 2026-10-02
-->
<script setup lang="ts">
import { computed } from 'vue';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
} from '@vicons/tabler';
import type { JsonTreeNode, JsonValueType } from '../json-studio.types';

const props = withDefaults(
  defineProps<{
    node: JsonTreeNode;
    expandedIds: Set<string>;
    searchQuery?: string;
    matchedPaths?: Set<string>;
    level?: number;
  }>(),
  {
    searchQuery: '',
    level: 0,
    matchedPaths: () => new Set<string>(),
  },
);

const emit = defineEmits<{
  (e: 'toggleExpand', id: string): void;
  (e: 'copyPath', path: string): void;
  (e: 'copyValue', node: JsonTreeNode): void;
}>();

const isContainer = computed(() => {
  return props.node.type === 'object' || props.node.type === 'array';
});

const isExpanded = computed(() => {
  return props.expandedIds.has(props.node.id);
});

const isPathMatched = computed(() => {
  return props.matchedPaths.has(props.node.jsonPath);
});

function getTypeBadge(type: JsonValueType): { text: string; tagType: 'default' | 'info' | 'success' | 'warning' | 'error' } {
  switch (type) {
    case 'object':
      return { text: 'obj', tagType: 'info' };
    case 'array':
      return { text: 'arr', tagType: 'success' };
    case 'string':
      return { text: 'str', tagType: 'warning' };
    case 'number':
      return { text: 'num', tagType: 'info' };
    case 'boolean':
      return { text: 'bool', tagType: 'default' };
    case 'null':
      return { text: 'null', tagType: 'error' };
  }
}

function highlightMatch(text: string, query: string): { text: string; match: boolean }[] {
  if (!query || query.trim() === '') {
    return [{ text, match: false }];
  }
  const parts: { text: string; match: boolean }[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let startIndex = 0;
  let index = lowerText.indexOf(lowerQuery, startIndex);

  while (index !== -1) {
    if (index > startIndex) {
      parts.push({ text: text.slice(startIndex, index), match: false });
    }
    parts.push({ text: text.slice(index, index + query.length), match: true });
    startIndex = index + query.length;
    index = lowerText.indexOf(lowerQuery, startIndex);
  }

  if (startIndex < text.length) {
    parts.push({ text: text.slice(startIndex), match: false });
  }
  return parts;
}
</script>

<template>
  <div class="flex flex-col text-xs leading-relaxed select-text font-mono">
    <!-- 节点单行容器 -->
    <div
      class="group flex items-center py-1 px-1.5 rounded transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800/60"
      :class="{
        'bg-blue-50/70 dark:bg-blue-950/30': isPathMatched,
      }"
      :style="{ paddingLeft: `${level * 16 + 4}px` }"
    >
      <!-- 展开 / 折叠小箭头 -->
      <div class="w-4 h-4 mr-1 flex items-center justify-center shrink-0">
        <button
          v-if="isContainer && node.children && node.children.length > 0"
          type="button"
          class="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-transform"
          @click.stop="emit('toggleExpand', node.id)"
        >
          <n-icon size="14" :component="isExpanded ? ChevronDown : ChevronRight" />
        </button>
      </div>

      <!-- 节点 Key 名 -->
      <span
        class="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
        @click="isContainer ? emit('toggleExpand', node.id) : null"
      >
        <span
          v-for="(part, idx) in highlightMatch(node.key, searchQuery)"
          :key="idx"
          :class="{
            'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 rounded px-0.5 font-bold':
              part.match,
          }"
        >
          {{ part.text }}
        </span>
        <span class="text-slate-400 dark:text-slate-500 mr-1.5">:</span>
      </span>

      <!-- 数据类型徽章 -->
      <n-tag
        :type="getTypeBadge(node.type).tagType"
        size="tiny"
        round
        :bordered="false"
        class="mr-2 scale-85 origin-left"
      >
        {{ getTypeBadge(node.type).text }}
      </n-tag>

      <!-- 节点值展示 -->
      <div class="flex items-center gap-1 min-w-0 mr-2">
        <!-- 容器类型：对象/数组 -->
        <template v-if="isContainer">
          <span v-if="!isExpanded" class="text-slate-400 dark:text-slate-500 cursor-pointer text-xs" @click="emit('toggleExpand', node.id)">
            {{ node.displayValue }}
          </span>
          <span v-else class="text-slate-500 dark:text-slate-400 text-xs">
            {{ node.type === 'object' ? '{' : '[' }}
          </span>
        </template>

        <!-- 基本类型：字符串 -->
        <template v-else-if="node.type === 'string'">
          <span class="text-emerald-600 dark:text-emerald-400 break-all">
            <span
              v-for="(part, idx) in highlightMatch(JSON.stringify(node.value), searchQuery)"
              :key="idx"
              :class="{
                'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 rounded px-0.5 font-bold':
                  part.match,
              }"
            >
              {{ part.text }}
            </span>
          </span>
        </template>

        <!-- 基本类型：数字 -->
        <template v-else-if="node.type === 'number'">
          <span class="text-sky-600 dark:text-sky-400 font-semibold">
            <span
              v-for="(part, idx) in highlightMatch(String(node.value), searchQuery)"
              :key="idx"
              :class="{
                'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 rounded px-0.5 font-bold':
                  part.match,
              }"
            >
              {{ part.text }}
            </span>
          </span>
        </template>

        <!-- 基本类型：布尔 -->
        <template v-else-if="node.type === 'boolean'">
          <span class="text-purple-600 dark:text-purple-400 font-semibold">
            {{ String(node.value) }}
          </span>
        </template>

        <!-- 基本类型：null -->
        <template v-else-if="node.type === 'null'">
          <span class="text-slate-400 dark:text-slate-500 italic">
            null
          </span>
        </template>
      </div>

      <!-- 快捷操作悬浮按钮组 -->
      <div class="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
        <!-- 复制绝对 JSONPath -->
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button
              size="tiny"
              quaternary
              circle
              @click.stop="emit('copyPath', node.jsonPath)"
            >
              <template #icon>
                <n-icon :component="Copy" />
              </template>
            </n-button>
          </template>
          复制绝对路径: {{ node.jsonPath }}
        </n-tooltip>

        <!-- 复制当前节点值 -->
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button
              size="tiny"
              quaternary
              circle
              @click.stop="emit('copyValue', node)"
            >
              <template #icon>
                <n-icon :component="FileText" />
              </template>
            </n-button>
          </template>
          复制节点值
        </n-tooltip>
      </div>
    </div>

    <!-- 递归子节点渲染 -->
    <div v-if="isContainer && isExpanded && node.children && node.children.length > 0" class="flex flex-col">
      <json-tree-node
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :expanded-ids="expandedIds"
        :search-query="searchQuery"
        :matched-paths="matchedPaths"
        :level="level + 1"
        @toggle-expand="emit('toggleExpand', $event)"
        @copy-path="emit('copyPath', $event)"
        @copy-value="emit('copyValue', $event)"
      />

      <!-- 闭合括号 -->
      <div
        class="py-0.5 text-slate-500 dark:text-slate-400 text-xs select-none"
        :style="{ paddingLeft: `${level * 16 + 20}px` }"
      >
        {{ node.type === 'object' ? '}' : ']' }}
      </div>
    </div>
  </div>
</template>
