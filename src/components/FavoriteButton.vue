<script setup lang="ts">
import { IconStar, IconStarFilled } from '@tabler/icons-vue';
import { useToolStore } from '@/tools/tools.store';
import type { Tool } from '@/tools/tools.types';

const props = defineProps<{ tool: Tool }>();

const toolStore = useToolStore();
const { tool } = toRefs(props);

const isFavorite = computed(() => toolStore.isToolFavorite({ tool }));

function toggleFavorite(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();

  if (toolStore.isToolFavorite({ tool })) {
    toolStore.removeToolFromFavorites({ tool });
    return;
  }

  toolStore.addToolToFavorites({ tool });
}
</script>

<template>
  <c-tooltip :tooltip="isFavorite ? $t('favoriteButton.remove') : $t('favoriteButton.add')">
    <c-button
      variant="text"
      circle
      class="favorite-btn"
      :style="{
        color: isFavorite ? '#f59e0b' : 'currentColor',
        opacity: isFavorite ? 1 : 0.35,
      }"
      @click="toggleFavorite"
    >
      <n-icon size="18" :component="isFavorite ? IconStarFilled : IconStar" />
    </c-button>
  </c-tooltip>
</template>

<style scoped lang="less">
.favorite-btn {
  transition: all 0.2s ease;

  &:hover {
    opacity: 1 !important;
    color: #f59e0b !important;
    transform: scale(1.15);
  }
}
</style>
