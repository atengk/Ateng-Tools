<script setup lang="ts">
/**
 * 位运算与字节透视计算器视图组件
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { computed, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { Copy, Refresh } from '@vicons/tabler';
import { useCopy } from '@/composable/copy';
import {
  evaluateBitwise,
  formatValue,
  parseInput,
  toggleBit,
} from './bitwise-calculator.service';
import type {
  BitWidth,
  BitwiseOperator,
  NumberBase,
} from './bitwise-calculator.types';

const message = useMessage();
const { copy } = useCopy({ createToast: false });

function handleCopy(text: string, label: string) {
  copy(text);
  message.success(`已复制 ${label} 到剪贴板`);
}

// ---------------- 核心主状态 ----------------
const bitWidth = ref<BitWidth>(32);
const isSigned = ref<boolean>(false);
const currentValue = ref<bigint>(0n);

// 格式化输出
const formatted = computed(() => {
  return formatValue(currentValue.value, bitWidth.value, isSigned.value);
});

// 位列表展示 (从 MSB 最高位到 LSB 最低位排布)
const bitItems = computed(() => {
  const width = bitWidth.value;
  const bits = formatted.value.bits;
  const items: { index: number; isSet: boolean }[] = [];
  for (let i = width - 1; i >= 0; i--) {
    items.push({
      index: i,
      isSet: bits[i],
    });
  }
  return items;
});

// 8 位一组分组用于网格视觉呈现
const byteGroups = computed(() => {
  const items = bitItems.value;
  const groups: typeof items[] = [];
  for (let i = 0; i < items.length; i += 8) {
    groups.push(items.slice(i, i + 8));
  }
  return groups;
});

// 切换特定位
function onBitClick(index: number) {
  currentValue.value = toggleBit(currentValue.value, index, bitWidth.value);
}

// 输入框直接修改
function onBaseInputChange(valStr: string, base: NumberBase) {
  currentValue.value = parseInput(valStr, base, bitWidth.value);
}

// 快捷整体操作
function setAllBits(val: 1 | 0) {
  if (val === 1) {
    const mask = (1n << BigInt(bitWidth.value)) - 1n;
    currentValue.value = mask;
  }
  else {
    currentValue.value = 0n;
  }
}

function invertAllBits() {
  currentValue.value = evaluateBitwise('NOT', currentValue.value, 0n, bitWidth.value);
}

// ---------------- 双操作数位运算器 ----------------
const opA = ref<string>('0x00FF');
const opB = ref<string>('0x0F0F');
const currentOp = ref<BitwiseOperator>('AND');

const calcResult = computed(() => {
  const a = parseInput(opA.value, 16, bitWidth.value);
  const b = parseInput(opB.value, 16, bitWidth.value);
  const res = evaluateBitwise(currentOp.value, a, b, bitWidth.value, isSigned.value);
  return formatValue(res, bitWidth.value, isSigned.value);
});

function applyResultToMain() {
  const a = parseInput(opA.value, 16, bitWidth.value);
  const b = parseInput(opB.value, 16, bitWidth.value);
  currentValue.value = evaluateBitwise(currentOp.value, a, b, bitWidth.value, isSigned.value);
  message.success('已载入运算结果至主面板');
}

function resetAll() {
  currentValue.value = 0n;
  bitWidth.value = 32;
  isSigned.value = false;
  opA.value = '0x00FF';
  opB.value = '0x0F0F';
  currentOp.value = 'AND';
  message.info('已恢复默认配置');
}
</script>

<template>
  <div class="bitwise-calculator-container">
    <c-card>
      <!-- 顶层模式配置栏 -->
      <div class="top-settings-bar">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="setting-label">位宽模式：</span>
            <n-radio-group v-model:value="bitWidth" size="small">
              <n-radio-button :value="8">
                8 位 (Byte)
              </n-radio-button>
              <n-radio-button :value="16">
                16 位 (Word)
              </n-radio-button>
              <n-radio-button :value="32">
                32 位 (DWord)
              </n-radio-button>
              <n-radio-button :value="64">
                64 位 (QWord)
              </n-radio-button>
            </n-radio-group>
          </div>

          <div class="flex items-center gap-2">
            <span class="setting-label">有符号模式：</span>
            <n-switch v-model:value="isSigned" size="small">
              <template #checked>
                Signed (补码)
              </template>
              <template #unchecked>
                Unsigned (无符号)
              </template>
            </n-switch>
          </div>
        </div>

        <!-- 快捷操作按钮 -->
        <div class="flex items-center gap-2">
          <n-button size="tiny" secondary @click="setAllBits(1)">
            全置 1
          </n-button>
          <n-button size="tiny" secondary @click="setAllBits(0)">
            清零
          </n-button>
          <n-button size="tiny" secondary @click="invertAllBits">
            全取反
          </n-button>
        </div>
      </div>

      <!-- 可视化交互式位图网格 (Bitfield Grid) -->
      <n-card class="bitfield-card mt-4" size="small" title="交互式二进制位图 (点击任一位即时翻转 0 / 1)">
        <div class="bytes-wrapper">
          <div
            v-for="(group, gIdx) in byteGroups"
            :key="gIdx"
            class="byte-group"
          >
            <div class="byte-group-header">
              Byte {{ byteGroups.length - 1 - gIdx }}
            </div>
            <div class="byte-bits">
              <div
                v-for="bit in group"
                :key="bit.index"
                class="bit-cell"
                :class="{ active: bit.isSet }"
                @click="onBitClick(bit.index)"
              >
                <div class="bit-val">
                  {{ bit.isSet ? '1' : '0' }}
                </div>
                <div class="bit-idx">
                  {{ bit.index }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </n-card>

      <!-- 实时多进制双向同步输入面板 -->
      <div class="grid grid-cols-1 gap-12px md:grid-cols-2 mt-4">
        <!-- 十六进制 HEX -->
        <n-card size="small">
          <div class="flex items-center justify-between mb-1">
            <span class="base-tag hex">HEX (十六进制)</span>
            <n-button text size="tiny" @click="handleCopy(formatted.hex, 'HEX')">
              <template #icon>
                <n-icon :component="Copy" />
              </template>
              复制
            </n-button>
          </div>
          <n-input
            :value="formatted.hex"
            placeholder="00"
            @update:value="(val) => onBaseInputChange(val, 16)"
          >
            <template #prefix>
              <span class="text-gray-400 font-mono text-12px">0x</span>
            </template>
          </n-input>
        </n-card>

        <!-- 十进制 DEC -->
        <n-card size="small">
          <div class="flex items-center justify-between mb-1">
            <span class="base-tag dec">DEC (十进制 · {{ isSigned ? '有符号' : '无符号' }})</span>
            <n-button text size="tiny" @click="handleCopy(formatted.dec, 'DEC')">
              <template #icon>
                <n-icon :component="Copy" />
              </template>
              复制
            </n-button>
          </div>
          <n-input
            :value="formatted.dec"
            placeholder="0"
            @update:value="(val) => onBaseInputChange(val, 10)"
          />
        </n-card>

        <!-- 八进制 OCT -->
        <n-card size="small">
          <div class="flex items-center justify-between mb-1">
            <span class="base-tag oct">OCT (八进制)</span>
            <n-button text size="tiny" @click="handleCopy(formatted.oct, 'OCT')">
              <template #icon>
                <n-icon :component="Copy" />
              </template>
              复制
            </n-button>
          </div>
          <n-input
            :value="formatted.oct"
            placeholder="0"
            @update:value="(val) => onBaseInputChange(val, 8)"
          >
            <template #prefix>
              <span class="text-gray-400 font-mono text-12px">0o</span>
            </template>
          </n-input>
        </n-card>

        <!-- 二进制 BIN -->
        <n-card size="small">
          <div class="flex items-center justify-between mb-1">
            <span class="base-tag bin">BIN (二进制完整位段)</span>
            <n-button text size="tiny" @click="handleCopy(formatted.bin, 'BIN')">
              <template #icon>
                <n-icon :component="Copy" />
              </template>
              复制
            </n-button>
          </div>
          <n-input
            :value="formatted.bin"
            placeholder="00000000"
            @update:value="(val) => onBaseInputChange(val, 2)"
          >
            <template #prefix>
              <span class="text-gray-400 font-mono text-12px">0b</span>
            </template>
          </n-input>
        </n-card>
      </div>

      <!-- 快速双操作数位运算器 -->
      <n-card class="mt-4" size="small" title="位运算计算器 (Bitwise Operations)">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12px items-center">
          <div>
            <div class="text-12px text-gray-500 mb-1">
              操作数 A (HEX / DEC / BIN)：
            </div>
            <n-input v-model:value="opA" placeholder="0x..." />
          </div>

          <div>
            <div class="text-12px text-gray-500 mb-1">
              位逻辑运算符：
            </div>
            <n-select
              v-model:value="currentOp"
              :options="[
                { label: 'AND (&) 按位与', value: 'AND' },
                { label: 'OR (|) 按位或', value: 'OR' },
                { label: 'XOR (^) 按位异或', value: 'XOR' },
                { label: 'NOT (~) 按位取反', value: 'NOT' },
                { label: 'LSHIFT (<<) 左移', value: 'LSHIFT' },
                { label: 'RSHIFT (>>) 算术右移', value: 'RSHIFT' },
                { label: 'URSHIFT (>>>) 逻辑右移', value: 'URSHIFT' },
              ]"
            />
          </div>

          <div>
            <div class="text-12px text-gray-500 mb-1">
              操作数 B / 移位位数：
            </div>
            <n-input
              v-model:value="opB"
              :disabled="currentOp === 'NOT'"
              placeholder="0x..."
            />
          </div>
        </div>

        <div class="result-banner mt-4">
          <div class="result-left">
            <span class="result-title">运算结果：</span>
            <span class="result-hex">0x{{ calcResult.hex }}</span>
            <span class="result-dec">({{ calcResult.dec }})</span>
            <span class="result-bin">0b{{ calcResult.bin }}</span>
          </div>

          <n-button size="small" type="primary" secondary @click="applyResultToMain">
            载入到主交互面板
          </n-button>
        </div>
      </n-card>

      <!-- 统一居中操作栏 -->
      <div class="flex justify-center mt-6">
        <n-button secondary @click="resetAll">
          <template #icon>
            <n-icon :component="Refresh" />
          </template>
          恢复默认配置
        </n-button>
      </div>
    </c-card>
  </div>
</template>

<style scoped lang="less">
.bitwise-calculator-container {
  .top-settings-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    background: rgba(241, 245, 249, 0.7);
    border-radius: 8px;

    .setting-label {
      font-size: 13px;
      font-weight: 500;
      color: #475569;
    }
  }

  .bytes-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
    padding: 10px 0;
  }

  .byte-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;

    .byte-group-header {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
    }

    .byte-bits {
      display: flex;
      gap: 4px;
    }
  }

  .bit-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 42px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    cursor: pointer;
    user-select: none;
    transition: all 0.16s ease;

    &:hover {
      border-color: #3b82f6;
      transform: translateY(-1px);
    }

    &.active {
      background: #2563eb;
      border-color: #1d4ed8;

      .bit-val {
        color: #ffffff;
        font-weight: 700;
      }

      .bit-idx {
        color: rgba(255, 255, 255, 0.8);
      }
    }

    .bit-val {
      font-family: monospace;
      font-size: 15px;
      font-weight: 600;
      color: #334155;
      line-height: 1.2;
    }

    .bit-idx {
      font-size: 9px;
      color: #94a3b8;
      line-height: 1;
    }
  }

  .base-tag {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;

    &.hex {
      background: rgba(37, 99, 235, 0.1);
      color: #2563eb;
    }
    &.dec {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
    }
    &.oct {
      background: rgba(245, 158, 11, 0.1);
      color: #d97706;
    }
    &.bin {
      background: rgba(147, 51, 234, 0.1);
      color: #7c3aed;
    }
  }

  .result-banner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(59, 130, 246, 0.02));
    border: 1px solid rgba(37, 99, 235, 0.15);
    border-radius: 8px;

    .result-left {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      font-family: monospace;

      .result-title {
        font-family: sans-serif;
        font-size: 13px;
        font-weight: 600;
        color: #334155;
      }

      .result-hex {
        font-size: 16px;
        font-weight: 700;
        color: #2563eb;
      }

      .result-dec {
        font-size: 13px;
        color: #059669;
      }

      .result-bin {
        font-size: 12px;
        color: #64748b;
      }
    }
  }
}
</style>
