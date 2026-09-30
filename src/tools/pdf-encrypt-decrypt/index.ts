import { Lock } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.pdf-encrypt-decrypt.title'),
  path: '/pdf-encrypt-decrypt',
  description: translate('tools.pdf-encrypt-decrypt.description'),
  keywords: ['pdf', 'encrypt', 'decrypt', 'password', 'security', 'protect', '加密', '解密', '密码', '权限', '安全'],
  component: () => import('./pdf-encrypt-decrypt.vue'),
  icon: Lock,
  createdAt: new Date('2026-09-30'),
});
