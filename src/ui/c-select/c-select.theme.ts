import { defineThemes } from '../theme/theme.models';
import { appThemes } from '../theme/themes';
import { surfaceTokens } from '@/styles/tokens';

const sizes = {
  small: {
    height: '28px',
    fontSize: '12px',
  },
  medium: {
    height: '34px',
    fontSize: '14px',
  },
  large: {
    height: '40px',
    fontSize: '16px',
  },
};

export const { useTheme } = defineThemes({
  dark: {
    sizes,

    backgroundColor: surfaceTokens.dark.surface2,
    borderColor: surfaceTokens.dark.border,
    dropdownShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)',

    option: {
      hover: {
        backgroundColor: surfaceTokens.dark.surface1,
      },
      active: {
        textColor: appThemes.dark.primary.color,
      },
    },

    focus: {
      backgroundColor: surfaceTokens.dark.surface1,
    },
  },
  light: {
    sizes,

    backgroundColor: surfaceTokens.light.surface2,
    borderColor: surfaceTokens.light.border,
    dropdownShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',

    option: {
      hover: {
        backgroundColor: surfaceTokens.light.surface1,
      },
      active: {
        textColor: appThemes.light.primary.color,
      },
    },

    focus: {
      backgroundColor: surfaceTokens.light.surface1,
    },
  },
});
