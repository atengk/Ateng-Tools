<script setup lang="ts">
/**
 * 数据存储与网络速率换算器视图组件
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { computed, reactive, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { Copy, Refresh } from '@vicons/tabler';
import { useCopy } from '@/composable/copy';
import {
  calculateTransferTime,
  convertBandwidth,
  convertStorage,
  formatUnitNumber,
} from './data-storage-converter.service';
import type { BandwidthUnit, StorageUnit } from './data-storage-converter.types';

const message = useMessage();
const { copy } = useCopy({ createToast: false });

function handleCopy(text: string, label: string) {
  copy(text);
  message.success(`已复制 ${label} 到剪贴板`);
}

// ---------------- 1. 数据存储换算状态 ----------------
const activeStorageUnit = ref<StorageUnit>('GB');
const storageInput = ref<number | null>(1);

const storageResults = computed(() => {
  const val = storageInput.value ?? 0;
  return convertStorage(val, activeStorageUnit.value);
});

function onStorageInputChange(unit: StorageUnit, val: number | null) {
  activeStorageUnit.value = unit;
  storageInput.value = val;
}

const siUnits: { key: StorageUnit; label: string; desc: string }[] = [
  { key: 'B', label: 'Byte (B)', desc: '字节 (基准单位)' },
  { key: 'KB', label: 'Kilobyte (KB)', desc: '1,000 Bytes (10³)' },
  { key: 'MB', label: 'Megabyte (MB)', desc: '1,000,000 Bytes (10⁶)' },
  { key: 'GB', label: 'Gigabyte (GB)', desc: '1,000,000,000 Bytes (10⁹)' },
  { key: 'TB', label: 'Terabyte (TB)', desc: '10¹² Bytes' },
  { key: 'PB', label: 'Petabyte (PB)', desc: '10¹⁵ Bytes' },
];

const iecUnits: { key: StorageUnit; label: string; desc: string }[] = [
  { key: 'KiB', label: 'Kibibyte (KiB)', desc: '1,024 Bytes (2¹⁰)' },
  { key: 'MiB', label: 'Mebibyte (MiB)', desc: '1,048,576 Bytes (2²⁰)' },
  { key: 'GiB', label: 'Gibibyte (GiB)', desc: '1,073,741,824 Bytes (2³⁰)' },
  { key: 'TiB', label: 'Tebibyte (TiB)', desc: '2⁴⁰ Bytes' },
  { key: 'PiB', label: 'Pebibyte (PiB)', desc: '2⁵⁰ Bytes' },
];

const bitUnits: { key: StorageUnit; label: string; desc: string }[] = [
  { key: 'bit', label: 'Bit (b)', desc: '1/8 Byte' },
  { key: 'Kbit', label: 'Kilobit (Kb)', desc: '1,000 Bits' },
  { key: 'Mbit', label: 'Megabit (Mb)', desc: '1,000,000 Bits' },
  { key: 'Gbit', label: 'Gigabit (Gb)', desc: '10⁹ Bits' },
];

// ---------------- 2. 网络带宽与速率换算状态 ----------------
const activeBandwidthUnit = ref<BandwidthUnit>('Mbps');
const bandwidthInput = ref<number | null>(100);

const bandwidthResults = computed(() => {
  const val = bandwidthInput.value ?? 0;
  return convertBandwidth(val, activeBandwidthUnit.value);
});

function onBandwidthInputChange(unit: BandwidthUnit, val: number | null) {
  activeBandwidthUnit.value = unit;
  bandwidthInput.value = val;
}

function applyBandwidthPreset(speed: number, unit: BandwidthUnit) {
  activeBandwidthUnit.value = unit;
  bandwidthInput.value = speed;
}

// ---------------- 3. 传输下载耗时预估状态 ----------------
const transferForm = reactive<{
  size: number | null
  sizeUnit: StorageUnit
  speed: number | null
  speedUnit: BandwidthUnit
}>({
  size: 4.7,
  sizeUnit: 'GB',
  speed: 100,
  speedUnit: 'Mbps',
});

const transferTime = computed(() => {
  return calculateTransferTime(
    transferForm.size ?? 0,
    transferForm.sizeUnit,
    transferForm.speed ?? 0,
    transferForm.speedUnit,
  );
});

function resetAll() {
  activeStorageUnit.value = 'GB';
  storageInput.value = 1;
  activeBandwidthUnit.value = 'Mbps';
  bandwidthInput.value = 100;
  transferForm.size = 4.7;
  transferForm.sizeUnit = 'GB';
  transferForm.speed = 100;
  transferForm.speedUnit = 'Mbps';
  message.info('已恢复默认配置');
}
</script>

<template>
  <div class="data-storage-converter-container">
    <c-card>
      <n-tabs type="segment" animated>
        <!-- Tab 1: 数据存储单位换算 -->
        <n-tab-pane name="storage" tab="数据存储换算 (Storage Units)">
          <div class="tab-content-wrapper">
            <div class="section-intro">
              输入任意存储单位数值，其余十进制 (SI) 与二进制 (IEC) 单位将毫秒级联动实时换算：
            </div>

            <!-- 十进制标准 (SI) -->
            <div class="unit-group-title">
              十进制单位 (SI 国际单位制 · 1000 进制)
            </div>
            <div class="grid grid-cols-1 gap-12px md:grid-cols-2 lg:grid-cols-3">
              <n-card
                v-for="unit in siUnits"
                :key="unit.key"
                size="small"
                class="unit-card"
                :class="{ active: activeStorageUnit === unit.key }"
              >
                <div class="unit-card-header">
                  <span class="unit-name">{{ unit.label }}</span>
                  <span class="unit-desc">{{ unit.desc }}</span>
                </div>
                <n-input-number
                  :value="activeStorageUnit === unit.key ? storageInput : Number(formatUnitNumber(storageResults[unit.key]))"
                  :min="0"
                  placeholder="0"
                  class="w-full mt-2"
                  @update:value="(val) => onStorageInputChange(unit.key, val)"
                >
                  <template #suffix>
                    <n-button
                      text
                      size="tiny"
                      class="copy-btn"
                      title="复制数值"
                      @click.stop="handleCopy(formatUnitNumber(storageResults[unit.key]), unit.key)"
                    >
                      <template #icon>
                        <n-icon :component="Copy" />
                      </template>
                    </n-button>
                  </template>
                </n-input-number>
              </n-card>
            </div>

            <!-- 二进制标准 (IEC) -->
            <div class="unit-group-title mt-6">
              二进制标准 (IEC 电子工业规范 · 1024 进制)
            </div>
            <div class="grid grid-cols-1 gap-12px md:grid-cols-2 lg:grid-cols-3">
              <n-card
                v-for="unit in iecUnits"
                :key="unit.key"
                size="small"
                class="unit-card"
                :class="{ active: activeStorageUnit === unit.key }"
              >
                <div class="unit-card-header">
                  <span class="unit-name">{{ unit.label }}</span>
                  <span class="unit-desc">{{ unit.desc }}</span>
                </div>
                <n-input-number
                  :value="activeStorageUnit === unit.key ? storageInput : Number(formatUnitNumber(storageResults[unit.key]))"
                  :min="0"
                  placeholder="0"
                  class="w-full mt-2"
                  @update:value="(val) => onStorageInputChange(unit.key, val)"
                >
                  <template #suffix>
                    <n-button
                      text
                      size="tiny"
                      class="copy-btn"
                      title="复制数值"
                      @click.stop="handleCopy(formatUnitNumber(storageResults[unit.key]), unit.key)"
                    >
                      <template #icon>
                        <n-icon :component="Copy" />
                      </template>
                    </n-button>
                  </template>
                </n-input-number>
              </n-card>
            </div>

            <!-- 比特单位 (Bit) -->
            <div class="unit-group-title mt-6">
              比特单位 (Bit / 8 进制换算)
            </div>
            <div class="grid grid-cols-1 gap-12px md:grid-cols-2 lg:grid-cols-4">
              <n-card
                v-for="unit in bitUnits"
                :key="unit.key"
                size="small"
                class="unit-card"
                :class="{ active: activeStorageUnit === unit.key }"
              >
                <div class="unit-card-header">
                  <span class="unit-name">{{ unit.label }}</span>
                  <span class="unit-desc">{{ unit.desc }}</span>
                </div>
                <n-input-number
                  :value="activeStorageUnit === unit.key ? storageInput : Number(formatUnitNumber(storageResults[unit.key]))"
                  :min="0"
                  placeholder="0"
                  class="w-full mt-2"
                  @update:value="(val) => onStorageInputChange(unit.key, val)"
                >
                  <template #suffix>
                    <n-button
                      text
                      size="tiny"
                      class="copy-btn"
                      title="复制数值"
                      @click.stop="handleCopy(formatUnitNumber(storageResults[unit.key]), unit.key)"
                    >
                      <template #icon>
                        <n-icon :component="Copy" />
                      </template>
                    </n-button>
                  </template>
                </n-input-number>
              </n-card>
            </div>
          </div>
        </n-tab-pane>

        <!-- Tab 2: 网络带宽速率换算 -->
        <n-tab-pane name="bandwidth" tab="网络带宽速率 (Bandwidth & Speed)">
          <div class="tab-content-wrapper">
            <!-- 常用宽带预设快捷按钮 -->
            <div class="preset-banner">
              <span class="preset-label">常见网络带宽快捷预设：</span>
              <div class="preset-buttons">
                <n-button size="small" secondary @click="applyBandwidthPreset(50, 'Mbps')">
                  50 Mbps (4G 常用)
                </n-button>
                <n-button size="small" secondary type="primary" @click="applyBandwidthPreset(100, 'Mbps')">
                  100 Mbps (百兆家用)
                </n-button>
                <n-button size="small" secondary @click="applyBandwidthPreset(300, 'Mbps')">
                  300 Mbps
                </n-button>
                <n-button size="small" secondary @click="applyBandwidthPreset(500, 'Mbps')">
                  500 Mbps
                </n-button>
                <n-button size="small" secondary type="info" @click="applyBandwidthPreset(1000, 'Mbps')">
                  1000 Mbps (千兆光纤)
                </n-button>
                <n-button size="small" secondary @click="applyBandwidthPreset(10, 'Gbps')">
                  10 Gbps (万兆数据中心)
                </n-button>
              </div>
            </div>

            <!-- 速率换算结果对照卡片 -->
            <div class="grid grid-cols-1 gap-16px md:grid-cols-2 mt-4">
              <!-- 比特率 (网络运营商口径) -->
              <n-card title="运营商带宽口径 (Bits per second)" size="small">
                <div class="space-y-3">
                  <div class="speed-row">
                    <span class="speed-name">Mbps (兆比特/秒)</span>
                    <div class="speed-val-wrap">
                      <n-input-number
                        :value="activeBandwidthUnit === 'Mbps' ? bandwidthInput : Number(formatUnitNumber(bandwidthResults.Mbps))"
                        :min="0"
                        @update:value="(val) => onBandwidthInputChange('Mbps', val)"
                      />
                    </div>
                  </div>

                  <div class="speed-row">
                    <span class="speed-name">Gbps (吉比特/秒)</span>
                    <div class="speed-val-wrap">
                      <n-input-number
                        :value="activeBandwidthUnit === 'Gbps' ? bandwidthInput : Number(formatUnitNumber(bandwidthResults.Gbps))"
                        :min="0"
                        @update:value="(val) => onBandwidthInputChange('Gbps', val)"
                      />
                    </div>
                  </div>

                  <div class="speed-row">
                    <span class="speed-name">Kbps (千比特/秒)</span>
                    <div class="speed-val-wrap">
                      <n-input-number
                        :value="activeBandwidthUnit === 'Kbps' ? bandwidthInput : Number(formatUnitNumber(bandwidthResults.Kbps))"
                        :min="0"
                        @update:value="(val) => onBandwidthInputChange('Kbps', val)"
                      />
                    </div>
                  </div>

                  <div class="speed-row">
                    <span class="speed-name">bps (基础比特/秒)</span>
                    <div class="speed-val-wrap">
                      <n-input-number
                        :value="activeBandwidthUnit === 'bps' ? bandwidthInput : Number(formatUnitNumber(bandwidthResults.bps))"
                        :min="0"
                        @update:value="(val) => onBandwidthInputChange('bps', val)"
                      />
                    </div>
                  </div>
                </div>
              </n-card>

              <!-- 字节率 (实际文件下载速度) -->
              <n-card title="实际文件下载速度 (Bytes per second)" size="small">
                <div class="space-y-3">
                  <div class="speed-row">
                    <span class="speed-name font-bold text-blue-600">MB/s (兆字节/秒)</span>
                    <div class="speed-val-wrap">
                      <n-input-number
                        :value="activeBandwidthUnit === 'MB/s' ? bandwidthInput : Number(formatUnitNumber(bandwidthResults['MB/s']))"
                        :min="0"
                        @update:value="(val) => onBandwidthInputChange('MB/s', val)"
                      />
                    </div>
                  </div>

                  <div class="speed-row">
                    <span class="speed-name">MiB/s (二进制兆/秒)</span>
                    <div class="speed-val-wrap">
                      <n-input-number
                        :value="activeBandwidthUnit === 'MiB/s' ? bandwidthInput : Number(formatUnitNumber(bandwidthResults['MiB/s']))"
                        :min="0"
                        @update:value="(val) => onBandwidthInputChange('MiB/s', val)"
                      />
                    </div>
                  </div>

                  <div class="speed-row">
                    <span class="speed-name">KB/s (千字节/秒)</span>
                    <div class="speed-val-wrap">
                      <n-input-number
                        :value="activeBandwidthUnit === 'KB/s' ? bandwidthInput : Number(formatUnitNumber(bandwidthResults['KB/s']))"
                        :min="0"
                        @update:value="(val) => onBandwidthInputChange('KB/s', val)"
                      />
                    </div>
                  </div>

                  <div class="speed-row">
                    <span class="speed-name">GB/s (吉字节/秒)</span>
                    <div class="speed-val-wrap">
                      <n-input-number
                        :value="activeBandwidthUnit === 'GB/s' ? bandwidthInput : Number(formatUnitNumber(bandwidthResults['GB/s']))"
                        :min="0"
                        @update:value="(val) => onBandwidthInputChange('GB/s', val)"
                      />
                    </div>
                  </div>
                </div>
              </n-card>
            </div>
          </div>
        </n-tab-pane>

        <!-- Tab 3: 传输耗时推演计算器 -->
        <n-tab-pane name="transfer" tab="下载与传输耗时推算 (Transfer Time)">
          <div class="tab-content-wrapper max-w-720px mx-auto">
            <n-card class="calc-card" size="medium">
              <div class="grid grid-cols-1 gap-16px md:grid-cols-2">
                <!-- 文件大小输入 -->
                <div>
                  <div class="input-label mb-1">
                    待传输文件大小：
                  </div>
                  <n-input-group>
                    <n-input-number
                      v-model:value="transferForm.size"
                      :min="0"
                      class="w-full"
                      placeholder="输入文件大小"
                    />
                    <n-select
                      v-model:value="transferForm.sizeUnit"
                      :options="[
                        { label: 'GB', value: 'GB' },
                        { label: 'MB', value: 'MB' },
                        { label: 'TB', value: 'TB' },
                        { label: 'GiB', value: 'GiB' },
                        { label: 'MiB', value: 'MiB' },
                        { label: 'KB', value: 'KB' },
                      ]"
                      style="width: 100px"
                    />
                  </n-input-group>
                </div>

                <!-- 传输速率输入 -->
                <div>
                  <div class="input-label mb-1">
                    当前网络下载/传输速度：
                  </div>
                  <n-input-group>
                    <n-input-number
                      v-model:value="transferForm.speed"
                      :min="0"
                      class="w-full"
                      placeholder="输入传输速度"
                    />
                    <n-select
                      v-model:value="transferForm.speedUnit"
                      :options="[
                        { label: 'Mbps (带宽)', value: 'Mbps' },
                        { label: 'MB/s (下载速)', value: 'MB/s' },
                        { label: 'Gbps (千兆)', value: 'Gbps' },
                        { label: 'KB/s', value: 'KB/s' },
                      ]"
                      style="width: 150px"
                    />
                  </n-input-group>
                </div>
              </div>

              <!-- 结果看板 -->
              <div class="time-result-panel mt-6">
                <div class="time-label">
                  预计理论传输耗时
                </div>
                <div class="time-value">
                  {{ transferTime.formattedZh }}
                </div>
                <div class="time-sub">
                  总计约 {{ transferTime.totalSeconds.toFixed(2) }} 秒 ({{ transferTime.formattedEn }})
                </div>
              </div>
            </n-card>
          </div>
        </n-tab-pane>
      </n-tabs>

      <!-- 统一居中操作栏 -->
      <div class="flex justify-center mt-6">
        <n-button secondary @click="resetAll">
          <template #icon>
            <n-icon :component="Refresh" />
          </template>
          恢复默认设定
        </n-button>
      </div>
    </c-card>
  </div>
</template>

<style scoped lang="less">
.data-storage-converter-container {
  .section-intro {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 12px;
  }

  .unit-group-title {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 8px;
  }

  .unit-card {
    border-radius: 8px;
    transition: all 0.2s ease;

    &.active {
      border-color: #3b82f6;
      background-color: rgba(59, 130, 246, 0.02);
    }

    .unit-card-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;

      .unit-name {
        font-weight: 600;
        font-size: 13px;
      }

      .unit-desc {
        font-size: 11px;
        color: #94a3b8;
      }
    }
  }

  .preset-banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(241, 245, 249, 0.6);
    border-radius: 8px;
    margin-bottom: 8px;

    .preset-label {
      font-size: 13px;
      font-weight: 500;
      color: #475569;
    }

    .preset-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
  }

  .speed-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    .speed-name {
      font-size: 13px;
      white-space: nowrap;
    }

    .speed-val-wrap {
      flex: 1;
      max-width: 200px;
    }
  }

  .calc-card {
    border-radius: 12px;

    .input-label {
      font-size: 13px;
      font-weight: 500;
      color: #334155;
    }
  }

  .time-result-panel {
    text-align: center;
    padding: 24px;
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(59, 130, 246, 0.02));
    border: 1px solid rgba(37, 99, 235, 0.15);
    border-radius: 10px;

    .time-label {
      font-size: 13px;
      font-weight: 500;
      color: #64748b;
    }

    .time-value {
      font-size: 30px;
      font-weight: 800;
      color: #1d4ed8;
      margin: 8px 0;
      letter-spacing: 0.02em;
    }

    .time-sub {
      font-size: 12px;
      color: #94a3b8;
    }
  }
}
</style>
