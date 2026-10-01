import { defineThemes } from '../theme/theme.models';
import { surfaceTokens } from '@/styles/tokens';

export const { useTheme } = defineThemes({
  dark: {
    background: surfaceTokens.dark.surface1,
  },
  light: {
    background: surfaceTokens.light.surface1,
  },
});
