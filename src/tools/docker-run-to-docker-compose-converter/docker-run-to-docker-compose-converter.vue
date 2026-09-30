<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { MessageType, composerize } from 'composerize-ts';
import { withDefaultOnError } from '@/utils/defaults';
import { useDownloadFileFromBase64 } from '@/composable/downloadBase64';
import { textToBase64 } from '@/utils/base64';
import TextareaCopyable from '@/components/TextareaCopyable.vue';

const { t } = useI18n();

const dockerRun = ref(
  'docker run -p 80:80 -v /var/run/docker.sock:/tmp/docker.sock:ro --restart always --log-opt max-size=1g nginx',
);

const conversionResult = computed(() =>
  withDefaultOnError(() => composerize(dockerRun.value.trim()), { yaml: '', messages: [] }),
);
const dockerCompose = computed(() => conversionResult.value.yaml);
const notImplemented = computed(() =>
  conversionResult.value.messages.filter(msg => msg.type === MessageType.notImplemented).map(msg => msg.value),
);
const notComposable = computed(() =>
  conversionResult.value.messages.filter(msg => msg.type === MessageType.notTranslatable).map(msg => msg.value),
);
const errors = computed(() =>
  conversionResult.value.messages
    .filter(msg => msg.type === MessageType.errorDuringConversion)
    .map(msg => msg.value),
);
const dockerComposeBase64 = computed(() => `data:application/yaml;base64,${textToBase64(dockerCompose.value)}`);
const { download } = useDownloadFileFromBase64({ source: dockerComposeBase64, filename: 'docker-compose.yml' });
</script>

<template>
  <div>
    <c-input-text
      v-model:value="dockerRun"
      :label="$t('tools.docker-run-to-docker-compose-converter.runCommandLabel', '原始 docker run 命令行：')"
      style="font-family: monospace"
      multiline
      raw-text
      monospace
      :placeholder="$t('tools.docker-run-to-docker-compose-converter.runCommandPlaceholder', '在此输入待转换的 docker run 命令行...')"
      rows="3"
    />

    <n-divider />

    <TextareaCopyable :value="dockerCompose" language="yaml" />

    <div mt-5 flex justify-center>
      <c-button :disabled="dockerCompose === ''" secondary @click="download">
        {{ $t('tools.docker-run-to-docker-compose-converter.downloadButton', '下载 docker-compose.yml') }}
      </c-button>
    </div>

    <div v-if="notComposable.length > 0">
      <n-alert :title="$t('tools.docker-run-to-docker-compose-converter.notComposableTitle', '以下参数无法直接转换为 docker-compose 配置')" type="info" mt-5>
        <ul>
          <li v-for="(message, index) of notComposable" :key="index">
            {{ message }}
          </li>
        </ul>
      </n-alert>
    </div>

    <div v-if="notImplemented.length > 0">
      <n-alert
        :title="$t('tools.docker-run-to-docker-compose-converter.notImplementedTitle', '转换器暂未实现以下参数的自动映射')"
        type="warning"
        mt-5
      >
        <ul>
          <li v-for="(message, index) of notImplemented" :key="index">
            {{ message }}
          </li>
        </ul>
      </n-alert>
    </div>

    <div v-if="errors.length > 0">
      <n-alert :title="$t('tools.docker-run-to-docker-compose-converter.errorsTitle', '转换过程中出现错误')" type="error" mt-5>
        <ul>
          <li v-for="(message, index) of errors" :key="index">
            {{ message }}
          </li>
        </ul>
      </n-alert>
    </div>
  </div>
</template>
