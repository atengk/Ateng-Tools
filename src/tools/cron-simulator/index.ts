import { Clock } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.cron-simulator.title'),
  path: '/cron-simulator',
  description: translate('tools.cron-simulator.description'),
  keywords: [
    'cron',
    'crontab',
    'schedule',
    'simulator',
    'timeline',
    'spring',
    'quartz',
    'linux',
    'time',
    'task',
    'job',
    'xxl-job',
  ],
  component: () => import('./cron-simulator.vue'),
  icon: Clock,
});
