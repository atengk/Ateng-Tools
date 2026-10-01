import type { GlobalThemeOverrides } from 'naive-ui';
import {
  brandTokens,
  geometryTokens,
  statusTokens,
  surfaceTokens,
  typographyTokens,
} from './styles/tokens';

export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: brandTokens.primary,
    primaryColorHover: brandTokens.primaryHover,
    primaryColorPressed: brandTokens.primaryPressed,
    primaryColorSuppl: brandTokens.primarySuppl,

    successColor: statusTokens.success,
    successColorHover: statusTokens.successHover,
    successColorPressed: statusTokens.successPressed,
    successColorSuppl: statusTokens.success,

    warningColor: statusTokens.warning,
    warningColorHover: statusTokens.warningHover,
    warningColorPressed: statusTokens.warningPressed,
    warningColorSuppl: statusTokens.warning,

    errorColor: statusTokens.error,
    errorColorHover: statusTokens.errorHover,
    errorColorPressed: statusTokens.errorPressed,
    errorColorSuppl: statusTokens.error,

    infoColor: statusTokens.info,
    infoColorHover: statusTokens.infoHover,
    infoColorPressed: statusTokens.infoPressed,
    infoColorSuppl: statusTokens.info,

    fontFamily: typographyTokens.fontSans,
    fontFamilyMono: typographyTokens.fontMono,
    lineHeight: `${typographyTokens.lineHeightBase}`,

    borderRadius: geometryTokens.radiusControl,
    borderRadiusSmall: geometryTokens.radiusBadge,
  },

  Layout: {
    color: surfaceTokens.light.surface0,
    siderColor: surfaceTokens.light.surface1,
    headerColor: surfaceTokens.light.surface1,
    siderBorderColor: surfaceTokens.light.border,
  },

  Card: {
    borderRadius: geometryTokens.radiusContainer,
    color: surfaceTokens.light.surface1,
    borderColor: surfaceTokens.light.border,
    titleTextColor: surfaceTokens.light.textBase,
    textColor: surfaceTokens.light.textBase,
  },

  Button: {
    borderRadiusMedium: geometryTokens.radiusControl,
    borderRadiusSmall: geometryTokens.radiusBadge,
    borderRadiusLarge: geometryTokens.radiusControl,
  },

  Input: {
    borderRadius: geometryTokens.radiusControl,
  },

  Modal: {
    borderRadius: geometryTokens.radiusContainer,
    color: surfaceTokens.light.surface1,
  },

  Dialog: {
    borderRadius: geometryTokens.radiusContainer,
  },

  Menu: {
    itemHeight: '34px',
    borderRadius: geometryTokens.radiusControl,
  },

  Table: {
    tdColor: surfaceTokens.light.surface1,
    thColor: surfaceTokens.light.surface2,
    borderColor: surfaceTokens.light.border,
  },

  AutoComplete: {
    peers: {
      InternalSelectMenu: { height: '500px' },
    },
  },
};

export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: brandTokens.primary,
    primaryColorHover: brandTokens.primaryHover,
    primaryColorPressed: brandTokens.primaryPressed,
    primaryColorSuppl: brandTokens.primarySuppl,

    successColor: statusTokens.success,
    successColorHover: statusTokens.successHover,
    successColorPressed: statusTokens.successPressed,
    successColorSuppl: statusTokens.success,

    warningColor: statusTokens.warning,
    warningColorHover: statusTokens.warningHover,
    warningColorPressed: statusTokens.warningPressed,
    warningColorSuppl: statusTokens.warning,

    errorColor: statusTokens.error,
    errorColorHover: statusTokens.errorHover,
    errorColorPressed: statusTokens.errorPressed,
    errorColorSuppl: statusTokens.error,

    infoColor: statusTokens.info,
    infoColorHover: statusTokens.infoHover,
    infoColorPressed: statusTokens.infoPressed,
    infoColorSuppl: statusTokens.info,

    fontFamily: typographyTokens.fontSans,
    fontFamilyMono: typographyTokens.fontMono,
    lineHeight: `${typographyTokens.lineHeightBase}`,

    borderRadius: geometryTokens.radiusControl,
    borderRadiusSmall: geometryTokens.radiusBadge,
  },

  Notification: {
    color: surfaceTokens.dark.surface1,
  },

  AutoComplete: {
    peers: {
      InternalSelectMenu: { height: '500px', color: surfaceTokens.dark.surface1 },
    },
  },

  Menu: {
    itemHeight: '34px',
    borderRadius: geometryTokens.radiusControl,
  },

  Layout: {
    color: surfaceTokens.dark.surface0,
    siderColor: surfaceTokens.dark.surface1,
    headerColor: surfaceTokens.dark.surface1,
    siderBorderColor: surfaceTokens.dark.border,
  },

  Card: {
    borderRadius: geometryTokens.radiusContainer,
    color: surfaceTokens.dark.surface1,
    borderColor: surfaceTokens.dark.border,
    titleTextColor: surfaceTokens.dark.textBase,
    textColor: surfaceTokens.dark.textBase,
  },

  Button: {
    borderRadiusMedium: geometryTokens.radiusControl,
    borderRadiusSmall: geometryTokens.radiusBadge,
    borderRadiusLarge: geometryTokens.radiusControl,
  },

  Input: {
    borderRadius: geometryTokens.radiusControl,
  },

  Modal: {
    borderRadius: geometryTokens.radiusContainer,
    color: surfaceTokens.dark.surface1,
  },

  Dialog: {
    borderRadius: geometryTokens.radiusContainer,
  },

  Table: {
    tdColor: surfaceTokens.dark.surface1,
    thColor: surfaceTokens.dark.surface2,
    borderColor: surfaceTokens.dark.border,
  },
};
