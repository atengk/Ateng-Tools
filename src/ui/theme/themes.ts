import { defineThemes } from './theme.models';
import { brandTokens, statusTokens, surfaceTokens } from '@/styles/tokens';

export const { themes: appThemes, useTheme: useAppTheme } = defineThemes({
  light: {
    background: surfaceTokens.light.surface1,
    text: {
      baseColor: surfaceTokens.light.textBase,
      mutedColor: surfaceTokens.light.textMuted,
    },
    default: {
      color: 'rgba(15, 23, 42, 0.05)',
      colorHover: 'rgba(15, 23, 42, 0.09)',
      colorPressed: 'rgba(15, 23, 42, 0.22)',
    },
    primary: {
      color: brandTokens.primary,
      colorHover: brandTokens.primaryHover,
      colorPressed: brandTokens.primaryPressed,
      colorFaded: brandTokens.primaryFaded,
    },
    warning: {
      color: statusTokens.warning,
      colorHover: statusTokens.warningHover,
      colorPressed: statusTokens.warningPressed,
      colorFaded: statusTokens.warningFaded,
    },
    success: {
      color: statusTokens.success,
      colorHover: statusTokens.successHover,
      colorPressed: statusTokens.successPressed,
      colorFaded: statusTokens.successFaded,
    },
    error: {
      color: statusTokens.error,
      colorHover: statusTokens.errorHover,
      colorPressed: statusTokens.errorPressed,
      colorFaded: statusTokens.errorFaded,
    },
  },
  dark: {
    background: surfaceTokens.dark.surface1,
    text: {
      baseColor: surfaceTokens.dark.textBase,
      mutedColor: surfaceTokens.dark.textMuted,
    },
    default: {
      color: 'rgba(255, 255, 255, 0.08)',
      colorHover: 'rgba(255, 255, 255, 0.12)',
      colorPressed: 'rgba(255, 255, 255, 0.24)',
    },
    primary: {
      color: brandTokens.primary,
      colorHover: brandTokens.primaryHover,
      colorPressed: brandTokens.primaryPressed,
      colorFaded: brandTokens.primaryFaded,
    },
    warning: {
      color: statusTokens.warning,
      colorHover: statusTokens.warningHover,
      colorPressed: statusTokens.warningPressed,
      colorFaded: statusTokens.warningFaded,
    },
    success: {
      color: statusTokens.success,
      colorHover: statusTokens.successHover,
      colorPressed: statusTokens.successPressed,
      colorFaded: statusTokens.successFaded,
    },
    error: {
      color: statusTokens.error,
      colorHover: statusTokens.errorHover,
      colorPressed: statusTokens.errorPressed,
      colorFaded: statusTokens.errorFaded,
    },
  },
});
