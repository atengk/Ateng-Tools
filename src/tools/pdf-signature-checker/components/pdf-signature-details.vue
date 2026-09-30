<script setup lang="ts">
import type { SignatureInfo } from '../pdf-signature-checker.types';

const props = defineProps<{ signature: SignatureInfo }>();
const { signature } = toRefs(props);
const { t } = useI18n();

const tableHeaders = computed(() => ({
  validityPeriod: t('tools.pdf-signature-checker.validityPeriod', '有效期'),
  issuedBy: t('tools.pdf-signature-checker.issuedBy', '颁发者'),
  issuedTo: t('tools.pdf-signature-checker.issuedTo', '使用者'),
  pemCertificate: t('tools.pdf-signature-checker.pemCertificate', 'PEM 证书'),
}));

const certs = computed(() => signature.value.meta.certs.map((certificate, index) => ({
  ...certificate,
  validityPeriod: {
    notBefore: new Date(certificate.validityPeriod.notBefore).toLocaleString(),
    notAfter: new Date(certificate.validityPeriod.notAfter).toLocaleString(),
  },
  certificateName: `${t('tools.pdf-signature-checker.certificate', '证书')} ${index + 1}`,
})),
);
</script>

<template>
  <div flex flex-col gap-2>
    <c-table :data="certs" :headers="tableHeaders">
      <template #validityPeriod="{ value }">
        <c-key-value-list
          :items="[{
            label: t('tools.pdf-signature-checker.notBefore', '生效时间 (Not Before)'),
            value: value.notBefore,
          }, {
            label: t('tools.pdf-signature-checker.notAfter', '到期时间 (Not After)'),
            value: value.notAfter,
          }]"
        />
      </template>

      <template #issuedBy="{ value }">
        <c-key-value-list
          :items="[{
            label: t('tools.pdf-signature-checker.commonName', '通用名称 (CN)'),
            value: value.commonName,
          }, {
            label: t('tools.pdf-signature-checker.organizationName', '组织名称 (O)'),
            value: value.organizationName,
          }, {
            label: t('tools.pdf-signature-checker.countryName', '国家/地区 (C)'),
            value: value.countryName,
          }, {
            label: t('tools.pdf-signature-checker.localityName', '城市/地点 (L)'),
            value: value.localityName,
          }, {
            label: t('tools.pdf-signature-checker.organizationalUnitName', '部门/单位 (OU)'),
            value: value.organizationalUnitName,
          }, {
            label: t('tools.pdf-signature-checker.stateOrProvinceName', '省/直辖市 (ST)'),
            value: value.stateOrProvinceName,
          }]"
        />
      </template>

      <template #issuedTo="{ value }">
        <c-key-value-list
          :items="[{
            label: t('tools.pdf-signature-checker.commonName', '通用名称 (CN)'),
            value: value.commonName,
          }, {
            label: t('tools.pdf-signature-checker.organizationName', '组织名称 (O)'),
            value: value.organizationName,
          }, {
            label: t('tools.pdf-signature-checker.countryName', '国家/地区 (C)'),
            value: value.countryName,
          }, {
            label: t('tools.pdf-signature-checker.localityName', '城市/地点 (L)'),
            value: value.localityName,
          }, {
            label: t('tools.pdf-signature-checker.organizationalUnitName', '部门/单位 (OU)'),
            value: value.organizationalUnitName,
          }, {
            label: t('tools.pdf-signature-checker.stateOrProvinceName', '省/直辖市 (ST)'),
            value: value.stateOrProvinceName,
          }]"
        />
      </template>

      <template #pemCertificate="{ value }">
        <c-modal-value :value="value" :label="t('tools.pdf-signature-checker.viewPemCert', '查看 PEM 证书')">
          <template #value>
            <div break-all text-xs>
              {{ value }}
            </div>
          </template>
        </c-modal-value>
      </template>
    </c-table>
  </div>
</template>
