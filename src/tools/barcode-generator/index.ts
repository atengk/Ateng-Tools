/**
 * 条形码生成器工具定义
 *
 * @author Ateng
 * @since 2026-10-01
 */
import { Barcode } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.barcode-generator.title'),
  path: '/barcode-generator',
  description: translate('tools.barcode-generator.description'),
  keywords: ['barcode', 'code128', 'ean13', 'ean8', 'upc', 'code39', 'itf14', '条形码', '一维码'],
  component: () => import('./barcode-generator.vue'),
  icon: Barcode,
});
