/**
 * X.509 SSL 证书与 CSR 解析器工具定义
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { Certificate } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.x509-certificate-inspector.title'),
  path: '/x509-certificate-inspector',
  description: translate('tools.x509-certificate-inspector.description'),
  keywords: ['x509', 'ssl', 'tls', 'certificate', 'csr', 'pem', 'crt', 'cer', 'san', '证书解析', '证书校验'],
  component: () => import('./x509-certificate-inspector.vue'),
  icon: Certificate,
});
