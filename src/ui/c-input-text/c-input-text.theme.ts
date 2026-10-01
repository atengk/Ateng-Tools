import { defineThemes } from '../theme/theme.models';
import { surfaceTokens } from '@/styles/tokens';

export const { useTheme } = defineThemes({
  dark: {
    backgroundColor: surfaceTokens.dark.surface2,
    borderColor: surfaceTokens.dark.border,

    focus: {
      backgroundColor: surfaceTokens.dark.surface1,
    },
  },
  light: {
    backgroundColor: surfaceTokens.light.surface2,
    borderColor: surfaceTokens.light.border,

    focus: {
      backgroundColor: surfaceTokens.light.surface1,
    },
  },
});
