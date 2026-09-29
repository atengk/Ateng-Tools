<script setup lang="ts">
import { useHead } from '@vueuse/head';
import BaseLayout from '@/layouts/base.layout.vue';

const { t } = useI18n();

useHead({
  title: computed(() => `${t('404.notFound', '404 未找到')} - ${t('home.brand', 'Ateng-Tools')}`),
});
</script>

<template>
  <BaseLayout>
    <div class="not-found-container">
      <div class="not-found-card">
        <div class="code-badge">
          <span class="code-text">404</span>
        </div>

        <h1 class="title">
          {{ $t('404.notFound') }}
        </h1>

        <p class="desc">
          {{ $t('404.sorry') }}
        </p>

        <p class="sub-desc">
          {{ $t('404.maybe') }}
        </p>

        <div class="actions">
          <router-link to="/" class="back-btn">
            <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {{ $t('404.backHome') }}
          </router-link>
        </div>
      </div>
    </div>
  </BaseLayout>
</template>

<style lang="less" scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 20px;

  .not-found-card {
    text-align: center;
    max-width: 480px;

    .code-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 24px;
      border-radius: 9999px;
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(59, 130, 246, 0.15) 100%);
      border: 1px solid rgba(37, 99, 235, 0.25);
      margin-bottom: 20px;

      .code-text {
        font-size: 36px;
        font-weight: 800;
        letter-spacing: 2px;
        color: #2563eb;
        line-height: 1;
      }
    }

    .title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 12px;
    }

    .desc {
      font-size: 15px;
      opacity: 0.75;
      margin: 0 0 6px;
    }

    .sub-desc {
      font-size: 13px;
      opacity: 0.55;
      margin: 0 0 28px;
    }

    .actions {
      display: flex;
      justify-content: center;

      .back-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 22px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        background-color: #2563eb;
        color: #ffffff;
        text-decoration: none;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
        transition: all 0.2s ease;

        &:hover {
          background-color: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.35);
        }

        .btn-icon {
          width: 16px;
          height: 16px;
        }
      }
    }
  }
}
</style>
