import {
  defineConfig,
  presetAttributify,
  presetTypography,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss';

import { presetScrollbar } from 'unocss-preset-scrollbar';
import { brandTokens, slatePalette, surfaceTokens } from './src/styles/tokens';

export default defineConfig({
  presets: [presetUno(), presetAttributify({ ignoreAttributes: ['size'] }), presetTypography(), presetScrollbar()],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    colors: {
      primary: brandTokens.primary,
      slate: slatePalette,
    },
  },
  shortcuts: {
    'pretty-scrollbar': 'scrollbar scrollbar-rounded scrollbar-thumb-color-slate-300 scrollbar-track-color-transparent dark:scrollbar-thumb-color-slate-600 dark:scrollbar-track-color-transparent',
    'divider': 'h-1px bg-current op-10',
    'bg-surface': 'bg-#ffffff dark:bg-#1e293b',
    'bg-surface-2': 'bg-#f1f5f9 dark:bg-#334155',
    'bg-background': 'bg-#f8fafc dark:bg-#0f172a',
    'border-base': 'border-#e2e8f0 dark:border-#334155',
  },
});
