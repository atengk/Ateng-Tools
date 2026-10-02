/**
 * JWT 签名与验签工坊元数据导出
 *
 * @author Ateng
 * @since 2026-10-02
 */

import { Key } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.jwt-signer.title'),
  path: '/jwt-signer',
  description: translate('tools.jwt-signer.description'),
  keywords: [
    'jwt',
    'token',
    'signer',
    'verify',
    'verifier',
    'hmac',
    'hs256',
    'hs384',
    'hs512',
    'secret',
    'auth',
    'signature',
    'json web token',
    'yanqian',
    'qianming',
  ],
  component: () => import('./jwt-signer.vue'),
  icon: Key,
  createdAt: new Date('2026-10-02'),
});
