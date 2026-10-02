<!--
  CSS 视觉工坊视图层
  @author Ateng
  @since 2026-10-02
-->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import {
  Brush,
  Copy,
  LayersSubtract,
  Palette,
  Plus,
  Refresh,
  Trash,
} from '@vicons/tabler';
import { useCopy } from '@/composable/copy';
import {
  calculateFluidTypography,
  convertUnits,
  formatBoxShadowCss,
  formatFancyBorderRadius,
  formatGlassmorphismCss,
} from './css-visual-studio.service';
import type {
  CssFluidConfig,
  FancyBorderRadiusConfig,
  GlassmorphismConfig,
  ShadowLayer,
} from './css-visual-studio.types';

const { t } = useI18n();
const message = useMessage();
const { copy } = useCopy({ createToast: false });

const activeModule = ref<'shadow' | 'glass' | 'radius' | 'fluid'>('shadow');
const canvasBg = ref<'light' | 'dark' | 'gradient' | 'pattern'>('gradient');

// 1. Box-Shadow 状态
const shadowLayers = ref<ShadowLayer[]>([
  {
    id: '1',
    inset: false,
    offsetX: 0,
    offsetY: 10,
    blur: 25,
    spread: -5,
    color: '#000000',
    opacity: 0.15,
  },
  {
    id: '2',
    inset: false,
    offsetX: 0,
    offsetY: 8,
    blur: 10,
    spread: -6,
    color: '#000000',
    opacity: 0.1,
  },
]);

function addShadowLayer() {
  shadowLayers.value.push({
    id: String(Date.now()),
    inset: false,
    offsetX: 0,
    offsetY: 4,
    blur: 8,
    spread: 0,
    color: '#000000',
    opacity: 0.1,
  });
}

function removeShadowLayer(id: string) {
  if (shadowLayers.value.length <= 1) return;
  shadowLayers.value = shadowLayers.value.filter((l) => l.id !== id);
}

const shadowResult = computed(() => formatBoxShadowCss(shadowLayers.value));

// 2. Glassmorphism 状态
const glassConfig = reactive<GlassmorphismConfig>({
  blur: 16,
  saturate: 180,
  bgColor: '#ffffff',
  bgOpacity: 0.25,
  borderColor: '#ffffff',
  borderOpacity: 0.4,
  borderWidth: 1,
  borderRadius: 16,
});

const glassResult = computed(() => formatGlassmorphismCss(glassConfig));

// 3. Fancy Border-Radius 状态
const radiusConfig = reactive<FancyBorderRadiusConfig>({
  topLeftX: 60,
  topRightX: 40,
  bottomRightX: 30,
  bottomLeftX: 70,
  topLeftY: 60,
  topRightY: 30,
  bottomRightY: 70,
  bottomLeftY: 40,
});

const radiusResult = computed(() => formatFancyBorderRadius(radiusConfig));

// 4. Fluid Typography 状态
const fluidConfig = reactive<CssFluidConfig>({
  minViewport: 375,
  maxViewport: 1440,
  minFontSize: 16,
  maxFontSize: 32,
  rootFontSize: 16,
});

const unitInputPx = ref<number>(24);
const unitResult = computed(() => convertUnits(unitInputPx.value));
const fluidResult = computed(() => calculateFluidTypography(fluidConfig));

// 统一导出代码计算
const currentExportCss = computed(() => {
  if (activeModule.value === 'shadow') {
    return shadowResult.value.css;
  }
  if (activeModule.value === 'glass') {
    return glassResult.value.css;
  }
  if (activeModule.value === 'radius') {
    return radiusResult.value.css;
  }
  return fluidResult.value.clampCss;
});

// 即时画布上预览框的内联样式
const previewBoxStyle = computed<Record<string, string>>(() => {
  if (activeModule.value === 'shadow') {
    return {
      boxShadow: shadowResult.value.shadowValue,
      borderRadius: '16px',
      background: canvasBg.value === 'dark' ? '#1e293b' : '#ffffff',
      color: canvasBg.value === 'dark' ? '#f8fafc' : '#0f172a',
    };
  }
  if (activeModule.value === 'glass') {
    return {
      ...glassResult.value.inlineStyle,
      color: '#ffffff',
    };
  }
  if (activeModule.value === 'radius') {
    return {
      borderRadius: radiusResult.value.borderRadiusValue,
      background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      color: '#ffffff',
      boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
    };
  }
  // fluid 模块
  return {
    fontSize: `${fluidConfig.minFontSize}px`,
    borderRadius: '12px',
    background: canvasBg.value === 'dark' ? '#1e293b' : '#ffffff',
    color: canvasBg.value === 'dark' ? '#f8fafc' : '#0f172a',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  };
});

function handleCopy(text: string) {
  if (!text) return;
  copy(text);
  message.success(t('tools.css-visual-studio.copySuccess'));
}
</script>

<template>
  <div class="space-y-4">
    <!-- 主操作区布局 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <!-- 左侧：微模块配置参数区 -->
      <div class="lg:col-span-7 space-y-4 min-w-0">
        <n-card size="small" class="bg-surface shadow-sm">
          <n-tabs v-model:value="activeModule" type="segment" animated>
            <!-- 模块 1: Box-Shadow -->
            <n-tab-pane name="shadow" :tab="t('tools.css-visual-studio.tabShadow')">
              <div class="space-y-4 mt-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-400 font-medium">阴影图层叠加列表</span>
                  <n-button size="tiny" secondary type="primary" @click="addShadowLayer">
                    <template #icon>
                      <n-icon :component="Plus" />
                    </template>
                    {{ t('tools.css-visual-studio.addLayer') }}
                  </n-button>
                </div>

                <div class="space-y-3">
                  <div
                    v-for="(layer, index) in shadowLayers"
                    :key="layer.id"
                    class="p-3 bg-gray-500/5 border border-base rounded-lg space-y-2.5"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-semibold">图层 #{{ index + 1 }}</span>
                      <div class="flex items-center space-x-2">
                        <span class="text-xs text-gray-400">{{ t('tools.css-visual-studio.layerInset') }}</span>
                        <n-switch v-model:value="layer.inset" size="small" />
                        <n-button
                          v-if="shadowLayers.length > 1"
                          text
                          size="tiny"
                          type="error"
                          @click="removeShadowLayer(layer.id)"
                        >
                          <template #icon>
                            <n-icon :component="Trash" />
                          </template>
                        </n-button>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <div class="text-gray-400 mb-1">{{ t('tools.css-visual-studio.offsetX') }}: {{ layer.offsetX }}px</div>
                        <n-slider v-model:value="layer.offsetX" :min="-40" :max="40" />
                      </div>
                      <div>
                        <div class="text-gray-400 mb-1">{{ t('tools.css-visual-studio.offsetY') }}: {{ layer.offsetY }}px</div>
                        <n-slider v-model:value="layer.offsetY" :min="-40" :max="40" />
                      </div>
                      <div>
                        <div class="text-gray-400 mb-1">{{ t('tools.css-visual-studio.blurRadius') }}: {{ layer.blur }}px</div>
                        <n-slider v-model:value="layer.blur" :min="0" :max="80" />
                      </div>
                      <div>
                        <div class="text-gray-400 mb-1">{{ t('tools.css-visual-studio.spreadRadius') }}: {{ layer.spread }}px</div>
                        <n-slider v-model:value="layer.spread" :min="-20" :max="40" />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-base/50 items-center">
                      <div class="flex items-center space-x-2">
                        <span class="text-gray-400">颜色:</span>
                        <n-color-picker v-model:value="layer.color" :show-alpha="false" size="small" />
                      </div>
                      <div>
                        <div class="text-gray-400 mb-1">{{ t('tools.css-visual-studio.colorOpacity') }}: {{ Math.round(layer.opacity * 100) }}%</div>
                        <n-slider v-model:value="layer.opacity" :min="0" :max="1" :step="0.05" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <!-- 模块 2: Glassmorphism -->
            <n-tab-pane name="glass" :tab="t('tools.css-visual-studio.tabGlass')">
              <div class="space-y-3 mt-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div class="text-xs text-gray-400 mb-1">{{ t('tools.css-visual-studio.blur') }}: {{ glassConfig.blur }}px</div>
                    <n-slider v-model:value="glassConfig.blur" :min="0" :max="40" />
                  </div>
                  <div>
                    <div class="text-xs text-gray-400 mb-1">{{ t('tools.css-visual-studio.saturate') }}: {{ glassConfig.saturate }}%</div>
                    <n-slider v-model:value="glassConfig.saturate" :min="100" :max="250" />
                  </div>
                  <div>
                    <div class="text-xs text-gray-400 mb-1">{{ t('tools.css-visual-studio.bgOpacity') }}: {{ Math.round(glassConfig.bgOpacity * 100) }}%</div>
                    <n-slider v-model:value="glassConfig.bgOpacity" :min="0.05" :max="0.8" :step="0.05" />
                  </div>
                  <div>
                    <div class="text-xs text-gray-400 mb-1">{{ t('tools.css-visual-studio.borderRadius') }}: {{ glassConfig.borderRadius }}px</div>
                    <n-slider v-model:value="glassConfig.borderRadius" :min="0" :max="36" />
                  </div>
                  <div>
                    <div class="text-xs text-gray-400 mb-1">{{ t('tools.css-visual-studio.borderWidth') }}: {{ glassConfig.borderWidth }}px</div>
                    <n-slider v-model:value="glassConfig.borderWidth" :min="0" :max="4" />
                  </div>
                  <div class="flex items-center space-x-2 pt-2">
                    <span class="text-xs text-gray-400">底色/边框色:</span>
                    <n-color-picker v-model:value="glassConfig.bgColor" size="small" :show-alpha="false" />
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <!-- 模块 3: Border-Radius -->
            <n-tab-pane name="radius" :tab="t('tools.css-visual-studio.tabRadius')">
              <div class="space-y-3 mt-3">
                <div class="text-xs text-gray-400">8 维度有机圆角百分比调参 (水平 / 垂直)</div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div class="text-gray-400 mb-1">左上水平: {{ radiusConfig.topLeftX }}%</div>
                    <n-slider v-model:value="radiusConfig.topLeftX" :min="10" :max="90" />
                  </div>
                  <div>
                    <div class="text-gray-400 mb-1">右上水平: {{ radiusConfig.topRightX }}%</div>
                    <n-slider v-model:value="radiusConfig.topRightX" :min="10" :max="90" />
                  </div>
                  <div>
                    <div class="text-gray-400 mb-1">右下水平: {{ radiusConfig.bottomRightX }}%</div>
                    <n-slider v-model:value="radiusConfig.bottomRightX" :min="10" :max="90" />
                  </div>
                  <div>
                    <div class="text-gray-400 mb-1">左下水平: {{ radiusConfig.bottomLeftX }}%</div>
                    <n-slider v-model:value="radiusConfig.bottomLeftX" :min="10" :max="90" />
                  </div>
                  <div>
                    <div class="text-gray-400 mb-1">左上垂直: {{ radiusConfig.topLeftY }}%</div>
                    <n-slider v-model:value="radiusConfig.topLeftY" :min="10" :max="90" />
                  </div>
                  <div>
                    <div class="text-gray-400 mb-1">右上垂直: {{ radiusConfig.topRightY }}%</div>
                    <n-slider v-model:value="radiusConfig.topRightY" :min="10" :max="90" />
                  </div>
                  <div>
                    <div class="text-gray-400 mb-1">右下垂直: {{ radiusConfig.bottomRightY }}%</div>
                    <n-slider v-model:value="radiusConfig.bottomRightY" :min="10" :max="90" />
                  </div>
                  <div>
                    <div class="text-gray-400 mb-1">左下垂直: {{ radiusConfig.bottomLeftY }}%</div>
                    <n-slider v-model:value="radiusConfig.bottomLeftY" :min="10" :max="90" />
                  </div>
                </div>
              </div>
            </n-tab-pane>

            <!-- 模块 4: Fluid & Units -->
            <n-tab-pane name="fluid" :tab="t('tools.css-visual-studio.tabFluid')">
              <div class="space-y-4 mt-3">
                <!-- 1. 流体字号配置 -->
                <div class="p-3 bg-gray-500/5 rounded-lg space-y-3">
                  <div class="text-xs font-semibold text-primary">流体排版 clamp(min, val, max) 计算</div>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <div class="text-gray-400 mb-1">最小视口 (px)</div>
                      <n-input-number v-model:value="fluidConfig.minViewport" :min="320" :max="1920" size="small" />
                    </div>
                    <div>
                      <div class="text-gray-400 mb-1">最大视口 (px)</div>
                      <n-input-number v-model:value="fluidConfig.maxViewport" :min="768" :max="3840" size="small" />
                    </div>
                    <div>
                      <div class="text-gray-400 mb-1">最小字号 (px)</div>
                      <n-input-number v-model:value="fluidConfig.minFontSize" :min="12" :max="48" size="small" />
                    </div>
                    <div>
                      <div class="text-gray-400 mb-1">最大字号 (px)</div>
                      <n-input-number v-model:value="fluidConfig.maxFontSize" :min="16" :max="120" size="small" />
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 font-mono">{{ fluidResult.explanation }}</div>
                </div>

                <!-- 2. px 快捷换算表 -->
                <div class="p-3 bg-gray-500/5 rounded-lg space-y-3">
                  <div class="text-xs font-semibold">CSS 单位即时换算 (基准 16px)</div>
                  <div class="flex items-center space-x-3">
                    <span class="text-xs text-gray-400">输入像素:</span>
                    <n-input-number v-model:value="unitInputPx" :min="1" :max="2000" size="small" class="w-32" />
                  </div>
                  <div class="grid grid-cols-4 gap-2 text-center text-xs">
                    <div class="p-2 bg-surface rounded border border-base">
                      <div class="text-gray-400">rem</div>
                      <div class="font-mono font-bold">{{ unitResult.rem }}</div>
                    </div>
                    <div class="p-2 bg-surface rounded border border-base">
                      <div class="text-gray-400">em</div>
                      <div class="font-mono font-bold">{{ unitResult.em }}</div>
                    </div>
                    <div class="p-2 bg-surface rounded border border-base">
                      <div class="text-gray-400">vw (1920w)</div>
                      <div class="font-mono font-bold">{{ unitResult.vw }}%</div>
                    </div>
                    <div class="p-2 bg-surface rounded border border-base">
                      <div class="text-gray-400">vh (1080h)</div>
                      <div class="font-mono font-bold">{{ unitResult.vh }}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </n-tab-pane>
          </n-tabs>
        </n-card>
      </div>

      <!-- 右侧：即时画布预览与 CSS 代码区 -->
      <div class="lg:col-span-5 space-y-4 min-w-0">
        <n-card size="small" :title="t('tools.css-visual-studio.previewCanvas')" class="bg-surface shadow-sm">
          <template #header-extra>
            <!-- 切换预览画布背景 -->
            <n-radio-group v-model:value="canvasBg" size="tiny">
              <n-radio-button value="light">{{ t('tools.css-visual-studio.bgLight') }}</n-radio-button>
              <n-radio-button value="dark">{{ t('tools.css-visual-studio.bgDark') }}</n-radio-button>
              <n-radio-button value="gradient">{{ t('tools.css-visual-studio.bgGradient') }}</n-radio-button>
            </n-radio-group>
          </template>

          <div class="space-y-4">
            <!-- 渲染预览视窗 -->
            <div
              class="h-60 rounded-xl flex items-center justify-center p-6 transition-all duration-300 overflow-hidden relative"
              :class="{
                'bg-slate-100 dark:bg-slate-800': canvasBg === 'light',
                'bg-slate-950 text-white': canvasBg === 'dark',
                'bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500': canvasBg === 'gradient',
              }"
            >
              <!-- 演示目标盒模型 -->
              <div
                class="w-44 h-36 flex flex-col items-center justify-center text-center p-3 transition-all duration-200 select-none"
                :style="previewBoxStyle"
              >
                <div class="text-sm font-bold tracking-wide">Ateng Tools</div>
                <div class="text-xs opacity-75 mt-1 font-mono">Visual Design</div>
              </div>
            </div>

            <!-- CSS 代码卡片与复制 -->
            <div>
              <div class="text-xs text-gray-400 mb-1 flex items-center justify-between">
                <span>生成的 CSS 样式：</span>
                <n-button size="tiny" secondary type="primary" @click="handleCopy(currentExportCss)">
                  <template #icon>
                    <n-icon :component="Copy" />
                  </template>
                  {{ t('tools.css-visual-studio.copyCss') }}
                </n-button>
              </div>
              <div class="p-3 bg-gray-500/5 border border-base rounded font-mono text-xs whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto">
                {{ currentExportCss }}
              </div>
            </div>
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>
