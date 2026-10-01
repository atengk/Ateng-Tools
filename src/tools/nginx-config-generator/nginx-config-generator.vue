<script setup lang="ts">
/**
 * Nginx 配置可视化生成器视图层组件
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { computed, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  Code,
  Copy,
  Download,
  Plus,
  Refresh,
  Trash,
  Wand,
} from '@vicons/tabler';
import type { NginxConfigOptions, NginxProxyRoute } from './nginx-config-generator.types';
import { DEFAULT_NGINX_OPTIONS, generateNginxConfig } from './nginx-config-generator.service';
import { useCopy } from '@/composable/copy';

const message = useMessage();

// 1. 配置状态
const config = ref<NginxConfigOptions>(JSON.parse(JSON.stringify(DEFAULT_NGINX_OPTIONS)));

// 2. 实时生成 Nginx 配置文件内容
const generatedConfig = computed(() => generateNginxConfig(config.value));

// 3. 预设场景方案
const presetScenes = [
  {
    label: '前后端分离 (SPA + API 反代)',
    apply: () => {
      config.value.serverName = 'app.example.com';
      config.value.enableSpa = true;
      config.value.enableGzip = true;
      config.value.enableStaticCache = true;
      config.value.enableSsl = false;
      config.value.proxyRoutes = [
        {
          id: 'route-api',
          path: '/api/',
          targetUrl: 'http://127.0.0.1:8080/',
          websocket: false,
          cors: true,
          stripPrefix: false,
        },
      ];
    },
  },
  {
    label: '生产级 HTTPS + SSL 强推',
    apply: () => {
      config.value.serverName = 'secure.example.com';
      config.value.enableSsl = true;
      config.value.sslPort = 443;
      config.value.sslRedirectHttp = true;
      config.value.enableHttp2 = true;
      config.value.enableGzip = true;
      config.value.enableStaticCache = true;
    },
  },
  {
    label: '微服务网关 (多路由 + WebSocket)',
    apply: () => {
      config.value.serverName = 'gateway.example.com';
      config.value.enableSpa = false;
      config.value.proxyRoutes = [
        {
          id: 'route-user',
          path: '/user/',
          targetUrl: 'http://127.0.0.1:8081/',
          websocket: false,
          cors: true,
          stripPrefix: false,
        },
        {
          id: 'route-ws',
          path: '/ws/',
          targetUrl: 'http://127.0.0.1:8082/',
          websocket: true,
          cors: true,
          stripPrefix: false,
        },
      ];
    },
  },
];

// 4. 操作交互
const { copy } = useCopy({
  source: generatedConfig,
  createToast: false,
});

function handleCopy() {
  copy();
  message.success('Nginx 配置文件已成功复制至剪贴板');
}

function handleDownload() {
  const blob = new Blob([generatedConfig.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nginx.conf';
  a.click();
  URL.revokeObjectURL(url);
  message.success('nginx.conf 文件已触发下载');
}

function handleReset() {
  config.value = JSON.parse(JSON.stringify(DEFAULT_NGINX_OPTIONS));
  message.info('已恢复为初始默认配置');
}

function handleAddProxyRoute() {
  const newRoute: NginxProxyRoute = {
    id: `route-${Date.now()}`,
    path: '/api/v2/',
    targetUrl: 'http://127.0.0.1:9090/',
    websocket: false,
    cors: true,
    stripPrefix: false,
  };
  config.value.proxyRoutes.push(newRoute);
}

function handleRemoveProxyRoute(index: number) {
  config.value.proxyRoutes.splice(index, 1);
}
</script>

<template>
  <div class="space-y-4">
    <!-- 主栅格：左侧配置表单，右侧实时代码 -->
    <n-grid cols="1 s:1 m:2" responsive="screen" :x-gap="16" :y-gap="16">
      <!-- 左侧：参数配置 -->
      <n-gi>
        <n-card title="Nginx 可视化配置选项" size="small">
          <!-- 预设场景 -->
          <div class="mb-4">
            <div class="text-xs text-neutral-500 mb-2 flex items-center gap-1">
              <n-icon size="14" :component="Wand" />
              <span>快速载入标准生产拓扑：</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <n-button
                v-for="preset in presetScenes"
                :key="preset.label"
                size="tiny"
                type="primary"
                quaternary
                @click="preset.apply()"
              >
                {{ preset.label }}
              </n-button>
            </div>
          </div>

          <n-collapse default-expanded-names="base,proxy,ssl">
            <!-- 基础服务配置 -->
            <n-collapse-item title="基础服务与站点 (Server & Root)" name="base">
              <div class="space-y-3 pt-1">
                <n-form-item label="服务域名 (server_name)" :show-feedback="false">
                  <n-input v-model:value="config.serverName" placeholder="例如 example.com www.example.com" />
                </n-form-item>

                <n-grid cols="2" :x-gap="12">
                  <n-gi>
                    <n-form-item label="HTTP 监听端口" :show-feedback="false">
                      <n-input-number v-model:value="config.listenPort" :min="1" :max="65535" class="w-full" />
                    </n-form-item>
                  </n-gi>
                  <n-gi>
                    <n-form-item label="请求体体积上限" :show-feedback="false">
                      <n-input v-model:value="config.clientMaxBodySize" placeholder="例如 50m" />
                    </n-form-item>
                  </n-gi>
                </n-grid>

                <n-form-item label="静态站点根目录 (root)" :show-feedback="false">
                  <n-input v-model:value="config.rootPath" placeholder="例如 /var/www/html" />
                </n-form-item>

                <n-form-item label="默认索引文件 (index)" :show-feedback="false">
                  <n-input v-model:value="config.indexFiles" placeholder="index.html index.htm" />
                </n-form-item>

                <div class="flex items-center justify-between pt-1">
                  <span class="text-xs text-neutral-600 dark:text-neutral-300">隐藏 Nginx 版本号 (server_tokens off)</span>
                  <n-switch v-model:value="config.hideNginxVersion" size="small" />
                </div>
              </div>
            </n-collapse-item>

            <!-- 单页应用 SPA 路由 -->
            <n-collapse-item title="单页前端应用路由 (SPA / History 模式)" name="spa">
              <div class="space-y-3 pt-1">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-neutral-600 dark:text-neutral-300">启用 try_files 路由回退 (防 404)</span>
                  <n-switch v-model:value="config.enableSpa" size="small" />
                </div>

                <n-form-item v-if="config.enableSpa" label="Fallback 回退页面路径" :show-feedback="false">
                  <n-input v-model:value="config.spaFallback" placeholder="/index.html" />
                </n-form-item>
              </div>
            </n-collapse-item>

            <!-- 反向代理路由列表 -->
            <n-collapse-item title="反向代理与网关 (Reverse Proxy Routes)" name="proxy">
              <div class="space-y-3 pt-1">
                <div v-for="(route, idx) in config.proxyRoutes" :key="route.id" class="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-blue-600 dark:text-blue-400">路由规则 #{{ idx + 1 }}</span>
                    <n-button size="tiny" quaternary type="error" @click="handleRemoveProxyRoute(idx)">
                      <template #icon><n-icon :component="Trash" /></template>
                      删除
                    </n-button>
                  </div>

                  <n-grid cols="2" :x-gap="8">
                    <n-gi>
                      <n-form-item label="监听匹配路径" :show-feedback="false">
                        <n-input v-model:value="route.path" placeholder="/api/" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="后端代理目标 URL" :show-feedback="false">
                        <n-input v-model:value="route.targetUrl" placeholder="http://127.0.0.1:8080/" />
                      </n-form-item>
                    </n-gi>
                  </n-grid>

                  <div class="flex items-center justify-between pt-1 text-xs">
                    <span class="text-neutral-500">WebSocket 协议升级支持</span>
                    <n-switch v-model:value="route.websocket" size="small" />
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-neutral-500">启用跨域 CORS 响应头</span>
                    <n-switch v-model:value="route.cors" size="small" />
                  </div>
                </div>

                <div class="flex justify-center pt-1">
                  <n-button dashed size="small" class="w-full" @click="handleAddProxyRoute">
                    <template #icon><n-icon :component="Plus" /></template>
                    新增反向代理路由
                  </n-button>
                </div>
              </div>
            </n-collapse-item>

            <!-- SSL / HTTPS 安全加固 -->
            <n-collapse-item title="SSL / HTTPS 与安全套件" name="ssl">
              <div class="space-y-3 pt-1">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-neutral-600 dark:text-neutral-300">开启 SSL / HTTPS 监听</span>
                  <n-switch v-model:value="config.enableSsl" size="small" />
                </div>

                <template v-if="config.enableSsl">
                  <n-grid cols="2" :x-gap="8">
                    <n-gi>
                      <n-form-item label="HTTPS 端口" :show-feedback="false">
                        <n-input-number v-model:value="config.sslPort" :min="1" :max="65535" class="w-full" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <div class="flex items-center justify-between pt-6 text-xs">
                        <span>启用 HTTP/2 协议</span>
                        <n-switch v-model:value="config.enableHttp2" size="small" />
                      </div>
                    </n-gi>
                  </n-grid>

                  <div class="flex items-center justify-between text-xs">
                    <span class="text-neutral-600 dark:text-neutral-300">HTTP 80 端口 301 强制跳转 HTTPS</span>
                    <n-switch v-model:value="config.sslRedirectHttp" size="small" />
                  </div>

                  <n-form-item label="SSL 证书公钥路径 (crt/pem)" :show-feedback="false">
                    <n-input v-model:value="config.sslCertPath" placeholder="/etc/nginx/ssl/example.com.crt" />
                  </n-form-item>

                  <n-form-item label="SSL 私钥路径 (key)" :show-feedback="false">
                    <n-input v-model:value="config.sslKeyPath" placeholder="/etc/nginx/ssl/example.com.key" />
                  </n-form-item>
                </template>
              </div>
            </n-collapse-item>

            <!-- 性能优化与缓存 -->
            <n-collapse-item title="Gzip 传输压缩与浏览器缓存" name="opt">
              <div class="space-y-3 pt-1">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-neutral-600 dark:text-neutral-300">开启 Gzip 静态资源压缩</span>
                  <n-switch v-model:value="config.enableGzip" size="small" />
                </div>

                <div class="flex items-center justify-between">
                  <span class="text-xs text-neutral-600 dark:text-neutral-300">开启图片/脚本等静态资源浏览器长期强缓存</span>
                  <n-switch v-model:value="config.enableStaticCache" size="small" />
                </div>

                <n-form-item v-if="config.enableStaticCache" label="静态资源缓存过期时长 (expires)" :show-feedback="false">
                  <n-input v-model:value="config.cacheExpires" placeholder="30d" />
                </n-form-item>
              </div>
            </n-collapse-item>
          </n-collapse>

          <!-- 底部重置操作栏，居中对齐 -->
          <div class="mt-4 flex justify-center items-center gap-3">
            <n-button quaternary size="small" @click="handleReset">
              <template #icon><n-icon :component="Refresh" /></template>
              重置参数
            </n-button>
          </div>
        </n-card>
      </n-gi>

      <!-- 右侧：生成效果与操作 -->
      <n-gi>
        <n-card title="nginx.conf 配置实时预览" size="small">
          <template #header-extra>
            <div class="flex items-center gap-2">
              <n-button size="tiny" type="primary" secondary @click="handleCopy">
                <template #icon><n-icon :component="Copy" /></template>
                复制配置
              </n-button>
              <n-button size="tiny" type="info" secondary @click="handleDownload">
                <template #icon><n-icon :component="Download" /></template>
                下载 .conf
              </n-button>
            </div>
          </template>

          <div class="relative">
            <n-input
              :value="generatedConfig"
              type="textarea"
              readonly
              :rows="28"
              class="font-mono text-xs"
              style="font-family: 'Fira Code', monospace; line-height: 1.5;"
            />
          </div>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>
