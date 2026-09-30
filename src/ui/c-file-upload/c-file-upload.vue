<script lang="ts" setup>
import _ from 'lodash';

const props = withDefaults(defineProps<{
  multiple?: boolean
  accept?: string
  title?: string
  buttonText?: string
}>(), {
  multiple: false,
  accept: undefined,
  title: undefined,
  buttonText: undefined,
});

const emit = defineEmits<{
  (event: 'filesUpload', files: File[]): void
  (event: 'fileUpload', file: File): void
}>();

const { t } = useI18n();
const { multiple } = toRefs(props);

const displayTitle = computed(() => props.title ?? t('c-file-upload.title', '将文件拖拽至此处，或点击选择文件'));
const displayButtonText = computed(() => props.buttonText ?? t('c-file-upload.browse', '浏览文件'));

const isOverDropZone = ref(false);

const fileInput = ref<HTMLInputElement | null>(null);

function triggerFileInput() {
  fileInput.value?.click();
}

function handleFileInput(event: Event) {
  const files = (event.target as HTMLInputElement).files;

  handleUpload(files);
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  const files = event.dataTransfer?.files;

  handleUpload(files);
}

function handleUpload(files: FileList | null | undefined) {
  if (_.isNil(files) || _.isEmpty(files)) {
    return;
  }

  if (multiple.value) {
    emit('filesUpload', Array.from(files));
    return;
  }

  emit('fileUpload', files[0]);
}
</script>

<template>
  <div
    class="flex flex-col cursor-pointer items-center justify-center border-2px border-gray-300 border-opacity-50 rounded-lg border-dashed p-8 transition-colors"
    :class="{
      'border-primary border-opacity-100': isOverDropZone,
    }"
    @click="triggerFileInput"
    @drop.prevent="handleDrop"
    @dragover.prevent
    @dragenter="isOverDropZone = true"
    @dragleave="isOverDropZone = false"
  >
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      :multiple="multiple"
      :accept="accept"
      @change="handleFileInput"
    >
    <slot>
      <span op-70>
        {{ displayTitle }}
      </span>

      <!-- separator -->
      <div my-4 w-full flex items-center justify-center op-70>
        <div class="h-1px max-w-100px flex-1 bg-gray-300 op-50" />
        <div class="mx-2 text-gray-400">
          {{ $t('c-file-upload.or', '或') }}
        </div>
        <div class="h-1px max-w-100px flex-1 bg-gray-300 op-50" />
      </div>

      <c-button>
        {{ displayButtonText }}
      </c-button>
    </slot>
  </div>
</template>
