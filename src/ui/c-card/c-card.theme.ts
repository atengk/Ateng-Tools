import { defineThemes } from '../theme/theme.models';
import { surfaceTokens } from '@/styles/tokens';

export const { useTheme } = defineThemes({
  dark: {
    backgroundColor: surfaceTokens.dark.surface1,
    borderColor: surfaceTokens.dark.border,
  },
  light: {
    backgroundColor: surfaceTokens.light.surface1,
    borderColor: surfaceTokens.light.border,
  },
});
