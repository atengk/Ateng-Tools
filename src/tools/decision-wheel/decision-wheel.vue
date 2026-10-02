<template>
  <div class="space-y-4">
    <!-- 主界面：双栏排布 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <!-- 左栏：转盘画布与居中旋转操作 (7 列) -->
      <div class="lg:col-span-7 min-w-0 flex flex-col items-center space-y-4">
        <!-- 转盘卡片容器 -->
        <n-card size="small" class="w-full flex flex-col items-center">
          <div class="relative flex justify-center items-center py-4">
            <!-- 顶部指针 (指向下方) -->
            <div
              class="absolute top-1 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-x-8 border-x-transparent border-t-[18px] border-t-red-500 drop-shadow-md pointer-events-none"
            />

            <!-- 转盘 Canvas -->
            <canvas
              ref="canvasRef"
              class="w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full shadow-lg border-4 border-white dark:border-neutral-800"
            />
          </div>

          <!-- 居中操作栏 -->
          <div class="flex justify-center items-center gap-3 mt-2">
            <n-button
              type="primary"
              size="large"
              round
              :loading="isSpinning"
              :disabled="options.length < 2"
              @click="handleSpin"
            >
              <template #icon><n-icon :component="RotateIcon" /></template>
              {{ isSpinning ? t('tools.decision-wheel.spinning') : t('tools.decision-wheel.btnSpin') }}
            </n-button>

            <n-button
              secondary
              size="medium"
              round
              :disabled="isSpinning"
              @click="handleResetWheel"
            >
              {{ t('tools.decision-wheel.btnReset') }}
            </n-button>
          </div>

          <!-- 当前选中结果通告 -->
          <div v-if="lastSelected" class="mt-4 p-3 w-full rounded-lg bg-primary/10 border border-primary/20 text-center animate-pulse">
            <div class="text-xs text-neutral-500 mb-0.5">
              {{ t('tools.decision-wheel.resultAnnounce') }}
            </div>
            <div class="text-xl font-bold text-primary">
              🎉 {{ lastSelected.label }}
            </div>
          </div>
        </n-card>

        <!-- 抽取历史卡片 -->
        <n-card :title="t('tools.decision-wheel.historyTitle')" size="small" class="w-full">
          <template #header-extra>
            <n-button size="tiny" quaternary :disabled="historyList.length === 0" @click="historyList = []">
              {{ t('tools.decision-wheel.clearHistory') }}
            </n-button>
          </template>

          <div v-if="historyList.length === 0" class="text-xs text-neutral-400 py-3 text-center">
            {{ t('tools.decision-wheel.noHistory') }}
          </div>
          <div v-else class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
            <n-tag
              v-for="item in historyList"
              :key="item.id"
              size="small"
              round
              type="info"
            >
              {{ item.label }}
              <span class="text-2xs opacity-60 ml-1">({{ formatTime(item.timestamp) }})</span>
            </n-tag>
          </div>
        </n-card>
      </div>

      <!-- 右栏：预设库与选项/权重管理 (5 列) -->
      <div class="lg:col-span-5 min-w-0 space-y-4">
        <!-- 快速预设卡片 -->
        <n-card :title="t('tools.decision-wheel.presetsTitle')" size="small">
          <div class="flex flex-wrap gap-1.5">
            <n-button
              v-for="preset in WHEEL_PRESETS"
              :key="preset.id"
              size="tiny"
              secondary
              :disabled="isSpinning"
              @click="applyPreset(preset)"
            >
              {{ t(preset.nameKey) }}
            </n-button>
          </div>
        </n-card>

        <!-- 选项编辑与权重配置 -->
        <n-card :title="`${t('tools.decision-wheel.optionsTitle')} (${options.length})`" size="small">
          <template #header-extra>
            <n-button
              size="tiny"
              type="primary"
              ghost
              :disabled="isSpinning"
              @click="addNewOption"
            >
              {{ t('tools.decision-wheel.addOption') }}
            </n-button>
          </template>

          <div class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            <div
              v-for="(opt, idx) in options"
              :key="opt.id"
              class="flex items-center gap-2 p-2 rounded border border-neutral-100 dark:border-neutral-800 bg-surface text-xs min-w-0"
            >
              <!-- 色块标记 -->
              <input
                v-model="opt.color"
                type="color"
                class="w-5 h-5 rounded cursor-pointer border-none bg-transparent shrink-0"
                :disabled="isSpinning"
                @input="renderWheel"
              />

              <!-- 选项文本 -->
              <n-input
                v-model:value="opt.label"
                size="tiny"
                class="min-w-0 flex-1"
                :disabled="isSpinning"
                @update:value="renderWheel"
              />

              <!-- 权重调节与概率 -->
              <div class="flex items-center gap-1 shrink-0">
                <span class="text-2xs text-neutral-400">权重</span>
                <n-input-number
                  v-model:value="opt.weight"
                  :min="1"
                  :max="20"
                  size="tiny"
                  class="w-16"
                  :disabled="isSpinning"
                  @update:value="renderWheel"
                />
                <span class="text-2xs font-mono text-neutral-400 w-9 text-right">
                  {{ getProbability(opt.id) }}%
                </span>
              </div>

              <!-- 删除按钮 -->
              <n-button
                size="tiny"
                quaternary
                circle
                type="error"
                :disabled="options.length <= 2 || isSpinning"
                @click="removeOption(idx)"
              >
                <template #icon><n-icon :component="TrashIcon" /></template>
              </n-button>
            </div>
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 随机决策转盘视图与 Canvas 动效呈现
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMessage } from 'naive-ui';
import { Rotate as RotateIcon, Trash as TrashIcon } from '@vicons/tabler';
import type {
  WheelOption,
  WheelPreset,
  WheelSpinHistoryItem,
} from './decision-wheel.types';
import {
  WHEEL_PALETTE,
  WHEEL_PRESETS,
  assignColors,
  calculateProbabilities,
  calculateSectorAngles,
  calculateTargetRotation,
  easeOutCubic,
  pickWeightedRandomIndex,
} from './decision-wheel.service';

const { t } = useI18n();
const message = useMessage();

const canvasRef = ref<HTMLCanvasElement | null>(null);

// 选项列表与初始加载
const options = ref<WheelOption[]>(assignColors(WHEEL_PRESETS[0].options));
const isSpinning = ref<boolean>(false);
const currentRotation = ref<number>(0);
const lastSelected = ref<WheelOption | null>(null);
const historyList = ref<WheelSpinHistoryItem[]>([]);

// 概率分布计算
const probabilities = computed(() => calculateProbabilities(options.value));

function getProbability(id: string): number {
  const p = probabilities.value.find(item => item.id === id);
  return p ? p.percentage : 0;
}

// 格式化时间
function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

// 应用预设
function applyPreset(preset: WheelPreset) {
  options.value = assignColors(preset.options);
  lastSelected.value = null;
  renderWheel();
  message.success(`${t('tools.decision-wheel.presetApplied')}: ${t(preset.nameKey)}`);
}

// 新增选项
function addNewOption() {
  const count = options.value.length + 1;
  const newOpt: WheelOption = {
    id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    label: `选项 ${count}`,
    weight: 1,
    color: WHEEL_PALETTE[options.value.length % WHEEL_PALETTE.length],
  };
  options.value.push(newOpt);
  renderWheel();
}

// 删除选项
function removeOption(index: number) {
  if (options.value.length <= 2) return;
  options.value.splice(index, 1);
  renderWheel();
}

// 重置角度
function handleResetWheel() {
  currentRotation.value = 0;
  lastSelected.value = null;
  renderWheel();
}

// 绘制转盘
function renderWheel() {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const size = 380;
  canvas.width = size * dpr;
  canvas.height = size * dpr;

  ctx.save();
  ctx.scale(dpr, dpr);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 8;

  ctx.clearRect(0, 0, size, size);

  // 计算扇区
  const sectors = calculateSectorAngles(options.value);
  const rot = currentRotation.value;

  // 绘制各个扇区
  sectors.forEach((sec, idx) => {
    const opt = options.value[idx];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, sec.startAngle + rot, sec.endAngle + rot);
    ctx.closePath();
    ctx.fillStyle = opt.color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // 绘制扇区文字
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(sec.centerAngle + rot);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 3;

    // 截断超长文字
    let text = opt.label;
    if (text.length > 7) {
      text = `${text.substring(0, 6)}…`;
    }
    ctx.fillText(text, radius - 18, 0);
    ctx.restore();

    ctx.restore();
  });

  // 绘制中心轴小圆
  ctx.beginPath();
  ctx.arc(centerX, centerY, 22, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#3b82f6';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
  ctx.fillStyle = '#3b82f6';
  ctx.fill();

  ctx.restore();
}

// 触发惯性物理旋转动画
function handleSpin() {
  if (isSpinning.value || options.value.length < 2) return;

  isSpinning.value = true;
  lastSelected.value = null;

  // 1. 加权随机选定目标选项
  const selectedIndex = pickWeightedRandomIndex(options.value);
  const startRot = currentRotation.value;
  const { targetRotation, selectedOption } = calculateTargetRotation(
    startRot,
    options.value,
    selectedIndex,
    7, // 旋转 7 圈
  );

  const duration = 4500; // 动画总耗时 4.5 秒
  const startTime = performance.now();

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(1, elapsed / duration);
    const easedProgress = easeOutCubic(progress);

    currentRotation.value = startRot + (targetRotation - startRot) * easedProgress;
    renderWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning.value = false;
      lastSelected.value = selectedOption;
      historyList.value.unshift({
        id: `hist_${Date.now()}`,
        label: selectedOption.label,
        timestamp: Date.now(),
      });
      message.success(`🎉 抽中结果：${selectedOption.label}`);
    }
  }

  requestAnimationFrame(animate);
}

watch(options, () => {
  renderWheel();
}, { deep: true });

onMounted(() => {
  nextTick(() => {
    renderWheel();
  });
});
</script>
