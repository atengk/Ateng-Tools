<!--
  增强工具卡片组件 (Enhanced Tool Card)
  包含 40x40 微底色圆角图标微容器、标题高亮、Match Cue Badge 与底部辅助操作底栏

  @author Ateng
  @since 2026-10-02
-->
<script setup lang="ts">
import { computed } from 'vue';
import { NIcon, useThemeVars } from 'naive-ui';
import { ChevronRight, Search as SearchIcon } from '@vicons/tabler';
import FavoriteButton from './FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';
import { useCategory } from '@/composable/category';
import { brandTokens } from '@/styles/tokens';

interface Props {
  tool: Tool & { category?: string };
  matchRange?: [number, number];
  matchCueType?: 'pinyin' | 'keyword' | 'path';
  matchCueValue?: string;
  isActive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  matchRange: undefined,
  matchCueType: undefined,
  matchCueValue: undefined,
  isActive: false,
});

const theme = useThemeVars();
const { t } = useI18n();
const { getCategoryTitle } = useCategory();

const COLOR_PALETTES = [
  { bgClass: 'bg-blue-50 dark:bg-blue-950/60', iconClass: 'text-blue-600 dark:text-blue-400' },
  { bgClass: 'bg-emerald-50 dark:bg-emerald-950/60', iconClass: 'text-emerald-600 dark:text-emerald-400' },
  { bgClass: 'bg-orange-50 dark:bg-orange-950/60', iconClass: 'text-orange-600 dark:text-orange-400' },
  { bgClass: 'bg-cyan-50 dark:bg-cyan-950/60', iconClass: 'text-cyan-600 dark:text-cyan-400' },
  { bgClass: 'bg-purple-50 dark:bg-purple-950/60', iconClass: 'text-purple-600 dark:text-purple-400' },
  { bgClass: 'bg-indigo-50 dark:bg-indigo-950/60', iconClass: 'text-indigo-600 dark:text-indigo-400' },
  { bgClass: 'bg-pink-50 dark:bg-pink-950/60', iconClass: 'text-pink-600 dark:text-pink-400' },
  { bgClass: 'bg-amber-50 dark:bg-amber-950/60', iconClass: 'text-amber-600 dark:text-amber-400' },
  { bgClass: 'bg-teal-50 dark:bg-teal-950/60', iconClass: 'text-teal-600 dark:text-teal-400' },
  { bgClass: 'bg-rose-50 dark:bg-rose-950/60', iconClass: 'text-rose-600 dark:text-rose-400' },
];

/**
 * 根据工具属性与路径哈希稳定派生原型风格的多彩浅底调色板
 *
 * @param tool 工具实体
 * @returns 对应的 UnoCSS 背景与文本色彩类组合
 */
function getToolIconTheme(tool: { path?: string; name?: string; category?: string }): { bgClass: string; iconClass: string } {
  const path = tool.path?.toLowerCase() || '';
  if (path.includes('json')) {
    return COLOR_PALETTES[1]; // 翡翠绿
  }
  if (path.includes('git')) {
    return COLOR_PALETTES[2]; // 活力橙
  }
  if (path.includes('port') || path.includes('mac')) {
    return COLOR_PALETTES[3]; // 天空青
  }
  if (path.includes('cron')) {
    return COLOR_PALETTES[0]; // 经典蓝
  }
  if (path.includes('jwt') || path.includes('token') || path.includes('crypto')) {
    return COLOR_PALETTES[7]; // 琥珀黄
  }
  if (path.includes('base64')) {
    return COLOR_PALETTES[6]; // 活力粉
  }
  if (path.includes('sql')) {
    return COLOR_PALETTES[8]; // 清新茶绿
  }

  // 其他工具通过稳定字符串哈希在调色板中均匀分布
  const str = tool.path || tool.name || '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return COLOR_PALETTES[hash % COLOR_PALETTES.length];
}

const iconTheme = computed(() => getToolIconTheme(props.tool));

interface FeatureHighlightRule {
  key: string;
  fallback: string;
}

const TOOL_FEATURE_KEYS: Record<string, FeatureHighlightRule> = {
  cron: { key: 'fastForecast', fallback: '极速预测' },
  'json-studio': { key: 'visualInteractive', fallback: '可视化交互' },
  'git-memo': { key: 'commandCheatsheet', fallback: '命令行速查' },
  'random-port': { key: 'oneClickGenerate', fallback: '一键生成' },
  crontab: { key: 'guiInterface', fallback: '图形界面' },
  'json-viewer': { key: 'formatting', fallback: '格式化' },
  'json-minify': { key: 'minification', fallback: '极致压缩' },
  'sql-prettify': { key: 'sqlOptimization', fallback: 'SQL 优化' },
  'mybatis-sql': { key: 'smartRestore', fallback: '智能还原' },
  'chmod-calculator': { key: 'permissionCalc', fallback: '权限计算' },
  snowflake: { key: 'distributed', fallback: '分布式' },
  curl: { key: 'modernSyntax', fallback: '现代语法' },
  'hash-text': { key: 'cryptoSecurity', fallback: '加密安全' },
  websocket: { key: 'realtimeTest', fallback: '实时测试' },
  'http-client': { key: 'apiDebugging', fallback: '接口调试' },
  jwt: { key: 'tokenVerify', fallback: 'Token 校验' },
  base64: { key: 'quickCodec', fallback: '快捷编解码' },
  uuid: { key: 'uniqueId', fallback: '唯一标识' },
  'date-time': { key: 'timezoneConvert', fallback: '时区换算' },
  diff: { key: 'textDiff', fallback: '文本比对' },
  'qr-code': { key: 'qrCodeGenerate', fallback: '二维码生成' },
  qrcode: { key: 'qrCodeGenerate', fallback: '二维码生成' },
  barcode: { key: 'barcodeGenerate', fallback: '条码生成' },
  pdf: { key: 'pdfParse', fallback: '免装解析' },
};

function getToolFeatureHighlight(tool: { path?: string; name?: string; category?: string }): string {
  const path = tool.path?.toLowerCase() || '';
  for (const [pattern, item] of Object.entries(TOOL_FEATURE_KEYS)) {
    if (path.includes(pattern)) {
      return t(`home.card.features.${item.key}`, item.fallback);
    }
  }
  const cat = tool.category?.toLowerCase() || '';
  if (cat.includes('dev') || cat.includes('开发')) return t('home.card.features.devAccelerate', '开发加速');
  if (cat.includes('converter') || cat.includes('转换')) return t('home.card.features.formatConvert', '格式转换');
  if (cat.includes('security') || cat.includes('安全')) return t('home.card.features.localSecurity', '本地安全');
  if (cat.includes('network') || cat.includes('网络')) return t('home.card.features.networkDebug', '网络调试');
  if (cat.includes('text') || cat.includes('文本')) return t('home.card.features.textProcessing', '文本处理');
  if (cat.includes('pdf')) return t('home.card.features.pdfParse', 'PDF 解析');
  if (cat.includes('media') || cat.includes('图')) return t('home.card.features.mediaGenerate', '媒体生成');
  if (cat.includes('calc') || cat.includes('算')) return t('home.card.features.preciseMeasure', '精确度量');
  return t('home.card.features.readyOffline', '离线即用');
}

const featureHighlight = computed(() => getToolFeatureHighlight(props.tool));

const isJsonTool = computed(() => {
  const p = props.tool.path?.toLowerCase() || '';
  return p.includes('json') && !p.includes('converter') && !p.includes('to');
});

// 标题高亮切片：将标题按匹配下标 [start, end] 拆解为三段
const nameBefore = computed(() => {
  if (!props.matchRange) return '';
  return props.tool.name.slice(0, props.matchRange[0]);
});

const nameMatched = computed(() => {
  if (!props.matchRange) return '';
  return props.tool.name.slice(props.matchRange[0], props.matchRange[1] + 1);
});

const nameAfter = computed(() => {
  if (!props.matchRange) return '';
  return props.tool.name.slice(props.matchRange[1] + 1);
});

// 匹配线索文字：若命中非标题字段（拼音、关键词、路径），生成语义化微标签
const matchCueText = computed(() => {
  if (!props.matchCueType || !props.matchCueValue) return '';
  if (props.matchCueType === 'pinyin') {
    return t('home.search.matchCuePinyin', { value: props.matchCueValue });
  }
  if (props.matchCueType === 'keyword') {
    return t('home.search.matchCueKeyword', { value: props.matchCueValue });
  }
  if (props.matchCueType === 'path') {
    return t('home.search.matchCuePath', { value: props.matchCueValue });
  }
  return props.matchCueValue;
});
</script>

<template>
  <router-link :to="tool.path" class="tool-card-link group block h-full decoration-none">
    <c-card
      class="tool-card h-full flex flex-col justify-between"
      :class="{ 'is-keyboard-active': isActive }"
    >
      <div class="card-main flex-1">
        <!-- 头部：40x40 微底色圆角图标容器 + 分类标签 + 收藏按钮 -->
        <div class="flex items-center justify-between mb-3">
          <div
            class="tool-icon-wrapper w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-all duration-200 group-hover:scale-105"
            :class="iconTheme.bgClass"
          >
            <span v-if="isJsonTool" class="font-mono font-bold text-sm leading-none select-none" :class="iconTheme.iconClass">{ }</span>
            <n-icon v-else size="20" :component="tool.icon" :class="iconTheme.iconClass" />
          </div>

          <div class="flex items-center gap-2">
            <span
              v-if="tool.category"
              class="category-tag text-[11px] px-2 py-0.5 rounded-full font-medium"
            >
              {{ getCategoryTitle(tool.category) }}
            </span>

            <FavoriteButton :tool="tool" />
          </div>
        </div>

        <!-- 标题：15px 紧凑字重，悬浮主色，平滑截断 -->
        <div class="tool-name text-[15px] font-bold my-1 text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
          <template v-if="matchRange">
            <span>{{ nameBefore }}</span><span class="highlight-segment font-extrabold text-primary underline decoration-primary decoration-2 underline-offset-3">{{ nameMatched }}</span><span>{{ nameAfter }}</span>
          </template>
          <template v-else>
            {{ tool.name }}
          </template>
        </div>

        <!-- 描述：2 行高度规整与舒适行高 -->
        <div class="tool-desc line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 min-h-[36px]">
          {{ tool.description }}
        </div>

        <!-- Match Cue Badge 匹配线索微标签 -->
        <div v-if="matchCueText" class="mt-2.5 flex items-center">
          <span class="match-cue-badge text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium">
            <n-icon size="12" :component="SearchIcon" class="match-cue-icon" />
            <span>{{ matchCueText }}</span>
          </span>
        </div>
      </div>

      <!-- 卡片底部辅助操作底栏 (Action Footer - 左侧特性亮点标签，右侧打开工具指引) -->
      <div class="tool-card-footer mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 select-none">
        <span class="card-feature-tag inline-flex items-center gap-1 text-[11px] font-medium text-amber-600/90 dark:text-amber-400/90">
          <span class="text-amber-500">⚡</span>
          <span>{{ featureHighlight }}</span>
        </span>

        <span class="card-open-action text-primary flex items-center gap-0.5 font-medium transition-all group-hover:underline">
          <span>{{ t('home.card.openTool') }}</span>
          <n-icon size="13" :component="ChevronRight" class="transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </c-card>
  </router-link>
</template>

<style scoped lang="less">
.tool-card-link {
  display: block;
  height: 100%;

  .tool-card {
    border: 1px solid v-bind('theme.borderColor');
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05);
    transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover,
    &.is-keyboard-active {
      transform: translateY(-3px);
      border-color: v-bind('theme.primaryColor');
      box-shadow: v-bind('brandTokens.focusRing'), 0 12px 24px -6px rgba(37, 99, 235, 0.14), 0 4px 6px -4px rgba(0, 0, 0, 0.04);

      .tool-name {
        color: v-bind('theme.primaryColor');
        transition: color 0.2s ease;
      }
    }
  }

  .category-tag {
    background-color: rgba(148, 163, 184, 0.12);
    color: v-bind('theme.textColor3');
  }

  .match-cue-badge {
    background-color: v-bind('brandTokens.primaryLightBg');
    color: v-bind('theme.primaryColor');
    border: 1px solid v-bind('brandTokens.primaryFaded');

    .match-cue-icon {
      font-size: 10px;
    }
  }
}
</style>
